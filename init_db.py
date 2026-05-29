from app import create_app, db
from models.user import User, Admin
from models.player import Player
from models.match import Match, MatchPlayer, MatchScore
from config import SUPER_ADMIN_ACCOUNT, SUPER_ADMIN_PASSWORD
from werkzeug.security import generate_password_hash
import time


def init_db():
    app = create_app()
    with app.app_context():
        db.create_all()

        existing = Admin.query.filter_by(role='super_admin').first()
        if not existing:
            now = int(time.time())
            super_admin = Admin(
                account=SUPER_ADMIN_ACCOUNT,
                password_hash=generate_password_hash(SUPER_ADMIN_PASSWORD),
                role='super_admin',
                status=1,
                created_by=0,
                created_at=now,
                updated_at=now
            )
            db.session.add(super_admin)
            db.session.commit()
            print(f'Super admin created: {SUPER_ADMIN_ACCOUNT}')
        else:
            print('Super admin already exists')

        print('Database initialized successfully')


if __name__ == '__main__':
    init_db()
