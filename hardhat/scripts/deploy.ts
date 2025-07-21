import { ethers } from 'hardhat';
import * as fs from 'fs';
import * as path from 'path';

interface CandidateConfig {
  candidates: string[];
  description: string;
}

async function main() {
  // Read candidates from JSON file
  const configPath = path.join(__dirname, '../config/candidates.json');

  if (!fs.existsSync(configPath)) {
    console.log('❌ Candidates config file not found at:', configPath);
    console.log('💡 Please create the file with the following structure:');
    console.log(`{
  "candidates": ["Candidate 1", "Candidate 2", "Candidate 3"],
  "description": "Your election description"
}`);
    process.exit(1);
  }

  const configData: CandidateConfig = JSON.parse(
    fs.readFileSync(configPath, 'utf8')
  );
  const { candidates, description } = configData;

  if (!candidates || candidates.length < 2) {
    console.log('❌ At least 2 candidates are required');
    process.exit(1);
  }

  console.log('🗳️  EVoting Contract Deployment');
  console.log('================================');
  console.log('📝 Description:', description);
  console.log('🎯 Candidates to be added:', candidates.join(', '));
  console.log('📊 Total candidates:', candidates.length);

  console.log('\n🚀 Deploying contract...');

  const Voting = await ethers.getContractFactory('EVoting');
  const contract = await Voting.deploy(candidates);

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log('\n✅ EVoting contract deployed successfully!');
  console.log('📍 Contract address:', address);
  console.log('🎯 Total candidates:', candidates.length);
  console.log('📋 Candidates:');
  candidates.forEach((candidate, index) => {
    console.log(`   ${index + 1}. ${candidate}`);
  });

  // Save deployment info
  const deploymentInfo = {
    contractAddress: address,
    candidates: candidates,
    description: description,
    deployedAt: new Date().toISOString(),
    network: process.env.HARDHAT_NETWORK || 'localhost',
  };

  const deploymentPath = path.join(__dirname, '../deployments/latest.json');
  const deploymentDir = path.dirname(deploymentPath);

  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }

  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log('📄 Deployment info saved to:', deploymentPath);

  // Update frontend environment file
  const envPath = path.join(__dirname, '../../.env.local');
  let envContent = '';

  if (fs.existsSync(envPath)) {
    envContent = fs.readFileSync(envPath, 'utf8');
  }

  // Update or add contract address
  const contractAddressLine = `NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`;

  if (envContent.includes('NEXT_PUBLIC_CONTRACT_ADDRESS=')) {
    // Replace existing contract address
    envContent = envContent.replace(
      /NEXT_PUBLIC_CONTRACT_ADDRESS=.*/,
      contractAddressLine
    );
  } else {
    // Add new contract address
    envContent += `\n${contractAddressLine}`;
  }

  // Add other required env vars if they don't exist
  if (!envContent.includes('NEXT_PUBLIC_NETWORK_ID=')) {
    envContent += '\nNEXT_PUBLIC_NETWORK_ID=31337';
  }
  if (!envContent.includes('NEXT_PUBLIC_RPC_URL=')) {
    envContent += '\nNEXT_PUBLIC_RPC_URL=http://localhost:8545';
  }

  fs.writeFileSync(envPath, envContent.trim() + '\n');
  console.log('🔄 Frontend environment updated with new contract address');
  console.log('🚨 Please restart your Next.js development server!');
}

main().catch((error) => {
  console.error('\n❌ Deployment error:', error);
  process.exitCode = 1;
});
