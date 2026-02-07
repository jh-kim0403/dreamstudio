
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
'photo', 'Does this photo show an indoor gym/fitness center (equipment, weights, machines)? Reply "gym" or "not_gym".');

DELETE FROM goal_types

SELECT * FROM goal_types;

SELECT * FROM goals;

ALTER TABLE verification_photos DROP COLUMN verification_type CASCADE;
ALTER TABLE verification_photos ALTER COLUMN s3_key SET NOT NULL;

ALTER TABLE verification_photos ADD COLUMN s3_key TEXT;

ALTER TABLE verification_photos RENAME COLUMN metadata TO meta;

SELECT * FROM verification_photos;

SELECT * FROM auth_identities;

SELECT * FROM goals;

SELECT * FROM goal_quiz_questions;
SELECT * FROM goal_quiz_user_input;
SELECT * FROM verifications;
DELETE FROM goals;
DELETE FROM goal_quiz_questions;
DELETE FROM verifications;