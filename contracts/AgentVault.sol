// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./NexusRegistry.sol";

/// @title AgentVault
/// @notice Self-custodial vault that allows agents to execute transactions
///         within user-defined spending limits. Users retain full withdrawal rights.
contract AgentVault is ReentrancyGuard {
    NexusRegistry public immutable registry;

    struct SpendingLimit {
        uint256 perTxMax;
        uint256 dailyMax;
        uint256 dailySpent;
        uint256 dayStart;
    }

    mapping(address => mapping(address => uint256)) private balances;
    mapping(bytes32 => mapping(address => SpendingLimit)) private limits;

    event Deposited(address indexed user, address indexed token, uint256 amount);
    event Withdrawn(address indexed user, address indexed token, uint256 amount);
    event AgentExecuted(bytes32 indexed agentId, address token, uint256 amount, address to);
    event LimitSet(bytes32 indexed agentId, address token, uint256 perTx, uint256 daily);

    constructor(address _registry) {
        registry = NexusRegistry(_registry);
    }

    function deposit(address token, uint256 amount) external nonReentrant {
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        balances[msg.sender][token] += amount;
        emit Deposited(msg.sender, token, amount);
    }

    function withdraw(address token, uint256 amount) external nonReentrant {
        require(balances[msg.sender][token] >= amount, "AgentVault: insufficient balance");
        balances[msg.sender][token] -= amount;
        IERC20(token).transfer(msg.sender, amount);
        emit Withdrawn(msg.sender, token, amount);
    }

    function setSpendingLimit(
        bytes32 agentId,
        address token,
        uint256 perTxMax,
        uint256 dailyMax
    ) external {
        require(registry.isActive(agentId), "AgentVault: agent not active");
        limits[agentId][token] = SpendingLimit({
            perTxMax: perTxMax,
            dailyMax: dailyMax,
            dailySpent: 0,
            dayStart: block.timestamp
        });
        emit LimitSet(agentId, token, perTxMax, dailyMax);
    }

    function execute(
        bytes32 agentId,
        address owner,
        address token,
        uint256 amount,
        address to,
        bytes calldata signature
    ) external nonReentrant {
        require(registry.isActive(agentId), "AgentVault: agent not active");
        require(_verifySignature(agentId, owner, token, amount, to, signature), "AgentVault: invalid signature");
        require(balances[owner][token] >= amount, "AgentVault: insufficient balance");

        SpendingLimit storage limit = limits[agentId][token];
        require(amount <= limit.perTxMax, "AgentVault: exceeds per-tx limit");

        if (block.timestamp >= limit.dayStart + 1 days) {
            limit.dailySpent = 0;
            limit.dayStart = block.timestamp;
        }

        require(limit.dailySpent + amount <= limit.dailyMax, "AgentVault: exceeds daily limit");

        limit.dailySpent += amount;
        balances[owner][token] -= amount;
        IERC20(token).transfer(to, amount);

        emit AgentExecuted(agentId, token, amount, to);
    }

    function balanceOf(address user, address token) external view returns (uint256) {
        return balances[user][token];
    }

    function _verifySignature(
        bytes32 agentId,
        address owner,
        address token,
        uint256 amount,
        address to,
        bytes calldata signature
    ) internal view returns (bool) {
        INexusAgent.AgentInfo memory agent = registry.getAgent(agentId);
        bytes32 hash = keccak256(abi.encodePacked(agentId, owner, token, amount, to, block.number));
        bytes32 ethHash = keccak256(abi.encodePacked("\x19Ethereum Signed Message:\n32", hash));
        address recovered = _recover(ethHash, signature);
        return recovered == agent.signingKey;
    }

    function _recover(bytes32 hash, bytes calldata sig) internal pure returns (address) {
        require(sig.length == 65, "AgentVault: invalid signature length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := calldataload(sig.offset)
            s := calldataload(add(sig.offset, 32))
            v := byte(0, calldataload(add(sig.offset, 64)))
        }
        return ecrecover(hash, v, r, s);
    }
}
