from flask import Blueprint, jsonify, request, g
from datetime import datetime
from middleware.auth import require_auth, require_faculty
from models import OrganizerRequest, User, Leaderboard, Tournament, Report, Notification, Team
from extensions import db

organizer_bp = Blueprint('organizer', __name__, url_prefix='/api/organizer')
leaderboard_bp = Blueprint('leaderboard', __name__, url_prefix='/api/leaderboard')
report_bp = Blueprint('reports', __name__, url_prefix='/api/reports')
admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


def notify_user(user_id, title, message, notif_type='info', related_type=None, related_id=None):
    n = Notification(user_id=user_id, title=title, message=message,
                     type=notif_type, related_type=related_type, related_id=related_id)
    db.session.add(n)


# ─── ORGANIZER REQUESTS ───────────────────────────────────────────────

@organizer_bp.route('/apply', methods=['POST'])
@require_auth
def apply_organizer():
    user = g.current_user
    if user.role in ['organizer', 'faculty']:
        return jsonify({'error': 'Already an organizer or faculty'}), 409
    
    existing = OrganizerRequest.query.filter_by(user_id=user.id, status='pending').first()
    if existing:
        return jsonify({'error': 'Application already pending'}), 409
    
    data = request.get_json()
    required = ['name', 'department', 'reason', 'experience']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400
    
    req = OrganizerRequest(
        user_id=user.id,
        name=data['name'],
        department=data['department'],
        reason=data['reason'],
        experience=data['experience']
    )
    db.session.add(req)
    
    faculty = User.query.filter_by(role='faculty').all()
    for f_user in faculty:
        notify_user(f_user.id, 'New Organizer Application',
                   f'{user.name} applied to become an organizer', 'info')
    
    db.session.commit()
    return jsonify({'message': 'Application submitted successfully', 'request': req.to_dict()}), 201


@organizer_bp.route('/status', methods=['GET'])
@require_auth
def my_application_status():
    user = g.current_user
    req = OrganizerRequest.query.filter_by(user_id=user.id)\
        .order_by(OrganizerRequest.created_at.desc()).first()
    if not req:
        return jsonify({'status': 'none'})
    return jsonify(req.to_dict())


@organizer_bp.route('/requests', methods=['GET'])
@require_faculty
def list_requests():
    status = request.args.get('status', 'pending')
    reqs = OrganizerRequest.query.filter_by(status=status)\
        .order_by(OrganizerRequest.created_at.asc()).all()
    return jsonify([r.to_dict() for r in reqs])


@organizer_bp.route('/requests/<int:req_id>/review', methods=['POST'])
@require_faculty
def review_request(req_id):
    faculty = g.current_user
    req = OrganizerRequest.query.get_or_404(req_id)
    data = request.get_json()
    action = data.get('action')
    
    if action not in ['approve', 'reject']:
        return jsonify({'error': 'Action must be approve or reject'}), 400
    
    req.status = 'approved' if action == 'approve' else 'rejected'
    req.reviewed_by = faculty.id
    req.review_note = data.get('note', '')
    req.reviewed_at = datetime.utcnow()
    
    if action == 'approve':
        user = User.query.get(req.user_id)
        user.role = 'organizer'
        notify_user(req.user_id, '🎉 Organizer Application Approved!',
                   'Congratulations! You can now create tournaments on ArenaX.', 'success')
    else:
        notify_user(req.user_id, 'Organizer Application Update',
                   f'Your application was not approved. Note: {req.review_note}', 'error')
    
    db.session.commit()
    return jsonify({'message': f'Request {action}d', 'request': req.to_dict()})


@organizer_bp.route('/my-tournaments', methods=['GET'])
@require_auth
def get_my_tournaments():
    """Get tournaments created by the current user"""
    user = g.current_user
    
    # Only organizers and faculty can create tournaments
    if user.role not in ['organizer', 'faculty']:
        return jsonify({'error': 'Only organizers and faculty create tournaments'}), 403
    
    # Get tournaments created by this user
    tournaments = Tournament.query.filter_by(organizer_id=user.id)\
        .order_by(Tournament.created_at.desc()).all()
    
    return jsonify([t.to_dict() for t in tournaments])


# ─── LEADERBOARD ─────────────────────────────────────────────────────

@leaderboard_bp.route('/<int:tid>', methods=['GET'])
def get_leaderboard(tid):
    entries = Leaderboard.query.filter_by(tournament_id=tid)\
        .order_by(Leaderboard.rank_position.asc(), Leaderboard.score.desc()).all()
    return jsonify([e.to_dict() for e in entries])


@leaderboard_bp.route('/<int:tid>', methods=['POST'])
@require_auth
def upsert_leaderboard(tid):
    user = g.current_user
    tournament = Tournament.query.get_or_404(tid)
    
    if tournament.organizer_id != user.id and user.role != 'faculty':
        return jsonify({'error': 'Only tournament organizer or faculty can update leaderboard'}), 403
    
    data = request.get_json()
    entries = data.get('entries', [])
    
    # Delete existing and replace
    Leaderboard.query.filter_by(tournament_id=tid).delete()
    
    for i, entry in enumerate(entries):
        lb = Leaderboard(
            tournament_id=tid,
            team_id=entry.get('team_id'),
            user_id=entry.get('user_id'),
            entry_name=entry['entry_name'],
            score=float(entry.get('score', 0)),
            rank_position=i + 1,
            notes=entry.get('notes'),
            updated_by=user.id
        )
        db.session.add(lb)
    
    db.session.commit()
    return jsonify({'message': 'Leaderboard updated successfully'})


# ─── REPORTS ─────────────────────────────────────────────────────────

@report_bp.route('', methods=['POST'])
@require_auth
def file_report():
    user = g.current_user
    data = request.get_json()
    
    existing = Report.query.filter_by(
        reporter_id=user.id,
        tournament_id=data.get('tournament_id'),
        status='pending'
    ).first()
    if existing:
        return jsonify({'error': 'You already reported this tournament'}), 409
    
    report = Report(
        reporter_id=user.id,
        tournament_id=data['tournament_id'],
        reason=data['reason'],
        description=data['description']
    )
    db.session.add(report)
    
    faculty = User.query.filter_by(role='faculty').all()
    for f_user in faculty:
        notify_user(f_user.id, '🚨 New Report Filed',
                   f'A tournament has been reported for review.', 'warning')
    
    db.session.commit()
    return jsonify({'message': 'Report submitted'}), 201


@report_bp.route('', methods=['GET'])
@require_faculty
def list_reports():
    status = request.args.get('status', 'pending')
    reports = Report.query.filter_by(status=status)\
        .order_by(Report.created_at.desc()).all()
    result = []
    for r in reports:
        d = r.to_dict()
        d['reporter'] = User.query.get(r.reporter_id).to_dict() if r.reporter_id else None
        d['tournament'] = Tournament.query.get(r.tournament_id).to_dict() if r.tournament_id else None
        result.append(d)
    return jsonify(result)


@report_bp.route('/<int:rid>/resolve', methods=['POST'])
@require_faculty
def resolve_report(rid):
    faculty = g.current_user
    report = Report.query.get_or_404(rid)
    data = request.get_json()
    action = data.get('action')
    
    report.status = 'resolved' if action == 'resolve' else 'dismissed'
    report.reviewed_by = faculty.id
    report.resolution_note = data.get('note', '')
    report.reviewed_at = datetime.utcnow()
    
    if action == 'resolve':
        tournament = Tournament.query.get(report.tournament_id)
        if tournament:
            tournament.status = 'cancelled'
            # Decrease organizer reputation
            organizer = User.query.get(tournament.organizer_id)
            if organizer:
                organizer.reputation_score = max(0, organizer.reputation_score - 20)
            notify_user(tournament.organizer_id, 'Tournament Removed',
                       f'Your tournament was removed due to a report.', 'error')
    
    db.session.commit()
    return jsonify({'message': f'Report {report.status}'})


# ─── ADMIN ───────────────────────────────────────────────────────────

@admin_bp.route('/stats', methods=['GET'])
@require_faculty
def get_stats():
    from sqlalchemy import func
    total_users = User.query.count()
    total_tournaments = Tournament.query.count()
    active_tournaments = Tournament.query.filter(
        Tournament.status.in_(['published', 'ongoing'])).count()
    pending_approvals = Tournament.query.filter_by(status='pending_approval').count()
    pending_organizers = OrganizerRequest.query.filter_by(status='pending').count()
    pending_reports = Report.query.filter_by(status='pending').count()
    total_teams = Team.query.count()
    confirmed_teams = Team.query.filter_by(status='confirmed').count()
    
    return jsonify({
        'total_users': total_users,
        'total_tournaments': total_tournaments,
        'active_tournaments': active_tournaments,
        'pending_approvals': pending_approvals,
        'pending_organizers': pending_organizers,
        'pending_reports': pending_reports,
        'total_teams': total_teams,
        'confirmed_teams': confirmed_teams
    })


@admin_bp.route('/users', methods=['GET'])
@require_faculty
def list_users():
    role = request.args.get('role')
    q = User.query
    if role:
        q = q.filter_by(role=role)
    users = q.order_by(User.created_at.desc()).all()
    return jsonify([u.to_dict() for u in users])


@admin_bp.route('/users/<user_id>/ban', methods=['POST'])
@require_faculty
def ban_user(user_id):
    user = User.query.get_or_404(user_id)
    data = request.get_json()
    user.is_banned = True
    user.ban_reason = data.get('reason', 'Violated terms of service')
    db.session.commit()
    return jsonify({'message': f'User {user.name} banned'})


@admin_bp.route('/users/<user_id>/unban', methods=['POST'])
@require_faculty
def unban_user(user_id):
    user = User.query.get_or_404(user_id)
    user.is_banned = False
    user.ban_reason = None
    db.session.commit()
    return jsonify({'message': f'User {user.name} unbanned'})


@admin_bp.route('/students', methods=['GET'])
@require_faculty
def list_students():
    """Get all students with basic info"""
    students = User.query.filter_by(role='student').order_by(User.created_at.desc()).all()
    return jsonify([u.to_dict() for u in students])


@admin_bp.route('/students/<student_id>/analytics', methods=['GET'])
@require_faculty
def get_student_analytics(student_id):
    """Get comprehensive performance analytics for a student"""
    student = User.query.get_or_404(student_id)
    
    if student.role != 'student':
        return jsonify({'error': 'User is not a student'}), 400
    
    # Get all teams where student is a member
    from models import TeamMember
    student_teams = Team.query.join(TeamMember).filter(
        TeamMember.user_id == student_id
    ).all()
    
    # Build tournament participation data
    tournaments_participated = []
    total_tournaments = len(student_teams)
    
    for team in student_teams:
        tournament = team.tournament
        leaderboard_entry = Leaderboard.query.filter_by(
            tournament_id=tournament.id,
            team_id=team.id
        ).first()
        
        team_data = {
            'tournament_id': tournament.id,
            'tournament_title': tournament.title,
            'tournament_category': tournament.category,
            'team_name': team.team_name,
            'team_status': team.status,
            'team_id': team.id,
            'is_leader': team.leader_id == student_id,
            'start_date': tournament.start_date.isoformat() if tournament.start_date else None,
            'registered_at': team.registered_at.isoformat() if team.registered_at else None,
            'rank': leaderboard_entry.rank_position if leaderboard_entry else None,
            'score': float(leaderboard_entry.score) if leaderboard_entry else None,
            'venue': tournament.venue,
            'prize_pool': tournament.prize_pool
        }
        tournaments_participated.append(team_data)
    
    # Count wins/top positions
    wins = sum(1 for t in tournaments_participated if t['rank'] and t['rank'] <= 3)
    
    # Get activities (recent team registrations, status updates)
    activities = []
    for team in sorted(student_teams, key=lambda t: t.registered_at, reverse=True)[:10]:
        activity = {
            'type': 'team_registration',
            'tournament_title': team.tournament.title,
            'team_name': team.team_name,
            'status': team.status,
            'timestamp': team.registered_at.isoformat() if team.registered_at else None,
            'team_id': team.id
        }
        activities.append(activity)
    
    return jsonify({
        'student': student.to_dict(),
        'statistics': {
            'total_tournaments_participated': total_tournaments,
            'top_3_finishes': wins,
            'reputation_score': student.reputation_score,
            'is_banned': student.is_banned
        },
        'tournaments_participated': tournaments_participated,
        'activities': activities
    })
