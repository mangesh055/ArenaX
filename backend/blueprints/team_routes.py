import os
import secrets
from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request, g
from middleware.auth import require_auth
from models import Team, TeamMember, Invitation, Tournament, User, Notification
from extensions import db, mail
from flask_mail import Message

team_bp = Blueprint('teams', __name__, url_prefix='/api/teams')
ALLOWED_DOMAIN = 'vit.edu'
VERIFICATION_HOURS = int(os.getenv('TEAM_VERIFICATION_HOURS', 72))


def update_tournament_participants(tournament_id):
    """Helper function to update tournament's current_participants count"""
    confirmed_count = Team.query.filter_by(
        tournament_id=tournament_id, status='confirmed'
    ).count()
    tournament = Tournament.query.get(tournament_id)
    if tournament:
        tournament.current_participants = confirmed_count
        db.session.add(tournament)
    return confirmed_count


def notify_user(user_id, title, message, notif_type='info', related_type=None, related_id=None):
    n = Notification(user_id=user_id, title=title, message=message,
                     type=notif_type, related_type=related_type, related_id=related_id)
    db.session.add(n)


def send_invite_email(to_email, team_name, tournament_title, token, deadline):
    frontend_url = os.getenv('FRONTEND_URL', 'http://localhost:5173')
    invite_link = f"{frontend_url}/invite/{token}"
    try:
        msg = Message(
            subject=f"You're invited to join {team_name} — ArenaX",
            recipients=[to_email],
            html=f"""
            <div style="font-family:sans-serif;max-width:600px;margin:auto;background:#0f0f1a;color:#fff;padding:32px;border-radius:12px;">
              <h1 style="color:#f97316;margin-bottom:8px;">⚡ ArenaX</h1>
              <h2 style="color:#fff;">Team Invite: {team_name}</h2>
              <p>You've been invited to join team <strong>{team_name}</strong> for <strong>{tournament_title}</strong>.</p>
              <p>⚠️ You must accept before: <strong>{deadline.strftime('%b %d, %Y at %I:%M %p')}</strong></p>
              <a href="{invite_link}" style="display:inline-block;margin-top:16px;padding:14px 28px;background:#f97316;color:#fff;border-radius:8px;text-decoration:none;font-weight:700;">
                Accept Invitation
              </a>
              <p style="margin-top:24px;color:#888;font-size:13px;">Only @{ALLOWED_DOMAIN} emails can accept. Login via Clerk to proceed.</p>
            </div>
            """
        )
        mail.send(msg)
    except Exception as e:
        print(f"Email failed: {e}")


@team_bp.route('/tournament/<int:tid>', methods=['GET'])
@require_auth
def get_tournament_teams(tid):
    user = g.current_user
    tournament = Tournament.query.get_or_404(tid)
    
    # Only organizer/faculty can see all teams
    if user.role in ['organizer', 'faculty']:
        teams = Team.query.filter_by(tournament_id=tid)\
            .order_by(Team.registered_at.asc()).all()
    else:
        teams = Team.query.filter_by(tournament_id=tid, leader_id=user.id).all()
    
    result = []
    for team in teams:
        d = team.to_dict()
        d['members'] = [m.to_dict() for m in team.members.all()]
        d['leader'] = User.query.get(team.leader_id).to_dict() if team.leader_id else None
        result.append(d)
    
    return jsonify(result)


@team_bp.route('/tournament/<int:tid>/my-status', methods=['GET'])
@require_auth
def get_my_registration_status(tid):
    """Get the current user's registration status for a tournament."""
    user = g.current_user
    tournament = Tournament.query.get_or_404(tid)

    team = Team.query.filter_by(tournament_id=tid, leader_id=user.id).first()
    if not team:
        member = TeamMember.query.filter(
            TeamMember.team_id.in_(
                db.session.query(Team.id).filter(Team.tournament_id == tid)
            ),
            TeamMember.user_id == user.id,
            TeamMember.status == 'accepted'
        ).first()
        if not member:
            member = TeamMember.query.filter(
                TeamMember.team_id.in_(
                    db.session.query(Team.id).filter(Team.tournament_id == tid)
                ),
                TeamMember.email == user.email,
                TeamMember.status == 'accepted'
            ).first()
        if member:
            team = Team.query.get(member.team_id)

    if not team:
        return jsonify({
            'registered': False,
            'status': None,
            'team': None,
            'tournament_id': tournament.id,
        })

    team_data = team.to_dict()
    team_data['members'] = [m.to_dict() for m in team.members.all()]
    team_data['leader'] = User.query.get(team.leader_id).to_dict() if team.leader_id else None

    return jsonify({
        'registered': True,
        'status': team.status,
        'team': team_data,
        'tournament_id': tournament.id,
    })


@team_bp.route('', methods=['POST'])
@require_auth
def register_team():
    user = g.current_user
    data = request.get_json()
    
    tournament_id = data.get('tournament_id')
    team_name = data.get('team_name', '').strip()
    member_emails = data.get('member_emails', [])
    member_data = data.get('member_data', [])  # New: list of {email, name, branch, division, roll_no, college_name, prn, mobile_no}
    leader_data = data.get('leader_data', {})  # New: leader's detailed info {name, branch, division, roll_no, college_name, prn, mobile_no}
    
    if not tournament_id:
        return jsonify({'error': 'tournament_id is required'}), 400
    
    tournament = Tournament.query.get_or_404(tournament_id)
    
    # For team-based tournaments, require team_name
    if tournament.team_based and not team_name:
        return jsonify({'error': 'team_name is required for team-based tournaments'}), 400
    
    # For individual tournaments, generate unique team_name using user ID to avoid duplicates
    if not tournament.team_based and not team_name:
        team_name = f'participant_{user.id}_{tournament_id}'
    
    # Tournament must be published or ongoing
    if tournament.status not in ['published', 'ongoing']:
        error_msg = f'Tournament is {tournament.status.replace("_", " ")} - registration not open'
        if tournament.status == 'pending_approval':
            error_msg = 'Faculty must approve this tournament before registration opens'
        elif tournament.status == 'draft':
            error_msg = 'This tournament is still in draft mode - not open for registration'
        elif tournament.status == 'cancelled':
            error_msg = 'This tournament has been cancelled'
        elif tournament.status == 'completed':
            error_msg = 'This tournament has already been completed'
        return jsonify({'error': error_msg}), 400
    
    # Check if registration deadline has passed
    current_time = datetime.utcnow()
    if current_time > tournament.registration_deadline:
        deadline_str = tournament.registration_deadline.strftime("%B %d, %Y at %I:%M %p")
        return jsonify({'error': f'❌ Registration deadline has passed ({deadline_str})'}), 400
    
    # Check if user already in a team for this tournament (as leader or member)
    existing_team = Team.query.filter_by(tournament_id=tournament_id, leader_id=user.id).first()
    if existing_team:
        return jsonify({'error': 'You already registered a team for this tournament'}), 409
    
    # Also check if user is already a member of any team in this tournament
    all_teams = Team.query.filter_by(tournament_id=tournament_id).all()
    for team in all_teams:
        member = TeamMember.query.filter_by(team_id=team.id, email=user.email).first()
        if member and member.status in ['accepted', 'invited']:
            return jsonify({'error': 'You are already part of a team in this tournament'}), 409
    
    # Determine member count
    member_count = len(member_data) if member_data else len(member_emails)
    total = member_count + 1  # +1 for leader
    
    # For team-based tournaments, validate members count
    if tournament.team_based:
        if total < tournament.min_team_size:
            return jsonify({'error': f'Minimum team size is {tournament.min_team_size}'}), 400
        if total > tournament.max_team_size:
            return jsonify({'error': f'Maximum team size is {tournament.max_team_size}'}), 400
        
        # Validate domains for member emails or member_data
        emails_to_check = [m['email'] for m in member_data] if member_data else member_emails
        for email in emails_to_check:
            if not email.endswith(f'@{ALLOWED_DOMAIN}'):
                return jsonify({'error': f'{email} is not a @{ALLOWED_DOMAIN} email'}), 400
            if email == user.email:
                return jsonify({'error': 'You cannot invite yourself'}), 400
    
    # Check capacity
    confirmed_teams = Team.query.filter_by(
        tournament_id=tournament_id, status='confirmed').count()
    if confirmed_teams >= tournament.max_participants:
        return jsonify({'error': f'❌ Tournament is full ({tournament.max_participants}/{tournament.max_participants} participants)'}), 400
    
    deadline = datetime.utcnow() + timedelta(hours=VERIFICATION_HOURS)
    
    team = Team(
        tournament_id=tournament_id,
        leader_id=user.id,
        team_name=team_name,
        verification_deadline=deadline,
        total_members=total,
        confirmed_members=1,
        status='pending' if tournament.team_based and member_count > 0 else 'confirmed'
    )
    db.session.add(team)
    db.session.flush()
    
    # Update leader's profile with detailed info if provided
    if leader_data:
        if 'branch' in leader_data:
            user.branch = leader_data['branch']
        if 'division' in leader_data:
            user.division = leader_data['division']
        if 'roll_no' in leader_data:
            user.roll_no = leader_data['roll_no']
        if 'college_name' in leader_data:
            user.college_name = leader_data['college_name']
        if 'prn' in leader_data:
            user.prn = leader_data['prn']
        if 'mobile_no' in leader_data:
            user.mobile_no = leader_data['mobile_no']
    
    # Add leader as member
    leader_member = TeamMember(
        team_id=team.id, user_id=user.id, email=user.email,
        name=user.name, branch=user.branch, division=user.division,
        roll_no=user.roll_no, college_name=user.college_name,
        prn=user.prn, mobile_no=user.mobile_no,
        status='accepted', is_leader=True, joined_at=datetime.utcnow()
    )
    db.session.add(leader_member)
    
    # Invite members with detailed data
    if member_data:
        for member_info in member_data:
            email = member_info.get('email', '').strip()
            if not email:
                continue
                
            token = secrets.token_urlsafe(32)
            inv = Invitation(
                team_id=team.id, email=email, token=token,
                expires_at=deadline
            )
            db.session.add(inv)
            
            member = TeamMember(
                team_id=team.id, email=email,
                name=member_info.get('name', '').strip(),
                branch=member_info.get('branch', '').strip(),
                division=member_info.get('division', '').strip(),
                roll_no=member_info.get('roll_no', '').strip(),
                college_name=member_info.get('college_name', '').strip(),
                prn=member_info.get('prn', '').strip(),
                mobile_no=member_info.get('mobile_no', '').strip(),
                status='invited'
            )
            db.session.add(member)
            send_invite_email(email, team_name, tournament.title, token, deadline)
    elif member_emails:
        # Legacy: support old format with just emails
        for email in member_emails:
            token = secrets.token_urlsafe(32)
            inv = Invitation(
                team_id=team.id, email=email, token=token,
                expires_at=deadline
            )
            db.session.add(inv)
            member = TeamMember(team_id=team.id, email=email, status='invited')
            db.session.add(member)
            send_invite_email(email, team_name, tournament.title, token, deadline)
    
    # If individual tournament, confirm immediately
    if not tournament.team_based:
        team.status = 'confirmed'
        db.session.flush()  # Flush to make status change visible to queries
        # Count confirmed teams for this tournament
        confirmed_teams = Team.query.filter_by(
            tournament_id=tournament_id, status='confirmed'
        ).count()
        tournament.current_participants = confirmed_teams
    
    # Notify team leader
    notify_user(user.id, 'Team Registered! ⚡',
                f'Team "{team_name}" registered for {tournament.title}. Waiting for member confirmations.',
                'success', 'team', team.id)
    
    # Notify organizer ONLY if team is pending approval (not individual tournaments)
    if team.status == 'pending':
        notify_user(
            tournament.organizer_id,
            'New Team Registration Pending Approval',
            f'Team "{team_name}" needs your approval. {team.confirmed_members}/{team.total_members} members confirmed.',
            'info', 'team', team.id
        )
    
    db.session.commit()
    
    d = team.to_dict()
    d['members'] = [m.to_dict() for m in team.members.all()]
    return jsonify({'message': 'Team registered successfully', 'team': d}), 201


@team_bp.route('/invite/<token>', methods=['GET'])
def get_invite_info(token):
    inv = Invitation.query.filter_by(token=token).first_or_404()
    if inv.status == 'expired' or datetime.utcnow() > inv.expires_at:
        inv.status = 'expired'
        db.session.commit()
        return jsonify({'error': 'Invitation has expired'}), 410
    
    team = Team.query.get(inv.team_id)
    tournament = Tournament.query.get(team.tournament_id)
    leader = User.query.get(team.leader_id)
    
    return jsonify({
        'token': token,
        'email': inv.email,
        'team_name': team.team_name,
        'tournament': tournament.to_dict(),
        'leader_name': leader.name if leader else 'Unknown',
        'expires_at': inv.expires_at.isoformat(),
        'status': inv.status
    })


@team_bp.route('/invite/<token>/respond', methods=['POST'])
@require_auth
def respond_invite(token):
    user = g.current_user
    data = request.get_json()
    action = data.get('action')  # 'accept' or 'decline'
    
    if action not in ['accept', 'decline']:
        return jsonify({'error': 'Action must be accept or decline'}), 400
    
    inv = Invitation.query.filter_by(token=token).first_or_404()
    
    if inv.email != user.email:
        return jsonify({'error': 'This invitation is not for you'}), 403
    
    if inv.status != 'pending':
        return jsonify({'error': f'Invitation already {inv.status}'}), 409
    
    if datetime.utcnow() > inv.expires_at:
        inv.status = 'expired'
        db.session.commit()
        return jsonify({'error': 'Invitation has expired'}), 410
    
    inv.status = action + 'd'  # accepted / declined
    inv.responded_at = datetime.utcnow()
    
    member = TeamMember.query.filter_by(team_id=inv.team_id, email=user.email).first()
    if member:
        member.status = 'accepted' if action == 'accept' else 'declined'
        member.user_id = user.id
        if action == 'accept':
            member.joined_at = datetime.utcnow()
    
    if action == 'accept':
        team = inv.team
        team.confirmed_members += 1
        if team.confirmed_members >= team.total_members:
            team.status = 'confirmed'
            notify_user(
                team.leader_id,
                'Team Fully Verified',
                f'All members of team "{team.team_name}" have accepted invitations!',
                'success', 'team', team.id
            )
    
    db.session.commit()
    return jsonify({
        'message': f'Invitation {action}ed',
        'status': inv.status,
        'team_id': inv.team_id
    })


# ========== TEAM APPROVAL ENDPOINTS (for organizers/faculty) ==========

@team_bp.route('/<int:team_id>/approve', methods=['POST'])
@require_auth
def approve_team(team_id):
    """Only the tournament organizer (creator) can approve pending team registrations"""
    user = g.current_user
    
    team = Team.query.get_or_404(team_id)
    
    # Only the organizer who created the tournament can approve
    if team.tournament.organizer_id != user.id:
        return jsonify({'error': 'Only the tournament organizer can approve teams'}), 403
    
    # Must be an organizer
    if user.role != 'organizer':
        return jsonify({'error': 'Only organizers can approve teams'}), 403
    
    if team.status != 'pending':
        return jsonify({'error': f'Team is already {team.status}'}), 409
    
    team.status = 'confirmed'
    team.updated_at = datetime.utcnow()
    db.session.flush()  # Flush to make status change visible to queries
    
    # Update tournament participant count - count confirmed teams
    confirmed_teams = Team.query.filter_by(
        tournament_id=team.tournament.id, status='confirmed'
    ).count()
    team.tournament.current_participants = confirmed_teams
    db.session.add(team)
    db.session.add(team.tournament)
    
    # Notify team leader
    notify_user(
        team.leader_id,
        'Team Approved',
        f'Your team "{team.team_name}" has been approved by the organizer!',
        'success', 'team', team.id
    )
    
    db.session.commit()
    return jsonify({
        'message': 'Team approved successfully',
        'team': team.to_dict()
    })


@team_bp.route('/<int:team_id>/reject', methods=['POST'])
@require_auth
def reject_team(team_id):
    """Only the tournament organizer (creator) can reject pending team registrations"""
    user = g.current_user
    data = request.get_json() or {}
    
    team = Team.query.get_or_404(team_id)
    
    # Only the organizer who created the tournament can reject
    if team.tournament.organizer_id != user.id:
        return jsonify({'error': 'Only the tournament organizer can reject teams'}), 403
    
    # Must be an organizer
    if user.role != 'organizer':
        return jsonify({'error': 'Only organizers can reject teams'}), 403
    
    if team.status != 'pending':
        return jsonify({'error': f'Team is already {team.status}'}), 409
    
    reason = data.get('reason', 'Your team registration did not meet the tournament requirements.')
    team.status = 'disqualified'
    team.updated_at = datetime.utcnow()
    
    # Notify team leader
    notify_user(
        team.leader_id,
        'Team Rejected',
        f'Your team "{team.team_name}" registration was rejected. Reason: {reason}',
        'error', 'team', team.id
    )
    
    db.session.commit()
    return jsonify({
        'message': 'Team rejected',
        'team': team.to_dict()
    })


@team_bp.route('/tournament/<int:tournament_id>/pending', methods=['GET'])
@require_auth
def get_pending_teams(tournament_id):
    """Get all pending teams for a tournament (only tournament organizer)"""
    user = g.current_user
    
    tournament = Tournament.query.get_or_404(tournament_id)
    
    # Only the organizer who created the tournament can view pending teams
    if tournament.organizer_id != user.id:
        return jsonify({'error': 'Only the tournament organizer can view pending teams'}), 403
    
    # Must be an organizer
    if user.role != 'organizer':
        return jsonify({'error': 'Only organizers can view pending teams'}), 403
    
    # Get pending teams
    teams = Team.query.filter_by(tournament_id=tournament_id, status='pending')\
        .order_by(Team.registered_at.desc()).all()
    
    result = []
    for team in teams:
        d = team.to_dict()
        d['members'] = [m.to_dict() for m in team.members.all()]
        d['leader'] = User.query.get(team.leader_id).to_dict() if team.leader_id else None
        result.append(d)
    
    return jsonify({
        'pending_count': len(result),
        'teams': result
    })
