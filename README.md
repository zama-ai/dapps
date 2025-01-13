# fhevm-react-template

This is an example dApp made with React.js to let users do transfers of a `ConfidentialERC20` token on fhEVM. It contains also a button to request the decryption of an encrypted secret value.


## Examples featured

### Confidential Counter

The Confidential Counter examples demonstrate progressively more complex uses of FHE operations:

1. **Basic Counter (Sample 1)**
   - Simple encrypted counter using `euint8` type
   - Basic increment operation using FHE addition
   - Demonstrates minimal FHE setup and operations

2. **Input Counter (Sample 2)** 
   - Accepts encrypted input values to increment by
   - Shows how to handle encrypted inputs with proofs
   - Demonstrates converting between encrypted types

3. **Decryptable Counter (Sample 3)**
   - Adds decryption capability via Gateway integration
   - Shows how to request and handle decryption callbacks
   - Maintains both encrypted and decrypted state

4. **Multi-User Counter (Sample 4)**
   - Individual encrypted counters per user address
   - Demonstrates access control with FHE
   - Shows re-encryption for specific users
   - Uses mapping for multiple encrypted values

Each sample builds on the previous one to showcase different FHE capabilities while maintaining security and privacy of the counter values.

### GuessRandomNumberGame

**How the Game Works**

1. **Random Target Generation**: Contract generates an encrypted random number within `MAX_VALUE` range using TFHE.

2. **Player Participation**: Players submit encrypted guesses with ZK proofs. One guess per address per round.

3. **Minimum Players**: Game requires `MIN_PLAYERS` submissions before proceeding.

4. **Winner Determination**: Uses FHE operations to privately find the closest guess to target while maintaining confidentiality.

5. **Decryption & Results**: Target, winning guess, and winner's address are securely decrypted via Zama Gateway. Results announced through `WinnerDeclared` event.

6. **Game Reset**: Automatically clears state, generates new target, and prepares for next round.

The game showcases FHE capabilities for secure random number generation, private comparisons, and controlled decryption while maintaining player privacy throughout.

### FHEWordle

**How the Game Works**

1. **Game Setup**: A factory contract deploys unique game instances for each player using minimal proxies. Each game has:
   - An encrypted target word (represented as encrypted letter indices 0-25)
   - A player address who can submit guesses
   - A relayer address who helps with FHE operations

2. **Word Submission**: The relayer submits the encrypted target word letters using `submitWord1`. The letters are stored as encrypted uint8 values.

3. **Player Guessing**: Players submit guesses by calling `guessWord1` with:
   - A word encoded as a uint32 (each letter as index 0-25)
   - A Merkle proof verifying the word is valid
   - Limited to 5 guesses total

4. **Guess Feedback**: After each guess, players can request feedback via `getGuess` which returns:
   - An encrypted equality mask showing exact letter matches (green)
   - An encrypted letter presence mask showing letters in wrong positions (yellow)

5. **Winning**: Players can claim victory using `claimWin` if they get all letters correct. The contract verifies this using FHE operations.

6. **Word Revelation**: After game completion, the target word can be revealed using `revealWordAndStore`.

7. **Proof Verification**: The relayer can verify game outcomes using Merkle proofs via `checkProof`.

The game leverages FHE operations to keep the target word encrypted while still allowing comparison with guesses. This prevents players from seeing the word until the game is complete.


### Decentralized Identity

**How it works**

1. **Identity Management**: The system consists of four main contracts:
   - `IdMapping`: Maps user addresses to unique IDs for identity tracking
   - `PassportID`: Stores encrypted passport/identity data like name, birthdate
   - `Diploma`: Manages encrypted educational credentials and degrees
   - `EmployerClaim`: Generates verifiable claims about age and education

2. **Identity Registration**:
   - Users first get a unique ID from `IdMapping` via `generateId()`
   - Authorized registrars can register encrypted passport data using `PassportID.registerIdentity()`
   - Educational institutions can register encrypted diploma data via `Diploma.registerDiploma()`

3. **Encrypted Data Storage**: All sensitive data is stored encrypted using FHE:
   - Names, birthdates, and biometric data in `PassportID`
   - University, degree type, and grades in `Diploma`
   - Access controlled through TFHE permissions

4. **Claim Generation**:
   - Users can generate verifiable claims about their identity/credentials
   - `EmployerClaim` supports two types of claims:
     - Adult verification (18+ age check)
     - Degree verification (specific degree requirements)
   - Claims preserve privacy by using encrypted comparisons

5. **Verification Process**:
   - Claims are generated as encrypted boolean results
   - Employers can verify claims without seeing actual data
   - Combined verification checks both age and education requirements
   - Results stored as encrypted verification status

The system leverages FHE operations to enable privacy-preserving identity and credential verification without exposing sensitive personal data.

### MyConfidentialERC20.sol

**How it works**

1. **Confidential Token**: A privacy-preserving ERC20 token implementation using Fully Homomorphic Encryption (FHE):
   - Balances and allowances are stored as encrypted values
   - Transfers and approvals operate on encrypted data
   - Inherits from ConfidentialERC20Mintable for basic token functionality

2. **Key Features**:
   - Encrypted balances using euint64 type
   - Standard ERC20 functions (transfer, approve, etc.) with FHE
   - Minting capability restricted to owner
   - Built-in decryption request/callback mechanism

3. **Secret Value Demo**:
   - Contains an encrypted SECRET value (set to 42)
   - Demonstrates Gateway decryption flow:
     - requestSecret() initiates decryption request
     - callbackSecret() receives and stores decrypted value
   - Shows basic FHE operations and Gateway integration

4. **Privacy Protection**:
   - All token balances and transfers are encrypted
   - Only transaction participants can view their own balances
   - Uses TFHE library for homomorphic operations
   - Integrates with Zama's FHE infrastructure

The contract showcases how to implement confidential tokens while maintaining ERC20 compatibility and leveraging FHE for privacy preservation.



## How to use this repo

You can either deploy the dApp on the real fhEVM coprocessor on the Ethereum Sepolia testnet, or on a local Hardhat node (i.e a mocked corpocessor).

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

