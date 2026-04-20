// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title INexusAgent
/// @notice Interface for all NEXUS agent contracts
interface INexusAgent {
    struct AgentInfo {
        address owner;
        address signingKey;
        bytes32 strategyHash;
        uint256 registeredAt;
        bool active;
    }

    event AgentRegistered(bytes32 indexed agentId, address indexed owner, bytes32 strategyHash);
    event AgentPaused(bytes32 indexed agentId);
    event AgentResumed(bytes32 indexed agentId);
    event ActionExecuted(bytes32 indexed agentId, bytes32 actionHash, uint256 block);

    function register(
        bytes32 agentId,
        address signingKey,
        bytes32 strategyHash
    ) external returns (bool);

    function pause(bytes32 agentId) external;

    function resume(bytes32 agentId) external;

    function getAgent(bytes32 agentId) external view returns (AgentInfo memory);

    function isActive(bytes32 agentId) external view returns (bool);
}
