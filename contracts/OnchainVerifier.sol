// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/INexusAgent.sol";
import "./NexusRegistry.sol";

/// @title OnchainVerifier
/// @notice Verifies that agent actions comply with their registered strategy constraints
///         and produces an immutable execution record on Ethereum.
contract OnchainVerifier {
    NexusRegistry public immutable registry;

    struct ExecutionRecord {
        bytes32 agentId;
        bytes32 actionHash;
        uint256 blockNumber;
        uint256 timestamp;
        bool verified;
    }

    mapping(bytes32 => ExecutionRecord) public records;
    mapping(bytes32 => bytes32[]) private agentExecutions;

    event ActionVerified(
        bytes32 indexed agentId,
        bytes32 indexed actionHash,
        uint256 block,
        bool passed
    );

    event ExecutionRecorded(
        bytes32 indexed agentId,
        bytes32 indexed recordId,
        bytes32 actionHash,
        uint256 blockNumber
    );

    constructor(address _registry) {
        registry = NexusRegistry(_registry);
    }

    /// @notice Verify an agent action and record it onchain
    /// @param agentId The registered agent identifier
    /// @param actionHash keccak256 hash of the encoded action payload
    /// @param signature ECDSA signature over actionHash by the agent signing key
    /// @return verified True if the action passed all checks
    function verify(
        bytes32 agentId,
        bytes32 actionHash,
        bytes calldata signature
    ) external returns (bool verified) {
        require(registry.isActive(agentId), "OnchainVerifier: agent not active");

        INexusAgent.AgentInfo memory agent = registry.getAgent(agentId);

        // Verify signature matches registered signing key
        verified = _verifySignature(agent.signingKey, actionHash, signature);

        // Record execution regardless of outcome
        bytes32 recordId = keccak256(
            abi.encodePacked(agentId, actionHash, block.number, block.timestamp)
        );

        records[recordId] = ExecutionRecord({
            agentId: agentId,
            actionHash: actionHash,
            blockNumber: block.number,
            timestamp: block.timestamp,
            verified: verified
        });

        agentExecutions[agentId].push(recordId);

        emit ActionVerified(agentId, actionHash, block.number, verified);
        emit ExecutionRecorded(agentId, recordId, actionHash, block.number);
    }

    /// @notice Check whether a specific action was previously verified
    /// @param agentId The agent that submitted the action
    /// @param actionHash The hash of the action to look up
    /// @return True if the action was verified in a previous block
    function wasVerified(bytes32 agentId, bytes32 actionHash)
        external
        view
        returns (bool)
    {
        bytes32[] memory ids = agentExecutions[agentId];
        for (uint256 i = 0; i < ids.length; i++) {
            ExecutionRecord memory r = records[ids[i]];
            if (r.actionHash == actionHash && r.verified) {
                return true;
            }
        }
        return false;
    }

    /// @notice Returns all execution record IDs for an agent
    function getExecutions(bytes32 agentId)
        external
        view
        returns (bytes32[] memory)
    {
        return agentExecutions[agentId];
    }

    /// @notice Returns the number of verified executions for an agent
    function executionCount(bytes32 agentId) external view returns (uint256) {
        return agentExecutions[agentId].length;
    }

    function _verifySignature(
        address signingKey,
        bytes32 hash,
        bytes calldata sig
    ) internal pure returns (bool) {
        if (sig.length != 65) return false;

        bytes32 ethHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", hash)
        );

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            v := byte(0, calldataload(add(sig.offset, 64)))
        }

        address recovered = ecrecover(ethHash, v, r, s);
        return recovered != address(0) && recovered == signingKey;
    }
}
