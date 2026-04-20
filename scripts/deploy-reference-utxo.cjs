#!/usr/bin/env node
"use strict";
/**
 * Deploy bounty_escrow as a reference UTXO on Preview testnet.
 * Run as CJS (.cjs) to avoid libsodium-wrappers-sumo ESM bug in Node v22.
 *
 * Prerequisites:
 *   cd scripts && npm install
 *
 * Usage:
 *   node deploy-reference-utxo.cjs
 */

const { BlockfrostProvider, MeshWallet, MeshTxBuilder } = require("@meshsdk/core");
const { readFileSync } = require("fs");
const { resolve } = require("path");

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BLOCKFROST_KEY  = process.env.BLOCKFROST_API_KEY   || "preview3tE9cQ5FjzUeb8e51cUdFSFnXG4NavNu";
const OPERATIONS_SKEY = process.env.OPERATIONS_SKEY_PATH || "/home/aiagent/wallets/preview/operations.skey";
const OPERATIONS_ADDR = "addr_test1vq3q6wgmc4jwh43mkfpj2nwdc3t22el3ma78twh8vjnse6st4wqf5";
const SCRIPT_ADDRESS  = "addr_test1wqamuks8ny99sd9umm4a2s200x7yuj2z0c5k8d4kqvamntcvc3c8e";
const BLUEPRINT       = resolve(__dirname, "../contracts/plutus.preview.json");

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

(async () => {
  // Load blueprint
  const blueprint = JSON.parse(readFileSync(BLUEPRINT, "utf8"));
  const validator  = blueprint.validators[0];

  if (!validator) {
    console.error("No validator found in plutus.preview.json.");
    process.exit(1);
  }
  if (validator.parameters && validator.parameters.length > 0) {
    console.error(`Validator still has ${validator.parameters.length} unapplied parameter(s).`);
    process.exit(1);
  }

  // Aiken blueprint compiledCode is CBOR-wrapped flat bytes.
  // Mesh SDK expects raw flat bytes — strip the CBOR bytestring header.
  //   0x59 = bytestring, 2-byte length  → skip 6 hex chars (3 bytes)
  //   0x58 = bytestring, 1-byte length  → skip 4 hex chars (2 bytes)
  const rawCode = validator.compiledCode;
  const compiledCode = rawCode.startsWith("59") ? rawCode.slice(6)
                     : rawCode.startsWith("58") ? rawCode.slice(4)
                     : rawCode;

  console.log(`Validator  : ${validator.title}`);
  console.log(`Script hash: ${validator.hash}`);

  // Load Operations signing key
  // cardano-cli cborHex = "5820" + 32-byte private key hex
  // MeshWallet "cli" type expects the raw 32-byte hex (no "5820" prefix)
  const skeyJson      = JSON.parse(readFileSync(OPERATIONS_SKEY, "utf8"));
  const privateKeyHex = skeyJson.cborHex.slice(4);

  // Initialise provider and wallet
  const provider = new BlockfrostProvider(BLOCKFROST_KEY);

  const wallet = new MeshWallet({
    networkId: 0, // testnet / preview
    fetcher:    provider,
    submitter:  provider,
    key: {
      type:    "cli",
      payment: privateKeyHex,
    },
  });

  const walletAddress = await wallet.getChangeAddress();
  console.log(`\nWallet     : ${walletAddress}`);

  // Query UTxOs directly from the enterprise address (cardano-cli generates
  // enterprise addresses; MeshWallet derives a base address from the same key,
  // so wallet.getUtxos() looks at the wrong address).
  // Both addresses share the same payment key — signing still works.
  const utxos = await provider.fetchAddressUTxOs(OPERATIONS_ADDR);

  if (utxos.length === 0) {
    console.error("\nNo UTxOs at the Operations enterprise address:");
    console.error(`  ${OPERATIONS_ADDR}`);
    console.error("  Fund it at: https://docs.cardano.org/cardano-testnet/tools/faucet  (select Preview)");
    process.exit(1);
  }

  const totalLovelace = utxos.reduce((sum, u) => {
    const ada = u.output.amount.find((a) => a.unit === "lovelace");
    return sum + BigInt(ada ? ada.quantity : 0);
  }, BigInt(0));
  console.log(`Balance    : ${Number(totalLovelace) / 1_000_000} tADA across ${utxos.length} UTxO(s)`);

  // Build reference UTXO transaction
  console.log("\nBuilding transaction...");

  const txBuilder = new MeshTxBuilder({ fetcher: provider, evaluator: provider });

  const unsignedTx = await txBuilder
    .txOut(OPERATIONS_ADDR, [{ unit: "lovelace", quantity: "10000000" }])
    .txOutReferenceScript(compiledCode, "V3")
    .changeAddress(OPERATIONS_ADDR)
    .selectUtxosFrom(utxos)
    .complete();

  const signedTx = await wallet.signTx(unsignedTx);
  console.log("Submitting...");
  const txHash = await wallet.submitTx(signedTx);

  // Output
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
})();
