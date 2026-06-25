from flask import Blueprint, request, current_app
import jwt
import time
import random
from datetime import datetime
from extensions import db
from models.user import User
from models.single_player import SinglePlayer
from models.match import Match
from models.team import Team, TeamMember
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

            invite_player = SinglePlayer.query.filter_by(id=invite, deleted=0).first()
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

        player = SinglePlayer(
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

        # 同步更新联动选手的名称
        linked_player = SinglePlayer.query.filter_by(user_id=user.id, created_by=user.id, deleted=0).first()
        if linked_player:
            linked_player.name = username

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


# ==================== 忘记密码 ====================

# 简单的内存限流：{account: [timestamp, ...]}
_forgot_password_attempts = {}


def _check_rate_limit(account):
    """检查24小时内忘记密码尝试次数，超过3次返回False"""
    now = int(time.time())
    cutoff = now - 86400
    attempts = _forgot_password_attempts.get(account, [])
    attempts = [t for t in attempts if t > cutoff]
    _forgot_password_attempts[account] = attempts
    return len(attempts) < 3


def _record_attempt(account):
    """记录一次忘记密码尝试"""
    now = int(time.time())
    if account not in _forgot_password_attempts:
        _forgot_password_attempts[account] = []
    _forgot_password_attempts[account].append(now)


def _build_player_options(user):
    """构造选手验证选择题，只取1条正确数据，无数据时也返回纯干扰项
    排除注册时自动创建的选手（created_by == user_id）"""
    user_players = SinglePlayer.query.filter(
        SinglePlayer.created_by == user.id,
        SinglePlayer.deleted == 0,
        db.or_(SinglePlayer.user_id != user.id, SinglePlayer.user_id.is_(None))
    ).all()

    # 随机选1条正确答案
    correct_name = random.choice([p.name for p in user_players]) if user_players else None

    # 从其他用户的选手中选取干扰项
    other_players = SinglePlayer.query.filter(
        SinglePlayer.created_by != user.id,
        SinglePlayer.deleted == 0
    ).all()
    other_names = list(set(p.name for p in other_players if p.name != correct_name))
    random.shuffle(other_names)

    # 凑够4个选项
    distractor_count = min(len(other_names), 3)
    distractors = other_names[:distractor_count]
    if correct_name:
        options = [correct_name] + distractors
    else:
        options = distractors
    random.shuffle(options)

    return {
        "available": True,
        "question": "请选择你创建的选手",
        "options": options
    }


def _build_match_options(user):
    """构造比赛验证选择题，只取1条正确数据，无数据时也返回纯干扰项"""
    user_matches = Match.query.filter_by(created_by=user.id, deleted=0).all()

    def _match_label(m):
        date_str = datetime.fromtimestamp(m.match_time).strftime('%Y-%m-%d') if m.match_time else '未知日期'
        return f"{date_str} {m.type}"

    # 随机选1条正确答案
    correct_label = _match_label(random.choice(user_matches)) if user_matches else None

    # 从其他用户的比赛中选取干扰项
    other_matches = Match.query.filter(
        Match.created_by != user.id,
        Match.deleted == 0
    ).all()
    other_labels = list(set(_match_label(m) for m in other_matches if _match_label(m) != correct_label))
    random.shuffle(other_labels)

    # 凑够4个选项
    distractor_count = min(len(other_labels), 3)
    distractors = other_labels[:distractor_count]
    if correct_label:
        options = [correct_label] + distractors
    else:
        options = distractors
    random.shuffle(options)

    return {
        "available": True,
        "question": "请选择你录入的比赛",
        "options": options
    }


def _build_team_options(user):
    """构造团队验证选择题，只取1条正确数据，无数据时也返回纯干扰项"""
    user_team_members = TeamMember.query.filter_by(user_id=user.id).all()

    team_ids = [tm.team_id for tm in user_team_members]
    user_teams = Team.query.filter(Team.id.in_(team_ids), Team.deleted == 0).all() if team_ids else []

    # 随机选1条正确答案
    correct_name = random.choice([t.name for t in user_teams]) if user_teams else None

    # 从其他团队中选取干扰项
    other_teams = Team.query.filter(
        Team.id.notin_(team_ids) if team_ids else True,
        Team.deleted == 0
    ).all()
    other_names = list(set(t.name for t in other_teams if t.name != correct_name))
    random.shuffle(other_names)

    # 凑够4个选项
    distractor_count = min(len(other_names), 3)
    distractors = other_names[:distractor_count]
    if correct_name:
        options = [correct_name] + distractors
    else:
        options = distractors
    random.shuffle(options)

    return {
        "available": True,
        "question": "请选择你加入的团队",
        "options": options
    }


@auth_bp.route('/forgot-password/verify-account', methods=['POST'])
def forgot_password_verify_account():
    """Step 1: 验证账号存在，返回可验证项和选择题"""
    data = request.get_json(silent=True) or {}
    account = data.get('account', '').strip()

    if not account:
        return bad_request("请输入账号")

    if not _check_rate_limit(account):
        return bad_request("尝试次数过多，请24小时后再试")

    user = User.query.filter_by(account=account).first()
    if not user:
        # 不暴露账号是否存在
        return bad_request("验证失败")

    player_opts = _build_player_options(user)
    match_opts = _build_match_options(user)
    team_opts = _build_team_options(user)

    result = {"verification_options": {}}
    for key, opts in [("players", player_opts), ("matches", match_opts), ("teams", team_opts)]:
        result["verification_options"][key] = {
            "available": True,
            "question": opts["question"],
            "options": opts["options"]
        }

    return success(result)


@auth_bp.route('/forgot-password/verify-identity', methods=['POST'])
def forgot_password_verify_identity():
    """Step 2: 提交验证答案，验证通过返回临时Token"""
    data = request.get_json(silent=True) or {}
    account = data.get('account', '').strip()
    verification = data.get('verification', {})

    if not account:
        return bad_request("请输入账号")

    if not _check_rate_limit(account):
        return bad_request("尝试次数过多，请24小时后再试")

    _record_attempt(account)

    user = User.query.filter_by(account=account).first()
    if not user:
        return bad_request("验证失败")

    v_type = verification.get('type', '')

    if v_type == 'none':
        # 用户声称未录入过数据，验证是否属实（排除注册时自动创建的选手）
        has_players = SinglePlayer.query.filter(
            SinglePlayer.created_by == user.id,
            SinglePlayer.deleted == 0,
            db.or_(SinglePlayer.user_id != user.id, SinglePlayer.user_id.is_(None))
        ).first() is not None
        has_matches = Match.query.filter_by(created_by=user.id, deleted=0).first() is not None
        has_team_members = TeamMember.query.filter_by(user_id=user.id).first() is not None
        if has_players or has_matches or has_team_members:
            return bad_request("验证失败")
    elif v_type == 'players':
        selected = verification.get('selected', '')
        if not selected:
            return bad_request("验证失败")
        # 排除注册时自动创建的选手
        correct_players = SinglePlayer.query.filter(
            SinglePlayer.created_by == user.id,
            SinglePlayer.deleted == 0,
            db.or_(SinglePlayer.user_id != user.id, SinglePlayer.user_id.is_(None))
        ).all()
        correct_names = set(p.name for p in correct_players)
        if selected not in correct_names:
            return bad_request("验证失败")
    elif v_type == 'matches':
        selected = verification.get('selected', '')
        if not selected:
            return bad_request("验证失败")
        correct_matches = Match.query.filter_by(created_by=user.id, deleted=0).all()
        def _match_label(m):
            date_str = datetime.fromtimestamp(m.match_time).strftime('%Y-%m-%d') if m.match_time else '未知日期'
            return f"{date_str} {m.type}"
        correct_labels = set(_match_label(m) for m in correct_matches)
        if selected not in correct_labels:
            return bad_request("验证失败")
    elif v_type == 'teams':
        selected = verification.get('selected', '')
        if not selected:
            return bad_request("验证失败")
        user_team_members = TeamMember.query.filter_by(user_id=user.id).all()
        team_ids = [tm.team_id for tm in user_team_members]
        correct_teams = Team.query.filter(Team.id.in_(team_ids), Team.deleted == 0).all() if team_ids else []
        correct_names = set(t.name for t in correct_teams)
        if selected not in correct_names:
            return bad_request("验证失败")
    else:
        return bad_request("无效的验证类型")

    # 验证通过，签发临时重置Token
    reset_token = jwt.encode({
        'type': 'reset_password',
        'user_id': user.id,
        'exp': int(time.time()) + 600
    }, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')

    return success({"reset_token": reset_token})


@auth_bp.route('/forgot-password/reset', methods=['POST'])
def forgot_password_reset():
    """Step 3: 用临时Token重置密码"""
    data = request.get_json(silent=True) or {}
    reset_token = data.get('reset_token', '')
    new_password = data.get('new_password', '')

    if not reset_token or not new_password:
        return bad_request("参数不完整")

    ok, msg = validate_password(new_password)
    if not ok:
        return bad_request(msg)

    try:
        token_data = jwt.decode(reset_token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
        if token_data.get('type') != 'reset_password':
            return bad_request("无效的重置Token")
    except jwt.ExpiredSignatureError:
        return bad_request("重置Token已过期，请重新验证")
    except jwt.InvalidTokenError:
        return bad_request("无效的重置Token")

    user_id = token_data['user_id']
    user = User.query.get(user_id)
    if not user:
        return bad_request("用户不存在")

    user.set_password(new_password)
    user.updated_at = int(time.time())
    db.session.commit()

    return success({"message": "密码重置成功"})
