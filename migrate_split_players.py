"""
选手表拆分迁移脚本

将 players 拆分为 single_players 和 team_players，
将 match_players 拆分为 single_match_players 和 team_match_players。
旧表保留为备份。
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from extensions import db

app = create_app()


def migrate():
    with app.app_context():
        print("=== 选手表拆分迁移开始 ===")

        # 1. 创建新表
        print("\n[1/5] 创建新表...")
        from models.single_player import SinglePlayer
        from models.team_player import TeamPlayer
        from models.match import SingleMatchPlayer, TeamMatchPlayer

        db.create_all()
        print("  新表创建完成: single_players, team_players, single_match_players, team_match_players")

        # 2. 迁移 players 数据
        print("\n[2/5] 迁移选手数据...")
        from models.player import Player

        all_players = Player.query.all()
        single_count = 0
        team_count = 0

        for p in all_players:
            if p.team_id is None:
                # 个人选手
                existing = SinglePlayer.query.filter_by(id=p.id).first()
                if not existing:
                    sp = SinglePlayer(
                        id=p.id,
                        name=p.name,
                        gender=p.gender,
                        created_by=p.created_by,
                        user_id=p.user_id,
                        deleted=p.deleted,
                        invite_expires_at=p.invite_expires_at,
                        created_at=p.created_at
                    )
                    db.session.add(sp)
                    single_count += 1
            else:
                # 团队选手
                existing = TeamPlayer.query.filter_by(id=p.id).first()
                if not existing:
                    tp = TeamPlayer(
                        id=p.id,
                        name=p.name,
                        gender=p.gender,
                        team_id=p.team_id,
                        user_id=p.user_id,
                        role=p.role,
                        deleted=p.deleted,
                        created_at=p.created_at
                    )
                    db.session.add(tp)
                    team_count += 1

        db.session.flush()
        print(f"  个人选手: {single_count} 条")
        print(f"  团队选手: {team_count} 条")

        # 3. 迁移 match_players 数据
        print("\n[3/5] 迁移比赛选手关联数据...")
        from models.match import MatchPlayer, Match

        all_match_players = MatchPlayer.query.all()
        single_mp_count = 0
        team_mp_count = 0

        for mp in all_match_players:
            match = Match.query.filter_by(id=mp.match_id).first()
            if not match:
                print(f"  警告: match_id={mp.match_id} 不存在，跳过")
                continue

            if match.team_id is None:
                # 个人比赛
                existing = SingleMatchPlayer.query.filter_by(id=mp.id).first()
                if not existing:
                    smp = SingleMatchPlayer(
                        id=mp.id,
                        match_id=mp.match_id,
                        player_id=mp.player_id,
                        side=mp.team,
                        is_winner=mp.is_winner
                    )
                    db.session.add(smp)
                    single_mp_count += 1
            else:
                # 团队比赛
                existing = TeamMatchPlayer.query.filter_by(id=mp.id).first()
                if not existing:
                    tmp = TeamMatchPlayer(
                        id=mp.id,
                        match_id=mp.match_id,
                        player_id=mp.player_id,
                        side=mp.team,
                        is_winner=mp.is_winner
                    )
                    db.session.add(tmp)
                    team_mp_count += 1

        db.session.flush()
        print(f"  个人比赛选手: {single_mp_count} 条")
        print(f"  团队比赛选手: {team_mp_count} 条")

        # 4. 验证数据完整性
        print("\n[4/5] 验证数据完整性...")
        old_player_count = Player.query.count()
        new_single_count = SinglePlayer.query.count()
        new_team_count = TeamPlayer.query.count()
        print(f"  旧 players 表: {old_player_count} 条")
        print(f"  新 single_players 表: {new_single_count} 条")
        print(f"  新 team_players 表: {new_team_count} 条")
        print(f"  合计: {new_single_count + new_team_count} 条")

        if new_single_count + new_team_count != old_player_count:
            print("  ⚠ 警告: 新表合计与旧表不一致！")
        else:
            print("  ✓ 选手数据一致")

        old_mp_count = MatchPlayer.query.count()
        new_smp_count = SingleMatchPlayer.query.count()
        new_tmp_count = TeamMatchPlayer.query.count()
        print(f"  旧 match_players 表: {old_mp_count} 条")
        print(f"  新 single_match_players 表: {new_smp_count} 条")
        print(f"  新 team_match_players 表: {new_tmp_count} 条")
        print(f"  合计: {new_smp_count + new_tmp_count} 条")

        if new_smp_count + new_tmp_count != old_mp_count:
            print("  ⚠ 警告: 新表合计与旧表不一致！")
        else:
            print("  ✓ 比赛选手数据一致")

        # 5. 提交
        print("\n[5/5] 提交事务...")
        db.session.commit()
        print("  ✓ 迁移完成")

        print("\n=== 迁移成功 ===")
        print("旧表 players 和 match_players 保留为备份，可手动删除。")


if __name__ == '__main__':
    migrate()
