# 🗳️ Votely - Blockchain Based Electronic Voting System

![Next.js](https://img.shields.io/badge/Next.js-13+-000000?style=for-the-badge&logo=next.js&logoColor=white)
![Ethereum](https://img.shields.io/badge/Ethereum-3C3C3D?style=for-the-badge&logo=ethereum&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Hardhat](https://img.shields.io/badge/Hardhat-FFF100?style=for-the-badge&logoColor=black)

A modern blockchain-based e-voting application built with Next.js and Ethereum smart contracts.

## ✨ Features

- **Secure Voting**: Cast votes securely on the blockchain
- **Real-time Results**: View election results as they happen
- **Candidate Management**: Add and manage candidates
- **Mobile Responsive**: Modern UI that works on all devices
- **Wallet Integration**: Connect with MetaMask and other Ethereum wallets

## 🛠️ Technology Stack

- **Frontend**: Next.js, React, TailwindCSS
- **Smart Contracts**: Solidity, Hardhat
- **Blockchain Interaction**: ethers.js
- **Development**: TypeScript

## 🚀 Getting Started

### Prerequisites

- Node.js 16+ and npm/yarn
- MetaMask or other Ethereum wallet browser extension

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/votely.git
cd votely
```

2. Install frontend dependencies:

```bash
npm install
# or
yarn install
```

3. Install smart contract dependencies:

```bash
cd hardhat
npm install
# or
yarn install
cd ..
```

4. Create a .env.local file in the project root with your configuration:

```
SEPOLIA_RPC_URL=https://your_sepolia_rpc_url.com
PRIVATE_KEY=your_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key
CONTRACT_ADDRESS=your_contract_address
```

## 💻 Development

### Running the Frontend

Start the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the application.

### Smart Contract Development

Compile contracts:

```bash
cd hardhat
npx hardhat compile
```

Run local blockchain:

```bash
npx hardhat node
```

Deploy contracts to local network:

```bash
npx hardhat run scripts/deploy.ts --network localhost
```

Or deploy contracts to sepolia network:

```bash
npx hardhat run scripts/deploy.ts --network sepolia
```

Run tests:

```bash
npx hardhat test
```

## 📱 Usage

1. Connect your wallet using the connect button
2. Navigate to the voting page
3. Select your preferred candidate
4. Confirm the transaction in your wallet
5. View results after voting

## 🌐 Deployment

### Frontend Deployment

The easiest way to deploy the frontend is using Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fyourusername%2Fvotely)

### Smart Contract Deployment

To deploy to a testnet or mainnet:

1. Update hardhat.config.ts with your network configuration
2. Set up environment variables for deployment
3. Run the deployment script:

```bash
cd hardhat
npx hardhat run scripts/deploy.ts --network <network-name>
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Built with ❤️ by sincanmaulanaa
