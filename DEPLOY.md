# NEON / LAB 部署指南

目标：把网站放到公网，让朋友能打开；AI 对话和实验日志都能正常使用，同时不泄露 DeepSeek 密钥。

## 先理解架构

这个项目有两部分：

- **静态页面**：`index.html`、`embedded.html`、`english.html`、`blog.html` 和 CSS/JS/图片；
- **Node 后端**：`server.mjs`，负责托管页面、`/api/chat`（DeepSeek 代理）和本机写日志。

DeepSeek 的密钥只能放在后端环境变量里，**绝不能写进 HTML 或 JS**。因此不推荐只用 GitHub Pages，因为它只能托管静态文件，不能运行 `/api/chat`。

**推荐方案：GitHub 存代码 + Render 运行整个 Node 服务。** 这样页面、博客和 AI 接口在同一个域名下，没有跨域问题。

```text
朋友浏览器
   │
   ▼
Render Web Service（Node）
   ├─ 静态页面 / CSS / JS / 图片
   ├─ /api/chat  ──►  DeepSeek API
   └─ /api/posts ──► 仅本机写日志
```

---

## 第一步：准备 DeepSeek 密钥

1. 登录 [DeepSeek 开放平台](https://platform.deepseek.com/)；
2. 在「API Keys」创建密钥，复制保存；
3. 确认账户有可用余额；
4. 密钥形如 `sk-...`，只填到本机 `.env` 和 Render 的环境变量，不要发给别人。

本机测试：

```powershell
cd E:\chatGPTproject\neon-lab
Copy-Item .env.example .env
notepad .env
```

在 `.env` 里填：

```dotenv
CHAT_API_URL=https://api.deepseek.com/chat/completions
CHAT_API_KEY=sk-你的密钥
CHAT_MODEL=deepseek-flash
CHAT_PROVIDER=deepseek
HOST=127.0.0.1
PORT=4177
CHAT_RATE_LIMIT=30
```

然后：

```powershell
node server.mjs
```

打开 `http://127.0.0.1:4177/english.html`，切到「AI 对话」，发一句英文。能收到回复就说明密钥和接口都正常。

---

## 第二步：上传到 GitHub

### 方法 A：GitHub Desktop（推荐给不熟悉命令行的用户）

1. 安装 [GitHub Desktop](https://desktop.github.com/) 并登录 GitHub 账号；
2. `File → Add local repository`，选择 `E:\chatGPTproject\neon-lab`；
3. 如果提示不是 Git 仓库，选择 **create a repository**，名称填 `neon-lab`，点创建；
4. 确认左侧变更列表里**没有 `.env`**（`.gitignore` 已经忽略它）；
5. 填写提交说明，例如 `NEON LAB V0.6 — blog and deployment`，点 **Commit to main**；
6. 点右上角 **Publish repository**，选择 Public 或 Private；
7. 以后每次改完，Commit → Push origin。

### 方法 B：命令行

安装 [Git for Windows](https://git-scm.com/download/win)，然后在项目目录执行：

```powershell
git init
git add .
git commit -m "NEON LAB V0.6 — blog and deployment"
git branch -M main
git remote add origin https://github.com/你的用户名/neon-lab.git
git push -u origin main
```

先在 GitHub 网页上创建一个空仓库 `neon-lab`，不要勾选自动生成 README，否则推送时可能冲突。

检查：

```powershell
git status
```

如果看到 `.env` 出现在待提交列表里，立刻停止，把 `.env` 从版本控制移除：

```powershell
git rm --cached .env
```

---

## 第三步：部署到 Render

1. 注册 [Render](https://render.com/) 并连接 GitHub；
2. 点 **New + → Web Service**，选择 `neon-lab` 仓库；
3. 配置：
   - Name：`neon-lab`（可自定义）
   - Language：`Node`
   - Build Command：留空，或 `npm install`
   - Start Command：`node server.mjs`
   - Plan：选择可用方案（Free 可能会休眠）
4. 添加环境变量：

| Key | Value |
| --- | --- |
| `HOST` | `0.0.0.0` |
| `CHAT_API_URL` | `https://api.deepseek.com/chat/completions` |
| `CHAT_API_KEY` | 你的 DeepSeek 密钥 |
| `CHAT_MODEL` | `deepseek-flash` |
| `CHAT_PROVIDER` | `deepseek` |
| `CHAT_RATE_LIMIT` | `30`（可选） |

5. 点 **Create Web Service**，等待部署完成；
6. 打开 Render 给出的 `https://xxxx.onrender.com`，依次检查：
   - 首页、嵌入式页、英语页、实验日志能否打开；
   - 英语页 AI 对话能否回复；
   - 手机能否正常浏览。
7. 把网址发给朋友即可。

也可以使用仓库里的 `render.yaml`：Render 里选择 **New + → Blueprint**，连接仓库，按提示填入 `CHAT_API_KEY`。`render.yaml` 已设置 `HOST=0.0.0.0` 和 DeepSeek 的接口参数。

### 以后更新

```powershell
git add .
git commit -m "更新内容"
git push
```

Render 检测到 GitHub 新提交后会自动重新部署。

---

## 第四步：发实验日志

### 在本地写（推荐）

1. 本机运行 `node server.mjs`；
2. 打开 `http://127.0.0.1:4177/blog.html#compose`；
3. 填标题、日期、标签、摘要和正文，点「发布到本地」；
4. 文件会出现在 `posts/`，`posts/index.json` 会自动更新；
5. 在 GitHub Desktop 里 Commit → Push，线上自动更新。

### 在线上写

线上是静态文件，浏览器没有写文件权限，所以「发布到本地」按钮不会出现。你可以：

- 点「下载 Markdown」，把文件放进 `posts/`；
- 运行 `npm run posts` 重新生成索引；
- 提交并推送。

如果以后想要“在任何地方登录后直接发日志”，需要加用户登录、数据库或 GitHub OAuth，这属于更大的后端改造。

### 手动新增一篇

在 `posts/` 新建 `2026-11-24-my-test.md`：

```markdown
---
title: "我的测试记录"
date: 2026-11-24
tags: [Arduino, 实验日志]
summary: "一句话摘要"
---

## 今天的目标

……
```

然后：

```powershell
node scripts/build-posts.mjs
```

提交 `posts/` 里的 Markdown 和 `index.json`。

---

## GitHub Pages 能不能用？

可以发布静态部分，但 **AI 对话不能用**，因为 Pages 不运行 Node 服务。博客、课程和图片可以正常访问。

如果你只需要静态页面，可以在 GitHub 仓库的 `Settings → Pages` 里从 `main` 分支根目录发布。若仍需要 AI，必须另外把 `chat-api` 部署到支持 Node 的服务，并处理跨域和前端 API 地址，维护成本更高；当前版本不推荐。

---

## 安全与费用

- **密钥只放服务端**：`.env` 和 Render 环境变量；不要截图、不要发聊天、不要提交 Git。
- 公开的 AI 接口可能被滥用。服务端已有每 IP 每小时 30 次的限制，可在 `CHAT_RATE_LIMIT` 调整；如果朋友较多，可以再加邀请码或登录。
- 定期查看 DeepSeek 用量和账单，设置余额提醒。
- 如果密钥泄露，立刻在 DeepSeek 控制台删除并重新创建。
- 免费 Render 实例会休眠，第一个访问的人可能要等几十秒；这是正常现象，不代表网站坏了。

## 常见问题

**页面 404 / 图片空白**
Linux 服务器区分大小写。确认代码里的路径与文件名大小写完全一致；图片名都是小写。

**AI 提示 503**
Render 环境变量缺少 `CHAT_API_KEY`、`CHAT_API_URL` 或 `CHAT_MODEL`，或者改了环境变量没有重启/重新部署。

**AI 提示 502**
密钥错误、余额不足、模型名不对，或 DeepSeek 服务暂时不可用。先看 Render 日志里的上游状态码。

**AI 提示 403**
请求来源不被允许。同域部署一般不会出现；如果你把前端和 API 分开部署，需要设置 `PUBLIC_ORIGIN` 为前端完整地址。

**日志发布后线上看不到**
本地发布只写入本机文件，必须再 Commit + Push；确认 `posts/index.json` 也提交了。

**Render 启动失败**
确认 Start Command 是 `node server.mjs`，Node 版本为 22+，`HOST=0.0.0.0`。Render 会自动注入 `PORT`，不要把它写死成 `4177`。
