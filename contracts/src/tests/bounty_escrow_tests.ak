// ---------------------------------------------------------------------------
// Bounty Escrow — Unit Tests
//
// Tests are written against pure helper functions (not full ScriptContext mocks)
// to keep things fast and deterministic.  The validator's on-chain behaviour
// for time checks and output checks relies on Cardano primitives that are
// difficult to mock without a full transaction builder — those paths are
// covered by off-chain integration tests (see backend/src/__tests__/).
// ---------------------------------------------------------------------------

use bounty_platform/types/bounty.{
  Awarded, BountyDatum, Disputed, Expired, Open,
}

// ---------------------------------------------------------------------------
// Mock data helpers
// ---------------------------------------------------------------------------

fn mock_creator() -> ByteArray {
  #"cafe0001"
}

fn mock_winner() -> ByteArray {
  #"cafe0002"
}

fn mock_platform() -> ByteArray {
  #"cafe0003"
}

fn mock_arbitrator() -> ByteArray {
  #"cafe0004"
}

fn mock_random() -> ByteArray {
  #"deadbeef"
}

/// A standard open bounty with a far-future deadline.
fn mock_open_datum() -> BountyDatum {
  BountyDatum {
    bounty_id: #"deadbeef",
    creator: mock_creator(),
    reward_amount: 100_000_000,
    token_policy: #"c0ff",
    token_name: #"55534e4d",
    platform_fee_percent: 3,
    deadline: 9_999_999_999_999,
    winner: None,
    status: Open,
  }
}

/// An awarded bounty with the winner already set.
fn mock_awarded_datum() -> BountyDatum {
  BountyDatum {
    ..mock_open_datum(),
    winner: Some(mock_winner()),
    status: Awarded,
  }
}

// ---------------------------------------------------------------------------
// Pure validation helpers (mirror the logic in the validator)
// These are tested in isolation; the validator wires them to ScriptContext.
// ---------------------------------------------------------------------------

fn check_submit_winner(
  datum: BountyDatum,
  signer: ByteArray,
  current_time: Int,
) -> Bool {
  datum.status == Open && datum.creator == signer && current_time < datum.deadline
}

fn check_claim_reward(datum: BountyDatum, signer: ByteArray) -> Bool {
  when datum.winner is {
    None -> False
    Some(w) -> w == signer
  }
}

fn check_refund(datum: BountyDatum, signer: ByteArray, current_time: Int) -> Bool {
  datum.creator == signer && current_time > datum.deadline
}

fn check_open_dispute(datum: BountyDatum, signer: ByteArray) -> Bool {
  let valid_status = datum.status == Open || datum.status == Awarded
  let valid_signer =
    datum.creator == signer || check_winner_signer(datum.winner, signer)
  valid_status && valid_signer
}

fn check_winner_signer(winner: Option<ByteArray>, signer: ByteArray) -> Bool {
  when winner is {
    None -> False
    Some(w) -> w == signer
  }
}

fn check_resolve_dispute(signer: ByteArray, arbitrator: ByteArray) -> Bool {
  signer == arbitrator
}

// ---------------------------------------------------------------------------
// Tests: SubmitWinner
// ---------------------------------------------------------------------------

/// Creator signs before deadline → valid
test submit_winner_valid() {
  check_submit_winner(mock_open_datum(), mock_creator(), 1_000_000)
}

/// Wrong signer → rejected
test submit_winner_invalid_wrong_signer() {
  !check_submit_winner(mock_open_datum(), mock_random(), 1_000_000)
}

/// At or after deadline → rejected (boundary: time equals deadline)
test submit_winner_invalid_at_deadline() {
  !check_submit_winner(mock_open_datum(), mock_creator(), 9_999_999_999_999)
}

/// After deadline → rejected
test submit_winner_invalid_after_deadline() {
  !check_submit_winner(mock_open_datum(), mock_creator(), 10_000_000_000_000)
}

/// Bounty already awarded → rejected
test submit_winner_invalid_wrong_status() {
  !check_submit_winner(mock_awarded_datum(), mock_creator(), 1_000_000)
}

// ---------------------------------------------------------------------------
// Tests: ClaimReward
// ---------------------------------------------------------------------------

/// Correct winner claims → valid
test claim_reward_valid() {
  check_claim_reward(mock_awarded_datum(), mock_winner())
}

/// No winner set → rejected
test claim_reward_invalid_no_winner() {
  !check_claim_reward(mock_open_datum(), mock_winner())
}

/// Wrong signer tries to claim → rejected
test claim_reward_invalid_wrong_signer() {
  !check_claim_reward(mock_awarded_datum(), mock_random())
}

// ---------------------------------------------------------------------------
// Tests: Refund
// ---------------------------------------------------------------------------

/// Creator refunds after deadline → valid
test refund_valid() {
  check_refund(mock_open_datum(), mock_creator(), 10_000_000_000_000)
}

/// Before deadline → rejected
test refund_invalid_before_deadline() {
  !check_refund(mock_open_datum(), mock_creator(), 1_000_000)
}

/// Wrong signer after deadline → rejected
test refund_invalid_wrong_signer() {
  !check_refund(mock_open_datum(), mock_random(), 10_000_000_000_000)
}

// ---------------------------------------------------------------------------
// Tests: OpenDispute
// ---------------------------------------------------------------------------

/// Creator opens dispute on open bounty → valid
test open_dispute_valid_creator_open() {
  check_open_dispute(mock_open_datum(), mock_creator())
}

/// Creator opens dispute on awarded bounty → valid
test open_dispute_valid_creator_awarded() {
  check_open_dispute(mock_awarded_datum(), mock_creator())
}

/// Winner opens dispute on awarded bounty → valid
test open_dispute_valid_winner_awarded() {
  check_open_dispute(mock_awarded_datum(), mock_winner())
}

/// Disputed status → rejected (only Open or Awarded)
test open_dispute_invalid_disputed_status() {
  let datum =
    BountyDatum { ..mock_open_datum(), status: Disputed }
  !check_open_dispute(datum, mock_creator())
}

/// Expired status → rejected
test open_dispute_invalid_expired_status() {
  let datum =
    BountyDatum { ..mock_open_datum(), status: Expired }
  !check_open_dispute(datum, mock_creator())
}

/// Random third party → rejected
test open_dispute_invalid_random_signer() {
  !check_open_dispute(mock_open_datum(), mock_random())
}

// ---------------------------------------------------------------------------
// Tests: ResolveDispute
// ---------------------------------------------------------------------------

/// Arbitrator resolves → valid
test resolve_dispute_valid() {
  check_resolve_dispute(mock_arbitrator(), mock_arbitrator())
}

/// Non-arbitrator tries to resolve → rejected
test resolve_dispute_invalid_creator() {
  !check_resolve_dispute(mock_creator(), mock_arbitrator())
}

/// Non-arbitrator (platform key) tries → rejected
test resolve_dispute_invalid_platform() {
  !check_resolve_dispute(mock_platform(), mock_arbitrator())
}

// ---------------------------------------------------------------------------
// Tests: Fee calculation sanity
// ---------------------------------------------------------------------------

/// 3% of 100 ADA = 3 ADA fee, 97 ADA net
test fee_calculation_correct() {
  let reward = 100_000_000
  let fee_pct = 3
  let fee = reward * fee_pct / 100
  let net = reward * (100 - fee_pct) / 100
  and {
    fee == 3_000_000,
    net == 97_000_000,
    fee + net == reward,
  }
}
