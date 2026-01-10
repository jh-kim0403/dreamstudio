
DELETE FROM users;
DELETE FROM auth_identities;

SELECT * FROM users;

SELECT * FROM auth_identities;

DROP TABLE IF EXISTS goal_types CASCADE;

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

INSERT INTO goal_types(name, description, verification_type, gpt_prompt) 
VALUES('Read the Bible', 'User will choose the Bible passage and answer questions regarding the passage', 
'quiz', 'Make ${count} questions about this text: ${passage}');

INSERT INTO goal_types(name, description, verification_type, gpt_prompt) 
VALUES('Go to the gym', 'User will upload a picture and the app will verify if the picture was taken at the gym', 
'photo', 'Does this photo show an indoor gym/fitness center (equipment, weights, machines)? Reply "gym" or "not_gym".');

DELETE FROM goal_types

SELECT * FROM goal_types;