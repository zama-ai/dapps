import { StandardMerkleTree } from "@openzeppelin/merkle-tree";
import { expect } from "chai";
import { ethers } from "hardhat";

import type { FHEWordle, FHEWordleFactory } from "../../types";
import { awaitAllDecryptionResults, initGateway } from "../asyncDecrypt";
import { createInstance } from "../instance";
import { reencryptEuint16 } from "../reencrypt";
import { getSigners, initSigners } from "../signers";
import { deployFHEWordleFixture } from "./FHEwordle.fixture";
import { VALID_WORDS } from "./validWordsList";
import { WORDS } from "./wordslist";

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

  const inputl0 = instances.createEncryptedInput(contractAddress, signer.address);
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

describe("FHEwordle contract directly", function () {
  let contract: FHEWordle;
  let factoryContract: FHEWordleFactory;

  before(async function () {
    await initSigners();
    this.signers = await getSigners();
    await initGateway(); // Initialize the gateway for decryption
  });

  beforeEach(async function () {
    const deployment = await deployFHEWordleFixture();
    contract = deployment.wordleContract;
    factoryContract = deployment.wordleFactory;
    this.contractAddress = await contract.getAddress();
    this.factoryContractAddress = await factoryContract.getAddress();

    // Create contract instances
    this.instances = await createInstance();
  });

  it("should setup and initialize game correctly", async function () {
    const { answerVerified, guessVerified } = setupAndVerifyMerkleRoots();
    expect(answerVerified).to.equal(true);
    expect(guessVerified).to.equal(true);
  });

  it("should get and validate word ID", async function () {
    // player carol
    // relayer bob
    await contract.initialize(this.signers.carol, this.signers.bob, 3);
    const wordId = await contract.connect(this.signers.bob).getWord1Id(this.signers.bob);
    console.log(wordId);
    const wordIdBob = await reencryptEuint16(this.signers.bob, this.instances, wordId, this.contractAddress);

    expect(wordIdBob).to.equal(3);
  });

  it("should submit word letters correctly", async function () {
    await contract.initialize(this.signers.carol, this.signers.bob, 3);

    const wordsList = WORDS.map((word, i) => [i, wordToNumber(word)]);
    const ourWord = wordsList[3][1]; // "about"

    const { wordSubmitted, gameStarted } = await submitWordToContract(
      contract,
      this.instances,
      this.contractAddress,
      this.signers.carol,
      ourWord,
    );

    expect(wordSubmitted).to.be.true;
    expect(gameStarted).to.be.true;
  });

  it.only("should return correct masks", async function () {
    const { validWordsList, answerVerified, guessVerified, ourWord } = setupAndVerifyMerkleRoots();
    expect(answerVerified).to.equal(true);
    expect(guessVerified).to.equal(true);

    // player carol
    // relayer bob
    await contract.initialize(this.signers.carol, this.signers.bob, 3);
    const wordId = await contract.connect(this.signers.bob).getWord1Id(this.signers.bob);
    console.log(wordId);
    const wordIdBob = await reencryptEuint16(this.signers.bob, this.instances, wordId, this.contractAddress);

    expect(wordIdBob).to.equal(3);

    const { wordSubmitted, gameStarted } = await submitWordToContract(
      contract,
      this.instances,
      this.contractAddress,
      this.signers.carol,
      ourWord,
    );

    expect(wordSubmitted).to.be.true;
    expect(gameStarted).to.be.true;

    console.log("guess 1");

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
      const tx1 = await contract.connect(this.signers.carol).guessWord1(word, proof);
      await tx1.wait();
    }

    // number of guesses
    {
      const nguess = await contract.nGuesses();
      expect(nguess).to.equal(1);
    }

    // check guess
    {
      await contract.connect(this.signers.carol).getGuess(0);

      await awaitAllDecryptionResults();

      const eqMask = await contract.connect(this.signers.carol).decryptedEqMask();
      const letterMask = await contract.connect(this.signers.carol).decryptedLetterMask();
      expect(eqMask).to.equal(8);
      expect(letterMask).to.equal(1 << 20);
    }

    console.log("guess 2");
    // guess 2
    {
      // "about"
      const l0 = 0;
      const l1 = 1;
      const l2 = 14;
      const l3 = 20;
      const l4 = 19;
      const word = l0 + 26 * (l1 + 26 * (l2 + 26 * (l3 + 26 * l4)));
      const [_validRoot, proof] = genProofAndRoot(validWordsList, [0, word], ["uint8", "uint32"]);
      const tx1 = await contract.connect(this.signers.carol).guessWord1(word, proof);
      await tx1.wait();
    }

    // number of guesses
    {
      const nguess = await contract.nGuesses();
      expect(nguess).to.equal(2);
    }

    // get guess
    {
      await contract.connect(this.signers.carol).getGuess(1);

      await awaitAllDecryptionResults();

      const eqMask = await contract.connect(this.signers.carol).decryptedEqMask();
      const letterMask = await contract.connect(this.signers.carol).decryptedLetterMask();
      expect(eqMask).to.equal(31);
      expect(letterMask).to.equal(1589251);
    }

    console.log("claim win");
    // claim win
    {
      const tx1 = await contract.connect(this.signers.carol).claimWin(1);
      await tx1.wait();

      await awaitAllDecryptionResults();

      const hasWon = await contract.playerWon();
      expect(hasWon).to.be.true;
    }

    // console.log("reveal word");
    // // reveal word
    // {
    //   const tx1 = await contract.connect(this.signers.carol).revealWordAndStore();
    //   await tx1.wait();
    //   const word = await contract.connect(this.signers.carol).word1();
    //   expect(word).to.equal(ourWord);
    // }

    // console.log("check proof");
    // // check proof
    // {
    //   const tx1 = await contract.connect(this.signers.bob).checkProof(proof);
    //   await tx1.wait();
    //   const proofChecked = await contract.proofChecked();
    //   expect(proofChecked).to.be.true;
    // }
  }).timeout(180000);
});

describe("FHEwordle contract via proxy via FHEwordleFactory", function () {
  let contract: FHEWordle;
  let factoryContract: FHEWordleFactory;

  before(async function () {
    await initSigners();
    this.signers = await getSigners();
  });

  beforeEach(async function () {
    const deployment = await deployFHEWordleFixture();
    contract = deployment.wordleContract;
    factoryContract = deployment.wordleFactory;
    this.contractAddress = await contract.getAddress();
    this.factoryContractAddress = await factoryContract.getAddress();

    // Create contract instances
    this.instances = await createInstance();

    // Create an instance of the test contract
    // Bob is the relayer
    const salt = ethers.encodeBytes32String("test_salt");
    const createGameTx = await factoryContract.createTest(this.signers.bob.address, 3, salt);
    await createGameTx.wait();

    // Set up the game address and test contract
    const gameAddress = await factoryContract.userLastContract(this.signers.alice.address);
    const FHEWordleGame = await ethers.getContractAt("FHEWordle", gameAddress, this.signers.bob);
    this.FHEWordleAddress = await FHEWordleGame.getAddress();
    this.FHEWordleGame = FHEWordleGame;
  });

  // it.only("should get and validate word ID", async function () {
  //   const wordId = await this.FHEWordleGame.getWord1Id(this.signers.bob);
  //   console.log(wordId);
  //   const wordIdBob = await reencryptEuint16(this.signers.bob, this.instances, wordId, this.FHEWordleAddress);

  //   // expect(wordIdBob).to.equal(3);
  // });

  // it("should return correct masks", async function () {
  // word
  // 0 1 3 2 4
  // 0 + 1*26 + 3*26*26 + 2*26*26*26 + 4*26*26*26*26
  // 1865110
  // id = 3
  // const wordsList = [];
  // for (let i = 0; i < WORDS.length; i++) {
  //   wordsList.push([i, wordToNumber(WORDS[i])]);
  // }
  // const [_root, proof] = genProofAndRoot(wordsList, [3, wordToNumber(WORDS[3])], ["uint16", "uint32"]);
  // expect(StandardMerkleTree.verify(_root, ["uint16", "uint32"], [3, wordToNumber(WORDS[3])], proof)).to.equal(true);
  // console.log(_root);
  // const ourWord = wordsList[3][1]; // "about"
  // const validWordsList = [];
  // for (let i = 0; i < VALID_WORDS.length; i++) {
  //   validWordsList.push([0, wordToNumber(VALID_WORDS[i])]);
  // }
  // const [_validRoot, proofValid] = genProofAndRoot(
  //   validWordsList,
  //   [0, wordToNumber(VALID_WORDS[1])],
  //   ["uint8", "uint32"],
  // );
  // expect(
  //   StandardMerkleTree.verify(_validRoot, ["uint8", "uint32"], [0, wordToNumber(VALID_WORDS[1])], proofValid),
  // ).to.equal(true);
  // console.log(_validRoot);
  // const contractInitializerFactory = await ethers.getContractFactory("FHEWordle");
  // const contractInitializer: FHEWordle = await contractInitializerFactory.connect(this.signers.alice).deploy();
  // const contractInitializerAddress = await contractInitializer.getAddress();
  // const FHEWordleFactoryFactory = await ethers.getContractFactory("FHEWordleFactory");
  // const factoryContract: FHEWordleFactory = await FHEWordleFactoryFactory.connect(this.signers.alice).deploy(
  //   contractInitializerAddress,
  // );
  // await factoryContract.waitForDeployment();
  // const txDeploy = await createTransaction(
  //   factoryContract.createTest,
  //   this.signers.bob.address,
  //   3,
  //   "0xf172873c63909462ac4de545471fd3ad3e9eeadeec4608b92d16ce6b500704cc",
  // );
  // await txDeploy.wait();
  // const testContractAddress = await factoryContract.userLastContract(this.signers.alice.address);
  // const contract: FHEWordle = FHEWordle__factory.connect(testContractAddress).connect(this.signers.alice);
  // this.contractAddress = await contract.getAddress();
  // this.instances = await createInstance(this.contractAddress, ethers, this.signers);
  // // get word id (Bob-Relayer)
  // {
  //   const bobContract = contract.connect(this.signers.bob);
  //   const token = this.instances.bob.getTokenSignature(this.contractAddress)!;
  //   const tx1 = await bobContract.getWord1Id(token.publicKey, token.signature);
  //   const word1Id = this.instances.bob.decrypt(this.contractAddress, tx1);
  //   expect(word1Id).to.equal(3);
  // }
  //   console.log("submit word");
  //   // submit word letters (Bob-Relayer)
  //   {
  //     const bobContract = contract.connect(this.signers.bob);
  //     const l0 = ourWord % 26;
  //     const l1 = Math.floor(ourWord / 26) % 26;
  //     const l2 = Math.floor(ourWord / 26 / 26) % 26;
  //     const l3 = Math.floor(ourWord / 26 / 26 / 26) % 26;
  //     const l4 = Math.floor(ourWord / 26 / 26 / 26 / 26) % 26;
  //     console.log(l0, l1, l2, l3, l4);
  //     const encl0 = this.instances.bob.encrypt8(l0);
  //     const encl1 = this.instances.bob.encrypt8(l1);
  //     const encl2 = this.instances.bob.encrypt8(l2);
  //     const encl3 = this.instances.bob.encrypt8(l3);
  //     const encl4 = this.instances.bob.encrypt8(l4);
  //     const tx1 = await createTransaction(
  //       bobContract["submitWord1(bytes,bytes,bytes,bytes,bytes)"],
  //       encl0,
  //       encl1,
  //       encl2,
  //       encl3,
  //       encl4,
  //     );
  //     await tx1.wait();
  //   }
  //   {
  //     const wordSubmitted = await contract.wordSubmitted();
  //     expect(wordSubmitted);
  //   }
  //   {
  //     const gameStarted = await contract.gameStarted();
  //     expect(gameStarted);
  //   }
  //   console.log("guess 1");
  //   //guess n.1
  //   {
  //     // "rerun"
  //     const l0 = 17;
  //     const l1 = 4;
  //     const l2 = 17;
  //     const l3 = 20;
  //     const l4 = 13;
  //     const word = l0 + 26 * (l1 + 26 * (l2 + 26 * (l3 + 26 * l4)));
  //     const [_vR, proof] = genProofAndRoot(validWordsList, [0, word], ["uint8", "uint32"]);
  //     const tx1 = await createTransaction(contract.guessWord1, word, proof);
  //     await tx1.wait();
  //   }
  //   //number of guesses
  //   {
  //     const nguess = await contract.nGuesses();
  //     expect(nguess).to.equal(1);
  //   }
  //   //check guess
  //   {
  //     const [eqMask, letterMask] = await contract.getGuess(0);
  //     expect(eqMask).to.equal(8);
  //     expect(letterMask).to.equal(1 << 20);
  //   }
  //   console.log("guess 2");
  //   // guess 2
  //   {
  //     // "about"
  //     const l0 = 0;
  //     const l1 = 1;
  //     const l2 = 14;
  //     const l3 = 20;
  //     const l4 = 19;
  //     const word = l0 + 26 * (l1 + 26 * (l2 + 26 * (l3 + 26 * l4)));
  //     const [_validRoot, proof] = genProofAndRoot(validWordsList, [0, word], ["uint8", "uint32"]);
  //     const tx1 = await createTransaction(contract.guessWord1, word, proof);
  //     await tx1.wait();
  //   }
  //   // number of guesses
  //   {
  //     const nguess = await contract.nGuesses();
  //     expect(nguess).to.equal(2);
  //   }
  //   // get guess
  //   {
  //     const [eqMask, letterMask] = await contract.getGuess(1);
  //     expect(eqMask).to.equal(31);
  //     expect(letterMask).to.equal(1589251);
  //   }
  //   console.log("claim win");
  //   // claim win
  //   {
  //     const tx1 = await createTransaction(contract.claimWin, 1);
  //     await tx1.wait();
  //     const hasWon = await contract.playerWon();
  //     expect(hasWon);
  //   }
  //   console.log("reveal word");
  //   // reveal word
  //   {
  //     const tx1 = await createTransaction(contract.revealWordAndStore);
  //     await tx1.wait();
  //     const word = await contract.word1();
  //     expect(word).to.equal(ourWord);
  //   }
  //   console.log("check proof");
  //   // check proof
  //   {
  //     const bobContract = contract.connect(this.signers.bob);
  //     const tx1 = await createTransaction(bobContract.checkProof, proof);
  //     await tx1.wait();
  //     const proofChecked = await contract.proofChecked();
  //     expect(proofChecked);
  //   }
  // }).timeout(180000);
});
