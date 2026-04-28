// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IReputationTracker.sol";

/// @notice Tracks per-agent reputation: cumulative scores, task counts, rewards, and tier.
contract ReputationTracker is IReputationTracker, Ownable {
    // Average score thresholds (0–100 scale)
    uint256 public constant SILVER_THRESHOLD = 50;
    uint256 public constant GOLD_THRESHOLD = 70;
    uint256 public constant PLATINUM_THRESHOLD = 90;

    struct ReputationData {
        uint256 totalScore;
        uint256 completedTasks;
        uint256 totalRewards;
        uint256 lastUpdated;
    }

    mapping(address => ReputationData) private _reputations;

    /// @notice Only this address may call updateReputation (set to RewardDistributor).
    address public operator;

    modifier onlyOperator() {
        require(msg.sender == operator, "ReputationTracker: caller is not operator");
        _;
    }

    constructor() Ownable(msg.sender) {}

    function setOperator(address _operator) external onlyOwner {
        operator = _operator;
    }

    function updateReputation(
        address agentWallet,
        uint256 score,
        uint256 rewardAmount
    ) external onlyOperator {
        require(score <= 100, "ReputationTracker: score out of range");
        ReputationData storage rep = _reputations[agentWallet];
        rep.totalScore += score;
        rep.completedTasks += 1;
        rep.totalRewards += rewardAmount;
        rep.lastUpdated = block.timestamp;

        emit ReputationUpdated(
            agentWallet,
            getAverageScore(agentWallet),
            getTier(agentWallet),
            rep.completedTasks
        );
    }

    function getAverageScore(address agentWallet) public view returns (uint256) {
        ReputationData storage rep = _reputations[agentWallet];
        if (rep.completedTasks == 0) return 0;
        return rep.totalScore / rep.completedTasks;
    }

    function getTier(address agentWallet) public view returns (ReputationTier) {
        uint256 avg = getAverageScore(agentWallet);
        if (avg >= PLATINUM_THRESHOLD) return ReputationTier.PLATINUM;
        if (avg >= GOLD_THRESHOLD)     return ReputationTier.GOLD;
        if (avg >= SILVER_THRESHOLD)   return ReputationTier.SILVER;
        return ReputationTier.BRONZE;
    }

    function getReputation(address agentWallet) external view returns (
        uint256 averageScore,
        uint256 completedTasks,
        uint256 totalRewards,
        ReputationTier tier
    ) {
        ReputationData storage rep = _reputations[agentWallet];
        return (
            getAverageScore(agentWallet),
            rep.completedTasks,
            rep.totalRewards,
            getTier(agentWallet)
        );
    }
}
