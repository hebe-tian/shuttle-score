import os
from flask import Flask
from extensions import db, migrate
from config import config_map
from crypto_utils import load_encrypted_config


def create_app():
    env = os.environ.get('FLASK_ENV', 'development')
    config_class = config_map.get(env, config_map['development'])

    app = Flask(__name__, static_folder='static', static_url_path='')
    app.config.from_object(config_class)

    if env == 'production':
        load_encrypted_config(app)

    db.init_app(app)
    migrate.init_app(app, db)

    with app.app_context():
        from api.auth import auth_bp
        from api.players import players_bp
        from api.matches import matches_bp
        from api.stats import stats_bp
        from api.admin import admin_bp
        from api.settings import settings_bp
        from api.teams import teams_bp

        app.register_blueprint(auth_bp, url_prefix='/api/auth')
        app.register_blueprint(players_bp, url_prefix='/api/players')
        app.register_blueprint(matches_bp, url_prefix='/api/matches')
        app.register_blueprint(stats_bp, url_prefix='/api/stats')
        app.register_blueprint(admin_bp, url_prefix='/api/admin')
        app.register_blueprint(settings_bp, url_prefix='/api/settings')
        app.register_blueprint(teams_bp, url_prefix='/api/teams')

    from cli import register_cli
    register_cli(app)

    @app.route('/')
    def index():
        return app.send_static_file('pages/index.html')

    @app.route('/pages/<path:filename>')
    def serve_pages(filename):
        return app.send_static_file('pages/' + filename)

    @app.route('/admin/<path:filename>')
    def serve_admin(filename):
        return app.send_static_file('pages/admin/' + filename)

    return app


if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)
