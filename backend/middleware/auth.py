import os
import requests
from functools import wraps
from flask import request, jsonify, g
from models import User
from extensions import db


CLERK_SECRET_KEY = os.getenv('CLERK_SECRET_KEY')
ALLOWED_EMAIL_DOMAIN = 'vit.edu'


def _role_from_mock_user_id(user_id):
    if user_id.startswith('faculty_'):
        return 'faculty'
    if user_id.startswith('org_'):
        return 'organizer'
    if user_id.startswith('sport_auth_'):
        return 'sport_authority'
    return 'student'


def verify_clerk_token(token):
    """Verify token with Clerk API and return user info."""
    try:
        resp = requests.get(
            'https://api.clerk.com/v1/tokens/verify',
            headers={'Authorization': f'Bearer {CLERK_SECRET_KEY}'},
            params={'token': token},
            timeout=10
        )
        if resp.status_code == 200:
            return resp.json()
        return None
    except Exception:
        return None


def get_clerk_user(user_id):
    """Fetch user from Clerk by ID."""
    try:
        resp = requests.get(
            f'https://api.clerk.com/v1/users/{user_id}',
            headers={'Authorization': f'Bearer {CLERK_SECRET_KEY}'},
            timeout=10
        )
        if resp.status_code == 200:
            return resp.json()
        return None
    except Exception:
        return None


def require_auth(f):
    """Decorator to require valid Clerk authentication."""
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Authorization header required'}), 401
        
        token = auth_header.split(' ', 1)[1]
        
        # In dev mode, allow a mock token for testing
        if os.getenv('FLASK_ENV') == 'development' and token.startswith('mock_'):
            parts = token.split('_')
            if len(parts) >= 3:
                user_id = '_'.join(parts[1:])
                user = User.query.get(user_id)
                if not user:
                    role = _role_from_mock_user_id(user_id)
                    user = User(
                        id=user_id,
                        email=f'{user_id}@{ALLOWED_EMAIL_DOMAIN}',
                        name=user_id.replace('_', ' ').title(),
                        role=role
                    )
                    db.session.add(user)
                    db.session.commit()

                g.current_user = user
                return f(*args, **kwargs)
        
        # Production: verify with Clerk
        clerk_data = verify_clerk_token(token)
        if not clerk_data:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        clerk_user_id = clerk_data.get('sub')
        clerk_user = get_clerk_user(clerk_user_id)
        
        if not clerk_user:
            return jsonify({'error': 'User not found'}), 401
        
        # Extract primary email
        emails = clerk_user.get('email_addresses', [])
        primary_email = next((e['email_address'] for e in emails if e['id'] == clerk_user.get('primary_email_address_id')), None)
        
        if not primary_email:
            return jsonify({'error': 'No email found'}), 401
        
        # Domain check
        if not primary_email.endswith(f'@{ALLOWED_EMAIL_DOMAIN}'):
            return jsonify({'error': f'Only @{ALLOWED_EMAIL_DOMAIN} emails are allowed'}), 403
        
        # Sync user to DB
        user = User.query.get(clerk_user_id)
        if not user:
            user = User(
                id=clerk_user_id,
                email=primary_email,
                name=f"{clerk_user.get('first_name', '')} {clerk_user.get('last_name', '')}".strip(),
                avatar_url=clerk_user.get('image_url')
            )
            db.session.add(user)
            db.session.commit()
        
        if user.is_banned:
            return jsonify({'error': 'Your account has been banned', 'reason': user.ban_reason}), 403
        
        g.current_user = user
        return f(*args, **kwargs)
    
    return decorated


def require_role(*roles):
    """Decorator factory to require specific roles."""
    def decorator(f):
        @wraps(f)
        @require_auth
        def decorated(*args, **kwargs):
            if g.current_user.role not in roles:
                return jsonify({'error': f'Access denied. Required role: {", ".join(roles)}'}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator


def require_organizer(f):
    return require_role('organizer', 'faculty')(f)


def require_faculty(f):
    return require_role('faculty')(f)


def require_sport_authority(f):
    return require_role('sport_authority')(f)
