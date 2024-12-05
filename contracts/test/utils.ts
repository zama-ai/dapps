import { toBufferBE } from "bigint-buffer";
import { ethers, network } from "hardhat";

export const mineNBlocks = async (n: number) => {
  for (let index = 0; index < n; index++) {
    await ethers.provider.send("evm_mine");
  }
};

export const bigIntToBytes64 = (value: bigint) => {
  return new Uint8Array(toBufferBE(value, 64));
};

export const bigIntToBytes128 = (value: bigint) => {
  return new Uint8Array(toBufferBE(value, 128));
};

export const bigIntToBytes256 = (value: bigint) => {
  return new Uint8Array(toBufferBE(value, 256));
};

export const waitNBlocks = async (Nblocks: number) => {
  const currentBlock = await ethers.provider.getBlockNumber();
  if (network.name === "hardhat") {
    await produceDummyTransactions(Nblocks);
  }
  await waitForBlock(currentBlock + Nblocks);
};

export const produceDummyTransactions = async (blockCount: number) => {
  let counter = blockCount;
  while (counter >= 0) {
    counter--;
    const [signer] = await ethers.getSigners();
    const nullAddress = "0x0000000000000000000000000000000000000000";
    const tx = {
      to: nullAddress,
      value: 0n,
    };
    const receipt = await signer.sendTransaction(tx);
    await receipt.wait();
  }
};

const waitForBlock = (blockNumber: bigint | number) => {
  return new Promise((resolve, reject) => {
    const waitBlock = async (currentBlock: number) => {
      if (blockNumber <= BigInt(currentBlock)) {
        await ethers.provider.off("block", waitBlock);
        resolve(blockNumber);
      }
    };
    ethers.provider.on("block", waitBlock).catch((err) => {
      reject(err);
    });
  });
};
