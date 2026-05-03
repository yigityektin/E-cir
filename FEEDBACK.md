# Uniswap v4 Builder Feedback

Project: **E-cir — AI Agent Marketplace**
Integration: Uniswap v4 PoolManager + ReputationHook with dynamic swap fees based on on-chain AI agent reputation scores.

---

## What We Built

We deployed a Uniswap v4 ETH/AIPERF liquidity pool with a custom `ReputationHook` that intercepts every `beforeSwap` call and overrides the pool fee based on the swapper's on-chain reputation tier (derived from AI task performance scores). High-performing agents pay 0.05% (PLATINUM), low-reputation addresses pay 0.30% (BRONZE). This makes swap cost a function of verifiable AI quality — the hook reads live reputation state from our `ReputationTracker` contract on every swap.

---

## What Worked Well

**Hook permission system via address bits** is an elegant design. Encoding hook capabilities directly into the contract address means the PoolManager can verify permissions in a single `&` operation at zero storage cost. Once we understood the bit layout, implementing it was straightforward.

**`@uniswap/v4-core` npm package** ships with Foundry build artifacts (`out/PoolManager.sol/PoolManager.json`) that include ABI and bytecode. Being able to `JSON.parse` the artifact and deploy via `ethers.ContractFactory` was a workable escape hatch for Hardhat environments.

**Dynamic fee flag** (`0x800000`) on pool initialization works cleanly — passing it as the `fee` field in `PoolKey` lets the hook override fees on every swap without the pool having a fixed rate hardcoded at initialization.

**`sqrtPriceX96` math** for a 1:1 initial price ratio (`79228162514264337593543950336n`) is well-established and the constant is easy to verify independently.

---

## Bugs Encountered

**PoolManager has no Hardhat artifact.** The `@uniswap/v4-core` package is built with Foundry, so `npx hardhat compile` produces no artifact for it. We worked around this by reading `node_modules/@uniswap/v4-core/out/PoolManager.sol/PoolManager.json` at runtime and deploying via raw bytecode. This is brittle — if the package layout changes, the path breaks silently.

**No official TypeScript CREATE2 salt miner.** Uniswap v4 hooks must be deployed at an address satisfying specific bit conditions. There is no official tooling for this in JavaScript/TypeScript. We wrote our own loop (`for i = 0n; ; i++`) computing `ethers.getCreate2Address(deployer, salt, initCodeHash)` and checking `address & 0x3FFF === 0x0080`. This ran ~35,000 iterations synchronously and caused the Hardhat node TCP connection to drop (ECONNRESET) because the Node.js event loop was blocked. Fixed by yielding every 500 iterations with `await new Promise(r => setTimeout(r, 0))` — a hack that shouldn't be necessary if official tooling existed.

**`initialize` return value is itself a transaction.** On our local Hardhat setup, `poolManager.initialize(poolKey, sqrtPriceX96)` returned a transaction promise that needed two awaits (`await (await poolManager.initialize(...)).wait()`). This is inconsistent with how other Hardhat contract calls behave and took time to debug.

**Hook constructor ABI encoding.** The `ReputationHook` constructor takes `(address poolManager, address reputationTracker, address owner)`. Building the init code requires manually ABI-encoding constructor args and concatenating with bytecode (`ethers.concat([bytecode, encodedArgs])`). There is no documentation on how to do this correctly in ethers.js v6 for Uniswap v4 hooks — we assembled it from first principles.

---

## Documentation Gaps

**No end-to-end Hardhat deployment guide for v4.** All official examples use Foundry. For teams building on Hardhat (still the most common Solidity dev environment), there is no documented path for deploying PoolManager, mining a valid hook salt, deploying the hook via CREATE2, and initializing a pool. We had to reverse-engineer each step from source code.

**Hook flag bit layout is not in a single reference.** The mapping of hook permission bits (e.g. `beforeSwap = 1 << 7 = 0x0080`, `afterSwap = 1 << 6`, etc.) is defined in `Hooks.sol` but not surfaced in any developer-facing documentation page. A simple table in the docs would save hours.

**`DYNAMIC_FEE_FLAG = 0x800000` is undocumented outside source code.** We found it by grepping through the v4-core source. It is not mentioned in any deployment guide or hook tutorial.

**No documentation on CREATE2 deployer pattern for hooks.** We had to write our own `Create2Deployer.sol` (`deploy(bytes32 salt, bytes memory bytecode)`) because there is no reference implementation or canonical address for a CREATE2 factory compatible with v4 hook deployment.

---

## Desired Features

**An official `@uniswap/v4-deploy` npm package** with pre-compiled Hardhat-compatible artifacts for PoolManager, a TypeScript `mineHookSalt(deployer, initCodeHash, permissions)` utility, and a `deployHook(factory, hook, args)` helper would dramatically reduce the barrier to v4 hook development outside Foundry.

**A `HookFlags` TypeScript enum or constant map** exported from `@uniswap/v4-core` so developers don't need to read Solidity source to find bit positions.

**Hardhat plugin** (`hardhat-uniswap-v4`) that adds `hre.uniswap.deployPoolManager()`, `hre.uniswap.mineHookSalt()`, and `hre.uniswap.initializePool()` tasks — analogous to what `hardhat-deploy` does for general contract deployment.

**A v4 hook template repo** targeting Hardhat + ethers.js v6, covering: hook deployment via CREATE2, permission bit verification, pool initialization with the hook, and a minimal `beforeSwap` override — the same content that exists for Foundry but missing entirely for the JS ecosystem.
