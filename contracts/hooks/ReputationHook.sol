// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import {BaseHook} from "@uniswap/v4-periphery/src/utils/BaseHook.sol";
import {Hooks} from "@uniswap/v4-core/src/libraries/Hooks.sol";
import {LPFeeLibrary} from "@uniswap/v4-core/src/libraries/LPFeeLibrary.sol";
import {IPoolManager} from "@uniswap/v4-core/src/interfaces/IPoolManager.sol";
import {PoolKey} from "@uniswap/v4-core/src/types/PoolKey.sol";
import {BeforeSwapDelta, BeforeSwapDeltaLibrary} from "@uniswap/v4-core/src/types/BeforeSwapDelta.sol";
import {SwapParams} from "@uniswap/v4-core/src/types/PoolOperation.sol";
import {IReputationTracker} from "../interfaces/IReputationTracker.sol";

/// @notice Uniswap v4 hook that adjusts swap fees based on the swapper's agent reputation tier.
///
/// Fee schedule:
///   PLATINUM  → 0.05%  (high-quality agents pay less)
///   GOLD      → 0.10%
///   SILVER    → 0.20%
///   BRONZE    → 0.30%  (new / low-quality agents pay more)
///
/// Pool MUST be initialized with LPFeeLibrary.DYNAMIC_FEE_FLAG so the hook
/// can override the fee per-swap via OVERRIDE_FEE_FLAG.
///
/// Hook deployment note: the contract address must have the BEFORE_SWAP permission
/// bit set. Use HookMiner (from v4-periphery) to mine the correct CREATE2 salt.
contract ReputationHook is BaseHook {
    using LPFeeLibrary for uint24;

    IReputationTracker public immutable reputationTracker;
    address public evaluatorTreasury;

    uint24 public constant PLATINUM_FEE = 500;   // 0.05%
    uint24 public constant GOLD_FEE     = 1000;  // 0.10%
    uint24 public constant SILVER_FEE   = 2000;  // 0.20%
    uint24 public constant BRONZE_FEE   = 3000;  // 0.30%

    event TreasuryUpdated(address indexed newTreasury);

    constructor(
        IPoolManager _poolManager,
        address _reputationTracker,
        address _evaluatorTreasury
    ) BaseHook(_poolManager) {
        reputationTracker = IReputationTracker(_reputationTracker);
        evaluatorTreasury = _evaluatorTreasury;
    }

    // ── Hook permission flags ─────────────────────────────────────────────────

    function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
        return Hooks.Permissions({
            beforeInitialize:                false,
            afterInitialize:                 false,
            beforeAddLiquidity:              false,
            afterAddLiquidity:               false,
            beforeRemoveLiquidity:           false,
            afterRemoveLiquidity:            false,
            beforeSwap:                      true,  // ← only permission we need
            afterSwap:                       false,
            beforeDonate:                    false,
            afterDonate:                     false,
            beforeSwapReturnDelta:           false,
            afterSwapReturnDelta:            false,
            afterAddLiquidityReturnDelta:    false,
            afterRemoveLiquidityReturnDelta: false
        });
    }

    // ── Hook callback ─────────────────────────────────────────────────────────

    /// @dev `sender` is the address calling PoolManager.swap() — in agent flows this
    ///      is the agent's wallet, so reputation tier drives the fee.
    function _beforeSwap(
        address sender,
        PoolKey calldata,
        SwapParams calldata,
        bytes calldata
    ) internal override returns (bytes4, BeforeSwapDelta, uint24) {
        uint24 fee = _feeForTier(reputationTracker.getTier(sender));

        // OVERRIDE_FEE_FLAG tells PoolManager to replace the pool's static fee.
        return (
            this.beforeSwap.selector,
            BeforeSwapDeltaLibrary.ZERO_DELTA,
            fee | LPFeeLibrary.OVERRIDE_FEE_FLAG
        );
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    function setEvaluatorTreasury(address _treasury) external {
        require(msg.sender == evaluatorTreasury, "ReputationHook: not treasury");
        evaluatorTreasury = _treasury;
        emit TreasuryUpdated(_treasury);
    }

    // ── Internal ──────────────────────────────────────────────────────────────

    function _feeForTier(IReputationTracker.ReputationTier tier) internal pure returns (uint24) {
        if (tier == IReputationTracker.ReputationTier.PLATINUM) return PLATINUM_FEE;
        if (tier == IReputationTracker.ReputationTier.GOLD)     return GOLD_FEE;
        if (tier == IReputationTracker.ReputationTier.SILVER)   return SILVER_FEE;
        return BRONZE_FEE;
    }
}
