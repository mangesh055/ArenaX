from flask import Blueprint, jsonify, request, g
from datetime import datetime
from middleware.auth import require_auth, require_organizer, require_faculty
from models import Tournament, User, Notification
from extensions import db

tournament_bp = Blueprint('tournaments', __name__, url_prefix='/api/tournaments')


def notify_user(user_id, title, message, notif_type='info', related_type=None, related_id=None):
    n = Notification(user_id=user_id, title=title, message=message,
                     type=notif_type, related_type=related_type, related_id=related_id)
    db.session.add(n)


@tournament_bp.route('', methods=['GET'])
def list_tournaments():
    """List tournaments with filtering."""
    from models import Team
    status = request.args.get('status', 'all')
    category = request.args.get('category')
    search = request.args.get('search', '').strip()
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 12))

    q = Tournament.query
    if status == 'all':
        q = q.filter(Tournament.status.in_(['published', 'ongoing', 'completed']))
    elif status:
        q = q.filter_by(status=status)
    if category:
        q = q.filter_by(category=category)
    if search:
        q = q.filter(Tournament.title.ilike(f'%{search}%'))

    total = q.count()
    tournaments = q.order_by(Tournament.created_at.desc())\
        .offset((page - 1) * per_page).limit(per_page).all()

    # Update participant counts for all tournaments before returning
    for t in tournaments:
        confirmed_teams = Team.query.filter_by(tournament_id=t.id, status='confirmed').count()
        t.current_participants = confirmed_teams
        db.session.add(t)
    db.session.commit()  # Persist all updated counts

    return jsonify({
        'tournaments': [t.to_dict(include_organizer=True) for t in tournaments],
        'total': total,
        'page': page,
        'per_page': per_page,
        'pages': (total + per_page - 1) // per_page
    })


@tournament_bp.route('/<int:tid>', methods=['GET'])
def get_tournament(tid):
    from models import Team
    t = Tournament.query.get_or_404(tid)
    
    # Recalculate participant count before returning (ensures fresh data)
    confirmed_teams = Team.query.filter_by(tournament_id=tid, status='confirmed').count()
    t.current_participants = confirmed_teams
    db.session.add(t)
    db.session.commit()  # Persist the updated count to database
    
    data = t.to_dict(include_organizer=True)
    return jsonify(data)


@tournament_bp.route('', methods=['POST'])
@require_organizer
def create_tournament():
    user = g.current_user
    data = request.get_json()
    
    required = ['title', 'description', 'category', 'max_participants',
                 'start_date', 'end_date', 'registration_deadline']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400
    
    try:
        start_date = datetime.fromisoformat(data['start_date'].replace('Z', '+00:00'))
        end_date = datetime.fromisoformat(data['end_date'].replace('Z', '+00:00'))
        reg_deadline = datetime.fromisoformat(data['registration_deadline'].replace('Z', '+00:00'))
        
        # Validation: Registration deadline must be BEFORE start date
        if reg_deadline >= start_date:
            return jsonify({'error': '❌ Registration deadline must be BEFORE tournament start date'}), 400
        
        # Validation: Start date must be before end date
        if start_date >= end_date:
            return jsonify({'error': 'Tournament start date must be before end date'}), 400
        
        t = Tournament(
            organizer_id=user.id,
            title=data['title'],
            description=data['description'],
            category=data['category'],
            team_based=data.get('team_based', True),
            max_participants=int(data['max_participants']),
            min_team_size=int(data.get('min_team_size', 1)),
            max_team_size=int(data.get('max_team_size', 5)),
            start_date=start_date,
            end_date=end_date,
            registration_deadline=reg_deadline,
            rules=data.get('rules'),
            prize_pool=data.get('prize_pool'),
            venue=data.get('venue'),
            banner_url=data.get('banner_url'),
            status='pending_approval'
        )
        db.session.add(t)
        
        # Notify faculty
        faculty = User.query.filter_by(role='faculty').all()
        for f_user in faculty:
            notify_user(f_user.id, 'New Tournament Pending',
                       f'"{t.title}" needs your approval', 'info', 'tournament', t.id)
        
        db.session.commit()
        return jsonify({'message': 'Tournament submitted for approval', 'tournament': t.to_dict()}), 201
    except ValueError as e:
        return jsonify({'error': str(e)}), 400


@tournament_bp.route('/<int:tid>', methods=['PUT'])
@require_organizer
def update_tournament(tid):
    user = g.current_user
    t = Tournament.query.get_or_404(tid)
    
    if t.organizer_id != user.id and user.role != 'faculty':
        return jsonify({'error': 'Unauthorized'}), 403
    
    # Allow editing cancelled or completed tournaments (restrict only cancelled/disqualified)
    if t.status == 'cancelled':
        return jsonify({'error': 'Cannot edit a cancelled tournament'}), 400
    if t.status == 'completed' and user.role != 'faculty':
        return jsonify({'error': 'Only faculty can edit completed tournaments'}), 403
    
    data = request.get_json()
    updatable = ['title', 'description', 'category', 'rules', 'prize_pool', 'venue', 'banner_url',
                 'start_date', 'end_date', 'registration_deadline', 'max_participants', 'min_team_size', 'max_team_size']
    
    try:
        # Prepare dates with current or new values
        start_date = t.start_date
        end_date = t.end_date
        reg_deadline = t.registration_deadline
        
        for field in updatable:
            if field in data:
                if field in ['start_date', 'end_date', 'registration_deadline']:
                    parsed_date = datetime.fromisoformat(data[field].replace('Z', '+00:00'))
                    if field == 'start_date':
                        start_date = parsed_date
                    elif field == 'end_date':
                        end_date = parsed_date
                    elif field == 'registration_deadline':
                        reg_deadline = parsed_date
                    setattr(t, field, parsed_date)
                else:
                    setattr(t, field, data[field])
        
        # Validation: Registration deadline must be BEFORE start date
        if reg_deadline >= start_date:
            return jsonify({'error': '❌ Registration deadline must be BEFORE tournament start date'}), 400
        
        # Validation: Start date must be before end date
        if start_date >= end_date:
            return jsonify({'error': 'Tournament start date must be before end date'}), 400
        
        db.session.commit()
        return jsonify({'message': 'Tournament updated', 'tournament': t.to_dict()}), 200
    except ValueError as e:
        return jsonify({'error': str(e)}), 400


@tournament_bp.route('/<int:tid>/approve', methods=['POST'])
@require_faculty
def approve_tournament(tid):
    user = g.current_user
    t = Tournament.query.get_or_404(tid)
    data = request.get_json() or {}
    action = data.get('action')  # 'approve' or 'reject'
    
    if action == 'approve':
        t.status = 'published'
        t.approved_by = user.id
        t.approved_at = datetime.utcnow()
        notify_user(t.organizer_id, 'Tournament Approved! 🎉',
                   f'"{t.title}" has been approved and is now live!', 'success', 'tournament', t.id)
    elif action == 'reject':
        t.status = 'draft'
        t.rejection_reason = data.get('reason', 'Does not meet requirements')
        notify_user(t.organizer_id, 'Tournament Not Approved',
                   f'"{t.title}" was rejected. Reason: {t.rejection_reason}', 'error', 'tournament', t.id)
    else:
        return jsonify({'error': 'Action must be approve or reject'}), 400
    
    db.session.commit()
    return jsonify({'message': f'Tournament {action}d', 'tournament': t.to_dict()})


@tournament_bp.route('/<int:tid>/status', methods=['PUT'])
@require_organizer
def update_status(tid):
    user = g.current_user
    t = Tournament.query.get_or_404(tid)
    if t.organizer_id != user.id and user.role != 'faculty':
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.get_json()
    new_status = data.get('status')
    valid = ['ongoing', 'completed', 'cancelled']
    if new_status not in valid:
        return jsonify({'error': f'Status must be one of: {valid}'}), 400
    
    t.status = new_status
    db.session.commit()
    return jsonify({'message': 'Status updated', 'tournament': t.to_dict()})


@tournament_bp.route('/my', methods=['GET'])
@require_auth
def my_tournaments():
    user = g.current_user
    if user.role in ['organizer', 'faculty']:
        tournaments = Tournament.query.filter_by(organizer_id=user.id)\
            .order_by(Tournament.created_at.desc()).all()
    else:
        # Students: tournaments they joined
        from models import Team
        teams = Team.query.filter_by(leader_id=user.id).all()
        tids = [team.tournament_id for team in teams]
        tournaments = Tournament.query.filter(Tournament.id.in_(tids)).all()
    
    return jsonify([t.to_dict() for t in tournaments])


@tournament_bp.route('/pending', methods=['GET'])
@require_faculty
def pending_tournaments():
    tournaments = Tournament.query.filter_by(status='pending_approval')\
        .order_by(Tournament.created_at.asc()).all()
    return jsonify([t.to_dict(include_organizer=True) for t in tournaments])
