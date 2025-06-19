import { ethers } from 'ethers';
import abi from '../../hardhat/artifacts/contracts/EVoting.sol/EVoting.json';

const contractAddress = '0x23ecA44be7e11d12044401FA398dc4e4E98f851B';
const contractABI = abi.abi;

export async function getEVotingContract() {
  if (typeof window === 'undefined') throw new Error('Must run in browser');

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner(); // ← FIXED
  const contract = new ethers.Contract(contractAddress, contractABI, signer);

  return contract;
}
