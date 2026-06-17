# Shuttle Score

羽毛球比赛记分平台，支持多种比赛类型的比分录入、查询与数据统计。

## 技术栈

- **后端**：Python 3 / Flask 3.0 / SQLAlchemy / SQLite
- **数据库迁移**：Flask-Migrate（Alembic）
- **配置加密**：cryptography（Fernet 对称加密）
- **前端**：原生 HTML / CSS / JavaScript（无构建工具）
- **认证**：JWT（PyJWT 2.8）
- **图表**：Chart.js

## 项目结构

```
shuttle-score/
├── app.py                  # Flask 应用工厂
├── config.py               # 多环境配置类（Development / Production）
├── extensions.py           # SQLAlchemy + Migrate 实例
├── cli.py                  # Flask CLI 命令（deploy / create-superadmin / encrypt-env）
├── crypto_utils.py         # Fernet 加密/解密工具
├── requirements.txt        # Python 依赖
├── api/                    # 后端 API 蓝图
│   ├── auth.py             # 用户注册/登录/个人资料
│   ├── players.py          # 选手管理
│   ├── matches.py          # 比赛录入/查询
│   ├── stats.py            # 数据统计（胜率、得分）
│   ├── teams.py            # 团队管理
│   ├── settings.py         # 公共配置（GitHub Issue URL、联系邮箱）
│   └── admin.py            # 管理后台 API
├── models/                 # 数据模型
│   ├── user.py             # User / Admin 模型
│   ├── player.py           # Player 模型（含 user_id 绑定字段）
│   ├── single_player.py    # SinglePlayer 模型（个人赛选手）
│   ├── team.py             # Team / TeamMember 模型
│   ├── team_player.py      # TeamPlayer 模型（团队赛选手）
│   └── match.py            # Match / MatchPlayer / MatchScore 模型
├── utils/                  # 工具模块
│   ├── response.py         # 统一响应格式
│   ├── auth_decorator.py   # JWT 认证装饰器
│   ├── validators.py       # 输入校验
│   └── trace.py            # 链路追踪
├── migrations/             # 数据库迁移脚本（Flask-Migrate）
│   └── versions/           # 迁移版本文件
└── static/                 # 前端静态资源
    ├── css/
    │   ├── base.css        # CSS 变量与全局样式
    │   ├── components.css  # 组件样式
    │   └── admin.css       # 管理后台样式
    ├── js/
    │   ├── api.js          # API 请求封装
    │   ├── auth.js         # 认证状态管理
    │   ├── nav.js          # 导航栏/TabBar/帮助按钮/Toast/比赛卡片渲染
    │   ├── players.js      # 选手管理页面逻辑
    │   ├── matches.js      # 比赛录入页面逻辑
    │   ├── teams.js        # 团队管理页面逻辑
    │   ├── team-detail.js  # 团队详情页面逻辑
    │   ├── stats.js        # 数据统计页面逻辑
    │   └── admin.js        # 管理后台页面逻辑
    ├── images/
    │   └── logo.png        # 网站 Logo
    └── pages/              # HTML 页面
        ├── index.html      # 首页
        ├── login.html      # 登录
        ├── register.html   # 注册
        ├── myhomepage.html # 我的主页
        ├── matches.html    # 比赛录入
        ├── match-query.html# 比赛查询
        ├── teams.html      # 团队列表
        ├── team-detail.html# 团队详情
        ├── stats.html      # 数据统计
        ├── profile.html    # 个人设置
        └── admin/          # 管理后台页面
```

## 功能概览

### 用户端

| 功能 | 说明 |
|------|------|
| 注册/登录 | 两步注册（账号密码 → 用户名性别），注册时自动创建同名选手，JWT 认证 |
| 选手管理 | 添加选手（姓名+性别），按性别筛选；编辑名称、逻辑删除、绑定用户、邀请注册、解绑 |
| 邀请注册 | 生成邀请链接（24小时有效），新用户通过链接注册后自动绑定该选手；也可直接输入对方账号绑定 |
| 比赛录入 | 4 步流程：选类型 → 选选手 → 录比分 → 确认提交 |
| 比赛查询 | 按类型/时间/选手筛选，分页浏览 |
| 团队管理 | 创建团队、通过邀请码加入团队、团队内选手管理、退出团队 |
| 数据统计 | 胜率柱状图 + 得分统计，支持按比赛类型筛选 |
| 个人设置 | 修改用户名、修改密码 |
| 使用指南 | 右下角 ? 按钮，查看选手机制、邀请机制、团队机制、如何提 Issue |

### 管理后台

| 功能 | 说明 |
|------|------|
| 管理员管理 | 超级管理员可增删改管理员、重置密码 |
| 用户管理 | 查看/禁用用户 |
| 比赛管理 | 查看所有比赛、删除比赛 |
| 选手管理 | 查看/编辑/删除选手 |

### 比赛类型

| 代码 | 名称 | 性别限制 |
|------|------|---------|
| ms | 男单 | 仅男选手 |
| ws | 女单 | 仅女选手 |
| os | 无限制单打 | 无限制 |
| md | 男双 | 仅男选手 |
| wd | 女双 | 仅女选手 |
| xd | 混双 | 每队一男一女 |
| od | 无限制双打 | 无限制 |

## API 概览

所有 API 使用统一响应格式：

```json
{
  "code": 200,
  "data": {},
  "msg": "错误信息",
  "traceId": "uuid"
}
```

| 路径 | 方法 | 说明 | 认证 |
|------|------|------|------|
| `/api/auth/register` | POST | 两步注册 | 无 |
| `/api/auth/login` | POST | 用户登录 | 无 |
| `/api/auth/profile` | GET/POST | 查看/修改个人资料 | 用户 |
| `/api/players` | GET/POST | 获取/添加选手 | 用户 |
| `/api/players/update` | POST | 编辑选手（名称、绑定用户ID） | 用户 |
| `/api/players/delete` | POST | 逻辑删除选手 | 用户 |
| `/api/players/unbind` | POST | 解绑选手与用户 | 用户 |
| `/api/players/invite` | POST | 生成邀请链接 | 用户 |
| `/api/players/bind-user` | GET | 获取绑定用户信息 | 用户 |
| `/api/matches` | POST | 录入比赛 | 用户 |
| `/api/matches/query` | POST | 查询比赛 | 用户 |
| `/api/matches/<id>` | GET | 比赛详情 | 用户 |
| `/api/matches/random` | GET | 随机比赛（首页） | 无 |
| `/api/stats/win-rate` | POST | 胜率统计 | 用户 |
| `/api/stats/score` | POST | 得分统计 | 用户 |
| `/api/settings` | GET | 获取公共配置（GitHub Issue URL、联系邮箱） | 无 |
| `/api/teams` | POST | 创建团队 | 用户 |
| `/api/teams` | GET | 获取我的团队列表 | 用户 |
| `/api/teams/resolve` | POST | 解析团队（验证名称+邀请码） | 用户 |
| `/api/teams/<id>` | GET | 获取团队详情 | 用户 |
| `/api/teams/<id>/join` | POST | 加入团队 | 用户 |
| `/api/teams/<id>/leave` | POST | 退出团队 | 用户 |
| `/api/teams/<id>/invite-code` | POST | 刷新邀请码 | 用户（创建者） |
| `/api/teams/<id>/players` | POST | 添加团队选手 | 用户 |
| `/api/teams/<id>/players` | GET | 获取团队选手列表 | 用户 |
| `/api/admin/auth/login` | POST | 管理员登录 | 无 |
| `/api/admin/admins` | GET/POST | 管理员列表/新增 | 超级管理员 |
| `/api/admin/users` | GET | 用户列表 | 管理员 |
| `/api/admin/matches/query` | POST | 比赛列表 | 管理员 |
| `/api/admin/players` | GET | 选手列表 | 管理员 |

## 本地运行

### 环境要求

- Python 3.8+
- pip

### 安装步骤

```bash
# 克隆项目
git clone <repository-url>
cd shuttle-score

# 创建虚拟环境
python3 -m venv .shuttle
source .shuttle/bin/activate  # macOS/Linux
# .shuttle\Scripts\activate   # Windows

# 安装依赖
pip install -r requirements.txt

# 初始化数据库
flask db upgrade

# 创建超级管理员
flask create-superadmin

# 启动开发服务器
python3 app.py
```

访问 http://127.0.0.1:5000 即可使用。

> 详细开发指南请参考 [LOCAL.md](LOCAL.md)，生产部署请参考 [DEPLOY.md](DEPLOY.md)。

### 默认管理员

开发环境默认管理员：
- 账号：`superadmin`
- 密码：`admin123456`

生产环境通过 `flask create-superadmin` 命令交互式创建。

## 配置说明

### 环境区分

| 环境 | FLASK_ENV | 配置来源 |
|------|-----------|---------|
| 开发 | `development`（默认） | `config.py` 中的 `DevelopmentConfig` |
| 生产 | `production` | 加密的 `.env.prod` 文件（通过 `flask encrypt-env` 生成） |

### 开发环境配置

| 配置项 | 值 | 说明 |
|--------|-----|------|
| `SQLALCHEMY_DATABASE_URI` | `sqlite:///shuttle_score.db` | 数据库连接（基于项目目录） |
| `JWT_SECRET_KEY` | `dev-secret-key` | JWT 签名密钥（仅开发用） |
| `USER_TOKEN_EXPIRE_DAYS` | 31 | 用户 Token 有效期（天） |
| `ADMIN_TOKEN_EXPIRE_DAYS` | 7 | 管理员 Token 有效期（天） |

### 生产环境配置

生产环境敏感配置通过 `flask encrypt-env` 加密存储，使用 Fernet 对称加密。

| 配置项 | 说明 |
|--------|------|
| `JWT_SECRET_KEY` | JWT 签名密钥（留空自动生成） |
| `SUPER_ADMIN_ACCOUNT` | 超级管理员账号 |
| `SUPER_ADMIN_PASSWORD` | 超级管理员密码（留空自动生成） |
| `USER_TOKEN_EXPIRE_DAYS` | 用户 Token 有效期（天） |
| `ADMIN_TOKEN_EXPIRE_DAYS` | 管理员 Token 有效期（天） |

> `DATABASE_URI` 不需要手动配置，生产环境自动使用项目目录下的 `shuttle_score.db`。

### Flask CLI 命令

| 命令 | 说明 |
|------|------|
| `flask deploy` | 交互式部署初始化（迁移 + 创建管理员 + 验证） |
| `flask create-superadmin` | 创建/更新超级管理员 |
| `flask encrypt-env` | 加密生产环境配置 |
| `flask db upgrade` | 执行数据库迁移 |
| `flask db migrate -m "描述"` | 生成迁移脚本 |

## 数据模型

### User / Player 关系

| 字段 | Player | 说明 |
|------|--------|------|
| `created_by` | 谁录入了这个选手 | 注册时 = 用户自身，手动添加 = 添加者 |
| `user_id` | 选手绑定的注册用户 | 注册时自动绑定，手动添加为 null |
| `deleted` | 逻辑删除标记 | 0=正常，1=已删除（关联成绩保留） |
| `invite_expires_at` | 邀请过期时间戳 | 0=无邀请，>0 时表示邀请链接有效截止时间 |

注册时自动创建同名同性别的 Player 记录（`created_by` 和 `user_id` 均为用户自身 ID）。手动添加的选手 `user_id` 为 null，可通过以下方式绑定：
- **邀请注册**：生成邀请链接（使用 player_id 作为邀请码，24小时有效），新用户通过链接注册后自动绑定
- **直接绑定**：输入已注册用户的 ID 建立绑定关系

绑定规则：
- 用户A下的选手与用户B只能绑定一次（不可重复绑定）
- 不能绑定自己
- 已绑定选手名称显示下划线，点击可查看绑定用户信息
- 支持解绑

### Team / TeamMember / TeamPlayer 关系

#### teams 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| name | TEXT | 团队名称 |
| creator_id | INTEGER | 创建者用户 ID |
| invite_code | TEXT | 邀请码（唯一） |
| invite_expires_at | INTEGER | 邀请码过期时间戳（0=永不过期） |
| deleted | INTEGER | 逻辑删除标记：0=正常，1=已删除 |
| created_at | INTEGER | 创建时间（秒级时间戳） |

#### team_members 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| team_id | INTEGER | 团队 ID |
| user_id | INTEGER | 用户 ID |
| joined_at | INTEGER | 加入时间（秒级时间戳） |

联合唯一约束：`(team_id, user_id)`

#### team_players 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| name | TEXT | 选手名称 |
| gender | TEXT | 性别：male / female |
| team_id | INTEGER | 团队 ID |
| user_id | INTEGER | 绑定的用户 ID（可为 null） |
| role | TEXT | 角色：admin / member |
| deleted | INTEGER | 逻辑删除标记：0=正常，1=已删除 |
| created_at | INTEGER | 创建时间（秒级时间戳） |

#### Settings 表

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键，自增 |
| key | TEXT | 配置键（唯一） |
| value | TEXT | 配置值 |

公开配置项：`github_issue_url`（GitHub Issues 链接）、`contact_email`（联系邮箱）

## 设计说明

- **响应式布局**：768px 断点，PC 端顶部导航栏，移动端底部 TabBar
- **独立管理系统**：`admins` 表与 `users` 表分离，管理员使用独立登录页和 Token
- **多局比赛**：每局比分作为独立 Match 记录保存，各自计算胜负
- **时间戳**：所有时间戳使用 Unix 秒级时间戳（UTC+8 北京时间）
- **前端无构建**：纯原生 HTML/CSS/JS，无需 Node.js 或打包工具
- **配置加密**：生产环境使用 Fernet 对称加密，密钥与配置分离存储
- **数据库迁移**：Flask-Migrate 管理表结构变更，生产环境安全升级不丢数据
- **注册即选手**：用户注册时自动创建同名选手，录入比赛时可直接选择自己
- **逻辑删除**：选手和比赛使用 `deleted` 字段软删除，关联数据保留
- **数据隔离**：用户只能查看和操作自己创建的选手和比赛，统计数据按用户隔离
