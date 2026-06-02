# Shuttle Score — PythonAnywhere 部署指南

本文档介绍如何使用 PythonAnywhere 免费账号部署 Shuttle Score。

## 前提条件

- 一个 [PythonAnywhere](https://www.pythonanywhere.com/) 免费账号
- 项目代码已推送到 GitHub 仓库

## 免费账号限制

| 限制项 | 说明 |
|--------|------|
| 域名 | `your-username.pythonanywhere.com` |
| CPU 秒数 | 每天 100 秒 |
| 磁盘空间 | 512 MB |
| 私有文件 | 不支持（所有文件对其他用户可见） |
| 自定义域名 | 不支持 |
| HTTPS | 自动提供 |

## 部署步骤

### 1. 在 PythonAnywhere 上克隆代码

登录 PythonAnywhere 后，打开一个 **Bash 控制台**（Consoles → Bash）：

```bash
git clone https://github.com/your-username/shuttle-score.git ~/shuttle-score
```

> 如果仓库是私有的，需要先在 PythonAnywhere 上配置 SSH Key 或使用 Personal Access Token。

### 2. 创建虚拟环境并安装依赖

```bash
cd ~/shuttle-score
python3 -m venv .shuttle
source .shuttle/bin/activate
pip install -r requirements.txt
```

### 3. 加密生产环境配置

在**本地机器**上生成加密配置文件：

```bash
cd shuttle-score
source .shuttle/bin/activate

# 生成加密配置（交互式输入）
flask encrypt-env
```

按提示输入：

| 配置项 | 说明 | 建议 |
|--------|------|------|
| `JWT_SECRET_KEY` | JWT 签名密钥 | 留空自动生成 64 位随机密钥 |
| `SUPER_ADMIN_ACCOUNT` | 超级管理员账号 | 自定义，如 `myadmin` |
| `SUPER_ADMIN_PASSWORD` | 超级管理员密码 | 留空自动生成 16 位随机密码 |

> `DATABASE_URI` 不需要手动配置，生产环境自动使用项目目录下的 `shuttle_score.db`。

执行成功后会生成两个文件：

- `.env.prod` — 加密后的配置文件（提交到服务器）
- `.env.prod.key` — 加密密钥（**不要提交到 Git**）

### 4. 上传加密配置到 PythonAnywhere

将加密配置文件和密钥上传到服务器：

**方式 A：使用 SCP（推荐）**

在**本地机器**上执行：

```bash
scp .env.prod .env.prod.key your-username@your-username.pythonanywhere.com:~/shuttle-score/
```

> ⚠️ PythonAnywhere 免费账号不支持 SSH/SCP，请使用方式 B。

**方式 B：在 PythonAnywhere Bash 控制台中手动创建**

在 PythonAnywhere 的 Bash 控制台中：

```bash
cd ~/shuttle-score

# 创建加密密钥文件（将本地 .env.prod.key 的内容粘贴进来）
cat > .env.prod.key << 'EOF'
粘贴你的密钥内容
EOF

# 创建加密配置文件（将本地 .env.prod 的内容粘贴进来）
cat > .env.prod << 'EOF'
粘贴你的加密配置内容
EOF

# 设置文件权限（仅自己可读）
chmod 600 .env.prod.key .env.prod
```

### 5. 初始化数据库并创建管理员

```bash
cd ~/shuttle-score
source .shuttle/bin/activate
export FLASK_ENV=production

# ⚠️ 首次部署无需备份；后续更新时，在执行迁移前先备份数据库
# cp ~/shuttle-score/shuttle_score.db ~/shuttle_score_backup_$(date +%Y%m%d).db

# 执行数据库迁移
flask db upgrade

# 创建超级管理员（交互式）
flask create-superadmin

# 或使用参数式
flask create-superadmin --account myadmin --password MySecureP@ss
```

### 6. 配置 PythonAnywhere Web 应用

在 PythonAnywhere 的 **Web** 页面：

1. 点击 **Add a new web app**
2. 选择你的域名 `your-username.pythonanywhere.com`
3. 选择 **Manual configuration**
4. 选择 Python 版本（推荐 Python 3.10）

创建完成后，在 Web 配置页面填写以下字段：

| 字段 | 值 | 说明 |
|------|-----|------|
| **Source code** | `/home/your-username/shuttle-score` | 项目根目录 |
| **Working directory** | `/home/your-username/shuttle-score` | 工作目录（与 Source code 相同） |
| **Virtualenv** | `/home/your-username/shuttle-score/.shuttle` | 虚拟环境目录 |

> ⚠️ 将 `your-username` 替换为你的 PythonAnywhere 用户名。

然后找到 **WSGI configuration file** 的路径，点击编辑，替换为以下内容：

```python
import os
import sys

# 项目路径（替换 your-username）
project_home = '/home/your-username/shuttle-score'

if project_home not in sys.path:
    sys.path.insert(0, project_home)

# 激活虚拟环境（Python 3.9+ 不再包含 activate_this.py，改用 site-packages 方式）
venv_site_packages = project_home + '/.shuttle/lib/python3.13/site-packages'
if os.path.exists(venv_site_packages):
    if venv_site_packages not in sys.path:
        sys.path.insert(0, venv_site_packages)

# 设置生产环境
os.environ['FLASK_ENV'] = 'production'

# 导入 Flask 应用
from app import create_app
app = create_app()
application = app
```

> ⚠️ **重要**：将 `your-username` 替换为你的 PythonAnywhere 用户名。

### 7. 配置静态文件

在 Web 配置页面中，找到 **Static files** 部分：

| URL | Directory |
|-----|-----------|
| `/css/` | `/home/your-username/shuttle-score/static/css` |
| `/js/` | `/home/your-username/shuttle-score/static/js` |
| `/images/` | `/home/your-username/shuttle-score/static/images` |

### 8. 重载 Web 应用

在 Web 配置页面点击 **Reload** 按钮。

### 9. 验证部署

访问 `https://your-username.pythonanywhere.com/`，应该能看到首页。

测试以下功能：

- [ ] 首页正常显示
- [ ] 注册新用户
- [ ] 登录
- [ ] 添加选手
- [ ] 录入比赛
- [ ] 查询比赛
- [ ] 数据统计
- [ ] 管理后台 `https://your-username.pythonanywhere.com/admin/login.html`

## 更新部署

当项目代码更新后：

```bash
cd ~/shuttle-score
git pull origin main
source .shuttle/bin/activate

# 如果依赖有变化
pip install -r requirements.txt

# 如果数据库模型有变化（安全升级，不丢数据）
# ⚠️ 执行迁移前先备份数据库
cp ~/shuttle-score/shuttle_score.db ~/shuttle_score_backup_$(date +%Y%m%d).db
export FLASK_ENV=production
flask db upgrade

# 在 Web 配置页面点击 Reload
```

## 数据库备份

```bash
# 备份
cp ~/shuttle-score/shuttle_score.db ~/shuttle_score_backup_$(date +%Y%m%d).db

# 恢复
cp ~/shuttle_score_backup_20260529.db ~/shuttle-score/shuttle_score.db
```

## 加密配置管理

### 修改生产配置

在本地机器上重新执行 `flask encrypt-env`，然后重新上传 `.env.prod` 文件。

### 重新生成加密密钥

如果密钥泄露，需要：

1. 在本地执行 `flask encrypt-env` 生成新密钥和配置
2. 重新上传 `.env.prod` 和 `.env.prod.key`
3. 在 Web 配置页面点击 Reload

### 重置管理员密码

```bash
cd ~/shuttle-score
source .shuttle/bin/activate
export FLASK_ENV=production
flask create-superadmin --account newadmin --password NewP@ss123
```

## 常见问题

### Q: 页面返回 404

检查 WSGI 文件中的 `project_home` 路径是否正确，确保用户名已替换。

### Q: 静态资源加载失败

检查 Web 配置中 Static files 的 URL 映射和目录路径是否正确。

### Q: 数据库写入失败

```bash
chmod 644 ~/shuttle-score/shuttle_score.db
chmod 755 ~/shuttle-score/
```

### Q: 加密配置加载失败

检查 `.env.prod` 和 `.env.prod.key` 是否在同一目录下，且密钥文件权限正确：

```bash
ls -la ~/shuttle-score/.env.prod*
```

### Q: CPU 秒数用完

免费账号每天 100 CPU 秒，优化建议：

- 减少统计页面的查询频率
- 避免在高峰期执行大量数据操作
- 考虑升级为付费账号（$5/月）

### Q: 修改代码后不生效

修改代码后需要在 Web 配置页面点击 **Reload** 按钮。

## 安全建议

1. **加密配置**：生产环境使用 `flask encrypt-env` 加密敏感配置
2. **密钥保管**：`.env.prod.key` 是解密核心，丢失将无法解密配置
3. **文件权限**：设置 `chmod 600 .env.prod.key .env.prod`
4. **定期备份**：SQLite 数据库文件需要手动备份
5. **密钥备份**：在本地安全位置备份 `.env.prod.key`
