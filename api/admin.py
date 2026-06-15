from flask import Blueprint, request, current_app
from extensions import db
from models.user import User, Admin
from models.match import Match, MatchPlayer, MatchScore
from models.player import Player
from models.setting import Setting
from models.team import Team, TeamMember
from utils.response import success, bad_request, conflict, not_found, forbidden
from utils.validators import validate_account, validate_password, validate_page, validate_page_size, VALID_MATCH_TYPES
from utils.auth_decorator import admin_token_required, super_admin_required
from werkzeug.security import generate_password_hash
import time
import jwt

admin_bp = Blueprint('admin', __name__)


@admin_bp.route('/auth/login', methods=['POST'])
def admin_login():
    data = request.get_json(silent=True) or {}
    account = data.get('account', '').strip()
    password = data.get('password', '')

    if not account or not password:
        return bad_request("账号和密码不能为空")

    admin = Admin.query.filter_by(account=account).first()
    if not admin or not admin.check_password(password):
        return bad_request("账号或密码错误")

    if admin.status != 1:
        return bad_request("管理员账号已被禁用")

    token = jwt.encode({
        'type': 'admin',
        'admin_id': admin.id,
        'role': admin.role,
        'exp': int(time.time()) + current_app.config['ADMIN_TOKEN_EXPIRE_DAYS'] * 86400
    }, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')

    return success({
        "token": token,
        "admin": admin.to_dict()
    })


@admin_bp.route('/admins', methods=['GET'])
@admin_token_required
def get_admins():
    admin = request.current_admin
    if admin.role != 'super_admin':
        return forbidden("仅超级管理员可查看管理员列表")

    admins = Admin.query.order_by(Admin.created_at.desc()).all()
    return success([a.to_dict() for a in admins])


@admin_bp.route('/admins', methods=['POST'])
@super_admin_required
def create_admin():
    data = request.get_json(silent=True) or {}
    account = data.get('account', '').strip()
    password = data.get('password', '')

    ok, msg = validate_account(account)
    if not ok:
        return bad_request(msg)

    ok, msg = validate_password(password)
    if not ok:
        return bad_request(msg)

    if Admin.query.filter_by(account=account).first():
        return conflict("管理员账号已存在")

    now = int(time.time())
    new_admin = Admin(
        account=account,
        role='admin',
        status=1,
        created_by=request.current_admin.id,
        created_at=now,
        updated_at=now
    )
    new_admin.set_password(password)
    db.session.add(new_admin)
    db.session.commit()

    return success(new_admin.to_dict())


@admin_bp.route('/admins/status', methods=['POST'])
@super_admin_required
def toggle_admin_status():
    data = request.get_json(silent=True) or {}
    admin_id = data.get('admin_id')

    if not admin_id:
        return bad_request("管理员ID不能为空")

    target = Admin.query.get(admin_id)
    if not target:
        return not_found("管理员不存在")

    if target.role == 'super_admin':
        return bad_request("超级管理员不可被禁用")

    target.status = 0 if target.status == 1 else 1
    target.updated_at = int(time.time())
    db.session.commit()

    return success(target.to_dict())


@admin_bp.route('/admins/reset-password', methods=['POST'])
@super_admin_required
def reset_admin_password():
    data = request.get_json(silent=True) or {}
    admin_id = data.get('admin_id')
    new_password = data.get('new_password', '')

    if not admin_id:
        return bad_request("管理员ID不能为空")

    ok, msg = validate_password(new_password)
    if not ok:
        return bad_request(msg)

    target = Admin.query.get(admin_id)
    if not target:
        return not_found("管理员不存在")

    if target.role == 'super_admin':
        return bad_request("超级管理员密码不可通过此方式重置")

    target.set_password(new_password)
    target.updated_at = int(time.time())
    db.session.commit()

    return success({"message": "密码重置成功"})


@admin_bp.route('/admins/delete', methods=['POST'])
@super_admin_required
def delete_admin():
    data = request.get_json(silent=True) or {}
    admin_id = data.get('admin_id')

    if not admin_id:
        return bad_request("管理员ID不能为空")

    target = Admin.query.get(admin_id)
    if not target:
        return not_found("管理员不存在")

    if target.role == 'super_admin':
        return bad_request("超级管理员不可被删除")

    db.session.delete(target)
    db.session.commit()

    return success({"message": "管理员已删除"})


@admin_bp.route('/users', methods=['GET'])
@admin_token_required
def get_users():
    page = validate_page(request.args.get('page', 1))
    page_size = validate_page_size(request.args.get('page_size', 20))

    query = User.query
    total = query.count()
    users = query.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return success({
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [u.to_dict() for u in users]
    })


@admin_bp.route('/users/status', methods=['POST'])
@admin_token_required
def toggle_user_status():
    data = request.get_json(silent=True) or {}
    user_id = data.get('user_id')

    if not user_id:
        return bad_request("用户ID不能为空")

    target = User.query.get(user_id)
    if not target:
        return not_found("用户不存在")

    target.status = 0 if target.status == 1 else 1
    target.updated_at = int(time.time())
    db.session.commit()

    return success(target.to_dict())


@admin_bp.route('/matches/query', methods=['POST'])
@admin_token_required
def admin_query_matches():
    data = request.get_json(silent=True) or {}
    page = validate_page(data.get('page', 1))
    page_size = validate_page_size(data.get('page_size', 20))

    query = Match.query.filter_by(deleted=0)

    match_type = data.get('type')
    if match_type and match_type in VALID_MATCH_TYPES:
        query = query.filter_by(type=match_type)

    start_time = data.get('start_time')
    end_time = data.get('end_time')
    if start_time:
        try:
            query = query.filter(Match.match_time >= int(start_time))
        except (ValueError, TypeError):
            pass
    if end_time:
        try:
            query = query.filter(Match.match_time <= int(end_time))
        except (ValueError, TypeError):
            pass

    total = query.count()
    matches = query.order_by(Match.match_time.desc()).offset((page - 1) * page_size).limit(page_size).all()

    return success({
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [m.to_dict(include_details=True) for m in matches]
    })


@admin_bp.route('/matches/delete', methods=['POST'])
@admin_token_required
def admin_delete_match():
    data = request.get_json(silent=True) or {}
    match_id = data.get('match_id')

    if not match_id:
        return bad_request("比赛ID不能为空")

    match = Match.query.get(match_id)
    if not match:
        return not_found("比赛记录不存在")

    MatchScore.query.filter_by(match_id=match_id).delete()
    MatchPlayer.query.filter_by(match_id=match_id).delete()
    db.session.delete(match)
    db.session.commit()

    return success({"message": "比赛记录已删除"})


@admin_bp.route('/players', methods=['GET'])
@admin_token_required
def admin_get_players():
    page = validate_page(request.args.get('page', 1))
    page_size = validate_page_size(request.args.get('page_size', 20))

    query = Player.query.filter_by(deleted=0)
    total = query.count()
    players = query.order_by(Player.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    result = []
    for p in players:
        d = p.to_dict()
        creator = User.query.get(p.created_by)
        d["creator_account"] = creator.account if creator else "未知"
        d["creator_username"] = creator.username if creator else "未知"
        result.append(d)

    return success({
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": result
    })


@admin_bp.route('/players/update', methods=['POST'])
@admin_token_required
def admin_update_player():
    data = request.get_json(silent=True) or {}
    player_id = data.get('player_id')

    if not player_id:
        return bad_request("选手ID不能为空")

    player = Player.query.get(player_id)
    if not player:
        return not_found("选手不存在")

    name = data.get('name', '').strip()
    gender = data.get('gender', '')

    if name:
        if len(name) < 2 or len(name) > 20:
            return bad_request("选手名称长度需为2-20位")
        player.name = name

    if gender:
        if gender not in ('male', 'female'):
            return bad_request("性别需为male或female")
        player.gender = gender

    db.session.commit()
    return success(player.to_dict())


@admin_bp.route('/players/delete', methods=['POST'])
@admin_token_required
def admin_delete_player():
    data = request.get_json(silent=True) or {}
    player_id = data.get('player_id')

    if not player_id:
        return bad_request("选手ID不能为空")

    player = Player.query.get(player_id)
    if not player:
        return not_found("选手不存在")

    match_player_refs = MatchPlayer.query.filter_by(player_id=player_id).all()
    if match_player_refs:
        return bad_request("该选手存在关联比赛记录，无法删除")

    db.session.delete(player)
    db.session.commit()

    return success({"message": "选手已删除"})


@admin_bp.route('/settings', methods=['GET'])
@admin_token_required
def get_settings():
    settings = Setting.query.all()
    return success([s.to_dict() for s in settings])


@admin_bp.route('/settings/update', methods=['POST'])
@admin_token_required
def update_settings():
    data = request.get_json(silent=True) or {}
    items = data.get('items', [])

    if not items:
        return bad_request("设置项不能为空")

    now = int(time.time())
    for item in items:
        key = item.get('key', '').strip()
        value = item.get('value', '')
        if not key:
            continue

        setting = Setting.query.filter_by(key=key).first()
        if setting:
            setting.value = value
            setting.updated_at = now
        else:
            setting = Setting(key=key, value=value, updated_at=now)
            db.session.add(setting)

    db.session.commit()

    settings = Setting.query.all()
    return success([s.to_dict() for s in settings])


# ===== Team Management =====

@admin_bp.route('/teams', methods=['GET'])
@admin_token_required
def admin_get_teams():
    page = validate_page(request.args.get('page', 1))
    page_size = validate_page_size(request.args.get('page_size', 20))
    search = request.args.get('search', '').strip()

    query = Team.query
    if search:
        query = query.filter(Team.name.like(f'%{search}%'))

    total = query.count()
    teams = query.order_by(Team.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    items = []
    for team in teams:
        creator = User.query.get(team.creator_id)
        member_count = TeamMember.query.filter_by(team_id=team.id).count()
        player_count = Player.query.filter_by(team_id=team.id, deleted=0).count()
        match_count = Match.query.filter_by(team_id=team.id, deleted=0).count()

        items.append({
            "id": team.id,
            "name": team.name,
            "creator_id": team.creator_id,
            "creator_username": creator.username if creator else "未知",
            "member_count": member_count,
            "player_count": player_count,
            "match_count": match_count,
            "invite_code": team.invite_code,
            "created_at": team.created_at,
            "deleted": team.deleted
        })

    return success({
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": items
    })


@admin_bp.route('/teams/<int:team_id>', methods=['GET'])
@admin_token_required
def admin_get_team(team_id):
    team = Team.query.get(team_id)
    if not team:
        return not_found("团队不存在")

    creator = User.query.get(team.creator_id)

    members = TeamMember.query.filter_by(team_id=team.id).all()
    member_list = [{
        "id": m.id,
        "user_id": m.user_id,
        "username": m.user.username if m.user else None,
        "joined_at": m.joined_at
    } for m in members]

    players = Player.query.filter_by(team_id=team.id, deleted=0).all()
    player_list = []
    for p in players:
        d = p.to_dict()
        bound_user = User.query.get(p.user_id) if p.user_id else None
        d["bound_username"] = bound_user.username if bound_user else None
        player_list.append(d)

    match_count = Match.query.filter_by(team_id=team.id, deleted=0).count()

    return success({
        "id": team.id,
        "name": team.name,
        "creator_id": team.creator_id,
        "creator_username": creator.username if creator else "未知",
        "invite_code": team.invite_code,
        "created_at": team.created_at,
        "deleted": team.deleted,
        "members": member_list,
        "players": player_list,
        "match_count": match_count
    })


@admin_bp.route('/teams/delete', methods=['POST'])
@admin_token_required
def admin_delete_team():
    data = request.get_json(silent=True) or {}
    team_id = data.get('team_id')

    if not team_id:
        return bad_request("团队ID不能为空")

    team = Team.query.get(team_id)
    if not team:
        return not_found("团队不存在")

    if team.deleted == 1:
        return bad_request("团队已解散")

    team.deleted = 1

    Player.query.filter_by(team_id=team.id, deleted=0).update({'deleted': 1})

    db.session.commit()

    return success({"message": "团队已解散"})
