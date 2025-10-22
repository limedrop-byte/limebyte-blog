-- Add embed_id column to posts table
-- This allows each post to have its own custom embed script
ALTER TABLE posts ADD COLUMN embed_id VARCHAR(255);
