import { ethers } from 'ethers';
import abi from '../../hardhat/artifacts/contracts/EVoting.sol/EVoting.json';

const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || '';
const contractABI = abi.abi;

export async function getEVotingContract() {
  if (typeof window === 'undefined') throw new Error('Must run in browser');

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner(); // ← FIXED
  const contract = new ethers.Contract(contractAddress, contractABI, signer);

  return contract;
}
