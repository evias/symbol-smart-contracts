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
import { command, metadata, option } from 'clime'
import * as readlineSync from 'readline-sync';
import { NIP13, DerivationHelpers, NetworkConfig, TransactionParameters } from 'symbol-token-standards'
import { Account, PublicAccount, Transaction, Mosaic, MosaicId, UInt64, Deadline } from 'symbol-sdk'
import { MnemonicPassPhrase } from 'symbol-hd-wallets'
import { TransactionURI } from 'symbol-uri-scheme'

import { OptionsResolver } from '../kernel/OptionsResolver'
import { Contract, ContractConstants, ContractInputs } from '../kernel/Contract'
import {description} from './default'

export class CreateSecurityInputs extends ContractInputs {
  @option({
    flag: 'n',
    description: 'Friendly name for the security token',
  })
  name: string;
  @option({
    flag: 's',
    description: 'Total supply to create',
  })
  supply: number;
  @option({
    flag: 'o',
    description: 'Total number of operators',
  })
  operators: number;
  @option({
    flag: 'm',
    description: 'Use an existing BIP39 mnemonic pass phrase',
  })
  mnemonic: string;
  @option({
    flag: 'y',
    description: 'Force creation of security token',
  })
  yes: boolean;
}

@command({
  description: 'Disposable Smart Contract for the Creation of Securities',
})
export default class extends Contract {

  constructor() {
      super();
  }

  /**
   * Get the name of the contract
   *
   * @return {string}
   */
  public getName(): string {
    return 'CreateSecurity'
  }

  /**
   * Returns whether the contract requires authentication
   *
   * @return {boolean}
   */
  public requiresAuth(): boolean {
    return false
  }

  /**
   * Execution routine for the `CreateSecurity` smart contract.
   *
   * @description This contract is defined in three (3) steps.
   * This contract sends an aggregate transaction containing 1
   * or more namespace registration transactions, 1 mosaic def
   * and 1 mosaic supply transactions and also 1 mosaic alias
   * transaction.
   *
   * @param {CreateSecurityInputs} inputs
   * @return {Promise<any>}
   */
  @metadata
  async execute(inputs: CreateSecurityInputs) 
  {
    console.log(description)

    let argv: ContractInputs
    try {
      argv = await this.configure(inputs)
    }
    catch (e) {
      this.error(e)
    }

    // -------------------
    // STEP 1: Read Inputs
    // -------------------

    try {
      inputs['name'] = OptionsResolver(inputs,
        'name',
        () => { return ''; },
        '\nEnter a friendly name for the financial instrument: ')
    } catch (err) { this.error('Invalid name.') }

    try {
      console.log('')
      inputs['supply'] = parseInt(OptionsResolver(inputs,
        'supply',
        () => { return ''; },
        'Enter a number of shares for the financial instruments: '))

      // do not allow 0-supply
      if (inputs['supply'] <= 0) {
        inputs['supply'] = 1
      }
    } catch (err) { this.error('Invalid supply.') }

    try {
      console.log('')
      inputs['operators'] = parseInt(OptionsResolver(inputs,
        'operators',
        () => { return ''; },
        'How many operators do you want to configure? '))
    } catch (err) { this.error('Invalid count.') }

    // prepare security metadata
    const metadata = new NIP13.TokenMetadata('', '', '')

    console.log('')
    metadata.mic = OptionsResolver(inputs,
      'mic',
      () => { return ''; },
      'Enter a Market Identifier Code (e.g. XNAS): ')

    console.log('')
    metadata.isin = OptionsResolver(inputs,
      'isin',
      () => { return ''; },
      'Enter an ISIN (e.g. US0378331005): ')

    console.log('')
    metadata.classification = OptionsResolver(inputs,
      'classification',
      () => { return ''; },
      'Enter a classification (e.g. ESNTPB): ')

    console.log('')
    const useCustomMetadata = readlineSync.keyInYN(
      'Do you want to enter custom metadata fields? ')
    if (useCustomMetadata === true) {
      let continueCustomMetadata: boolean = false
      do {
        const key = OptionsResolver(inputs,
          'customMetadata',
          () => { return ''; },
          'Enter a metadata key (e.g. SKU): ')

        const val = OptionsResolver(inputs,
          'customMetadata',
          () => { return ''; },
          'Enter a metadata value (e.g. 000EVS123): ')

        metadata.customMetadata[key] = val

        console.log('')
        continueCustomMetadata = readlineSync.keyInYN(
          'Do you want to enter another custom metadata field? ')
      }
      while (continueCustomMetadata === true)
    }

    // --------------------------------
    // STEP 2: Prepare Contract Actions
    // --------------------------------

    // generate or re-use bip39 mnemonic
    let useExistingBip39 = false
    let bip39: MnemonicPassPhrase = MnemonicPassPhrase.createRandom()
    if (!inputs['mnemonic']) {
      console.log('')
      useExistingBip39 = readlineSync.keyInYN(
        'Do you want to use an existing mnemonic pass phrase? ')
    }
    else useExistingBip39 = true

    if (useExistingBip39 === true) {
      bip39 = new MnemonicPassPhrase(OptionsResolver(inputs,
        'mnemonic',
        () => { return ''; },
        'Enter a 24-words mnemonic passphrase: '))
    }

    // beautify backup info
    const words = bip39.plain.split(' ')
    console.log('')
    console.log(chalk.yellow('Security Token Backup Passphrase: '))
    console.log(chalk.yellow('\t') + '-'.repeat(55))
    console.log(chalk.red('\t' + words.slice(0, 8).join(' ')))
    console.log(chalk.red('\t' + words.slice(8, 16).join(' ')))
    console.log(chalk.red('\t' + words.slice(16, 24).join(' ')))
    console.log(chalk.yellow('\t') + '-'.repeat(55))
    console.log('')

    const token = new NIP13.Token(
      new NetworkConfig(
        this.endpointUrl,
        this.networkType,
        this.generationHash,
        new MosaicId(ContractConstants.LOCK_MOSAIC)
      ),
      bip39,
    )

    // derive TARGET account
    const target = token.getTarget()

    console.log(chalk.green('NIP13 Token Target: ' + target.address.plain()))
    
    if (inputs['debug'] === true) {
      console.log(chalk.red('\t\t    ' + target.privateKey))
    }

    // derive OPERATORS account(s)
    const defaultPath = DerivationHelpers.PATH_NIP13
    const operatorLvl = DerivationHelpers.DerivationPathLevels.Remote
    const operators: PublicAccount[] = [] 
    for (let i = 0; i < inputs['operators']; i++) {
      const operator: Account = token.getOperator(i+1)

      if (inputs['debug'] === true) {
        console.log(chalk.yellow('Operator (' + (i+1) + '): ' + operator.address.plain()))
        console.log(chalk.red('\t      ' + operator.privateKey))
      }

      operators.push(operator.publicAccount)
    }
    console.log('')

    // --------------------------------
    // STEP 3: Execute Contract Actions
    // --------------------------------
    const params = new TransactionParameters(
      Deadline.create(),
      750000, // maxFee
    )

    const tokenId = token.create(
      inputs['name'],
      target.publicAccount,
      operators,
      inputs['supply'],
      metadata,
      params,
    )

    const resultURI: TransactionURI = token.result

    console.log('')
    console.log(chalk.yellow('Contract URI: ' + resultURI.build()))
    console.log('')

    // whether to force execution or ask for next step
    if (!inputs['yes']) {
      const shouldContinue = readlineSync.keyInYN(
        'Do you want to create the security token now? ')

      if (shouldContinue === false) {
        return ;
      }
    }

    // wrap all transactions in an aggregate, sign and broadcast
    return await this.executeContract(target, [resultURI.toTransaction()])
  }

  /**
   * Execute a smart contract's transactions
   *
   * @param {Account}       account 
   * @param {Transaction[]} transactions
   * @return {Promise<any>}
   */
  protected async executeContract(
    account: Account,
    transactions: Transaction[]
  ): Promise<any> {
    // NIP13 CreateToken creates 1 aggregate bonded transaction
    const aggregateTx = transactions.shift()

    // sign the aggregate transaction with `account`
    const signedTransaction = this.getSigner(account, aggregateTx).sign()

    // create hash lock (spam protected partial transactions pool)
    const lockFundsTransaction = this.factory.getHashLockTransaction(
      new Mosaic(
        new MosaicId(ContractConstants.LOCK_MOSAIC),
        UInt64.fromUint(ContractConstants.LOCK_AMOUNT)
      ),
      1000, // 1000 blocks duration
      signedTransaction,
    )

    // sign hash lock transaction
    const signedLockFundsTx = this.getSigner(account, lockFundsTransaction).sign()

    // announce the aggregate transaction
    return await this.broadcaster.announcePartial(account.publicAccount, signedLockFundsTx, signedTransaction)
  }
}
