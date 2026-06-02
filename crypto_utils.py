import os
from cryptography.fernet import Fernet


ENC_PREFIX = 'enc:'
KEY_FILE = '.env.prod.key'
PROD_ENV_FILE = '.env.prod'


def generate_key():
    return Fernet.generate_key()


def save_key(key, path=None):
    key_path = path or KEY_FILE
    with open(key_path, 'wb') as f:
        f.write(key)


def load_key(path=None):
    key_path = path or KEY_FILE
    if not os.path.exists(key_path):
        return None
    with open(key_path, 'rb') as f:
        return f.read().strip()


def encrypt_value(plaintext, key):
    f = Fernet(key)
    return ENC_PREFIX + f.encrypt(plaintext.encode()).decode()


def decrypt_value(ciphertext, key):
    if not ciphertext.startswith(ENC_PREFIX):
        return ciphertext
    f = Fernet(key)
    return f.decrypt(ciphertext[len(ENC_PREFIX):].encode()).decode()


def load_encrypted_config(app, base_dir=None):
    base = base_dir or os.path.abspath(os.path.dirname(__file__))
    key = load_key(os.path.join(base, KEY_FILE))
    if not key:
        return

    env_path = os.path.join(base, PROD_ENV_FILE)
    if not os.path.exists(env_path):
        return

    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#') or '=' not in line:
                continue
            k, v = line.split('=', 1)
            k = k.strip()
            v = v.strip()
            if v.startswith(ENC_PREFIX):
                v = decrypt_value(v, key)
            app.config[k] = v

    if 'DATABASE_URI' in app.config:
        app.config['SQLALCHEMY_DATABASE_URI'] = app.config.pop('DATABASE_URI')
    if 'JWT_SECRET_KEY' in app.config:
        app.config['JWT_SECRET_KEY'] = app.config['JWT_SECRET_KEY']
    if 'SUPER_ADMIN_ACCOUNT' in app.config:
        app.config['SUPER_ADMIN_ACCOUNT'] = app.config['SUPER_ADMIN_ACCOUNT']
    if 'SUPER_ADMIN_PASSWORD' in app.config:
        app.config['SUPER_ADMIN_PASSWORD'] = app.config['SUPER_ADMIN_PASSWORD']
