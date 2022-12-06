<p align="center"><img src="https://nem.io/wp-content/themes/nem/img/logo-nem.svg" width="400"></p>

This package aims to provide with a command line interface helping you to **execute disposable smart contracts** with Catapult.

*The author of this package cannot be held responsible for any loss of money or any malintentioned usage forms of this package. Please use this package with caution.*

This package is annexed to following case study article on the NEM Forum: https://forum.nem.io/t/catapult-disposable-smart-contracts

Package licensed under [Apache v2.0](LICENSE) License.

# Instructions / Environment

1. Clone the Project

```
git clone https://github.com/evias/symbol-smart-contracts.git`
```

2. Install the required dependencies.

```
cd symbol-smart-contracts && npm install
```

3. Build

```
npm run build
```

# Examples

Please, make sure to follow the Instructions above before executing example commands. The package must be installed and built using NPM.

1. Execute the `AssetCreation` disposable smart contract

```bash
$ ./symbol-smart-contracts AssetCreation
```

2. Execute the `AssetRequest` disposable smart contract

```bash
$ ./symbol-smart-contracts AssetRequest --debug true
```

3. Execute the `PartialCosignature` disposable smart contract

```bash
$ ./symbol-smart-contracts PartialCosignature --debug true
```

## Sponsor us

| Platform | Sponsor Link |
| --- | --- |
| Paypal | [https://paypal.me/usingblockchainltd](https://paypal.me/usingblockchainltd) |
| Patreon | [https://patreon.com/usingblockchainltd](https://patreon.com/usingblockchainltd) |
| Github | [https://github.com/sponsors/UsingBlockchain](https://github.com/sponsors/UsingBlockchain) |

## Donations / Pot de vin

Donations can also be made with cryptocurrencies and will be used for running the project!

    NEM      (XEM):     NB72EM6TTSX72O47T3GQFL345AB5WYKIDODKPPYW
    Symbol   (XYM):     NDQALDK4XWLOUYKPE7RDEWUI25YNRQ7VCGXMPCI
    Ethereum (ETH):     0x7a846fd5Daa4b904caF7C59f866bb906153305D2
    Bitcoin  (BTC):     3EVqgUqYFRYbf9RjhyjBgKXcEwAQxhaf6o

## Credits

| Name | Contributions |
| --- | --- |
| Using Blockchain Ltd (@UsingBlockchain) <info@using-blockchain.org> | Product Owner |
| Grégory Saive (@eVias) | Lead Engineering |

## Disclaimer

  *The author of this package cannot be held responsible for any loss of money or any malintentioned usage forms of this package. Please use this package with caution.*

  *Our software contains links to the websites of third parties (“external links”). As the content of these websites is not under our control, we cannot assume any liability for such external content. In all cases, the provider of information of the linked websites is liable for the content and accuracy of the information provided. At the point in time when the links were placed, no infringements of the law were recognisable to us..*

## License

Copyright 2019 Grégory Saive <greg@evias.be> for NEM (https://nem.io), All rights reserved.
Copyright 2020-2021 Using Blockchain Ltd, Reg No.: 12658136, United Kingdom, All rights reserved.

Licensed under the [Apache 2.0](LICENSE).
