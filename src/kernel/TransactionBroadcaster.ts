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
import chalk from 'chalk';
import {
    Account,
    Transaction,
    SignedTransaction,
    AggregateTransaction,
    PublicAccount,
    TransactionHttp,
    Listener,
    Deadline,
    UInt64,
    NetworkType,
    TransactionStatusError,
} from 'nem2-sdk';
import { Contract } from './Contract';

export class TransactionBroadcaster {
  /**
   * Create a transaction broadcaster instance
   *
   * @param {string}    endpointUrl
   */
  constructor(
    /**
     * Parent context (Contract)
     * @var {Contract}
     **/
    protected readonly contract: Contract,
    /**
     * The explorer URL
     * @var {string}
     **/
    protected readonly explorerUrl: string,
    /**
     * The node URL
     * @var {string}
     **/
    protected readonly endpointUrl: string,
    /**
     * Whether to enable debug mode or not
     * @var {boolean}
     **/
    protected readonly enableDebug: boolean = false) {
  }

  /**
   * Display success message
   *
   * @param {PublicAccount}     account 
   * @param {SignedTransaction} signedTransaction 
   */
  protected informSuccess(
    account: PublicAccount,
    signedTransaction: SignedTransaction
  ): void {
    // prepare display
    const explorerUrl  = this.explorerUrl
    const explorerTx   = explorerUrl + '/transaction/' + signedTransaction.hash
    const explorerAcct = explorerUrl + '/account/' + account.address.plain()

    console.log('')
    console.log(chalk.green('Smart contract \'' + this.contract.getName() + '\' executed successfully'))
    console.log(chalk.green('View Transaction:    ' + explorerTx))
    console.log(chalk.green('View Issuer Account: ' + explorerAcct))
    console.log('')
  }

  /**
   * Display error message
   *
   * @param {PublicAccount}     account 
   * @param {SignedTransaction} signedTransaction 
   */
  protected informError(
    error: TransactionStatusError
  ): void {
    const linkStatus = this.endpointUrl + '/transaction/' + error.hash  + '/status'
    console.log('')
    console.log(chalk.red('Smart contract \'' + this.contract.getName() + '\' failed executing'))
    console.log(chalk.red('Failure Reason (Code):  ' + error.status))
    console.log(chalk.red('View Status Details:    ' + linkStatus))
    console.log('')
  }

  /**
   * Announce said transactions list
   *
   * @param {PublicAccount}       account 
   * @param {SignedTransaction[]} transactions
   */
  public async announce(
    account: PublicAccount,
    signedTransaction: SignedTransaction
  ): Promise<Object> 
  {
    // open confirmation listener
    const transactionHttp = new TransactionHttp(this.endpointUrl)
    const confirmedListener = new Listener(this.endpointUrl)
    await confirmedListener.open()

    if (this.enableDebug === true) {
      console.log('')
      console.log(chalk.yellow('Smart Contract Execution Hash: ', signedTransaction.hash))
      console.log(chalk.yellow('Signed Smart Contract: \n\n\t', signedTransaction.payload))
      console.log('')
    }

    // announce transaction
    try { await transactionHttp.announce(signedTransaction) }
    catch (e) { this.contract.error('An error occured: ' + e) }

    // listen to errors
    confirmedListener.status(account.address).subscribe((err) => {
      this.informError(err)
      process.exit(1)
    })

    // wait for transaction confirmation
    return confirmedListener.confirmed(account.address, signedTransaction.hash).subscribe(
      (transaction) => {
        this.informSuccess(
          account,
          signedTransaction
        )
        process.exit(0)
      })
  }
}