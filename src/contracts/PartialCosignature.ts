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
import chalk from 'chalk';
import { from as observableFrom } from 'rxjs'
import { filter, map, mergeMap } from 'rxjs/operators'
import {
    Account,
    Transaction,
    AggregateTransaction,
    AccountHttp,
    CosignatureSignedTransaction,
} from 'symbol-sdk';

import {OptionsResolver} from '../kernel/OptionsResolver';
import {Contract, ContractInputs} from '../kernel/Contract';
import {description} from './default'

export class PartialCosignatureInputs extends ContractInputs {
  @option({
    flag: 'h',
    description: 'Partial transaction hash (parent hash / aggregate transaction hash)',
  })
  hash: string;
}

@command({
  description: 'Disposable Smart Contract for Co-signature of Partial Transactions',
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
    return 'PartialCosignature'
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
   * Execution routine for the `PartialCosignature` smart contract.
   *
   * @description This contract is defined in three (3) steps.
   * This contract sends a cosignature transaction for 1 or more
   * unsigned partial transactions. If the end-user does not pass
   * a transaction hash, all unsigned transactions will be co-signed.
   *
   * @param {PartialCosignatureInputs} inputs
   * @return {Promise<any>}
   */
  @metadata
  async execute(inputs: PartialCosignatureInputs) 
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
      inputs['hash'] = OptionsResolver(inputs,
        'hash',
        () => { return ''; },
        'Enter a transaction hash (partial transaction hash) or leave empty (will co-sign any partial transactions): ');
    } catch (err) { this.error('Please, enter a valid transaction hash.'); }

    // --------------------------------
    // STEP 2: Prepare Contract Actions
    // --------------------------------

    const accountHttp = new AccountHttp(this.endpointUrl)
    const cosignatory = argv['account']

    // --------------------------------
    // STEP 3: Execute Contract Actions
    // --------------------------------

    // read aggregate-bonded transactions
    let unsignedTxes = await accountHttp.getAccountPartialTransactions(cosignatory.publicAccount.address).toPromise();

    if (! unsignedTxes.length) {
      console.log('')
      console.log(chalk.yellow("No transactions found to co-sign."));
      console.log('')
      return ; // contract not executed
    }

    return await this.executeContract(cosignatory, unsignedTxes)
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
    return observableFrom(transactions).pipe(
      filter((_: AggregateTransaction) => !_.signedByAccount(account.publicAccount)),
      map((transaction: AggregateTransaction) => this.getSigner(account, transaction)
                                                     .cosignAggregate(account),
      mergeMap((signedSignature: CosignatureSignedTransaction) => {
        return this.broadcaster.announceCosignature(account.publicAccount, signedSignature);
      })
    )).toPromise()
  }
}
