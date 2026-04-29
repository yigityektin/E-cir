#!/usr/bin/env bash
# End-to-end demo runner
# Usage: ./run_demo.sh [--skip-node] [--task "your task text"]
set -e

BLUE='\033[0;34m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'

step() { echo -e "\n${BLUE}▶ $1${NC}"; }
ok()   { echo -e "${GREEN}✓ $1${NC}"; }
warn() { echo -e "${YELLOW}⚠ $1${NC}"; }

SKIP_NODE=false
TASK_TEXT="Write a Python function that validates Ethereum addresses and returns a short summary of whether the address is checksummed, lowercase, or invalid."

while [[ $# -gt 0 ]]; do
  case $1 in
    --skip-node) SKIP_NODE=true; shift ;;
    --task) TASK_TEXT="$2"; shift 2 ;;
    *) echo "Unknown arg: $1"; exit 1 ;;
  esac
done

# ── 0. Verify prerequisites ──────────────────────────────────────────────────
step "Checking prerequisites"
command -v python3 >/dev/null || { echo -e "${RED}python3 not found${NC}"; exit 1; }
command -v node >/dev/null    || { echo -e "${RED}node not found${NC}"; exit 1; }
[[ -f .env ]] || { warn ".env not found — copying .env.example"; cp .env.example .env; }
ok "Prerequisites OK"

# ── 1. Start Hardhat node (background) ──────────────────────────────────────
if [[ "$SKIP_NODE" == false ]]; then
  step "Starting Hardhat local node"
  ./node_modules/.bin/hardhat node > /tmp/hardhat.log 2>&1 &
  HARDHAT_PID=$!
  echo "Hardhat PID: $HARDHAT_PID"
  sleep 3
  ok "Hardhat node running (log: /tmp/hardhat.log)"
fi

# ── 2. Deploy contracts + register agents ───────────────────────────────────
step "Deploying contracts and registering agents"
SETUP_OUT=$(./node_modules/.bin/hardhat run scripts/setup.ts --network hardhat 2>&1)
echo "$SETUP_OUT"

# Extract deployed addresses — match only lines where address (0x...) is last token
parse_addr() { echo "$SETUP_OUT" | grep "$1" | grep -oE '0x[0-9a-fA-F]{40}' | head -1; }
REWARD_TOKEN=$(parse_addr "RewardToken:")
REPUTATION_TRACKER=$(parse_addr "ReputationTracker:")
AGENT_REGISTRY=$(parse_addr "AgentRegistry:")
REWARD_DISTRIBUTOR=$(parse_addr "RewardDistributor:")

if [[ -z "$REWARD_DISTRIBUTOR" ]]; then
  echo -e "${RED}Could not parse contract addresses from setup output. Aborting.${NC}"
  kill $HARDHAT_PID 2>/dev/null || true
  exit 1
fi

# Write addresses to .env
update_env() {
  local key=$1 val=$2
  if grep -q "^${key}=" .env 2>/dev/null; then
    sed -i.bak "s|^${key}=.*|${key}=${val}|" .env
  else
    echo "${key}=${val}" >> .env
  fi
}

update_env "REWARD_TOKEN_ADDRESS" "$REWARD_TOKEN"
update_env "REPUTATION_TRACKER_ADDRESS" "$REPUTATION_TRACKER"
update_env "AGENT_REGISTRY_ADDRESS" "$AGENT_REGISTRY"
update_env "REWARD_DISTRIBUTOR_ADDRESS" "$REWARD_DISTRIBUTOR"

# Also update VITE_ vars for frontend
update_env "VITE_REWARD_TOKEN_ADDRESS" "$REWARD_TOKEN"
update_env "VITE_REPUTATION_TRACKER_ADDRESS" "$REPUTATION_TRACKER"
update_env "VITE_AGENT_REGISTRY_ADDRESS" "$AGENT_REGISTRY"
update_env "VITE_REWARD_DISTRIBUTOR_ADDRESS" "$REWARD_DISTRIBUTOR"
update_env "VITE_RPC_URL" "http://127.0.0.1:8545"

# Copy .env to frontend for Vite
cp .env frontend/.env

ok "Contracts deployed and agents registered"
echo "  RewardToken:       $REWARD_TOKEN"
echo "  ReputationTracker: $REPUTATION_TRACKER"
echo "  AgentRegistry:     $AGENT_REGISTRY"
echo "  RewardDistributor: $REWARD_DISTRIBUTOR"

# ── 3. Run backend pipeline ──────────────────────────────────────────────────
step "Running AI agent pipeline"
[[ -z "${ANTHROPIC_API_KEY:-}" ]] && { echo -e "${RED}ANTHROPIC_API_KEY is not set in .env — required for real Claude calls${NC}"; exit 1; }
TASK_TEXT="$TASK_TEXT" .venv/bin/python scripts/run_pipeline.py 2>/dev/null || \
  TASK_TEXT="$TASK_TEXT" python3 scripts/run_pipeline.py
ok "Pipeline complete — outputs/final_result.json written"

# ── 4. Submit scores to contracts ────────────────────────────────────────────
step "Submitting scores to RewardDistributor"
./node_modules/.bin/hardhat run scripts/submitScores.ts --network hardhat
ok "Scores submitted, rewards distributed, reputation updated"

# ── 5. Start frontend ────────────────────────────────────────────────────────
step "Starting React dashboard"
echo -e "${GREEN}Dashboard: http://localhost:5173${NC}"
echo "(Press Ctrl+C to stop)"
cd frontend && npm run dev
