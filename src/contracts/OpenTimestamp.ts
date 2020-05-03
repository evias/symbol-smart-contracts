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
import {command, metadata, option} from 'clime';
import {
    Account,
    Transaction,
    NamespaceId,
} from 'symbol-sdk';

import {OptionsResolver} from '../kernel/OptionsResolver';
import {Contract, ContractConstants, ContractInputs} from '../kernel/Contract';
import {description} from './default'

export class OpenTimestampInputs extends ContractInputs {
  @option({
    flag: 'i',
    description: 'Data that should be stamped.',
  })
  data: string;
}

@command({
  description: 'Disposable Smart Contract for the Creation of Open Timestamps',
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
    return 'OpenTimestamp'
  }

  /**
   * Returns whether the contract requires authentication
   *
   * @return {boolean}
   */
  public requiresAuth(): boolean {
    return true
  }

  /**
   * Execution routine for the `OpenTimestamp` smart contract.
   *
   * @description This contract is defined in three (3) steps.
   * This contract sends a transfer transaction containing data
   * that needs to be stamped. The timestamp of the execution
   * is also saved on-chain in the message field.
   *
   * @param {PartialCosignatureInputs} inputs
   * @return {Promise<any>}
   */
  @metadata
  async execute(inputs: OpenTimestampInputs) 
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
      inputs['data'] = OptionsResolver(inputs,
        'data',
        () => { return ''; },
        '\nEnter the data that you want to timestamp publicly: ');
    } catch (err) { this.error('Please, enter a data set.'); }

    // --------------------------------
    // STEP 2: Prepare Contract Actions
    // --------------------------------

    const account = argv['account']

    // Contract Action #1: create DTO
    const timestampDTO = JSON.stringify({
      'timestamp': (new Date()).valueOf(),
      'data': inputs['data']
    })

    // Contract Action #2: create transfer transaction
    const timestampTransfer = this.factory.getTransferTransaction(
      account.address, // sent to self
      new NamespaceId('symbol.xym'),
      0,
      timestampDTO, // attach DTO to transfer message
    );

    // --------------------------------
    // STEP 3: Execute Contract Actions
    // --------------------------------

    // sign transaction and broadcast
    return await this.executeContract(account, [timestampTransfer])
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
    // shortcut
    const unsignedTransaction = transactions.shift()

    // sign the transfer transaction with `account`
    const signedTransaction = this.getSigner(account, unsignedTransaction).sign()

    // announce the aggregate transaction
    return await this.broadcaster.announce(account.publicAccount, signedTransaction)
  }
}
