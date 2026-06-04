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
- `ShuttleNav.renderMatchCard()` 方法，统一比赛卡片渲染逻辑
- `form-input` 增加 `-webkit-appearance: none`、`appearance: none`、`min-height: 44px`、`box-sizing: border-box`，提升移动端输入体验

### Changed

- 运行时配置访问从 `from config import` 改为 `current_app.config[]` 模式
- `extensions.py` 新增 Migrate 实例
- `config.py` 重构为多环境配置类（Development / Production）
- `app.py` 重构为应用工厂模式，支持环境切换和加密配置加载
- 虚拟环境目录名从 `.venv` 改为 `.shuttle`
- `.gitignore` 调整：`.env.prod` 允许提交到 Git，`.env.prod.key` 不允许；新增 `*_original.*` 排除规则
- README.md 完善：新增数据模型说明、生产环境配置表格、设计说明
- 首页比赛卡片改用 `renderMatchCard` 统一渲染（替代内联 HTML）
- `Match.to_public_dict()` 新增 `players` 字段，公开接口返回选手数据
- 移动端底部 Tab 样式优化：字号 11px→13px，未选中色加深（#999→#666），选中态加粗
- 移动端底部 Tab 触摸区域增大（padding 4px→8px）
- 移动端查询页筛选区改为响应式 grid（PC 两列，H5 单列）
- 移动端统计页筛选栏 H5 下纵向堆叠，输入框全宽
- 移动端 `.form-group` 和 `.form-input` 添加 `min-width: 0`，修复日期输入框超出屏幕宽度
- 首页 logo.png 压缩：960×957px / 1.2MB → 160×160px / 52KB

### Fixed

- 修复录入比赛时选手列表找不到自己的问题（注册时未自动创建 Player 记录）
- 修复生产环境 `DATABASE_URI` 路径错误（本地路径被加密存储到 `.env.prod`，服务器上路径不存在）
- 修复 `load_encrypted_config` 中 `USER_TOKEN_EXPIRE_DAYS` 和 `ADMIN_TOKEN_EXPIRE_DAYS` 类型错误（字符串未转整数）
- 修复 WSGI 配置中 `activate_this.py` 在 Python 3.9+ 不存在的问题
- 修复 WSGI 配置缺少 `application` 变量导致 PythonAnywhere 报错
- 修复注册创建 Player 时 `user.id` 为 None 的问题（需先 `db.session.flush()`）
- 修复未登录状态下登录按钮下边框缺失（`.nav-btn-outline` 的 `border-bottom: none !important` 移除）
- 修复首页比赛卡片未展示选手信息（`to_public_dict` 缺少 `players` 字段）

### Removed

- 移除 `init_db.py`（由 `flask db upgrade` + `flask create-superadmin` 替代）
- 移除 `logo.svg`（由 `logo.png` 替代）
- 移除 `.env.prod` 中的 `DATABASE_URI` 配置项（生产环境自动使用项目目录路径）
