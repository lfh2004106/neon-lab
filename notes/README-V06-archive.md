# NEON / LAB

面向 Arduino 与嵌入式学习者的个人网站 V0.6：项目学习、8 周路线、英语练习、AI 英语伙伴，以及可以持续更新的实验日志。

## 预览

直接用浏览器打开 `index.html` 可以看静态页面；但 AI 对话、博客文章读取和本地发布需要 HTTP 服务：

```powershell
node server.mjs
```

然后打开终端显示的本地网址。无需安装依赖。安装了 npm 的环境也可使用 `npm run dev`。

文件模式与 HTTP 模式的浏览器草稿存储可能不同；建议长期使用固定的本地地址。草稿只保存在当前浏览器，不会跨设备同步。

## 当前功能

- 首页 `index.html`：女性创客与霓虹夜景，提供嵌入式学习、英语聊天室两个频道入口。
- 嵌入式页 `embedded.html`：
  - 工业工作室场景与四阶段学习路线；
  - Uno R3 的 8 周学习计划、知识关系图与每日节奏；
  - 三个可执行项目：Heartbeat、ButtonLamp、ThresholdMonitor，附代码、接线、验收、排错和 `.ino` 下载；
  - 周验收进度、学习路径、实验笔记与 Markdown 导出；
  - 可暂停、可调间隔的 LED 工作台动画（不是电路仿真器）。
- 英语页 `english.html`：
  - 暖色沙龙场景，三个话题房间（Night Café、Maker Talk、Language Exchange）；
  - 本地练习保存最近 50 条，示例角色明确标注；
  - 可选 AI 对话：按房间隔离上下文、新对话、失败保留输入；
  - 双语表达练习、话题草稿和 Markdown 导出。
- 实验日志 `blog.html`：
  - 读取 `posts/*.md` 中的 Markdown 文章，支持标签筛选、代码块、表格、引用和图片；
  - 页面内写日志：本机可一键发布到 `posts/`，线上可下载 Markdown 后提交；
  - 文章通过 `#post/<slug>` 直接分享。
- 三个页面都接入 `ambient.css` 的氛围背景：工作室照片、沙龙暖光、蓝图网格与渐变，不再只是纯色块。
- 页面之间可通过 `?project=blink` 等参数带入项目开场句，且不会覆盖已有英文草稿。

## 写实验日志

### 在本机直接发布

```powershell
node server.mjs
```

打开 `http://127.0.0.1:4177/blog.html#compose`，填写并点「发布到本地」。服务器会写入 `posts/`，自动更新 `posts/index.json`。

### 线上或手动方式

1. 在页面中点「下载 Markdown」；
2. 把文件放进 `posts/`；
3. 运行：

```powershell
npm run posts
```

4. 提交 `posts/` 中的 Markdown 和 `index.json`。

手动写日志时，文件开头使用：

```markdown
---
title: "标题"
date: 2026-11-24
tags: [Arduino, 实验日志]
summary: "一句话摘要"
---

正文……
```

## 项目边界

项目卡片仍是选题模板，不是已完成的个人作品。真实注册、登录、评论、匹配、私信和多人数据尚未实现。本地练习是预设内容；只有切到 AI 对话且后端配置好后，消息才会发给模型服务商。AI 会明确标注身份，不冒充真人。博客的发布接口仅限本机，线上只能下载后提交，不做公开写入。

## 文件

- `index.html`、`embedded.html`、`english.html`、`blog.html`：四个页面。
- `styles.css`：全局主题与布局；`atmosphere.css`：首页氛围；`worlds.css`：频道主题；`spaces.css`：工作室与沙龙；`learning.css`：8 周课程；`ambient.css`：V0.6 氛围背景与表面细节；`blog.css`：日志页。
- `app.js`：共用交互、项目弹窗、英语表达和草稿；`studio.js`：学习清单与实验记录；`learning.js`：周验收进度；`lounge.js`：房间切换、本地练习和 AI 对话；`blog.js`：日志列表、Markdown 渲染、阅读和发布表单。
- `assets/`：原创 AI 生成配图（首页、V4 工作室/沙龙、V5 工科工作室和沙龙引导形象）。
- `notes/`：Obsidian 设计笔记与 Uno R3 学习方案；`examples/`：三个 `.ino` 示例。
- `posts/`：日志 Markdown 与 `index.json`；`scripts/`：生成日志索引的工具。
- `server.mjs`：本机/生产预览服务器；`chat-api.mjs`：Chat Completions 代理；`blog-api.mjs`：仅本机可用的日志写入接口。
- `.env.example`：本地 API 配置模板；`tests/chat-api.test.mjs`：模拟接口测试。
- `render.yaml`、`DEPLOY.md`：部署到 Render、GitHub 上传和密钥配置说明。

## 本地 AI 配置

需要 Node.js 22+。复制 `.env.example` 为 `.env`，填写完整的接口地址、密钥和模型，然后重启 `node server.mjs`：

```dotenv
CHAT_API_URL=https://api.deepseek.com/chat/completions
CHAT_API_KEY=在本机填入你的密钥
CHAT_MODEL=deepseek-flash
CHAT_PROVIDER=deepseek
HOST=127.0.0.1
PORT=4177
CHAT_RATE_LIMIT=30
```

浏览器打开 `http://127.0.0.1:4177/english.html`，选择「AI 对话」。密钥只在服务端读取，`.env` 已被 Git 忽略，也不会通过静态路由返回。详细说明见 `notes/08-DeepSeek接入方案.md`。

公开部署时把密钥设为 Render 环境变量，**不要**写进任何前端文件。服务端已加入按 IP 的小时级请求限制，仍建议定期检查用量和余额。

## 验证

```powershell
node --check app.js
node --check studio.js
node --check learning.js
node --check lounge.js
node --check blog.js
node --check server.mjs
node --check chat-api.mjs
node --check blog-api.mjs
node tests/chat-api.test.mjs
```

- JavaScript 语法检查通过。
- 模拟 Chat Completions 集成测试通过。
- 四个页面、样式、脚本、配图、笔记和示例文件通过本地 HTTP 访问检查；未知地址返回 404。
- 桌面 1440px、手机 390px 下无横向溢出；博客列表、文章阅读、Markdown 表格/代码块、写日志预览正常。
- 本机发布接口已验证可写入 `posts/` 并更新索引；远程访问会被拒绝。
- 真实 DeepSeek 调用仍需要你配置自己的密钥后完成联调。

## 部署

完整步骤见 [DEPLOY.md](./DEPLOY.md)：

1. 上传到 GitHub；
2. 用 Render 部署整个 Node 服务（同域，无需处理跨域）；
3. 在 Render 环境变量中填 DeepSeek 密钥；
4. 把 Render 网址发给朋友。

GitHub Pages 只能托管静态页面，不能运行 AI 接口；如果只需要静态博客，可以用 Pages，但 AI 需要另外部署后端。
