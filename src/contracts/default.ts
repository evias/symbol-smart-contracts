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
export const description = `
      _________            ___.          .__   
     /   _____/__.__. _____\\_ |__   ____ |  |  
     \\_____  <   |  |/     \\| __ \\ /  _ \\|  |  
     /        \\___  |  Y Y  \\ \\_\\ (  <_> )  |__
    /_______  / ____|__|_|  /___  /\\____/|____/
            \\/\\/          \\/    \\/             
`;

export const subcommands = [
  {
    name: 'CreateAsset',
    brief: 'Disposable Smart Contract for Creation of Assets',
  },
  {
    name: 'EscrowAsset',
    brief: 'Disposable Smart Contract for Escrow of Assets',
  },
  {
    name: 'RequestAsset',
    brief: 'Disposable Smart Contract for Request of Assets',
  },
  {
    name: 'PartialCosignature',
    brief: 'Disposable Smart Contract for Co-signature of Partial Transactions',
  },
  {
    name: 'OpenTimestamp',
    brief: 'Disposable Smart Contract for Creation of Open Timestamps',
  },
  {
    name: 'CreateAuthority',
    brief: '(NIP13) Disposable Smart Contract for Creation of Security Tokens Authorities - NIP13 CreateAuthority',
  },
  {
    name: 'ListSecurities',
    brief: '(NIP13) Disposable Smart Contract for Listing of Security Tokens',
  },
  {
    name: 'CreateSecurity',
    brief: '(NIP13) Disposable Smart Contract for Creation of Security Tokens - NIP13 CreateToken',
  },
  {
    name: 'CreatePartition',
    brief: '(NIP13) Disposable Smart Contract for Issuance of Security Tokens - NIP13 CreatePartition',
  },
  {
    name: 'TransferSecurity',
    brief: '(NIP13) Disposable Smart Contract for Transfer of Security Tokens between Partitions - NIP13 TransferOwnership',
  },
  {
    name: 'ForcedTransferSecurity',
    brief: '(NIP13) Disposable Smart Contract for forced Transfer of Security Tokens between Partitions - NIP13 ForcedTransfer',
  },
  {
    name: 'LockSecurityBalance',
    brief: '(NIP13) Disposable Smart Contract for Locking (part of) balances of Security Tokens - NIP13 LockBalance',
  },
  {
    name: 'UnlockSecurityBalance',
    brief: '(NIP13) Disposable Smart Contract for Unlocking (part of) balances of Security Tokens - NIP13 UnlockBalance',
  },
  {
    name: 'ModifySecurityMetadata',
    brief: '(NIP13) Disposable Smart Contract for Modifying metadata of Security Tokens - NIP13 ModifyMetadata',
  },
  {
    name: 'ModifySecurityRestriction',
    brief: '(NIP13) Disposable Smart Contract for Modifying restrictions of Security Tokens - NIP13 ModifyRestriction',
  },
  {
    name: 'ModifyPartitionRestriction',
    brief: '(NIP13) Disposable Smart Contract for Modifying restrictions of Token Holder Partitions - NIP13 ModifyRestriction',
  },
  {
    name: 'AttachSecurityDocument',
    brief: '(NIP13) Disposable Smart Contract for attaching documents to Security Tokens - NIP13 AttachDocument',
  },
  {
    name: 'AttachPartitionDocument',
    brief: '(NIP13) Disposable Smart Contract for attaching documents to token holder partitions - NIP13 AttachDocument',
  },
  {
    name: 'GovCreateAgreement',
    brief: '(Governable) Disposable Smart Contract for creating DAO launch agreements - Governable::CreateAgreement',
  },
];
