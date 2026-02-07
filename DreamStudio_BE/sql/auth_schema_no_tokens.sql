BEGIN;
END;

----------------------------
-- Extensions
----------------------------
CREATE EXTENSION IF NOT EXISTS pgcrypto;  -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS citext;    -- case-insensitive email


----------------------------
-- Helper Functions
----------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


----------------------------
-- Users
----------------------------

CREATE TABLE users (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email            CITEXT NOT NULL UNIQUE,
  first_name       TEXT,
  last_name        TEXT,
  photo_url        TEXT,
  email_verified   BOOLEAN NOT NULL DEFAULT FALSE,
  is_active        BOOLEAN NOT NULL DEFAULT TRUE,
  role             TEXT NOT NULL CHECK (role IN ('admin', 'user')) DEFAULT 'user',
  signup_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at    TIMESTAMPTZ,
  signup_ip        INET
);

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


----------------------------
-- Auth Identities
----------------------------

CREATE TABLE auth_identities (
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

DROP TRIGGER IF EXISTS trg_auth_identities_updated_at ON auth_identities;
CREATE TRIGGER trg_auth_identities_updated_at
BEFORE UPDATE ON auth_identities    
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE UNIQUE INDEX ux_auth_identity_provider_account
  ON auth_identities(provider, provider_user_id)
  WHERE provider = 'google' AND provider_user_id IS NOT NULL;

CREATE INDEX ix_auth_identities_email ON auth_identities(email);
CREATE INDEX ix_auth_identities_provider ON auth_identities(provider);


----------------------------
-- Goal Types
-- Templates for creating goals
----------------------------

CREATE TABLE goal_types (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,         
  description       TEXT,
  verification_type TEXT NOT NULL CHECK (
                     verification_type IN ('photo', 'quiz')
                   ),                     
  question_count    INT DEFAULT 5,      
  gpt_prompt        TEXT,                  
  metadata          JSONB DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_goal_types_updated_at ON goal_types;
CREATE TRIGGER trg_goal_types_updated_at
BEFORE UPDATE ON goal_types
FOR EACH ROW EXECUTE FUNCTION set_updated_at();


----------------------------
-- Goals
-- User-created goal instances
----------------------------

CREATE TABLE goals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  goal_type_id          UUID REFERENCES goal_types(id),
  title                 TEXT NOT NULL,    --"title": "Read the Bible",
  description           TEXT,             --"description": "Read a passage",
  user_input			      TEXT,             --"user_input": "Genesis 1" COULD BE WRONG BOOK FROM USER INPUT
  bounty_amount         INTEGER NOT NULL CHECK (bounty_amount > 0),  -- cents
  deadline              TIMESTAMPTZ NOT NULL,

  verification_type     TEXT NOT NULL CHECK (
                         verification_type IN ('photo', 'quiz')
                       ),

  status                TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'canceled', 'finalized', 'validating')), 
                        --Pending is the default when the goal is first created
  quiz_question_status  TEXT NOT NULL DEFAULT 'none'
                        CHECK (status IN ('pending', 'failed', 'created', 'none')),
  final_status          TEXT CHECK(final_status IN ('completed', 'failed')),
  finalized_at          TIMESTAMPTZ,
  
  stripe_setup_intent_id TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_goals_updated_at ON goals;
CREATE TRIGGER trg_goals_updated_at
BEFORE UPDATE ON goals
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX ix_goals_user_id ON goals(user_id);
CREATE INDEX ix_goals_status ON goals(status);
CREATE INDEX ix_goals_deadline ON goals(deadline);


----------------------------
-- Verifications
-- A single attempt to prove a goal was completed
----------------------------

CREATE TABLE verifications (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id            UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,

  type               TEXT NOT NULL CHECK (type IN ('photo', 'quiz')),
  result             TEXT NOT NULL DEFAULT 'pending'
                     CHECK (result IN ('pending', 'approved', 'rejected')),

  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS trg_verifications_updated_at ON verifications;
CREATE TRIGGER trg_verifications_updated_at
BEFORE UPDATE ON verifications
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX ix_verifications_goal_id ON verifications(goal_id);
CREATE INDEX ix_verifications_result ON verifications(result);


----------------------------
-- Photo Verification
----------------------------

CREATE TABLE verification_photos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id   UUID NOT NULL UNIQUE REFERENCES verifications(id) ON DELETE CASCADE,
  image_url         TEXT NOT NULL,
  metadata          JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);


----------------------------
-- Quiz Questions (Generated from GPT)
----------------------------

CREATE TABLE goal_quiz_questions (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id           UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE ,
  question          TEXT NOT NULL, 
  answer            TEXT NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_quiz_questions_goal_id ON verification_quiz_questions(goal_id);


----------------------------
-- Quiz Answers (User-submitted)
----------------------------

CREATE TABLE goal_quiz_user_input (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id   UUID NOT NULL REFERENCES verifications(id) ON DELETE CASCADE,
  question_id       UUID NOT NULL REFERENCES verification_quiz_questions(id),
  
  user_answer       TEXT NOT NULL,
  is_correct        BOOLEAN,
  
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_quiz_answers_verification_id ON verification_quiz_answers(verification_id);


----------------------------
-- Payments (Stripe-compatible)
----------------------------

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

DROP TRIGGER IF EXISTS trg_payments_updated_at ON payments;
CREATE TRIGGER trg_payments_updated_at
BEFORE UPDATE ON payments
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE INDEX ix_payments_user_id ON payments(user_id);
CREATE INDEX ix_payments_goal_id ON payments(goal_id);
CREATE INDEX ix_payments_status ON payments(status);


COMMIT;



---------------------------------------
-- Add later --

-- ---------- Email verification (manual signup flow) ----------
CREATE TABLE IF NOT EXISTS email_verifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token        TEXT NOT NULL UNIQUE,   -- random, single-use
  sent_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,
  consumed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_email_verifications_user ON email_verifications(user_id);

-- ---------- Password reset (manual signup flow) ----------
CREATE TABLE IF NOT EXISTS password_resets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token        TEXT NOT NULL UNIQUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL,
  used_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS ix_password_resets_user ON password_resets(user_id);


CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    user_id UUID NOT NULL
        REFERENCES users(id) ON DELETE CASCADE,

    token_hash TEXT NOT NULL UNIQUE,

    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DROP TABLE IF EXISTS auth_identities CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS goal_types CASCADE;
DROP TABLE IF EXISTS email_verifications CASCADE;
DROP TABLE IF EXISTS password_resets CASCADE;
DROP TABLE IF EXISTS goal_quiz_questions;
DROP TABLE IF EXISTS goal_quiz_user_input;
select * from users