from flask import Blueprint, jsonify, request, g
from datetime import datetime
from middleware.auth import require_auth, require_sport_authority
from models import SportRoomEntry, User
from extensions import db
from sqlalchemy import text

sport_bp = Blueprint('sport', __name__, url_prefix='/api/sport')
_sport_schema_ready = False


def ensure_sport_room_schema():
    global _sport_schema_ready
    if _sport_schema_ready:
        return

    try:
        dialect = db.engine.dialect.name

        if dialect == 'sqlite':
            columns = db.session.execute(text('PRAGMA table_info(sport_room_entries)')).fetchall()
            has_game = any(column[1] == 'game' for column in columns)
            if not has_game:
                db.session.execute(text('ALTER TABLE sport_room_entries ADD COLUMN game VARCHAR(100)'))
                db.session.commit()
            _sport_schema_ready = True
            return

        db.session.execute(text(
            'ALTER TABLE sport_room_entries ADD COLUMN IF NOT EXISTS game VARCHAR(100) AFTER prn'
        ))
        db.session.commit()
        _sport_schema_ready = True
    except Exception:
        db.session.rollback()


@sport_bp.route('/entries', methods=['GET'])
@require_sport_authority
def list_entries():
    """List all sport room entries with optional filtering."""
    ensure_sport_room_schema()
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 20))
    prn_filter = request.args.get('prn', '').strip()
    name_filter = request.args.get('name', '').strip()

    q = SportRoomEntry.query
    if prn_filter:
        q = q.filter(SportRoomEntry.prn.ilike(f'%{prn_filter}%'))
    if name_filter:
        q = q.filter(SportRoomEntry.name.ilike(f'%{name_filter}%'))

    total = q.count()
    entries = q.order_by(SportRoomEntry.created_at.desc())\
        .offset((page - 1) * per_page).limit(per_page).all()

    return jsonify({
        'entries': [e.to_dict() for e in entries],
        'total': total,
        'page': page,
        'per_page': per_page,
        'pages': (total + per_page - 1) // per_page
    })


@sport_bp.route('/entries', methods=['POST'])
@require_sport_authority
def create_entry():
    """Create a new sport room entry."""
    ensure_sport_room_schema()
    user = g.current_user
    data = request.get_json()

    required = ['name', 'prn', 'game', 'branch', 'mobile_no', 'in_time']
    for field in required:
        if not data.get(field):
            return jsonify({'error': f'{field} is required'}), 400

    try:
        in_time = datetime.fromisoformat(data['in_time'].replace('Z', '+00:00'))
        out_time = None
        duration_minutes = None

        if data.get('out_time'):
            out_time = datetime.fromisoformat(data['out_time'].replace('Z', '+00:00'))
            if out_time < in_time:
                return jsonify({'error': 'Check-out time cannot be earlier than check-in time'}), 400
            duration_minutes = int((out_time - in_time).total_seconds() / 60)

        entry = SportRoomEntry(
            name=data['name'],
            prn=data['prn'],
            game=data['game'],
            branch=data['branch'],
            mobile_no=data['mobile_no'],
            in_time=in_time,
            out_time=out_time,
            duration_minutes=duration_minutes,
            recorded_by=user.id
        )
        db.session.add(entry)
        db.session.commit()

        return jsonify({
            'message': 'Entry created successfully',
            'entry': entry.to_dict()
        }), 201

    except ValueError as e:
        return jsonify({'error': f'Invalid data format: {str(e)}'}), 400


@sport_bp.route('/entries/<int:eid>', methods=['GET'])
@require_sport_authority
def get_entry(eid):
    """Get a specific sport room entry."""
    ensure_sport_room_schema()
    entry = SportRoomEntry.query.get_or_404(eid)
    return jsonify(entry.to_dict())


@sport_bp.route('/entries/<int:eid>', methods=['PUT'])
@require_sport_authority
def update_entry(eid):
    """Update a sport room entry (mainly for out_time and duration)."""
    ensure_sport_room_schema()
    user = g.current_user
    entry = SportRoomEntry.query.get_or_404(eid)
    data = request.get_json()

    try:
        if 'name' in data:
            entry.name = data['name']
        if 'prn' in data:
            entry.prn = data['prn']
        if 'game' in data:
            entry.game = data['game']
        if 'branch' in data:
            entry.branch = data['branch']
        if 'mobile_no' in data:
            entry.mobile_no = data['mobile_no']
        if 'in_time' in data:
            entry.in_time = datetime.fromisoformat(data['in_time'].replace('Z', '+00:00'))
        if 'out_time' in data and data['out_time']:
            out_time = datetime.fromisoformat(data['out_time'].replace('Z', '+00:00'))
            if out_time < entry.in_time:
                return jsonify({'error': 'Check-out time cannot be earlier than check-in time'}), 400
            entry.out_time = out_time
            entry.duration_minutes = int((out_time - entry.in_time).total_seconds() / 60)

        db.session.commit()
        return jsonify({'message': 'Entry updated', 'entry': entry.to_dict()})

    except ValueError as e:
        return jsonify({'error': f'Invalid data format: {str(e)}'}), 400


@sport_bp.route('/entries/<int:eid>', methods=['DELETE'])
@require_sport_authority
def delete_entry(eid):
    """Delete a sport room entry."""
    ensure_sport_room_schema()
    entry = SportRoomEntry.query.get_or_404(eid)
    db.session.delete(entry)
    db.session.commit()
    return jsonify({'message': 'Entry deleted'})


@sport_bp.route('/stats', methods=['GET'])
@require_sport_authority
def get_stats():
    """Get sport room statistics."""
    ensure_sport_room_schema()
    total_entries = SportRoomEntry.query.count()
    entries_today = SportRoomEntry.query.filter(
        SportRoomEntry.created_at >= datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    ).count()
    active_entries = SportRoomEntry.query.filter(SportRoomEntry.out_time.is_(None)).count()

    return jsonify({
        'total_entries': total_entries,
        'entries_today': entries_today,
        'active_entries': active_entries,
    })
