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
export const description = `
                      ____
 _ __   ___ _ __ ___ |___ \\
| \'_ \\ / _ \\ \'_ \` _ \\  __) |
| | | |  __/ | | | | |/ __/
|_| |_|\\___|_| |_| |_|_____|

`;

export const subcommands = [
  {
    name: 'AssetCreation',
    brief: 'Disposable Smart Contract for Creation of Assets',
  },
  {
    name: 'AssetEscrow',
    brief: 'Disposable Smart Contract for Escrow of Assets',
  },
  {
    name: 'AssetRequest',
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
];
