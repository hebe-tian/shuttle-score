from flask import Blueprint, request
from extensions import db
from models.match import Match, MatchPlayer, MatchScore
from models.player import Player
from utils.response import success, bad_request
from utils.validators import validate_page, validate_page_size, VALID_MATCH_TYPES, MATCH_TYPE_CATEGORY
from utils.auth_decorator import token_required
from sqlalchemy import func

stats_bp = Blueprint('stats', __name__)


@stats_bp.route('/win-rate', methods=['POST'])
@token_required
def win_rate_stats():
    user = request.current_user
    data = request.get_json(silent=True) or {}

    query = Match.query.filter_by(created_by=user.id, deleted=0)

    match_type = data.get('type')
    if match_type:
        if match_type in VALID_MATCH_TYPES:
            query = query.filter_by(type=match_type)
        elif match_type == 'singles':
            query = query.filter(Match.type.in_(['ms', 'ws', 'os']))
        elif match_type == 'doubles':
            query = query.filter(Match.type.in_(['md', 'wd', 'xd', 'od']))

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

    query = Match.query.filter_by(created_by=user.id, deleted=0)

    match_type = data.get('type')
    if match_type:
        if match_type in VALID_MATCH_TYPES:
            query = query.filter_by(type=match_type)
        elif match_type == 'singles':
            query = query.filter(Match.type.in_(['ms', 'ws', 'os']))
        elif match_type == 'doubles':
            query = query.filter(Match.type.in_(['md', 'wd', 'xd', 'od']))

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
