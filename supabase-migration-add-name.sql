-- Migration: Add name column to questions table
-- Run this if you already have the questions table and want to add the name field

ALTER TABLE questions ADD COLUMN IF NOT EXISTS name TEXT;
