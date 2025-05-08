# fhEVM dApp examples

This repository contains example dApps built using fhEVM (Fully Homomorphic EVM). Each example demonstrates different aspects of building privacy-preserving smart contracts using FHE operations.

## Examples featured

The `/hardhat` folder contains several privacy-preserving smart contract examples:

1. **Confidential Counter** - Progressive examples demonstrating FHE operations from basic to multi-user counters

2. **Confidential ERC20** - Privacy-preserving token implementation with encrypted balances and transfers

3. **Decentralized Identity** - System for encrypted identity management and credential verification

4. **FHE Wordle** - Privacy-preserving word guessing game using encrypted letter comparisons

5. **Confidential Auctions** - Multiple auction implementations with encrypted bids:
   - Blind auctions with sealed bids
   - Dutch auctions with descending prices

Each example includes detailed documentation in its README explaining the implementation and FHE usage.

## How to use this repo

You can either deploy the dApp on the real fhEVM coprocessor on the Ethereum Sepolia testnet, or on a local Hardhat node (i.e a mocked coprocessor).

### Sepolia Testnet Deployment
1. Deploy the contract:
```bash
cd hardhat/
cp .env.example .env  # Or use custom mnemonic
npm install
npm run test # to check if everything works as it should
npm run deploy-sepolia
```
> **Note:** Use your own private mnemonic in `.env`

> **WARNING:** The Frontend is not currently implemented 

2. Launch frontend:
```bash
cd frontend/
cp .env.example .env  # Or use custom mnemonic
npm install
npm run dev
```

Access at [`http://localhost:4173/`](http://localhost:4173/)

### Local Development (Mocked Mode)
1. Setup local node:
```bash
cd hardhat/
cp .env.example .env  # Or use custom mnemonic
npm install
npx hardhat node
```

2. Launch frontend:
```bash
cd frontend/
cp .env.example .env  # Or use custom mnemonic
npm install
npm run dev-mocked
```

Access at [`http://localhost:4173/`](http://localhost:4173/)

#### Troubleshooting

**_Invalid nonce errors:_** 
For invalid nonce errors after restarting Hardhat node:
1. Open Metamask
2. Select Hardhat network
3. Go to `Settings` -> `Advanced` -> `Clear activity tab data`

