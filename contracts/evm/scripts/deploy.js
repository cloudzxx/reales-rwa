const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const RWAToken = await hre.ethers.getContractFactory("RWAToken");
  const token = await RWAToken.deploy();
  await token.waitForDeployment();

  const contractAddress = await token.getAddress();
  console.log("RWAToken deployed to:", contractAddress);

  await token.createAsset(
    1,
    "Shanghai Pudong Office Tower",
    "RealEstate Corp",
    "Commercial Real Estate",
    "https://reales-rwa.example.com/metadata/1",
    hre.ethers.parseEther("1000000")
  );
  console.log("Asset #1 created");

  await token.addToWhitelist(deployer.address);
  console.log("Deployer whitelisted");

  const artifact = require("../artifacts/contracts/RWAToken.sol/RWAToken.json");

  const libDir = process.env.OUTPUT_DIR || path.join(__dirname, "../../frontend/lib");
  if (!fs.existsSync(libDir)) {
    fs.mkdirSync(libDir, { recursive: true });
  }

  fs.writeFileSync(
    path.join(libDir, "deployment.ts"),
    `export const CONTRACT_ADDRESS = '${contractAddress}';\n`
  );

  fs.writeFileSync(
    path.join(libDir, "abi.ts"),
    `export const CONTRACT_ABI = ${JSON.stringify(artifact.abi, null, 2)};\n`
  );

  console.log(`Deployment info written to ${libDir}/`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});