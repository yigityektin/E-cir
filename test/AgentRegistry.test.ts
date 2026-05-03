import { expect } from "chai";
import { ethers } from "hardhat";
import { AgentRegistry } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("AgentRegistry", function () {
  let registry: AgentRegistry;
  let owner: SignerWithAddress;
  let other: SignerWithAddress;
  let agentWallet: string;

  beforeEach(async function () {
    [owner, other] = await ethers.getSigners();
    agentWallet = "0x1111111111111111111111111111111111111111";

    const Factory = await ethers.getContractFactory("AgentRegistry");
    registry = await Factory.deploy();
    await registry.waitForDeployment();
  });

  describe("registerAgent", function () {
    it("owner can register an agent", async function () {
      await expect(
        registry.registerAgent(
          "agent1.agenttry.eth",
          agentWallet,
          "claude-opus-4-7",
          "coding",
          "0g://meta/1"
        )
      ).to.emit(registry, "AgentRegistered")
        .withArgs(agentWallet, "agent1.agenttry.eth", "claude-opus-4-7", "coding");

      expect(await registry.isRegistered(agentWallet)).to.be.true;
    });

    it("non-owner cannot register", async function () {
      await expect(
        registry.connect(other).registerAgent(
          "agent1.agenttry.eth",
          agentWallet,
          "model",
          "spec",
          "uri"
        )
      ).to.be.reverted;
    });

    it("reverts on duplicate wallet", async function () {
      await registry.registerAgent("agent1.agenttry.eth", agentWallet, "m", "s", "u");
      await expect(
        registry.registerAgent("agent2.agenttry.eth", agentWallet, "m", "s", "u")
      ).to.be.revertedWith("AgentRegistry: wallet already registered");
    });

    it("reverts on duplicate ENS name", async function () {
      const wallet2 = "0x2222222222222222222222222222222222222222";
      await registry.registerAgent("agent1.agenttry.eth", agentWallet, "m", "s", "u");
      await expect(
        registry.registerAgent("agent1.agenttry.eth", wallet2, "m", "s", "u")
      ).to.be.revertedWith("AgentRegistry: ENS name already taken");
    });
  });

  describe("resolveENS", function () {
    it("resolves registered ENS name to wallet", async function () {
      await registry.registerAgent("agent1.agenttry.eth", agentWallet, "m", "s", "u");
      expect(await registry.resolveENS("agent1.agenttry.eth")).to.equal(agentWallet);
    });

    it("returns zero address for unknown ENS", async function () {
      expect(await registry.resolveENS("unknown.eth")).to.equal(ethers.ZeroAddress);
    });
  });

  describe("getAgentByENS", function () {
    it("returns agent data for known ENS", async function () {
      await registry.registerAgent("agent1.agenttry.eth", agentWallet, "claude-opus-4-7", "coding", "uri");
      const agent = await registry.getAgentByENS("agent1.agenttry.eth");
      expect(agent.modelType).to.equal("claude-opus-4-7");
      expect(agent.specialization).to.equal("coding");
    });
  });

  describe("updateMetadata", function () {
    it("owner can update metadata URI", async function () {
      await registry.registerAgent("agent1.agenttry.eth", agentWallet, "m", "s", "old-uri");
      await expect(registry.updateMetadata(agentWallet, "new-uri"))
        .to.emit(registry, "AgentMetadataUpdated")
        .withArgs(agentWallet, "new-uri");
    });
  });
});
