/**
 * 
 * Copyright 2019 Grégory Saive for NEM (https://nem.io)
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
} from 'nem2-sdk';

import {OptionsResolver} from '../kernel/OptionsResolver';
import {Contract, ContractConstants, ContractInputs} from '../kernel/Contract';

export class AssetEscrowInputs extends ContractInputs {
  @option({
    flag: 'a',
    description: 'Left hand asset for the escrow',
  })
  asset1: string;
  @option({
    flag: 't',
    description: 'Right hand escrow recipient (second party)',
  })
  taker: string;
  @option({
    flag: 'b',
    description: 'Right hand asset for the escrow',
  })
  asset2: string;
}

@command({
  description: 'Disposable Smart Contract for the Escrow of Assets',
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
    return 'AssetEscrow'
  }

  @metadata
  async execute(inputs: AssetEscrowInputs) 
  {
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
      inputs['asset1'] = OptionsResolver(inputs,
        'asset1',
        () => { return ''; },
        '\nEnter an amount and mosaic for the first party (Ex.: 10 nem.xem): ');
    } catch (err) { this.error('Please, enter a valid mosaic entry.'); }

    try {
      inputs['taker'] = OptionsResolver(inputs,
        'taker',
        () => { return ''; },
        'Enter an account address for the taker account: ');
    } catch (err) { this.error('Please, enter a valid account address.'); }

    try {
      inputs['asset2'] = OptionsResolver(inputs,
        'asset2',
        () => { return ''; },
        'Enter an amount and mosaic for the second party (Ex.: 10 nem.xem): ');
    } catch (err) { this.error('Please, enter a valid mosaic entry.'); }
  
    // --------------------------------
    // STEP 2: Prepare Contract Actions
    // --------------------------------

    const account = argv['account']

    // Contract Action #1: register namespace(s)
    const leftHandTransfer = this.factory.getTransferTransaction(

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
