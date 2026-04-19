pub type BountyStatus {
  Open
  Awarded
  Disputed
  Expired
}

pub type BountyDatum {
  bounty_id: ByteArray,
  creator: ByteArray,
  reward_amount: Int,
  token_policy: ByteArray,
  token_name: ByteArray,
  platform_fee_percent: Int,
  deadline: Int,
  winner: Option<ByteArray>,
  status: BountyStatus,
}

pub type BountyAction {
  SubmitWinner { winner: ByteArray }
  ClaimReward
  Refund
  OpenDispute
  ResolveDispute { winner: ByteArray }
}
