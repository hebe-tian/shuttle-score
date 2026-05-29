# Shuttle Score — PythonAnywhere 部署指南

本文档介绍如何使用 PythonAnywhere 免费账号部署 Shuttle Score。

## 前提条件

- 一个 [PythonAnywhere](https://www.pythonanywhere.com/) 免费账号
- 项目代码已推送到 GitHub 仓库

## 免费账号限制

| 限制项 | 说明 |
|--------|------|
| 域名 | `your-username.eu.pythonanywhere.com` |
| CPU 秒数 | 每天 100 秒 |
| 磁盘空间 | 512 MB |
| 私有文件 | 不支持（所有文件对其他用户可见） |
| 自定义域名 | 不支持 |
| HTTPS | 自动提供 |

## 部署步骤

### 1. 在 PythonAnywhere 上克隆代码

登录 PythonAnywhere 后，打开一个 **Bash 控制台**（Consoles → Bash）：

```bash
# 克隆你的 GitHub 仓库
git clone https://github.com/your-username/shuttle-score.git ~/shuttle-score
```

> 如果仓库是私有的，需要先在 PythonAnywhere 上配置 SSH Key 或使用 Personal Access Token。

### 2. 创建虚拟环境并安装依赖

```bash
cd ~/shuttle-score

# 创建虚拟环境（PythonAnywhere 默认提供 Python 3.10+）
python3 -m venv .venv
source .venv/bin/activate

# 安装依赖
pip install -r requirements.txt
```

### 3. 初始化数据库

```bash
# 确保虚拟环境已激活
source .venv/bin/activate

# 初始化数据库（创建表 + 超级管理员）
python3 init_db.py
```

执行成功后会输出：

```
Super admin created: superadmin
Database initialized successfully
```

### 4. 配置环境变量

在 Bash 控制台中创建环境变量文件：

```bash
cat > ~/shuttle-score/.env << 'EOF'
JWT_SECRET_KEY=你的随机密钥-请替换为复杂字符串
SUPER_ADMIN_ACCOUNT=superadmin
SUPER_ADMIN_PASSWORD=你的安全密码
EOF
```

> ⚠️ **安全提示**：免费账号的文件对其他用户可见，请设置足够复杂的密码和密钥。可以使用 `python3 -c "import secrets; print(secrets.token_hex(32))"` 生成随机密钥。

### 5. 创建 WSGI 配置文件

在 PythonAnywhere 的 **Web** 页面（点击顶部菜单 "Web"）：

1. 点击 **Add a new web app**
2. 选择你的域名 `your-username.eu.pythonanywhere.com`
3. 选择 **Manual configuration**（不要选 Flask 模板，手动配置更灵活）
4. 选择 Python 版本（推荐 Python 3.10）

然后在 Web 配置页面中找到 **WSGI configuration file** 的路径，点击编辑，替换为以下内容：

```python
import os
import sys

# 项目路径
project_home = '/home/your-username/shuttle-score'

# 添加项目路径到 Python 路径
if project_home not in sys.path:
    sys.path.insert(0, project_home)

# 激活虚拟环境
activate_this = project_home + '/.venv/bin/activate_this.py'
with open(activate_this) as f:
    exec(f.read(), {'__file__': activate_this})

# 加载环境变量
env_path = os.path.join(project_home, '.env')
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith('#') and '=' in line:
                key, value = line.split('=', 1)
                os.environ[key.strip()] = value.strip()

# 覆盖数据库路径为绝对路径
os.environ['DATABASE_URI'] = 'sqlite:///' + os.path.join(project_home, 'shuttle_score.db')

# 导入 Flask 应用
from app import create_app

# 创建应用并覆盖数据库配置
app = create_app()
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URI')
```

> ⚠️ **重要**：将 `your-username` 替换为你的 PythonAnywhere 用户名。

### 6. 修改 config.py 支持环境变量数据库路径

为了让部署时数据库路径可配置，需要修改 `config.py`：

```python
import os

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

SQLALCHEMY_DATABASE_URI = os.environ.get(
    'DATABASE_URI',
    'sqlite:///' + os.path.join(BASE_DIR, 'shuttle_score.db')
)
SQLALCHEMY_TRACK_MODIFICATIONS = False

JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'shuttle-score-secret-key-change-in-production')

USER_TOKEN_EXPIRE_DAYS = 31
ADMIN_TOKEN_EXPIRE_DAYS = 7

SUPER_ADMIN_ACCOUNT = os.environ.get('SUPER_ADMIN_ACCOUNT', 'superadmin')
SUPER_ADMIN_PASSWORD = os.environ.get('SUPER_ADMIN_PASSWORD', 'admin123456')
```

### 7. 配置静态文件

在 PythonAnywhere 的 **Web** 配置页面中，找到 **Static files** 部分：

| URL | Directory |
|-----|-----------|
| `/css/` | `/home/your-username/shuttle-score/static/css` |
| `/js/` | `/home/your-username/shuttle-score/static/js` |
| `/images/` | `/home/your-username/shuttle-score/static/images` |

> ⚠️ **注意**：免费账号的静态文件通过这些映射提供。HTML 页面由 Flask 路由处理，不需要映射。

### 8. 重载 Web 应用

在 Web 配置页面点击 **Reload** 按钮。

### 9. 验证部署

访问 `https://your-username.eu.pythonanywhere.com/`，应该能看到首页。

测试以下功能：

- [ ] 首页正常显示
- [ ] 注册新用户
- [ ] 登录
- [ ] 添加选手
- [ ] 录入比赛
- [ ] 查询比赛
- [ ] 数据统计
- [ ] 管理后台 `https://your-username.eu.pythonanywhere.com/admin/login.html`

## 日常维护

### 查看日志

在 Web 配置页面中可以查看：

- **Error log**：`/var/log/your-username.eu.pythonanywhere.com.error.log`
- **Server log**：`/var/log/your-username.eu.pythonanywhere.com.server.log`

也可以在 Bash 控制台中查看：

```bash
tail -50 /var/log/your-username.eu.pythonanywhere.com.error.log
```

### 更新代码

```bash
cd ~/shuttle-score
git pull origin main

# 如果依赖有变化
source .venv/bin/activate
pip install -r requirements.txt

# 如果数据库模型有变化
python3 init_db.py

# 重载 Web 应用（也可以在 Web 页面点击 Reload）
```

### 数据库备份

```bash
# 备份
cp ~/shuttle-score/shuttle_score.db ~/shuttle_score_backup_$(date +%Y%m%d).db

# 恢复
cp ~/shuttle_score_backup_20260529.db ~/shuttle-score/shuttle_score.db
```

## 常见问题

### Q: 页面返回 404

检查 WSGI 文件中的 `project_home` 路径是否正确，确保用户名已替换。

### Q: 静态资源（CSS/JS/图片）加载失败

检查 Web 配置中 Static files 的 URL 映射和目录路径是否正确。

### Q: 数据库写入失败

确认 `shuttle_score.db` 文件权限：

```bash
chmod 644 ~/shuttle-score/shuttle_score.db
chmod 755 ~/shuttle-score/
```

### Q: CPU 秒数用完

免费账号每天 100 CPU 秒，如果超限网站会暂时不可用。优化建议：

- 减少统计页面的查询频率
- 避免在高峰期执行大量数据操作
- 考虑升级为付费账号（$5/月）

### Q: 修改代码后不生效

修改代码后需要在 Web 配置页面点击 **Reload** 按钮，或使用 API：

```bash
# 在 Bash 控制台中
cd ~/shuttle-score
python3 -c "import requests; requests.post('https://www.pythonanywhere.com/api/v0/user/your-username/webapps/your-username.eu.pythonanywhere.com/reload/', headers={'Authorization': 'Token your-api-token'})"
```

## 安全建议

1. **修改默认密钥**：生产环境务必通过环境变量设置 `JWT_SECRET_KEY`
2. **修改管理员密码**：不要使用默认的 `admin123456`
3. **定期备份**：SQLite 数据库文件需要手动备份
4. **注意文件可见性**：免费账号的文件对其他用户可见，不要在代码中硬编码敏感信息
