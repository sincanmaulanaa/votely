'use client';
import { useEffect, useState } from 'react';
import { getEVotingContract } from '@/utils/contract';
import Link from 'next/link';

interface Candidate {
  name: string;
  voteCount: bigint;
}

export default function ResultPage() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [totalVotes, setTotalVotes] = useState<number>(0);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const loadResults = async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const contract = await getEVotingContract();
      const count = await contract.getCandidateCount();
      const result = [];
      let voteTotal = 0;

      for (let i = 0; i < count; i++) {
        const [name, voteCount] = await contract.getCandidate(i);
        result.push({ name, voteCount });
        voteTotal += Number(voteCount);
      }

      setCandidates(result);
      setTotalVotes(voteTotal);
    } catch (err) {
      console.error('Failed to load results:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadResults();
  }, []);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadResults(true);
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Calculate the highest vote count and sort candidates
  const sortedCandidates = [...candidates].sort(
    (a, b) => Number(b.voteCount) - Number(a.voteCount)
  );
  const maxVotes =
    sortedCandidates.length > 0 ? Number(sortedCandidates[0].voteCount) : 0;

  // Get podium positions
  const getPosition = (index: number) => {
    if (index === 0)
      return {
        emoji: '🥇',
        text: 'Peringkat 1',
        color: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      };
    if (index === 1)
      return {
        emoji: '🥈',
        text: 'Peringkat 2',
        color: 'text-gray-600 bg-gray-50 border-gray-200',
      };
    if (index === 2)
      return {
        emoji: '🥉',
        text: 'Peringkat 3',
        color: 'text-amber-600 bg-amber-50 border-amber-200',
      };
    return {
      emoji: '📊',
      text: `Peringkat ${index + 1}`,
      color: 'text-blue-600 bg-blue-50 border-blue-200',
    };
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
                    d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
                  />
                </svg>
              </div>
              <h1 className='text-xl font-bold text-gray-900'>Hasil Votely</h1>
            </div>

            <div className='flex items-center space-x-4'>
              {/* Live Stats */}
              <div className='hidden md:flex items-center space-x-4 text-sm text-gray-600'>
                <div className='flex items-center space-x-1'>
                  <span className='w-2 h-2 bg-green-400 rounded-full animate-pulse'></span>
                  <span>{totalVotes} total suara</span>
                </div>
                <div className='flex items-center space-x-1'>
                  <span className='w-2 h-2 bg-blue-400 rounded-full'></span>
                  <span>{candidates.length} kandidat</span>
                </div>
              </div>

              {/* Refresh Button */}
              <button
                onClick={() => loadResults(true)}
                disabled={refreshing}
                className='inline-flex items-center px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors duration-200'
              >
                <svg
                  className={`w-4 h-4 mr-1 ${refreshing ? 'animate-spin' : ''}`}
                  fill='none'
                  stroke='currentColor'
                  viewBox='0 0 24 24'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                  />
                </svg>
                {refreshing ? 'Memperbarui...' : 'Perbarui'}
              </button>

              {/* Navigation Links */}
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
                  href='/details'
                  className='inline-flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors duration-200'
                >
                  Detail
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
        </div>
      </nav>

      {/* Main Content */}
      <div className='max-w-6xl mx-auto px-4 py-8'>
        {/* Header Section */}
        <div className='text-center mb-10'>
          <div className='inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl mb-6 shadow-lg transform rotate-3'>
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
                d='M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
              />
            </svg>
          </div>
          <h1 className='text-4xl font-bold text-gray-900 mb-4'>
            Hasil Pemilihan
          </h1>
          <p className='text-xl text-gray-600 mb-2'>
            Hasil voting langsung dan peringkat kandidat
          </p>
          <p className='text-sm text-gray-500'>
            Hasil diperbarui otomatis setiap 30 detik
          </p>
        </div>

        {/* Results Overview Cards */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-8'>
          <div className='bg-white rounded-2xl shadow-lg border border-gray-100 p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600'>Total Suara</p>
                <p className='text-3xl font-bold text-indigo-600'>
                  {totalVotes}
                </p>
              </div>
              <div className='w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center'>
                <svg
                  className='w-6 h-6 text-indigo-600'
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
            </div>
          </div>

          <div className='bg-white rounded-2xl shadow-lg border border-gray-100 p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600'>Kandidat</p>
                <p className='text-3xl font-bold text-purple-600'>
                  {candidates.length}
                </p>
              </div>
              <div className='w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center'>
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
                    d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z'
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className='bg-white rounded-2xl shadow-lg border border-gray-100 p-6'>
            <div className='flex items-center justify-between'>
              <div>
                <p className='text-sm font-medium text-gray-600'>
                  Kandidat Terdepan
                </p>
                <p className='text-lg font-bold text-green-600'>
                  {sortedCandidates[0]?.name || 'Belum ada suara'}
                </p>
              </div>
              <div className='w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center'>
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
                    d='M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z'
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Results Table */}
        <div className='bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden'>
          <div className='p-8'>
            <div className='flex items-center justify-between mb-8'>
              <h2 className='text-2xl font-bold text-gray-900'>
                Peringkat Kandidat
              </h2>
              {refreshing && (
                <div className='flex items-center space-x-2 text-sm text-blue-600'>
                  <div className='w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin'></div>
                  <span>Memperbarui hasil...</span>
                </div>
              )}
            </div>

            {loading ? (
              <div className='flex justify-center items-center py-16'>
                <div className='text-center'>
                  <div className='w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4'></div>
                  <p className='text-gray-600'>Memuat hasil pemilihan...</p>
                </div>
              </div>
            ) : totalVotes === 0 ? (
              <div className='text-center py-16'>
                <div className='w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4'>
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
                      d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4'
                    />
                  </svg>
                </div>
                <h3 className='text-xl font-semibold text-gray-700 mb-2'>
                  Belum ada suara yang diberikan
                </h3>
                <p className='text-gray-500'>
                  Jadilah yang pertama memberikan suara dalam pemilihan ini!
                </p>
                <Link
                  href='/'
                  className='inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-xl hover:from-indigo-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl mt-6'
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
                  Berikan Suara Anda
                </Link>
              </div>
            ) : (
              <div className='space-y-4'>
                {sortedCandidates.map((candidate, index) => {
                  const voteCount = Number(candidate.voteCount);
                  const percentage =
                    totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
                  const position = getPosition(index);

                  return (
                    <div
                      key={index}
                      className={`relative bg-gradient-to-r ${
                        index === 0
                          ? 'from-yellow-50 to-amber-50 border-yellow-200'
                          : index === 1
                          ? 'from-gray-50 to-slate-50 border-gray-200'
                          : index === 2
                          ? 'from-orange-50 to-amber-50 border-orange-200'
                          : 'from-blue-50 to-indigo-50 border-blue-200'
                      } border-2 rounded-2xl p-6 transition-all duration-300 hover:shadow-lg`}
                    >
                      <div className='flex items-center justify-between mb-4'>
                        <div className='flex items-center space-x-4'>
                          <div
                            className={`px-3 py-1 rounded-full text-sm font-medium border ${position.color}`}
                          >
                            <span className='mr-1'>{position.emoji}</span>
                            {position.text}
                          </div>
                          <h3 className='text-xl font-bold text-gray-900'>
                            {candidate.name}
                          </h3>
                        </div>
                        <div className='text-right'>
                          <div className='text-2xl font-bold text-indigo-600'>
                            {voteCount}
                          </div>
                          <div className='text-sm text-gray-500'>
                            {percentage.toFixed(1)}% dari suara
                          </div>
                        </div>
                      </div>

                      {/* Enhanced Progress Bar */}
                      <div className='relative'>
                        <div className='w-full bg-gray-200 rounded-full h-4 overflow-hidden'>
                          <div
                            className={`h-full rounded-full transition-all duration-1000 ease-out ${
                              index === 0
                                ? 'bg-gradient-to-r from-yellow-400 to-amber-500'
                                : index === 1
                                ? 'bg-gradient-to-r from-gray-400 to-slate-500'
                                : index === 2
                                ? 'bg-gradient-to-r from-orange-400 to-amber-500'
                                : 'bg-gradient-to-r from-blue-400 to-indigo-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          >
                            <div className='h-full bg-white/20 animate-pulse'></div>
                          </div>
                        </div>
                        {percentage > 0 && (
                          <div
                            className='absolute top-0 h-4 flex items-center'
                            style={{ left: `${Math.min(percentage - 5, 90)}%` }}
                          >
                            <span className='text-xs font-semibold text-white bg-black/30 px-2 py-1 rounded-full'>
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
