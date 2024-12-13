import { JsonRpcProvider } from "ethers";
import { ethers } from "ethers";
import { log2 } from "extra-bigint";
import { Database } from "sqlite3";

import { TFHEEXECUTOR_ADDRESS } from "../test/constants";

const provider = new JsonRpcProvider("http://127.0.0.1:8545");

const executorAddress = TFHEEXECUTOR_ADDRESS;

let firstBlockListening = 0;
let counterRand = 0;

//const db = new Database("./sql.db"); // on-disk db for debugging
const db = new Database(":memory:");

export function insertSQL(handle: string, clearText: bigint, replace: boolean = false) {
  if (replace) {
    // this is useful if using snapshots while sampling different random numbers on each revert
    db.run("INSERT OR REPLACE INTO ciphertexts (handle, clearText) VALUES (?, ?)", [handle, clearText.toString()]);
  } else {
    db.run("INSERT OR IGNORE INTO ciphertexts (handle, clearText) VALUES (?, ?)", [handle, clearText.toString()]);
  }
}

// Decrypt any handle, bypassing ACL
// WARNING : only for testing or internal use
export const getClearText = async (handle: bigint): Promise<string> => {
  const handleStr = "0x" + handle.toString(16).padStart(64, "0");

  return new Promise((resolve, reject) => {
    let attempts = 0;
    const maxRetries = 100;

    function executeQuery() {
      db.get("SELECT clearText FROM ciphertexts WHERE handle = ?", [handleStr], (err, row) => {
        if (err) {
          reject(new Error(`Error querying database: ${err.message}`));
        } else if (row) {
          resolve(row.clearText);
        } else if (attempts < maxRetries) {
          attempts++;
          executeQuery();
        } else {
          reject(new Error("No record found after maximum retries"));
        }
      });
    }

    executeQuery();
  });
};

db.serialize(() => db.run("CREATE TABLE IF NOT EXISTS ciphertexts (handle BINARY PRIMARY KEY,clearText TEXT)"));

interface FHEVMEvent {
  eventName: string;
  args: object;
}

const NumBits = {
  0: 1n, //ebool
  1: 4n, //euint4
  2: 8n, //euint8
  3: 16n, //euint16
  4: 32n, //euint32
  5: 64n, //euint64
  6: 128n, //euint128
  7: 160n, //eaddress
  8: 256n, //euint256
  9: 512n, //ebytes64
  10: 1024n, //ebytes128
  11: 2048n, //ebytes256
};

export function numberToEvenHexString(num: number) {
  if (typeof num !== "number" || num < 0) {
    throw new Error("Input should be a non-negative number.");
  }
  let hexString = num.toString(16);
  if (hexString.length % 2 !== 0) {
    hexString = "0" + hexString;
  }
  return hexString;
}

function getRandomBigInt(numBits: number): bigint {
  if (numBits <= 0) {
    throw new Error("Number of bits must be greater than 0");
  }
  const numBytes = Math.ceil(numBits / 8);
  const randomBytes = new Uint8Array(numBytes);
  crypto.getRandomValues(randomBytes);
  let randomBigInt = BigInt(0);
  for (let i = 0; i < numBytes; i++) {
    randomBigInt = (randomBigInt << BigInt(8)) | BigInt(randomBytes[i]);
  }
  const mask = (BigInt(1) << BigInt(numBits)) - BigInt(1);
  randomBigInt = randomBigInt & mask;
  return randomBigInt;
}

function bitwiseNotUintBits(value: bigint, numBits: number) {
  if (typeof value !== "bigint") {
    throw new TypeError("The input value must be a BigInt.");
  }
  if (typeof numBits !== "number" || numBits <= 0) {
    throw new TypeError("The numBits parameter must be a positive integer.");
  }
  // Create the mask with numBits bits set to 1
  const BIT_MASK = (BigInt(1) << BigInt(numBits)) - BigInt(1);
  return ~value & BIT_MASK;
}

export const awaitCoprocessor = async (): Promise<void> => {
  await processAllPastTFHEExecutorEvents();
};

const abi = [
  "event FheAdd(uint256 lhs, uint256 rhs, bytes1 scalarByte, uint256 result)",
  "event FheSub(uint256 lhs, uint256 rhs, bytes1 scalarByte, uint256 result)",
  "event FheMul(uint256 lhs, uint256 rhs, bytes1 scalarByte, uint256 result)",
  "event FheDiv(uint256 lhs, uint256 rhs, bytes1 scalarByte, uint256 result)",
  "event FheRem(uint256 lhs, uint256 rhs, bytes1 scalarByte, uint256 result)",
  "event FheBitAnd(uint256 lhs, uint256 rhs, bytes1 scalarByte, uint256 result)",
  "event FheBitOr(uint256 lhs, uint256 rhs, bytes1 scalarByte, uint256 result)",
  "event FheBitXor(uint256 lhs, uint256 rhs, bytes1 scalarByte, uint256 result)",
  "event FheShl(uint256 lhs, uint256 rhs, bytes1 scalarByte, uint256 result)",
  "event FheShr(uint256 lhs, uint256 rhs, bytes1 scalarByte, uint256 result)",
  "event FheRotl(uint256 lhs, uint256 rhs, bytes1 scalarByte, uint256 result)",
  "event FheRotr(uint256 lhs, uint256 rhs, bytes1 scalarByte, uint256 result)",
  "event FheEq(uint256 lhs, uint256 rhs, bytes1 scalarByte, uint256 result)",
  "event FheEqBytes(uint256 lhs, bytes rhs, bytes1 scalarByte, uint256 result)",
  "event FheNe(uint256 lhs, uint256 rhs, bytes1 scalarByte, uint256 result)",
  "event FheNeBytes(uint256 lhs, bytes rhs, bytes1 scalarByte, uint256 result)",
  "event FheGe(uint256 lhs, uint256 rhs, bytes1 scalarByte, uint256 result)",
  "event FheGt(uint256 lhs, uint256 rhs, bytes1 scalarByte, uint256 result)",
  "event FheLe(uint256 lhs, uint256 rhs, bytes1 scalarByte, uint256 result)",
  "event FheLt(uint256 lhs, uint256 rhs, bytes1 scalarByte, uint256 result)",
  "event FheMin(uint256 lhs, uint256 rhs, bytes1 scalarByte, uint256 result)",
  "event FheMax(uint256 lhs, uint256 rhs, bytes1 scalarByte, uint256 result)",
  "event FheNeg(uint256 ct, uint256 result)",
  "event FheNot(uint256 ct, uint256 result)",
  "event VerifyCiphertext(bytes32 inputHandle,address userAddress,bytes inputProof,bytes1 inputType,uint256 result)",
  "event Cast(uint256 ct, bytes1 toType, uint256 result)",
  "event TrivialEncrypt(uint256 pt, bytes1 toType, uint256 result)",
  "event TrivialEncryptBytes(bytes pt, bytes1 toType, uint256 result)",
  "event FheIfThenElse(uint256 control, uint256 ifTrue, uint256 ifFalse, uint256 result)",
  "event FheRand(bytes1 randType, uint256 result)",
  "event FheRandBounded(uint256 upperBound, bytes1 randType, uint256 result)",
];

async function processAllPastTFHEExecutorEvents() {
  const latestBlockNumber = await provider.getBlockNumber();

  const contract = new ethers.Contract(executorAddress, abi, provider);

  // Fetch all events emitted by the contract
  const filter = {
    address: executorAddress,
    fromBlock: firstBlockListening,
    toBlock: latestBlockNumber,
  };

  const logs = await provider.getLogs(filter);

  const events = logs
    .map((log) => {
      try {
        const parsedLog = contract.interface.parseLog(log);
        return {
          eventName: parsedLog.name,
          args: parsedLog.args,
        };
      } catch (e) {
        // If the log cannot be parsed, skip it
        return null;
      }
    })
    .filter((event) => event !== null);

  firstBlockListening = latestBlockNumber + 1;

  events.map(async (event) => await insertHandleFromEvent(event));
}

async function insertHandleFromEvent(event: FHEVMEvent) {
  let handle;
  let clearText;
  let clearLHS;
  let clearRHS;
  let resultType;
  let shift;

  switch (event.eventName) {
    case "TrivialEncrypt":
      clearText = event.args[0];
      handle = ethers.toBeHex(event.args[2], 32);
      insertSQL(handle, clearText);
      break;

    case "TrivialEncryptBytes":
      clearText = event.args[0];
      handle = ethers.toBeHex(event.args[2], 32);
      insertSQL(handle, clearText);
      break;

    case "FheAdd":
      handle = ethers.toBeHex(event.args[3], 32);
      resultType = parseInt(handle.slice(-4, -2), 16);
      clearLHS = await getClearText(event.args[0]);
      if (event.args[2] === "0x01") {
        clearText = BigInt(clearLHS) + event.args[1];
        clearText = clearText % 2n ** NumBits[resultType];
      } else {
        clearRHS = await getClearText(event.args[1]);
        clearText = BigInt(clearLHS) + BigInt(clearRHS);
        clearText = clearText % 2n ** NumBits[resultType];
      }
      insertSQL(ethers.toBeHex(handle, 32), clearText);
      break;

    case "FheSub":
      handle = ethers.toBeHex(event.args[3], 32);
      resultType = parseInt(handle.slice(-4, -2), 16);
      clearLHS = await getClearText(event.args[0]);
      if (event.args[2] === "0x01") {
        clearText = BigInt(clearLHS) - event.args[1];
        if (clearText < 0n) clearText = clearText + 2n ** NumBits[resultType];
        clearText = clearText % 2n ** NumBits[resultType];
      } else {
        clearRHS = await getClearText(event.args[1]);
        clearText = BigInt(clearLHS) - BigInt(clearRHS);
        if (clearText < 0n) clearText = clearText + 2n ** NumBits[resultType];
        clearText = clearText % 2n ** NumBits[resultType];
      }
      insertSQL(handle, clearText);
      break;

    case "FheMul":
      handle = ethers.toBeHex(event.args[3], 32);
      resultType = parseInt(handle.slice(-4, -2), 16);
      clearLHS = await getClearText(event.args[0]);
      if (event.args[2] === "0x01") {
        clearText = BigInt(clearLHS) * event.args[1];
        clearText = clearText % 2n ** NumBits[resultType];
      } else {
        clearRHS = await getClearText(event.args[1]);
        clearText = BigInt(clearLHS) * BigInt(clearRHS);
        clearText = clearText % 2n ** NumBits[resultType];
      }
      insertSQL(handle, clearText);
      break;

    case "FheDiv":
      handle = ethers.toBeHex(event.args[3], 32);
      resultType = parseInt(handle.slice(-4, -2), 16);
      clearLHS = await getClearText(event.args[0]);
      if (event.args[2] === "0x01") {
        clearText = BigInt(clearLHS) / event.args[1];
      } else {
        throw new Error("Non-scalar div not implemented yet");
      }
      insertSQL(handle, clearText);
      break;

    case "FheRem":
      handle = ethers.toBeHex(event.args[3], 32);
      resultType = parseInt(handle.slice(-4, -2), 16);
      clearLHS = await getClearText(event.args[0]);
      if (event.args[2] === "0x01") {
        clearText = BigInt(clearLHS) % event.args[1];
      } else {
        throw new Error("Non-scalar rem not implemented yet");
      }
      insertSQL(handle, clearText);
      break;

    case "FheBitAnd":
      handle = ethers.toBeHex(event.args[3], 32);
      resultType = parseInt(handle.slice(-4, -2), 16);
      clearLHS = await getClearText(event.args[0]);
      if (event.args[2] === "0x01") {
        clearText = BigInt(clearLHS) & event.args[1];
        clearText = clearText % 2n ** NumBits[resultType];
      } else {
        clearRHS = await getClearText(event.args[1]);
        clearText = BigInt(clearLHS) & BigInt(clearRHS);
        clearText = clearText % 2n ** NumBits[resultType];
      }
      insertSQL(handle, clearText);
      break;

    case "FheBitOr":
      handle = ethers.toBeHex(event.args[3], 32);
      resultType = parseInt(handle.slice(-4, -2), 16);
      clearLHS = await getClearText(event.args[0]);
      if (event.args[2] === "0x01") {
        clearText = BigInt(clearLHS) | event.args[1];
        clearText = clearText % 2n ** NumBits[resultType];
      } else {
        clearRHS = await getClearText(event.args[1]);
        clearText = BigInt(clearLHS) | BigInt(clearRHS);
        clearText = clearText % 2n ** NumBits[resultType];
      }
      insertSQL(handle, clearText);
      break;

    case "FheBitXor":
      handle = ethers.toBeHex(event.args[3], 32);
      resultType = parseInt(handle.slice(-4, -2), 16);
      clearLHS = await getClearText(event.args[0]);
      if (event.args[2] === "0x01") {
        clearText = BigInt(clearLHS) ^ event.args[1];
        clearText = clearText % 2n ** NumBits[resultType];
      } else {
        clearRHS = await getClearText(event.args[1]);
        clearText = BigInt(clearLHS) ^ BigInt(clearRHS);
        clearText = clearText % 2n ** NumBits[resultType];
      }
      insertSQL(handle, clearText);
      break;

    case "FheShl":
      handle = ethers.toBeHex(event.args[3], 32);
      resultType = parseInt(handle.slice(-4, -2), 16);
      clearLHS = await getClearText(event.args[0]);
      if (event.args[2] === "0x01") {
        clearText = BigInt(clearLHS) << event.args[1] % NumBits[resultType];
        clearText = clearText % 2n ** NumBits[resultType];
      } else {
        clearRHS = await getClearText(event.args[1]);
        clearText = BigInt(clearLHS) << BigInt(clearRHS) % NumBits[resultType];
        clearText = clearText % 2n ** NumBits[resultType];
      }
      insertSQL(handle, clearText);
      break;

    case "FheShr":
      handle = ethers.toBeHex(event.args[3], 32);
      resultType = parseInt(handle.slice(-4, -2), 16);
      clearLHS = await getClearText(event.args[0]);
      if (event.args[2] === "0x01") {
        clearText = BigInt(clearLHS) >> event.args[1] % NumBits[resultType];
        clearText = clearText % 2n ** NumBits[resultType];
      } else {
        clearRHS = await getClearText(event.args[1]);
        clearText = BigInt(clearLHS) >> BigInt(clearRHS) % NumBits[resultType];
        clearText = clearText % 2n ** NumBits[resultType];
      }
      insertSQL(handle, clearText);
      break;

    case "FheRotl":
      handle = ethers.toBeHex(event.args[3], 32);
      resultType = parseInt(handle.slice(-4, -2), 16);
      clearLHS = await getClearText(event.args[0]);
      if (event.args[2] === "0x01") {
        shift = event.args[1] % NumBits[resultType];
        clearText = (BigInt(clearLHS) << shift) | (BigInt(clearLHS) >> (NumBits[resultType] - shift));
        clearText = clearText % 2n ** NumBits[resultType];
      } else {
        clearRHS = await getClearText(event.args[1]);
        shift = BigInt(clearRHS) % NumBits[resultType];
        clearText = (BigInt(clearLHS) << shift) | (BigInt(clearLHS) >> (NumBits[resultType] - shift));
        clearText = clearText % 2n ** NumBits[resultType];
      }
      insertSQL(handle, clearText);
      break;

    case "FheRotr":
      handle = ethers.toBeHex(event.args[3], 32);
      resultType = parseInt(handle.slice(-4, -2), 16);
      clearLHS = await getClearText(event.args[0]);
      if (event.args[2] === "0x01") {
        shift = event.args[1] % NumBits[resultType];
        clearText = (BigInt(clearLHS) >> shift) | (BigInt(clearLHS) << (NumBits[resultType] - shift));
        clearText = clearText % 2n ** NumBits[resultType];
      } else {
        clearRHS = await getClearText(event.args[1]);
        shift = BigInt(clearRHS) % NumBits[resultType];
        clearText = (BigInt(clearLHS) >> shift) | (BigInt(clearLHS) << (NumBits[resultType] - shift));
        clearText = clearText % 2n ** NumBits[resultType];
      }
      insertSQL(handle, clearText);
      break;

    case "FheEq":
      handle = ethers.toBeHex(event.args[3], 32);
      resultType = parseInt(handle.slice(-4, -2), 16);
      clearLHS = await getClearText(event.args[0]);
      if (event.args[2] === "0x01") {
        clearText = BigInt(clearLHS) === event.args[1] ? 1n : 0n;
      } else {
        clearRHS = await getClearText(event.args[1]);
        clearText = BigInt(clearLHS) === BigInt(clearRHS) ? 1n : 0n;
      }
      insertSQL(handle, clearText);
      break;

    case "FheEqBytes":
      handle = ethers.toBeHex(event.args[3], 32);
      resultType = parseInt(handle.slice(-4, -2), 16);
      clearLHS = await getClearText(event.args[0]);
      if (event.args[2] === "0x01") {
        clearText = BigInt(clearLHS) === BigInt(event.args[1]) ? 1n : 0n;
      } else {
        clearRHS = await getClearText(event.args[1]);
        clearText = BigInt(clearLHS) === BigInt(clearRHS) ? 1n : 0n;
      }
      insertSQL(handle, clearText);
      break;

    case "FheNe":
      handle = ethers.toBeHex(event.args[3], 32);
      resultType = parseInt(handle.slice(-4, -2), 16);
      clearLHS = await getClearText(event.args[0]);
      if (event.args[2] === "0x01") {
        clearText = BigInt(clearLHS) !== event.args[1] ? 1n : 0n;
      } else {
        clearRHS = await getClearText(event.args[1]);
        clearText = BigInt(clearLHS) !== BigInt(clearRHS) ? 1n : 0n;
      }
      insertSQL(handle, clearText);
      break;

    case "FheNeBytes":
      handle = ethers.toBeHex(event.args[3], 32);
      resultType = parseInt(handle.slice(-4, -2), 16);
      clearLHS = await getClearText(event.args[0]);
      if (event.args[2] === "0x01") {
        clearText = BigInt(clearLHS) !== BigInt(event.args[1]) ? 1n : 0n;
      } else {
        clearRHS = await getClearText(event.args[1]);
        clearText = BigInt(clearLHS) !== BigInt(clearRHS) ? 1n : 0n;
      }
      insertSQL(handle, clearText);
      break;

    case "FheGe":
      handle = ethers.toBeHex(event.args[3], 32);
      resultType = parseInt(handle.slice(-4, -2), 16);
      clearLHS = await getClearText(event.args[0]);
      if (event.args[2] === "0x01") {
        clearText = BigInt(clearLHS) >= event.args[1] ? 1n : 0n;
      } else {
        clearRHS = await getClearText(event.args[1]);
        clearText = BigInt(clearLHS) >= BigInt(clearRHS) ? 1n : 0n;
      }
      insertSQL(handle, clearText);
      break;

    case "FheGt":
      handle = ethers.toBeHex(event.args[3], 32);
      resultType = parseInt(handle.slice(-4, -2), 16);
      clearLHS = await getClearText(event.args[0]);
      if (event.args[2] === "0x01") {
        clearText = BigInt(clearLHS) > event.args[1] ? 1n : 0n;
      } else {
        clearRHS = await getClearText(event.args[1]);
        clearText = BigInt(clearLHS) > BigInt(clearRHS) ? 1n : 0n;
      }
      insertSQL(handle, clearText);
      break;

    case "FheLe":
      handle = ethers.toBeHex(event.args[3], 32);
      resultType = parseInt(handle.slice(-4, -2), 16);
      clearLHS = await getClearText(event.args[0]);
      if (event.args[2] === "0x01") {
        clearText = BigInt(clearLHS) <= event.args[1] ? 1n : 0n;
      } else {
        clearRHS = await getClearText(event.args[1]);
        clearText = BigInt(clearLHS) <= BigInt(clearRHS) ? 1n : 0n;
      }
      insertSQL(handle, clearText);
      break;

    case "FheLt":
      handle = ethers.toBeHex(event.args[3], 32);
      resultType = parseInt(handle.slice(-4, -2), 16);
      clearLHS = await getClearText(event.args[0]);
      if (event.args[2] === "0x01") {
        clearText = BigInt(clearLHS) < event.args[1] ? 1n : 0n;
      } else {
        clearRHS = await getClearText(event.args[1]);
        clearText = BigInt(clearLHS) < BigInt(clearRHS) ? 1n : 0n;
      }
      insertSQL(handle, clearText);
      break;

    case "FheMax":
      handle = ethers.toBeHex(event.args[3], 32);
      resultType = parseInt(handle.slice(-4, -2), 16);
      clearLHS = await getClearText(event.args[0]);
      if (event.args[2] === "0x01") {
        clearText = BigInt(clearLHS) > event.args[1] ? clearLHS : event.args[1];
      } else {
        clearRHS = await getClearText(event.args[1]);
        clearText = BigInt(clearLHS) > BigInt(clearRHS) ? clearLHS : clearRHS;
      }
      insertSQL(handle, clearText);
      break;

    case "FheMin":
      handle = ethers.toBeHex(event.args[3], 32);
      resultType = parseInt(handle.slice(-4, -2), 16);
      clearLHS = await getClearText(event.args[0]);
      if (event.args[2] === "0x01") {
        clearText = BigInt(clearLHS) < event.args[1] ? clearLHS : event.args[1];
      } else {
        clearRHS = await getClearText(event.args[1]);
        clearText = BigInt(clearLHS) < BigInt(clearRHS) ? clearLHS : clearRHS;
      }
      insertSQL(handle, clearText);
      break;

    case "Cast":
      resultType = parseInt(event.args[1]);
      handle = ethers.toBeHex(event.args[2], 32);
      clearText = BigInt(await getClearText(event.args[0])) % 2n ** NumBits[resultType];
      insertSQL(handle, clearText);
      break;

    case "FheNot":
      handle = ethers.toBeHex(event.args[1], 32);
      resultType = parseInt(handle.slice(-4, -2), 16);
      clearText = BigInt(await getClearText(event.args[0]));
      clearText = bitwiseNotUintBits(clearText, Number(NumBits[resultType]));
      insertSQL(handle, clearText);
      break;

    case "FheNeg":
      handle = ethers.toBeHex(event.args[1], 32);
      resultType = parseInt(handle.slice(-4, -2), 16);
      clearText = BigInt(await getClearText(event.args[0]));
      clearText = bitwiseNotUintBits(clearText, Number(NumBits[resultType]));
      clearText = (clearText + 1n) % 2n ** NumBits[resultType];
      insertSQL(handle, clearText);
      break;

    case "VerifyCiphertext":
      handle = event.args[0];
      try {
        await getClearText(BigInt(handle));
      } catch {
        throw Error("User input was not found in DB");
      }
      break;

    case "FheIfThenElse":
      handle = ethers.toBeHex(event.args[3], 32);
      resultType = parseInt(handle.slice(-4, -2), 16);
      handle = ethers.toBeHex(event.args[3], 32);
      const clearControl = BigInt(await getClearText(event.args[0]));
      const clearIfTrue = BigInt(await getClearText(event.args[1]));
      const clearIfFalse = BigInt(await getClearText(event.args[2]));
      if (clearControl === 1n) {
        clearText = clearIfTrue;
      } else {
        clearText = clearIfFalse;
      }
      insertSQL(handle, clearText);
      break;

    case "FheRand":
      resultType = parseInt(event.args[0], 16);
      handle = ethers.toBeHex(event.args[1], 32);
      clearText = getRandomBigInt(Number(NumBits[resultType]));
      insertSQL(handle, clearText, true);
      counterRand++;
      break;

    case "FheRandBounded":
      resultType = parseInt(event.args[1], 16);
      handle = ethers.toBeHex(event.args[2], 32);
      clearText = getRandomBigInt(Number(log2(BigInt(event.args[0]))));
      insertSQL(handle, clearText, true);
      counterRand++;
      break;
  }
}
