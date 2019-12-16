<p align="center"><img src="https://nem.io/wp-content/themes/nem/img/logo-nem.svg" width="400"></p>

This package aims to provide with a command line interface helping you to **execute disposable smart contracts** with Catapult.

*The author of this package cannot be held responsible for any loss of money or any malintentioned usage forms of this package. Please use this package with caution.*

This package is annexed to following case study article on the NEM Forum: https://forum.nem.io/t/catapult-disposable-smart-contracts

Package licensed under [Apache v2.0](LICENSE) License.

# Instructions / Environment

1. Clone the Project

```
git clone https://github.com/evias/nem2-smart-contracts.git`
```

2. Install the required dependencies.

```
cd nem2-smart-contracts && npm install
```

3. Build

```
npm run build
```

# Examples

Please, make sure to follow the Instructions above before executing example commands. The package must be installed and built using NPM.

1. Execute the `AssetCreation` disposable smart contract

```bash
$ ./nem2-smart-contracts AssetCreation
```

2. Execute the `AssetRequest` disposable smart contract

```bash
$ ./nem2-smart-contracts AssetRequest --debug true
```

3. Execute the `PartialCosignature` disposable smart contract

```bash
$ ./nem2-smart-contracts PartialCosignature --debug true
```

## Donations / Pot de vin

Donations can be made with cryptocurrencies and will be used for running the project!

    NEM:       NB72EM6TTSX72O47T3GQFL345AB5WYKIDODKPPYW
    Bitcoin:   3EVqgUqYFRYbf9RjhyjBgKXcEwAQxhaf6o

| Username | Role |
| --- | --- |
| [eVias](https://github.com/evias) | Project Lead |

## License

This software is released under the [Apache v2.0](LICENSE) License.

© 2019 Grégory Saive <greg@evias.be> for NEM (https://nem.io), All rights reserved.
