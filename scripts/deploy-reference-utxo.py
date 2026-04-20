#!/usr/bin/env python3
"""
Deploy bounty_escrow as a reference UTXO on Preview testnet.
Uses PyCardano which natively supports PlutusV3 and Aiken blueprint format.

Prerequisites:
  pip install pycardano

Usage:
  python3 deploy-reference-utxo.py
"""

import json
import os
import sys
from pathlib import Path

try:
    from pycardano import (
        BlockFrostChainContext,
        Network,
        TransactionBuilder,
        TransactionOutput,
        PaymentSigningKey,
        PaymentVerificationKey,
        Address,
        PlutusV3Script,
    )
    from blockfrost import ApiUrls
except ImportError:
    print("PyCardano not found. Install it with:  pip install pycardano")
    sys.exit(1)

# ---------------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------------

BLOCKFROST_KEY  = os.getenv("BLOCKFROST_API_KEY", "preview3tE9cQ5FjzUeb8e51cUdFSFnXG4NavNu")
SKEY_PATH       = os.getenv("OPERATIONS_SKEY_PATH", "/home/aiagent/wallets/preview/operations.skey")
SCRIPT_ADDRESS  = "addr_test1wqamuks8ny99sd9umm4a2s200x7yuj2z0c5k8d4kqvamntcvc3c8e"

SCRIPT_DIR = Path(__file__).resolve().parent
BLUEPRINT  = SCRIPT_DIR.parent / "contracts" / "plutus.preview.json"

# ---------------------------------------------------------------------------
# Load blueprint
# ---------------------------------------------------------------------------

blueprint = json.loads(BLUEPRINT.read_text())
validator  = blueprint["validators"][0]

if validator.get("parameters"):
    print(f"Validator still has {len(validator['parameters'])} unapplied parameter(s). Apply them first.")
    sys.exit(1)

# PyCardano's PlutusV3Script accepts the compiledCode bytes directly
# (CBOR-wrapped flat bytes, as produced by Aiken)
script = PlutusV3Script(bytes.fromhex(validator["compiledCode"]))

print(f"Validator  : {validator['title']}")
print(f"Script hash: {validator['hash']}")

# ---------------------------------------------------------------------------
# Load Operations signing key (cardano-cli JSON format)
# PyCardano's PaymentSigningKey.load() parses the cardano-cli skey file
# ---------------------------------------------------------------------------

signing_key      = PaymentSigningKey.load(SKEY_PATH)
verification_key = PaymentVerificationKey.from_signing_key(signing_key)
ops_addr         = Address(payment_part=verification_key.hash(), network=Network.TESTNET)

print(f"\nAddress    : {ops_addr}")

# ---------------------------------------------------------------------------
# Connect to Preview testnet via Blockfrost
# ---------------------------------------------------------------------------

print("Connecting to Blockfrost (Preview)...")
chain_context = BlockFrostChainContext(
    project_id=BLOCKFROST_KEY,
    base_url=ApiUrls.preview.value,
)

# ---------------------------------------------------------------------------
# Check balance
# ---------------------------------------------------------------------------

utxos = chain_context.utxos(str(ops_addr))

if not utxos:
    print("\nNo UTxOs found — fund the Operations wallet first:")
    print("  https://docs.cardano.org/cardano-testnet/tools/faucet  (select Preview)")
    print(f"  Address: {ops_addr}")
    sys.exit(1)

total_lovelace = sum(u.output.amount.coin for u in utxos)
print(f"Balance    : {total_lovelace / 1_000_000} tADA across {len(utxos)} UTxO(s)")

# ---------------------------------------------------------------------------
# Build transaction
# Places 10 ADA at the Operations address with the PlutusV3 script
# attached as a reference script (CIP-0033).
# ---------------------------------------------------------------------------

print("\nBuilding transaction...")

builder = TransactionBuilder(chain_context)
builder.add_input_address(ops_addr)
builder.add_output(
    TransactionOutput(
        address=ops_addr,
        amount=10_000_000,  # 10 ADA (covers minimum UTXO for large reference script)
        script=script,
    )
)

tx = builder.build_and_sign(
    signing_keys=[signing_key],
    change_address=ops_addr,
)

# ---------------------------------------------------------------------------
# Submit
# ---------------------------------------------------------------------------

print("Submitting...")
tx_id = chain_context.submit_tx(tx)

# ---------------------------------------------------------------------------
# Output
# ---------------------------------------------------------------------------

print(f"\n✅ Reference UTXO deployed!")
print(f"Tx hash    : {tx_id}")
print(f"Output #   : 0")
print(f"\n--- Add to backend/.env ---")
print(f"SCRIPT_REFERENCE_TX_HASH={tx_id}")
print(f"SCRIPT_REFERENCE_INDEX=0")
print(f"ESCROW_SCRIPT_ADDRESS={SCRIPT_ADDRESS}")
print(f"PLATFORM_TREASURY_ADDRESS=addr_test1vz67vl7598kqvzvgcz2t43uxxa4mpq50dvkucyee8jsxz8g3wnc6e")
print(f"ARBITRATOR_ADDRESS=addr_test1vrma3fs8nwpn7mdt4n2rpk0s6he3r79uyzhgdqp7wflcrlqd7qv58")
print(f"PLATFORM_ADDRESS=addr_test1vq3q6wgmc4jwh43mkfpj2nwdc3t22el3ma78twh8vjnse6st4wqf5")
print(f"NETWORK=Preview")
print(f"\nVerify: https://preview.cardanoscan.io/transaction/{tx_id}")
