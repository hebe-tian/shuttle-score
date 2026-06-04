from flask import Blueprint, request
from extensions import db
from models.match import Match, MatchPlayer, MatchScore
from models.player import Player
from utils.response import success, bad_request, not_found
from utils.validators import (
    validate_match_type, validate_score, validate_page, validate_page_size,
    MATCH_TYPE_GENDER, MATCH_TYPE_CATEGORY, VALID_MATCH_TYPES
)
from utils.auth_decorator import token_required
import time
import random

matches_bp = Blueprint('matches', __name__)


@matches_bp.route('', methods=['POST'])
@token_required
def create_match():
    user = request.current_user
    data = request.get_json(silent=True) or {}

    match_type = data.get('type', '')
    ok, msg = validate_match_type(match_type)
    if not ok:
        return bad_request(msg)

    player_ids = data.get('player_ids', [])
    scores_data = data.get('scores', [])

    category = MATCH_TYPE_CATEGORY[match_type]
    gender_req = MATCH_TYPE_GENDER[match_type]

    expected_count = 2 if category == 'singles' else 4
    if len(player_ids) != expected_count:
        return bad_request(f"{match_type}需要{expected_count}名选手")

    players = Player.query.filter(Player.id.in_(player_ids), Player.created_by == user.id, Player.deleted == 0).all()
    if len(players) != len(player_ids):
        return bad_request("选手不存在或不属于当前用户")

    player_map = {p.id: p for p in players}

    if len(set(player_ids)) != len(player_ids):
        return bad_request("同一比赛中选手不可重复选择")

    if gender_req:
        for pid in player_ids:
            if player_map[pid].gender != gender_req:
                return bad_request(f"该比赛类型要求选手性别为{gender_req}")

    if match_type == 'xd':
        team1_ids = player_ids[:2]
        team2_ids = player_ids[2:]
        team1_genders = [player_map[pid].gender for pid in team1_ids]
        team2_genders = [player_map[pid].gender for pid in team2_ids]
        if sorted(team1_genders) != ['female', 'male'] or sorted(team2_genders) != ['female', 'male']:
            return bad_request("混双每队必须为一男一女组合")

    if not scores_data:
        return bad_request("比分数据不能为空")

    for s in scores_data:
        ok1, msg1 = validate_score(s.get('team1_score', -1))
        if not ok1:
            return bad_request(f"队伍1得分错误: {msg1}")
        ok2, msg2 = validate_score(s.get('team2_score', -1))
        if not ok2:
            return bad_request(f"队伍2得分错误: {msg2}")

    created_matches = []
    now = int(time.time())

    for s in scores_data:
        match = Match(
            type=match_type,
            match_time=now,
            created_by=user.id,
            created_at=now
        )
        db.session.add(match)
        db.session.flush()

        team_size = 1 if category == 'singles' else 2
        for i, pid in enumerate(player_ids):
            team = 1 if i < team_size else 2
            mp = MatchPlayer(
                match_id=match.id,
                player_id=pid,
                team=team,
                is_winner=0
            )
            db.session.add(mp)

        t1_score = s['team1_score']
        t2_score = s['team2_score']
        winner_team = 0
        if t1_score > t2_score:
            winner_team = 1
        elif t2_score > t1_score:
            winner_team = 2

        if winner_team > 0:
            MatchPlayer.query.filter_by(match_id=match.id, team=winner_team).update({'is_winner': 1})

        score = MatchScore(
            match_id=match.id,
            game_number=1,
            team1_score=t1_score,
            team2_score=t2_score
        )
        db.session.add(score)

        created_matches.append(match.to_dict(include_details=True))

    db.session.commit()

    return success({
        "count": len(created_matches),
        "matches": created_matches
    })


@matches_bp.route('/query', methods=['POST'])
@token_required
def query_matches():
    user = request.current_user
    data = request.get_json(silent=True) or {}

    page = validate_page(data.get('page', 1))
    page_size = validate_page_size(data.get('page_size', 10))

    query = Match.query.filter_by(created_by=user.id, deleted=0)

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

    match_type = data.get('type')
    if match_type:
        if match_type in VALID_MATCH_TYPES:
            query = query.filter_by(type=match_type)
        elif match_type == 'singles':
            query = query.filter(Match.type.in_(['ms', 'ws', 'os']))
        elif match_type == 'doubles':
            query = query.filter(Match.type.in_(['md', 'wd', 'xd', 'od']))

    member_name = data.get('member_name', '').strip()
    if member_name:
        subquery = MatchPlayer.query.join(Player).filter(
            Player.name.contains(member_name),
            Player.created_by == user.id,
            Player.deleted == 0
        ).with_entities(MatchPlayer.match_id).subquery()
        query = query.filter(Match.id.in_(db.session.query(subquery.c.match_id)))

    total = query.count()
    matches = query.order_by(Match.match_time.desc()).offset((page - 1) * page_size).limit(page_size).all()

    result = []
    for m in matches:
        match_dict = m.to_dict(include_details=True)
        result.append(match_dict)

    return success({
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": result
    })


@matches_bp.route('/<int:match_id>', methods=['GET'])
@token_required
def get_match(match_id):
    user = request.current_user
    match = Match.query.filter_by(id=match_id, created_by=user.id, deleted=0).first()
    if not match:
        return not_found("比赛记录不存在")
    return success(match.to_dict(include_details=True))


@matches_bp.route('/random', methods=['GET'])
def random_matches():
    total = Match.query.filter_by(deleted=0).count()
    if total == 0:
        return success([])

    count = min(7, total)
    all_ids = [m.id for m in Match.query.filter_by(deleted=0).with_entities(Match.id).all()]
    sample_ids = random.sample(all_ids, min(count, total))

    matches = Match.query.filter(Match.id.in_(sample_ids)).all()
    result = [m.to_public_dict() for m in matches]
    return success(result)
