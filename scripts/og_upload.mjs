/**
 * 0G Storage upload — prints JSON result to stdout immediately after on-chain TX
 * is submitted (no wait for storage node sync). Segment upload continues in background.
 *
 * Usage: echo '<json>' | node scripts/og_upload.mjs
 * Stdout: { "uri": "0g://<rootHash>", "rootHash": "0x...", "txHash": "0x..." }
 */

import { Indexer, MemData } from "@0gfoundation/0g-ts-sdk";
import { ethers } from "ethers";
import * as dotenv from "dotenv";

dotenv.config();

const RPC_URL     = process.env.OG_RPC_URL       || "https://evmrpc-testnet.0g.ai";
const PRIVATE_KEY = process.env.OG_PRIVATE_KEY;
const INDEXER_URL = process.env.OG_STORAGE_ENDPOINT || "https://indexer-storage-testnet-turbo.0g.ai";

if (!PRIVATE_KEY) {
  process.stderr.write(JSON.stringify({ error: "OG_PRIVATE_KEY not set" }) + "\n");
  process.exit(1);
}

// ── Redirect all SDK console output to stderr so stdout stays clean ──────────
const _write = (msg) => process.stderr.write(String(msg) + "\n");
const origLog = console.log;
console.log   = (...a) => _write(a.join(" "));
console.warn  = (...a) => _write(a.join(" "));
console.error = (...a) => _write(a.join(" "));

// ── Intercept TX submission and print result early ────────────────────────────
let rootHashGlobal = null;
let resultWritten  = false;

const origStdout = process.stdout.write.bind(process.stdout);

function tryPrintResult(txHash) {
  if (resultWritten || !rootHashGlobal || !txHash) return;
  resultWritten = true;
  origStdout(JSON.stringify({
    uri:      `0g://${rootHashGlobal}`,
    rootHash: rootHashGlobal,
    txHash,
  }) + "\n");
}

// SDK calls console.log("Transaction submitted, hash: 0x...")
const patchedLog = (...args) => {
  const msg = args.join(" ");
  _write(msg);
  const m = msg.match(/[Tt]ransaction submitted[^0x]*(0x[0-9a-fA-F]{64})/);
  if (m) tryPrintResult(m[1]);
};
console.log = patchedLog;

async function main() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const raw = Buffer.concat(chunks);

  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer   = new ethers.Wallet(PRIVATE_KEY, provider);
  const indexer  = new Indexer(INDEXER_URL);

  const file = new MemData(raw);

  // Compute merkle root locally (fast)
  const [tree, treeErr] = await file.merkleTree();
  if (treeErr) throw treeErr;
  rootHashGlobal = tree.rootHash();

  // Upload — result is printed to stdout as soon as TX is submitted
  const [result, err] = await indexer.upload(file, RPC_URL, signer, {
    finalityRequired: false,
    expectedReplica: 1,
  });
  if (err) throw err;

  // Fallback: print if not already printed (e.g. log format changed)
  const txHash = result?.txHash ?? result?.txHashes?.[0];
  tryPrintResult(txHash);
}

main().catch((err) => {
  if (!resultWritten) {
    origStdout(JSON.stringify({ error: String(err) }) + "\n");
  }
  process.exit(1);
});
