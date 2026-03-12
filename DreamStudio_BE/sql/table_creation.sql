CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;    -- case-insensitive email

CREATE TABLE IF NOT EXISTS users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email            CITEXT NOT NULL UNIQUE,
  first_name       TEXT,
  last_name        TEXT,
  photo_url        TEXT,
  bounty_balance INTEGER NOT NULL DEFAULT 0 CHECK (bounty_balance >= 0),
  email_verified   BOOLEAN NOT NULL DEFAULT FALSE,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  role             TEXT NOT NULL CHECK (role IN ('admin', 'user')) DEFAULT 'user',
  signup_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at    TIMESTAMPTZ,
  signup_ip        INET
);

CREATE TABLE IF NOT EXISTS auth_identities (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider             TEXT NOT NULL CHECK (provider IN ('password','google')),
  provider_user_id     TEXT,
  email                CITEXT NOT NULL,
  password_hash        TEXT,
  password_updated_at  TIMESTAMPTZ,
  password_needs_reset BOOLEAN NOT NULL DEFAULT FALSE,
  meta                 JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider)
);


CREATE TABLE IF NOT EXISTS goal_types (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,         
  description       TEXT,
  verification_type TEXT NOT NULL CHECK (
                     verification_type IN ('photo', 'quiz')
                   ),                     
  question_count    INT DEFAULT 5,      
  gpt_prompt        TEXT,                  
  meta              JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_type_id          UUID REFERENCES goal_types(id),
  title                 TEXT NOT NULL,    --"title": "Read the Bible",
  description           TEXT,             --"description": "Read a passage",
  user_input			      TEXT,             --"user_input": "Genesis 1" COULD BE WRONG BOOK FROM USER INPUT
  bounty_amount         INTEGER NOT NULL CHECK (bounty_amount >= 0),  -- cents
  deadline              TIMESTAMPTZ NOT NULL,

  status                TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'canceled', 'finalized', 'in validation', 'submitted')), 
                        --Pending is the default when the goal is first created
  quiz_question_status  TEXT NOT NULL DEFAULT 'none'
                        CHECK (quiz_question_status IN ('pending', 'failed', 'created', 'none')),
  verification_status          TEXT NOT NULL DEFAULT 'not started' CHECK(verification_status IN ('completed', 'failed', 'not started')),
  finalized_at          TIMESTAMPTZ,

  stripe_setup_intent_id TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS verifications (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id            UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,

  type               TEXT NOT NULL CHECK (type IN ('photo', 'quiz')),
  result             TEXT NOT NULL DEFAULT 'pending'
                     CHECK (result IN ('pending', 'approved', 'rejected')),

  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);


CREATE TABLE IF NOT EXISTS verification_photos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id   UUID NOT NULL UNIQUE REFERENCES verifications(id) ON DELETE CASCADE,
  image_url         TEXT NOT NULL,
  meta              JSONB NOT NULL DEFAULT '{}'::jsonb,
  s3_key            TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);



CREATE TABLE IF NOT EXISTS goal_quiz_questions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id           UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE ,
  question          TEXT NOT NULL, 
  answer            TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS goal_quiz_user_input (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id   UUID NOT NULL REFERENCES verifications(id) ON DELETE CASCADE,
  question_id       UUID NOT NULL REFERENCES goal_quiz_questions(id),
  
  user_answer       TEXT NOT NULL,
  is_correct        BOOLEAN,
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_id                  UUID REFERENCES goals(id) ON DELETE SET NULL,

  amount                   INTEGER NOT NULL CHECK (amount > 0), -- cents
  currency                 TEXT NOT NULL DEFAULT 'usd',

  reason                   TEXT NOT NULL CHECK (
                           reason IN ('goal_failed', 'manual_charge', 'refund')
                         ),

  status                   TEXT NOT NULL DEFAULT 'pending'
                           CHECK (status IN ('pending','succeeded','failed','canceled','requires_action')),

  stripe_payment_intent_id TEXT,
  stripe_setup_intent_id   TEXT,
  stripe_charge_id         TEXT,

  created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bounty_ledger (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_id    UUID REFERENCES goals(id) ON DELETE SET NULL,
  amount     INTEGER NOT NULL, -- cents, positive or negative
  type       TEXT NOT NULL CHECK (type IN ('fund', 'hold', 'release', 'forfeit', 'refund')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bounty_transactions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount             INTEGER NOT NULL, -- cents
  direction          TEXT NOT NULL CHECK (direction IN ('deposit', 'withdrawal')),
  status             TEXT NOT NULL CHECK (status IN ('pending', 'succeeded', 'failed')),

  -- Stripe references (nullable depending on direction/status)
  payment_intent_id  TEXT,
  charge_id          TEXT,
  transfer_id        TEXT,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bounty_tx_user_id ON bounty_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_bounty_tx_status ON bounty_transactions(status);
CREATE INDEX IF NOT EXISTS idx_bounty_tx_created_at ON bounty_transactions(created_at);

CREATE TABLE IF NOT EXISTS weekly_maintenance_costs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start        TIMESTAMPTZ NOT NULL,
  week_end          TIMESTAMPTZ NOT NULL,
  aws_cost_cents    INTEGER NOT NULL DEFAULT 0 CHECK (aws_cost_cents >= 0),
  openai_cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (openai_cost_cents >= 0),
  fee_amount_cents  INTEGER NOT NULL DEFAULT 0 CHECK (fee_amount_cents >= 0),
  source            TEXT NOT NULL DEFAULT 'automated',
  notes             TEXT, 
  meta              JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (week_start, week_end)
);

CREATE INDEX IF NOT EXISTS idx_weekly_maintenance_costs_week_start
  ON weekly_maintenance_costs(week_start);

CREATE TABLE IF NOT EXISTS weekly_pool_distributions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start             TIMESTAMPTZ NOT NULL,
  week_end               TIMESTAMPTZ NOT NULL,
  failed_pool_cents      INTEGER NOT NULL DEFAULT 0 CHECK (failed_pool_cents >= 0),
  maintenance_fee_cents  INTEGER NOT NULL DEFAULT 0 CHECK (maintenance_fee_cents >= 0),
  net_pool_cents         INTEGER NOT NULL DEFAULT 0 CHECK (net_pool_cents >= 0),
  distributed_total_cents INTEGER NOT NULL DEFAULT 0 CHECK (distributed_total_cents >= 0),
  successful_goals_count INTEGER NOT NULL DEFAULT 0 CHECK (successful_goals_count >= 0),
  meta                   JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (week_start, week_end)
);

CREATE TABLE IF NOT EXISTS weekly_pool_distribution_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  distribution_id     UUID NOT NULL REFERENCES weekly_pool_distributions(id) ON DELETE CASCADE,
  goal_id             UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_bounty_cents   INTEGER NOT NULL CHECK (goal_bounty_cents > 0),
  payout_cents        INTEGER NOT NULL CHECK (payout_cents >= 0),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (distribution_id, goal_id)
);

CREATE INDEX IF NOT EXISTS idx_weekly_pool_distribution_items_user_id
  ON weekly_pool_distribution_items(user_id);


CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    refresh_token TEXT NOT NULL UNIQUE,

    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
