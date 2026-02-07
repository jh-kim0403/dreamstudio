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
  question_id       UUID NOT NULL REFERENCES verification_quiz_questions(id),
  
  user_answer       TEXT NOT NULL,
  is_correct        BOOLEAN,
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
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

COMMIT;
