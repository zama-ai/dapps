// SPDX-License-Identifier: BSD-3-Clause-Clear

pragma solidity ^0.8.24;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {FHE, ebool, euint8, euint32, externalEuint8} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

contract FHEWordle is ZamaEthereumConfig, Ownable2Step, Initializable {
    bytes32 public constant root = 0x918fd5f641d6c8bb0c5e07a42f975969c2575250dc3fb743346d1a3c11728bdd;
    bytes32 public constant rootAllowed = 0xd3e7a12d252dcf5de57a406f0bd646217ec1f340bad869182e5b2bfadd086993;
    uint16 public constant wordSetSz = 5757;

    address public playerAddr;
    address public relayerAddr;
    uint16 public testFlag;

    euint32 private word1Id;
    euint8[5] private word1Letters;
    euint32 private word1LettersMask;
    uint32 public word1;

    uint8 public nGuesses;
    uint32[5] public guessHist;

    bool public wordSubmitted;
    bool public gameStarted;
    bool public playerWon;
    bool public proofChecked;

    uint8 public l0;
    uint8 public l1;
    uint8 public l2;
    uint8 public l3;
    uint8 public l4;
    bytes32[] public storedProof;

    uint32 public decryptedWordId;
    uint8 public decryptedEqMask;
    uint32 public decryptedLetterMask;

    euint8 private _pendingEqMask;
    euint32 private _pendingLetterMask;
    ebool private _pendingWinCheck;

    event WordSubmitted(address indexed player, uint32 word);
    event GuessDecryptionRequested(uint8 guessN, uint256 timestamp);
    event PlayerWon(address indexed player);
    event GuessDecrypted(uint8 decryptedEqMask, uint32 decryptedLetterMask);
    event WinDecryptionRequested(uint8 guessN, uint256 timestamp);
    event WordRevealRequested(address indexed player, uint256 timestamp);

    constructor() Ownable(msg.sender) {}

    function initialize(address _playerAddr, address _relayerAddr, uint16 _testFlag) external initializer {
        relayerAddr = _relayerAddr;
        playerAddr = _playerAddr;
        testFlag = _testFlag;
        word1Id = FHE.asEuint32(testFlag);
        FHE.allowThis(word1Id);
        FHE.allow(word1Id, relayerAddr);
        word1LettersMask = FHE.asEuint32(0);
        FHE.allowThis(word1LettersMask);
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

    function getWord1Id() public view virtual onlyRelayer returns (euint32) {
        return (word1Id);
    }

    function submitWord1(
        externalEuint8 el0,
        externalEuint8 el1,
        externalEuint8 el2,
        externalEuint8 el3,
        externalEuint8 el4,
        bytes calldata inputProof
    ) external {
        euint8 _l0 = FHE.fromExternal(el0, inputProof);
        euint8 _l1 = FHE.fromExternal(el1, inputProof);
        euint8 _l2 = FHE.fromExternal(el2, inputProof);
        euint8 _l3 = FHE.fromExternal(el3, inputProof);
        euint8 _l4 = FHE.fromExternal(el4, inputProof);
        FHE.allowThis(_l0);
        FHE.allowThis(_l1);
        FHE.allowThis(_l2);
        FHE.allowThis(_l3);
        FHE.allowThis(_l4);
        _submitWord1(_l0, _l1, _l2, _l3, _l4);
    }

    function _submitWord1(euint8 _l0, euint8 _l1, euint8 _l2, euint8 _l3, euint8 _l4) public {
        require(!wordSubmitted, "word submitted");
        word1Letters[0] = _l0;
        word1Letters[1] = _l1;
        word1Letters[2] = _l2;
        word1Letters[3] = _l3;
        word1Letters[4] = _l4;

        word1LettersMask = FHE.or(
            FHE.shl(FHE.asEuint32(1), word1Letters[0]),
            FHE.or(
                FHE.shl(FHE.asEuint32(1), word1Letters[1]),
                FHE.or(
                    FHE.shl(FHE.asEuint32(1), word1Letters[2]),
                    FHE.or(FHE.shl(FHE.asEuint32(1), word1Letters[3]), FHE.shl(FHE.asEuint32(1), word1Letters[4]))
                )
            )
        );
        FHE.allowThis(word1LettersMask);
        wordSubmitted = true;
        gameStarted = true;
    }

    function guessWord1(uint32 word, bytes32[] calldata proof) public onlyPlayer {
        require(gameStarted, "game not started");
        require(nGuesses < 5, "cannot exceed five guesses!");

        uint8 zeroIndex = 0;
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(zeroIndex, word))));
        require(MerkleProof.verify(proof, rootAllowed, leaf), "Invalid word");
        guessHist[nGuesses] = word;
        nGuesses += 1;
    }

    function getEqMask(uint8 guessN) internal returns (euint8) {
        uint32 word = guessHist[guessN];
        uint8 _l0 = uint8((word) % 26);
        uint8 _l1 = uint8((word / 26) % 26);
        uint8 _l2 = uint8((word / 26 / 26) % 26);
        uint8 _l3 = uint8((word / 26 / 26 / 26) % 26);
        uint8 _l4 = uint8((word / 26 / 26 / 26 / 26) % 26);

        euint8 g0 = FHE.asEuint8(FHE.eq(word1Letters[0], _l0));
        euint8 g1 = FHE.asEuint8(FHE.eq(word1Letters[1], _l1));
        euint8 g2 = FHE.asEuint8(FHE.eq(word1Letters[2], _l2));
        euint8 g3 = FHE.asEuint8(FHE.eq(word1Letters[3], _l3));
        euint8 g4 = FHE.asEuint8(FHE.eq(word1Letters[4], _l4));

        euint8 eqMask = FHE.or(
            FHE.shl(g0, 0),
            FHE.or(FHE.shl(g1, 1), FHE.or(FHE.shl(g2, 2), FHE.or(FHE.shl(g3, 3), FHE.shl(g4, 4))))
        );
        FHE.allowThis(eqMask);
        return eqMask;
    }

    function getLetterMaskGuess(uint8 guessN) internal returns (euint32) {
        uint32 word = guessHist[guessN];
        uint32 _l0 = (word) % 26;
        uint32 _l1 = (word / 26) % 26;
        uint32 _l2 = (word / 26 / 26) % 26;
        uint32 _l3 = (word / 26 / 26 / 26) % 26;
        uint32 _l4 = (word / 26 / 26 / 26 / 26) % 26;
        uint32 base = 1;
        uint32 letterMask = (base << _l0) | (base << _l1) | (base << _l2) | (base << _l3) | (base << _l4);
        euint32 lettermaskGuess = FHE.and(word1LettersMask, FHE.asEuint32(letterMask));
        FHE.allowThis(lettermaskGuess);
        return lettermaskGuess;
    }

    function requestGuessDecrypt(uint8 guessN) public onlyPlayer {
        require(guessN < nGuesses, "cannot exceed nGuesses");

        _pendingEqMask = getEqMask(guessN);
        _pendingLetterMask = getLetterMaskGuess(guessN);

        FHE.makePubliclyDecryptable(_pendingEqMask);
        FHE.makePubliclyDecryptable(_pendingLetterMask);

        emit GuessDecryptionRequested(guessN, block.timestamp);
    }

    function getGuessHandles() external view returns (bytes32[] memory) {
        bytes32[] memory handles = new bytes32[](2);
        handles[0] = FHE.toBytes32(_pendingEqMask);
        handles[1] = FHE.toBytes32(_pendingLetterMask);
        return handles;
    }

    function finalizeGuess(
        bytes32[] calldata handlesList,
        bytes calldata cleartexts,
        bytes calldata decryptionProof
    ) external {
        FHE.checkSignatures(handlesList, cleartexts, decryptionProof);
        (uint8 _decryptedEqMask, uint32 _decryptedLetterMask) = abi.decode(cleartexts, (uint8, uint32));
        decryptedEqMask = _decryptedEqMask;
        decryptedLetterMask = _decryptedLetterMask;
        emit GuessDecrypted(decryptedEqMask, decryptedLetterMask);
    }

    function requestClaimWin(uint8 guessN) public onlyPlayer {
        euint8 fullMask = FHE.asEuint8(31);
        _pendingWinCheck = FHE.eq(fullMask, getEqMask(guessN));
        FHE.allowThis(_pendingWinCheck);
        FHE.makePubliclyDecryptable(_pendingWinCheck);
        emit WinDecryptionRequested(guessN, block.timestamp);
    }

    function getWinCheckHandle() external view returns (bytes32) {
        return FHE.toBytes32(_pendingWinCheck);
    }

    function finalizeClaimWin(
        bytes32[] calldata handlesList,
        bytes calldata cleartexts,
        bytes calldata decryptionProof
    ) external {
        FHE.checkSignatures(handlesList, cleartexts, decryptionProof);
        bool decryptedComparison = abi.decode(cleartexts, (bool));
        if (decryptedComparison) {
            playerWon = true;
            emit PlayerWon(playerAddr);
        }
    }

    function requestRevealWord() public onlyPlayer {
        for (uint8 i = 0; i < 5; i++) {
            FHE.makePubliclyDecryptable(word1Letters[i]);
        }
        emit WordRevealRequested(msg.sender, block.timestamp);
    }

    function getWordLettersHandles() external view returns (bytes32[] memory) {
        bytes32[] memory handles = new bytes32[](5);
        for (uint8 i = 0; i < 5; i++) {
            handles[i] = FHE.toBytes32(word1Letters[i]);
        }
        return handles;
    }

    function finalizeRevealWord(
        bytes32[] calldata handlesList,
        bytes calldata cleartexts,
        bytes calldata decryptionProof
    ) external {
        FHE.checkSignatures(handlesList, cleartexts, decryptionProof);
        (uint8 _l0, uint8 _l1, uint8 _l2, uint8 _l3, uint8 _l4) = abi.decode(
            cleartexts,
            (uint8, uint8, uint8, uint8, uint8)
        );
        l0 = _l0;
        l1 = _l1;
        l2 = _l2;
        l3 = _l3;
        l4 = _l4;

        word1 =
            uint32(l0) +
            uint32(l1) * 26 +
            uint32(l2) * 26 * 26 +
            uint32(l3) * 26 * 26 * 26 +
            uint32(l4) * 26 * 26 * 26 * 26;
    }

    function requestCheckProof(bytes32[] calldata proof) public onlyRelayer {
        assert(nGuesses == 5 || playerWon);
        storedProof = proof;
        FHE.makePubliclyDecryptable(word1Id);
    }

    function getWord1IdHandle() external view returns (bytes32) {
        return FHE.toBytes32(word1Id);
    }

    function finalizeCheckProof(
        bytes32[] calldata handlesList,
        bytes calldata cleartexts,
        bytes calldata decryptionProof
    ) external {
        FHE.checkSignatures(handlesList, cleartexts, decryptionProof);
        uint32 _decryptedWordId = abi.decode(cleartexts, (uint32));
        decryptedWordId = _decryptedWordId;
        bytes32 leaf = keccak256(bytes.concat(keccak256(abi.encode(decryptedWordId, word1))));

        if (MerkleProof.verify(storedProof, root, leaf)) {
            proofChecked = true;
        }
    }

    modifier onlyRelayer() {
        require(msg.sender == relayerAddr);
        _;
    }

    modifier onlyPlayer() {
        require(msg.sender == playerAddr);
        _;
    }
}
