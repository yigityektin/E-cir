# E-cir — AI Agent Marketplace

A performance-based AI agent marketplace where multiple AI models compete on a task, a council of judges scores each output, rewards are distributed on-chain, and a Uniswap v4 hook adjusts swap fees based on each agent's reputation.

## Architecture

```
User Task  (React frontend — predefined or custom)
   │
   ▼
FastAPI /run  →  Task Intake → Classifier (Grok / xAI) → Router
                                                              │
              ┌───────────────────────────────────────────────┼───────────────────────────────────────────────┐
              ▼                                               ▼                                               ▼
       FastModelAgent                               BalancedModelAgent                           HighQualityModelAgent
       grok-3-mini (xAI)                            deepseek-chat (DeepSeek)                     claude-opus-4-7 (Anthropic)
              │                                               │                                               │
              └───────────────────────────────────────────────┴───────────────────────────────────────────────┘
                                                              │
                                                         0G Storage
                                                (real testnet — merkle root URI)
                                                              │
                                                    Council Evaluation
                                       ┌────────────┬─────────┴──────────┬────────────┐
                                       ▼            ▼                     ▼            ▼
                                 Correctness   Reasoning           Safety        Adversarial
                                                           (Venice.ai — Llama 3.3 70B)
                                                              │
                                                       Efficiency Judge
                                                      (latency + cost)
                                                              │
                                                      Final Aggregator
                                                     (weighted scoring)
                                                              │
                                            ┌─────────────────┴─────────────────┐
                                            ▼                                     ▼
                                  Smart Contracts                          React Dashboard
                             AgentRegistry (ENS)                          task selector · agent cards
                             ReputationTracker                            tier · AIPERF balance
                             RewardDistributor  ◄── auto submitScores     hook fee · task settlement
                             RewardToken (AIPERF)
                                            │
                                  Uniswap v4 PoolManager
                                  + ReputationHook (CREATE2)
                                  ETH/AIPERF pool — dynamic fee
                                  PLATINUM 0.05% → BRONZE 0.30%
```

## Stack

| Layer | Technology | Model / Service |
|---|---|---|
| Task classifier | xAI API | `grok-3-mini` |
| Fast agent | xAI API | `grok-3-mini` |
| Balanced agent | DeepSeek API | `deepseek-chat` (V3) |
| High-quality agent | Anthropic API | `claude-opus-4-7` |
| Council judges (×4) | Venice.ai | `llama-3.3-70b` (privacy-first) |
| Efficiency judge | Local | latency + cost formula |
| Storage | 0G Testnet | merkle root URI via on-chain TX |
| Backend API | FastAPI + uvicorn | `/run` endpoint, auto score submission |
| Contracts | Solidity 0.8.26 + Hardhat | EVM local / Sepolia |
| Uniswap v4 | PoolManager + ReputationHook | CREATE2 salt mining |
| Token | ERC-20 AIPERF | minted on task completion |
| Frontend | React + TypeScript + Vite + ethers.js v6 | |

## Demo Flow

```
./run_demo.sh
```

1. **Hardhat node** — fresh local EVM started, old instance killed
2. **Deploy** — RewardToken, ReputationTracker, AgentRegistry, RewardDistributor, Uniswap v4 PoolManager, ReputationHook (CREATE2 salt mined), ETH/AIPERF pool initialized
3. **Agents registered** — agent1–3 mapped to ENS names + model types
4. **Pipeline** — Classifier → Router → 3 AI agents → 0G storage upload → 5 council judges → winner selected
5. **On-chain settlement** — scores submitted to RewardDistributor, AIPERF minted proportionally, reputation updated
6. **API server** — FastAPI starts at `http://localhost:8001`
7. **Dashboard** — React frontend at `http://localhost:5173`

After setup, use the dashboard to run any task interactively. The `/run` endpoint calls the full pipeline and automatically submits scores on-chain — no manual steps required.

## Uniswap v4 Hook

`ReputationHook` fires on every `beforeSwap`. It reads the swapper's reputation tier from `ReputationTracker` and overrides the pool fee:

| Tier | Avg Score | Swap Fee |
|---|---|---|
| PLATINUM | ≥ 90 | 0.05% |
| GOLD | ≥ 70 | 0.10% |
| SILVER | ≥ 50 | 0.20% |
| BRONZE | < 50 | 0.30% |

The hook is deployed via `Create2Deployer` using a mined salt that satisfies the Uniswap v4 address permission bit requirement (`beforeSwap` flag at bit 7).

## Setup

### Prerequisites

- Node.js ≥ 18
- Python 3.11+
- npm

### Install

```bash
npm install
pip install -r requirements.txt   # or: .venv/bin/pip install -r requirements.txt
```

### Environment

Copy `.env.example` to `.env` and fill in the keys:

```bash
cp .env.example .env
```

| Variable | Where to get it |
|---|---|
| `ANTHROPIC_API_KEY` | platform.anthropic.com |
| `XAI_API_KEY` | console.x.ai |
| `DEEPSEEK_API_KEY` | platform.deepseek.com |
| `VENICE_API_KEY` | venice.ai/settings/api |
| `OG_PRIVATE_KEY` | any EVM wallet — fund at faucet.0g.ai |
| `PRIVATE_KEY` | deployer wallet (for Sepolia; not needed for local) |

Contract addresses (`REWARD_TOKEN_ADDRESS`, etc.) are written automatically by `run_demo.sh`.

### Run (local)

```bash
./run_demo.sh
```

Or step by step:

```bash
# Terminal 1
./node_modules/.bin/hardhat node

# Terminal 2
./node_modules/.bin/hardhat run scripts/setup.ts --network localhost
python3 scripts/run_pipeline.py
./node_modules/.bin/hardhat run scripts/submitScores.ts --network localhost
uvicorn backend.server:app --host 0.0.0.0 --port 8001

# Terminal 3
cd frontend && npm run dev
```

> The frontend reads all env vars from the root `.env` via `envDir` — no `frontend/.env` needed.

### Deploy to Sepolia

```bash
npm run setup:sepolia
npm run submit:sepolia
```

## Project Structure

```
├── backend/
│   ├── agents/           # AI model agents + storage
│   │   ├── fast_model_agent.py          # Grok / xAI
│   │   ├── balanced_model_agent.py      # DeepSeek V3
│   │   ├── high_quality_model_agent.py  # Claude Opus 4.7
│   │   ├── classifier.py                # Grok — task classification
│   │   ├── storage_agent.py             # 0G testnet upload
│   │   └── router.py
│   ├── council/          # Evaluation judges (Venice.ai)
│   │   ├── correctness_judge.py
│   │   ├── reasoning_judge.py
│   │   ├── safety_judge.py
│   │   ├── adversarial_critic.py
│   │   ├── efficiency_judge.py
│   │   └── final_aggregator.py
│   ├── server.py         # FastAPI server — /health, /run, auto score submission
│   ├── pipeline.py       # Orchestrates full run
│   ├── schemas.py        # Pydantic models
│   └── utils/
│       ├── claude_client.py    # Anthropic SDK client
│       ├── providers.py        # xAI, DeepSeek, Venice clients
│       └── hashing.py
├── contracts/
│   ├── AgentRegistry.sol
│   ├── ReputationTracker.sol
│   ├── RewardDistributor.sol
│   ├── RewardToken.sol
│   ├── Create2Deployer.sol
│   ├── ens/
│   │   ├── ENSRegistry.sol    # EIP-137 registry deployed locally
│   │   └── AddrResolver.sol   # addr(bytes32) resolver
│   ├── hooks/
│   │   └── ReputationHook.sol
│   └── interfaces/
│       └── IReputationTracker.sol
├── scripts/
│   ├── setup.ts          # Deploy all contracts + register agents
│   ├── submitScores.ts   # Send pipeline output to contracts
│   ├── og_upload.mjs     # 0G Storage upload (Node.js)
│   ├── og_download.mjs   # 0G Storage download (Node.js)
│   └── run_pipeline.py
├── frontend/             # React + Vite dashboard
│   └── src/
│       ├── App.tsx
│       ├── contracts.ts
│       ├── tasks.ts               # Predefined tasks (Erdős, crypto, algorithms)
│       ├── hooks/
│       └── components/
│           ├── TaskSelector.tsx   # Task picker + custom input + run button
│           ├── AgentCard.tsx
│           ├── TaskPanel.tsx
│           └── StatusBar.tsx
├── run_demo.sh           # End-to-end demo script
└── hardhat.config.ts
```
