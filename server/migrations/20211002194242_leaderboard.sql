-- Add migration script here

CREATE TABLE IF NOT EXISTS leaderboard (
  id SERIAL PRIMARY KEY,
  score INTEGER NOT NULL,
  summary TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL
);

CREATE INDEX leaderboard_index ON leaderboard (score DESC, created_at ASC);
