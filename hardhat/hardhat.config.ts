import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import * as dotenv from 'dotenv';
dotenv.config({ path: __dirname + '/../.env.local' });

dotenv.config();

console.log('SEPOLIA_RPC_URL:', process.env.SEPOLIA_RPC_URL);
console.log('PRIVATE_KEY:', process.env.PRIVATE_KEY);

const config: HardhatUserConfig = {
  solidity: '0.8.28',
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL,
      accounts: [process.env.PRIVATE_KEY!],
    },
  },
  etherscan: {
    apiKey: {
      sepolia: process.env.ETHERSCAN_API_KEY!,
    },
  },
  sourcify: {
    enabled: true,
  },
};

export default config;
