/**
 * Copyright 2019-2021 Grégory Saive for NEM (https://nem.io)
 * Copyright 2021-present Using Blockchain Ltd, All rights reserved.
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
import {CLI, Shim} from 'clime';
import * as Path from 'path';

// The second parameter is the path to folder that contains command modules.
const cli = new CLI('symbol-contract', Path.join(__dirname, 'contracts'));

// Clime in its core provides an object-based command-line infrastructure.
// To have it work as a common CLI, a shim needs to be applied:
const shim = new Shim(cli);
shim.execute(process.argv);
