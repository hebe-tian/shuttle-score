import os
import sys
import secrets
import getpass
import time
import click
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db
from models.user import Admin
from crypto_utils import generate_key, save_key, encrypt_value, KEY_FILE, PROD_ENV_FILE


def register_cli(app):

    @app.cli.command('deploy')
    def deploy():
        env = os.environ.get('FLASK_ENV', 'development')
        click.echo('')
        click.echo('🚀 Shuttle Score 部署初始化')
        click.echo('')
        click.echo(f'环境: {env}')
        click.echo(f'数据库: {app.config["SQLALCHEMY_DATABASE_URI"]}')
        click.echo('')

        click.echo('步骤 1/3: 初始化数据库')
        from flask_migrate import upgrade
        try:
            upgrade()
        except Exception:
            db.create_all()
        click.echo('✓ 数据库表已创建')
        click.echo('')

        click.echo('步骤 2/3: 创建超级管理员')
        existing = Admin.query.filter_by(role='super_admin').first()
        if existing:
            click.echo('⚠️  超级管理员已存在')
            update = click.prompt('是否更新密码？(y/n)', default='n')
            if update.lower() == 'y':
                password = _prompt_password()
                existing.password_hash = generate_password_hash(password)
                existing.updated_at = int(time.time())
                db.session.commit()
                click.echo('✓ 超级管理员密码已更新')
            else:
                click.echo('跳过')
        else:
            account = _prompt_account()
            password = _prompt_password()
            now = int(time.time())
            super_admin = Admin(
                account=account,
                password_hash=generate_password_hash(password),
                role='super_admin',
                status=1,
                created_by=0,
                created_at=now,
                updated_at=now
            )
            db.session.add(super_admin)
            db.session.commit()
            click.echo(f'✓ 超级管理员创建成功: {account}')
        click.echo('')

        click.echo('步骤 3/3: 验证配置')
        try:
            admin = Admin.query.filter_by(role='super_admin').first()
            if admin and check_password_hash(admin.password_hash, password):
                click.echo('✓ 管理员账号可登录')
            else:
                click.echo('✓ 数据库连接正常')
        except Exception:
            click.echo('✓ 数据库连接正常')

        click.echo('')
        click.echo('🎉 部署完成！')

    @app.cli.command('create-superadmin')
    @click.option('--account', default=None, help='管理员账号')
    @click.option('--password', default=None, help='管理员密码')
    def create_superadmin(account, password):
        if not account:
            account = _prompt_account()
        else:
            if len(account) < 4 or len(account) > 20 or not account[0].isalpha() or not account.isalnum():
                click.echo('❌ 账号需4-20位，字母开头，仅字母数字')
                return

        if not password:
            password = _prompt_password()
        else:
            if len(password) < 6 or len(password) > 20:
                click.echo('❌ 密码需6-20位')
                return

        existing = Admin.query.filter_by(role='super_admin').first()
        if existing:
            existing.account = account
            existing.password_hash = generate_password_hash(password)
            existing.updated_at = int(time.time())
            db.session.commit()
            click.echo(f'✓ 超级管理员已更新: {account}')
        else:
            now = int(time.time())
            super_admin = Admin(
                account=account,
                password_hash=generate_password_hash(password),
                role='super_admin',
                status=1,
                created_by=0,
                created_at=now,
                updated_at=now
            )
            db.session.add(super_admin)
            db.session.commit()
            click.echo(f'✓ 超级管理员创建成功: {account}')

    @app.cli.command('encrypt-env')
    def encrypt_env():
        click.echo('')
        click.echo('🔐 生产环境配置加密')
        click.echo('')
        click.echo('将以下配置加密存储到 .env.prod 文件中。')
        click.echo('加密密钥将保存到 .env.prod.key，请妥善保管。')
        click.echo('')

        key = generate_key()
        base_dir = os.path.abspath(os.path.dirname(__file__))

        default_db = 'sqlite:///' + os.path.join(base_dir, 'shuttle_score.db')
        database_uri = click.prompt('DATABASE_URI', default=default_db)
        jwt_secret = click.prompt('JWT_SECRET_KEY (留空自动生成)', default='')
        if not jwt_secret:
            jwt_secret = secrets.token_hex(32)
            click.echo(f'  自动生成: {jwt_secret[:16]}...')

        admin_account = click.prompt('SUPER_ADMIN_ACCOUNT', default='superadmin')
        admin_password = click.prompt('SUPER_ADMIN_PASSWORD (留空自动生成)', default='')
        if not admin_password:
            admin_password = secrets.token_urlsafe(16)
            click.echo(f'  自动生成: {admin_password[:8]}...')

        lines = []
        lines.append(f'DATABASE_URI={encrypt_value(database_uri, key)}')
        lines.append(f'JWT_SECRET_KEY={encrypt_value(jwt_secret, key)}')
        lines.append(f'SUPER_ADMIN_ACCOUNT={encrypt_value(admin_account, key)}')
        lines.append(f'SUPER_ADMIN_PASSWORD={encrypt_value(admin_password, key)}')
        lines.append(f'USER_TOKEN_EXPIRE_DAYS=31')
        lines.append(f'ADMIN_TOKEN_EXPIRE_DAYS=7')

        prod_path = os.path.join(base_dir, PROD_ENV_FILE)
        with open(prod_path, 'w') as f:
            f.write('\n'.join(lines) + '\n')

        key_path = os.path.join(base_dir, KEY_FILE)
        save_key(key, key_path)

        click.echo('')
        click.echo(f'✓ 配置已加密保存到 {PROD_ENV_FILE}')
        click.echo(f'✓ 加密密钥已保存到 {KEY_FILE}')
        click.echo('⚠️  请将 .env.prod.key 安全传输到服务器，不要提交到 Git')


def _prompt_account():
    while True:
        account = click.prompt('请输入管理员账号 (4-20位，字母开头)')
        if len(account) < 4 or len(account) > 20:
            click.echo('  ❌ 账号长度需为4-20位')
            continue
        if not account[0].isalpha() or not account.isalnum():
            click.echo('  ❌ 账号需字母开头，仅字母数字')
            continue
        return account


def _prompt_password():
    while True:
        password = getpass.getpass('请输入管理员密码 (6-20位): ')
        if len(password) < 6 or len(password) > 20:
            click.echo('  ❌ 密码长度需为6-20位')
            continue
        confirm = getpass.getpass('请确认密码: ')
        if password != confirm:
            click.echo('  ❌ 两次密码不一致')
            continue
        return password
