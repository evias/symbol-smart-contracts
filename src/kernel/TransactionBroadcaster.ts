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
    CosignatureSignedTransaction,
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
   * Sign and announce transaction
   *
   * @param {PublicAccount}     account 
   * @param {SignedTransaction} transaction
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

  /**
   * Sign and announce aggregate bonded transaction
   *
   * @param {PublicAccount}     account 
   * @param {SignedTransaction} transaction
   */
  public async announcePartial(
    account: PublicAccount,
    signedHashLock: SignedTransaction,
    signedPartial: SignedTransaction
  ): Promise<Object> 
  {
    // open confirmation listener
    const transactionHttp = new TransactionHttp(this.endpointUrl)
    const confirmedListener = new Listener(this.endpointUrl)
    await confirmedListener.open()

    if (this.enableDebug === true) {
      console.log('')
      console.log(chalk.yellow('Smart Contract Execution Hash: ', signedPartial.hash, '\n'))
      console.log(chalk.yellow('Signed Smart Contract: \n\n\t', signedPartial.payload, '\n'))
      console.log(chalk.yellow('Signed Smart Contract SPAM Protection: \n\n\t', signedHashLock.payload))
      console.log('')
    }

    // first announce the hash lock and wait for confirmation
    try { await transactionHttp.announce(signedHashLock) }
    catch (e) { this.contract.error('An error occured: ' + e) }

    // listen to errors
    confirmedListener.status(account.address).subscribe((err) => {
      this.informError(err)
      process.exit(1)
    })
     
    // wait for HASH LOCK transaction confirmation
    return confirmedListener.confirmed(account.address, signedHashLock.hash).subscribe(
      async (transaction) => {
        // announce aggregate bonded transaction
        try { await transactionHttp.announceAggregateBonded(signedPartial) }
        catch (e) { this.contract.error('An error occured: ' + e) }

        // transaction added to partial pool
        confirmedListener.aggregateBondedAdded(account.address, signedPartial.hash).subscribe(
          (transaction) => {
            this.informPartialSuccess()
          })

        // transaction co-signed by TAKER
        confirmedListener.cosignatureAdded(account.address).subscribe(
          (cosigSignedTransaction) => {
            this.informCosigSuccess(cosigSignedTransaction)
          })

        // wait for transaction confirmation
        return confirmedListener.confirmed(account.address, signedPartial.hash).subscribe(
          (transaction) => {
            this.informSuccess(
              account,
              signedPartial
            )
            process.exit(0)
          })
      })
  }

  /**
   * Sign and announce transaction
   *
   * @param {PublicAccount}                 account 
   * @param {CosignatureSignedTransaction}  transaction
   */
  public async announceCosignature(
    account: PublicAccount,
    signedTransaction: CosignatureSignedTransaction
  ): Promise<Object> 
  {
    // open confirmation listener
    const transactionHttp = new TransactionHttp(this.endpointUrl)
    const confirmedListener = new Listener(this.endpointUrl)
    await confirmedListener.open()

    if (this.enableDebug === true) {
      console.log('')
      console.log(chalk.yellow('Creating Smart Contract Co-Signature with account public key: ', signedTransaction.signerPublicKey))
      console.log('')
    }

    // announce transaction
    try { await transactionHttp.announceAggregateBondedCosignature(signedTransaction) }
    catch (e) { this.contract.error('An error occured: ' + e) }

    // listen to errors
    confirmedListener.status(account.address).subscribe((err) => {
      this.informError(err)
      process.exit(1)
    })

    // transaction co-signed
    return confirmedListener.cosignatureAdded(account.address).subscribe(
      (cosigSignedTransaction) => {
        this.informCosigSuccess(cosigSignedTransaction)
        this.informPartialSuccess()
        process.exit(0)
      })
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
    console.log(chalk.green('Smart contract \'' + this.contract.getName() + '\' execution completed'))
    console.log(chalk.green('View Transaction:    ' + explorerTx))
    console.log(chalk.green('View Issuer Account: ' + explorerAcct))
    console.log('')
  }

  /**
   * Display partial transaction success message
   *
   * @param {PublicAccount}     account 
   * @param {SignedTransaction} signedTransaction 
   */
  protected informPartialSuccess(): void {
    console.log('')
    console.log(chalk.green('Smart contract \'' + this.contract.getName() + '\' executed successfully'))
    console.log(chalk.green('Now waiting for co-signatures from other involved parties.'))
    console.log('')
  }

  /**
   * Display partial transaction success message
   *
   * @param {PublicAccount}     account 
   * @param {SignedTransaction} signedTransaction 
   */
  protected informCosigSuccess(
    signedTransaction: CosignatureSignedTransaction
  ): void {
    console.log('')
    console.log(chalk.green('New co-signature added for ' + signedTransaction.parentHash + '.'))
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
}