from flask import Blueprint, request
from extensions import db
from models.match import Match, MatchPlayer, MatchScore
from models.player import Player
from models.team import Team, TeamMember
from utils.response import success, bad_request, not_found
from utils.validators import (
    validate_match_type, validate_score, validate_page, validate_page_size,
    validate_match_gender,
    MATCH_TYPE_GENDER, MATCH_TYPE_CATEGORY, VALID_MATCH_TYPES
)
from utils.auth_decorator import token_required

UNLIMITED_MATCH_TYPES = ('fs', 'fd')
import time
import random

matches_bp = Blueprint('matches', __name__)


def _check_team_access(user, team_id):
    """验证团队存在且用户是成员，返回 (team, error_response)"""
    team = Team.query.filter_by(id=team_id, deleted=0).first()
    if not team:
        return None, bad_request("团队不存在")
    member = TeamMember.query.filter_by(team_id=team_id, user_id=user.id).first()
    if not member:
        return None, bad_request("您不是该团队的成员")
    return team, None


def _check_match_access(user, match):
    """验证用户有权访问该比赛，返回 error_response 或 None"""
    if match.team_id:
        member = TeamMember.query.filter_by(team_id=match.team_id, user_id=user.id).first()
        if not member:
            return bad_request("您无权访问该比赛")
    else:
        if match.created_by != user.id:
            return not_found("比赛记录不存在")
    return None


@matches_bp.route('', methods=['POST'])
@token_required
def create_match():
    user = request.current_user
    data = request.get_json(silent=True) or {}

    match_type = data.get('type', '')
    ok, msg = validate_match_type(match_type)
    if not ok:
        return bad_request(msg)

    team_id = data.get('team_id')

    # 验证 team_id
    if team_id:
        team, err = _check_team_access(user, team_id)
        if err:
            return err

    scores_data = data.get('scores', [])

    is_unlimited = match_type in UNLIMITED_MATCH_TYPES

    if is_unlimited:
        # 无限制比赛：使用 players 格式 [{player_id, team}]
        players_data = data.get('players', [])
        if not players_data:
            return bad_request("选手数据不能为空")

        team1_count = sum(1 for p in players_data if p.get('team') == 1)
        team2_count = sum(1 for p in players_data if p.get('team') == 2)
        if team1_count < 1 or team2_count < 1:
            return bad_request("每队至少需要1名选手")

        player_ids = [p.get('player_id') for p in players_data]
        team_map = {p.get('player_id'): p.get('team') for p in players_data}

        if None in player_ids or None in team_map.values():
            return bad_request("选手数据格式错误")

        if len(set(player_ids)) != len(player_ids):
            return bad_request("同一比赛中选手不可重复选择")

        if team_id:
            players = Player.query.filter(Player.id.in_(player_ids), Player.team_id == team_id, Player.deleted == 0).all()
        else:
            players = Player.query.filter(Player.id.in_(player_ids), Player.created_by == user.id, Player.deleted == 0).all()
        if len(players) != len(player_ids):
            return bad_request("选手不存在或不属于当前用户")
    else:
        # 常规比赛：使用 player_ids 格式
        player_ids = data.get('player_ids', [])

        category = MATCH_TYPE_CATEGORY[match_type]
        gender_req = MATCH_TYPE_GENDER[match_type]

        expected_count = 2 if category == 'singles' else 4
        if len(player_ids) != expected_count:
            return bad_request(f"{match_type}需要{expected_count}名选手")

        if team_id:
            players = Player.query.filter(Player.id.in_(player_ids), Player.team_id == team_id, Player.deleted == 0).all()
        else:
            players = Player.query.filter(Player.id.in_(player_ids), Player.created_by == user.id, Player.deleted == 0).all()
        if len(players) != len(player_ids):
            return bad_request("选手不存在或不属于当前用户")

        player_map = {p.id: p for p in players}

        if len(set(player_ids)) != len(player_ids):
            return bad_request("同一比赛中选手不可重复选择")

        players_genders = [player_map[pid].gender for pid in player_ids]
        ok, msg = validate_match_gender(match_type, players_genders)
        if not ok:
            return bad_request(msg)

    # 个人比赛必须包含本人绑定的选手
    if not team_id:
        bound_player = Player.query.filter_by(
            created_by=user.id, deleted=0, team_id=None
        ).first()
        if bound_player:
            if is_unlimited:
                participant_ids = player_ids
            else:
                participant_ids = player_ids
            if bound_player.id not in participant_ids:
                return bad_request("个人比赛必须包含本人绑定的选手")

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
            team_id=team_id if team_id else None,
            created_at=now
        )
        db.session.add(match)
        db.session.flush()

        if is_unlimited:
            for pid in player_ids:
                mp = MatchPlayer(
                    match_id=match.id,
                    player_id=pid,
                    team=team_map[pid],
                    is_winner=0
                )
                db.session.add(mp)
        else:
            category = MATCH_TYPE_CATEGORY[match_type]
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

    team_id = data.get('team_id')

    if team_id:
        team, err = _check_team_access(user, team_id)
        if err:
            return err
        query = Match.query.filter_by(team_id=team_id, deleted=0)
    else:
        query = Match.query.filter_by(created_by=user.id, deleted=0, team_id=None)

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
        elif match_type == 'unlimited':
            query = query.filter(Match.type.in_(['fs', 'fd']))

    member_name = data.get('member_name', '').strip()
    if member_name:
        if team_id:
            subquery = MatchPlayer.query.join(Player).filter(
                Player.name.contains(member_name),
                Player.team_id == team_id,
                Player.deleted == 0
            ).with_entities(MatchPlayer.match_id).subquery()
        else:
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
    match = Match.query.filter_by(id=match_id, deleted=0).first()
    if not match:
        return not_found("比赛记录不存在")

    err = _check_match_access(user, match)
    if err:
        return err

    return success(match.to_dict(include_details=True))


@matches_bp.route('/update', methods=['POST'])
@token_required
def update_match():
    user = request.current_user
    data = request.get_json(silent=True) or {}

    match_id = data.get('match_id')
    if not match_id:
        return bad_request("比赛ID不能为空")

    match = Match.query.filter_by(id=match_id, deleted=0).first()
    if not match:
        return not_found("比赛记录不存在")

    err = _check_match_access(user, match)
    if err:
        return err

    # 比赛类型不可更改，使用原始类型
    match_type = match.type
    is_unlimited = match_type in UNLIMITED_MATCH_TYPES
    match_team_id = match.team_id

    scores_data = data.get('scores', [])

    if is_unlimited:
        # 无限制比赛：使用 players 格式
        players_data = data.get('players', [])
        if not players_data:
            return bad_request("选手数据不能为空")

        team1_count = sum(1 for p in players_data if p.get('team') == 1)
        team2_count = sum(1 for p in players_data if p.get('team') == 2)
        if team1_count < 1 or team2_count < 1:
            return bad_request("每队至少需要1名选手")

        player_ids = [p.get('player_id') for p in players_data]
        team_map = {p.get('player_id'): p.get('team') for p in players_data}

        if None in player_ids or None in team_map.values():
            return bad_request("选手数据格式错误")

        if len(set(player_ids)) != len(player_ids):
            return bad_request("同一比赛中选手不可重复选择")

        if match_team_id:
            players = Player.query.filter(Player.id.in_(player_ids), Player.team_id == match_team_id, Player.deleted == 0).all()
        else:
            players = Player.query.filter(Player.id.in_(player_ids), Player.created_by == user.id, Player.deleted == 0).all()
        if len(players) != len(player_ids):
            return bad_request("选手不存在或不属于当前用户")
    else:
        # 常规比赛：使用 player_ids 格式
        player_ids = data.get('player_ids', [])

        category = MATCH_TYPE_CATEGORY[match_type]
        gender_req = MATCH_TYPE_GENDER[match_type]

        expected_count = 2 if category == 'singles' else 4
        if len(player_ids) != expected_count:
            return bad_request(f"{match_type}需要{expected_count}名选手")

        if match_team_id:
            players = Player.query.filter(Player.id.in_(player_ids), Player.team_id == match_team_id, Player.deleted == 0).all()
        else:
            players = Player.query.filter(Player.id.in_(player_ids), Player.created_by == user.id, Player.deleted == 0).all()
        if len(players) != len(player_ids):
            return bad_request("选手不存在或不属于当前用户")

        player_map = {p.id: p for p in players}

        if len(set(player_ids)) != len(player_ids):
            return bad_request("同一比赛中选手不可重复选择")

        players_genders = [player_map[pid].gender for pid in player_ids]
        ok, msg = validate_match_gender(match_type, players_genders)
        if not ok:
            return bad_request(msg)

    if not scores_data:
        return bad_request("比分数据不能为空")

    for s in scores_data:
        ok1, msg1 = validate_score(s.get('team1_score', -1))
        if not ok1:
            return bad_request(f"队伍1得分错误: {msg1}")
        ok2, msg2 = validate_score(s.get('team2_score', -1))
        if not ok2:
            return bad_request(f"队伍2得分错误: {msg2}")

    # 删除旧的选手和比分记录
    MatchPlayer.query.filter_by(match_id=match.id).delete()
    MatchScore.query.filter_by(match_id=match.id).delete()

    # 重新创建选手记录
    if is_unlimited:
        for pid in player_ids:
            mp = MatchPlayer(
                match_id=match.id,
                player_id=pid,
                team=team_map[pid],
                is_winner=0
            )
            db.session.add(mp)
    else:
        category = MATCH_TYPE_CATEGORY[match_type]
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

    # 重新创建比分记录并计算胜负
    for idx, s in enumerate(scores_data):
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
            game_number=idx + 1,
            team1_score=t1_score,
            team2_score=t2_score
        )
        db.session.add(score)

    db.session.commit()

    return success(match.to_dict(include_details=True))


@matches_bp.route('/delete', methods=['POST'])
@token_required
def delete_match():
    user = request.current_user
    data = request.get_json(silent=True) or {}

    match_id = data.get('match_id')
    if not match_id:
        return bad_request("比赛ID不能为空")

    match = Match.query.filter_by(id=match_id, deleted=0).first()
    if not match:
        return not_found("比赛记录不存在")

    err = _check_match_access(user, match)
    if err:
        return err

    match.deleted = 1
    db.session.commit()

    return success({"message": "比赛记录已删除"})


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
