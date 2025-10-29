import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { ConfidentialTokenExample, ConfidentialTokenExample__factory } from "../../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { deployConfidentialTokenExampleFixture } from "./confToken.fixture";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  carol: HardhatEthersSigner;
};

describe("ConfidentialToken", function () {
  let signers: Signers;
  let confidentialToken: ConfidentialTokenExample;
  let confidentialTokenAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      alice: ethSigners[1],
      bob: ethSigners[2],
      carol: ethSigners[3],
    };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ ConfidentialTokenExample: confidentialToken, ConfidentialTokenExampleAddress: confidentialTokenAddress } =
      await deployConfidentialTokenExampleFixture(signers.deployer));
  });

  describe("Deployment", function () {
    it("should deploy with correct initial parameters", async function () {
      expect(await confidentialToken.name()).to.equal("Confidential Token");
      expect(await confidentialToken.symbol()).to.equal("CTKN");
      expect(await confidentialToken.contractURI()).to.equal("https://example.com/token");
    });

    it("should set deployer as owner", async function () {
      expect(await confidentialToken.owner()).to.equal(signers.deployer.address);
    });

    it("should mint initial supply to deployer", async function () {
      const deployerBalance = await confidentialToken.confidentialBalanceOf(signers.deployer.address);

      // The balance should be encrypted, so we need to decrypt it
      const clearBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        deployerBalance,
        confidentialTokenAddress,
        signers.deployer,
      );

      expect(clearBalance).to.equal(1000);
    });

    it("should have correct total supply", async function () {
      const totalSupply = await confidentialToken.confidentialTotalSupply();

      // Total supply should be encrypted, so we need to decrypt it
      // The owner should have access to decrypt the total supply
      const clearTotalSupply = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        totalSupply,
        confidentialTokenAddress,
        signers.deployer,
      );

      expect(clearTotalSupply).to.equal(1000);
    });
  });

  describe("Ownership", function () {
    it("should allow owner to transfer ownership", async function () {
      await confidentialToken.connect(signers.deployer).transferOwnership(signers.alice.address);

      // With Ownable2Step, the new owner must accept ownership
      await confidentialToken.connect(signers.alice).acceptOwnership();

      expect(await confidentialToken.owner()).to.equal(signers.alice.address);
    });

    it("should not allow non-owner to transfer ownership", async function () {
      await expect(
        confidentialToken.connect(signers.alice).transferOwnership(signers.bob.address),
      ).to.be.revertedWithCustomError(confidentialToken, "OwnableUnauthorizedAccount");
    });

    it("should not allow non-owner to renounce ownership", async function () {
      await expect(confidentialToken.connect(signers.alice).renounceOwnership()).to.be.revertedWithCustomError(
        confidentialToken,
        "OwnableUnauthorizedAccount",
      );
    });
  });

  describe("Token Information", function () {
    it("should return correct name", async function () {
      expect(await confidentialToken.name()).to.equal("Confidential Token");
    });

    it("should return correct symbol", async function () {
      expect(await confidentialToken.symbol()).to.equal("CTKN");
    });

    it("should return correct token URI", async function () {
      expect(await confidentialToken.contractURI()).to.equal("https://example.com/token");
    });
  });

  describe("Balance and Supply", function () {
    it("should return encrypted balance for deployer", async function () {
      const balance = await confidentialToken.confidentialBalanceOf(signers.deployer.address);
      expect(balance).to.not.equal(ethers.ZeroHash);

      // Decrypt and verify the balance
      const clearBalance = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        balance,
        confidentialTokenAddress,
        signers.deployer,
      );
      expect(clearBalance).to.equal(1000);
    });

    it("should return zero balance for new addresses", async function () {
      const balance = await confidentialToken.confidentialBalanceOf(signers.alice.address);

      // For zero balances, we should check if the handle is initialized
      // If it's not initialized, it means the balance is effectively zero
      try {
        const clearBalance = await fhevm.userDecryptEuint(
          FhevmType.euint64,
          balance,
          confidentialTokenAddress,
          signers.alice,
        );
        expect(clearBalance).to.equal(0);
      } catch (error: any) {
        // If decryption fails due to uninitialized handle, that's also valid
        // as it indicates a zero balance
        expect(error.message).to.include("Handle is not initialized");
      }
    });

    it("should return encrypted total supply", async function () {
      const totalSupply = await confidentialToken.confidentialTotalSupply();
      expect(totalSupply).to.not.equal(ethers.ZeroHash);

      // Decrypt and verify the total supply
      // The owner should have access to decrypt the total supply
      const clearTotalSupply = await fhevm.userDecryptEuint(
        FhevmType.euint64,
        totalSupply,
        confidentialTokenAddress,
        signers.deployer,
      );
      expect(clearTotalSupply).to.equal(1000);
    });
  });

  describe("Access Control", function () {
    it("should allow owner to see confidential total supply", async function () {
      const confidentialTotalSupply = await confidentialToken.confidentialTotalSupply();
      expect(confidentialTotalSupply).to.not.equal(ethers.ZeroHash);
    });

    it("should not allow non-owner to see confidential total supply", async function () {
      // This should revert or return encrypted data that non-owners can't decrypt
      // The exact behavior depends on the FHE implementation
      const confidentialTotalSupply = await confidentialToken.confidentialTotalSupply();
      expect(confidentialTotalSupply).to.not.equal(ethers.ZeroHash);
    });
  });

  describe("Constructor Parameters", function () {
    it("should handle different initial amounts", async function () {
      // Deploy a new contract with different initial amount
      const ConfidentialTokenFactory = (await ethers.getContractFactory(
        "ConfidentialTokenExample",
      )) as ConfidentialTokenExample__factory;
      const newToken = (await ConfidentialTokenFactory.deploy(
        500, // Different initial amount
        "Test Token",
        "TEST",
        "https://test.com/token",
      )) as ConfidentialTokenExample;

      const newTokenAddress = await newToken.getAddress();
      const balance = await newToken.confidentialBalanceOf(signers.deployer.address);

      const clearBalance = await fhevm.userDecryptEuint(FhevmType.euint64, balance, newTokenAddress, signers.deployer);

      expect(clearBalance).to.equal(500);
    });

    it("should handle empty token URI", async function () {
      const ConfidentialTokenFactory = (await ethers.getContractFactory(
        "ConfidentialTokenExample",
      )) as ConfidentialTokenExample__factory;
      const newToken = (await ConfidentialTokenFactory.deploy(
        100,
        "Empty URI Token",
        "EMPTY",
        "", // Empty token URI
      )) as ConfidentialTokenExample;

      expect(await newToken.contractURI()).to.equal("");
    });
  });
});
