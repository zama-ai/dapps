# FhEVM Hardhat contracts examples

## Featured contracts


## Getting Started

### Pre Requisites

Before being able to run any command, you need to create a `.env` file and set a BIP-39 compatible mnemonic as the `MNEMONIC`
environment variable. You can follow the example in `.env.example` or start with the following command:

```sh
cp .env.example .env
```

If you don't already have a mnemonic, you can use this [website](https://iancoleman.io/bip39/) to generate one. An alternative, if you have [foundry](https://book.getfoundry.sh/getting-started/installation) installed is to use the `cast wallet new-mnemonic` command.

Then, install all needed dependencies - please **_make sure to use Node v20_** or more recent:

```sh
npm install
```

### Compile

Compile the smart contracts with Hardhat:

```sh
npm run compile
```

### TypeChain

Compile the smart contracts and generate TypeChain bindings:

```sh
npm run typechain
```

### Test

Run the tests with Hardhat - this will run the tests on a local hardhat node in mocked mode (i.e the FHE operations and decryptions will be simulated by default):

```sh
npm run test
```

### Lint Solidity

Lint the Solidity code:

```sh
npm run lint:sol
```

### Lint TypeScript

Lint the TypeScript code:

```sh
npm run lint:ts
```


### Clean

Delete the smart contract artifacts, the coverage reports and the Hardhat cache:

```sh
npm run clean
```

### Mocked mode

The mocked mode allows faster testing and the ability to analyze coverage of the tests. In this mocked version,
encrypted types are not really encrypted, and the tests are run on the original version of the EVM, on a local hardhat
network instance. To run the tests in mocked mode, you can use directly the following command:

```bash
npm run test
```

You can still use all the usual specific [hardhat network methods](https://hardhat.org/hardhat-network/docs/reference#hardhat-network-methods), such as `evm_snapshot`, `evm_mine`, `evm_increaseTime`, etc, which are very helpful in a testing context. Another useful hardhat feature, is the [console.log](https://hardhat.org/hardhat-network/docs/reference#console.log) function which can be used in fhevm smart contracts in mocked mode as well.

To analyze the coverage of the tests (in mocked mode necessarily, as this cannot be done on the real fhEVM node), you
can use this command :

```bash
npm run coverage
```

Then open the file `coverage/index.html`. You can see there which line or branch for each contract which has been
covered or missed by your test suite. This allows increased security by pointing out missing branches not covered yet by
the current tests.

Finally, a new fhevm-specific feature is available in mocked mode: the `debug.decrypt[XX]` functions, which can decrypt directly any encrypted value. Please refer to the [utils.ts](https://github.com/zama-ai/fhevm/blob/main/test/utils.ts#L87-L317) file for the corresponding documentation.

> [!Note]
> Due to intrinsic limitations of the original EVM, the mocked version differs in rare edge cases from the real fhEVM, the main difference is the gas consumption for the FHE operations (native gas is around 20% underestimated in mocked mode). This means that before deploying to production, developers should still run the tests with the original fhEVM node, as a final check - i.e in non-mocked mode (see next section).

### Non-mocked mode - Sepolia

To run your test on a real fhevm node, you can use the coprocessor deployed on the Sepolia test network. To do this, ensure you are using a valid value `SEPOLIA_RPC_URL` in your `.env` file. You can get free Sepolia RPC URLs by creating an account on services such as [Infura](https://www.infura.io/) or [Alchemy](https://www.alchemy.com/). Then you can use the following command:

```bash
npx hardhat test [PATH_TO_YOUR_TEST] --network sepolia
```

The `--network sepolia` flag will make your test run on a real fhevm coprocessor. Obviously, for the same tests to pass on Sepolia, contrarily to mocked mode, you are not allowed to use any hardhat node specific method, and neither use any of the `debug.decrypt[XX]` functions.

> [!Note]
> For this test to succeed, first ensure you set your own private `MNEMONIC` variable in the `.env` file and then  ensure you have funded your test accounts on Sepolia. For example you can use the following command to get the corresponding private keys associated with the first `5` accounts derived from the mnemonic: 
```
npx hardhat get-accounts --num-accounts 5
```
This will let you add them to the Metamask app, to easily fund them from your personal wallet. 

If you don't own already Sepolia test tokens, you can for example use a free faucet such as [https://sepolia-faucet.pk910.de/](https://sepolia-faucet.pk910.de/).

Another faster way to test the coprocessor on Sepolia is to simply run the following command:
```
npm run deploy-sepolia
```
This would automatically make Alice's account deploy an instance of the `MyConfidentialERC20` example contract on Sepolia, and then make Alice mint to herself `10000` tokens.


### Etherscan verification

If you are using a real instance of the fhEVM, you can verify your deployed contracts on the Etherscan explorer. 
You first need to set the `ETHERSCAN_API_KEY` variable in the `.env` file to a valid value. You can get such an API key for free by creating an account on the [Etherscan website](https://docs.etherscan.io/getting-started/viewing-api-usage-statistics). 

Then, simply use the `verify-deployed` hardhat task, via this command:
```
npx hardhat verify-deployed --address [ADDRESS_CONTRACT_TO_VERIFY] --contract [FULL_CONTRACT_PATH] --args "[CONSTRUCTOR_ARGUMENTS_COMMA_SEPARATED]" --network [NETWORK_NAME]
```
As a concrete example, to verify the deployed `MyConfidentialERC20` from previous section, you can use:
```
npx hardhat verify-deployed --address [CONFIDENTIAL_ERC20_ADDRESS] --contract contracts/MyConfidentialERC20.sol:MyConfidentialERC20 --args "Naraggara,NARA" --network sepolia
```

Note that you should replace the address placeholder `[CONFIDENTIAL_ERC20_ADDRESS]` by the concrete address that is logged when you run the `npm run deploy-sepolia` deployment script.


## License

This project is licensed under MIT.
