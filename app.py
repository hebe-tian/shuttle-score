from flask import Flask
from extensions import db
from config import SQLALCHEMY_DATABASE_URI, SQLALCHEMY_TRACK_MODIFICATIONS


def create_app():
    app = Flask(__name__, static_folder='static', static_url_path='')
    app.config['SQLALCHEMY_DATABASE_URI'] = SQLALCHEMY_DATABASE_URI
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = SQLALCHEMY_TRACK_MODIFICATIONS

    db.init_app(app)

    with app.app_context():
        from api.auth import auth_bp
        from api.players import players_bp
        from api.matches import matches_bp
        from api.stats import stats_bp
        from api.admin import admin_bp

        app.register_blueprint(auth_bp, url_prefix='/api/auth')
        app.register_blueprint(players_bp, url_prefix='/api/players')
        app.register_blueprint(matches_bp, url_prefix='/api/matches')
        app.register_blueprint(stats_bp, url_prefix='/api/stats')
        app.register_blueprint(admin_bp, url_prefix='/api/admin')

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
