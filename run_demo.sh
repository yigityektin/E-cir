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

# ── 0. Prerequisites ─────────────────────────────────────────────────────────
step "Checking prerequisites"
command -v python3 >/dev/null || { echo -e "${RED}python3 not found${NC}"; exit 1; }
command -v node    >/dev/null || { echo -e "${RED}node not found${NC}"; exit 1; }
[[ -f .env ]] || { warn ".env not found — copying .env.example"; cp .env.example .env; }

# Load .env into the current shell so bash can read API keys
set -a
# shellcheck disable=SC1091
source .env
set +a

ok "Prerequisites OK"

# ── 1. Hardhat node ──────────────────────────────────────────────────────────
if [[ "$SKIP_NODE" == false ]]; then
  step "Starting Hardhat local node"

  # Kill any existing process on port 8545 to ensure fresh state
  EXISTING_PID=$(lsof -ti tcp:8545 2>/dev/null || true)
  if [[ -n "$EXISTING_PID" ]]; then
    warn "Killing existing process on port 8545 (PID $EXISTING_PID)"
    kill "$EXISTING_PID" 2>/dev/null || true
    sleep 1
  fi

  ./node_modules/.bin/hardhat node > /tmp/hardhat.log 2>&1 &
  HARDHAT_PID=$!
  echo "Hardhat PID: $HARDHAT_PID"

  # Wait until the node is accepting connections (up to 30s)
  for i in $(seq 1 30); do
    if curl -sf -X POST http://127.0.0.1:8545 \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
        > /dev/null 2>&1; then
      break
    fi
    sleep 1
  done

  if ! curl -sf -X POST http://127.0.0.1:8545 \
      -H "Content-Type: application/json" \
      -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
      > /dev/null 2>&1; then
    echo -e "${RED}Hardhat node failed to start. Check /tmp/hardhat.log${NC}"
    exit 1
  fi

  ok "Hardhat node running (log: /tmp/hardhat.log)"
fi

# ── 2. Deploy contracts + register agents ────────────────────────────────────
step "Deploying contracts and registering agents"
SETUP_OUT=$(./node_modules/.bin/hardhat run scripts/setup.ts --network localhost 2>&1)
echo "$SETUP_OUT"

parse_addr() { echo "$SETUP_OUT" | grep "$1" | grep -oE '0x[0-9a-fA-F]{40}' | head -1; }
REWARD_TOKEN=$(parse_addr "RewardToken:")
REPUTATION_TRACKER=$(parse_addr "ReputationTracker:")
AGENT_REGISTRY=$(parse_addr "AgentRegistry:")
REWARD_DISTRIBUTOR=$(parse_addr "RewardDistributor:")
POOL_MANAGER=$(parse_addr "PoolManager:")
REPUTATION_HOOK=$(parse_addr "ReputationHook:")
ENS_REGISTRY=$(parse_addr "ENSRegistry:")

if [[ -z "$REWARD_DISTRIBUTOR" ]]; then
  echo -e "${RED}Could not parse contract addresses. Aborting.${NC}"
  kill "$HARDHAT_PID" 2>/dev/null || true
  exit 1
fi

update_env() {
  local key=$1 val=$2
  if grep -q "^${key}=" .env 2>/dev/null; then
    sed -i.bak "s|^${key}=.*|${key}=${val}|" .env
  else
    echo "${key}=${val}" >> .env
  fi
}

update_env "REWARD_TOKEN_ADDRESS"     "$REWARD_TOKEN"
update_env "REPUTATION_TRACKER_ADDRESS" "$REPUTATION_TRACKER"
update_env "AGENT_REGISTRY_ADDRESS"   "$AGENT_REGISTRY"
update_env "REWARD_DISTRIBUTOR_ADDRESS" "$REWARD_DISTRIBUTOR"
update_env "VITE_REWARD_TOKEN_ADDRESS"        "$REWARD_TOKEN"
update_env "VITE_REPUTATION_TRACKER_ADDRESS"  "$REPUTATION_TRACKER"
update_env "VITE_AGENT_REGISTRY_ADDRESS"      "$AGENT_REGISTRY"
update_env "VITE_REWARD_DISTRIBUTOR_ADDRESS"  "$REWARD_DISTRIBUTOR"
update_env "VITE_POOL_MANAGER_ADDRESS"        "$POOL_MANAGER"
update_env "VITE_REPUTATION_HOOK_ADDRESS"     "$REPUTATION_HOOK"
update_env "VITE_RPC_URL" "http://127.0.0.1:8545"
update_env "VITE_API_URL" "http://localhost:8000"
update_env "VITE_ENS_REGISTRY_ADDRESS" "$ENS_REGISTRY"
# No cp needed — vite.config.ts reads envDir from project root

ok "Contracts deployed and agents registered"
echo "  RewardToken:       $REWARD_TOKEN"
echo "  ReputationTracker: $REPUTATION_TRACKER"
echo "  AgentRegistry:     $AGENT_REGISTRY"
echo "  RewardDistributor: $REWARD_DISTRIBUTOR"

# ── 3. Backend pipeline ───────────────────────────────────────────────────────
step "Running AI agent pipeline"

# Re-source .env to pick up freshly written contract addresses
set -a; source .env; set +a

PYTHON=python3
[[ -x .venv/bin/python ]] && PYTHON=.venv/bin/python

TASK_TEXT="$TASK_TEXT" "$PYTHON" scripts/run_pipeline.py
ok "Pipeline complete — outputs/final_result.json written"

# ── 4. Submit scores to contracts ─────────────────────────────────────────────
step "Submitting scores to RewardDistributor"
./node_modules/.bin/hardhat run scripts/submitScores.ts --network localhost
ok "Scores submitted, rewards distributed, reputation updated"

# ── 5. Backend API server ─────────────────────────────────────────────────────
step "Starting backend API server"
PYTHON=python3
[[ -x .venv/bin/python ]] && PYTHON=.venv/bin/python

"$PYTHON" -m uvicorn backend.server:app --host 0.0.0.0 --port 8001 &
API_PID=$!
echo "API PID: $API_PID"
sleep 2
ok "Backend API running at http://localhost:8001"

# ── 6. Frontend ───────────────────────────────────────────────────────────────
step "Starting React dashboard"
echo -e "${GREEN}Dashboard: http://localhost:5173${NC}"
echo -e "${GREEN}API:       http://localhost:8000${NC}"
echo "(Press Ctrl+C to stop)"
cd frontend && npm run dev
