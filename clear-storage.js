// Add this to your browser console to clear voting data
localStorage.removeItem('lastVoteTransaction');
console.log('✅ Voting data cleared from localStorage');

// Or add this function to your frontend for development
function clearVotingData() {
  localStorage.removeItem('lastVoteTransaction');
  console.log('✅ Voting data cleared');
  window.location.reload();
}
