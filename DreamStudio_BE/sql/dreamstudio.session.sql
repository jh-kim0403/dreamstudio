
DELETE FROM users;
DELETE FROM auth_identities;

SELECT * FROM users;

SELECT * FROM auth_identities;

DROP TABLE IF EXISTS goals CASCADE;
DROP TABLE IF EXISTS verification_quiz_answers CASCADE;

SELECT * FROM goal_types;
INSERT INTO goal_types(name, description, verification_type, gpt_prompt) 
VALUES('Read the Bible', 'User will choose the Bible passage and answer questions regarding the passage', 
'quiz', 'Return the response as JSON. Generate ${count} True/False questions with answers about this bible passage: ${passage}');

INSERT INTO goal_types(name, description, verification_type, gpt_prompt) 
VALUES('Go to the gym', 'User will upload a picture and the app will verify if the picture was taken at the gym', 
'photo', 'You are checking whether a photo was taken in a gym. Return JSON: {"is_true": boolean, "confidence": number, "reason": string}.');

INSERT INTO goal_types(name, description, verification_type, gpt_prompt)
VALUES('Go to class', 'User will upload a picture, and the app will verify if the picture was taken in a college class',
'photo', 'You are checking whether a photo was taken in a college class. Return JSON: {"is_true": boolean, "confidence": number, "reason": string}.');

DELETE FROM goal_types

SELECT * FROM goal_types;

ALTER TABLE verification_photos DROP COLUMN verification_type CASCADE;
ALTER TABLE verification_photos ALTER COLUMN s3_key SET NOT NULL;

ALTER TABLE users ADD COLUMN bounty_balance INTEGER NOT NULL DEFAULT 0 CHECK (bounty_balance >= 0); 

ALTER TABLE verification_photos RENAME COLUMN metadata TO meta;

SELECT * FROM verification_photos;

SELECT * FROM auth_identities;

SELECT title, description, status, verification_status FROM goals;

SELECT * FROM goal_quiz_questions;
SELECT * FROM goal_quiz_user_input;
SELECT * FROM verifications;
DELETE FROM goals;
DELETE FROM goal_quiz_questions;
DELETE FROM verifications;

SELECT
  g.*,
  v_latest.id          AS verification_id,
  v_latest.type        AS verification_type,
  v_latest.result      AS verification_result,
  v_latest.updated_at  AS verification_updated_at
FROM goals g
LEFT JOIN LATERAL (
  SELECT v.*
  FROM verifications v
  WHERE v.goal_id = g.id
  ORDER BY v.updated_at DESC
  LIMIT 1
) v_latest ON TRUE
WHERE g.deadline >= now();

SELECT * FROM bounty_transactions;
SELECT * FROM bounty_ledger;
SELECT bounty_balance FROM users;
DELETE FROM bounty_transactions;
DELETE FROM bounty_ledger;

UPDATE users
SET bounty_balance = 500
WHERE users.email = 'kjh9643@gmail.com';

SELECT *
FROM weekly_maintenance_costs;

SELECT * 
FROM weekly_pool_distributions
DELETE 
FROM weekly_pool_distributions

SELECT *
FROM weekly_pool_distribution_items

SELECT * FROM goals;

BEGIN;

-- 20 failed goals
WITH pools AS (
  SELECT
    array_agg(id ORDER BY id) AS user_ids,
    (SELECT array_agg(id ORDER BY id) FROM goal_types) AS goal_type_ids
  FROM users
),
failed_src AS (
  SELECT *
  FROM (VALUES
    (1, 500),(2,600),(3,700),(4,800),(5,900),
    (6,1000),(7,1100),(8,1200),(9,1300),(10,1400),
    (11,500),(12,600),(13,700),(14,800),(15,900),
    (16,1000),(17,1100),(18,1200),(19,1300),(20,1400)
  ) v(n, bounty)
)
INSERT INTO goals (
  user_id, goal_type_id, title, description, user_input, bounty_amount,
  deadline, status, quiz_question_status, verification_status, finalized_at,
  created_at, updated_at
)
SELECT
  p.user_ids[((f.n - 1) % cardinality(p.user_ids)) + 1],
  p.goal_type_ids[((f.n - 1) % cardinality(p.goal_type_ids)) + 1],
  'TEST FAILED GOAL #' || f.n,
  'Deterministic failed goal',
  'failed-input-' || f.n,
  f.bounty,
  now() - interval '15 days',
  'finalized',
  'none',
  'failed',
  now() - interval '14 days' + make_interval(mins => f.n),
  now() - interval '20 days',
  now() - interval '14 days' + make_interval(mins => f.n)
FROM failed_src f
CROSS JOIN pools p;

-- 80 successful goals
WITH pools AS (
  SELECT
    array_agg(id ORDER BY id) AS user_ids,
    (SELECT array_agg(id ORDER BY id) FROM goal_types) AS goal_type_ids
  FROM users
),
success_src AS (
  SELECT
    gs AS n,
    (300 + ((gs - 1) % 18) * 100) AS bounty
  FROM generate_series(1, 80) gs
)
INSERT INTO goals (
  user_id, goal_type_id, title, description, user_input, bounty_amount,
  deadline, status, quiz_question_status, verification_status, finalized_at,
  created_at, updated_at
)
SELECT
  p.user_ids[((s.n - 1) % cardinality(p.user_ids)) + 1],
  p.goal_type_ids[((s.n + 2 - 1) % cardinality(p.goal_type_ids)) + 1],
  'TEST SUCCESS GOAL #' || s.n,
  'Deterministic successful goal',
  'success-input-' || s.n,
  s.bounty,
  now() - interval '15 days',
  'finalized',
  'none',
  'completed',
  now() - interval '14 days' + make_interval(mins => (100 + s.n)),
  now() - interval '20 days',
  now() - interval '14 days' + make_interval(mins => (100 + s.n))
FROM success_src s
CROSS JOIN pools p;

COMMIT;


SELECT
  finalized_at,
  finalized_at AT TIME ZONE 'UTC' AS finalized_at_utc,
  finalized_at >= '2026-02-09T00:00:00+00'::timestamptz AS ge_start,
  finalized_at <  '2026-02-19T00:00:00+00'::timestamptz AS lt_end
FROM goals
