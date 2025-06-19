import * as dotenv from 'dotenv';
import { ethers } from 'ethers';
import abi from '../../hardhat/artifacts/contracts/EVoting.sol/EVoting.json';

dotenv.config();

const contractAddress = process.env.CONTRACT_ADDRESS;
const contractABI = abi.abi;

console.log('contract address from contract.ts: ', contractAddress);

export async function getEVotingContract() {
  if (typeof window === 'undefined') throw new Error('Must run in browser');
  if (!contractAddress) throw new Error('Contract address is not defined');

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner(); // ← FIXED
  const contract = new ethers.Contract(contractAddress, contractABI, signer);

  return contract;
}
