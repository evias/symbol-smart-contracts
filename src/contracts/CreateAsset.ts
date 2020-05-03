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
    UInt64,
    Account,
    Deadline,
    Transaction,
    AggregateTransaction,
} from 'symbol-sdk';

import {OptionsResolver} from '../kernel/OptionsResolver';
import {Contract, ContractConstants, ContractInputs} from '../kernel/Contract';
import {description} from './default'

export class CreateAssetInputs extends ContractInputs {
  @option({
    flag: 'n',
    description: 'Friendly name for the created asset',
  })
  name: string;
  @option({
    flag: 'c',
    description: 'Number of decimal places (0-6)',
  })
  divisibility: number;
  @option({
    flag: 's',
    description: 'Total supply to create (absolute amount)',
  })
  supply: string;
  @option({
    flag: 'f',
    description: 'Flag properties of the asset (Ex.: Transferable|SupplyMutable)',
  })
  flags: string;
}

@command({
  description: 'Disposable Smart Contract for the Creation of Assets',
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
    return 'CreateAsset'
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
   * Execution routine for the `CreateAsset` smart contract.
   *
   * @description This contract is defined in three (3) steps.
   * This contract sends an aggregate transaction containing 1
   * or more namespace registration transactions, 1 mosaic def
   * and 1 mosaic supply transactions and also 1 mosaic alias
   * transaction.
   *
   * @param {CreateAssetInputs} inputs
   * @return {Promise<any>}
   */
  @metadata
  async execute(inputs: CreateAssetInputs) 
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
        '\nEnter a friendly name for the asset: ');
    } catch (err) { this.error('Please, enter a valid asset name.'); }

    try {
      console.log('')
      inputs['divisibility'] = OptionsResolver(inputs,
        'divisibility',
        () => { return ''; },
        'Enter a number of decimal places: ');

      // force-validate value
      inputs['divisibility'] = inputs['divisibility'] < 0 ? 0 
                              : inputs['divisibility'] > 6 ? 6 
                              : inputs['divisibility']
    } catch (err) { this.error('Please, enter a valid divisibility (0-6).'); }

    try {
      console.log('')
      inputs['supply'] = OptionsResolver(inputs,
        'supply',
        () => { return ''; },
        'Enter an initial supply: ');
    } catch (err) { this.error('Please, enter a valid supply.'); }

    try {
      console.log('')
      inputs['flags'] = OptionsResolver(inputs,
        'flags',
        () => { return ''; },
        'Enter flagged properties (Ex.: Transferable|SupplyMutable): ');
    } catch (err) { this.error('Please, enter valid flags.'); }

    // --------------------------------
    // STEP 2: Prepare Contract Actions
    // --------------------------------

    const account = argv['account']

    // Contract Action #1: register namespace(s)
    const namespaceTxes = await this.factory.getNamespaceRegistrations(
      account.publicAccount,
      inputs['name'],
      ContractConstants.BLOCKS_IN_ONE_YEAR
    );

    // Contract Action #2: create MosaicDefinition transaction
    const mosaicDefinitionTx = this.factory.getMosaicDefinitionTransaction(
      account.publicAccount,
      inputs['divisibility'],
      inputs['flags'].toLowerCase().indexOf('supplymutable') !== -1,
      inputs['flags'].toLowerCase().indexOf('transferable') !== -1,
      inputs['flags'].toLowerCase().indexOf('restrictable') !== -1,
    );

    // Contract Action #3: create MosaicSupplyChange transaction
    const mosaicSupplyTx = this.factory.getMosaicSupplyChangeTransaction(
      mosaicDefinitionTx.mosaicId,
      UInt64.fromUint(parseInt(inputs['supply']))
    );

    // Contract Action #4: create MosaicAlias transaction to link lower level namespace to mosaic
    const aliasTx = this.factory.getMosaicAliasTransaction(
        inputs['name'],
        mosaicDefinitionTx.mosaicId
    );

    // --------------------------------
    // STEP 3: Execute Contract Actions
    // --------------------------------

    // Contract Execution: merge transactions and execute contract
    const allTxes = [].concat(
      namespaceTxes,
      [
        mosaicDefinitionTx.toAggregate(account.publicAccount),
        mosaicSupplyTx.toAggregate(account.publicAccount),
        aliasTx.toAggregate(account.publicAccount)
      ]
    );

    // wrap all transactions in an aggregate, sign and broadcast
    return await this.executeContract(account, allTxes)
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
    // wrap contract transactions
    const aggregateTx = AggregateTransaction.createComplete(
      Deadline.create(),
      transactions,
      this.networkType,
      [],
      UInt64.fromUint(ContractConstants.DEFAULT_AGGREGATE_FEE)
    );

    // sign the aggregate transaction with `account`
    const signedTransaction = this.getSigner(account, aggregateTx).sign()

    // announce the aggregate transaction
    return await this.broadcaster.announce(account.publicAccount, signedTransaction)
  }
}
