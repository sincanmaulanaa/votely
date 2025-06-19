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

  const loadResults = async () => {
    setLoading(true);
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
    }
  };

  useEffect(() => {
    loadResults();
  }, []);

  // Calculate the highest vote count
  const maxVotes =
    candidates.length > 0
      ? Number(
          candidates.reduce(
            (max, c) => (Number(c.voteCount) > Number(max) ? c.voteCount : max),
            candidates[0].voteCount
          )
        )
      : 0;

  return (
    <div className='min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center px-4 py-12'>
      <div className='max-w-4xl w-full space-y-8'>
        <div className='text-center'>
          <h1 className='text-3xl font-bold text-gray-900 mb-2'>
            Voting Results
          </h1>
          <p className='text-gray-600 mb-6'>
            Current standing of all candidates
          </p>

          {/* Navigation */}
          <div className='flex justify-center space-x-4 mb-8'>
            <Link
              href='/'
              className='text-indigo-600 hover:text-indigo-800 font-medium'
            >
              ← Back to Voting
            </Link>
            <Link
              href='/details'
              className='text-indigo-600 hover:text-indigo-800 font-medium'
            >
              View System Details →
            </Link>
          </div>
        </div>

        <div className='bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden'>
          <div className='p-8'>
            <div className='flex justify-between items-center mb-6'>
              <h2 className='text-xl font-semibold text-gray-800'>
                Candidate Results
              </h2>
              <div className='text-sm text-gray-500'>
                Total Votes:{' '}
                <span className='font-semibold text-indigo-600'>
                  {totalVotes}
                </span>
              </div>
            </div>

            {loading ? (
              <div className='flex justify-center py-10'>
                <div className='animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-500'></div>
              </div>
            ) : (
              <div className='space-y-6'>
                {candidates.map((c, i) => {
                  const voteCount = Number(c.voteCount);
                  const percentage =
                    totalVotes > 0 ? (voteCount / totalVotes) * 100 : 0;
                  const isLeading = voteCount === maxVotes && voteCount > 0;

                  return (
                    <div key={i} className='space-y-2'>
                      <div className='flex justify-between items-baseline'>
                        <div className='flex items-center'>
                          <span className='font-medium text-gray-800'>
                            {c.name}
                          </span>
                          {isLeading && (
                            <span className='ml-2 px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full'>
                              Leading
                            </span>
                          )}
                        </div>
                        <div className='text-right'>
                          <span className='font-semibold text-indigo-600'>
                            {voteCount.toString()}
                          </span>
                          <span className='text-gray-500 text-sm ml-1'>
                            ({percentage.toFixed(1)}%)
                          </span>
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div className='w-full bg-gray-100 rounded-full h-3 overflow-hidden'>
                        <div
                          className={`h-full rounded-full ${
                            isLeading ? 'bg-green-500' : 'bg-indigo-500'
                          }`}
                          style={{
                            width: `${percentage}%`,
                            transition: 'width 1s ease-in-out',
                          }}
                        ></div>
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
