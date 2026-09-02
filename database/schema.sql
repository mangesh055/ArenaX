-- ArenaX Database Schema
-- MySQL 8.0+

CREATE DATABASE IF NOT EXISTS arenax CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE arenax;

-- Users table
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,  -- Clerk user ID
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role ENUM('student', 'organizer', 'faculty') DEFAULT 'student',
    department VARCHAR(100),
    branch VARCHAR(100),
    division VARCHAR(50),
    roll_no VARCHAR(50),
    college_name VARCHAR(255),
    prn VARCHAR(50),
    mobile_no VARCHAR(20),
    year_of_study INT,
    avatar_url TEXT,
    reputation_score INT DEFAULT 100,
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
);

-- Organizer requests table
CREATE TABLE organizer_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    department VARCHAR(100) NOT NULL,
    reason TEXT NOT NULL,
    experience TEXT NOT NULL,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    reviewed_by VARCHAR(36),
    review_note TEXT,
    reviewed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_user (user_id)
);

-- Tournaments table
CREATE TABLE tournaments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    organizer_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    category ENUM('gaming', 'coding', 'sports', 'cultural', 'other') NOT NULL,
    mode ENUM('offline') DEFAULT 'offline',
    team_based BOOLEAN DEFAULT TRUE,
    max_participants INT NOT NULL,
    min_team_size INT DEFAULT 1,
    max_team_size INT DEFAULT 5,
    start_date DATETIME NOT NULL,
    end_date DATETIME NOT NULL,
    registration_deadline DATETIME NOT NULL,
    rules TEXT,
    prize_pool TEXT,
    venue VARCHAR(255),
    banner_url TEXT,
    status ENUM('draft','pending_approval','published','ongoing','completed','cancelled') DEFAULT 'draft',
    approved_by VARCHAR(36),
    approved_at TIMESTAMP NULL,
    rejection_reason TEXT,
    current_participants INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_category (category),
    INDEX idx_organizer (organizer_id),
    INDEX idx_start_date (start_date)
);

-- Teams table
CREATE TABLE teams (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tournament_id INT NOT NULL,
    leader_id VARCHAR(36) NOT NULL,
    team_name VARCHAR(255) NOT NULL,
    status ENUM('pending', 'confirmed', 'dropped', 'disqualified') DEFAULT 'pending',
    verification_deadline DATETIME NOT NULL,
    confirmed_members INT DEFAULT 1,
    total_members INT DEFAULT 1,
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (leader_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_team_tournament (tournament_id, leader_id),
    UNIQUE KEY unique_team_name (tournament_id, team_name),
    INDEX idx_status (status),
    INDEX idx_leader (leader_id)
);

-- Team members table
CREATE TABLE team_members (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_id INT NOT NULL,
    user_id VARCHAR(36),
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    branch VARCHAR(100),
    division VARCHAR(50),
    roll_no VARCHAR(50),
    college_name VARCHAR(255),
    prn VARCHAR(50),
    mobile_no VARCHAR(20),
    status ENUM('invited', 'accepted', 'declined') DEFAULT 'invited',
    is_leader BOOLEAN DEFAULT FALSE,
    joined_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_member_team (team_id, email),
    INDEX idx_email (email),
    INDEX idx_status (status)
);

-- Invitations table
CREATE TABLE invitations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    team_id INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    token VARCHAR(255) UNIQUE NOT NULL,
    status ENUM('pending', 'accepted', 'declined', 'expired') DEFAULT 'pending',
    expires_at DATETIME NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    responded_at TIMESTAMP NULL,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_email (email),
    INDEX idx_status (status)
);

-- Leaderboard table
CREATE TABLE leaderboard (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tournament_id INT NOT NULL,
    team_id INT,
    user_id VARCHAR(36),
    entry_name VARCHAR(255) NOT NULL,
    score DECIMAL(10,2) DEFAULT 0,
    rank_position INT,
    notes TEXT,
    updated_by VARCHAR(36) NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (updated_by) REFERENCES users(id),
    INDEX idx_tournament (tournament_id),
    INDEX idx_rank (rank_position)
);

-- Reports table
CREATE TABLE reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reporter_id VARCHAR(36) NOT NULL,
    tournament_id INT NOT NULL,
    reason ENUM('fake_tournament','misleading_info','inappropriate_content','spam','other') NOT NULL,
    description TEXT NOT NULL,
    status ENUM('pending','reviewed','resolved','dismissed') DEFAULT 'pending',
    reviewed_by VARCHAR(36),
    resolution_note TEXT,
    reviewed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tournament_id) REFERENCES tournaments(id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status (status),
    INDEX idx_tournament (tournament_id)
);

-- Notifications table
CREATE TABLE notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('info','success','warning','error') DEFAULT 'info',
    read_status BOOLEAN DEFAULT FALSE,
    related_type VARCHAR(50),
    related_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_read (user_id, read_status)
);

-- Sample Data
INSERT INTO users (id, email, name, role, department, reputation_score) VALUES
('faculty_001', 'admin@vit.edu', 'Dr. Rajesh Kumar', 'faculty', 'Computer Science', 100),
('org_001', 'organizer1@vit.edu', 'Priya Sharma', 'organizer', 'Information Technology', 95),
('org_002', 'organizer2@vit.edu', 'Arjun Nair', 'organizer', 'Electronics', 88),
('student_001', 'student1@vit.edu', 'Kavya Reddy', 'student', 'Computer Science', 100),
('student_002', 'student2@vit.edu', 'Rohan Mehta', 'student', 'Mechanical', 100),
('student_003', 'student3@vit.edu', 'Sneha Iyer', 'student', 'Civil', 100);

INSERT INTO tournaments (organizer_id, title, description, category, team_based, max_participants, min_team_size, max_team_size, start_date, end_date, registration_deadline, rules, prize_pool, venue, status) VALUES
('org_001', 'CodeStorm 2025', 'The ultimate competitive programming tournament for VIT students. Test your problem-solving skills across 3 rounds of increasing difficulty.', 'coding', FALSE, 100, 1, 1, '2025-08-15 09:00:00', '2025-08-15 18:00:00', '2025-08-10 23:59:59', '1. No plagiarism\n2. Individual participation only\n3. 3 rounds of 90 minutes each\n4. Top 3 get prizes', '1st: ₹10,000 | 2nd: ₹6,000 | 3rd: ₹3,000', 'Tech Park Auditorium, VIT', 'published'),
('org_001', 'FIFA Tournament 2025', 'Inter-department FIFA 24 gaming tournament. Form your team of 2 and battle for the championship.', 'gaming', TRUE, 64, 2, 2, '2025-08-20 10:00:00', '2025-08-22 20:00:00', '2025-08-18 23:59:59', '1. Teams of 2\n2. Double elimination format\n3. FIFA 24 on PS5\n4. Punctuality mandatory', '1st: ₹5,000 | 2nd: ₹2,500', 'Gaming Zone, Student Center', 'published'),
('org_002', 'Cricket Premier League', 'VIT inter-department cricket tournament. 11-player teams battle it out in the T20 format.', 'sports', TRUE, 160, 11, 15, '2025-09-01 08:00:00', '2025-09-15 20:00:00', '2025-08-25 23:59:59', '1. T20 format\n2. Teams of 11-15\n3. BCCI rules apply\n4. No professionals allowed', 'Trophy + ₹15,000', 'VIT Cricket Ground', 'published'),
('org_002', 'Hackathon 2025', '24-hour hackathon to build innovative solutions for real-world problems. Form teams and hack away!', 'coding', TRUE, 200, 3, 5, '2025-09-10 09:00:00', '2025-09-11 09:00:00', '2025-09-05 23:59:59', '1. Teams of 3-5\n2. 24-hour duration\n3. Theme revealed at start\n4. Judged on innovation, execution, presentation', '1st: ₹25,000 | 2nd: ₹15,000 | 3rd: ₹10,000', 'Innovation Hub, VIT', 'pending_approval');
