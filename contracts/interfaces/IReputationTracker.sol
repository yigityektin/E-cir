// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IReputationTracker {
    enum ReputationTier { BRONZE, SILVER, GOLD, PLATINUM }

    event ReputationUpdated(
        address indexed agentWallet,
        uint256 newAverageScore,
        ReputationTier newTier,
        uint256 completedTasks
    );

    function updateReputation(address agentWallet, uint256 score, uint256 rewardAmount) external;
    function getAverageScore(address agentWallet) external view returns (uint256);
    function getTier(address agentWallet) external view returns (ReputationTier);
    function getReputation(address agentWallet) external view returns (
        uint256 averageScore,
        uint256 completedTasks,
        uint256 totalRewards,
        ReputationTier tier
    );
}
