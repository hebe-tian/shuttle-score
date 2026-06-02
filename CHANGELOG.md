# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- Player 模型新增 `user_id` 字段（nullable, ForeignKey→users.id），用于选手与注册用户的绑定
- 注册时自动创建同名同性别的 Player 记录（`created_by` 和 `user_id` 均为用户自身 ID）
- 多环境配置系统（`DevelopmentConfig` / `ProductionConfig`），通过 `FLASK_ENV` 切换
- Flask CLI 命令：`flask deploy`（交互式部署初始化）
- Flask CLI 命令：`flask create-superadmin`（创建/更新超级管理员）
- Flask CLI 命令：`flask encrypt-env`（加密生产环境配置）
- Fernet 对称加密工具（`crypto_utils.py`），生产环境配置加密存储
- Flask-Migrate 集成，支持数据库表结构变更时数据不丢失
- 部署文档 `DEPLOY.md`（PythonAnywhere 免费账号部署指南）
- 本地开发文档 `LOCAL.md`
- 网站 Logo（`static/images/logo.png`）

### Changed

- 运行时配置访问从 `from config import` 改为 `current_app.config[]` 模式
- `extensions.py` 新增 Migrate 实例
- `config.py` 重构为多环境配置类（Development / Production）
- `app.py` 重构为应用工厂模式，支持环境切换和加密配置加载
- 虚拟环境目录名从 `.venv` 改为 `.shuttle`
- `.gitignore` 调整：`.env.prod` 允许提交到 Git，`.env.prod.key` 不允许
- README.md 完善：新增数据模型说明、生产环境配置表格、设计说明

### Fixed

- 修复录入比赛时选手列表找不到自己的问题（注册时未自动创建 Player 记录）
- 修复生产环境 `DATABASE_URI` 路径错误（本地路径被加密存储到 `.env.prod`，服务器上路径不存在）
- 修复 `load_encrypted_config` 中 `USER_TOKEN_EXPIRE_DAYS` 和 `ADMIN_TOKEN_EXPIRE_DAYS` 类型错误（字符串未转整数）
- 修复 WSGI 配置中 `activate_this.py` 在 Python 3.9+ 不存在的问题
- 修复 WSGI 配置缺少 `application` 变量导致 PythonAnywhere 报错
- 修复注册创建 Player 时 `user.id` 为 None 的问题（需先 `db.session.flush()`）

### Removed

- 移除 `init_db.py`（由 `flask db upgrade` + `flask create-superadmin` 替代）
- 移除 `logo.svg`（由 `logo.png` 替代）
- 移除 `.env.prod` 中的 `DATABASE_URI` 配置项（生产环境自动使用项目目录路径）
