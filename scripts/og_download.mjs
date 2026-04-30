/**
 * 0G Storage download helper.
 * Usage: node scripts/og_download.mjs <rootHash>
 * Output (stdout): raw file content
 */

import { Indexer } from "@0gfoundation/0g-ts-sdk";
import * as dotenv from "dotenv";
import * as os from "os";
import * as path from "path";
import * as fs from "fs";

dotenv.config();

const INDEXER_URL = process.env.OG_STORAGE_ENDPOINT || "https://indexer-storage-testnet-turbo.0g.ai";
const rootHash    = process.argv[2];

if (!rootHash) {
  process.stderr.write(JSON.stringify({ error: "Usage: og_download.mjs <rootHash>" }) + "\n");
  process.exit(1);
}

async function main() {
  const indexer = new Indexer(INDEXER_URL);
  const tmpPath = path.join(os.tmpdir(), `og_${rootHash.replace(/^0x/, "").slice(0, 12)}.bin`);

  const err = await indexer.download(rootHash, tmpPath, false);
  if (err) throw err;

  process.stdout.write(fs.readFileSync(tmpPath));
  fs.unlinkSync(tmpPath);
}

main().catch((err) => {
  process.stderr.write(JSON.stringify({ error: String(err) }) + "\n");
  process.exit(1);
});
