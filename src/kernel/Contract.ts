/**
 * 
 * Copyright 2019-present Grégory Saive for NEM (https://nem.io)
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import chalk from 'chalk';
import {Command, ExpectedError, Options, option} from 'clime';
import {
    NetworkType,
    BlockHttp,
    BlockInfo,
    Account,
    Transaction,
    UInt64,
    RepositoryFactoryHttp,
} from 'symbol-sdk';
import { Observable, from as observableFrom } from 'rxjs';
import * as readlineSync from 'readline-sync';
import { OptionsResolver } from './OptionsResolver'
import { MnemonicPassPhrase, ExtendedKey, Network, Wallet } from 'symbol-hd-wallets'
import { TransactionFactory } from './TransactionFactory';
import { TransactionSigner } from './TransactionSigner';
import { TransactionBroadcaster } from './TransactionBroadcaster';

export abstract class Contract extends Command {
  /**
   * The connection endpoint URL
   * @var {string}
   */
  public endpointUrl: string = ContractConstants.DEFAULT_NODE_URL

  /**
   * The default explorer URL
   * @var {string}
   */
  public explorerUrl: string = ContractConstants.DEFAULT_EXPLORER_URL

  /**
   * The network generation hash
   * @internal
   * @var {string}
   */
  public generationHash: string = 'ACECD90E7B248E012803228ADB4424F0D966D24149B72E58987D2BF2F2AF03C4'

  /**
   * The network type
   * @internal
   * @var {NetworkType}
   */
  public networkType: NetworkType = NetworkType.TEST_NET

  /**
   * The repository factory
   * @internal
   * @var {RepositoryFactoryHttp}
   */
  public factoryHttp: RepositoryFactoryHttp

  /**
   * The transaction factory
   * @internal
   * @var {TransactionFactory}
   */
  protected factory: TransactionFactory

  /**
   * The transaction signer
   * @internal
   * @var {TransactionSigner}
   */
  protected signer: TransactionSigner

  /**
   * The transaction broadcaster
   * @internal
   * @var {TransactionBroadcaster}
   */
  protected broadcaster: TransactionBroadcaster

  constructor() {
    super();
  }

/// begin region Abstract Methods
  /**
   * Get the name of the contract
   *
   * @return {string}
   */
  public abstract getName(): string

  /**
   * Returns whether the contract requires authentication
   *
   * @return {boolean}
   */
  public abstract requiresAuth(): boolean

  /**
   * Execute a smart contract's transactions
   *
   * @param {Account}       account 
   * @param {Transaction[]} transactions
   * @return {Promise<any>}
   */
  protected async abstract executeContract(
    account: Account,
    transactions: Transaction[]
  ): Promise<any>
/// end region Abstract Methods

  /**
   * Display an error message and exit
   *
   * @internal
   * @param e 
   */
  public error(e) {
    console.error(e)
    process.exit(1)
  }

  /**
   * Configures a disposable smart contract
   *
   * @internal
   * @return {Observable<ContractInputs}
   */
  protected async configure(
    inputs: ContractInputs,
  ): Promise<ContractInputs> {
    const params = new ContractInputs();

    // ------------------
    // CONFIG 1: Node URL
    // ------------------

    // explorerUrl can be overwritten with --explorerUrl or -e
    if (inputs.hasOwnProperty('explorerUrl') && inputs['explorerUrl'] && inputs['explorerUrl'].length) {
      this.explorerUrl = inputs['explorerUrl']
    }

    console.log('');
    const useCustomNode = readlineSync.keyInYN(
      'Do you want to connect to a custom node? ')

    if (useCustomNode === true) {
      try {
        params['apiUrl'] = OptionsResolver(inputs,
          'apiUrl',
          () => { return ''; },
          'Enter a node URL (e.g.: http://localhost:3000): ')

        // only overwrite if value provided
        if (params['apiUrl'] && params['apiUrl'].length) {
          this.endpointUrl = params['apiUrl']
        }

        await this.connect(inputs)
      } 
      catch (err) {
        this.error('The node URL provided is invalid.')
      }
    }
    else await this.connect(inputs)

    // ------------------
    // CONFIG 2: Account
    // ------------------

    if (this.requiresAuth() === true) {

      //XXX read "profiles"

      console.log('');
      const useRandomAccount = readlineSync.keyInYN(
        'Do you want to generate a random account? ')

      if (useRandomAccount === true) {
        const mnemonic = MnemonicPassPhrase.createRandom()
        params['account'] = this.createAccountFromMnemonic(mnemonic)
      }
      else {
        console.log('');
        const usePrivateKey = readlineSync.keyInYN(
          'Do you want to enter a private key? ')

        if (usePrivateKey === true) {
          params['account'] = this.createAccountFromPrivateKey(OptionsResolver(inputs,
            'account',
            () => { return ''; },
            'Enter an account private key: '))
        }
        else { // use mnemonic pass phrase
          console.log('');

          const mnemonic = OptionsResolver(inputs,
            'mnemonic',
            () => { return ''; },
            'Enter a 24-words mnemonic passphrase: ')

          console.log('');
          const useCustomPath = readlineSync.keyInYN(
            'Do you want to use a custom derivation path? ')

          let path = `m/44'/4343'/0'/0'/0'`
          if (useCustomPath) {
            path = OptionsResolver(inputs,
              'path',
              () => { return ''; },
              "Enter a BIP39 derivation path (e.g.: m/44'/4343'/0'/0'/0'): ")
          }

          params['account'] = this.createAccountFromMnemonic(mnemonic, path)
        }
      }
    }

    // done configuring
    return observableFrom([params]).toPromise()
  }

  /**
   * Initializes a disposable smart contract
   *
   * @internal
   * @return {Promise<BlockInfo>}
   */
  private async connect(inputs: ContractInputs): Promise<BlockInfo> {
    const blockHttp = new BlockHttp(this.endpointUrl)

    // read first block of the network to identify
    // generationHash and networkType
    const firstBlock = await blockHttp.getBlockByHeight(UInt64.fromUint(1)).toPromise()
    console.log(chalk.green('Using node: ', this.endpointUrl))
    console.log(chalk.green('Connection established successfully'))

    this.networkType = firstBlock.networkType
    this.generationHash = firstBlock.generationHash
    this.factoryHttp = new RepositoryFactoryHttp(
      this.endpointUrl,
      this.networkType,
      this.generationHash,
    )

    // also create transaction factory for said network
    this.factory = TransactionFactory.create(this.endpointUrl, this.networkType)
    this.broadcaster = new TransactionBroadcaster(
      this,
      this.explorerUrl,
      this.endpointUrl,
      inputs['debug'] === true
    )
    return firstBlock
  }

  /**
   * Create an account with private key
   *
   * @param {string} privateKey
   * @return {Account}
   */
  protected createAccountFromPrivateKey(privateKey: string): Account {
    return Account.createFromPrivateKey(privateKey, this.networkType)
  }

  /**
   * Create an account with mnemonic pass phrase
   *
   * @param {MnemonicPassPhrase} privateKey
   * @return {Account}
   */
  protected createAccountFromMnemonic(mnemonic: MnemonicPassPhrase, path: string = "m/44'/4343'/0'/0'/0'"): Account {
    const seed = mnemonic.toSeed().toString('hex')
    const xkey = ExtendedKey.createFromSeed(seed, Network.CATAPULT)
    const wallet = new Wallet(xkey)
    return wallet.getChildAccount(
      path,
      this.networkType
    );
  }

  /**
   * Get an instantiated transaction signer
   *
   * @param {Account}     account 
   * @param {Transaction} transaction 
   * @return {TransactionSigner}
   */
  protected getSigner(
    account: Account,
    transaction: Transaction
  ): TransactionSigner
  {
    this.signer = new TransactionSigner(
      account,
      transaction,
      this.generationHash)
    return this.signer
  }
}

export class ContractInputs extends Options {
  @option({
    flag: 'a',
    description: 'Catapult API Node URL (Ex.: "http://localhost:3000")',
  })
  apiUrl: string;
  @option({
    flag: 'e',
    description: 'Explorer URL (Ex.: "http://explorer.symboldev.network")',
  })
  explorerUrl: string;
  @option({
    flag: 'p',
    description: 'Account private key (hexadecimal format)',
  })
  account: Account;
  @option({
    flag: 'm',
    description: 'Mnemonic passphrase (24 words)',
  })
  mnemonic: string;
  @option({
    flag: 'd',
    description: 'Enable debug mode',
  })
  debug: boolean;
}

export class ContractConstants {
  /**
   * Block target in seconds
   * @var {number}
   */
  public static BLOCK_TARGET_SECONDS: number = 15
  /**
   * Approximate number of blocks produced in one year
   * Defaults to one year with 15 seconds block target: `2102400`
   * @var {number}
   */
  public static BLOCKS_IN_ONE_YEAR: number = (365 * 24 * 60 * 60) / ContractConstants.BLOCK_TARGET_SECONDS

  /**
   * Default fee to use for aggregate transactions
   * @var {number}
   */
  public static DEFAULT_AGGREGATE_FEE: number = 100000 // 0.1 symbol.xym

  /**
   * Default fee to use for normal transactions
   * @var {number}
   */
  public static DEFAULT_TRANSACTION_FEE: number = 30000 // 0.03 symbol.xym

  /**
   * Default fee for transactions with rental fee
   * @var {number}
   */
  public static DEFAULT_FEE_WITH_RENTAL: number = 1 * ContractConstants.BLOCKS_IN_ONE_YEAR // 2,102400 symbol.xym

  /**
   * Default API node URL
   * @var {string}
   */
  public static DEFAULT_NODE_URL: string = 'http://api-01.us-west-1.0941-v1.symboldev.network:3000'

  /**
   * Default explorer URL
   * @var {string}
   */
  public static DEFAULT_EXPLORER_URL: string = 'http://explorer-941.symboldev.network'

  /**
   * Default locked mosaic (hash lock)
   * @var {string}
   */
  public static LOCK_MOSAIC: string = '519FC24B9223E0B4' // symbol.xym

  /**
   * Default locked mosaic amount (hash lock)
   * @var {number}
   */
  public static LOCK_AMOUNT: number = 10000000
}
