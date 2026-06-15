from flask import Blueprint, request
from extensions import db
from models.match import Match, MatchPlayer, MatchScore
from models.player import Player
from models.team import Team, TeamMember
from utils.response import success, bad_request
from utils.validators import validate_page, validate_page_size, VALID_MATCH_TYPES, MATCH_TYPE_CATEGORY
from utils.auth_decorator import token_required
from sqlalchemy import func
import time

stats_bp = Blueprint('stats', __name__)

FORMAL_MATCH_TYPES = ('ms', 'ws', 'md', 'wd', 'xd')
NON_FORMAL_MATCH_TYPES = ('os', 'od', 'fs', 'fd')

SINGLES_TYPES = ('ms', 'ws', 'os')
DOUBLES_TYPES = ('md', 'wd', 'xd', 'od')


def _get_target_player(user, team_id, player_id):
    """确定目标选手，返回 (player, error_response)"""
    if team_id:
        # 验证团队成员身份
        member = TeamMember.query.filter_by(team_id=team_id, user_id=user.id).first()
        if not member:
            return None, bad_request("您不是该团队的成员")
        if player_id:
            player = Player.query.filter_by(id=player_id, team_id=team_id, deleted=0).first()
            if not player:
                return None, bad_request("选手不存在或不属于该团队")
            return player, None
        else:
            # 查找团队中绑定当前用户的选手
            player = Player.query.filter_by(team_id=team_id, user_id=user.id, deleted=0).first()
            if not player:
                return None, bad_request("未找到您在该团队中绑定的选手")
            return player, None
    else:
        # 个人模式
        if player_id:
            player = Player.query.filter_by(id=player_id, deleted=0).first()
            if not player:
                return None, bad_request("选手不存在")
            return player, None
        else:
            player = Player.query.filter_by(user_id=user.id, deleted=0).first()
            if not player:
                # 尝试通过名称和性别匹配（自动创建的选手）
                player = Player.query.filter_by(
                    created_by=user.id, team_id=None, deleted=0,
                    name=user.username, gender=user.gender
                ).first()
            if not player:
                # fallback: created_by 的第一个个人选手
                player = Player.query.filter_by(created_by=user.id, team_id=None, deleted=0).first()
            if not player:
                return None, bad_request("未找到您绑定的个人选手")
            return player, None


def _build_match_query(team_id, player, match_type_filter, include_unlimited, time_range):
    """构建比赛查询"""
    now = int(time.time())

    if team_id:
        query = Match.query.filter_by(team_id=team_id, deleted=0)
    else:
        # 查找目标选手参与的比赛
        match_ids_subquery = MatchPlayer.query.filter_by(player_id=player.id).with_entities(MatchPlayer.match_id).subquery()
        query = Match.query.filter(Match.id.in_(db.session.query(match_ids_subquery.c.match_id)), Match.deleted == 0)

    # type 过滤
    if match_type_filter == 'singles':
        query = query.filter(Match.type.in_(SINGLES_TYPES))
    elif match_type_filter == 'doubles':
        query = query.filter(Match.type.in_(DOUBLES_TYPES))
    # 'all' 不过滤

    # include_unlimited 过滤
    if not include_unlimited:
        query = query.filter(Match.type.notin_(NON_FORMAL_MATCH_TYPES))

    # time_range 过滤
    if time_range == '30d':
        start_time = now - 30 * 24 * 3600
        query = query.filter(Match.match_time >= start_time)

    return query


@stats_bp.route('/opponent-win-rate', methods=['POST'])
@token_required
def opponent_win_rate():
    user = request.current_user
    data = request.get_json(silent=True) or {}

    team_id = data.get('team_id')
    player_id = data.get('player_id')
    match_type_filter = data.get('type', 'all')
    include_unlimited = data.get('include_unlimited', True)
    time_range = data.get('time_range', 'all')

    player, err = _get_target_player(user, team_id, player_id)
    if err:
        return err

    query = _build_match_query(team_id, player, match_type_filter, include_unlimited, time_range)
    matches = query.all()

    opponent_stats = {}

    for m in matches:
        match_players = MatchPlayer.query.filter_by(match_id=m.id).all()
        # 找到目标选手所在的队伍
        target_mp = None
        for mp in match_players:
            if mp.player_id == player.id:
                target_mp = mp
                break
        if not target_mp:
            continue

        target_team = target_mp.team
        target_won = target_mp.is_winner == 1

        # 找到对手（对方队伍的选手）
        for mp in match_players:
            if mp.team != target_team:
                pid = mp.player_id
                if pid not in opponent_stats:
                    p = Player.query.get(pid)
                    opponent_stats[pid] = {
                        "opponent_id": pid,
                        "opponent_name": p.name if p else "未知",
                        "total_matches": 0,
                        "win_matches": 0
                    }
                opponent_stats[pid]["total_matches"] += 1
                if target_won:
                    opponent_stats[pid]["win_matches"] += 1

    result = []
    for pid, stats in opponent_stats.items():
        win_rate = round(stats["win_matches"] / stats["total_matches"] * 100, 1) if stats["total_matches"] > 0 else 0
        result.append({
            "opponent_id": stats["opponent_id"],
            "opponent_name": stats["opponent_name"],
            "total_matches": stats["total_matches"],
            "win_matches": stats["win_matches"],
            "win_rate": win_rate
        })

    result.sort(key=lambda x: x["win_rate"], reverse=True)
    return success(result)


@stats_bp.route('/partner-win-rate', methods=['POST'])
@token_required
def partner_win_rate():
    user = request.current_user
    data = request.get_json(silent=True) or {}

    team_id = data.get('team_id')
    player_id = data.get('player_id')
    match_type_filter = data.get('type', 'all')
    include_unlimited = data.get('include_unlimited', True)
    time_range = data.get('time_range', 'all')

    player, err = _get_target_player(user, team_id, player_id)
    if err:
        return err

    query = _build_match_query(team_id, player, match_type_filter, include_unlimited, time_range)
    matches = query.all()

    partner_stats = {}

    for m in matches:
        match_players = MatchPlayer.query.filter_by(match_id=m.id).all()
        # 找到目标选手所在的队伍
        target_mp = None
        for mp in match_players:
            if mp.player_id == player.id:
                target_mp = mp
                break
        if not target_mp:
            continue

        target_team = target_mp.team
        target_won = target_mp.is_winner == 1

        # 找到搭档（同队且非自己的选手）
        for mp in match_players:
            if mp.team == target_team and mp.player_id != player.id:
                pid = mp.player_id
                if pid not in partner_stats:
                    p = Player.query.get(pid)
                    partner_stats[pid] = {
                        "partner_id": pid,
                        "partner_name": p.name if p else "未知",
                        "total_matches": 0,
                        "win_matches": 0
                    }
                partner_stats[pid]["total_matches"] += 1
                if target_won:
                    partner_stats[pid]["win_matches"] += 1

    result = []
    for pid, stats in partner_stats.items():
        win_rate = round(stats["win_matches"] / stats["total_matches"] * 100, 1) if stats["total_matches"] > 0 else 0
        result.append({
            "partner_id": stats["partner_id"],
            "partner_name": stats["partner_name"],
            "total_matches": stats["total_matches"],
            "win_matches": stats["win_matches"],
            "win_rate": win_rate
        })

    result.sort(key=lambda x: x["win_rate"], reverse=True)
    return success(result)


@stats_bp.route('/team-player-win-rate', methods=['POST'])
@token_required
def team_player_win_rate():
    user = request.current_user
    data = request.get_json(silent=True) or {}

    team_id = data.get('team_id')
    if not team_id:
        return bad_request("团队ID不能为空")

    # 验证团队成员身份
    member = TeamMember.query.filter_by(team_id=team_id, user_id=user.id).first()
    if not member:
        return bad_request("您不是该团队的成员")

    match_type_filter = data.get('type', 'all')
    include_unlimited = data.get('include_unlimited', True)
    time_range = data.get('time_range', 'all')

    now = int(time.time())

    # 获取所有团队选手
    team_players = Player.query.filter_by(team_id=team_id, deleted=0).all()
    if not team_players:
        return success([])

    # 构建比赛查询
    query = Match.query.filter_by(team_id=team_id, deleted=0)

    if match_type_filter == 'singles':
        query = query.filter(Match.type.in_(SINGLES_TYPES))
    elif match_type_filter == 'doubles':
        query = query.filter(Match.type.in_(DOUBLES_TYPES))

    if not include_unlimited:
        query = query.filter(Match.type.notin_(NON_FORMAL_MATCH_TYPES))

    if time_range == '30d':
        start_time = now - 30 * 24 * 3600
        query = query.filter(Match.match_time >= start_time)

    matches = query.all()

    player_stats = {}
    for tp in team_players:
        player_stats[tp.id] = {
            "player_id": tp.id,
            "player_name": tp.name,
            "total_matches": 0,
            "win_matches": 0
        }

    for m in matches:
        match_players = MatchPlayer.query.filter_by(match_id=m.id).all()
        for mp in match_players:
            pid = mp.player_id
            if pid in player_stats:
                player_stats[pid]["total_matches"] += 1
                if mp.is_winner == 1:
                    player_stats[pid]["win_matches"] += 1

    result = []
    for pid, stats in player_stats.items():
        win_rate = round(stats["win_matches"] / stats["total_matches"] * 100, 1) if stats["total_matches"] > 0 else 0
        result.append({
            "player_id": stats["player_id"],
            "player_name": stats["player_name"],
            "total_matches": stats["total_matches"],
            "win_matches": stats["win_matches"],
            "win_rate": win_rate
        })

    result.sort(key=lambda x: x["win_rate"], reverse=True)
    return success(result)


@stats_bp.route('/win-rate', methods=['POST'])
@token_required
def win_rate_stats():
    user = request.current_user
    data = request.get_json(silent=True) or {}

    team_id = data.get('team_id')

    if team_id:
        member = TeamMember.query.filter_by(team_id=team_id, user_id=user.id).first()
        if not member:
            return bad_request("您不是该团队的成员")
        query = Match.query.filter_by(team_id=team_id, deleted=0)
    else:
        query = Match.query.filter_by(created_by=user.id, deleted=0, team_id=None)

    query = query.filter(Match.type.notin_(['fs', 'fd']))

    match_type = data.get('type')
    if match_type:
        if match_type in VALID_MATCH_TYPES:
            query = query.filter_by(type=match_type)
        elif match_type == 'singles':
            query = query.filter(Match.type.in_(['ms', 'ws', 'os']))
        elif match_type == 'doubles':
            query = query.filter(Match.type.in_(['md', 'wd', 'xd', 'od']))
        elif match_type == 'unlimited':
            if team_id:
                query = Match.query.filter_by(team_id=team_id, deleted=0)
            else:
                query = Match.query.filter_by(created_by=user.id, deleted=0, team_id=None)
            query = query.filter(Match.type.in_(['fs', 'fd']))

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

    matches = query.all()

    player_stats = {}
    for m in matches:
        match_players = MatchPlayer.query.filter_by(match_id=m.id).all()
        for mp in match_players:
            pid = mp.player_id
            if pid not in player_stats:
                player = Player.query.get(pid)
                player_stats[pid] = {
                    "player_id": pid,
                    "player_name": player.name if player else "未知",
                    "total_matches": 0,
                    "win_matches": 0
                }
            player_stats[pid]["total_matches"] += 1
            if mp.is_winner == 1:
                player_stats[pid]["win_matches"] += 1

    result = []
    for pid, stats in player_stats.items():
        win_rate = round(stats["win_matches"] / stats["total_matches"] * 100, 1) if stats["total_matches"] > 0 else 0
        result.append({
            "player_id": stats["player_id"],
            "player_name": stats["player_name"],
            "total_matches": stats["total_matches"],
            "win_matches": stats["win_matches"],
            "win_rate": win_rate
        })

    result.sort(key=lambda x: x["win_rate"], reverse=True)
    return success(result)


@stats_bp.route('/score', methods=['POST'])
@token_required
def score_stats():
    user = request.current_user
    data = request.get_json(silent=True) or {}

    team_id = data.get('team_id')

    if team_id:
        member = TeamMember.query.filter_by(team_id=team_id, user_id=user.id).first()
        if not member:
            return bad_request("您不是该团队的成员")
        query = Match.query.filter_by(team_id=team_id, deleted=0)
    else:
        query = Match.query.filter_by(created_by=user.id, deleted=0, team_id=None)

    query = query.filter(Match.type.notin_(['fs', 'fd']))

    match_type = data.get('type')
    if match_type:
        if match_type in VALID_MATCH_TYPES:
            query = query.filter_by(type=match_type)
        elif match_type == 'singles':
            query = query.filter(Match.type.in_(['ms', 'ws', 'os']))
        elif match_type == 'doubles':
            query = query.filter(Match.type.in_(['md', 'wd', 'xd', 'od']))
        elif match_type == 'unlimited':
            if team_id:
                query = Match.query.filter_by(team_id=team_id, deleted=0)
            else:
                query = Match.query.filter_by(created_by=user.id, deleted=0, team_id=None)
            query = query.filter(Match.type.in_(['fs', 'fd']))

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

    matches = query.all()

    player_scores = {}
    for m in matches:
        match_players = MatchPlayer.query.filter_by(match_id=m.id).all()
        match_scores = MatchScore.query.filter_by(match_id=m.id).all()

        for mp in match_players:
            pid = mp.player_id
            if pid not in player_scores:
                player = Player.query.get(pid)
                player_scores[pid] = {
                    "player_id": pid,
                    "player_name": player.name if player else "未知",
                    "total_score": 0,
                    "match_count": 0
                }

        for ms in match_scores:
            team1_players = [mp for mp in match_players if mp.team == 1]
            team2_players = [mp for mp in match_players if mp.team == 2]
            for mp in team1_players:
                player_scores[mp.player_id]["total_score"] += ms.team1_score
            for mp in team2_players:
                player_scores[mp.player_id]["total_score"] += ms.team2_score

        for mp in match_players:
            player_scores[mp.player_id]["match_count"] += 1

    result = []
    for pid, stats in player_scores.items():
        avg_score = round(stats["total_score"] / stats["match_count"], 1) if stats["match_count"] > 0 else 0
        result.append({
            "player_id": stats["player_id"],
            "player_name": stats["player_name"],
            "total_score": stats["total_score"],
            "match_count": stats["match_count"],
            "avg_score": avg_score
        })

    result.sort(key=lambda x: x["total_score"], reverse=True)
    return success(result)
