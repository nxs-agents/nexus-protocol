// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/INexusAgent.sol";

/// @title NexusRegistry
/// @notice Stores and manages the registry of all deployed NEXUS agents
contract NexusRegistry is INexusAgent {
    mapping(bytes32 => AgentInfo) private agents;
    mapping(address => bytes32[]) private ownerAgents;

    modifier onlyOwner(bytes32 agentId) {
        require(agents[agentId].owner == msg.sender, "NexusRegistry: not owner");
        _;
    }

    modifier agentExists(bytes32 agentId) {
        require(agents[agentId].registeredAt != 0, "NexusRegistry: agent not found");
        _;
    }

    function register(
        bytes32 agentId,
        address signingKey,
        bytes32 strategyHash
    ) external override returns (bool) {
        require(agents[agentId].registeredAt == 0, "NexusRegistry: already registered");
        require(signingKey != address(0), "NexusRegistry: invalid signing key");

        agents[agentId] = AgentInfo({
            owner: msg.sender,
            signingKey: signingKey,
            strategyHash: strategyHash,
            registeredAt: block.timestamp,
            active: true
        });

        ownerAgents[msg.sender].push(agentId);

        emit AgentRegistered(agentId, msg.sender, strategyHash);
        return true;
    }

    function pause(bytes32 agentId)
        external
        override
        onlyOwner(agentId)
        agentExists(agentId)
    {
        agents[agentId].active = false;
        emit AgentPaused(agentId);
    }

    function resume(bytes32 agentId)
        external
        override
        onlyOwner(agentId)
        agentExists(agentId)
    {
        agents[agentId].active = true;
        emit AgentResumed(agentId);
    }

    function getAgent(bytes32 agentId)
        external
        view
        override
        agentExists(agentId)
        returns (AgentInfo memory)
    {
        return agents[agentId];
    }

    function isActive(bytes32 agentId) external view override returns (bool) {
        return agents[agentId].active;
    }

    function getAgentsByOwner(address owner) external view returns (bytes32[] memory) {
        return ownerAgents[owner];
    }
}
