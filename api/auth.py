from flask import Blueprint, request, current_app
import jwt
import time
from extensions import db
from models.user import User
from models.player import Player
from utils.response import success, bad_request, conflict, unauthorized, not_found
from utils.validators import validate_account, validate_password, validate_username
from utils.auth_decorator import token_required

auth_bp = Blueprint('auth', __name__)


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json(silent=True) or {}
    step = data.get('step', 1)

    if step == 1:
        account = data.get('account', '').strip()
        password = data.get('password', '')

        ok, msg = validate_account(account)
        if not ok:
            return bad_request(msg)

        ok, msg = validate_password(password)
        if not ok:
            return bad_request(msg)

        if User.query.filter_by(account=account).first():
            return conflict("账号已存在")

        temp_token = jwt.encode({
            'type': 'register_temp',
            'account': account,
            'password': password,
            'exp': int(time.time()) + 600
        }, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')

        return success({"temp_token": temp_token, "account": account})

    elif step == 2:
        temp_token = data.get('temp_token', '')
        username = data.get('username', '').strip()
        gender = data.get('gender', '')
        invite = data.get('invite')

        ok, msg = validate_username(username)
        if not ok:
            return bad_request(msg)

        if gender not in ('male', 'female'):
            return bad_request("请选择性别")

        if not temp_token:
            return bad_request("缺少临时Token")

        try:
            token_data = jwt.decode(temp_token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
            if token_data.get('type') != 'register_temp':
                return bad_request("无效的临时Token")
        except jwt.ExpiredSignatureError:
            return bad_request("临时Token已过期，请重新注册")
        except jwt.InvalidTokenError:
            return bad_request("无效的临时Token")

        account = token_data['account']
        password = token_data['password']

        if User.query.filter_by(account=account).first():
            return conflict("账号已存在")

        if User.query.filter_by(username=username).first():
            return conflict("用户名已存在")

        invite_player = None
        if invite:
            try:
                invite = int(invite)
            except (ValueError, TypeError):
                return bad_request("邀请参数无效")

            invite_player = Player.query.filter_by(id=invite, deleted=0).first()
            if not invite_player:
                return bad_request("邀请链接无效")
            if invite_player.user_id:
                return bad_request("该选手已被绑定")
            now_ts = int(time.time())
            if invite_player.invite_expires_at <= 0 or invite_player.invite_expires_at < now_ts:
                return bad_request("邀请链接已过期")

        now = int(time.time())
        user = User(
            account=account,
            username=username,
            gender=gender,
            status=1,
            created_at=now,
            updated_at=now
        )
        user.set_password(password)
        db.session.add(user)
        db.session.flush()

        player = Player(
            name=username,
            gender=gender,
            created_by=user.id,
            user_id=user.id,
            created_at=now
        )
        db.session.add(player)

        if invite_player:
            invite_player.user_id = user.id
            invite_player.invite_expires_at = 0

        db.session.commit()

        result = {"user_id": user.id, "account": user.account, "username": user.username}
        if invite_player:
            result["bound_player"] = invite_player.name

        return success(result)

    return bad_request("无效的步骤")


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    account = data.get('account', '').strip()
    password = data.get('password', '')

    if not account or not password:
        return bad_request("账号和密码不能为空")

    user = User.query.filter_by(account=account).first()
    if not user or not user.check_password(password):
        return unauthorized("账号或密码错误")

    if user.status != 1:
        return unauthorized("账号已被禁用")

    token = jwt.encode({
        'type': 'user',
        'user_id': user.id,
        'exp': int(time.time()) + current_app.config['USER_TOKEN_EXPIRE_DAYS'] * 86400
    }, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')

    return success({
        "token": token,
        "user": user.to_dict()
    })


@auth_bp.route('/profile', methods=['GET'])
@token_required
def get_profile():
    user = request.current_user
    return success(user.to_dict())


@auth_bp.route('/profile', methods=['POST'])
@token_required
def update_profile():
    user = request.current_user
    data = request.get_json(silent=True) or {}
    action = data.get('action', '')

    if action == 'update_username':
        username = data.get('username', '').strip()
        ok, msg = validate_username(username)
        if not ok:
            return bad_request(msg)

        existing = User.query.filter(User.username == username, User.id != user.id).first()
        if existing:
            return conflict("用户名已存在")

        user.username = username
        user.updated_at = int(time.time())
        db.session.commit()
        return success(user.to_dict())

    elif action == 'update_password':
        old_password = data.get('old_password', '')
        new_password = data.get('new_password', '')

        if not old_password or not new_password:
            return bad_request("旧密码和新密码不能为空")

        if not user.check_password(old_password):
            return bad_request("旧密码错误")

        ok, msg = validate_password(new_password)
        if not ok:
            return bad_request(msg)

        user.set_password(new_password)
        user.updated_at = int(time.time())
        db.session.commit()
        return success({"message": "密码修改成功"})

    return bad_request("无效的操作类型")
