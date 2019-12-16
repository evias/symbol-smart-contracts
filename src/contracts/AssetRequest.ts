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
import {command, metadata, option, ExpectedError} from 'clime';
import {
    UInt64,
    Account,
    Deadline,
    Transaction,
    AggregateTransaction,
    MosaicId,
    NamespaceId,
    PublicAccount,
    AccountHttp,
    Address,
    Mosaic,
} from 'nem2-sdk';

import {OptionsResolver} from '../kernel/OptionsResolver';
import {Contract, ContractConstants, ContractInputs} from '../kernel/Contract';

export class AssetRequestInputs extends ContractInputs {
  @option({
    flag: 'a',
    description: 'Set the asset that will be requested (Ex.: 10 nem.xem)',
  })
  asset: string;
  @option({
    flag: 'f',
    description: 'Account address of the recipient of the asset request',
  })
  from: string;
  @option({
    flag: 'l',
    description: 'Asset that is locked (spam protection)',
  })
  lock: string;
}

@command({
  description: 'Disposable Smart Contract for the Request of Assets from friends',
})
export default class extends Contract {

  /**
   * The asset used for the spam protection lock
   * @var {string} 
   */
  protected lockAsset: string = 'nem.xem'

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
    return 'AssetRequest'
  }

  @metadata
  async execute(inputs: AssetRequestInputs) 
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
      inputs['asset'] = OptionsResolver(inputs,
        'asset',
        () => { return ''; },
        '\nEnter an amount and mosaic that will be requested (Ex.: 10 nem.xem): ');

      const parts = inputs['asset'].split(' ')
      if (parts.length != 2) {
        throw new ExpectedError('Expected an amount and mosaic, Ex.: 10 nem.xem')
      }

      inputs['r_amount'] = parseInt(parts[0])
      inputs['r_asset']  = parts[1]
    } catch (err) { this.error('Please, enter a valid mosaic entry in asset1.'); }

    try {
      inputs['from'] = OptionsResolver(inputs,
        'from',
        () => { return ''; },
        'Enter a recipient account address: ');
    } catch (err) { this.error('Please, enter a valid account address.'); }

    // lock asset can be overwritten with --lock or -l
    if (inputs.hasOwnProperty('lock') && inputs['lock'] && inputs['lock'].length) {
      const parts = inputs['lock'].split(' ')
      if (parts.length != 2) {
        throw new ExpectedError('Expected an amount and mosaic in --lock, Ex.: 10 nem.xem')
      }

      this.lockAmount = parseInt(parts[0]) * 1000000 // divisibility = 6
      this.lockAsset  = parts[1]
    }

    // --------------------------------
    // STEP 2: Prepare Contract Actions
    // --------------------------------

    const accountHttp = new AccountHttp(this.endpointUrl)
    const account     = argv['account']
    const recipient   = Address.createFromRawAddress(inputs['from'])

    // recipient account must be known on the network
    let pubAccount: PublicAccount
    try {
      const accountInfo = await accountHttp.getAccountInfo(recipient).toPromise()
      const unknownPub  = '0000000000000000000000000000000000000000000000000000000000000000'
      if (accountInfo.publicKey === unknownPub) {
        throw new ExpectedError('The recipient account is unknown on this network.')
      }

      // instantiate public account to be able to prepare aggregate transaction
      pubAccount = PublicAccount.createFromPublicKey(accountInfo.publicKey, this.networkType)
    } catch (err) { this.error('The recipient account is unknown on this network.') }

    // Contract Action #1: create the requested transfer
    const requestedTransfer = this.factory.getTransferTransaction(
      account.address,
      new NamespaceId(inputs['r_asset']),
      inputs['r_amount']
    );

    // --------------------------------
    // STEP 3: Execute Contract Actions
    // --------------------------------

    // Contract Execution: merge transactions and execute contract
    const allTxes = [
      requestedTransfer.toAggregate(pubAccount),
    ];

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
