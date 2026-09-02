import os
from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
from extensions import db, mail, jwt

load_dotenv()


def create_app():
    app = Flask(__name__)

    # ── Config ────────────────────────────────────────────────────────
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-change-me')
    app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
        'DATABASE_URL', 'mysql+pymysql://root:password@localhost:3306/arenax')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {'pool_pre_ping': True, 'pool_recycle': 300}
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret')

    # Mail
    app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
    app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True') == 'True'
    app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
    app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
    app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER', 'ArenaX <noreply@arenax.vit>')

    # ── Extensions ───────────────────────────────────────────────────
    db.init_app(app)
    mail.init_app(app)
    jwt.init_app(app)

    CORS(app, resources={r'/api/*': {'origins': os.getenv('FRONTEND_URL', 'http://localhost:5173')}},
         supports_credentials=True)

    # ── Blueprints ───────────────────────────────────────────────────
    from blueprints.auth_routes import auth_bp
    from blueprints.tournament_routes import tournament_bp
    from blueprints.team_routes import team_bp
    from blueprints.other_routes import organizer_bp, leaderboard_bp, report_bp, admin_bp
    from blueprints.sport_routes import sport_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(tournament_bp)
    app.register_blueprint(team_bp)
    app.register_blueprint(organizer_bp)
    app.register_blueprint(leaderboard_bp)
    app.register_blueprint(report_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(sport_bp)

    # ── Init DB + Scheduler ──────────────────────────────────────────
    with app.app_context():
        db.create_all()

    if os.getenv('FLASK_ENV') != 'testing':
        from utils.scheduler import init_scheduler
        init_scheduler(app)

    @app.route('/api/health')
    def health():
        return {'status': 'ok', 'service': 'ArenaX API'}

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=os.getenv('FLASK_DEBUG', 'True') == 'True', port=5000)
