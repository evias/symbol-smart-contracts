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
import {ExpectedError} from 'clime';
import {
    Account,
    Transaction,
    SignedTransaction,
    AggregateTransaction,
    TransactionType,
    PublicAccount,
    NamespaceId,
    NamespaceHttp,
    NamespaceRegistrationTransaction,
    NetworkType,
    Deadline,
    UInt64,
    MosaicDefinitionTransaction,
    MosaicNonce,
    MosaicId,
    MosaicFlags,
    MosaicSupplyChangeTransaction,
    MosaicSupplyChangeAction,
    MosaicAliasTransaction,
    AliasAction,
    TransferTransaction,
    Mosaic,
    PlainMessage,
    Address,
    HashLockTransaction,
} from 'symbol-sdk';

import {ContractConstants} from './Contract'

export class TransactionFactory {

  /**
   * Singleton instance
   * @var {TransactionFactory}
   */
  public static $_factory: TransactionFactory = null

  /**
   * Private constructor, singleton pattern
   *
   * @internal
   */
  private constructor(
    /**
     * The API node URL
     * @var {string}
     */
    public readonly endpointUrl: string = ContractConstants.DEFAULT_NODE_URL,
    /**
     * The network type
     * @var {NetworkType}
     */
    public readonly networkType: NetworkType = NetworkType.TEST_NET,
    /**
     * The epoch adjustment
     * @var {number}
     */
    public readonly epochAdjustment: number = 1615853185) {}

  /**
   * Create a transaction factory
   *
   * @param {string} endpointUrl 
   * @return {TransactionFactory}
   */
  public static create(
    endpointUrl: string,
    networkType: NetworkType,
  ): TransactionFactory 
  {
    if (null === TransactionFactory.$_factory) {
      TransactionFactory.$_factory = new TransactionFactory(endpointUrl, networkType)
    }

    return TransactionFactory.$_factory
  }

  /**
   * Get one or multiple NamespaceRegistrationTransaction
   * objects depending on the existence of said namespaces
   * on the network.
   *
   * @param {PublicAccount} publicAccount 
   * @param {string}        namespaceName 
   * @param {duration}      duration 
   * @return {Promise<NamespaceRegistrationTransaction[]>}
   */
  public async getNamespaceRegistrations(
    publicAccount: PublicAccount,
    namespaceName: string,
    duration: number,
  ): Promise<NamespaceRegistrationTransaction[]>
  {
    const parts = namespaceName.split('.');
    if (parts.length > 3) {
        throw new Error('Invalid namespace name "' + namespaceName + '", maximum 3 levels allowed.');
    }

    const namespaceHttp = new NamespaceHttp(this.endpointUrl);
    return new Promise(async (resolve, reject) => {
      let registerTxes = [];
      for (let i = 0; i < parts.length; i++) {
        const fullName = i === 0 ? parts[0] : parts.slice(0, i+1).join('.');

        // create current level namespace registration transaction
        const registerTx = this.getNamespaceRegistrationTransaction(fullName, duration);
        registerTxes.push(registerTx.toAggregate(publicAccount));

        // check for existence and remove if exists
        try {
          const namespaceId = new NamespaceId(fullName);
          const namespaceInfo = await namespaceHttp.getNamespace(namespaceId).toPromise();
          registerTxes.pop(); // namespace exists on network already
        }
        catch(e) {} // Do nothing, namespace "Error: Not Found"
      }

      return resolve(registerTxes);
    });
  }

  /**
   * Get a NamespaceRegistrationTransaction object
   *
   * @param {string} namespaceName 
   * @param {number} duration 
   * @return {NamespaceRegistrationTransaction}
   */
  public getNamespaceRegistrationTransaction(
    namespaceName: string,
    duration: number,
  ): NamespaceRegistrationTransaction
  {
    const isSub = /\.{1,}/.test(namespaceName);
    const parts = namespaceName.split('.');
    const parent = parts.slice(0, parts.length-1).join('.');
    const current = parts.pop();

    if (isSub === true) {
      // sub namespace level[i]
      return NamespaceRegistrationTransaction.createSubNamespace(
        Deadline.create(this.epochAdjustment),
        current,
        parent,
        this.networkType,
        UInt64.fromUint(ContractConstants.DEFAULT_TRANSACTION_FEE)
      );
    }

    // root namespace
    return NamespaceRegistrationTransaction.createRootNamespace(
      Deadline.create(this.epochAdjustment),
      namespaceName,
      UInt64.fromUint(duration),
      this.networkType,
      UInt64.fromUint(ContractConstants.DEFAULT_TRANSACTION_FEE)
    )
  }

  /**
   * Get a MosaicDefinitionTransaction object
   *
   * @param {PublicAccount} publicAccount 
   * @param {number}        divisibility 
   * @param {boolean}       supplyMutable 
   * @param {boolean}       transferable 
   * @param {boolean}       restrictable 
   * @return {MosaicDefinitionTransaction}
   */
  public getMosaicDefinitionTransaction(
    publicAccount: PublicAccount,
    divisibility: number,
    supplyMutable: boolean,
    transferable: boolean,
    restrictable: boolean
  ): MosaicDefinitionTransaction
  {
    // create nonce and mosaicId
    const nonce = MosaicNonce.createRandom();
    const mosId = MosaicId.createFromNonce(nonce, publicAccount.address);

    return MosaicDefinitionTransaction.create(
      Deadline.create(this.epochAdjustment),
      nonce,
      mosId,
      MosaicFlags.create(supplyMutable, transferable, restrictable),
      divisibility,
      UInt64.fromUint(ContractConstants.BLOCKS_IN_ONE_YEAR),
      this.networkType,
      UInt64.fromUint(ContractConstants.DEFAULT_FEE_WITH_RENTAL)
    );
  }

  /**
   * Get a MosaicSupplyChangeTransaction object
   *
   * @param {MosaicId}  mosaicId 
   * @param {UInt64}    supply
   * @return {MosaicSupplyChangeTransaction} 
   */
  public getMosaicSupplyChangeTransaction(
    mosaicId: MosaicId,
    supply: UInt64
  ): MosaicSupplyChangeTransaction
  {
    return MosaicSupplyChangeTransaction.create(
      Deadline.create(this.epochAdjustment),
      mosaicId,
      MosaicSupplyChangeAction.Increase,
      supply,
      this.networkType,
      UInt64.fromUint(ContractConstants.DEFAULT_TRANSACTION_FEE)
    );
  }

  /**
   * Get a MosaicAliasTransaction object
   *
   * @param {PublicAccount} publicAccount 
   * @param {string}        namespaceName 
   * @param {MosaicId}      mosaicId 
   * @return {MosaicAliasTransaction}
   */
  public getMosaicAliasTransaction(
      namespaceName: string,
      mosaicId: MosaicId
  ): MosaicAliasTransaction
  {
    return MosaicAliasTransaction.create(
      Deadline.create(this.epochAdjustment),
      AliasAction.Link,
      new NamespaceId(namespaceName),
      mosaicId,
      this.networkType,
      UInt64.fromUint(ContractConstants.DEFAULT_TRANSACTION_FEE)
    );
  }

  /**
   * Get a TransferTransaction object
   *
   * @param {Address}               recipient
   * @param {MosaicId|NamespaceId}  mosaicId 
   * @param {number}                amount 
   * @return {TransferTransaction}
   */
  public getTransferTransaction(
    recipient: Address,
    mosaicId: MosaicId|NamespaceId,
    amount: number,
    message: string = 'nem2-smart-contracts transfer',
  ): TransferTransaction
  {
    return TransferTransaction.create(
      Deadline.create(this.epochAdjustment),
      recipient,
      [new Mosaic(mosaicId, UInt64.fromUint(amount))],
      PlainMessage.create(message),
      this.networkType,
      UInt64.fromUint(ContractConstants.DEFAULT_TRANSACTION_FEE),
    )
  }

  /**
   * Get a HashLockTransaction object
   *
   * @param {Mosaic}            mosaic 
   * @param {number}            duration 
   * @param {SignedTransaction} signedAggregate 
   * @return {HashLockTransaction}
   */
  public getHashLockTransaction(
    mosaic: Mosaic,
    duration: number,
    signedAggregate: SignedTransaction,
  ): HashLockTransaction
  {
    // create lock funds of 10 "cat.currency" for the aggregate transaction
    return HashLockTransaction.create(
      Deadline.create(this.epochAdjustment),
      mosaic,
      UInt64.fromUint(duration),
      signedAggregate,
      this.networkType,
      UInt64.fromUint(ContractConstants.DEFAULT_TRANSACTION_FEE),
    )
  }
}