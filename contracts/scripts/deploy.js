const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  // 使用 Hardhat 的第一个账户（默认：0xf39Fd...）作为合约部署者
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  // 部署 RWAToken，附带演示用资产元数据：商业不动产代币
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

  // 从 Hardhat 编译产物中读取 ABI
  const artifact = require(
    "../artifacts/contracts/RWAToken.sol/RWAToken.json"
  );

  // 将合约地址和 ABI 写入 frontend/lib/
  // 供 Next.js 前端在构建时导入使用
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
