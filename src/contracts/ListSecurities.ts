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
import { NIP13, NetworkConfig, TransactionParameters } from 'symbol-token-standards'
import { Account, PublicAccount, Transaction, Mosaic, MosaicId, UInt64, Deadline, Address } from 'symbol-sdk'
import { MnemonicPassPhrase } from 'symbol-hd-wallets'
import { TransactionURI } from 'symbol-uri-scheme'

import { OptionsResolver } from '../kernel/OptionsResolver'
import { Contract, ContractConstants, ContractInputs } from '../kernel/Contract'
import {description} from './default'

export class ListSecuritiesInputs extends ContractInputs {
  @option({
    flag: 'm',
    description: 'Use an existing authority address or public key',
  })
  authority: string;
}

@command({
  description: 'Disposable Smart Contract for the Listing of Securities',
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
    return 'ListSecurities'
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
   * Execution routine for the `ListSecurities` smart contract.
   *
   * @description This contract is defined in three (3) steps.
   * This contract sends an aggregate transaction containing 1
   * or more namespace registration transactions, 1 mosaic def
   * and 1 mosaic supply transactions and also 1 mosaic alias
   * transaction.
   *
   * @param {ListSecuritiesInputs} inputs
   * @return {Promise<any>}
   */
  @metadata
  async execute(inputs: ListSecuritiesInputs) 
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

    const networkConfig: NetworkConfig = new NetworkConfig(
      this.endpointUrl,
      this.networkType,
      this.generationHash,
      new MosaicId(ContractConstants.LOCK_MOSAIC)
    )

    // authority account is used to list verified tokens
    let authority: PublicAccount

    console.log('')
    const useAuthorityMnemonic = readlineSync.keyInYN(
      'Do you want to enter a mnemonic pass phrase for the authority account? ')
    if (useAuthorityMnemonic === true) {
      inputs['authority'] = OptionsResolver(inputs,
        'authority',
        () => { return ''; },
        'Enter a mnemonic pass phrase for the authority account: ')
      const authority39 = new MnemonicPassPhrase(inputs['authority'])

      // beautify backup info
      this.printPassPhrase('Authority Backup Passphrase', authority39)

      // create authority from random BIP39 pass phrase
      const auth = new NIP13.TokenAuthority(
        networkConfig,
        authority39,
      )

      authority = auth.getAuthority().publicAccount
      console.log(chalk.green('NIP13 Authority: ' + auth.getAuthority().address.plain()))

      if (inputs['debug'] === true) {
        console.log(chalk.red('\t\t    ' + auth.getAuthority().privateKey))
      }
    }
    else {
      try {
        console.log('')
        inputs['authority'] = OptionsResolver(inputs,
          'authority',
          () => { return ''; },
          'Enter an authority address or public key: ')

        if ([40, 46].includes(inputs['authority'].length)) {
          const accountInfo = await networkConfig.factoryHttp.createAccountRepository().getAccountInfo(
            Address.createFromRawAddress(inputs['authority']),
          ).toPromise()

          authority = accountInfo.publicAccount
        }
        else if (inputs['authority'].length == 64) {
          authority = PublicAccount.createFromPublicKey(
            inputs['authority'],
            this.networkType,
          )
        }
        else throw new Error('Invalid authority.')
      }
      catch (err) { console.log("error: ", err); this.error('Invalid authority.') }
    }
  
    // --------------------------------
    // STEP 2: Prepare Contract Actions
    // --------------------------------

    // --------------------------------
    // STEP 3: Execute Contract Actions
    // --------------------------------
    const params = new TransactionParameters(
      Deadline.create(),
      750000, // maxFee
    )

    const tokens = await NIP13.TokenAuthority.getTokens(
      authority,
      networkConfig,
    )

    console.log('')
    console.log(chalk.yellow('Mosaics: '))
    console.log(tokens.map((mosaicId => mosaicId.toHex())))
    console.log('')

    // wrap all transactions in an aggregate, sign and broadcast
    return await this.executeContract(Account.generateNewAccount(this.networkType), [])
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
    return true
  }

  private printPassPhrase(
    label: string,
    bip39: MnemonicPassPhrase,
  ) {
    const words = bip39.plain.split(' ')
    console.log('')
    console.log(chalk.yellow(label + ': '))
    console.log(chalk.yellow('\t') + '-'.repeat(55))
    console.log(chalk.red('\t' + words.slice(0, 8).join(' ')))
    console.log(chalk.red('\t' + words.slice(8, 16).join(' ')))
    console.log(chalk.red('\t' + words.slice(16, 24).join(' ')))
    console.log(chalk.yellow('\t') + '-'.repeat(55))
    console.log('')
  }
}
