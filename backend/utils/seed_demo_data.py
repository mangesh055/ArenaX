import sys
from pathlib import Path
from datetime import datetime, timedelta

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from app import create_app
from extensions import db
from models import (
    Invitation,
    Leaderboard,
    Notification,
    OrganizerRequest,
    Report,
    Team,
    TeamMember,
    Tournament,
    User,
)


def dt(value):
    return datetime.strptime(value, "%Y-%m-%d %H:%M:%S")


def ensure_user(user_id, email, name, role="student", department=None):
    user = db.session.get(User, user_id)
    if not user:
        user = User(
            id=user_id,
            email=email,
            name=name,
            role=role,
            department=department,
            reputation_score=100,
        )
        db.session.add(user)
        return 1, 0

    user.email = email
    user.name = name
    user.role = role
    user.department = department
    return 0, 1


def ensure_team(tournament_title, leader_id, team_name, status="confirmed"):
    tournament = Tournament.query.filter_by(title=tournament_title).first()
    if not tournament:
        raise ValueError(f"Tournament not found: {tournament_title}")

    team = Team.query.filter_by(tournament_id=tournament.id, team_name=team_name).first()
    if not team:
        team = Team(
            tournament_id=tournament.id,
            leader_id=leader_id,
            team_name=team_name,
            status=status,
            verification_deadline=datetime.utcnow() + timedelta(days=2),
            confirmed_members=1,
            total_members=1,
        )
        db.session.add(team)
        db.session.flush()
        created = 1
    else:
        team.status = status
        created = 0

    return team, tournament, created


def ensure_tournament(payload):
    existing = Tournament.query.filter_by(title=payload["title"]).first()
    normalized = dict(payload)
    normalized["start_date"] = dt(payload["start_date"])
    normalized["end_date"] = dt(payload["end_date"])
    normalized["registration_deadline"] = dt(payload["registration_deadline"])

    if existing:
        for key, value in normalized.items():
            setattr(existing, key, value)
        return existing, 0, 1

    row = Tournament(**normalized)
    db.session.add(row)
    return row, 1, 0


def ensure_team_member(team, user_id, email, name, status="accepted", is_leader=False):
    member = TeamMember.query.filter_by(team_id=team.id, email=email).first()
    if not member:
        member = TeamMember(
            team_id=team.id,
            user_id=user_id,
            email=email,
            name=name,
            status=status,
            is_leader=is_leader,
            joined_at=datetime.utcnow() if status == "accepted" else None,
        )
        db.session.add(member)
        return 1

    member.user_id = user_id
    member.name = name
    member.status = status
    member.is_leader = is_leader
    if status == "accepted" and not member.joined_at:
        member.joined_at = datetime.utcnow()
    return 0


def ensure_invitation(team, email, token, status="pending"):
    inv = Invitation.query.filter_by(token=token).first()
    if inv:
        inv.status = status
        return 0

    inv = Invitation(
        team_id=team.id,
        email=email,
        token=token,
        status=status,
        expires_at=datetime.utcnow() + timedelta(days=2),
    )
    db.session.add(inv)
    return 1


def ensure_leaderboard_row(tournament, entry_name, score, updated_by, team_id=None, user_id=None, rank_position=None):
    row = Leaderboard.query.filter_by(tournament_id=tournament.id, entry_name=entry_name).first()
    if row:
        row.score = score
        row.updated_by = updated_by
        row.team_id = team_id
        row.user_id = user_id
        row.rank_position = rank_position
        return 0

    row = Leaderboard(
        tournament_id=tournament.id,
        team_id=team_id,
        user_id=user_id,
        entry_name=entry_name,
        score=score,
        rank_position=rank_position,
        updated_by=updated_by,
    )
    db.session.add(row)
    return 1


def ensure_notification(user_id, title, message, type_="info"):
    notif = Notification.query.filter_by(user_id=user_id, title=title, message=message).first()
    if notif:
        return 0

    db.session.add(
        Notification(
            user_id=user_id,
            title=title,
            message=message,
            type=type_,
            read_status=False,
        )
    )
    return 1


def ensure_report(reporter_id, tournament_id, reason, description, status="pending"):
    report = Report.query.filter_by(
        reporter_id=reporter_id,
        tournament_id=tournament_id,
        reason=reason,
        description=description,
    ).first()
    if report:
        report.status = status
        return 0

    db.session.add(
        Report(
            reporter_id=reporter_id,
            tournament_id=tournament_id,
            reason=reason,
            description=description,
            status=status,
        )
    )
    return 1


def ensure_organizer_request(user_id, name, department, reason, experience, status="pending", reviewed_by=None, review_note=None):
    req = OrganizerRequest.query.filter_by(user_id=user_id, reason=reason).first()
    if req:
        req.status = status
        req.reviewed_by = reviewed_by
        req.review_note = review_note
        req.reviewed_at = datetime.utcnow() if status in ("approved", "rejected") else None
        return 0

    db.session.add(
        OrganizerRequest(
            user_id=user_id,
            name=name,
            department=department,
            reason=reason,
            experience=experience,
            status=status,
            reviewed_by=reviewed_by,
            review_note=review_note,
            reviewed_at=datetime.utcnow() if status in ("approved", "rejected") else None,
        )
    )
    return 1


def main():
    app = create_app()
    counters = {
        "users_inserted": 0,
        "users_updated": 0,
        "tournaments_created": 0,
        "tournaments_updated": 0,
        "teams_created": 0,
        "members_created": 0,
        "invitations_created": 0,
        "leaderboard_rows_created": 0,
        "notifications_created": 0,
        "reports_created": 0,
        "organizer_requests_created": 0,
    }

    with app.app_context():
        # Extra demo users beyond schema sample rows.
        for payload in [
            ("student_004", "student4@vit.edu", "Aarav Patel", "student", "Computer Science"),
            ("student_005", "student5@vit.edu", "Diya Kulkarni", "student", "Information Technology"),
            ("student_006", "student6@vit.edu", "Nikhil Joshi", "student", "Electronics"),
            ("student_007", "student7@vit.edu", "Meera Desai", "student", "Mechanical"),
            ("student_008", "student8@vit.edu", "Aditya Verma", "student", "Civil"),
        ]:
            inserted, updated = ensure_user(*payload)
            counters["users_inserted"] += inserted
            counters["users_updated"] += updated

        # Ensure organizer accounts exist.
        for payload in [
            ("org_001", "organizer1@vit.edu", "Priya Sharma", "organizer", "Information Technology"),
            ("org_002", "organizer2@vit.edu", "Arjun Nair", "organizer", "Electronics"),
            ("faculty_001", "admin@vit.edu", "Dr. Rajesh Kumar", "faculty", "Computer Science"),
            ("sport_auth_001", "sports@vit.edu", "Mr. Vikram Singh", "sport_authority", "Physical Education"),
        ]:
            inserted, updated = ensure_user(*payload)
            counters["users_inserted"] += inserted
            counters["users_updated"] += updated

        tournaments_by_title = {}
        tournament_payloads = [
            {
                "organizer_id": "org_001",
                "title": "CodeStorm 2025",
                "description": "The ultimate competitive programming tournament for VIT students.",
                "category": "coding",
                "team_based": False,
                "max_participants": 100,
                "min_team_size": 1,
                "max_team_size": 1,
                "start_date": "2025-08-15 09:00:00",
                "end_date": "2025-08-15 18:00:00",
                "registration_deadline": "2025-08-10 23:59:59",
                "rules": "No plagiarism. Individual participation only.",
                "prize_pool": "1st: 10,000 | 2nd: 6,000 | 3rd: 3,000",
                "venue": "Tech Park Auditorium, VIT",
                "banner_url": "https://images.unsplash.com/photo-1518773553398-650c184e0bb3?auto=format&fit=crop&w=1200&q=80",
                "status": "published",
            },
            {
                "organizer_id": "org_001",
                "title": "FIFA Tournament 2025",
                "description": "Inter-department FIFA 24 gaming tournament with teams of two.",
                "category": "gaming",
                "team_based": True,
                "max_participants": 64,
                "min_team_size": 2,
                "max_team_size": 2,
                "start_date": "2025-08-20 10:00:00",
                "end_date": "2025-08-22 20:00:00",
                "registration_deadline": "2025-08-18 23:59:59",
                "rules": "Teams of 2. Double elimination format.",
                "prize_pool": "1st: 5,000 | 2nd: 2,500",
                "venue": "Gaming Zone, Student Center",
                "banner_url": "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80",
                "status": "published",
            },
            {
                "organizer_id": "org_002",
                "title": "Cricket Premier League",
                "description": "VIT inter-department cricket tournament in T20 format.",
                "category": "sports",
                "team_based": True,
                "max_participants": 160,
                "min_team_size": 11,
                "max_team_size": 15,
                "start_date": "2025-09-01 08:00:00",
                "end_date": "2025-09-15 20:00:00",
                "registration_deadline": "2025-08-25 23:59:59",
                "rules": "T20 format. BCCI rules apply.",
                "prize_pool": "Trophy + 15,000",
                "venue": "VIT Cricket Ground",
                "banner_url": "https://images.unsplash.com/photo-1540747913346-19e32dc3e97e?auto=format&fit=crop&w=1200&q=80",
                "status": "published",
            },
            {
                "organizer_id": "org_002",
                "title": "Hackathon 2025",
                "description": "24-hour hackathon to build innovative solutions for real-world problems.",
                "category": "coding",
                "team_based": True,
                "max_participants": 200,
                "min_team_size": 3,
                "max_team_size": 5,
                "start_date": "2025-09-10 09:00:00",
                "end_date": "2025-09-11 09:00:00",
                "registration_deadline": "2025-09-05 23:59:59",
                "rules": "Teams of 3-5. Theme revealed at start.",
                "prize_pool": "1st: 25,000 | 2nd: 15,000 | 3rd: 10,000",
                "venue": "Innovation Hub, VIT",
                "banner_url": "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=1200&q=80",
                "status": "pending_approval",
            },
            {
                "organizer_id": "org_001",
                "title": "Valorant Clash Night",
                "description": "5v5 tactical shooter tournament across departments.",
                "category": "gaming",
                "team_based": True,
                "max_participants": 80,
                "min_team_size": 5,
                "max_team_size": 6,
                "start_date": "2026-05-18 18:00:00",
                "end_date": "2026-05-20 22:00:00",
                "registration_deadline": "2026-05-15 23:59:59",
                "rules": "Best-of-3 knockout matches.",
                "prize_pool": "1st: 12,000 | 2nd: 6,000",
                "venue": "Esports Lab, VIT",
                "banner_url": "https://images.unsplash.com/photo-1547394765-185e1e68f34e?auto=format&fit=crop&w=1200&q=80",
                "status": "ongoing",
            },
            {
                "organizer_id": "org_002",
                "title": "UI Sprint Challenge",
                "description": "Rapid frontend build challenge focused on usability and polish.",
                "category": "coding",
                "team_based": False,
                "max_participants": 120,
                "min_team_size": 1,
                "max_team_size": 1,
                "start_date": "2026-06-05 10:00:00",
                "end_date": "2026-06-05 17:00:00",
                "registration_deadline": "2026-06-02 23:59:59",
                "rules": "Individual event. Bring your own laptop.",
                "prize_pool": "1st: 8,000 | 2nd: 4,000 | 3rd: 2,000",
                "venue": "Lab 7, CSE Block",
                "banner_url": "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80",
                "status": "published",
            },
            {
                "organizer_id": "org_001",
                "title": "Street Football Cup",
                "description": "Fast-paced 7-a-side football tournament.",
                "category": "sports",
                "team_based": True,
                "max_participants": 112,
                "min_team_size": 7,
                "max_team_size": 9,
                "start_date": "2026-06-20 07:30:00",
                "end_date": "2026-06-22 19:30:00",
                "registration_deadline": "2026-06-15 23:59:59",
                "rules": "League plus knockout format.",
                "prize_pool": "1st: 18,000 | 2nd: 9,000",
                "venue": "Main Football Ground",
                "banner_url": "https://images.unsplash.com/photo-1508098682722-e99c643e7485?auto=format&fit=crop&w=1200&q=80",
                "status": "published",
            },
            {
                "organizer_id": "org_002",
                "title": "Battle of Bands",
                "description": "Inter-department live music competition.",
                "category": "cultural",
                "team_based": True,
                "max_participants": 60,
                "min_team_size": 3,
                "max_team_size": 8,
                "start_date": "2026-07-02 16:00:00",
                "end_date": "2026-07-02 22:00:00",
                "registration_deadline": "2026-06-28 23:59:59",
                "rules": "Originals and covers both allowed.",
                "prize_pool": "1st: 20,000 | 2nd: 10,000",
                "venue": "Open Air Theatre",
                "banner_url": "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=1200&q=80",
                "status": "published",
            },
            {
                "organizer_id": "org_002",
                "title": "Chess Masters Arena",
                "description": "Classical chess tournament with Swiss rounds.",
                "category": "other",
                "team_based": False,
                "max_participants": 80,
                "min_team_size": 1,
                "max_team_size": 1,
                "start_date": "2026-05-30 09:00:00",
                "end_date": "2026-05-30 18:00:00",
                "registration_deadline": "2026-05-26 23:59:59",
                "rules": "Rapid tie-break after Swiss rounds.",
                "prize_pool": "1st: 7,500 | 2nd: 4,000",
                "venue": "Seminar Hall B",
                "banner_url": "https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&w=1200&q=80",
                "status": "completed",
            },
            {
                "organizer_id": "org_001",
                "title": "Open Mic Showcase",
                "description": "Poetry, stand-up, storytelling and spoken word evening.",
                "category": "cultural",
                "team_based": False,
                "max_participants": 70,
                "min_team_size": 1,
                "max_team_size": 1,
                "start_date": "2026-07-10 18:30:00",
                "end_date": "2026-07-10 21:30:00",
                "registration_deadline": "2026-07-06 23:59:59",
                "rules": "Performer slot: max 7 minutes.",
                "prize_pool": "Best Performance Award + 5,000",
                "venue": "Student Activity Center",
                "banner_url": "https://images.unsplash.com/photo-1511379938547-c1f69419868d?auto=format&fit=crop&w=1200&q=80",
                "status": "published",
            },
        ]

        for payload in tournament_payloads:
            tournament, created, updated = ensure_tournament(payload)
            tournaments_by_title[payload["title"]] = tournament
            counters["tournaments_created"] += created
            counters["tournaments_updated"] += updated

        # Team-based tournaments demo teams.
        team_specs = [
            ("FIFA Tournament 2025", "student_001", "Thunder Strikers"),
            ("FIFA Tournament 2025", "student_004", "Pixel Predators"),
            ("Cricket Premier League", "student_002", "VIT Titans"),
            ("Cricket Premier League", "student_006", "Code Chargers"),
            ("Hackathon 2025", "student_003", "Neural Ninjas"),
            ("Hackathon 2025", "student_005", "Byte Busters"),
            ("Valorant Clash Night", "student_001", "Phantom Stack"),
            ("Valorant Clash Night", "student_004", "Flash Entry"),
            ("Street Football Cup", "student_002", "Midfield Mavericks"),
            ("Street Football Cup", "student_006", "Goal Hunters"),
            ("Battle of Bands", "student_003", "Resonance Crew"),
            ("Battle of Bands", "student_007", "Echo Drift"),
        ]

        teams_by_name = {}
        for tournament_title, leader_id, team_name in team_specs:
            team, tournament, created = ensure_team(tournament_title, leader_id, team_name)
            teams_by_name[team_name] = team
            tournaments_by_title[tournament_title] = tournament
            counters["teams_created"] += created

            leader_user = db.session.get(User, leader_id)
            counters["members_created"] += ensure_team_member(
                team,
                leader_id,
                leader_user.email,
                leader_user.name,
                status="accepted",
                is_leader=True,
            )

        # Additional team members.
        member_specs = [
            ("Thunder Strikers", "student_005", "accepted"),
            ("Pixel Predators", "student_008", "accepted"),
            ("VIT Titans", "student_004", "accepted"),
            ("VIT Titans", "student_007", "accepted"),
            ("Code Chargers", "student_001", "accepted"),
            ("Code Chargers", "student_008", "accepted"),
            ("Neural Ninjas", "student_004", "accepted"),
            ("Neural Ninjas", "student_006", "accepted"),
            ("Neural Ninjas", "student_007", "accepted"),
            ("Byte Busters", "student_001", "accepted"),
            ("Byte Busters", "student_002", "accepted"),
            ("Byte Busters", "student_008", "invited"),
            ("Phantom Stack", "student_005", "accepted"),
            ("Phantom Stack", "student_006", "accepted"),
            ("Phantom Stack", "student_007", "accepted"),
            ("Phantom Stack", "student_008", "accepted"),
            ("Flash Entry", "student_002", "accepted"),
            ("Flash Entry", "student_003", "accepted"),
            ("Flash Entry", "student_005", "accepted"),
            ("Flash Entry", "student_007", "accepted"),
            ("Midfield Mavericks", "student_004", "accepted"),
            ("Midfield Mavericks", "student_005", "accepted"),
            ("Midfield Mavericks", "student_006", "accepted"),
            ("Goal Hunters", "student_001", "accepted"),
            ("Goal Hunters", "student_003", "accepted"),
            ("Goal Hunters", "student_008", "accepted"),
            ("Resonance Crew", "student_004", "accepted"),
            ("Resonance Crew", "student_006", "accepted"),
            ("Echo Drift", "student_001", "accepted"),
            ("Echo Drift", "student_005", "accepted"),
        ]

        for team_name, user_id, member_status in member_specs:
            user = db.session.get(User, user_id)
            counters["members_created"] += ensure_team_member(
                teams_by_name[team_name],
                user_id,
                user.email,
                user.name,
                status=member_status,
                is_leader=False,
            )

        # Recompute team counts.
        for team in teams_by_name.values():
            accepted = TeamMember.query.filter_by(team_id=team.id, status="accepted").count()
            total = TeamMember.query.filter_by(team_id=team.id).count()
            team.confirmed_members = accepted
            team.total_members = total

        # Invitations for pending members.
        counters["invitations_created"] += ensure_invitation(
            teams_by_name["Byte Busters"],
            "student8@vit.edu",
            "demo_invite_byte_busters_student8",
            status="pending",
        )
        counters["invitations_created"] += ensure_invitation(
            teams_by_name["Goal Hunters"],
            "student7@vit.edu",
            "demo_invite_goal_hunters_student7",
            status="pending",
        )

        # Leaderboard entries for demo visualization.
        codestorm = Tournament.query.filter_by(title="CodeStorm 2025").first()
        counters["leaderboard_rows_created"] += ensure_leaderboard_row(
            codestorm,
            "Kavya Reddy",
            420.0,
            "faculty_001",
            user_id="student_001",
            rank_position=1,
        )
        counters["leaderboard_rows_created"] += ensure_leaderboard_row(
            codestorm,
            "Aarav Patel",
            390.0,
            "faculty_001",
            user_id="student_004",
            rank_position=2,
        )
        counters["leaderboard_rows_created"] += ensure_leaderboard_row(
            codestorm,
            "Sneha Iyer",
            355.0,
            "faculty_001",
            user_id="student_003",
            rank_position=3,
        )

        fifa = tournaments_by_title["FIFA Tournament 2025"]
        counters["leaderboard_rows_created"] += ensure_leaderboard_row(
            fifa,
            "Thunder Strikers",
            12.0,
            "org_001",
            team_id=teams_by_name["Thunder Strikers"].id,
            rank_position=1,
        )
        counters["leaderboard_rows_created"] += ensure_leaderboard_row(
            fifa,
            "Pixel Predators",
            9.0,
            "org_001",
            team_id=teams_by_name["Pixel Predators"].id,
            rank_position=2,
        )

        cricket = tournaments_by_title["Cricket Premier League"]
        counters["leaderboard_rows_created"] += ensure_leaderboard_row(
            cricket,
            "VIT Titans",
            8.0,
            "org_002",
            team_id=teams_by_name["VIT Titans"].id,
            rank_position=1,
        )
        counters["leaderboard_rows_created"] += ensure_leaderboard_row(
            cricket,
            "Code Chargers",
            6.0,
            "org_002",
            team_id=teams_by_name["Code Chargers"].id,
            rank_position=2,
        )

        valorant = tournaments_by_title["Valorant Clash Night"]
        counters["leaderboard_rows_created"] += ensure_leaderboard_row(
            valorant,
            "Phantom Stack",
            14.0,
            "org_001",
            team_id=teams_by_name["Phantom Stack"].id,
            rank_position=1,
        )
        counters["leaderboard_rows_created"] += ensure_leaderboard_row(
            valorant,
            "Flash Entry",
            11.0,
            "org_001",
            team_id=teams_by_name["Flash Entry"].id,
            rank_position=2,
        )

        # Reports and organizer requests.
        counters["reports_created"] += ensure_report(
            "student_002",
            fifa.id,
            "misleading_info",
            "Match timings in banner and details section differ.",
            status="reviewed",
        )
        counters["reports_created"] += ensure_report(
            "student_005",
            cricket.id,
            "spam",
            "Duplicate announcement posts detected in event feed.",
            status="pending",
        )
        counters["reports_created"] += ensure_report(
            "student_004",
            valorant.id,
            "other",
            "Warm-up room access list is missing participant IDs.",
            status="pending",
        )

        counters["organizer_requests_created"] += ensure_organizer_request(
            "student_003",
            "Sneha Iyer",
            "Civil",
            "I have previously coordinated departmental technical events and want to run coding contests.",
            "Led two campus coding workshops with 200+ attendees.",
            status="pending",
        )
        counters["organizer_requests_created"] += ensure_organizer_request(
            "student_007",
            "Meera Desai",
            "Mechanical",
            "Interested in organizing sports and cultural tournaments.",
            "Managed logistics for inter-department sports week.",
            status="approved",
            reviewed_by="faculty_001",
            review_note="Strong prior experience and positive faculty recommendations.",
        )

        # Notifications across roles.
        counters["notifications_created"] += ensure_notification(
            "faculty_001",
            "New Organizer Request",
            "Sneha Iyer submitted a new organizer request.",
            "info",
        )
        counters["notifications_created"] += ensure_notification(
            "org_001",
            "Report Reviewed",
            "A report on FIFA Tournament 2025 has been marked reviewed.",
            "success",
        )
        counters["notifications_created"] += ensure_notification(
            "student_001",
            "Team Confirmed",
            "Your team Thunder Strikers has been confirmed for FIFA Tournament 2025.",
            "success",
        )
        counters["notifications_created"] += ensure_notification(
            "student_008",
            "Invitation Pending",
            "You have a pending invitation from Byte Busters.",
            "warning",
        )
        counters["notifications_created"] += ensure_notification(
            "org_001",
            "Valorant Registrations Increased",
            "Valorant Clash Night crossed 2 confirmed teams.",
            "info",
        )

        # Keep participants counter meaningful in list pages.
        for tournament in tournaments_by_title.values():
            if tournament.team_based:
                tournament.current_participants = Team.query.filter_by(tournament_id=tournament.id, status="confirmed").count()
            else:
                tournament.current_participants = Leaderboard.query.filter_by(tournament_id=tournament.id).count()

        db.session.commit()

        print("Demo seed complete:")
        for key, value in counters.items():
            print(f"- {key}: {value}")

        print("Final totals:")
        print(f"- users: {User.query.count()}")
        print(f"- tournaments: {Tournament.query.count()}")
        print(f"- teams: {Team.query.count()}")
        print(f"- team_members: {TeamMember.query.count()}")
        print(f"- invitations: {Invitation.query.count()}")
        print(f"- leaderboard: {Leaderboard.query.count()}")
        print(f"- reports: {Report.query.count()}")
        print(f"- notifications: {Notification.query.count()}")
        print(f"- organizer_requests: {OrganizerRequest.query.count()}")


if __name__ == "__main__":
    main()
