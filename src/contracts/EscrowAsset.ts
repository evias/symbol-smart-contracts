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
import {command, metadata, option, ExpectedError} from 'clime';
import {
    UInt64,
    Account,
    Deadline,
    Transaction,
    AggregateTransaction,
    NamespaceId,
    PublicAccount,
    Mosaic,
} from 'symbol-sdk';

import {OptionsResolver} from '../kernel/OptionsResolver';
import {Contract, ContractConstants, ContractInputs} from '../kernel/Contract';
import {description} from './default'

export class EscrowAssetInputs extends ContractInputs {
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
  @option({
    flag: 'l',
    description: 'Asset that is locked (spam protection)',
  })
  lock: string;
}

@command({
  description: 'Disposable Smart Contract for the Escrow of Assets',
})
export default class extends Contract {

  /**
   * The asset used for the spam protection lock
   * @var {string} 
   */
  protected lockAsset: string = 'symbol.xym'

  /**
   * The absolute lock amount
   * @var {number} 
   */
  protected lockAmount: number = 10 * 1000000

  constructor() {
      super();
  }

  /**
   * Get the name of the contract
   *
   * @return {string}
   */
  public getName(): string {
    return 'EscrowAsset'
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
   * Execution routine for the `EscrowAsset` smart contract.
   *
   * @description This contract is defined in three (3) steps.
   * This contract sends an aggregate transaction containing 2
   * transfer transactions which must be signed *within 48 hours*
   * by both, the maker (first party) and the taker (second party).
   *
   * @param {EscrowAssetInputs} inputs
   * @return {Promise<any>}
   */
  @metadata
  async execute(inputs: EscrowAssetInputs) 
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
      inputs['asset1'] = OptionsResolver(inputs,
        'asset1',
        () => { return ''; },
        '\nEnter an amount and mosaic for the first party (Ex.: 10 symbol.xym): ');

      const parts = inputs['asset1'].split(' ')
      if (parts.length != 2) {
        throw new ExpectedError('Expected an amount and mosaic in --asset1, Ex.: 10 symbol.xym')
      }

      inputs['l_amount'] = parseInt(parts[0])
      inputs['l_asset']  = parts[1]
    } catch (err) { this.error('Please, enter a valid mosaic entry in asset1.'); }

    try {
      inputs['taker'] = OptionsResolver(inputs,
        'taker',
        () => { return ''; },
        'Enter a taker account public key (second party): ');
    } catch (err) { this.error('Please, enter a valid account address.'); }

    try {
      inputs['asset2'] = OptionsResolver(inputs,
        'asset2',
        () => { return ''; },
        'Enter an amount and mosaic for the second party (Ex.: 10 symbol.xym): ');

      const parts = inputs['asset2'].split(' ')
      if (parts.length != 2) {
        throw new ExpectedError('Expected an amount and mosaic in --asset2, Ex.: 10 symbol.xym')
      }

      inputs['r_amount'] = parseInt(parts[0])
      inputs['r_asset']  = parts[1]
    } catch (err) { this.error('Please, enter a valid mosaic entry in asset2.'); }

    // lock asset can be overwritten with --lock or -l
    if (inputs.hasOwnProperty('lock') && inputs['lock'] && inputs['lock'].length) {
      const parts = inputs['lock'].split(' ')
      if (parts.length != 2) {
        throw new ExpectedError('Expected an amount and mosaic in --lock, Ex.: 10 symbol.xym')
      }

      this.lockAmount = parseInt(parts[0]) * 1000000 // divisibility = 6
      this.lockAsset  = parts[1]
    }
  
    // --------------------------------
    // STEP 2: Prepare Contract Actions
    // --------------------------------

    const account = argv['account']
    const taker   = PublicAccount.createFromPublicKey(inputs['taker'], this.networkType)

    // Contract Action #1: create left hand transfer
    const leftHandTransfer = this.factory.getTransferTransaction(
      taker.address,
      new NamespaceId(inputs['l_asset']),
      inputs['l_amount'],
      'escrow 1st party',
    )

    // Contract Action #2: create right hand transfer
    const rightHandTransfer = this.factory.getTransferTransaction(
      account.address,
      new NamespaceId(inputs['r_asset']),
      inputs['r_amount'],
      'escrow 2nd party',
    )

    // --------------------------------
    // STEP 3: Execute Contract Actions
    // --------------------------------

    // Contract Execution: merge transactions and execute contract
    const allTxes = [
      leftHandTransfer.toAggregate(account.publicAccount),
      rightHandTransfer.toAggregate(taker),
    ]

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
    const aggregateTx = AggregateTransaction.createBonded(
      Deadline.create(),
      transactions,
      this.networkType,
      [],
      UInt64.fromUint(ContractConstants.DEFAULT_AGGREGATE_FEE)
    );

    // sign the aggregate transaction with `account`
    const signedTransaction = this.getSigner(account, aggregateTx).sign()

    // create hash lock (spam protected partial transactions pool)
    const lockFundsTransaction = this.factory.getHashLockTransaction(
      new Mosaic(new NamespaceId(this.lockAsset), UInt64.fromUint(this.lockAmount)),
      1000, // 1000 blocks duration
      signedTransaction,
    )

    // sign hash lock transaction
    const signedLockFundsTx = this.getSigner(account, lockFundsTransaction).sign()

    // announce the aggregate transaction
    return await this.broadcaster.announcePartial(account.publicAccount, signedLockFundsTx, signedTransaction)
  }
}
