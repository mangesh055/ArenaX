from flask import Blueprint, jsonify, request, g
from middleware.auth import require_auth
from models import User, Notification
from extensions import db

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@auth_bp.route('/me', methods=['GET'])
@require_auth
def get_me():
    """Get current user profile."""
    user = g.current_user
    unread = Notification.query.filter_by(user_id=user.id, read_status=False).count()
    data = user.to_dict()
    data['unread_notifications'] = unread
    return jsonify(data)


@auth_bp.route('/sync', methods=['POST'])
@require_auth
def sync_user():
    """Sync/update user profile from Clerk data."""
    user = g.current_user
    data = request.get_json() or {}
    
    # Update user profile fields
    if 'department' in data:
        user.department = data['department']
    if 'year_of_study' in data:
        user.year_of_study = data['year_of_study']
    if 'name' in data:
        user.name = data['name']
    if 'branch' in data:
        user.branch = data['branch']
    if 'division' in data:
        user.division = data['division']
    if 'roll_no' in data:
        user.roll_no = data['roll_no']
    if 'college_name' in data:
        user.college_name = data['college_name']
    if 'prn' in data:
        user.prn = data['prn']
    if 'mobile_no' in data:
        user.mobile_no = data['mobile_no']
    
    db.session.commit()
    return jsonify({'message': 'Profile updated', 'user': user.to_dict()})


@auth_bp.route('/notifications', methods=['GET'])
@require_auth
def get_notifications():
    user = g.current_user
    notifs = Notification.query.filter_by(user_id=user.id)\
        .order_by(Notification.created_at.desc()).limit(50).all()
    return jsonify([n.to_dict() for n in notifs])


@auth_bp.route('/notifications/read', methods=['POST'])
@require_auth
def mark_notifications_read():
    user = g.current_user
    Notification.query.filter_by(user_id=user.id, read_status=False)\
        .update({'read_status': True})
    db.session.commit()
    return jsonify({'message': 'Marked as read'})
