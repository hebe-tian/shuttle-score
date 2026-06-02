import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))


class Config:
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    USER_TOKEN_EXPIRE_DAYS = 31
    ADMIN_TOKEN_EXPIRE_DAYS = 7


class DevelopmentConfig(Config):
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(BASE_DIR, 'shuttle_score.db')
    JWT_SECRET_KEY = 'dev-secret-key'
    SUPER_ADMIN_ACCOUNT = 'superadmin'
    SUPER_ADMIN_PASSWORD = 'admin123456'


class ProductionConfig(Config):
    DEBUG = False
    SQLALCHEMY_DATABASE_URI = 'sqlite:///' + os.path.join(BASE_DIR, 'shuttle_score.db')
    JWT_SECRET_KEY = ''
    SUPER_ADMIN_ACCOUNT = ''
    SUPER_ADMIN_PASSWORD = ''


config_map = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
}
