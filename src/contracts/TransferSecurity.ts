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
import { Account, PublicAccount, Transaction, Mosaic, MosaicId, UInt64, Deadline, AccountInfo, Address } from 'symbol-sdk'
import { MnemonicPassPhrase } from 'symbol-hd-wallets'
import { TransactionURI } from 'symbol-uri-scheme'

import { OptionsResolver } from '../kernel/OptionsResolver'
import { Contract, ContractConstants, ContractInputs } from '../kernel/Contract'
import {description} from './default'

export class TransferSecurityInputs extends ContractInputs {
  @option({
    flag: 'l',
    description: 'The partition name',
  })
  name: string;
  @option({
    flag: 'r',
    description: 'Recipient of the security',
  })
  recipient: string;
  @option({
    flag: 'r',
    description: 'Sender of the security',
  })
  sender: string;
  @option({
    flag: 'n',
    description: 'Total amount of shares to transfer',
  })
  amount: number;
  @option({
    flag: 'm',
    description: 'Use an existing BIP39 mnemonic pass phrase',
  })
  mnemonic: string;
  @option({
    flag: 'y',
    description: 'Force transfer of security token',
  })
  yes: boolean;
}

@command({
  description: 'Disposable Smart Contract for the Transfer of Securities',
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
    return 'TransferSecurity'
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
   * Execution routine for the `TransferSecurity` smart contract.
   *
   * @description This contract is defined in three (3) steps.
   * This contract sends an aggregate transaction containing 1
   * or more namespace registration transactions, 1 mosaic def
   * and 1 mosaic supply transactions and also 1 mosaic alias
   * transaction.
   *
   * @param {TransferSecurityInputs} inputs
   * @return {Promise<any>}
   */
  @metadata
  async execute(inputs: TransferSecurityInputs) 
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
      inputs['sender'] = OptionsResolver(inputs,
        'sender',
        () => { return ''; },
        'Enter the sender address: ')
    } catch (err) { this.error('Invalid address.') }

    try {
      console.log('')
      inputs['name_sender'] = OptionsResolver(inputs,
        'name_sender',
        () => { return ''; },
        'Enter the sender partition label: ')
    } catch (err) { this.error('Invalid partition label.') }

    try {
      console.log('')
      inputs['recipient'] = OptionsResolver(inputs,
        'recipient',
        () => { return ''; },
        'Enter the recipient address: ')
    } catch (err) { this.error('Invalid address.') }

    try {
      console.log('')
      inputs['name_recipient'] = OptionsResolver(inputs,
        'name_recipient',
        () => { return ''; },
        'Enter the recipient partition label: ')
    } catch (err) { this.error('Invalid partition label.') }

    try {
      console.log('')
      inputs['amount'] = parseInt(OptionsResolver(inputs,
        'amount',
        () => { return ''; },
        'Enter a number of shares to be transferred: '))

      // a transfer should contain always a minimum of 1 share
      if (inputs['supply'] <= 0) {
        inputs['supply'] = 1
      }
    } catch (err) { this.error('Invalid number of shares.') }

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

    const token = new NIP13.Token(
      new NetworkConfig(
        this.endpointUrl,
        this.networkType,
        this.generationHash,
        this.epochAdjustment,
        new MosaicId(ContractConstants.LOCK_MOSAIC)
      ),
      bip39,
    )

    // derive TARGET account
    const target = token.getTarget()
    const sender = Address.createFromRawAddress(inputs['sender'])

    // fetch recipient information
    let senderInfo: AccountInfo
    senderInfo = await this.factoryHttp
      .createAccountRepository()
      .getAccountInfo(sender)
      .toPromise()

    let recipient: AccountInfo
    recipient = await this.factoryHttp
      .createAccountRepository()
      .getAccountInfo(Address.createFromRawAddress(inputs['recipient']))
      .toPromise()

    console.log(chalk.green('NIP13 Token Target: ' + target.address.plain()))

    if (inputs['debug'] === true) {
      console.log(chalk.red('\t\t    ' + target.privateKey))
    }

    // --------------------------------
    // STEP 3: Execute Contract Actions
    // --------------------------------
    const params = new TransactionParameters(
      this.epochAdjustment,
      Deadline.create(this.epochAdjustment),
      750000, // maxFee
    )

    // derive SENDER partition account and operator
    const senderPartition = sender.equals(target.address)
      ? target
      : token.getPartition(senderInfo.publicAccount, inputs['name_sender'])
    const recipientPartition = token.getPartition(recipient.publicAccount, inputs['name_recipient'])
    const bip39Path = token.getPathForPartition(recipient.publicAccount, inputs['name_recipient'])
    const operator  = token.getOperator(1)

    console.log(chalk.green('NIP13 Sender Token Partition:    ' + senderPartition.address.plain()))
    console.log(chalk.green('NIP13 Recipient Token Partition: ' + recipientPartition.address.plain()))
    console.log(chalk.green('Recipient Token Partition Path:     ' + bip39Path))

    if (inputs['debug'] === true) {
      console.log(chalk.red('\t\t    ' + recipientPartition.privateKey))
    }

    // transfer shares
    const result = await token.transfer(
      operator.publicAccount, // actor
      senderPartition.publicAccount, // sender
      recipientPartition.publicAccount, // recipient (PARTITION)
      inputs['amount'],
      params,
    )

    const resultURI: TransactionURI<Transaction> = result

    console.log('')
    console.log(chalk.yellow('Contract URI: ' + resultURI.build()))
    console.log('')

    // whether to force execution or ask for next step
    if (!inputs['yes']) {
      const shouldContinue = readlineSync.keyInYN(
        'Do you want to transfer the security token now? ')

      if (shouldContinue === false) {
        return ;
      }
    }

    // wrap all transactions in an aggregate, sign and broadcast
    return await this.executeContract(operator, [resultURI.toTransaction()])
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
