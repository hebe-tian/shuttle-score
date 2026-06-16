"""
修复 single_players 中本人选手缺失的问题

问题：拆表迁移后，部分用户的"本人选手"（user_id=自己）被迁移到了 team_players，
导致 single_players 中没有 user_id=自己的记录。

修复逻辑：
1. 对每个用户，检查 single_players 中是否有 user_id=自己的记录
2. 如果没有，查找 created_by=自己 且 name=用户名 且 gender=用户性别 的选手，设置 user_id
3. 如果仍然没有，创建一个新的本人选手
4. 清理重复的 user_id 绑定（同一用户只保留一个 user_id 绑定的本人选手）
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app
from extensions import db
from models.user import User
from models.single_player import SinglePlayer

app = create_app()


def fix():
    with app.app_context():
        print("=== 修复 single_players 本人选手缺失 ===")

        users = User.query.filter_by(status=1).all()
        fixed = 0
        created = 0

        for u in users:
            # 检查 single_players 中是否有 user_id=自己的记录
            bound = SinglePlayer.query.filter_by(user_id=u.id, deleted=0).all()

            if len(bound) == 0:
                # 没有本人选手，尝试从已有选手中匹配
                match = SinglePlayer.query.filter_by(
                    created_by=u.id, name=u.username, gender=u.gender, deleted=0
                ).first()

                if match:
                    match.user_id = u.id
                    print(f"  用户 {u.id} ({u.username}): 设置 {match.name} 的 user_id={u.id}")
                    fixed += 1
                else:
                    # 创建新的本人选手
                    now = int(__import__('time').time())
                    new_player = SinglePlayer(
                        name=u.username,
                        gender=u.gender,
                        created_by=u.id,
                        user_id=u.id,
                        created_at=now
                    )
                    db.session.add(new_player)
                    print(f"  用户 {u.id} ({u.username}): 创建本人选手")
                    created += 1

            elif len(bound) > 1:
                # 有多个 user_id 绑定的选手，保留第一个，清除其余的 user_id
                print(f"  用户 {u.id} ({u.username}): 有 {len(bound)} 个 user_id 绑定的选手，清理重复")
                for i, p in enumerate(bound):
                    if i > 0:
                        # 检查这个选手是否是注册时创建的本人选手（name=用户名, gender=用户性别）
                        if p.name == u.username and p.gender == u.gender and p.created_by == u.id:
                            # 这是注册创建的本人选手，保留 user_id，清除第一个的
                            bound[0].user_id = None
                            print(f"    清除 {bound[0].name}(id={bound[0].id}) 的 user_id，保留 {p.name}(id={p.id})")
                            break
                        else:
                            p.user_id = None
                            print(f"    清除 {p.name}(id={p.id}) 的 user_id")

        db.session.commit()
        print(f"\n修复完成: 设置 user_id {fixed} 个, 新建 {created} 个")


if __name__ == '__main__':
    fix()
