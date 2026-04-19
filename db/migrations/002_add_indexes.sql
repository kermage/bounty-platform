CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_bounties_creator_id ON bounties(creator_id);
CREATE INDEX idx_bounties_status ON bounties(status);
CREATE INDEX idx_submissions_bounty_id ON submissions(bounty_id);
CREATE INDEX idx_submissions_submitter_id ON submissions(submitter_id);
CREATE INDEX idx_disputes_status ON disputes(status);
CREATE INDEX idx_treasury_transactions_bounty_id ON treasury_transactions(bounty_id);
CREATE INDEX idx_feature_flags_enabled ON feature_flags(enabled);
