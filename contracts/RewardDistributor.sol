// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./RewardToken.sol";
import "./interfaces/IReputationTracker.sol";

/// @notice Accepts scores from Person 1's backend and distributes AIPERF rewards
///         proportionally. Updates reputation after each task settlement.
contract RewardDistributor is Ownable, ReentrancyGuard {
    RewardToken public immutable rewardToken;
    IReputationTracker public immutable reputationTracker;

    struct AgentScore {
        address agentWallet;
        uint256 finalScore;
        string evaluationURI;
        bool rewarded;
    }

    struct Task {
        string taskId;
        uint256 totalReward;   // in AIPERF wei
        bool finalized;
        address[] participants;
    }

    mapping(bytes32 => Task) private _tasks;
    // taskHash => agentWallet => score
    mapping(bytes32 => mapping(address => AgentScore)) private _scores;

    event ScoreSubmitted(
        string indexed taskId,
        address indexed agentWallet,
        uint256 finalScore,
        string evaluationURI
    );
    event TaskRewardSet(string indexed taskId, uint256 totalReward);
    event RewardSent(
        string indexed taskId,
        address indexed agentWallet,
        uint256 amount,
        uint256 score
    );
    event RewardsDistributed(string indexed taskId, uint256 totalReward, uint256 participantCount);

    constructor(address _rewardToken, address _reputationTracker) Ownable(msg.sender) {
        rewardToken = RewardToken(_rewardToken);
        reputationTracker = IReputationTracker(_reputationTracker);
    }

    /// @notice Called by the backend (Person 1) for each agent that completed the task.
    function submitScore(
        string calldata taskId,
        address agentWallet,
        uint256 finalScore,
        string calldata evaluationURI
    ) external onlyOwner {
        require(finalScore <= 100, "RewardDistributor: score out of range");
        require(agentWallet != address(0), "RewardDistributor: zero address");

        bytes32 taskHash = _hash(taskId);
        Task storage task = _tasks[taskHash];

        if (bytes(task.taskId).length == 0) {
            task.taskId = taskId;
        }
        require(!task.finalized, "RewardDistributor: task already finalized");
        require(
            _scores[taskHash][agentWallet].agentWallet == address(0),
            "RewardDistributor: score already submitted"
        );

        _scores[taskHash][agentWallet] = AgentScore({
            agentWallet: agentWallet,
            finalScore: finalScore,
            evaluationURI: evaluationURI,
            rewarded: false
        });
        task.participants.push(agentWallet);

        emit ScoreSubmitted(taskId, agentWallet, finalScore, evaluationURI);
    }

    /// @notice Set total AIPERF reward pool for a task (in wei, 18 decimals).
    function setTaskReward(string calldata taskId, uint256 totalReward) external onlyOwner {
        bytes32 taskHash = _hash(taskId);
        require(!_tasks[taskHash].finalized, "RewardDistributor: task already finalized");
        _tasks[taskHash].totalReward = totalReward;
        emit TaskRewardSet(taskId, totalReward);
    }

    /// @notice Distribute rewards proportionally by score. Mints AIPERF directly to agents.
    function distributeRewards(string calldata taskId) external onlyOwner nonReentrant {
        bytes32 taskHash = _hash(taskId);
        Task storage task = _tasks[taskHash];

        require(!task.finalized, "RewardDistributor: already finalized");
        require(task.totalReward > 0, "RewardDistributor: reward not set");
        require(task.participants.length > 0, "RewardDistributor: no participants");

        uint256 totalScore = 0;
        for (uint256 i = 0; i < task.participants.length; i++) {
            totalScore += _scores[taskHash][task.participants[i]].finalScore;
        }
        require(totalScore > 0, "RewardDistributor: all scores are zero");

        for (uint256 i = 0; i < task.participants.length; i++) {
            address participant = task.participants[i];
            AgentScore storage agentScore = _scores[taskHash][participant];

            if (!agentScore.rewarded) {
                uint256 reward = (task.totalReward * agentScore.finalScore) / totalScore;
                agentScore.rewarded = true;

                rewardToken.mint(participant, reward);
                reputationTracker.updateReputation(participant, agentScore.finalScore, reward);

                emit RewardSent(taskId, participant, reward, agentScore.finalScore);
            }
        }

        task.finalized = true;
        emit RewardsDistributed(taskId, task.totalReward, task.participants.length);
    }

    // ── View helpers ──────────────────────────────────────────────────────────

    function getTask(string calldata taskId) external view returns (
        uint256 totalReward,
        bool finalized,
        uint256 participantCount
    ) {
        Task storage task = _tasks[_hash(taskId)];
        return (task.totalReward, task.finalized, task.participants.length);
    }

    function getTaskScores(string calldata taskId) external view returns (
        address[] memory participants,
        uint256[] memory scores,
        bool[] memory rewarded
    ) {
        bytes32 taskHash = _hash(taskId);
        Task storage task = _tasks[taskHash];
        uint256 n = task.participants.length;

        participants = task.participants;
        scores = new uint256[](n);
        rewarded = new bool[](n);

        for (uint256 i = 0; i < n; i++) {
            AgentScore storage s = _scores[taskHash][task.participants[i]];
            scores[i] = s.finalScore;
            rewarded[i] = s.rewarded;
        }
    }

    function _hash(string calldata taskId) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(taskId));
    }
}
