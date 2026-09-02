"""
APScheduler cron jobs for ArenaX.
- Every 5 minutes: drop teams with expired verification deadlines
- Every hour: update tournament status (published -> ongoing -> completed)
"""
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
import logging

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler()


def check_team_deadlines(app):
    """Drop teams where deadline passed and not all members verified."""
    with app.app_context():
        from models import Team, Tournament
        from extensions import db
        
        now = datetime.utcnow()
        expired_teams = Team.query.filter(
            Team.status == 'pending',
            Team.verification_deadline < now
        ).all()
        
        for team in expired_teams:
            team.status = 'dropped'
            logger.info(f"Dropped team {team.id} ({team.team_name}) - verification deadline passed")
        
        if expired_teams:
            db.session.commit()
            logger.info(f"Dropped {len(expired_teams)} teams due to deadline")


def update_tournament_statuses(app):
    """Auto-update tournament statuses based on dates."""
    with app.app_context():
        from models import Tournament
        from extensions import db
        
        now = datetime.utcnow()
        
        # Published -> Ongoing (start date reached)
        Tournament.query.filter(
            Tournament.status == 'published',
            Tournament.start_date <= now
        ).update({'status': 'ongoing'})
        
        # Ongoing -> Completed (end date passed)
        Tournament.query.filter(
            Tournament.status == 'ongoing',
            Tournament.end_date < now
        ).update({'status': 'completed'})
        
        db.session.commit()


def init_scheduler(app):
    """Initialize and start the scheduler."""
    scheduler.add_job(
        func=lambda: check_team_deadlines(app),
        trigger=IntervalTrigger(minutes=5),
        id='check_team_deadlines',
        name='Check team verification deadlines',
        replace_existing=True
    )
    scheduler.add_job(
        func=lambda: update_tournament_statuses(app),
        trigger=IntervalTrigger(minutes=30),
        id='update_tournament_statuses',
        name='Update tournament statuses',
        replace_existing=True
    )
    scheduler.start()
    logger.info("Scheduler started")
    return scheduler
