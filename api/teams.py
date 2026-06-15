from flask import Blueprint, request
from extensions import db
from models.team import Team, TeamMember
from models.player import Player
from models.user import User
from utils.response import success, bad_request, not_found, forbidden, conflict
from utils.validators import validate_team_name, validate_invite_code, generate_invite_code, validate_player_name, validate_gender
from utils.auth_decorator import token_required
import time

teams_bp = Blueprint('teams', __name__)


@teams_bp.route('', methods=['POST'])
@token_required
def create_team():
    user = request.current_user
    data = request.get_json(silent=True) or {}
    name = data.get('name', '').strip()

    ok, msg = validate_team_name(name)
    if not ok:
        return bad_request(msg)

    invite_code = generate_invite_code()
    now = int(time.time())

    team = Team(
        name=name,
        creator_id=user.id,
        invite_code=invite_code,
        invite_expires_at=0,
        created_at=now
    )
    db.session.add(team)
    db.session.flush()

    member = TeamMember(
        team_id=team.id,
        user_id=user.id,
        joined_at=now
    )
    db.session.add(member)

    player = Player(
        name=user.username,
        gender=user.gender,
        created_by=user.id,
        user_id=user.id,
        team_id=team.id,
        role='admin',
        created_at=now
    )
    db.session.add(player)

    db.session.commit()

    return success(team.to_dict())


@teams_bp.route('', methods=['GET'])
@token_required
def list_teams():
    user = request.current_user

    memberships = TeamMember.query.filter_by(user_id=user.id).all()
    team_ids = [m.team_id for m in memberships]

    if not team_ids:
        return success([])

    teams = Team.query.filter(Team.id.in_(team_ids), Team.deleted == 0).all()

    result = []
    for team in teams:
        member_count = TeamMember.query.filter_by(team_id=team.id).count()
        player_count = Player.query.filter_by(team_id=team.id, deleted=0).count()
        result.append({
            "id": team.id,
            "name": team.name,
            "creator_id": team.creator_id,
            "invite_code": team.invite_code,
            "member_count": member_count,
            "player_count": player_count,
            "created_at": team.created_at
        })

    return success(result)


@teams_bp.route('/resolve', methods=['POST'])
@token_required
def resolve_team():
    user = request.current_user
    data = request.get_json(silent=True) or {}
    name = data.get('name', '').strip()
    invite_code = data.get('invite_code', '').strip()

    ok, msg = validate_team_name(name)
    if not ok:
        return bad_request(msg)

    ok, msg = validate_invite_code(invite_code)
    if not ok:
        return bad_request(msg)

    team = Team.query.filter_by(name=name, deleted=0).first()
    if not team:
        return not_found("未找到该团队")

    if team.invite_code != invite_code:
        return bad_request("邀请码错误")

    existing = TeamMember.query.filter_by(team_id=team.id, user_id=user.id).first()
    if existing:
        return conflict("你已是该团队成员")

    players = Player.query.filter_by(team_id=team.id, deleted=0).all()
    unbound = [p.to_dict() for p in players if not p.user_id]

    return success({
        "id": team.id,
        "name": team.name,
        "creator_id": team.creator_id,
        "unbound_players": unbound
    })


@teams_bp.route('/<int:team_id>', methods=['GET'])
@token_required
def get_team(team_id):
    user = request.current_user

    team = Team.query.filter_by(id=team_id, deleted=0).first()
    if not team:
        return not_found("团队不存在")

    membership = TeamMember.query.filter_by(team_id=team.id, user_id=user.id).first()
    if not membership:
        return forbidden("你不是该团队成员")

    members = TeamMember.query.filter_by(team_id=team.id).all()
    member_list = []
    for m in members:
        member_list.append({
            "id": m.id,
            "user_id": m.user_id,
            "username": m.user.username if m.user else None,
            "joined_at": m.joined_at
        })

    players = Player.query.filter_by(team_id=team.id, deleted=0).all()
    player_list = [p.to_dict() for p in players]

    return success({
        "id": team.id,
        "name": team.name,
        "creator_id": team.creator_id,
        "invite_code": team.invite_code,
        "invite_expires_at": team.invite_expires_at,
        "created_at": team.created_at,
        "members": member_list,
        "players": player_list
    })


@teams_bp.route('/<int:team_id>/join', methods=['POST'])
@token_required
def join_team(team_id):
    user = request.current_user
    data = request.get_json(silent=True) or {}
    invite_code = data.get('invite_code', '').strip()
    action = data.get('action', '')
    bind_player_id = data.get('bind_player_id')

    ok, msg = validate_invite_code(invite_code)
    if not ok:
        return bad_request(msg)

    team = Team.query.filter_by(id=team_id, deleted=0).first()
    if not team:
        return not_found("团队不存在")

    if team.invite_code != invite_code:
        return bad_request("邀请码错误")

    existing = TeamMember.query.filter_by(team_id=team.id, user_id=user.id).first()
    if existing:
        return conflict("你已是该团队成员")

    now = int(time.time())

    if action == 'create':
        player = Player(
            name=user.username,
            gender=user.gender,
            created_by=user.id,
            user_id=user.id,
            team_id=team.id,
            role='member',
            created_at=now
        )
        db.session.add(player)
    elif action == 'bind':
        if not bind_player_id:
            return bad_request("缺少绑定选手ID")

        player = Player.query.filter_by(id=bind_player_id, team_id=team.id, deleted=0).first()
        if not player:
            return not_found("选手不存在或不属于该团队")

        if player.user_id:
            return conflict("该选手已被绑定")

        player.user_id = user.id
    else:
        return bad_request("action需为create或bind")

    member = TeamMember(
        team_id=team.id,
        user_id=user.id,
        joined_at=now
    )
    db.session.add(member)

    db.session.commit()

    return success({"message": "加入团队成功"})


@teams_bp.route('/<int:team_id>/leave', methods=['POST'])
@token_required
def leave_team(team_id):
    user = request.current_user

    team = Team.query.filter_by(id=team_id, deleted=0).first()
    if not team:
        return not_found("团队不存在")

    membership = TeamMember.query.filter_by(team_id=team.id, user_id=user.id).first()
    if not membership:
        return bad_request("你不是该团队成员")

    if team.creator_id == user.id:
        return bad_request("创建者不能退出团队")

    player = Player.query.filter_by(team_id=team.id, user_id=user.id, deleted=0).first()
    if player:
        player.user_id = None

    db.session.delete(membership)
    db.session.commit()

    return success({"message": "已退出团队"})


@teams_bp.route('/<int:team_id>/invite-code', methods=['POST'])
@token_required
def refresh_invite_code(team_id):
    user = request.current_user

    team = Team.query.filter_by(id=team_id, deleted=0).first()
    if not team:
        return not_found("团队不存在")

    if team.creator_id != user.id:
        return forbidden("仅创建者可刷新邀请码")

    team.invite_code = generate_invite_code()
    db.session.commit()

    return success({"invite_code": team.invite_code})


@teams_bp.route('/<int:team_id>/players', methods=['POST'])
@token_required
def create_team_player(team_id):
    user = request.current_user
    data = request.get_json(silent=True) or {}
    name = data.get('name', '').strip()
    gender = data.get('gender', '')

    team = Team.query.filter_by(id=team_id, deleted=0).first()
    if not team:
        return not_found("团队不存在")

    membership = TeamMember.query.filter_by(team_id=team.id, user_id=user.id).first()
    if not membership:
        return forbidden("你不是该团队成员")

    ok, msg = validate_player_name(name)
    if not ok:
        return bad_request(msg)

    ok, msg = validate_gender(gender)
    if not ok:
        return bad_request(msg)

    now = int(time.time())
    player = Player(
        name=name,
        gender=gender,
        created_by=user.id,
        team_id=team.id,
        role='member',
        created_at=now
    )
    db.session.add(player)
    db.session.commit()

    return success(player.to_dict())


@teams_bp.route('/<int:team_id>/players', methods=['GET'])
@token_required
def list_team_players(team_id):
    user = request.current_user

    team = Team.query.filter_by(id=team_id, deleted=0).first()
    if not team:
        return not_found("团队不存在")

    membership = TeamMember.query.filter_by(team_id=team.id, user_id=user.id).first()
    if not membership:
        return forbidden("你不是该团队成员")

    players = Player.query.filter_by(team_id=team.id, deleted=0).all()
    return success([p.to_dict() for p in players])
