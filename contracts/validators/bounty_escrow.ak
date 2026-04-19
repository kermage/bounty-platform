use aiken/collection/list
use aiken/crypto.{VerificationKeyHash}
use aiken/interval
use cardano/address.{VerificationKey}
use cardano/assets
use cardano/transaction.{Output, OutputReference, Transaction}
use types/bounty.{
  Awarded, BountyAction, BountyDatum, BountyStatus, ClaimReward, Open,
  OpenDispute, Refund, ResolveDispute, SubmitWinner,
}

// ---------------------------------------------------------------------------
// Bounty Escrow Validator
//
// Validator parameters (curried at script address derivation time):
//   - platform_treasury: VerificationKeyHash  — receives the platform fee
//   - arbitrator:        VerificationKeyHash  — the only key that can resolve disputes
//
// Datum:   BountyDatum  (see src/types/bounty.ak)
// Redeemer: BountyAction
// ---------------------------------------------------------------------------

validator bounty_escrow(
  platform_treasury: VerificationKeyHash,
  arbitrator: VerificationKeyHash,
) {
  spend(
    datum: Option<BountyDatum>,
    redeemer: BountyAction,
    _own_ref: OutputReference,
    self: Transaction,
  ) {
    // Reject spends with no datum (funds locked by mistake)
    expect Some(d) = datum

    let signatories = self.extra_signatories

    when redeemer is {
      // ------------------------------------------------------------------
      // SubmitWinner { winner }
      // Creator nominates a winner while the bounty is still open and live.
      // The contract only validates the authorisation; the updated datum
      // (with winner set and status → Awarded) must be produced in the
      // continuing output by the transaction builder.
      // ------------------------------------------------------------------
      SubmitWinner { winner: _ } ->
        and {
          // Bounty must still be in Open state
          is_open(d.status),
          // Only the creator may select a winner
          list.has(signatories, d.creator),
          // Transaction validity window must end before the deadline,
          // guaranteeing it cannot be submitted after the deadline.
          self.validity_range |> interval.is_entirely_before(d.deadline),
        }

      // ------------------------------------------------------------------
      // ClaimReward
      // Winner withdraws their share of the escrow.
      // Enforces:
      //   - winner's signature
      //   - net reward output to winner   (reward * (100 - fee%) / 100)
      //   - platform fee output to treasury (reward * fee% / 100)
      // ------------------------------------------------------------------
      ClaimReward ->
        when d.winner is {
          None -> False
          Some(winner_pkh) -> {
            let net_reward =
              d.reward_amount * (100 - d.platform_fee_percent) / 100
            let fee_amount =
              d.reward_amount * d.platform_fee_percent / 100
            and {
              // Winner must sign the transaction
              list.has(signatories, winner_pkh),
              // Net reward must reach the winner
              has_lovelace_output_to_pkh(self.outputs, winner_pkh, net_reward),
              // Platform fee must reach the treasury
              has_lovelace_output_to_pkh(
                self.outputs,
                platform_treasury,
                fee_amount,
              ),
            }
          }
        }

      // ------------------------------------------------------------------
      // Refund
      // Creator reclaims funds after the deadline has passed with no winner.
      // Transaction validity range must start after the deadline so we know
      // time has genuinely elapsed.
      // ------------------------------------------------------------------
      Refund ->
        and {
          // Only the creator may refund
          list.has(signatories, d.creator),
          // Tx must be provably submitted after the deadline
          self.validity_range |> interval.is_entirely_after(d.deadline),
        }

      // ------------------------------------------------------------------
      // OpenDispute
      // Either party (creator or nominated winner) may flag a dispute
      // while the bounty is Open or Awarded.
      // ------------------------------------------------------------------
      OpenDispute ->
        and {
          // Can only dispute an open or awarded bounty
          or {
            is_open(d.status),
            is_awarded(d.status),
          },
          // Must be signed by creator OR the existing winner
          or {
            list.has(signatories, d.creator),
            has_winner_signer(signatories, d.winner),
          },
        }

      // ------------------------------------------------------------------
      // ResolveDispute { winner }
      // Platform arbitrator resolves — must sign; pays out to the
      // designated winner address.  The transaction builder is responsible
      // for constructing the correct payout output.
      // ------------------------------------------------------------------
      ResolveDispute { winner: winner_pkh } ->
        and {
          // Only the platform arbitrator may resolve
          list.has(signatories, arbitrator),
          // Net payout (after fee) must reach the designated winner
          // Fee is still collected by the treasury even in disputes
          has_lovelace_output_to_pkh(
            self.outputs,
            winner_pkh,
            d.reward_amount * (100 - d.platform_fee_percent) / 100,
          ),
          has_lovelace_output_to_pkh(
            self.outputs,
            platform_treasury,
            d.reward_amount * d.platform_fee_percent / 100,
          ),
        }
    }
  }

  // Reject any non-spend purpose (minting, staking, etc.)
  else(_) {
    fail
  }
}

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/// True iff the bounty is in Open status.
fn is_open(status: BountyStatus) -> Bool {
  when status is {
    Open -> True
    _ -> False
  }
}

/// True iff the bounty is in Awarded status.
fn is_awarded(status: BountyStatus) -> Bool {
  when status is {
    Awarded -> True
    _ -> False
  }
}

/// True iff the optional winner has signed the transaction.
fn has_winner_signer(
  signatories: List<VerificationKeyHash>,
  winner: Option<ByteArray>,
) -> Bool {
  when winner is {
    None -> False
    Some(winner_pkh) -> list.has(signatories, winner_pkh)
  }
}

/// True iff at least one output sends at least `min_lovelace` lovelace to the
/// given verification-key-hash address (any staking credential is tolerated).
fn has_lovelace_output_to_pkh(
  outputs: List<Output>,
  pkh: VerificationKeyHash,
  min_lovelace: Int,
) -> Bool {
  list.any(
    outputs,
    fn(output) {
      when output.address.payment_credential is {
        VerificationKey(vkh) ->
          and {
            vkh == pkh,
            assets.quantity_of(output.value, assets.ada_policy_id, assets.ada_asset_name) >= min_lovelace,
          }
        _ -> False
      }
    },
  )
}
