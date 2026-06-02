# Shuttle Score — 本地开发指南

## 环境要求

- Python 3.8+
- pip

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/your-username/shuttle-score.git
cd shuttle-score
```

### 2. 创建虚拟环境

```bash
python3 -m venv .shuttle
source .shuttle/bin/activate  # macOS/Linux
# .shuttle\Scripts\activate   # Windows
```

### 3. 安装依赖

```bash
pip install -r requirements.txt
```

### 4. 初始化数据库

```bash
# 首次初始化（创建表 + 迁移）
flask db upgrade

# 创建超级管理员
flask create-superadmin
```

默认开发环境管理员：
- 账号：`superadmin`
- 密码：`admin123456`

### 5. 启动开发服务器

```bash
python3 app.py
```

访问 http://127.0.0.1:5000 即可使用。

## 开发环境配置

开发环境默认配置（`config.py` 中的 `DevelopmentConfig`）：

| 配置项 | 值 |
|--------|-----|
| `DEBUG` | `True` |
| `SQLALCHEMY_DATABASE_URI` | `sqlite:///shuttle_score.db` |
| `JWT_SECRET_KEY` | `dev-secret-key` |
| `SUPER_ADMIN_ACCOUNT` | `superadmin` |
| `SUPER_ADMIN_PASSWORD` | `admin123456` |

无需额外配置，开箱即用。

## 常用命令

### 数据库迁移

当修改了 `models/` 中的模型后：

```bash
# 1. 生成迁移脚本
flask db migrate -m "描述变更内容"

# 2. 检查生成的迁移脚本（重要！）
# 查看 migrations/versions/ 下的新文件

# 3. 应用迁移
flask db upgrade
```

### 管理员管理

```bash
# 交互式创建/更新管理员
flask create-superadmin

# 参数式创建
flask create-superadmin --account admin001 --password MyP@ss123
```

### 完整部署初始化

```bash
# 交互式部署（创建表 + 创建管理员 + 验证）
flask deploy
```

## 项目结构

```
shuttle-score/
├── app.py              # Flask 应用工厂
├── config.py           # 多环境配置类
├── extensions.py       # SQLAlchemy + Migrate 实例
├── cli.py              # Flask CLI 命令
├── crypto_utils.py     # Fernet 加密/解密工具
├── api/                # 后端 API 蓝图
├── models/             # 数据模型
├── utils/              # 工具模块
├── static/             # 前端静态资源
├── migrations/         # 数据库迁移脚本
└── requirements.txt    # Python 依赖
```

## 数据库管理

### 查看当前迁移状态

```bash
flask db current
```

### 回滚迁移

```bash
# 回滚一步
flask db downgrade

# 回滚到指定版本
flask db downgrade <revision_id>
```

### 重置数据库

```bash
# ⚠️ 警告：此操作会删除所有数据
rm shuttle_score.db
flask db upgrade
flask create-superadmin
```

## 环境切换

默认为开发环境（`FLASK_ENV=development`）。如需切换：

```bash
# 开发环境（默认）
export FLASK_ENV=development

# 生产环境（需要 .env.prod 和 .env.prod.key）
export FLASK_ENV=production
```

生产环境配置需要先执行 `flask encrypt-env` 生成加密配置文件，详见 [DEPLOY.md](DEPLOY.md)。
