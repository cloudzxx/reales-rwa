const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // Use the first Hardhat account (default: 0xf39Fd...) as contract deployer
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // Deploy RWAToken with demo asset metadata: a commercial real estate token
  const RWAToken = await hre.ethers.getContractFactory("RWAToken");
  const token = await RWAToken.deploy(
    "RealEstate Token",
    "REST",
    "Shanghai Pudong Office Tower",
    "RealEstate Corp",
    "Commercial Real Estate",
    hre.ethers.parseEther("1000000")
  );
  await token.waitForDeployment();

  const contractAddress = await token.getAddress();
  console.log("RWAToken deployed to:", contractAddress);

  // Read the compiled ABI from Hardhat's artifact output
  const artifact = require(
    "../artifacts/contracts/RWAToken.sol/RWAToken.json"
  );

  // Write contract address and ABI to frontend/lib/
  // so the Next.js frontend can import them at build time
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
