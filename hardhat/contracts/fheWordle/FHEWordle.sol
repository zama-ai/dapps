// SPDX-License-Identifier: BSD-3-Clause-Clear

pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/access/Ownable2Step.sol";
import "fhevm/lib/TFHE.sol";
import "fhevm/gateway/GatewayCaller.sol";
import "fhevm/config/ZamaFHEVMConfig.sol";
import "fhevm/config/ZamaGatewayConfig.sol";
/**
 * @title FHEordle
 * @notice This contract implements a fully homomorphic encryption (FHE) version of the classic word game, similar to "Wordle".
 *         It allows players to submit encrypted guesses and receive feedback on whether their guess is correct.
 *         The contract is integrated with a secure gateway that handles decryption requests to ensure confidentiality.
 * @dev This contract leverages the TFHE library for encryption operations and the MerkleProof library for verifying word sets.
 *      The game state and logic are managed using various public and private variables.
 */
contract FHEWordle is GatewayCaller, Ownable2Step, Initializable {
    // /// Constants
    bytes32 public constant root = 0x918fd5f641d6c8bb0c5e07a42f975969c2575250dc3fb743346d1a3c11728bdd;
    bytes32 public constant rootAllowed = 0xd3e7a12d252dcf5de57a406f0bd646217ec1f340bad869182e5b2bfadd086993;
    uint16 public constant wordSetSz = 5757;

    // /// Initialization variables
    address public playerAddr;
    address public relayerAddr;
    uint16 public testFlag;

    /// Secret Word Variables
    euint16 private word1Id;
    euint8[5] private word1Letters;
    euint32 private word1LettersMask;
    uint32 public word1;

    /// Player Guess variables
    uint8 public nGuesses;
    uint32[5] public guessHist;

    /// Game state variables
    bool public wordSubmitted;
    bool public gameStarted;
    bool public playerWon;
    bool public proofChecked;

    // Storage values for callbacks
    uint8 public l0;
    uint8 public l1;
    uint8 public l2;
    uint8 public l3;
    uint8 public l4;
    bytes32[] public storedProof;

    uint16 public decryptedWordId;
    uint8 public decryptedEqMask;
    uint32 public decryptedLetterMask;
    //events
    event WordSubmitted(address indexed player, uint32 word);
    event GuessDecryptionRequested(uint8 guessN, uint256 timestamp);
    event PlayerWon(address indexed player);
    event GuessDecrypted(uint8 decryptedEqMask, uint32 decryptedLetterMask);
    event WinDecryptionRequested(uint8 guessN, uint256 timestamp);
    event WordRevealRequested(address indexed player, uint256 timestamp);

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Initializes a new FHEWordle game instance
     * @dev Sets up the FHE configuration, game state variables and generates the secret word
     * @param _playerAddr Address of the player who will play this game instance
     * @param _relayerAddr Address of the relayer who will help with FHE operations
     * @param _testFlag If non-zero, uses this value as the word ID for testing purposes
     */
    function initialize(address _playerAddr, address _relayerAddr, uint16 _testFlag) external initializer {
        TFHE.setFHEVM(ZamaFHEVMConfig.getSepoliaConfig());
        Gateway.setGateway(ZamaGatewayConfig.getSepoliaConfig());

        relayerAddr = _relayerAddr;
        playerAddr = _playerAddr;
        testFlag = _testFlag;
        if (testFlag > 0) {
            word1Id = TFHE.asEuint16(testFlag);
        } else {
            word1Id = TFHE.rem(TFHE.randEuint16(), wordSetSz);
        }
        TFHE.allowThis(word1Id);
        TFHE.allow(word1Id, relayerAddr);
        word1LettersMask = TFHE.asEuint32(0);
        TFHE.allowThis(word1LettersMask);
        for (uint8 i = 0; i < 5; i++) {
            guessHist[i] = 0;
        }
        nGuesses = 0;
        wordSubmitted = false;
        gameStarted = false;
        playerWon = false;
        proofChecked = false;
        word1 = 0;
    }

    /**
     * @notice Gets the encrypted word ID for this game instance
     * @dev Can only be called by the relayer
     * @return euint16 The encrypted word ID
     */
    function getWord1Id() public view virtual onlyRelayer returns (euint16) {
        return (word1Id);
    }

    /**
     * @notice Submits the encrypted letters of a word
     * @dev Takes encrypted inputs and converts them to euint8 before calling internal submission function
     * @param el0 Encrypted first letter
     * @param el1 Encrypted second letter
     * @param el2 Encrypted third letter
     * @param el3 Encrypted fourth letter
     * @param el4 Encrypted fifth letter
     * @param inputProof Proof for the encrypted inputs
     */
    function submitWord1(
        einput el0,
        einput el1,
        einput el2,
        einput el3,
        einput el4,
        bytes calldata inputProof
    ) external {
        euint8 _l0 = TFHE.asEuint8(el0, inputProof);
        euint8 _l1 = TFHE.asEuint8(el1, inputProof);
        euint8 _l2 = TFHE.asEuint8(el2, inputProof);
        euint8 _l3 = TFHE.asEuint8(el3, inputProof);
        euint8 _l4 = TFHE.asEuint8(el4, inputProof);
        TFHE.allowThis(_l0);
        TFHE.allowThis(_l1);
        TFHE.allowThis(_l2);
        TFHE.allowThis(_l3);
        TFHE.allowThis(_l4);

        // Call the overloaded submitWord1 with euint8 values
        _submitWord1(_l0, _l1, _l2, _l3, _l4);
    }

    /**
     * @notice Internal function to submit encrypted word letters
     * @dev Stores the letters and creates an encrypted mask of the word
     * @param _l0 First letter as euint8
     * @param _l1 Second letter as euint8
     * @param _l2 Third letter as euint8
     * @param _l3 Fourth letter as euint8
     * @param _l4 Fifth letter as euint8
     */
    function _submitWord1(euint8 _l0, euint8 _l1, euint8 _l2, euint8 _l3, euint8 _l4) public {
        require(!wordSubmitted, "word submitted");
        word1Letters[0] = _l0;
        word1Letters[1] = _l1;
        word1Letters[2] = _l2;
        word1Letters[3] = _l3;
        word1Letters[4] = _l4;

        word1LettersMask = TFHE.or(
            TFHE.shl(TFHE.asEuint32(1), word1Letters[0]),
            TFHE.or(
                TFHE.shl(TFHE.asEuint32(1), word1Letters[1]),
                TFHE.or(
                    TFHE.shl(TFHE.asEuint32(1), word1Letters[2]),
                    TFHE.or(TFHE.shl(TFHE.asEuint32(1), word1Letters[3]), TFHE.shl(TFHE.asEuint32(1), word1Letters[4]))
                )
            )
        );
        TFHE.allowThis(word1LettersMask);
        wordSubmitted = true;
        gameStarted = true;
    }

    /**
     * @notice Allows player to submit a guess word
     * @dev Verifies the word is valid using a Merkle proof
     * @param word The guessed word encoded as a uint32
     * @param proof Merkle proof to verify the word is valid
     */
    function guessWord1(uint32 word, bytes32[] calldata proof) public onlyPlayer {
        require(gameStarted, "game not started");
        require(nGuesses < 5, "cannot exceed five guesses!");

        uint8 zeroIndex = 0;
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(zeroIndex, word))));
        require(MerkleProof.verify(proof, rootAllowed, leaf), "Invalid word");
        guessHist[nGuesses] = word;
        nGuesses += 1;
    }

    /**
     * @notice Creates an encrypted mask showing which letters match exactly
     * @dev Internal function used by getGuess
     * @param guessN Index of the guess to check
     * @return euint8 Encrypted mask where 1 bits indicate exact matches
     */
    function getEqMask(uint8 guessN) internal returns (euint8) {
        uint32 word = guessHist[guessN];
        uint8 _l0 = uint8((word) % 26);
        uint8 _l1 = uint8((word / 26) % 26);
        uint8 _l2 = uint8((word / 26 / 26) % 26);
        uint8 _l3 = uint8((word / 26 / 26 / 26) % 26);
        uint8 _l4 = uint8((word / 26 / 26 / 26 / 26) % 26);

        euint8 g0 = TFHE.asEuint8(TFHE.eq(word1Letters[0], _l0));
        euint8 g1 = TFHE.asEuint8(TFHE.eq(word1Letters[1], _l1));
        euint8 g2 = TFHE.asEuint8(TFHE.eq(word1Letters[2], _l2));
        euint8 g3 = TFHE.asEuint8(TFHE.eq(word1Letters[3], _l3));
        euint8 g4 = TFHE.asEuint8(TFHE.eq(word1Letters[4], _l4));

        euint8 eqMask = TFHE.or(
            TFHE.shl(g0, 0),
            TFHE.or(TFHE.shl(g1, 1), TFHE.or(TFHE.shl(g2, 2), TFHE.or(TFHE.shl(g3, 3), TFHE.shl(g4, 4))))
        );
        TFHE.allowThis(eqMask);
        return eqMask;
    }

    /**
     * @notice Creates an encrypted mask showing which letters are present in the target word
     * @dev Internal function used by getGuess
     * @param guessN Index of the guess to check
     * @return euint32 Encrypted mask where 1 bits indicate letter presence
     */
    function getLetterMaskGuess(uint8 guessN) internal returns (euint32) {
        uint32 word = guessHist[guessN];
        uint32 _l0 = (word) % 26;
        uint32 _l1 = (word / 26) % 26;
        uint32 _l2 = (word / 26 / 26) % 26;
        uint32 _l3 = (word / 26 / 26 / 26) % 26;
        uint32 _l4 = (word / 26 / 26 / 26 / 26) % 26;
        uint32 base = 1;
        uint32 letterMask = (base << _l0) | (base << _l1) | (base << _l2) | (base << _l3) | (base << _l4);
        euint32 lettermaskGuess = TFHE.and(word1LettersMask, TFHE.asEuint32(letterMask));
        TFHE.allowThis(lettermaskGuess);
        return lettermaskGuess;
    }

    /**
     * @notice Gets feedback for a specific guess
     * @dev Requests decryption of the equality and letter presence masks
     * @param guessN Index of the guess to check
     */
    function getGuess(uint8 guessN) public onlyPlayer {
        require(guessN < nGuesses, "cannot exceed nGuesses");

        // Get the encrypted values
        euint8 eqMask = getEqMask(guessN);
        euint32 letterMaskGuess = getLetterMaskGuess(guessN);

        // Prepare an array of ciphertexts to decrypt
        uint256[] memory cts = new uint256[](2);
        cts[0] = Gateway.toUint256(eqMask);
        cts[1] = Gateway.toUint256(letterMaskGuess);

        // Emit an event for easier tracking of decryption requests
        emit GuessDecryptionRequested(guessN, block.timestamp);

        // Request decryption via the gateway
        Gateway.requestDecryption(cts, this.callbackGuess.selector, 0, block.timestamp + 100, false);
    }

    /**
     * @notice Callback function for guess decryption
     * @dev Called by the gateway after decrypting guess feedback
     * @param _decryptedEqMask Decrypted equality mask
     * @param _decryptedLetterMask Decrypted letter presence mask
     * @return Tuple of the decrypted masks
     */
    function callbackGuess(
        uint256 /*requestID*/,
        uint8 _decryptedEqMask,
        uint32 _decryptedLetterMask
    ) public onlyGateway returns (uint8, uint32) {
        decryptedEqMask = _decryptedEqMask;
        decryptedLetterMask = _decryptedLetterMask;
        emit GuessDecrypted(decryptedEqMask, decryptedLetterMask);
        return (decryptedEqMask, decryptedLetterMask);
    }

    /**
     * @notice Allows player to claim they've won with a specific guess
     * @dev Requests decryption to verify if the guess matches completely
     * @param guessN Index of the winning guess
     */
    function claimWin(uint8 guessN) public onlyPlayer {
        euint8 fullMask = TFHE.asEuint8(31);
        ebool is_equal = TFHE.eq(fullMask, getEqMask(guessN));
        // Request decryption via the Gateway
        uint256[] memory cts = new uint256[](1);
        cts[0] = Gateway.toUint256(is_equal);
        emit WinDecryptionRequested(guessN, block.timestamp);

        Gateway.requestDecryption(cts, this.callbackClaimWin.selector, 0, block.timestamp + 100, false);
    }

    /**
     * @notice Callback function for win claim verification
     * @dev Sets playerWon flag if the claim is valid
     * @param decryptedComparison Result of win verification
     */
    function callbackClaimWin(uint256 /*requestID*/, bool decryptedComparison) public onlyGateway {
        // Handle the decrypted comparison result
        if (decryptedComparison) {
            playerWon = true;
        }
    }

    /**
     * @notice Reveals the target word after game completion
     * @dev Requests decryption of all word letters
     */
    function revealWordAndStore() public onlyPlayer {
        // Prepare the ciphertext array for the five letters
        uint256[] memory cts = new uint256[](5);

        for (uint8 i = 0; i < 5; i++) {
            cts[i] = Gateway.toUint256(word1Letters[i]);
        }

        emit WordRevealRequested(msg.sender, block.timestamp);
        // Request decryption of the letters
        Gateway.requestDecryption(cts, this.callbackRevealWord.selector, 0, block.timestamp + 100, false);
    }

    /**
     * @notice Callback function for word revelation
     * @dev Stores decrypted letters and computes final word value
     * @param _l0 First decrypted letter
     * @param _l1 Second decrypted letter
     * @param _l2 Third decrypted letter
     * @param _l3 Fourth decrypted letter
     * @param _l4 Fifth decrypted letter
     * @return Tuple of all decrypted letters
     */
    function callbackRevealWord(
        uint256 /*requestID*/,
        uint8 _l0,
        uint8 _l1,
        uint8 _l2,
        uint8 _l3,
        uint8 _l4
    ) public onlyGateway returns (uint8, uint8, uint8, uint8, uint8) {
        l0 = _l0;
        l1 = _l1;
        l2 = _l2;
        l3 = _l3;
        l4 = _l4;
        // Handle the decrypted word letters here (e.g., emit events or store values)

        word1 =
            uint32(l0) +
            uint32(l1) *
            26 +
            uint32(l2) *
            26 *
            26 +
            uint32(l3) *
            26 *
            26 *
            26 +
            uint32(l4) *
            26 *
            26 *
            26 *
            26;

        return (l0, l1, l2, l3, l4); // Optionally emit an event
    }

    /**
     * @notice Verifies the game outcome using a Merkle proof
     * @dev Can only be called by relayer after game completion
     * @param proof Merkle proof to verify the game outcome
     */
    function checkProof(bytes32[] calldata proof) public onlyRelayer {
        assert(nGuesses == 5 || playerWon);
        // Store the proof for use in the callback
        storedProof = proof;

        // Prepare the ciphertext for word1Id
        uint256[] memory cts = new uint256[](1);
        cts[0] = Gateway.toUint256(word1Id);

        // Request decryption of word1Id
        Gateway.requestDecryption(cts, this.callbackCheckProof.selector, 0, block.timestamp + 100, false);
    }

    /**
     * @notice Callback function for proof verification
     * @dev Verifies the Merkle proof using decrypted word ID
     * @param _decryptedWordId The decrypted word ID
     */
    function callbackCheckProof(uint256 /*requestID*/, uint16 _decryptedWordId) public onlyGateway {
        decryptedWordId = _decryptedWordId;
        // Handle the decrypted wordId and check the proof
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(decryptedWordId, word1))));

        if (MerkleProof.verify(storedProof, root, leaf)) {
            proofChecked = true;
        }
    }

    /**
     * @notice Modifier to restrict function access to relayer only
     */
    modifier onlyRelayer() {
        require(msg.sender == relayerAddr);
        _;
    }

    /**
     * @notice Modifier to restrict function access to player only
     */
    modifier onlyPlayer() {
        require(msg.sender == playerAddr);
        _;
    }
}
