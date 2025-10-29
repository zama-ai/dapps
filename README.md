# fhEVM dApp Examples

This repository contains example dApps built using fhEVM (Fully Homomorphic EVM). Each example demonstrates different aspects of building privacy-preserving smart contracts using FHE operations.

## Project Structure

This repository has a monorepo structure with the following components:

```
dapps/
├── packages/
│   ├── hardhat/                   # Smart contracts & deployment examples
│   ├── fhevm-sdk/                 # FHEVM SDK package
│   └── erc7984example/            # React erc7984 example application
└── scripts/                       # Build and deployment scripts
```

## Smart Contract Examples

The `./packages/hardhat` folder contains several privacy-preserving smart contract examples:

### Basic FHE Operations
- **Encryption/Decryption** - Examples of encrypting and decrypting values
- **FHE Operators** - Basic homomorphic operations like addition and conditional logic
- **User Decrypt** - User-side decryption examples
- **Public Decrypt** - Public on-chain decryption capabilities

### Advanced Applications
- **FHE Wordle** - Privacy-preserving word guessing game using encrypted letter comparisons
- **Confidential Auctions** - Multiple auction implementations with encrypted bids:
  - Blind auctions with sealed bids
  - Dutch auctions with descending prices

### Token & Wrapper Contracts
- **Confidential Token Example** - Mock confidential token for testing
- **ERC20 Wrapper** - Wrapper for standard ERC20 tokens
- **ETH Wrapper** - Wrapper for native ETH
- **Faucet Contract** - Test token distribution contract

### Mock Contracts
- **Mock USDZ** - Mock stablecoin implementation
- **Prize Item** - Mock NFT-like contract

Each example includes detailed documentation in its respective README explaining the implementation and FHE usage.

## Frontend examples

### ERC7984 Token Example Frontend

The `./packages/erc7984example` directory contains a simple React-based frontend that demonstrates interacting with an ERC7984 confidential token smart contract using the fhEVM SDK.

**Features:**
- Uses OpenZeppelin's confidential smart contract library.
- Connect your Ethereum wallet (e.g., via MetaMask).
- Mint, transfer, and check balances of ERC7984 confidential tokens, all using fully homomorphic encryption under the hood.
- Perform transactions with strong privacy guarantees: amounts and balances remain encrypted on-chain.
- User-friendly interface to experiment with confidential token operations.


## 🛠️ Quick Start

### 1. Clone and Setup

```bash
# Clone the repository
git clone <repository-url>
cd dapps

# Install dependencies
pnpm install
```

### 2. Environment Configuration

Set up your Hardhat environment variables by following the [FHEVM documentation](https://docs.zama.ai/protocol/solidity-guides/getting-started/setup#set-up-the-hardhat-configuration-variables-optional):

- `MNEMONIC`: Your wallet mnemonic phrase
- `INFURA_API_KEY`: Your Infura API key for Sepolia

### 3. Start Development Environment

**Option A: Local Development (Recommended for testing)**

```bash
# Terminal 1: Start local Hardhat node
pnpm chain
# RPC URL: http://127.0.0.1:8545 | Chain ID: 31337

# Terminal 2: Deploy contracts to localhost
pnpm deploy:localhost

# Terminal 3: Start the frontend
pnpm run start
```

**Option B: Sepolia Testnet**

```bash
# Deploy to Sepolia testnet
pnpm deploy:sepolia

# Start the frontend
pnpm run start
```

### 4. Connect MetaMask

1. Open [http://localhost:3000](http://localhost:3000) in your browser
2. Click "Connect Wallet" and select MetaMask
3. If using localhost, add the Hardhat network to MetaMask:
   - **Network Name**: Hardhat Local
   - **RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `31337`
   - **Currency Symbol**: `ETH`

### ⚠️ Sepolia Production note

- In production, `NEXT_PUBLIC_ALCHEMY_API_KEY` must be set (see `packages/erc7984example/scaffold.config.ts`). The app throws if missing.
- Ensure `packages/erc7984example/contracts/deployedContracts.ts` points to your live contract addresses.
- Optional: set `NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID` for better WalletConnect reliability.
- Optional: add per-chain RPCs via `rpcOverrides` in `packages/erc7984example/scaffold.config.ts`.

## 🔧 Troubleshooting

### Common MetaMask + Hardhat Issues

When developing with MetaMask and Hardhat, you may encounter these common issues:

#### ❌ Nonce Mismatch Error

**Problem**: MetaMask tracks transaction nonces, but when you restart Hardhat, the node resets while MetaMask doesn't update its tracking.

**Solution**:
1. Open MetaMask extension
2. Select the Hardhat network
3. Go to **Settings** → **Advanced**
4. Click **"Clear Activity Tab"** (red button)
5. This resets MetaMask's nonce tracking

#### ❌ Cached View Function Results

**Problem**: MetaMask caches smart contract view function results. After restarting Hardhat, you may see outdated data.

**Solution**:
1. **Restart your entire browser** (not just refresh the page)
2. MetaMask's cache is stored in extension memory and requires a full browser restart to clear

> 💡 **Pro Tip**: Always restart your browser after restarting Hardhat to avoid cache issues.

For more details, see the [MetaMask development guide](https://docs.metamask.io/wallet/how-to/run-devnet/).

## Contributing

This repository serves as a comprehensive example of building privacy-preserving dApps with fhEVM. Feel free to explore the examples, run the tests, and use them as a foundation for your own projects.

## 📄 License

This project is licensed under the **BSD-3-Clause-Clear License**. See the [LICENSE](LICENSE) file for details.

