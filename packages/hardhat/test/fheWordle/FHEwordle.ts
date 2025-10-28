import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";

import type { FHEWordle, FHEWordleFactory } from "../../types";
import { deployFHEWordleFixture } from "./FHEwordle.fixture";
import { VALID_WORDS } from "./validWordsList";
import { WORDS } from "./wordslist";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

type Signers = {
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  carol: HardhatEthersSigner;
};

export function genProofAndRoot(values: any, key: any, encoding: string[]): [string, string[]] {
  const tree = StandardMerkleTree.of(values, encoding);
  const root = tree.root;
  for (const [i, v] of tree.entries()) {
    if (v[1] == key[1]) {
      const proof = tree.getProof(i);
      return [root, proof];
    }
  }
  return ["", []];
}

export const wordToNumber = (word: string) => {
  return (
    word.charCodeAt(0) -
    97 +
    (word.charCodeAt(1) - 97) * 26 +
    (word.charCodeAt(2) - 97) * 26 * 26 +
    (word.charCodeAt(3) - 97) * 26 * 26 * 26 +
    (word.charCodeAt(4) - 97) * 26 * 26 * 26 * 26
  );
};

export function setupAndVerifyMerkleRoots() {
  // word
  // 0 1 3 2 4
  // 0 + 1*26 + 3*26*26 + 2*26*26*26 + 4*26*26*26*26
  // 1865110
  // id = 3

  // Setup words list for answers
  const wordsList = [];
  for (let i = 0; i < WORDS.length; i++) {
    wordsList.push([i, wordToNumber(WORDS[i])]);
  }
  const [_root, proof] = genProofAndRoot(wordsList, [3, wordToNumber(WORDS[3])], ["uint16", "uint32"]);
  const answerVerified = StandardMerkleTree.verify(_root, ["uint16", "uint32"], [3, wordToNumber(WORDS[3])], proof);
  const ourWord = wordsList[3][1]; // "about"

  // Setup valid words list for guesses
  const validWordsList = [];
  for (let i = 0; i < VALID_WORDS.length; i++) {
    validWordsList.push([0, wordToNumber(VALID_WORDS[i])]);
  }
  const [_validRoot, proofValid] = genProofAndRoot(
    validWordsList,
    [0, wordToNumber(VALID_WORDS[1])],
    ["uint8", "uint32"],
  );
  const guessVerified = StandardMerkleTree.verify(
    _validRoot,
    ["uint8", "uint32"],
    [0, wordToNumber(VALID_WORDS[1])],
    proofValid,
  );

  return {
    answerRoot: _root,
    answerProof: proof,
    validRoot: _validRoot,
    validProof: proofValid,
    wordsList,
    validWordsList,
    answerVerified,
    guessVerified,
    ourWord,
  };
}

async function submitWordToContract(
  contract: FHEWordle,
  instances: any,
  contractAddress: string,
  signer: any,
  word: number,
) {
  const l0 = word % 26;
  const l1 = Math.floor(word / 26) % 26;
  const l2 = Math.floor(word / 26 / 26) % 26;
  const l3 = Math.floor(word / 26 / 26 / 26) % 26;
  const l4 = Math.floor(word / 26 / 26 / 26 / 26) % 26;

  const inputl0 = fhevm.createEncryptedInput(contractAddress, signer.address);
  const input = inputl0.add8(l0).add8(l1).add8(l2).add8(l3).add8(l4);
  const encryptedAmount = await input.encrypt();

  const tx = await contract
    .connect(signer)
    .submitWord1(
      encryptedAmount.handles[0],
      encryptedAmount.handles[1],
      encryptedAmount.handles[2],
      encryptedAmount.handles[3],
      encryptedAmount.handles[4],
      encryptedAmount.inputProof,
    );
  await tx.wait();

  return {
    wordSubmitted: await contract.wordSubmitted(),
    gameStarted: await contract.gameStarted(),
  };
}

describe("FHEwordle contract via proxy via FHEwordleFactory", function () {
  let contract: FHEWordle;
  let factoryContract: FHEWordleFactory;
  let signers: any;
  let instances: any;
  let contractAddress: string;
  let factoryContractAddress: string;
  let FHEWordleAddress: string;
  let FHEWordleGame: FHEWordle;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: ethSigners[0], bob: ethSigners[1], carol: ethSigners[2] };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    const deployment = await deployFHEWordleFixture();
    contract = deployment.wordleContract;
    factoryContract = deployment.wordleFactory;
    contractAddress = await contract.getAddress();
    factoryContractAddress = await factoryContract.getAddress();

    // Create an instance of the test contract
    // Bob is the relayer
    const salt = ethers.encodeBytes32String("test_salt");
    const createGameTx = await factoryContract.connect(signers.carol).createTest(signers.bob.address, 3, salt);
    await createGameTx.wait();

    // Set up the game address and test contract
    const gameAddress = await factoryContract.userLastContract(signers.carol.address);
    const FHEWordleGameContract = await ethers.getContractAt("FHEWordle", gameAddress, signers.bob);
    FHEWordleAddress = await FHEWordleGameContract.getAddress();
    FHEWordleGame = FHEWordleGameContract;
  });

  it("should get and validate word ID with fhe wordle factory", async function () {
    const wordId = await FHEWordleGame.connect(signers.bob).getWord1Id();
    // console.log(wordId);
    const wordIdBob = await fhevm.userDecryptEuint(FhevmType.euint16, wordId, FHEWordleAddress, signers.bob);

    expect(wordIdBob).to.equal(3);
  });

  it("should submit word letters correctly  with fhe wordle factory", async function () {
    const wordsList = WORDS.map((word, i) => [i, wordToNumber(word)]);
    const ourWord = wordsList[3][1]; // "about"

    const { wordSubmitted, gameStarted } = await submitWordToContract(
      FHEWordleGame,
      instances,
      FHEWordleAddress,
      signers.carol,
      ourWord,
    );

    expect(wordSubmitted).to.be.true;
    expect(gameStarted).to.be.true;
  });

  it("should return correct masks with fhe wordle factory", async function () {
    const { answerProof, validWordsList, answerVerified, guessVerified, ourWord } = setupAndVerifyMerkleRoots();
    expect(answerVerified).to.equal(true);
    expect(guessVerified).to.equal(true);

    // player carol
    // relayer bob
    const wordId = await FHEWordleGame.connect(signers.bob).getWord1Id();
    // console.log(wordId);
    const wordIdBob = await fhevm.userDecryptEuint(FhevmType.euint16, wordId, FHEWordleAddress, signers.bob);

    expect(wordIdBob).to.equal(3);

    const { wordSubmitted, gameStarted } = await submitWordToContract(
      FHEWordleGame,
      instances,
      FHEWordleAddress,
      signers.carol,
      ourWord,
    );

    expect(wordSubmitted).to.be.true;
    expect(gameStarted).to.be.true;

    // console.log("guess 1");

    // guess n.1
    {
      // "rerun"
      const l0 = 17;
      const l1 = 4;
      const l2 = 17;
      const l3 = 20;
      const l4 = 13;
      const word = l0 + 26 * (l1 + 26 * (l2 + 26 * (l3 + 26 * l4)));
      const [_vR, proof] = genProofAndRoot(validWordsList, [0, word], ["uint8", "uint32"]);
      const tx1 = await FHEWordleGame.connect(signers.carol).guessWord1(word, proof);
      await tx1.wait();
    }

    // number of guesses
    {
      const nguess = await FHEWordleGame.nGuesses();
      expect(nguess).to.equal(1);
    }

    // check guess
    {
      await FHEWordleGame.connect(signers.carol).getGuess(0);

      await fhevm.awaitDecryptionOracle();

      const eqMask = await FHEWordleGame.connect(signers.carol).decryptedEqMask();
      const letterMask = await FHEWordleGame.connect(signers.carol).decryptedLetterMask();
      expect(eqMask).to.equal(8);
      expect(letterMask).to.equal(1 << 20);
    }

    // console.log("guess 2");
    // guess 2
    // "about"
    const l0 = 0;
    const l1 = 1;
    const l2 = 14;
    const l3 = 20;
    const l4 = 19;
    const word = l0 + 26 * (l1 + 26 * (l2 + 26 * (l3 + 26 * l4)));
    const [_validRoot, proof] = genProofAndRoot(validWordsList, [0, word], ["uint8", "uint32"]);
    const tx1 = await FHEWordleGame.connect(signers.carol).guessWord1(word, proof);
    await tx1.wait();

    // number of guesses
    {
      const nguess = await FHEWordleGame.nGuesses();
      expect(nguess).to.equal(2);
    }

    // get guess
    {
      await FHEWordleGame.connect(signers.carol).getGuess(1);

      await fhevm.awaitDecryptionOracle();

      const eqMask = await FHEWordleGame.connect(signers.carol).decryptedEqMask();
      const letterMask = await FHEWordleGame.connect(signers.carol).decryptedLetterMask();
      expect(eqMask).to.equal(31);
      expect(letterMask).to.equal(1589251);
    }

    // console.log("claim win");
    // claim win
    {
      const tx1 = await FHEWordleGame.connect(signers.carol).claimWin(1);
      await tx1.wait();

      await fhevm.awaitDecryptionOracle();

      const hasWon = await FHEWordleGame.playerWon();
      expect(hasWon).to.be.true;
    }

    // console.log("reveal word");
    // reveal word
    {
      const tx2 = await FHEWordleGame.connect(signers.carol).revealWordAndStore();
      await tx2.wait();

      await fhevm.awaitDecryptionOracle();

      const word = await FHEWordleGame.connect(signers.carol).word1();
      expect(word).to.equal(ourWord);
    }

    // console.log("check proof");
    // check proof
    {
      const tx1 = await FHEWordleGame.connect(signers.bob).checkProof(answerProof);
      await tx1.wait();

      await fhevm.awaitDecryptionOracle();

      const proofChecked = await FHEWordleGame.proofChecked();
      expect(proofChecked).to.be.true;
    }
  }).timeout(180000);
});
