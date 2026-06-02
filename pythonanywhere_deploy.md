# Shuttle Score 部署到 PythonAnywhere 指南

> 适用于 PythonAnywhere **免费账号**（Free Beginner Account）

---

## 一、PythonAnywhere 免费账号限制说明

| 限制项 | 说明 |
|--------|------|
| Web 应用数量 | 仅限 **1 个** |
| 域名 | `yourusername.pythonanywhere.com` |
| 每日 CPU 时间 | 有限（对小型 Flask 应用足够） |
| 数据库 | SQLite 可用；MySQL 有一个免费数据库 |
| 文件持久化 | 文件会持久保存，但需放在指定目录 |
| HTTPS | 支持，自动提供 `*.pythonanywhere.com` 证书 |
| 后台任务 | 有限制，不建议部署定时脚本 |

> 本项目使用 **SQLite** + **Flask 静态文件服务**，完全符合免费账号限制。

---

## 二、部署前准备

### 2.1 注册账号
1. 访问 [pythonanywhere.com](https://www.pythonanywhere.com)
2. 点击 **"Pricing & signup"** → 选择 **"Create a Beginner account"**
3. 填写用户名、邮箱、密码完成注册

### 2.2 本地准备加密配置文件

你的项目使用 `crypto_utils.py` 加载加密的生产配置。在部署前，你需要在本地生成加密文件并准备好。

#### 步骤 A：生成加密密钥和配置文件

在项目根目录下运行以下 Python 脚本（可在本地临时运行）：

```python
from cryptography.fernet import Fernet

key = Fernet.generate_key()
with open('.env.prod.key', 'wb') as f:
    f.write(key)

f = Fernet(key)
jwt_secret = input("请输入 JWT_SECRET_KEY: ")
super_admin = input("请输入 SUPER_ADMIN_ACCOUNT: ")
super_password = input("请输入 SUPER_ADMIN_PASSWORD: ")

with open('.env.prod', 'w') as f_out:
    f_out.write(f"JWT_SECRET_KEY=enc:{Fernet(key).encrypt(jwt_secret.encode()).decode()}\n")
    f_out.write(f"SUPER_ADMIN_ACCOUNT=enc:{Fernet(key).encrypt(super_admin.encode()).decode()}\n")
    f_out.write(f"SUPER_ADMIN_PASSWORD=enc:{Fernet(key).encrypt(super_password.encode()).decode()}\n")

print("已生成 .env.prod.key 和 .env.prod")
```

> **注意**：
> - `JWT_SECRET_KEY` 请设置为一个随机长字符串（如 32 位以上随机字符）。
> - `SUPER_ADMIN_ACCOUNT` / `SUPER_ADMIN_PASSWORD` 是你的超级管理员账号密码，请牢记。

#### 步骤 B：确认生成两个文件

运行后，项目根目录应出现：

```
.env.prod.key      # 加密密钥文件（二进制）
.env.prod          # 加密后的配置文本文件
```

这两个文件需要上传到 PythonAnywhere，但**不要提交到 GitHub**（已在 .gitignore 中）。

---

## 三、上传项目到 PythonAnywhere

### 3.1 进入 PythonAnywhere 控制台
1. 登录 [pythonanywhere.com](https://www.pythonanywhere.com)
2. 点击顶部 **"Consoles"** → 点击 **"Bash"** 打开命令行

### 3.2 克隆代码仓库

在 Bash 控制台中执行：

```bash
cd ~
git clone https://github.com/你的用户名/shuttle-score.git
```

> 如果代码未推送到 GitHub，你也可以通过 **Files 页面**上传 ZIP 压缩包，然后在 Bash 中解压。

### 3.3 上传加密配置文件

由于 `.env.prod.key` 和 `.env.prod` 在 `.gitignore` 中，不会随 Git 上传。你需要手动上传：

1. 点击顶部 **"Files"**
2. 导航到 `shuttle-score/` 目录
3. 点击 **"Upload a file"**，分别上传本地的 `.env.prod.key` 和 `.env.prod`

---

## 四、安装依赖

在 Bash 控制台中执行：

```bash
cd ~/shuttle-score
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

> PythonAnywhere 默认 Python 3.x 可用，确保虚拟环境创建成功。

---

## 五、初始化数据库

在 Bash 控制台中（确保虚拟环境已激活）：

```bash
cd ~/shuttle-score
export FLASK_ENV=production
flask deploy
```

> `flask deploy` 是项目内置的部署命令，会依次完成：
> 1. 创建数据库表（优先执行 `flask db upgrade`，失败则回退到 `db.create_all()`）
> 2. 交互式创建超级管理员账号（输入账号和密码）
> 3. 验证配置是否正确
>
> 请根据提示输入超级管理员账号和密码，牢记这些信息。

---

## 六、配置 Web 应用

### 6.1 创建 Web 应用

1. 点击顶部 **"Web"** 标签
2. 点击 **"Add a new web app"**
3. 选择 **"Manual configuration"**（手动配置）
4. 选择 **Python 3.10**（或更高版本，与你虚拟环境一致即可）
5. 点击 **"Next"** 完成创建

### 6.2 配置 WSGI 文件

1. 在 Web 页面中，找到 **"Code"** 区域
2. 点击 **"WSGI configuration file"** 旁边的链接（通常是 `/var/www/yourusername_pythonanywhere_com_wsgi.py`）
3. **删除文件中的所有默认内容**，替换为以下内容：

```python
import sys
import os

# 添加项目路径
path = '/home/yourusername/shuttle-score'
if path not in sys.path:
    sys.path.insert(0, path)

# 设置环境变量
os.environ['FLASK_ENV'] = 'production'

# 导入 Flask 应用
from app import create_app
application = create_app()
```

> **重要**：将 `yourusername` 替换为你的 PythonAnywhere 实际用户名。

4. 点击 **"Save"** 保存

### 6.3 配置虚拟环境路径

1. 在 Web 页面中找到 **"Virtualenv"** 区域
2. 点击 **"Enter path to a virtualenv"**
3. 填写：`/home/yourusername/shuttle-score/venv`
4. 点击 **"OK"**

### 6.4 配置静态文件（可选但推荐）

PythonAnywhere 的 Web 服务器可以直接提供静态文件，减轻 Flask 负担：

1. 在 Web 页面中找到 **"Static files"** 区域
2. 点击 **"Add a new static file mapping"**
3. 填写：
   - **URL**: `/static/`
   - **Directory**: `/home/yourusername/shuttle-score/static`
4. 点击 **"Save"**

> 如果配置了静态文件映射，PythonAnywhere 会直接托管这些文件；如果不配置，Flask 也会自行提供。

---

## 七、重启并验证

### 7.1 重启应用

1. 返回 **"Web"** 页面
2. 点击 **"Reload yourusername.pythonanywhere.com"**
3. 等待几秒，然后访问 `https://yourusername.pythonanywhere.com`

### 7.2 验证清单

- [ ] 首页能正常加载（`/` 路由）
- [ ] 登录/注册页面正常
- [ ] 能成功注册账号并登录
- [ ] 超级管理员能登录后台（`/admin/login.html`）
- [ ] 数据库操作正常（添加选手、录入比赛）

---

## 八、常见问题排查

### 8.1 500 Internal Server Error

查看错误日志定位问题：

1. 进入 **"Web"** 页面
2. 点击 **"Error log"** 链接查看详细错误信息

常见原因：
- `.env.prod` 或 `.env.prod.key` 未上传或路径错误
- 依赖未安装完整（检查 `requirements.txt`）
- WSGI 文件中的用户名或路径写错

### 8.2 数据库文件权限问题

SQLite 数据库文件需要 Web 应用有写入权限。PythonAnywhere 默认即可，但如果手动移动了文件，确保：

```bash
chmod 644 ~/shuttle-score/shuttle_score.db
```

### 8.3 静态文件 404

如果配置了静态文件映射但出现 404：
- 检查 **Directory** 路径是否正确（必须是绝对路径）
- 或者删除静态文件映射，让 Flask 自行处理

### 8.4 修改代码后未生效

每次修改代码后，需要点击 **"Reload"** 重启 Web 应用。

---

## 九、安全建议

1. **修改默认密码**：首次部署成功后，尽快修改超级管理员默认密码。
2. **保管好 `.env.prod.key`**：此文件是解密密钥，丢失后无法恢复配置。
3. **不要上传敏感文件到 GitHub**：`.env.prod` 和 `.env.prod.key` 已在 `.gitignore` 中，请确保不手动添加。
4. **定期备份数据库**：SQLite 文件是 `shuttle_score.db`，可通过 Files 页面下载备份。

---

## 十、更新部署（后续迭代）

后续代码更新时，只需执行：

```bash
cd ~/shuttle-score
git pull origin main
# 如果依赖有变化
source venv/bin/activate
pip install -r requirements.txt
# 如果数据库结构有变化
export FLASK_ENV=production
flask db upgrade
```

然后在 Web 页面点击 **"Reload"** 即可。

---

> 文档版本：v1.0 | 适用项目：shuttle-score | 目标平台：PythonAnywhere Free Beginner Account
