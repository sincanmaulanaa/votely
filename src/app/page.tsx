'use client';
import { useEffect, useState } from 'react';
import { getEVotingContract } from '@/utils/contract';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';

export default function VotePage() {
  const router = useRouter();
  const [candidates, setCandidates] = useState<string[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [status, setStatus] = useState<string>('');
  const [isVoting, setIsVoting] = useState<boolean>(false);

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
        const contract = await getEVotingContract();
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const user = await signer.getAddress();

        const voted = await contract.hasVoted(user);
        if (voted) {
          setStatus('✅ You have already voted.');
        }
      } catch (err) {
        console.warn('Check vote status failed', err);
      }
    };

    loadCandidates();
    checkVoted();
  }, []);

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
    <div className='min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center px-4 py-8'>
      <div className='w-full max-w-lg'>
        {/* Header Section */}
        <div className='text-center mb-8'>
          <div className='inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full mb-4 shadow-lg'>
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
          <h1 className='text-3xl font-bold text-gray-900 mb-2'>
            Cast Your Vote
          </h1>
          <p className='text-gray-600'>Choose your preferred candidate below</p>
        </div>

        {/* Main Card */}
        <div className='bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden'>
          {/* Candidates Section */}
          <div className='p-8'>
            <h2 className='text-lg font-semibold text-gray-800 mb-6 flex items-center'>
              <span className='inline-block w-2 h-2 bg-indigo-500 rounded-full mr-3'></span>
              Select a Candidate
            </h2>

            <div className='space-y-3'>
              {candidates.map((name, index) => (
                <label
                  key={index}
                  className={`
                    group relative flex items-center p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200 hover:shadow-md
                    ${
                      selected === index
                        ? 'border-indigo-500 bg-indigo-50 shadow-md'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <input
                    type='radio'
                    name='candidate'
                    value={index}
                    onChange={() => setSelected(index)}
                    className='sr-only'
                  />

                  {/* Custom Radio Button */}
                  <div
                    className={`
                    relative flex items-center justify-center w-5 h-5 rounded-full border-2 mr-4 transition-all duration-200
                    ${
                      selected === index
                        ? 'border-indigo-500 bg-indigo-500'
                        : 'border-gray-300 group-hover:border-gray-400'
                    }
                  `}
                  >
                    {selected === index && (
                      <div className='w-2 h-2 bg-white rounded-full animate-scale-in'></div>
                    )}
                  </div>

                  {/* Candidate Info */}
                  <div className='flex-1'>
                    <div className='flex items-center justify-between'>
                      <span
                        className={`
                        font-medium transition-colors duration-200
                        ${
                          selected === index
                            ? 'text-indigo-900'
                            : 'text-gray-700'
                        }
                      `}
                      >
                        {name}
                      </span>
                      <span className='text-sm text-gray-500'>
                        Candidate {index + 1}
                      </span>
                    </div>
                  </div>

                  {/* Selection Indicator */}
                  {selected === index && (
                    <div className='absolute inset-0 rounded-2xl bg-indigo-500 opacity-5 animate-pulse'></div>
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Status Message */}
          {status && (
            <div className='px-8 pb-4'>
              <div
                className={`
                p-4 rounded-xl border text-sm font-medium text-center animate-fade-in
                ${getStatusColor()}
              `}
              >
                {status}
              </div>
            </div>
          )}

          {/* Action Section */}
          <div className='px-8 pb-8'>
            <button
              onClick={vote}
              disabled={selected === null || isVoting || status.includes('✅')}
              className={`
                w-full py-4 px-6 rounded-2xl font-semibold text-white transition-all duration-200 transform
                ${
                  selected !== null && !isVoting && !status.includes('✅')
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 hover:scale-[1.02] shadow-lg hover:shadow-xl'
                    : 'bg-gray-300 cursor-not-allowed'
                }
              `}
            >
              {isVoting ? (
                <span className='flex items-center justify-center'>
                  <svg
                    className='animate-spin -ml-1 mr-3 h-5 w-5 text-white'
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
                  Processing Vote...
                </span>
              ) : status.includes('✅') ? (
                'Vote Submitted'
              ) : selected === null ? (
                'Select a Candidate'
              ) : (
                'Submit Vote'
              )}
            </button>

            <p className='text-xs text-gray-500 text-center mt-4'>
              Your vote is secure and anonymous
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className='text-center mt-8'>
          <div className='space-x-6'>
            <button
              onClick={() => router.push('/result')}
              className='text-indigo-600 hover:text-indigo-700 font-medium text-sm hover:underline transition-colors duration-200'
            >
              View Current Results →
            </button>
            <button
              onClick={() => router.push('/details')}
              className='text-indigo-600 hover:text-indigo-700 font-medium text-sm hover:underline transition-colors duration-200'
            >
              System Details →
            </button>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes scale-in {
          from {
            transform: scale(0);
          }
          to {
            transform: scale(1);
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
