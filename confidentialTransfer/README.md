# Fhevm React Template

A modern React template for building decentralized applications (dApps) with Fully Homomorphic Encryption (FHE) capabilities using fhevmjs.

## Features

- **fhevmjs**: Fully Homomorphic Encryption for Ethereum Virtual Machine
- **React**: Modern UI framework for building interactive interfaces
- **Vite**: Next-generation frontend build tool
- **Wagmi**: React hooks for Ethereum
- **Tailwind**: Utility-first CSS framework for rapid UI development
- **@reown/appkit**: Comprehensive toolkit for Web3 authentication including social logins and multi-wallet support
- **@radix-ui**: Unstyled, accessible UI components for building high-quality design systems and web apps

## Prerequisites

- Node.js (v20 or higher)
- npm, yarn, or pnpm package manager
- MetaMask or another Ethereum wallet

## Getting Started

1. Fork the following repository:
   [https://github.com/zama-ai/fhevm-react-template](https://github.com/zama-ai/fhevm-react-template)

2. Clone your repository:

```bash
git clone https://github.com/your-username/fhevm-react-template
cd fhevm-react-template
```

1. Install dependencies:

```bash
npm install
# or
yarn install
pnpm install
```

1. Configure environment variables:

```bash
cp .env.example .env
```

Update `.env` with your specific configuration:

- `VITE_ACL_ADDRESS`: fhevm specific
- `VITE_KMS_ADDRESS`: fhevm specific
- `VITE_GATEWAY_URL`: fhevm specific
- `VITE_PROJECT_ID`: Obtain your project ID by signing up at [reown.com](https://reown.com/). This enables social login and multi-wallet support.
- `VITE_CONF_TOKEN_ADDRESS`: The address of your deployed confidential ERC20 token contract on Sepolia testnet. You'll get this after deploying the smart contract.

## Development

Start the development server:

```bash
npm run dev
# or
yarn dev
pnpm dev
```

Visit [http://localhost:5173/](http://localhost:5173/) to view your application.

## Production Build

Create a production-ready build:

```bash
npm run build
# or
yarn build
pnpm build
```

## Development Options

### Using the Mocked Coprocessor

For faster development without testnet tokens, you can use a mocked fhevm:

1. Check out the `ConfidentialERC20` example in the [`mockedFrontend` branch](https://github.com/zama-ai/fhevm-react-template/tree/mockedFrontend)
2. Follow the branch-specific README for setup instructions
3. Develop and test your dApp locally before deploying to Sepolia

### Using Sepolia Testnet

For testing with real network conditions, deploy your dApp to Sepolia testnet:

1. Ensure you have Sepolia testnet ETH
2. Configure your `.env` with Sepolia network details
3. Deploy and test your contracts

## Learn More

- [fhevm Documentation](https://docs.zama.ai/fhevm)
- [React Documentation](https://reactjs.org/)
- [Vite Documentation](https://vitejs.dev/)
- [Wagmi Documentation](https://wagmi.sh/)

## Support

For questions and support:

- [fhevm Discord Community](https://discord.gg/zamaai)
- [GitHub Issues](https://github.com/zama-ai/fhevm-react-template/issues)

## License

This project is licensed under the MIT License - see the LICENSE file for details.
