import { expect } from "chai";
import { ethers } from "hardhat";
import { ReputationTracker } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * ReputationHook requires a live Uniswap v4 PoolManager and a mined address with
 * the BEFORE_SWAP permission bit set — not feasible in a simple Hardhat unit test.
 *
 * This file tests the fee-tier mapping logic in isolation using ReputationTracker
 * directly, verifying that the right fee constants would be selected for each tier.
 * Integration tests against a forked or local v4 deployment live in test/fork/.
 */
describe("ReputationHook — fee tier logic (isolated)", function () {
  let tracker: ReputationTracker;
  let operator: SignerWithAddress;
  let agent: SignerWithAddress;

  // Mirror the fee constants from ReputationHook.sol
  const PLATINUM_FEE = 500n;
  const GOLD_FEE     = 1000n;
  const SILVER_FEE   = 2000n;
  const BRONZE_FEE   = 3000n;

  // Tier enum (matches contract order)
  const BRONZE   = 0n;
  const SILVER   = 1n;
  const GOLD     = 2n;
  const PLATINUM = 3n;

  function feeForTier(tier: bigint): bigint {
    if (tier === PLATINUM) return PLATINUM_FEE;
    if (tier === GOLD)     return GOLD_FEE;
    if (tier === SILVER)   return SILVER_FEE;
    return BRONZE_FEE;
  }

  beforeEach(async function () {
    [, operator, agent] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ReputationTracker");
    tracker = await Factory.deploy();
    await tracker.setOperator(operator.address);
  });

  it("new agent (0 tasks) → BRONZE fee", async function () {
    const tier = await tracker.getTier(agent.address);
    expect(feeForTier(tier)).to.equal(BRONZE_FEE);
  });

  it("avg score 50 → SILVER fee", async function () {
    await tracker.connect(operator).updateReputation(agent.address, 50, 0);
    const tier = await tracker.getTier(agent.address);
    expect(feeForTier(tier)).to.equal(SILVER_FEE);
  });

  it("avg score 70 → GOLD fee", async function () {
    await tracker.connect(operator).updateReputation(agent.address, 70, 0);
    const tier = await tracker.getTier(agent.address);
    expect(feeForTier(tier)).to.equal(GOLD_FEE);
  });

  it("avg score 90 → PLATINUM fee", async function () {
    await tracker.connect(operator).updateReputation(agent.address, 90, 0);
    const tier = await tracker.getTier(agent.address);
    expect(feeForTier(tier)).to.equal(PLATINUM_FEE);
  });

  it("fee decreases as reputation improves over multiple tasks", async function () {
    // Start: BRONZE
    let tier = await tracker.getTier(agent.address);
    let prevFee = feeForTier(tier);

    const scores = [60n, 75n, 85n, 92n];
    for (const score of scores) {
      await tracker.connect(operator).updateReputation(agent.address, score, 0);
      tier = await tracker.getTier(agent.address);
      const newFee = feeForTier(tier);
      // Fee should never increase as average score rises
      expect(newFee).to.be.lte(prevFee);
      prevFee = newFee;
    }
  });
});
