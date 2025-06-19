// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract EVoting {
    struct Candidate {
        string name;
        uint voteCount;
    }

    struct VoteRecord {
        address voter;
        uint candidateIndex;
        uint timestamp;
        bytes32 txHash;
    }

    mapping(address => bool) public hasVoted;
    mapping(address => uint) public voterChoice; // Track which candidate each address voted for
    Candidate[] public candidates;
    VoteRecord[] public voteHistory;

    uint public totalVotes;
    uint public startTime;
    address public owner;

    event VoteCast(
        address indexed voter,
        uint indexed candidateIndex,
        uint timestamp
    );

    constructor(string[] memory _candidateNames) {
        for (uint i = 0; i < _candidateNames.length; i++) {
            candidates.push(Candidate(_candidateNames[i], 0));
        }
        startTime = block.timestamp;
        owner = msg.sender;
    }

    function vote(uint _candidateIndex) public {
        require(!hasVoted[msg.sender], "Already voted");
        require(_candidateIndex < candidates.length, "Invalid candidate");

        candidates[_candidateIndex].voteCount += 1;
        hasVoted[msg.sender] = true;
        voterChoice[msg.sender] = _candidateIndex;
        totalVotes += 1;

        // Record the vote details with transaction hash
        voteHistory.push(
            VoteRecord({
                voter: msg.sender,
                candidateIndex: _candidateIndex,
                timestamp: block.timestamp,
                txHash: blockhash(block.number - 1) // Not perfect but gives some reference
            })
        );

        emit VoteCast(msg.sender, _candidateIndex, block.timestamp);
    }

    // 🔧 Tambahan untuk frontend
    function getCandidateCount() public view returns (uint) {
        return candidates.length;
    }

    function getCandidate(
        uint index
    ) public view returns (string memory name, uint voteCount) {
        require(index < candidates.length, "Invalid index");
        Candidate memory c = candidates[index];
        return (c.name, c.voteCount);
    }

    // Fungsi baru untuk mendapatkan detail transaksi dan data
    function getVoteHistoryCount() public view returns (uint) {
        return voteHistory.length;
    }

    function getVoteRecord(
        uint index
    )
        public
        view
        returns (
            address voter,
            uint candidateIndex,
            uint timestamp,
            bytes32 txHash
        )
    {
        require(index < voteHistory.length, "Invalid index");
        VoteRecord memory record = voteHistory[index];
        return (
            record.voter,
            record.candidateIndex,
            record.timestamp,
            record.txHash
        );
    }

    function getVoterInfo(
        address voter
    ) public view returns (bool voted, uint candidateIndex) {
        return (hasVoted[voter], voterChoice[voter]);
    }

    function getVotingStats()
        public
        view
        returns (
            uint totalCandidates,
            uint totalVotesCast,
            uint startTimestamp,
            uint durationInSeconds,
            address contractOwner
        )
    {
        return (
            candidates.length,
            totalVotes,
            startTime,
            block.timestamp - startTime,
            owner
        );
    }

    function checkVotedStatus(address voter) public view returns (bool) {
        return hasVoted[voter];
    }
}
