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
      setCopyStatus(`${type} disalin!`);
      setTimeout(() => setCopyStatus(''), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
      setCopyStatus('Gagal menyalin');
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
    <div className='min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100'>
      {/* Top Navigation */}
      <nav className='bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center h-16'>
            <div className='flex items-center space-x-3'>
              <div className='w-8 h-8 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center'>
                <svg
                  className='w-5 h-5 text-white'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                  />
                </svg>
              </div>
              <h1 className='text-xl font-bold text-gray-900'>Detail Sistem</h1>
            </div>

            <div className='flex items-center space-x-2'>
              <Link
                href='/'
                className='inline-flex items-center px-3 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors duration-200'
              >
                <svg
                  className='w-4 h-4 mr-1'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M10 19l-7-7m0 0l7-7m-7 7h18'
                  />
                </svg>
                Suara
              </Link>
              <Link
                href='/result'
                className='inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-200'
              >
                Hasil
                <svg
                  className='w-4 h-4 ml-1'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 5l7 7-7 7'
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className='max-w-7xl mx-auto px-4 py-8'>
        {/* Header Section */}
        <div className='text-center mb-10'>
          <div className='inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl mb-6 shadow-lg transform -rotate-3'>
            <svg
              className='w-8 h-8 text-white'
              fill='none'
              stroke='currentColor'
              viewBox='0 0 24 24'
            >
              <path
                strokeLinecap='round'
                strokeLinejoin='round'
                strokeWidth={2}
                d='M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
              />
            </svg>
          </div>
          <h1 className='text-4xl font-bold text-gray-900 mb-4'>
            Detail Sistem Voting
          </h1>
          <p className='text-xl text-gray-600 mb-2'>
            Jelajahi transparansi blockchain dan riwayat transaksi
          </p>
          <p className='text-sm text-gray-500'>
            Semua data disimpan secara permanen di blockchain
          </p>
        </div>

        {/* Tab Navigation */}
        <div className='bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden mb-8'>
          <div className='flex border-b border-gray-200'>
            <button
              onClick={() => setTab('transactions')}
              className={`flex-1 py-6 px-8 text-center font-semibold transition-all duration-200 ${
                tab === 'transactions'
                  ? 'text-indigo-600 bg-indigo-50 border-b-3 border-indigo-500'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className='flex items-center justify-center space-x-2'>
                <svg
                  className='w-5 h-5'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01'
                  />
                </svg>
                <span>Riwayat Transaksi</span>
              </div>
            </button>
            <button
              onClick={() => setTab('system')}
              className={`flex-1 py-6 px-8 text-center font-semibold transition-all duration-200 ${
                tab === 'system'
                  ? 'text-indigo-600 bg-indigo-50 border-b-3 border-indigo-500'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className='flex items-center justify-center space-x-2'>
                <svg
                  className='w-5 h-5'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
                  />
                </svg>
                <span>Statistik Sistem</span>
              </div>
            </button>
            <button
              onClick={() => setTab('myVote')}
              className={`flex-1 py-6 px-8 text-center font-semibold transition-all duration-200 ${
                tab === 'myVote'
                  ? 'text-indigo-600 bg-indigo-50 border-b-3 border-indigo-500'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <div className='flex items-center justify-center space-x-2'>
                <svg
                  className='w-5 h-5'
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
                <span>Suara Saya</span>
              </div>
            </button>
          </div>

          {/* Tab Content */}
          <div className='p-8'>
            {loading ? (
              <div className='flex justify-center items-center py-16'>
                <div className='text-center'>
                  <div className='w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4'></div>
                  <p className='text-gray-600 text-lg'>
                    Memuat data blockchain...
                  </p>
                  <p className='text-gray-500 text-sm mt-2'>
                    Ini mungkin memerlukan beberapa saat
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* Transaction History Tab */}
                {tab === 'transactions' && (
                  <div>
                    <div className='flex items-center justify-between mb-8'>
                      <h2 className='text-2xl font-bold text-gray-900'>
                        Riwayat Transaksi Suara
                      </h2>
                      <div className='flex items-center space-x-2 text-sm text-gray-500'>
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
                            d='M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                          />
                        </svg>
                        <span>{voteRecords.length} transaksi tercatat</span>
                      </div>
                    </div>

                    {voteRecords.length === 0 ? (
                      <div className='text-center py-16'>
                        <div className='w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6'>
                          <svg
                            className='w-12 h-12 text-gray-400'
                            fill='none'
                            stroke='currentColor'
                            viewBox='0 0 24 24'
                          >
                            <path
                              strokeLinecap='round'
                              strokeLinejoin='round'
                              strokeWidth={2}
                              d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01'
                            />
                          </svg>
                        </div>
                        <h3 className='text-xl font-semibold text-gray-700 mb-2'>
                          Belum ada transaksi
                        </h3>
                        <p className='text-gray-500'>
                          Transaksi voting akan muncul di sini setelah diberikan
                        </p>
                      </div>
                    ) : (
                      <div className='bg-white border border-gray-200 rounded-2xl overflow-hidden'>
                        <div className='overflow-x-auto'>
                          <table className='min-w-full divide-y divide-gray-200'>
                            <thead className='bg-gradient-to-r from-gray-50 to-gray-100'>
                              <tr>
                                <th className='px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider'>
                                  Alamat Pemilih
                                </th>
                                <th className='px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider'>
                                  Kandidat
                                </th>
                                <th className='px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider'>
                                  Waktu
                                </th>
                                <th className='px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider'>
                                  Hash Transaksi
                                </th>
                              </tr>
                            </thead>
                            <tbody className='bg-white divide-y divide-gray-200'>
                              {voteRecords.map((record, index) => (
                                <tr
                                  key={index}
                                  className='hover:bg-gray-50 transition-colors duration-200'
                                >
                                  <td className='px-6 py-4 whitespace-nowrap text-sm text-gray-700'>
                                    <div className='flex items-center space-x-2'>
                                      <div className='w-8 h-8 bg-gradient-to-r from-indigo-400 to-purple-500 rounded-full flex items-center justify-center text-white text-xs font-bold'>
                                        {record.voter
                                          .substring(2, 4)
                                          .toUpperCase()}
                                      </div>
                                      <span className='font-mono'>
                                        {formatAddress(record.voter)}
                                      </span>
                                    </div>
                                  </td>
                                  <td className='px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600'>
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
                      </div>
                    )}
                  </div>
                )}

                {/* System Statistics Tab */}
                {tab === 'system' && systemStats && (
                  <div>
                    <h2 className='text-2xl font-bold text-gray-900 mb-8'>
                      Statistik & Informasi Sistem
                    </h2>

                    <div className='grid grid-cols-1 lg:grid-cols-2 gap-8'>
                      {/* Voting Statistics */}
                      <div className='bg-gradient-to-br from-indigo-50 to-blue-100 rounded-3xl p-8 border border-indigo-200'>
                        <div className='flex items-center space-x-3 mb-6'>
                          <div className='w-12 h-12 bg-indigo-500 rounded-xl flex items-center justify-center'>
                            <svg
                              className='w-6 h-6 text-white'
                              fill='none'
                              stroke='currentColor'
                              viewBox='0 0 24 24'
                            >
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
                              />
                            </svg>
                          </div>
                          <h3 className='text-xl font-bold text-gray-800'>
                            Statistik Voting
                          </h3>
                        </div>
                        <div className='space-y-4'>
                          <div className='flex justify-between items-center py-3 border-b border-indigo-200'>
                            <span className='text-gray-700 font-medium'>
                              Total Kandidat:
                            </span>
                            <span className='text-2xl font-bold text-indigo-600'>
                              {systemStats.totalCandidates}
                            </span>
                          </div>
                          <div className='flex justify-between items-center py-3 border-b border-indigo-200'>
                            <span className='text-gray-700 font-medium'>
                              Total Suara Diberikan:
                            </span>
                            <span className='text-2xl font-bold text-indigo-600'>
                              {systemStats.totalVotes}
                            </span>
                          </div>
                          <div className='flex justify-between items-center py-3'>
                            <span className='text-gray-700 font-medium'>
                              Tingkat Partisipasi:
                            </span>
                            <span className='text-2xl font-bold text-indigo-600'>
                              {voteRecords.length > 0
                                ? `${(
                                    (systemStats.totalVotes /
                                      voteRecords.length) *
                                    100
                                  ).toFixed(1)}%`
                                : '0%'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Contract Information */}
                      <div className='bg-gradient-to-br from-purple-50 to-pink-100 rounded-3xl p-8 border border-purple-200'>
                        <div className='flex items-center space-x-3 mb-6'>
                          <div className='w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center'>
                            <svg
                              className='w-6 h-6 text-white'
                              fill='none'
                              stroke='currentColor'
                              viewBox='0 0 24 24'
                            >
                              <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                              />
                            </svg>
                          </div>
                          <h3 className='text-xl font-bold text-gray-800'>
                            Informasi Kontrak
                          </h3>
                        </div>
                        <div className='space-y-4'>
                          <div className='py-3 border-b border-purple-200'>
                            <span className='text-gray-700 font-medium block mb-2'>
                              Pemilik Kontrak:
                            </span>
                            <div className='flex items-center space-x-2'>
                              <div className='w-8 h-8 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-bold'>
                                {systemStats.contractOwner
                                  .substring(2, 4)
                                  .toUpperCase()}
                              </div>
                              <span className='font-mono text-sm text-gray-600'>
                                {formatAddress(systemStats.contractOwner)}
                              </span>
                            </div>
                          </div>
                          <div className='flex justify-between items-center py-3 border-b border-purple-200'>
                            <span className='text-gray-700 font-medium'>
                              Dimulai Pada:
                            </span>
                            <span className='font-medium text-gray-800'>
                              {formatDate(systemStats.startTime)}
                            </span>
                          </div>
                          <div className='flex justify-between items-center py-3'>
                            <span className='text-gray-700 font-medium'>
                              Durasi Berjalan:
                            </span>
                            <span className='font-bold text-purple-600'>
                              {Math.floor(systemStats.duration / 86400)} hari
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* My Vote Tab */}
                {tab === 'myVote' && (
                  <div>
                    <h2 className='text-2xl font-bold text-gray-900 mb-8'>
                      Informasi Voting Anda
                    </h2>

                    <div className='max-w-2xl mx-auto'>
                      {/* Account Information */}
                      <div className='bg-white border border-gray-200 rounded-3xl p-8 shadow-sm mb-6'>
                        <div className='flex items-center space-x-4 mb-6'>
                          <div className='w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center'>
                            <svg
                              className='w-8 h-8 text-white'
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
                            <h3 className='text-xl font-bold text-gray-800'>
                              Akun Anda
                            </h3>
                            <p className='text-sm font-mono text-gray-600 bg-gray-100 px-3 py-1 rounded-lg mt-2'>
                              {currentAccount}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Voting Status */}
                      <div className='bg-white border border-gray-200 rounded-3xl p-8 shadow-sm'>
                        <h3 className='text-xl font-bold text-gray-800 mb-6'>
                          Status Voting
                        </h3>

                        {userVoteInfo?.voted ? (
                          <div className='bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6'>
                            <div className='flex items-center mb-4'>
                              <div className='w-12 h-12 bg-green-500 rounded-full flex items-center justify-center mr-4'>
                                <svg
                                  className='w-6 h-6 text-white'
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
                              </div>
                              <div>
                                <h4 className='text-xl font-bold text-green-700'>
                                  Suara Terkonfirmasi!
                                </h4>
                                <p className='text-green-600'>
                                  Suara Anda telah berhasil tercatat di
                                  blockchain
                                </p>
                              </div>
                            </div>

                            <div className='bg-white/50 rounded-xl p-4 mb-4'>
                              <div className='flex items-center justify-between mb-2'>
                                <span className='text-gray-700 font-medium'>
                                  Dipilih untuk:
                                </span>
                                <span className='text-lg font-bold text-green-700'>
                                  {userVoteInfo.candidateName}
                                </span>
                              </div>
                              <div className='flex items-center justify-between'>
                                <span className='text-gray-700 font-medium'>
                                  Indeks Kandidat:
                                </span>
                                <span className='font-mono text-gray-600'>
                                  {userVoteInfo.candidateIndex}
                                </span>
                              </div>
                            </div>

                            {/* Transaction Details */}
                            {userVoteInfo.txHash && (
                              <div className='border-t border-green-200 pt-4'>
                                <h5 className='font-semibold text-gray-800 mb-3'>
                                  Detail Transaksi
                                </h5>
                                <div className='space-y-3'>
                                  <div className='flex items-center justify-between'>
                                    <span className='text-gray-600'>
                                      Hash Transaksi:
                                    </span>
                                    <div className='flex items-center space-x-2'>
                                      <span className='font-mono text-sm bg-gray-100 px-2 py-1 rounded'>
                                        {formatAddress(userVoteInfo.txHash)}
                                      </span>
                                      <button
                                        onClick={() =>
                                          copyToClipboard(
                                            userVoteInfo.txHash!,
                                            'Hash transaksi'
                                          )
                                        }
                                        className='p-1 text-gray-500 hover:text-gray-700 transition-colors'
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
                                  </div>

                                  {userVoteInfo.blockNumber && (
                                    <div className='flex items-center justify-between'>
                                      <span className='text-gray-600'>
                                        Nomor Blok:
                                      </span>
                                      <div className='flex items-center space-x-2'>
                                        <span className='font-mono text-sm bg-gray-100 px-2 py-1 rounded'>
                                          {userVoteInfo.blockNumber}
                                        </span>
                                        <button
                                          onClick={() =>
                                            copyToClipboard(
                                              userVoteInfo.blockNumber!.toString(),
                                              'Nomor blok'
                                            )
                                          }
                                          className='p-1 text-gray-500 hover:text-gray-700 transition-colors'
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
                                    </div>
                                  )}
                                </div>

                                <a
                                  href={getEtherscanUrl(userVoteInfo.txHash)}
                                  target='_blank'
                                  rel='noopener noreferrer'
                                  className='inline-flex items-center mt-4 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 transition-colors duration-200'
                                >
                                  <svg
                                    className='w-4 h-4 mr-2'
                                    fill='none'
                                    stroke='currentColor'
                                    viewBox='0 0 24 24'
                                  >
                                    <path
                                      strokeLinecap='round'
                                      strokeLinejoin='round'
                                      strokeWidth={2}
                                      d='M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2M7 7l10 10M17 7v10'
                                    />
                                  </svg>
                                  Lihat di Etherscan
                                </a>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className='bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-2xl p-6'>
                            <div className='flex items-center mb-4'>
                              <div className='w-12 h-12 bg-yellow-500 rounded-full flex items-center justify-center mr-4'>
                                <svg
                                  className='w-6 h-6 text-white'
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
                              </div>
                              <div>
                                <h4 className='text-xl font-bold text-yellow-700'>
                                  Tidak Ada Suara Tercatat
                                </h4>
                                <p className='text-yellow-600'>
                                  Anda belum memberikan suara dalam pemilihan
                                  ini
                                </p>
                              </div>
                            </div>
                            <Link
                              href='/'
                              className='inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl'
                            >
                              <svg
                                className='w-5 h-5 mr-2'
                                fill='none'
                                stroke='currentColor'
                                viewBox='0 0 24 24'
                              >
                                <path
                                  strokeLinecap='round'
                                  strokeLinejoin='round'
                                  strokeWidth={2}
                                  d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4'
                                />
                              </svg>
                              Ke Halaman Voting
                            </Link>
                          </div>
                        )}

                        {/* Copy Status Notification */}
                        {copyStatus && (
                          <div className='mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm font-medium'>
                            {copyStatus}
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
