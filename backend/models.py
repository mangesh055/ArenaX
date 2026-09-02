from datetime import datetime
from extensions import db


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.String(36), primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    name = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum('student', 'organizer', 'faculty', 'sport_authority'), default='student')
    department = db.Column(db.String(100))
    branch = db.Column(db.String(100))
    division = db.Column(db.String(50))
    roll_no = db.Column(db.String(50))
    college_name = db.Column(db.String(255))
    prn = db.Column(db.String(50))
    mobile_no = db.Column(db.String(20))
    year_of_study = db.Column(db.Integer)
    avatar_url = db.Column(db.Text)
    reputation_score = db.Column(db.Integer, default=100)
    is_banned = db.Column(db.Boolean, default=False)
    ban_reason = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    organizer_requests = db.relationship('OrganizerRequest', foreign_keys='OrganizerRequest.user_id', backref='user', lazy='dynamic')
    tournaments = db.relationship('Tournament', foreign_keys='Tournament.organizer_id', backref='organizer', lazy='dynamic')
    led_teams = db.relationship('Team', foreign_keys='Team.leader_id', backref='leader', lazy='dynamic')

    def to_dict(self):
        return {
            'id': self.id, 'email': self.email, 'name': self.name,
            'role': self.role, 'department': self.department, 'branch': self.branch,
            'division': self.division, 'roll_no': self.roll_no, 'college_name': self.college_name,
            'prn': self.prn, 'mobile_no': self.mobile_no,
            'year_of_study': self.year_of_study, 'avatar_url': self.avatar_url,
            'reputation_score': self.reputation_score, 'is_banned': self.is_banned,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class OrganizerRequest(db.Model):
    __tablename__ = 'organizer_requests'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    name = db.Column(db.String(255), nullable=False)
    department = db.Column(db.String(100), nullable=False)
    reason = db.Column(db.Text, nullable=False)
    experience = db.Column(db.Text, nullable=False)
    status = db.Column(db.Enum('pending', 'approved', 'rejected'), default='pending')
    reviewed_by = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='SET NULL'))
    review_note = db.Column(db.Text)
    reviewed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id, 'user_id': self.user_id, 'name': self.name,
            'department': self.department, 'reason': self.reason,
            'experience': self.experience, 'status': self.status,
            'review_note': self.review_note,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'user': self.user.to_dict() if self.user else None
        }


class Tournament(db.Model):
    __tablename__ = 'tournaments'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    organizer_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    description = db.Column(db.Text, nullable=False)
    category = db.Column(db.Enum('gaming', 'coding', 'sports', 'cultural', 'other'), nullable=False)
    mode = db.Column(db.Enum('offline'), default='offline')
    team_based = db.Column(db.Boolean, default=True)
    max_participants = db.Column(db.Integer, nullable=False)
    min_team_size = db.Column(db.Integer, default=1)
    max_team_size = db.Column(db.Integer, default=5)
    start_date = db.Column(db.DateTime, nullable=False)
    end_date = db.Column(db.DateTime, nullable=False)
    registration_deadline = db.Column(db.DateTime, nullable=False)
    rules = db.Column(db.Text)
    prize_pool = db.Column(db.Text)
    venue = db.Column(db.String(255))
    banner_url = db.Column(db.Text)
    status = db.Column(db.Enum('draft', 'pending_approval', 'published', 'ongoing', 'completed', 'cancelled'), default='draft')
    approved_by = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='SET NULL'))
    approved_at = db.Column(db.DateTime)
    rejection_reason = db.Column(db.Text)
    current_participants = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    teams = db.relationship('Team', backref='tournament', lazy='dynamic', cascade='all, delete-orphan')
    leaderboard = db.relationship('Leaderboard', backref='tournament', lazy='dynamic', cascade='all, delete-orphan')
    reports = db.relationship('Report', backref='tournament', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self, include_organizer=False):
        d = {
            'id': self.id, 'title': self.title, 'description': self.description,
            'category': self.category, 'mode': self.mode, 'team_based': self.team_based,
            'max_participants': self.max_participants, 'min_team_size': self.min_team_size,
            'max_team_size': self.max_team_size,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'registration_deadline': self.registration_deadline.isoformat() if self.registration_deadline else None,
            'rules': self.rules, 'prize_pool': self.prize_pool, 'venue': self.venue,
            'banner_url': self.banner_url, 'status': self.status,
            'current_participants': self.current_participants,
            'organizer_id': self.organizer_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
        if include_organizer and self.organizer:
            d['organizer'] = {'name': self.organizer.name, 'department': self.organizer.department}
        return d


class Team(db.Model):
    __tablename__ = 'teams'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    tournament_id = db.Column(db.Integer, db.ForeignKey('tournaments.id', ondelete='CASCADE'), nullable=False)
    leader_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    team_name = db.Column(db.String(255), nullable=False)
    status = db.Column(db.Enum('pending', 'confirmed', 'dropped', 'disqualified'), default='pending')
    verification_deadline = db.Column(db.DateTime, nullable=False)
    confirmed_members = db.Column(db.Integer, default=1)
    total_members = db.Column(db.Integer, default=1)
    registered_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    members = db.relationship('TeamMember', backref='team', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id, 'tournament_id': self.tournament_id,
            'leader_id': self.leader_id, 'team_name': self.team_name,
            'status': self.status,
            'verification_deadline': self.verification_deadline.isoformat() if self.verification_deadline else None,
            'confirmed_members': self.confirmed_members, 'total_members': self.total_members,
            'registered_at': self.registered_at.isoformat() if self.registered_at else None
        }


class TeamMember(db.Model):
    __tablename__ = 'team_members'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    team_id = db.Column(db.Integer, db.ForeignKey('teams.id', ondelete='CASCADE'), nullable=False)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='SET NULL'))
    email = db.Column(db.String(255), nullable=False)
    name = db.Column(db.String(255))
    branch = db.Column(db.String(100))
    division = db.Column(db.String(50))
    roll_no = db.Column(db.String(50))
    college_name = db.Column(db.String(255))
    prn = db.Column(db.String(50))
    mobile_no = db.Column(db.String(20))
    status = db.Column(db.Enum('invited', 'accepted', 'declined'), default='invited')
    is_leader = db.Column(db.Boolean, default=False)
    joined_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id, 'team_id': self.team_id, 'user_id': self.user_id,
            'email': self.email, 'name': self.name, 'branch': self.branch,
            'division': self.division, 'roll_no': self.roll_no, 'college_name': self.college_name,
            'prn': self.prn, 'mobile_no': self.mobile_no,
            'status': self.status, 'is_leader': self.is_leader,
            'joined_at': self.joined_at.isoformat() if self.joined_at else None
        }


class Invitation(db.Model):
    __tablename__ = 'invitations'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    team_id = db.Column(db.Integer, db.ForeignKey('teams.id', ondelete='CASCADE'), nullable=False)
    email = db.Column(db.String(255), nullable=False)
    token = db.Column(db.String(255), unique=True, nullable=False)
    status = db.Column(db.Enum('pending', 'accepted', 'declined', 'expired'), default='pending')
    expires_at = db.Column(db.DateTime, nullable=False)
    sent_at = db.Column(db.DateTime, default=datetime.utcnow)
    responded_at = db.Column(db.DateTime)


class Leaderboard(db.Model):
    __tablename__ = 'leaderboard'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    tournament_id = db.Column(db.Integer, db.ForeignKey('tournaments.id', ondelete='CASCADE'), nullable=False)
    team_id = db.Column(db.Integer, db.ForeignKey('teams.id', ondelete='SET NULL'))
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='SET NULL'))
    entry_name = db.Column(db.String(255), nullable=False)
    score = db.Column(db.Numeric(10, 2), default=0)
    rank_position = db.Column(db.Integer)
    notes = db.Column(db.Text)
    updated_by = db.Column(db.String(36), db.ForeignKey('users.id'), nullable=False)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id, 'tournament_id': self.tournament_id,
            'team_id': self.team_id, 'user_id': self.user_id,
            'entry_name': self.entry_name, 'score': float(self.score) if self.score else 0,
            'rank_position': self.rank_position, 'notes': self.notes,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None
        }


class Report(db.Model):
    __tablename__ = 'reports'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    reporter_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    tournament_id = db.Column(db.Integer, db.ForeignKey('tournaments.id', ondelete='CASCADE'), nullable=False)
    reason = db.Column(db.Enum('fake_tournament', 'misleading_info', 'inappropriate_content', 'spam', 'other'), nullable=False)
    description = db.Column(db.Text, nullable=False)
    status = db.Column(db.Enum('pending', 'reviewed', 'resolved', 'dismissed'), default='pending')
    reviewed_by = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='SET NULL'))
    resolution_note = db.Column(db.Text)
    reviewed_at = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id, 'reporter_id': self.reporter_id,
            'tournament_id': self.tournament_id, 'reason': self.reason,
            'description': self.description, 'status': self.status,
            'resolution_note': self.resolution_note,
            'reviewed_at': self.reviewed_at.isoformat() if self.reviewed_at else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


class Notification(db.Model):
    __tablename__ = 'notifications'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    title = db.Column(db.String(255), nullable=False)
    message = db.Column(db.Text, nullable=False)
    type = db.Column(db.Enum('info', 'success', 'warning', 'error'), default='info')
    read_status = db.Column(db.Boolean, default=False)
    related_type = db.Column(db.String(50))
    related_id = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id, 'title': self.title, 'message': self.message,
            'type': self.type, 'read_status': self.read_status,
            'related_type': self.related_type, 'related_id': self.related_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class SportRoomEntry(db.Model):
    __tablename__ = 'sport_room_entries'
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(255), nullable=False)
    prn = db.Column(db.String(50), nullable=False)
    game = db.Column(db.String(100))
    branch = db.Column(db.String(100), nullable=False)
    mobile_no = db.Column(db.String(20), nullable=False)
    in_time = db.Column(db.DateTime, nullable=False)
    out_time = db.Column(db.DateTime)
    duration_minutes = db.Column(db.Integer)  # Auto-calculated
    recorded_by = db.Column(db.String(36), db.ForeignKey('users.id', ondelete='SET NULL'))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    recorder = db.relationship('User', foreign_keys=[recorded_by])

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'prn': self.prn,
            'game': self.game,
            'branch': self.branch,
            'mobile_no': self.mobile_no,
            'in_time': self.in_time.isoformat() if self.in_time else None,
            'out_time': self.out_time.isoformat() if self.out_time else None,
            'duration_minutes': self.duration_minutes,
            'recorded_by': self.recorded_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
        }