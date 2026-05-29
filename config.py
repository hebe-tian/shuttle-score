import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(BASE_DIR, 'shuttle_score.db')
SQLALCHEMY_TRACK_MODIFICATIONS = False

JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'shuttle-score-secret-key-change-in-production')

USER_TOKEN_EXPIRE_DAYS = 31
ADMIN_TOKEN_EXPIRE_DAYS = 7

SUPER_ADMIN_ACCOUNT = os.environ.get('SUPER_ADMIN_ACCOUNT', 'superadmin')
SUPER_ADMIN_PASSWORD = os.environ.get('SUPER_ADMIN_PASSWORD', 'admin123456')
