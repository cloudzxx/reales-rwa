require("@nomicfoundation/hardhat-toolbox");

const rpcUrl = process.env.HARDHAT_RPC_URL || "http://127.0.0.1:8545";
const sepoliaRpc = process.env.SEPOLIA_RPC_URL || "https://ethereum-sepolia.publicnode.com";
const sepoliaKey = process.env.SEPOLIA_PRIVATE_KEY || "";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    localhost: {
      url: rpcUrl,
    },
    sepolia: {
      url: sepoliaRpc,
      accounts: sepoliaKey ? [sepoliaKey] : [],
    },
  },
};
