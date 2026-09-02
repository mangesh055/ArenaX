-- Migration script to add new user registration fields
-- This script adds the enhanced user profile fields to existing database

-- Add new columns to users table
ALTER TABLE users 
ADD COLUMN branch VARCHAR(100) AFTER department,
ADD COLUMN division VARCHAR(50) AFTER branch,
ADD COLUMN roll_no VARCHAR(50) AFTER division,
ADD COLUMN college_name VARCHAR(255) AFTER roll_no,
ADD COLUMN prn VARCHAR(50) AFTER college_name,
ADD COLUMN mobile_no VARCHAR(20) AFTER prn;

-- Add new columns to team_members table
ALTER TABLE team_members 
ADD COLUMN name VARCHAR(255) AFTER email,
ADD COLUMN branch VARCHAR(100) AFTER name,
ADD COLUMN division VARCHAR(50) AFTER branch,
ADD COLUMN roll_no VARCHAR(50) AFTER division,
ADD COLUMN college_name VARCHAR(255) AFTER roll_no,
ADD COLUMN prn VARCHAR(50) AFTER college_name,
ADD COLUMN mobile_no VARCHAR(20) AFTER prn;

-- Add game column to sport room entries
ALTER TABLE sport_room_entries
ADD COLUMN game VARCHAR(100) AFTER prn;

-- Optional: Create an index for better query performance
CREATE INDEX idx_users_branch ON users(branch);
CREATE INDEX idx_team_members_email ON team_members(email);

-- If you want to migrate existing data, uncomment and modify below:
-- UPDATE users SET college_name = 'VIT' WHERE college_name IS NULL;
-- UPDATE users SET branch = 'Computer Science' WHERE branch IS NULL AND department = 'Computer Science';
