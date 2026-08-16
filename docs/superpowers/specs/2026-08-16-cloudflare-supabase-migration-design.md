# 词间妙记 Cloudflare 与 Supabase 迁移设计

## 目标

以 `001100-1209/cijianmiaoji` 的公开源码为基准，在不重新设计界面的前提下完整迁移网站。迁移后的版本可在本地运行，并部署到用户自己的 Cloudflare Pages；账号、云同步和共享妙计连接到用户自己的 Supabase 项目。

## 保留范围

- 首页学习进度看板、快捷入口、专注计时器和学习计划。
- 词集库、沉浸学习、记忆卡片、遮罩记忆、记忆测试、收藏夹和妙计手账。
- 2934 词词库、预置妙计、主题、语音朗读、搜索、筛选和键盘操作。
- 浏览器 `localStorage` 学习进度、JSON 导入导出和重置功能。
- PWA 安装、Service Worker 缓存和离线使用。
- Supabase 注册、登录、自动同步、手动同步、冲突合并和共享妙计功能。

## 架构

网站保持无构建工具的静态结构：`index.html` 负责页面骨架，`css/style.css` 负责视觉样式，`js/words.js` 与 `js/book-notes.js` 提供静态学习数据，`js/app.js` 负责交互与本地状态，`js/supabase-config.js` 指向用户自己的 Supabase。

Cloudflare Pages 只托管静态文件。用户学习状态首先写入浏览器本地存储；登录后，现有同步逻辑将状态写入 Supabase。离线时本地学习继续可用，恢复网络后再同步。

## Supabase

在用户账户下新建 Supabase 项目，启用 Email 登录，并创建 `user_data` 表：

- `id text primary key`
- `data jsonb not null`
- `updated_at timestamptz not null default now()`

为表启用 Row Level Security。认证用户只能读取和写入 `id = auth.uid()::text` 的记录。站点只嵌入可公开的 Project URL 与 Publishable/Anon Key；管理员密钥和账户凭据不得写入源码。

## Cloudflare

使用 Cloudflare Pages 发布仓库中的静态站点，不设置构建命令，发布目录为仓库根目录。部署后使用 Pages 提供的 HTTPS 地址；自定义域名不在本次必需范围内，用户提出时再配置。

## 错误与恢复

- Supabase 未配置或不可用时，网站仍可使用本地学习功能，并显示现有同步错误提示。
- 未登录时不发起用户数据同步。
- 同步冲突沿用项目现有的键级合并与较新修改优先规则。
- 用户可随时导出 JSON 备份，并在新域名导入以迁移旧进度。
- Service Worker 缓存版本随发布更新，避免旧资源长期残留。

## 验证

本地与生产环境分别检查：

1. 所有导航页面能打开，主要按钮和键盘操作正常。
2. 学习状态、收藏、妙计和测试结果刷新后仍存在。
3. 记忆卡片断点、错词重练、计划和计时器正常。
4. JSON 导出后可重新导入并恢复数据。
5. 注册、登录、同步和跨浏览器恢复通过用户自己的 Supabase 工作。
6. 未登录及断网时本地功能不受影响。
7. PWA 清单、图标和 Service Worker 可加载，缓存资源无 404。
8. Cloudflare Pages 生产地址可访问，并与本地版本功能一致。

## 交付物

- `F:\codex\20260816\cijianmiaoji` 下的完整可运行源码。
- 用户自己的 Supabase 项目及已执行的数据库策略。
- Cloudflare Pages 生产部署地址。
- 本地启动、备份迁移和后续更新说明。
