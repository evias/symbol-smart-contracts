/**
 * This file is part of symbol-smart-contracts shared under Apache-2.0
 * Copyright 2020-2021 Using Blockchain Ltd, Reg No.: 12658136, United Kingdom, All rights reserved.
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
import { NIP13, NetworkConfig, TransactionParameters, CommandOption } from 'symbol-token-standards'
import { Account, PublicAccount, Transaction, Mosaic, MosaicId, UInt64, Deadline, AccountInfo, Address } from 'symbol-sdk'
import { MnemonicPassPhrase } from 'symbol-hd-wallets'
import { TransactionURI } from 'symbol-uri-scheme'
import { Governable, Symbol } from 'governable'

import { OptionsResolver } from '../kernel/OptionsResolver'
import { Contract, ContractConstants, ContractInputs } from '../kernel/Contract'
import {description} from './default'

export class GovCreateAgreementInputs extends ContractInputs {
  @option({
    flag: 'n',
    description: 'The DAO name',
  })
  name: string;
  @option({
    flag: 'm',
    description: 'Use an existing BIP39 mnemonic pass phrase',
  })
  mnemonic: string;
  @option({
    flag: 'p',
    description: 'Password-protected (or not) your DAO target account',
  })
  password: string;
  @option({
    flag: 'a',
    description: 'Derivation path of the agreement account',
  })
  agreementPath: string;
  @option({
    flag: 'o',
    description: 'Public keys of the operators of the DAO',
  })
  operators: string[];
  @option({
    flag: 'y',
    description: 'Force the creation of an agreement',
  })
  yes: boolean;
}

@command({
  description: 'Disposable Smart Contract for creating DAO launch agreements',
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
    return 'GovCreateAgreement'
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
  * Execution routine for the `GovCreateAgreement` smart contract.
  *
  * @param {GovCreateAgreementInputs} inputs
  * @return {Promise<any>}
  */
  @metadata
  async execute(inputs: GovCreateAgreementInputs) 
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
      console.log('')
      inputs['name'] = OptionsResolver(inputs,
        'name',
        () => { return ''; },
        'Enter the DAO name: ')
    } catch (err) { this.error('Invalid name.') }

    try {
    console.log('')
    inputs['password'] = OptionsResolver(inputs,
      'password',
      () => { return ''; },
      'Enter a new password: ')
    } catch (err) { this.error('Invalid password.') }

    let operators: PublicAccount[] = [],
        yn: boolean = false
    do {
      const op = PublicAccount.createFromPublicKey(OptionsResolver(inputs,
        'operators',
        () => { return ''; },
        'Enter an operator public key: '), this.networkType)
      operators.push(op)

      yn = readlineSync.keyInYN(
        'Do you want to add another operator? ')
    }
    while(yn === true)

    try {
      console.log('')
      inputs['agreementPath'] = OptionsResolver(inputs,
        'agreementPath',
        () => { return ''; },
        'Enter the derivation path for the agreement account: ')
    } catch (err) { this.error('Invalid agreementPath.') }

    // --------------------------------
    // STEP 2: Prepare Contract Actions
    // --------------------------------

    // always re-use bip39 mnemonic
    let bip39: MnemonicPassPhrase
    if (!inputs['mnemonic']) {
      console.log('')
      bip39 = new MnemonicPassPhrase(OptionsResolver(inputs,
          'mnemonic',
          () => { return ''; },
          'Enter a 24-words mnemonic passphrase: '))
    }
    else bip39 = new MnemonicPassPhrase(inputs['mnemonic'])

    // - Prepares the node connection
    const reader = new Symbol.Reader(
      'http://dual-001.symbol.ninja:3000',
      this.networkType,
      this.generationHash,
      this.epochAdjustment,
      new MosaicId(ContractConstants.LOCK_MOSAIC),
      '306FA94E0AB682964416C8172F858939533E5998906B8AFAD4A4585C7CDD722C', // nodepubkey saves 1 request
    )
    
    // - Initializes a key provider and distributed organization instance.
    const signer = new Symbol.Signer() 
    const dao = new Governable.DistributedOrganization(
      inputs['name'],
      reader,
      signer,
      bip39,
      inputs['password'],
    )

    // derive TARGET account ("target" property is "public account")
    // this step is only for illustration and display of private key
    const target = Symbol.Accountable.derive(
      bip39.toSeed(inputs['password']),
      Governable.TargetDerivationPath,
      this.networkType,
      signer,
    )

    console.log(chalk.green('Governable DAO Target: ' + target.address.plain()))
    console.log(chalk.red('\t\t    ' + target.privateKey))

    // --------------------------------
    // STEP 3: Execute Contract Actions
    // --------------------------------
    const params = new TransactionParameters(
      this.epochAdjustment,
      Deadline.create(this.epochAdjustment),
      750000, // maxFee
    )

    const resultURI: TransactionURI<Transaction> = await dao.execute(
      operators[0],
      dao.identifier,
      'CreateAgreement',
      params,
      [
        new CommandOption('password', inputs['password']),
        new CommandOption('mnemonic', bip39),
        new CommandOption('operators', operators),
        new CommandOption('agreementPath', inputs['agreementPath']),
      ]
    )

    console.log('')
    console.log(chalk.yellow('Contract URI: ' + resultURI.build()))
    console.log('')

    // whether to force execution or ask for next step
    if (!inputs['yes']) {
      const shouldContinue = readlineSync.keyInYN(
        'Do you want to create the DAO launch agreement now? ')

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
