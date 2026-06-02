# Shuttle Score

羽毛球比赛记分平台，支持多种比赛类型的比分录入、查询与数据统计。

## 技术栈

- **后端**：Python 3 / Flask 3.0 / SQLAlchemy / SQLite
- **前端**：原生 HTML / CSS / JavaScript（无构建工具）
- **认证**：JWT（PyJWT 2.8）
- **图表**：Chart.js
- **数据库**：SQLite

## 项目结构

```
shuttle-score/
├── app.py                  # Flask 应用工厂
├── config.py               # 配置（数据库路径、JWT密钥、Token过期时间）
├── extensions.py            # SQLAlchemy 实例
├── init_db.py               # 数据库初始化脚本（创建表 + 超级管理员）
├── requirements.txt         # Python 依赖
├── api/                     # 后端 API 蓝图
│   ├── auth.py              # 用户注册/登录/个人资料
│   ├── players.py           # 选手管理
│   ├── matches.py            # 比赛录入/查询
│   ├── stats.py             # 数据统计（胜率、得分）
│   └── admin.py             # 管理后台 API
├── models/                  # 数据模型
│   ├── user.py              # User / Admin 模型
│   ├── player.py            # Player 模型
│   └── match.py             # Match / MatchPlayer / MatchScore 模型
├── utils/                   # 工具模块
│   ├── response.py          # 统一响应格式
│   ├── auth_decorator.py    # JWT 认证装饰器
│   ├── validators.py        # 输入校验
│   └── trace.py             # 链路追踪
└── static/                  # 前端静态资源
    ├── css/
    │   ├── base.css         # CSS 变量与全局样式
    │   ├── components.css   # 组件样式
    │   └── admin.css        # 管理后台样式
    ├── js/
    │   ├── api.js           # API 请求封装
    │   ├── auth.js          # 认证状态管理
    │   ├── nav.js           # 导航栏/TabBar/Toast/比赛卡片渲染
    │   ├── players.js       # 选手管理页面逻辑
    │   ├── matches.js       # 比赛录入页面逻辑
    │   ├── stats.js         # 数据统计页面逻辑
    │   └── admin.js         # 管理后台页面逻辑
    ├── images/
    │   └── logo.png         # 网站 Logo
    └── pages/               # HTML 页面
        ├── index.html       # 首页
        ├── login.html       # 登录
        ├── register.html    # 注册
        ├── myhomepage.html  # 我的主页
        ├── matches.html      # 比赛录入
        ├── match-query.html # 比赛查询
        ├── stats.html       # 数据统计
        ├── profile.html     # 个人设置
        └── admin/           # 管理后台页面
```

## 功能概览

### 用户端

| 功能 | 说明 |
|------|------|
| 注册/登录 | 两步注册（账号密码 → 用户名性别），JWT 认证 |
| 选手管理 | 添加选手（姓名+性别），按性别筛选 |
| 比赛录入 | 4 步流程：选类型 → 选选手 → 录比分 → 确认提交 |
| 比赛查询 | 按类型/时间/选手筛选，分页浏览 |
| 数据统计 | 胜率柱状图 + 得分统计，支持按比赛类型筛选 |
| 个人设置 | 修改用户名、修改密码 |

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
| `/api/matches` | POST | 录入比赛 | 用户 |
| `/api/matches/query` | POST | 查询比赛 | 用户 |
| `/api/matches/<id>` | GET | 比赛详情 | 用户 |
| `/api/matches/random` | GET | 随机比赛（首页） | 无 |
| `/api/stats/win-rate` | POST | 胜率统计 | 用户 |
| `/api/stats/score` | POST | 得分统计 | 用户 |
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
| `SQLALCHEMY_DATABASE_URI` | `sqlite:///shuttle_score.db` | 数据库连接 |
| `JWT_SECRET_KEY` | `dev-secret-key` | JWT 签名密钥（仅开发用） |
| `USER_TOKEN_EXPIRE_DAYS` | 31 | 用户 Token 有效期（天） |
| `ADMIN_TOKEN_EXPIRE_DAYS` | 7 | 管理员 Token 有效期（天） |

### 生产环境配置

生产环境敏感配置通过 `flask encrypt-env` 加密存储，使用 Fernet 对称加密。

### Flask CLI 命令

| 命令 | 说明 |
|------|------|
| `flask deploy` | 交互式部署初始化 |
| `flask create-superadmin` | 创建/更新超级管理员 |
| `flask encrypt-env` | 加密生产环境配置 |
| `flask db upgrade` | 执行数据库迁移 |

## 设计说明

- **响应式布局**：768px 断点，PC 端顶部导航栏，移动端底部 TabBar
- **独立管理系统**：`admins` 表与 `users` 表分离，管理员使用独立登录页和 Token
- **多局比赛**：每局比分作为独立 Match 记录保存，各自计算胜负
- **时间戳**：所有时间戳使用 Unix 秒级时间戳（UTC+8 北京时间）
- **前端无构建**：纯原生 HTML/CSS/JS，无需 Node.js 或打包工具
