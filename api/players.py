from flask import Blueprint, request
from extensions import db
from models.single_player import SinglePlayer
from models.user import User
from utils.response import success, bad_request, conflict, not_found, forbidden
from utils.validators import validate_player_name, validate_gender
from utils.auth_decorator import token_required
import time

players_bp = Blueprint('players', __name__)


@players_bp.route('', methods=['POST'])
@token_required
def add_player():
    user = request.current_user
    data = request.get_json(silent=True) or {}
    name = data.get('name', '').strip()
    gender = data.get('gender', '')

    ok, msg = validate_player_name(name)
    if not ok:
        return bad_request(msg)

    ok, msg = validate_gender(gender)
    if not ok:
        return bad_request(msg)

    existing = SinglePlayer.query.filter_by(name=name, gender=gender, created_by=user.id, deleted=0).first()
    if existing:
        return conflict("同性别下已存在同名选手")

    now = int(time.time())
    player = SinglePlayer(
        name=name,
        gender=gender,
        created_by=user.id,
        created_at=now
    )
    db.session.add(player)
    db.session.commit()

    return success(player.to_dict())


@players_bp.route('', methods=['GET'])
@token_required
def get_players():
    user = request.current_user
    gender = request.args.get('gender', '')

    query = SinglePlayer.query.filter_by(created_by=user.id, deleted=0)
    if gender:
        ok, msg = validate_gender(gender)
        if ok:
            query = query.filter_by(gender=gender)

    players = query.order_by(SinglePlayer.created_at.desc()).all()
    return success([p.to_dict() for p in players])


@players_bp.route('/update', methods=['POST'])
@token_required
def update_player():
    user = request.current_user
    data = request.get_json(silent=True) or {}
    player_id = data.get('player_id')

    if not player_id:
        return bad_request("缺少选手ID")

    player = SinglePlayer.query.filter_by(id=player_id, deleted=0).first()
    if not player:
        return not_found("选手不存在")

    if player.created_by != user.id:
        return forbidden("无权操作此选手")

    if player.user_id and player.user_id == player.created_by:
        return forbidden("联动选手不可编辑")

    name = data.get('name', '').strip()
    bind_user_id = data.get('user_id')

    updated = False

    if name:
        ok, msg = validate_player_name(name)
        if not ok:
            return bad_request(msg)

        if name != player.name:
            existing = SinglePlayer.query.filter_by(
                name=name, gender=player.gender, created_by=user.id, deleted=0
            ).first()
            if existing:
                return conflict("同性别下已存在同名选手")
            player.name = name
            updated = True

    if bind_user_id is not None:
        if bind_user_id == 0 or bind_user_id == '':
            player.user_id = None
            updated = True
        else:
            try:
                bind_user_id = int(bind_user_id)
            except (ValueError, TypeError):
                return bad_request("用户ID格式错误")

            target_user = User.query.filter_by(id=bind_user_id, status=1).first()
            if not target_user:
                return not_found("目标用户不存在或已禁用")

            if bind_user_id == user.id:
                return bad_request("不能绑定自己")

            duplicate = SinglePlayer.query.filter_by(
                created_by=user.id, user_id=bind_user_id, deleted=0
            ).first()
            if duplicate and duplicate.id != player.id:
                return conflict("已存在与该用户绑定的选手")

            player.user_id = bind_user_id
            player.invite_expires_at = 0
            updated = True

    bind_account = data.get('bind_account')
    if bind_account is not None:
        bind_account = bind_account.strip()
        if bind_account == '':
            player.user_id = None
            updated = True
        else:
            target_user = User.query.filter_by(account=bind_account, status=1).first()
            if not target_user:
                return not_found("该账号不存在或已禁用")

            if target_user.id == user.id:
                return bad_request("不能绑定自己")

            duplicate = SinglePlayer.query.filter_by(
                created_by=user.id, user_id=target_user.id, deleted=0
            ).first()
            if duplicate and duplicate.id != player.id:
                return conflict("已存在与该用户绑定的选手")

            player.user_id = target_user.id
            player.invite_expires_at = 0
            updated = True

    if updated:
        db.session.commit()

    return success(player.to_dict())


@players_bp.route('/delete', methods=['POST'])
@token_required
def delete_player():
    user = request.current_user
    data = request.get_json(silent=True) or {}
    player_id = data.get('player_id')

    if not player_id:
        return bad_request("缺少选手ID")

    player = SinglePlayer.query.filter_by(id=player_id, deleted=0).first()
    if not player:
        return not_found("选手不存在")

    if player.created_by != user.id:
        return forbidden("无权操作此选手")

    if player.user_id and player.user_id == player.created_by:
        return forbidden("联动选手不可删除")

    player.deleted = 1
    db.session.commit()

    return success({"message": "选手已删除"})


@players_bp.route('/unbind', methods=['POST'])
@token_required
def unbind_player():
    user = request.current_user
    data = request.get_json(silent=True) or {}
    player_id = data.get('player_id')

    if not player_id:
        return bad_request("缺少选手ID")

    player = SinglePlayer.query.filter_by(id=player_id, deleted=0).first()
    if not player:
        return not_found("选手不存在")

    if player.created_by != user.id:
        return forbidden("无权操作此选手")

    if not player.user_id:
        return bad_request("该选手未绑定用户")

    player.user_id = None
    db.session.commit()

    return success(player.to_dict())


@players_bp.route('/invite', methods=['POST'])
@token_required
def invite_player():
    user = request.current_user
    data = request.get_json(silent=True) or {}
    player_id = data.get('player_id')

    if not player_id:
        return bad_request("缺少选手ID")

    player = SinglePlayer.query.filter_by(id=player_id, deleted=0).first()
    if not player:
        return not_found("选手不存在")

    if player.created_by != user.id:
        return forbidden("无权操作此选手")

    if player.user_id:
        return bad_request("该选手已绑定用户")

    now = int(time.time())
    player.invite_expires_at = now + 86400
    db.session.commit()

    invite_link = "/pages/register.html?invite=" + str(player.id)

    return success({
        "invite_link": invite_link,
        "expires_at": player.invite_expires_at
    })


@players_bp.route('/bind-user', methods=['GET'])
@token_required
def get_bind_user():
    player_id = request.args.get('id')

    if not player_id:
        return bad_request("缺少选手ID")

    player = SinglePlayer.query.filter_by(id=player_id, deleted=0).first()
    if not player:
        return not_found("选手不存在")

    if not player.user_id:
        return success(None)

    bind_user = User.query.filter_by(id=player.user_id, status=1).first()
    if not bind_user:
        return success(None)

    return success({
        "username": bind_user.username,
        "account": bind_user.account
    })
