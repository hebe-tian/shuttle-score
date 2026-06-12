# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### Added

- 无限制比赛(单打场) `fs` 和无限制比赛(双打场) `fd` 两种新比赛类型，允许两队选择不同数量的选手，不限制性别
- 无限制比赛动态选手选择：每队提供"+ 添加选手"按钮，可自由增减选手
- 查询页面新增"无限制比赛"独立分类筛选（含按单打场/双打场细分）
- 统计页面新增"无限制比赛统计"分类（单打/双打统计不包含无限制比赛）
- 选手绑定方式新增"输入账号"（`bind_account` 参数），用户可通过对方账号完成绑定
- 联动选手（注册时自动创建的选手）不可编辑、不可删除的保护机制
- 联动选手在列表中显示"我的"标签
- `.tag-fs` 和 `.tag-fd` 标签样式（紫色系）
- `validators.py` 新增 `fs`/`fd` 类型定义（`VALID_MATCH_TYPES`、`MATCH_TYPE_GENDER`、`MATCH_TYPE_CATEGORY`、`MATCH_TYPE_LABELS`）
- `api/matches.py` 新增 `UNLIMITED_MATCH_TYPES` 常量
- `nav.js` MATCH_TYPES 新增 `fs`/`fd` 标签映射
- 录入比赛页面类型选择网格新增"无限制比赛(单打场)"和"无限制比赛(双打场)"选项

- 选手逻辑删除功能（Player 模型新增 `deleted` 字段，默认值 0）
- 选手邀请注册功能（Player 模型新增 `invite_expires_at` 字段，使用 player_id 作为邀请码，24小时有效）
- 比赛逻辑删除预留（Match 模型新增 `deleted` 字段，默认值 0）
- 选手编辑 API：`POST /api/players/update`（修改名称、绑定用户ID）
- 选手删除 API：`POST /api/players/delete`（逻辑删除，关联成绩保留）
- 选手解绑 API：`POST /api/players/unbind`
- 选手邀请 API：`POST /api/players/invite`（生成邀请链接，24小时有效）
- 绑定用户信息查询 API：`GET /api/players/bind-user?id=<player_id>`
- 注册流程支持邀请码参数（`invite` 参数，注册后自动绑定选手）
- 前端选手卡片增加操作按钮（绑定、编辑、删除）
- 前端绑定弹窗（邀请注册 + 输入用户ID两种方式）
- 前端编辑选手弹窗（修改名称、绑定用户ID）
- 前端删除确认弹窗（提示无法撤销、成绩不删除）
- 前端绑定用户信息弹窗（显示用户名和账号，支持解绑）
- 已绑定选手名称下划线样式，点击查看绑定用户信息
- 邀请链接复制功能
- 所有查询接口增加 `deleted=0` 过滤（选手列表、比赛查询、统计、随机比赛、管理员查询）
- 部署文档 `local-0603.md` 和 `deploy-0603.md`

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

- 编辑比赛弹窗不再展示比赛时间，比赛类型改为只读标签（不可切换）
- 修改用户名时联动选手名称自动同步更新
- 选手绑定弹窗"输入用户ID"改为"输入账号"，编辑选手弹窗"绑定用户ID"改为"绑定账号"
- 无限制比赛创建/更新使用 `players` 格式（`[{player_id, team}]`），常规比赛保持 `player_ids` 格式
- 更新比赛 API 忽略 `type` 字段，比赛类型不可更改
- 统计 API（`win_rate_stats`/`score_stats`）默认排除 `fs`/`fd` 类型比赛，新增 `unlimited` 分类查询支持
- 比赛查询 API 新增 `unlimited` 分类筛选（`Match.type.in_(['fs', 'fd'])`）

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

- 修复无限制比赛标签在 step-summary 中看不清（缺少 `.tag-fs`/`.tag-fd` 背景色定义）
- 修复无限制比赛添加选手后清空已选选手（`updateUnlimitedPlayerOptions` 优先从数据模型读取值）
- 修复无限制比赛点击添加选手没有反应（`collectUnlimitedPlayerIds` 先清空数组导致 null 占位被丢弃）

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
