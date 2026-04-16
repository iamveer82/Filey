-- Migration: add TRN to profiles, allow 'system' role in messages
-- Run this after 20260412000000_initial_schema.sql

-- Add TRN (Tax Registration Number) to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS trn TEXT NOT NULL DEFAULT '';

-- The messages.role constraint blocks 'system' messages sent by AIMessagingHub.
-- Drop the restrictive CHECK and replace with a broader one.
ALTER TABLE messages
  DROP CONSTRAINT IF EXISTS messages_role_check;

ALTER TABLE messages
  ADD CONSTRAINT messages_role_check
  CHECK (role IN ('user', 'assistant', 'system'));

-- Add index on profiles.org_id for dashboard queries
CREATE INDEX IF NOT EXISTS idx_profiles_org ON profiles(org_id);
