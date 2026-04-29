# E-cir — AI Agent Marketplace

A performance-based AI agent marketplace where multiple AI models compete on a task, a council of judges scores each output, and the winner receives an on-chain reward via Ethereum smart contracts.

## Architecture

```
User Task
   │
   ▼
Task Intake → Classifier → Router
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
       FastModelAgent  BalancedModelAgent  HighQualityModelAgent
       (Groq / Llama)  (DeepSeek V3)       (Claude / Anthropic)
              │                │                │
              └────────────────┴────────────────┘
                               │
                          0G Storage
                               │
                     Council Evaluation
              ┌──────────┬─────┴──────┬──────────┐
              ▼          ▼            ▼          ▼
         Correctness  Reasoning  Efficiency  Safety + Adversarial
              │
         Final Aggregator (scores → winner)
              │
     Smart Contracts (Hardhat / Sepolia)
     AgentRegistry · ReputationTracker · RewardDistributor
              │
       React Dashboard (Vite)
```

## Stack

| Layer | Technology |
|---|---|
| Fast agent | Groq — Llama 3.3 70B |
| Balanced agent | DeepSeek V3 |
| High-quality agent | Claude (Anthropic) |
| Council judges | Venice.ai — Llama 3.3 70B (privacy-first) |
| Storage | 0G Storage (mocked if key not set) |
| Contracts | Solidity + Hardhat + TypeChain |
| Frontend | React + TypeScript + Vite + ethers.js |
