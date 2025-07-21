'use client';
import { useEffect, useState } from 'react';
import { getEVotingContract } from '@/utils/contract';
import { ethers } from 'ethers';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface VoteRecord {
  voter: string;
  candidateIndex: number;
  candidateName: string;
  timestamp: number;
  txHash: string;
}

interface SystemStats {
  totalCandidates: number;
  totalVotes: number;
  startTime: number;
  duration: number;
  contractOwner: string;
}

export default function DetailsPage() {
  const searchParams = useSearchParams();
  const [voteRecords, setVoteRecords] = useState<VoteRecord[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [currentAccount, setCurrentAccount] = useState<string>('');
  const [userVoteInfo, setUserVoteInfo] = useState<{
    voted: boolean;
    candidateIndex: number;
    candidateName: string;
    txHash?: string;
    blockNumber?: number;
  }>();
  const [loading, setLoading] = useState<boolean>(true);
  const [tab, setTab] = useState<'transactions' | 'system' | 'myVote'>(
    (searchParams.get('tab') as 'transactions' | 'system' | 'myVote') ||
      'transactions'
  );
  const [copyStatus, setCopyStatus] = useState<string>('');

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString();
  };

  const formatAddress = (address: string) => {
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(`${type} copied!`);
      setTimeout(() => setCopyStatus(''), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
      setCopyStatus('Failed to copy');
      setTimeout(() => setCopyStatus(''), 2000);
    }
  };

  const getEtherscanUrl = (txHash: string) => {
    // Check if we're on localhost/testnet or mainnet
    // You can modify this based on your network configuration
    const isMainnet = false; // Set to true for mainnet
    const baseUrl = isMainnet
      ? 'https://etherscan.io/tx/'
      : 'https://sepolia.etherscan.io/tx/'; // or other testnet
    return `${baseUrl}${txHash}`;
  };

  const loadVoteHistory = async () => {
    try {
      const contract = await getEVotingContract();
      const count = await contract.getVoteHistoryCount();
      const records = [];
      const candidateNames = new Map();

      // Get all candidate names first
      const candidateCount = await contract.getCandidateCount();
      for (let i = 0; i < candidateCount; i++) {
        const [name] = await contract.getCandidate(i);
        candidateNames.set(i, name);
      }

      // Get vote records
      for (let i = 0; i < count; i++) {
        const [voter, candidateIndex, timestamp, txHash] =
          await contract.getVoteRecord(i);
        records.push({
          voter,
          candidateIndex,
          candidateName: candidateNames.get(candidateIndex) || 'Unknown',
          timestamp: Number(timestamp),
          txHash: txHash.toString(),
        });
      }

      setVoteRecords(records);
    } catch (err) {
      console.error('Failed to load vote history:', err);
    }
  };

  const loadSystemStats = async () => {
    try {
      const contract = await getEVotingContract();
      const [totalCandidates, totalVotes, startTime, duration, contractOwner] =
        await contract.getVotingStats();

      setSystemStats({
        totalCandidates: Number(totalCandidates),
        totalVotes: Number(totalVotes),
        startTime: Number(startTime),
        duration: Number(duration),
        contractOwner,
      });
    } catch (err) {
      console.error('Failed to load system stats:', err);
    }
  };

  const loadUserVoteInfo = async () => {
    try {
      if (!currentAccount) return;

      const contract = await getEVotingContract();

      // Log untuk debugging
      console.log('Checking vote status for address:', currentAccount);

      const [voted, candidateIndex] = await contract.getVoterInfo(
        currentAccount
      );

      // Log hasil dari smart contract
      console.log('Vote status from contract:', {
        voted,
        candidateIndex: Number(candidateIndex),
      });

      if (voted) {
        const [name] = await contract.getCandidate(candidateIndex);
        console.log('Voted for candidate:', name);

        // Try to get transaction hash from localStorage
        const storedTxDetails = localStorage.getItem('lastVoteTransaction');
        let txHash = '';
        let blockNumber = 0;

        if (storedTxDetails) {
          try {
            const txDetails = JSON.parse(storedTxDetails);
            if (txDetails.candidateIndex === Number(candidateIndex)) {
              txHash = txDetails.hash;
              blockNumber = txDetails.blockNumber;
            }
          } catch (err) {
            console.warn('Failed to parse stored transaction details:', err);
          }
        }

        setUserVoteInfo({
          voted,
          candidateIndex: Number(candidateIndex),
          candidateName: name,
          txHash,
          blockNumber,
        });
      } else {
        setUserVoteInfo({
          voted: false,
          candidateIndex: 0,
          candidateName: '',
        });
      }
    } catch (err) {
      console.error('Failed to load user vote info:', err);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      // Get current account
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const account = await signer.getAddress();

      // Pastikan format konsisten dengan toLowerCase()
      const formattedAccount = account.toLowerCase();
      console.log('Current account:', formattedAccount);
      setCurrentAccount(formattedAccount);

      await Promise.all([loadVoteHistory(), loadSystemStats()]);

      // Load user vote info after we have the current account
      await loadUserVoteInfo();
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const checkVoteStatus = async () => {
    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const contract = await getEVotingContract();

      // Langsung panggil fungsi kontrak untuk cek status
      const hasVoted = await contract.hasVoted(currentAccount);

      if (hasVoted && !userVoteInfo?.voted) {
        // Jika sudah vote, ambil informasi pilihan
        const candidateIndex = Number(
          await contract.voterChoice(currentAccount)
        );
        const [name] = await contract.getCandidate(candidateIndex);

        // Try to get transaction hash from localStorage
        const storedTxDetails = localStorage.getItem('lastVoteTransaction');
        let txHash = '';
        let blockNumber = 0;

        console.log('Stored transaction details:', storedTxDetails); // Debug log

        if (storedTxDetails) {
          try {
            const txDetails = JSON.parse(storedTxDetails);
            console.log('Parsed tx details:', txDetails); // Debug log
            if (txDetails.candidateIndex === candidateIndex) {
              txHash = txDetails.hash;
              blockNumber = txDetails.blockNumber;
              console.log('Transaction hash found:', txHash); // Debug log
            }
          } catch (err) {
            console.warn('Failed to parse stored transaction details:', err);
          }
        }

        setUserVoteInfo({
          voted: true,
          candidateIndex: candidateIndex,
          candidateName: name,
          txHash,
          blockNumber,
        });

        console.log('User has voted for:', name);
      }
    } catch (err) {
      console.error('Error checking vote status:', err);
    }
  };

  // Ganti checkVoteEvents dengan checkVoteStatus di useEffect
  useEffect(() => {
    if (currentAccount) {
      checkVoteStatus();
    }
  }, [currentAccount]);

  return (
    <div className='min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 py-12 px-4'>
      <div className='max-w-6xl mx-auto'>
        {/* Header */}
        <div className='text-center mb-10'>
          <h1 className='text-3xl font-bold text-gray-900 mb-3'>
            Voting System Details
          </h1>
          <p className='text-gray-600 max-w-xl mx-auto'>
            Explore transaction history, system statistics, and your vote
            information in the blockchain voting system.
          </p>

          {/* Navigation Links */}
          <div className='mt-6 flex justify-center gap-4'>
            <Link
              href='/'
              className='text-indigo-600 hover:text-indigo-800 font-medium'
            >
              ← Back to Voting
            </Link>
            <Link
              href='/result'
              className='text-indigo-600 hover:text-indigo-800 font-medium'
            >
              View Results →
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className='bg-white rounded-xl shadow-lg overflow-hidden mb-10 border border-gray-100'>
          <div className='flex border-b border-gray-200'>
            <button
              onClick={() => setTab('transactions')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-colors duration-200 ${
                tab === 'transactions'
                  ? 'text-indigo-600 border-b-2 border-indigo-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Transaction History
            </button>
            <button
              onClick={() => setTab('system')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-colors duration-200 ${
                tab === 'system'
                  ? 'text-indigo-600 border-b-2 border-indigo-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              System Statistics
            </button>
            <button
              onClick={() => setTab('myVote')}
              className={`flex-1 py-4 px-6 text-center font-medium transition-colors duration-200 ${
                tab === 'myVote'
                  ? 'text-indigo-600 border-b-2 border-indigo-500'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              My Vote
            </button>
          </div>

          {/* Content */}
          <div className='p-6'>
            {loading ? (
              <div className='flex justify-center items-center py-10'>
                <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500'></div>
              </div>
            ) : (
              <>
                {/* Transaction History Tab */}
                {tab === 'transactions' && (
                  <div>
                    <h2 className='text-xl font-semibold text-gray-800 mb-4'>
                      Vote Transaction History
                    </h2>

                    {voteRecords.length === 0 ? (
                      <p className='text-center text-gray-500 py-8'>
                        No votes have been cast yet.
                      </p>
                    ) : (
                      <div className='overflow-x-auto'>
                        <table className='min-w-full divide-y divide-gray-200'>
                          <thead className='bg-gray-50'>
                            <tr>
                              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                Voter
                              </th>
                              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                Candidate
                              </th>
                              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                Time
                              </th>
                              <th className='px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider'>
                                Transaction Hash
                              </th>
                            </tr>
                          </thead>
                          <tbody className='bg-white divide-y divide-gray-200'>
                            {voteRecords.map((record, index) => (
                              <tr key={index} className='hover:bg-gray-50'>
                                <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-700'>
                                  <span className='font-mono'>
                                    {formatAddress(record.voter)}
                                  </span>
                                </td>
                                <td className='px-6 py-4 whitespace-nowrap text-sm text-indigo-600 font-medium'>
                                  {record.candidateName}
                                </td>
                                <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-500'>
                                  {formatDate(record.timestamp)}
                                </td>
                                <td className='px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500'>
                                  {formatAddress(record.txHash)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {/* System Statistics Tab */}
                {tab === 'system' && systemStats && (
                  <div>
                    <h2 className='text-xl font-semibold text-gray-800 mb-6'>
                      System Statistics
                    </h2>

                    <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
                      <div className='bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl p-6'>
                        <h3 className='text-lg font-medium text-gray-700 mb-4'>
                          Voting Statistics
                        </h3>
                        <ul className='space-y-3'>
                          <li className='flex justify-between'>
                            <span className='text-gray-600'>
                              Total Candidates:
                            </span>
                            <span className='font-semibold text-gray-800'>
                              {systemStats.totalCandidates}
                            </span>
                          </li>
                          <li className='flex justify-between'>
                            <span className='text-gray-600'>
                              Total Votes Cast:
                            </span>
                            <span className='font-semibold text-gray-800'>
                              {systemStats.totalVotes}
                            </span>
                          </li>
                          <li className='flex justify-between'>
                            <span className='text-gray-600'>
                              Participation Rate:
                            </span>
                            <span className='font-semibold text-gray-800'>
                              {voteRecords.length > 0
                                ? `${(
                                    (systemStats.totalVotes /
                                      voteRecords.length) *
                                    100
                                  ).toFixed(2)}%`
                                : '0%'}
                            </span>
                          </li>
                        </ul>
                      </div>

                      <div className='bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6'>
                        <h3 className='text-lg font-medium text-gray-700 mb-4'>
                          Contract Information
                        </h3>
                        <ul className='space-y-3'>
                          <li className='flex justify-between items-start'>
                            <span className='text-gray-600'>
                              Contract Owner:
                            </span>
                            <span className='font-mono text-sm font-medium text-gray-800'>
                              {formatAddress(systemStats.contractOwner)}
                            </span>
                          </li>
                          <li className='flex justify-between '>
                            <span className='text-gray-600'>Started At:</span>
                            <span className='font-medium text-gray-800'>
                              {formatDate(systemStats.startTime)}
                            </span>
                          </li>
                          <li className='flex justify-between'>
                            <span className='text-gray-600'>
                              Running Duration:
                            </span>
                            <span className='font-medium text-gray-800'>
                              {Math.floor(systemStats.duration / 86400)} days
                            </span>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                {/* My Vote Tab */}
                {tab === 'myVote' && (
                  <div>
                    <h2 className='text-xl font-semibold text-gray-800 mb-6'>
                      My Voting Information
                    </h2>

                    <div className='bg-white border border-gray-200 rounded-xl p-6 shadow-sm'>
                      <div className='flex items-start gap-4 mb-6'>
                        <div className='w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0'>
                          <svg
                            className='w-5 h-5 text-indigo-600'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z'
                            />
                          </svg>
                        </div>
                        <div>
                          <h3 className='text-lg font-medium text-gray-800'>
                            Your Account
                          </h3>
                          <p className='text-sm font-mono text-gray-600'>
                            {currentAccount}
                          </p>
                        </div>
                      </div>

                      <div className='border-t border-gray-100 pt-6'>
                        <h3 className='text-lg font-medium text-gray-800 mb-4'>
                          Voting Status
                        </h3>

                        {userVoteInfo?.voted ? (
                          <div className='bg-green-50 border border-green-200 rounded-lg p-4'>
                            <div className='flex items-center mb-2'>
                              <svg
                                className='w-5 h-5 text-green-500 mr-2'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                              >
                                <path
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                  strokeWidth={2}
                                  d='M5 13l4 4L19 7'
                                />
                              </svg>
                              <span className='font-semibold text-green-700'>
                                You have voted!
                              </span>
                            </div>
                            <p className='text-green-600 mb-4'>
                              You voted for{' '}
                              <span className='font-semibold'>
                                {userVoteInfo.candidateName}
                              </span>
                            </p>

                            {/* Debug Info */}
                            <div className='mb-4 p-3 bg-gray-100 rounded text-xs'>
                              <strong>Debug Info:</strong>
                              <br />
                              TxHash: {userVoteInfo.txHash || 'Not found'}
                              <br />
                              Block: {userVoteInfo.blockNumber || 'Not found'}
                              <br />
                              Candidate Index: {userVoteInfo.candidateIndex}
                            </div>

                            {/* Refresh Button */}
                            <button
                              onClick={() => {
                                console.log('Refreshing vote info...');
                                loadUserVoteInfo();
                                checkVoteStatus();
                              }}
                              className='mb-4 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600'
                            >
                              Refresh Vote Info
                            </button>

                            {/* Transaction Details */}
                            {userVoteInfo.txHash ? (
                              <div className='mt-4 border-t border-green-200 pt-4'>
                                <h4 className='text-sm font-semibold text-green-700 mb-3'>
                                  Transaction Details
                                </h4>

                                {/* Transaction Hash */}
                                <div className='mb-3'>
                                  <div className='flex items-center justify-between mb-2'>
                                    <span className='text-sm text-green-600'>
                                      Transaction Hash:
                                    </span>
                                    <div className='flex items-center gap-2'>
                                      <button
                                        onClick={() =>
                                          copyToClipboard(
                                            userVoteInfo.txHash!,
                                            'Transaction hash'
                                          )
                                        }
                                        className='p-1 text-green-600 hover:text-green-800 transition-colors'
                                        title='Copy transaction hash'
                                      >
                                        <svg
                                          className='w-4 h-4'
                                          fill='none'
                                          stroke='currentColor'
                                          viewBox='0 0 24 24'
                                        >
                                          <path
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                            strokeWidth={2}
                                            d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z'
                                          />
                                        </svg>
                                      </button>
                                      <a
                                        href={getEtherscanUrl(
                                          userVoteInfo.txHash
                                        )}
                                        target='_blank'
                                        rel='noopener noreferrer'
                                        className='p-1 text-green-600 hover:text-green-800 transition-colors'
                                        title='View on Etherscan'
                                      >
                                        <svg
                                          className='w-4 h-4'
                                          fill='none'
                                          stroke='currentColor'
                                          viewBox='0 0 24 24'
                                        >
                                          <path
                                            strokeLinecap='round'
                                            strokeLinejoin='round'
                                            strokeWidth={2}
                                            d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
                                          />
                                        </svg>
                                      </a>
                                    </div>
                                  </div>
                                  <div className='font-mono text-xs text-green-700 bg-green-100 p-2 rounded border break-all'>
                                    {userVoteInfo.txHash}
                                  </div>
                                </div>

                                {/* Block Number */}
                                {userVoteInfo.blockNumber &&
                                  userVoteInfo.blockNumber > 0 && (
                                    <div className='mb-3'>
                                      <div className='flex items-center justify-between mb-2'>
                                        <span className='text-sm text-green-600'>
                                          Block Number:
                                        </span>
                                        <button
                                          onClick={() =>
                                            copyToClipboard(
                                              userVoteInfo.blockNumber!.toString(),
                                              'Block number'
                                            )
                                          }
                                          className='p-1 text-green-600 hover:text-green-800 transition-colors'
                                          title='Copy block number'
                                        >
                                          <svg
                                            className='w-4 h-4'
                                            fill='none'
                                            stroke='currentColor'
                                            viewBox='0 0 24 24'
                                          >
                                            <path
                                              strokeLinecap='round'
                                              strokeLinejoin='round'
                                              strokeWidth={2}
                                              d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z'
                                            />
                                          </svg>
                                        </button>
                                      </div>
                                      <div className='font-mono text-xs text-green-700 bg-green-100 p-2 rounded border'>
                                        {userVoteInfo.blockNumber}
                                      </div>
                                    </div>
                                  )}

                                {/* Actions */}
                                <div className='flex gap-2 mt-4'>
                                  <a
                                    href={getEtherscanUrl(userVoteInfo.txHash)}
                                    target='_blank'
                                    rel='noopener noreferrer'
                                    className='inline-flex items-center px-3 py-2 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors'
                                  >
                                    <svg
                                      className='w-3 h-3 mr-1'
                                      fill='none'
                                      stroke='currentColor'
                                      viewBox='0 0 24 24'
                                    >
                                      <path
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        strokeWidth={2}
                                        d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14'
                                      />
                                    </svg>
                                    View on Etherscan
                                  </a>
                                  <button
                                    onClick={() =>
                                      copyToClipboard(
                                        userVoteInfo.txHash!,
                                        'Transaction hash'
                                      )
                                    }
                                    className='inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors'
                                  >
                                    <svg
                                      className='w-3 h-3 mr-1'
                                      fill='none'
                                      stroke='currentColor'
                                      viewBox='0 0 24 24'
                                    >
                                      <path
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                        strokeWidth={2}
                                        d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z'
                                      />
                                    </svg>
                                    Copy Hash
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className='mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded'>
                                <p className='text-sm text-yellow-700'>
                                  🔍 Transaction hash not found in localStorage.
                                  This happens if:
                                </p>
                                <ul className='text-xs text-yellow-600 mt-2 ml-4 list-disc'>
                                  <li>
                                    You voted from a different browser/device
                                  </li>
                                  <li>Browser data was cleared</li>
                                  <li>
                                    Vote was cast before this feature was added
                                  </li>
                                </ul>
                              </div>
                            )}

                            {/* Copy Status Notification */}
                            {copyStatus && (
                              <div className='mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-700'>
                                {copyStatus}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4'>
                            <div className='flex items-center mb-2'>
                              <svg
                                className='w-5 h-5 text-yellow-500 mr-2'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                              >
                                <path
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                  strokeWidth={2}
                                  d='M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z'
                                />
                              </svg>
                              <span className='font-semibold text-yellow-700'>
                                You haven't voted yet
                              </span>
                            </div>
                            <p className='text-yellow-600'>
                              Head to the voting page to cast your vote.
                            </p>
                            <Link
                              href='/'
                              className='mt-3 inline-block px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors'
                            >
                              Go to Voting Page
                            </Link>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
