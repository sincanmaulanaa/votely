'use client';
import { useEffect, useState, useCallback } from 'react';
import { getEVotingContract } from '@/utils/contract';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';

export default function VotePage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<string[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [status, setStatus] = useState<string>('');
  const [isVoting, setIsVoting] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [currentAccount, setCurrentAccount] = useState<string>('');
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [contractStats, setContractStats] = useState<{
    totalVotes: number;
    totalCandidates: number;
    isActive: boolean;
  }>({ totalVotes: 0, totalCandidates: 0, isActive: true });
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  // Connect wallet function
  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        setStatus('❌ Please install MetaMask to continue');
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();

      setCurrentAccount(address);
      setIsConnected(true);
      setStatus('✅ Wallet connected successfully');
      setTimeout(() => setStatus(''), 3000);
    } catch (error) {
      console.error('Wallet connection failed:', error);
      setStatus('❌ Failed to connect wallet');
    }
  };

  // Check wallet connection
  const checkWalletConnection = useCallback(async () => {
    try {
      if (!window.ethereum) return;

      const accounts = await window.ethereum.request({
        method: 'eth_accounts',
      });
      if (accounts.length > 0) {
        setCurrentAccount(accounts[0]);
        setIsConnected(true);
      }
    } catch (error) {
      console.error('Check wallet connection failed:', error);
    }
  }, []);

  // Load contract statistics
  const loadContractStats = async () => {
    try {
      const contract = await getEVotingContract();
      const totalVotes = await contract.totalVotes();
      const totalCandidates = await contract.getCandidateCount();

      setContractStats({
        totalVotes: Number(totalVotes),
        totalCandidates: Number(totalCandidates),
        isActive: true,
      });
    } catch (error) {
      console.error('Failed to load contract stats:', error);
    }
  };

  const loadCandidates = async () => {
    try {
      const contract = await getEVotingContract();
      const count = await contract.getCandidateCount();
      const names: string[] = [];

      console.log('Loading candidates from contract...');
      console.log('Total candidates:', count.toString());

      for (let i = 0; i < count; i++) {
        const [name] = await contract.getCandidate(i);
        names.push(name);
        console.log(`Candidate ${i + 1}: ${name}`);
      }

      setCandidates(names);
      console.log('✅ Candidates loaded successfully:', names);
    } catch (error) {
      setStatus(
        '❌ Error loading candidates. Please check contract connection.'
      );
      console.error('Error loading candidates:', error);
    }
  };

  // Update the vote function in src/app/page.tsx
  const vote = async () => {
    try {
      if (selected === null) return;
      setIsVoting(true);
      const contract = await getEVotingContract();

      // Get transaction and display pending details
      const tx = await contract.vote(selected);
      setStatus(
        `🗳️ Processing your vote... (Tx: ${tx.hash.substring(0, 8)}...)`
      );

      // Wait for transaction to be mined
      const receipt = await tx.wait();

      // Display successful transaction details
      setStatus(`✅ Vote successful! (Block: ${receipt.blockNumber})`);

      // Save transaction details to localStorage for reference
      const txDetails = {
        hash: tx.hash,
        blockNumber: receipt.blockNumber,
        timestamp: Date.now(),
        candidateIndex: selected,
        candidateName: candidates[selected],
      };
      console.log('Saving transaction details to localStorage:', txDetails); // Debug log
      localStorage.setItem('lastVoteTransaction', JSON.stringify(txDetails));

      setTimeout(() => {
        router.push('/details?tab=myVote');
      }, 2000);
    } catch (error: any) {
      const message = error.message || '';

      if (message.includes('Already voted')) {
        setStatus('❗ You have already voted.');
      } else {
        setStatus(`❌ Vote failed. ${error.message.split('.')[0]}`);
      }

      console.error('Vote error:', error);
    } finally {
      setIsVoting(false);
    }
  };

  useEffect(() => {
    const checkVoted = async () => {
      try {
        if (!isConnected || !currentAccount) return;

        const contract = await getEVotingContract();
        const voted = await contract.hasVoted(currentAccount);

        setHasVoted(voted);
        if (voted) {
          setStatus('✅ You have already voted in this election.');
        }
      } catch (err) {
        console.warn('Check vote status failed', err);
      }
    };

    checkWalletConnection();
    loadCandidates();
    loadContractStats();

    if (isConnected) {
      checkVoted();
    }
  }, [isConnected, currentAccount, checkWalletConnection]);

  // Auto-refresh stats every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (isConnected) {
        loadContractStats();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [isConnected]);

  const getStatusColor = () => {
    if (status.includes('✅'))
      return 'text-green-600 bg-green-50 border-green-200';
    if (status.includes('❗'))
      return 'text-orange-600 bg-orange-50 border-orange-200';
    if (status.includes('❌')) return 'text-red-600 bg-red-50 border-red-200';
    if (status.includes('🗳️'))
      return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

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
                    d='M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z'
                  />
                </svg>
              </div>
              <h1 className='text-xl font-bold text-gray-900'>Votely</h1>
            </div>

            <div className='flex items-center space-x-4'>
              {/* Stats Display */}
              <div className='hidden md:flex items-center space-x-4 text-sm text-gray-600'>
                <div className='flex items-center space-x-1'>
                  <span className='w-2 h-2 bg-green-400 rounded-full'></span>
                  <span>{contractStats.totalVotes} suara terkumpul</span>
                </div>
                <div className='flex items-center space-x-1'>
                  <span className='w-2 h-2 bg-blue-400 rounded-full'></span>
                  <span>{contractStats.totalCandidates} kandidat</span>
                </div>
              </div>

              {/* Wallet Connection */}
              {!isConnected ? (
                <button
                  onClick={connectWallet}
                  className='inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-medium rounded-lg hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-md hover:shadow-lg'
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
                      d='M13 10V3L4 14h7v7l9-11h-7z'
                    />
                  </svg>
                  Hubungkan Dompet
                </button>
              ) : (
                <div className='flex items-center space-x-2'>
                  <div className='px-3 py-2 bg-green-50 border border-green-200 rounded-lg'>
                    <div className='flex items-center space-x-2'>
                      <div className='w-2 h-2 bg-green-400 rounded-full animate-pulse'></div>
                      <span className='text-sm font-medium text-green-700'>
                        {currentAccount.substring(0, 6)}...
                        {currentAccount.substring(currentAccount.length - 4)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className='max-w-4xl mx-auto px-4 py-8'>
        {!isConnected ? (
          // Wallet Connection Screen
          <div className='text-center py-16'>
            <div className='mb-8'>
              <div className='w-24 h-24 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl mx-auto mb-6 flex items-center justify-center transform rotate-3'>
                <svg
                  className='w-12 h-12 text-white'
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
                  />
                </svg>
              </div>
              <h2 className='text-3xl font-bold text-gray-900 mb-4'>
                Pemungutan Suara Blockchain yang Aman
              </h2>
              <p className='text-lg text-gray-600 max-w-2xl mx-auto mb-8'>
                Hubungkan dompet Anda untuk berpartisipasi dalam pemilihan yang
                transparan dan anti-manipulasi yang didukung teknologi
                blockchain.
              </p>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 max-w-3xl mx-auto'>
              <div className='bg-white p-6 rounded-2xl shadow-sm border border-gray-100'>
                <div className='w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4'>
                  <svg
                    className='w-6 h-6 text-blue-600'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z'
                    />
                  </svg>
                </div>
                <h3 className='font-semibold text-gray-900 mb-2'>
                  Aman & Anonim
                </h3>
                <p className='text-sm text-gray-600'>
                  Suara Anda dienkripsi dan anonim, memastikan privasi sambil
                  menjaga transparansi.
                </p>
              </div>

              <div className='bg-white p-6 rounded-2xl shadow-sm border border-gray-100'>
                <div className='w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4'>
                  <svg
                    className='w-6 h-6 text-green-600'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M13 10V3L4 14h7v7l9-11h-7z'
                    />
                  </svg>
                </div>
                <h3 className='font-semibold text-gray-900 mb-2'>
                  Hasil Instan
                </h3>
                <p className='text-sm text-gray-600'>
                  Penghitungan suara real-time dengan pembaruan hasil langsung
                  di blockchain.
                </p>
              </div>

              <div className='bg-white p-6 rounded-2xl shadow-sm border border-gray-100'>
                <div className='w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4'>
                  <svg
                    className='w-6 h-6 text-purple-600'
                    fill='none'
                    stroke='currentColor'
                    viewBox='0 0 24 24'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2'
                    />
                  </svg>
                </div>
                <h3 className='font-semibold text-gray-900 mb-2'>
                  Rekaman Tidak Dapat Diubah
                </h3>
                <p className='text-sm text-gray-600'>
                  Semua suara tercatat permanen di blockchain dan tidak dapat
                  diubah.
                </p>
              </div>
            </div>

            <button
              onClick={connectWallet}
              className='inline-flex items-center px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-2xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]'
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
                  d='M13 10V3L4 14h7v7l9-11h-7z'
                />
              </svg>
              Hubungkan Dompet untuk Memilih
            </button>
          </div>
        ) : (
          // Voting Interface
          <div className='space-y-8'>
            {/* Election Header */}
            <div className='text-center'>
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
                    d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4'
                  />
                </svg>
              </div>
              <h1 className='text-4xl font-bold text-gray-900 mb-4'>
                Berikan Suara Anda
              </h1>
              <p className='text-xl text-gray-600 mb-2'>
                Pilih kandidat pilihan Anda di bawah ini
              </p>
              <p className='text-sm text-gray-500'>
                Suara Anda aman, anonim, dan tidak dapat diubah
              </p>
            </div>

            {/* Voting Status Alert */}
            {hasVoted && (
              <div className='bg-amber-50 border border-amber-200 rounded-2xl p-6'>
                <div className='flex items-center space-x-3'>
                  <div className='w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center'>
                    <svg
                      className='w-6 h-6 text-amber-600'
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
                    <h3 className='text-lg font-semibold text-amber-800'>
                      Anda Sudah Memberikan Suara
                    </h3>
                    <p className='text-amber-700'>
                      Terima kasih atas partisipasi Anda! Anda dapat melihat
                      hasil atau detail transaksi.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Candidates Grid */}
            <div className='bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden'>
              <div className='p-8'>
                <div className='flex items-center justify-between mb-8'>
                  <h2 className='text-2xl font-bold text-gray-900 flex items-center'>
                    <span className='w-3 h-3 bg-indigo-500 rounded-full mr-3'></span>
                    Pilih Kandidat Anda
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
                        d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
                      />
                    </svg>
                    <span>{candidates.length} kandidat tersedia</span>
                  </div>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  {candidates.map((name, index) => (
                    <label
                      key={index}
                      className={`group relative cursor-pointer`}
                    >
                      <input
                        type='radio'
                        name='candidate'
                        value={index}
                        onChange={() => setSelected(index)}
                        className='sr-only'
                        disabled={hasVoted}
                      />

                      <div
                        className={`
                        relative p-6 rounded-2xl border-2 transition-all duration-300 hover:shadow-lg
                        ${
                          selected === index
                            ? 'border-indigo-500 bg-gradient-to-br from-indigo-50 to-purple-50 shadow-lg ring-1 ring-indigo-200'
                            : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                        }
                        ${hasVoted ? 'opacity-60 cursor-not-allowed' : ''}
                      `}
                      >
                        {/* Selection Indicator */}
                        <div
                          className={`
                          absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200
                          ${
                            selected === index
                              ? 'border-indigo-500 bg-indigo-500'
                              : 'border-gray-300 group-hover:border-gray-400'
                          }
                        `}
                        >
                          {selected === index && (
                            <div className='w-2.5 h-2.5 bg-white rounded-full animate-scale-in'></div>
                          )}
                        </div>

                        {/* Candidate Avatar */}
                        <div
                          className={`
                          w-16 h-16 rounded-2xl mb-4 flex items-center justify-center text-2xl font-bold text-white transition-all duration-200
                          ${
                            selected === index
                              ? 'bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg'
                              : 'bg-gradient-to-br from-gray-400 to-gray-500'
                          }
                        `}
                        >
                          {name.charAt(0).toUpperCase()}
                        </div>

                        {/* Candidate Info */}
                        <div>
                          <h3
                            className={`
                            text-xl font-bold mb-2 transition-colors duration-200
                            ${
                              selected === index
                                ? 'text-indigo-900'
                                : 'text-gray-900'
                            }
                          `}
                          >
                            {name}
                          </h3>
                          <p className='text-sm text-gray-600 mb-3'>
                            Kandidat #{index + 1}
                          </p>

                          {/* Selection Badge */}
                          {selected === index && (
                            <div className='inline-flex items-center px-3 py-1 bg-indigo-100 text-indigo-700 text-sm font-medium rounded-full'>
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
                                  d='M5 13l4 4L19 7'
                                />
                              </svg>
                              Dipilih
                            </div>
                          )}
                        </div>

                        {/* Hover Effect */}
                        {selected === index && (
                          <div className='absolute inset-0 rounded-2xl bg-gradient-to-br from-indigo-500/5 to-purple-500/5 animate-pulse'></div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Status Message */}
              {status && (
                <div className='px-8 pb-4'>
                  <div
                    className={`
                    p-4 rounded-2xl border text-sm font-medium text-center animate-fade-in
                    ${getStatusColor()}
                  `}
                  >
                    {status}
                  </div>
                </div>
              )}

              {/* Action Section */}
              <div className='p-8 border-t border-gray-100 bg-gray-50/50'>
                {!hasVoted ? (
                  <div className='space-y-4'>
                    {/* Vote Button */}
                    <button
                      onClick={() => setShowConfirmModal(true)}
                      disabled={selected === null || isVoting}
                      className={`
                        w-full py-4 px-6 rounded-2xl font-bold text-lg transition-all duration-300 transform
                        ${
                          selected !== null && !isVoting
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 hover:scale-[1.02] shadow-lg hover:shadow-xl'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        }
                      `}
                    >
                      {isVoting ? (
                        <span className='flex items-center justify-center'>
                          <svg
                            className='animate-spin -ml-1 mr-3 h-6 w-6'
                            fill='none'
                            viewBox='0 0 24 24'
                          >
                            <circle
                              className='opacity-25'
                              cx='12'
                              cy='12'
                              r='10'
                              stroke='currentColor'
                              strokeWidth='4'
                            ></circle>
                            <path
                              className='opacity-75'
                              fill='currentColor'
                              d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                            ></path>
                          </svg>
                          Memproses Suara...
                        </span>
                      ) : selected === null ? (
                        'Pilih Kandidat untuk Melanjutkan'
                      ) : (
                        `Pilih ${candidates[selected]}`
                      )}
                    </button>

                    {/* Security Notice */}
                    <div className='flex items-center justify-center space-x-2 text-sm text-gray-500'>
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
                          d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z'
                        />
                      </svg>
                      <span>
                        Suara Anda dienkripsi dan disimpan dengan aman di
                        blockchain
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className='text-center space-y-4'>
                    <div className='inline-flex items-center px-6 py-3 bg-green-100 text-green-700 text-lg font-semibold rounded-2xl'>
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
                          d='M5 13l4 4L19 7'
                        />
                      </svg>
                      Suara Berhasil Tercatat
                    </div>
                    <p className='text-gray-600'>
                      Terima kasih telah berpartisipasi dalam pemilihan ini!
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className='flex flex-col sm:flex-row gap-4 justify-center'>
              <button
                onClick={() => router.push('/result')}
                className='inline-flex items-center justify-center px-6 py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md'
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
                    d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
                  />
                </svg>
                Lihat Hasil Langsung
              </button>

              <button
                onClick={() => router.push('/details')}
                className='inline-flex items-center justify-center px-6 py-3 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm hover:shadow-md'
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
                    d='M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
                  />
                </svg>
                Detail Transaksi
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className='fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50'>
          <div className='bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 transform animate-scale-in'>
            <div className='text-center'>
              <div className='w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full mx-auto mb-6 flex items-center justify-center'>
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
                    d='M5 13l4 4L19 7'
                  />
                </svg>
              </div>

              <h3 className='text-2xl font-bold text-gray-900 mb-4'>
                Konfirmasi Suara Anda
              </h3>
              <p className='text-gray-600 mb-2'>
                Anda akan memberikan suara untuk:
              </p>
              <p className='text-xl font-bold text-indigo-600 mb-6'>
                {selected !== null ? candidates[selected] || '' : ''}
              </p>

              <div className='bg-yellow-50 border border-yellow-200 rounded-2xl p-4 mb-6'>
                <div className='flex items-start space-x-3'>
                  <svg
                    className='w-5 h-5 text-yellow-600 mt-0.5'
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
                  <div className='text-left'>
                    <p className='text-sm font-medium text-yellow-800'>
                      Pemberitahuan Penting
                    </p>
                    <p className='text-sm text-yellow-700'>
                      Tindakan ini tidak dapat dibatalkan. Setelah dikirim,
                      suara Anda tidak dapat diubah.
                    </p>
                  </div>
                </div>
              </div>

              <div className='flex space-x-3'>
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className='flex-1 px-4 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors duration-200'
                >
                  Batal
                </button>
                <button
                  onClick={() => {
                    setShowConfirmModal(false);
                    vote();
                  }}
                  className='flex-1 px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-200'
                >
                  Konfirmasi Suara
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes scale-in {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-scale-in {
          animation: scale-in 0.2s ease-out;
        }

        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
