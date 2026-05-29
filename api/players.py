from flask import Blueprint, request
from extensions import db
from models.player import Player
from utils.response import success, bad_request, conflict
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

    existing = Player.query.filter_by(name=name, gender=gender, created_by=user.id).first()
    if existing:
        return conflict("同性别下已存在同名选手")

    now = int(time.time())
    player = Player(
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

    query = Player.query.filter_by(created_by=user.id)
    if gender:
        ok, msg = validate_gender(gender)
        if ok:
            query = query.filter_by(gender=gender)

    players = query.order_by(Player.created_at.desc()).all()
    return success([p.to_dict() for p in players])
