const { expect } = require("chai");
const hre = require("hardhat");

describe("RWAToken", function () {
  let token, owner, addr1, addr2;

  beforeEach(async function () {
    [owner, addr1, addr2] = await hre.ethers.getSigners();
    const RWAToken = await hre.ethers.getContractFactory("RWAToken");
    token = await RWAToken.deploy(
      "RealEstate Token",
      "REST",
      "Shanghai Pudong Office Tower",
      "RealEstate Corp",
      "Commercial Real Estate",
      hre.ethers.parseEther("1000000")
    );
  });

  describe("Deployment", function () {
    it("should set asset metadata", async function () {
      const info = await token.getAssetInfo();
      expect(info[0]).to.equal("Shanghai Pudong Office Tower");
      expect(info[1]).to.equal("RealEstate Corp");
      expect(info[2]).to.equal("Commercial Real Estate");
      expect(info[3]).to.equal(hre.ethers.parseEther("1000000"));
    });

    it("should auto-whitelist owner", async function () {
      expect(await token.whitelist(owner.address)).to.equal(true);
    });

    it("should not whitelist others by default", async function () {
      expect(await token.whitelist(addr1.address)).to.equal(false);
    });
  });

  describe("Minting", function () {
    it("should mint tokens to whitelisted address", async function () {
      await token.addToWhitelist(addr1.address);
      await token.mint(addr1.address, hre.ethers.parseEther("100"));
      expect(await token.balanceOf(addr1.address)).to.equal(
        hre.ethers.parseEther("100")
      );
    });

    it("should reject mint to non-whitelisted address", async function () {
      await expect(
        token.mint(addr1.address, hre.ethers.parseEther("100"))
      ).to.be.revertedWith("Recipient not whitelisted");
    });

    it("should reject mint to frozen address", async function () {
      await token.addToWhitelist(addr1.address);
      await token.freeze(addr1.address);
      await expect(
        token.mint(addr1.address, hre.ethers.parseEther("100"))
      ).to.be.revertedWith("Recipient is frozen");
    });

    it("should reject mint exceeding max supply", async function () {
      await token.addToWhitelist(addr1.address);
      await expect(
        token.mint(addr1.address, hre.ethers.parseEther("2000000"))
      ).to.be.revertedWith("Exceeds max supply");
    });

    it("should reject mint from non-owner", async function () {
      await token.addToWhitelist(addr1.address);
      await expect(
        token.connect(addr1).mint(addr1.address, 100)
      ).to.be.reverted;
    });
  });

  describe("Transfers", function () {
    beforeEach(async function () {
      await token.addToWhitelist(addr1.address);
      await token.addToWhitelist(addr2.address);
      await token.mint(addr1.address, hre.ethers.parseEther("500"));
    });

    it("should allow transfer between whitelisted addresses", async function () {
      await token.connect(addr1).transfer(addr2.address, hre.ethers.parseEther("100"));
      expect(await token.balanceOf(addr2.address)).to.equal(
        hre.ethers.parseEther("100")
      );
    });

    it("should reject transfer from frozen sender", async function () {
      await token.freeze(addr1.address);
      await expect(
        token.connect(addr1).transfer(addr2.address, 100)
      ).to.be.revertedWith("Sender is frozen");
    });

    it("should reject transfer to frozen recipient", async function () {
      await token.freeze(addr2.address);
      await expect(
        token.connect(addr1).transfer(addr2.address, 100)
      ).to.be.revertedWith("Recipient is frozen");
    });

    it("should reject transfer from non-whitelisted sender", async function () {
      await token.removeFromWhitelist(addr1.address);
      await expect(
        token.connect(addr1).transfer(addr2.address, hre.ethers.parseEther("100"))
      ).to.be.revertedWith("Sender not whitelisted");
    });

    it("should reject transfer to non-whitelisted recipient", async function () {
      await token.removeFromWhitelist(addr2.address);
      await expect(
        token.connect(addr1).transfer(addr2.address, hre.ethers.parseEther("100"))
      ).to.be.revertedWith("Recipient not whitelisted");
    });
  });

  describe("Whitelist management", function () {
    it("should allow owner to add to whitelist", async function () {
      await token.addToWhitelist(addr1.address);
      expect(await token.whitelist(addr1.address)).to.equal(true);
    });

    it("should allow owner to remove from whitelist", async function () {
      await token.addToWhitelist(addr1.address);
      await token.removeFromWhitelist(addr1.address);
      expect(await token.whitelist(addr1.address)).to.equal(false);
    });

    it("should emit WhitelistUpdated event", async function () {
      await expect(token.addToWhitelist(addr1.address))
        .to.emit(token, "WhitelistUpdated")
        .withArgs(addr1.address, true);
    });

    it("should emit WhitelistUpdated event on remove", async function () {
      await token.addToWhitelist(addr1.address);
      await expect(token.removeFromWhitelist(addr1.address))
        .to.emit(token, "WhitelistUpdated")
        .withArgs(addr1.address, false);
    });
  });

  describe("Freeze management", function () {
    it("should allow owner to freeze address", async function () {
      await token.freeze(addr1.address);
      expect(await token.frozen(addr1.address)).to.equal(true);
    });

    it("should allow owner to unfreeze address", async function () {
      await token.freeze(addr1.address);
      await token.unfreeze(addr1.address);
      expect(await token.frozen(addr1.address)).to.equal(false);
    });

    it("should emit FrozenStatusUpdated event", async function () {
      await expect(token.freeze(addr1.address))
        .to.emit(token, "FrozenStatusUpdated")
        .withArgs(addr1.address, true);
    });

    it("should emit FrozenStatusUpdated event on unfreeze", async function () {
      await token.freeze(addr1.address);
      await expect(token.unfreeze(addr1.address))
        .to.emit(token, "FrozenStatusUpdated")
        .withArgs(addr1.address, false);
    });
  });

  describe("Max supply", function () {
    it("should allow owner to update max supply", async function () {
      await token.setMaxSupply(hre.ethers.parseEther("2000000"));
      const info = await token.getAssetInfo();
      expect(info[3]).to.equal(hre.ethers.parseEther("2000000"));
    });

    it("should emit MaxSupplyUpdated event", async function () {
      await expect(token.setMaxSupply(hre.ethers.parseEther("2000000")))
        .to.emit(token, "MaxSupplyUpdated")
        .withArgs(hre.ethers.parseEther("1000000"), hre.ethers.parseEther("2000000"));
    });

    it("should reject max supply below current supply", async function () {
      await token.addToWhitelist(addr1.address);
      await token.mint(addr1.address, hre.ethers.parseEther("100"));
      await expect(
        token.setMaxSupply(hre.ethers.parseEther("50"))
      ).to.be.revertedWith("New max below current supply");
    });
  });

  describe("renounceOwnership guard", function () {
    it("should reject renounceOwnership", async function () {
      await expect(
        token.renounceOwnership()
      ).to.be.revertedWith("Cannot renounce ownership");
    });
  });
});
