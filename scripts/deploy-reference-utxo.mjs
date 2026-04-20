#!/usr/bin/env node
/**
 * Deploy bounty_escrow as a reference UTXO on Preview testnet.
 * Uses @meshsdk/core (WASM-based, no libsodium, PlutusV3 supported).
 *
 * Prerequisites:
 *   cd scripts && npm install
 *
 * Usage:
 *   node deploy-reference-utxo.mjs
 */

import { BlockfrostProvider, MeshWallet, MeshTxBuilder } from "@meshsdk/core";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { resolve, dirname } from "path";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BLOCKFROST_KEY  = process.env.BLOCKFROST_API_KEY   || "preview3tE9cQ5FjzUeb8e51cUdFSFnXG4NavNu";
const OPERATIONS_SKEY = process.env.OPERATIONS_SKEY_PATH || "/home/aiagent/wallets/preview/operations.skey";
const OPERATIONS_ADDR = "addr_test1vq3q6wgmc4jwh43mkfpj2nwdc3t22el3ma78twh8vjnse6st4wqf5";
const SCRIPT_ADDRESS  = "addr_test1wqamuks8ny99sd9umm4a2s200x7yuj2z0c5k8d4kqvamntcvc3c8e";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BLUEPRINT = resolve(__dirname, "../contracts/plutus.preview.json");

// ---------------------------------------------------------------------------
// Load blueprint
// ---------------------------------------------------------------------------

const blueprint = JSON.parse(readFileSync(BLUEPRINT, "utf8"));
const validator  = blueprint.validators[0];

if (!validator) {
  console.error("No validator found in plutus.preview.json.");
  process.exit(1);
}
if (validator.parameters?.length > 0) {
  console.error(`Validator still has ${validator.parameters.length} unapplied parameter(s).`);
  process.exit(1);
}

const compiledCode = validator.compiledCode;
console.log(`Validator  : ${validator.title}`);
console.log(`Script hash: ${validator.hash}`);

// ---------------------------------------------------------------------------
// Load Operations signing key
// cardano-cli skey cborHex = "5820" (CBOR header) + 32-byte private key hex
// MeshWallet "cli" type expects just the raw 32-byte hex (no prefix)
// ---------------------------------------------------------------------------

const skeyJson      = JSON.parse(readFileSync(OPERATIONS_SKEY, "utf8"));
const privateKeyHex = skeyJson.cborHex.slice(4); // strip "5820"

// ---------------------------------------------------------------------------
// Initialise provider and wallet
// ---------------------------------------------------------------------------

const provider = new BlockfrostProvider(BLOCKFROST_KEY);

const wallet = new MeshWallet({
  networkId: 0, // 0 = testnet (Preview)
  fetcher:    provider,
  submitter:  provider,
  key: {
    type:    "cli",
    payment: privateKeyHex,
  },
});

const walletAddress = await wallet.getChangeAddress();
console.log(`\nWallet     : ${walletAddress}`);

// ---------------------------------------------------------------------------
// Check balance
// ---------------------------------------------------------------------------

const utxos = await wallet.getUtxos();

if (utxos.length === 0) {
  console.error("\nNo UTxOs — fund the Operations wallet first:");
  console.error("  https://docs.cardano.org/cardano-testnet/tools/faucet  (select Preview)");
  console.error(`  Address: ${OPERATIONS_ADDR}`);
  process.exit(1);
}

const totalLovelace = utxos.reduce((sum, u) => {
  const ada = u.output.amount.find((a) => a.unit === "lovelace");
  return sum + BigInt(ada?.quantity ?? 0);
}, 0n);
console.log(`Balance    : ${Number(totalLovelace) / 1_000_000} tADA across ${utxos.length} UTxO(s)`);

// ---------------------------------------------------------------------------
// Build reference UTXO transaction
//
// Output 0: 5 tADA at Operations address, PlutusV3 script as reference script
// The Operations wallet controls this UTxO so it can be managed / replaced.
// ---------------------------------------------------------------------------

console.log("\nBuilding transaction...");

const txBuilder = new MeshTxBuilder({ fetcher: provider, evaluator: provider });

const unsignedTx = await txBuilder
  .txOut(OPERATIONS_ADDR, [{ unit: "lovelace", quantity: "5000000" }])
  .txOutReferenceScript(compiledCode, "V3")
  .changeAddress(OPERATIONS_ADDR)
  .selectUtxosFrom(utxos)
  .complete();

const signedTx  = await wallet.signTx(unsignedTx);
console.log("Submitting...");
const txHash    = await wallet.submitTx(signedTx);

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

console.log("\n✅ Reference UTXO deployed!");
console.log(`Tx hash    : ${txHash}`);
console.log(`Output #   : 0`);
console.log(`\n--- Add to backend/.env ---`);
console.log(`SCRIPT_REFERENCE_TX_HASH=${txHash}`);
console.log(`SCRIPT_REFERENCE_INDEX=0`);
console.log(`ESCROW_SCRIPT_ADDRESS=${SCRIPT_ADDRESS}`);
console.log(`PLATFORM_TREASURY_ADDRESS=addr_test1vz67vl7598kqvzvgcz2t43uxxa4mpq50dvkucyee8jsxz8g3wnc6e`);
console.log(`ARBITRATOR_ADDRESS=addr_test1vrma3fs8nwpn7mdt4n2rpk0s6he3r79uyzhgdqp7wflcrlqd7qv58`);
console.log(`PLATFORM_ADDRESS=${OPERATIONS_ADDR}`);
console.log(`NETWORK=Preview`);
console.log(`\nVerify: https://preview.cardanoscan.io/transaction/${txHash}`);
