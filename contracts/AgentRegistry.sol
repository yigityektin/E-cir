// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/access/Ownable.sol";

/// @notice On-chain registry mapping agents to their ENS identity, wallet, and metadata.
contract AgentRegistry is Ownable {
    struct Agent {
        string ensName;
        address agentWallet;
        string modelType;
        string specialization;
        string metadataURI;
        uint256 registeredAt;
    }

    mapping(address => Agent) private _agents;
    mapping(string => address) private _ensToWallet;
    address[] private _registeredAgents;

    event AgentRegistered(
        address indexed agentWallet,
        string ensName,
        string modelType,
        string specialization
    );
    event AgentMetadataUpdated(address indexed agentWallet, string metadataURI);
    event AgentDeregistered(address indexed agentWallet);

    constructor() Ownable(msg.sender) {}

    function registerAgent(
        string calldata ensName,
        address agentWallet,
        string calldata modelType,
        string calldata specialization,
        string calldata metadataURI
    ) external onlyOwner {
        require(agentWallet != address(0), "AgentRegistry: zero address");
        require(!isRegistered(agentWallet), "AgentRegistry: wallet already registered");
        require(_ensToWallet[ensName] == address(0), "AgentRegistry: ENS name already taken");
        require(bytes(ensName).length > 0, "AgentRegistry: empty ENS name");

        _agents[agentWallet] = Agent({
            ensName: ensName,
            agentWallet: agentWallet,
            modelType: modelType,
            specialization: specialization,
            metadataURI: metadataURI,
            registeredAt: block.timestamp
        });

        _ensToWallet[ensName] = agentWallet;
        _registeredAgents.push(agentWallet);

        emit AgentRegistered(agentWallet, ensName, modelType, specialization);
    }

    function updateMetadata(address agentWallet, string calldata metadataURI) external onlyOwner {
        require(isRegistered(agentWallet), "AgentRegistry: not registered");
        _agents[agentWallet].metadataURI = metadataURI;
        emit AgentMetadataUpdated(agentWallet, metadataURI);
    }

    /// @notice Resolve ENS name → wallet address (mirrors ENS resolver flow).
    function resolveENS(string calldata ensName) external view returns (address) {
        return _ensToWallet[ensName];
    }

    function getAgent(address agentWallet) external view returns (Agent memory) {
        require(isRegistered(agentWallet), "AgentRegistry: not registered");
        return _agents[agentWallet];
    }

    function getAgentByENS(string calldata ensName) external view returns (Agent memory) {
        address wallet = _ensToWallet[ensName];
        require(wallet != address(0), "AgentRegistry: ENS not found");
        return _agents[wallet];
    }

    function getRegisteredAgents() external view returns (address[] memory) {
        return _registeredAgents;
    }

    function isRegistered(address agentWallet) public view returns (bool) {
        return _agents[agentWallet].registeredAt != 0;
    }
}
