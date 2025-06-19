import { ethers } from 'hardhat';

async function main() {
  // ✅ List kandidat yang akan dimasukkan saat deploy
  const candidates = ['Alice', 'Bob', 'Charlie'];

  console.log('Deploying contract...');
  const Voting = await ethers.getContractFactory('EVoting');
  const contract = await Voting.deploy(candidates);

  await contract.waitForDeployment();
  const address = await contract.getAddress();

  console.log('✅ EVoting contract deployed to:', address);
  console.log('🎯 Candidates:', candidates.join(', '));
}

main().catch((error) => {
  console.error('❌ Deployment error:', error);
  process.exitCode = 1;
});
