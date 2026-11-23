# Spark 的日记

V0.8：深空首页、嵌入式小工坊、英语沙龙与个人博客。保留原有 GitHub 仓库和 Render 地址。

## 在线地址

- 完整网站（含 AI / 留言板）：<https://neon-lab.onrender.com>
- GitHub Pages 静态镜像：<https://lfh2004106.github.io/neon-lab/>
- GitHub 仓库：<https://github.com/lfh2004106/neon-lab>

页面、AI 对话和公共留言必须使用 Render 完整站点。Render 免费实例会休眠，第一次打开可能需要等待。

## 星球贴图

首页星球使用本地地球贴图 `assets/earth-blue-marble.jpg`（NASA Blue Marble 地球影像，取自 three.js examples 的 `earth_atmos_2048.jpg`），只用于个人学习展示。原来的蓝色光晕和蓝紫边缘已移除，星球外恢复为透明星空。

## 页面

- `index.html`：可拖动的小星球，用星球、目的地按钮进入嵌入式、英语和博客。
- `embedded.html`：嵌入式小工坊，包含 GitHub、三个实验示例、资料收藏和实验日志。
- `english.html`：AI 英语沙龙、资料收藏与匿名留言板。
- `blog.html`：个人博客，继续使用 `posts/` 里的 Markdown 文章和本地写作表单。

## 本地运行

需要 Node.js 22+：

```powershell
node server.mjs
```

然后打开终端显示的本地网址。首页和博客可以直接以文件打开，但 AI、留言和资料加载需要 HTTP 服务。

## AI 配置

复制 `.env.example` 为 `.env`，填写：

```dotenv
CHAT_API_URL=https://api.deepseek.com/chat/completions
CHAT_API_KEY=你的密钥
CHAT_MODEL=deepseek-flash
CHAT_PROVIDER=deepseek
HOST=127.0.0.1
PORT=4177
CHAT_RATE_LIMIT=30
```

密钥只放服务端，不提交到 GitHub。公开部署时在 Render 环境变量里填写同样的配置。

## 匿名留言

留言板使用 Supabase Postgres，后端 `guestbook-api.mjs` 持有服务端密钥：

1. 在 Supabase SQL Editor 执行 `supabase/guestbook.sql`；
2. 在 Render 环境变量填写 `SUPABASE_URL`、`SUPABASE_SECRET_KEY`；
3. 设置 `SITE_URL=https://neon-lab.onrender.com`（不要末尾斜杠）。

未配置时页面会明确显示「留言板尚未开放」，不会伪造成功。昵称 1–24 字，正文 1–600 字；同一客户端一分钟一次，全站一天最多 500 条。详情见 `notes/11-Spark的日记精简版.md`。

## 资料收藏

编辑 `data/resources.json` 的 `embedded` 和 `english` 数组，每项包含 `title`、`description`、`url`、`tag`。提交后所有访客看到同一份收藏。英语收藏目前为空。

## 测试

```powershell
node --check planet.js
node --check guestbook-api.mjs
node tests/chat-api.test.mjs
node tests/guestbook.test.mjs
```

测试使用模拟服务，不调用真实 AI 或 Supabase。不要在受限环境里依赖 `node --test` 的子进程；直接运行测试文件即可。

## 部署

完整流程见 `DEPLOY.md`。新版需要把 `spark.css`、`orbit.css`、`planet.js`、`resources.js`、`guestbook.js`、`data/resources.json`、`guestbook-api.mjs`、`supabase/` 一起提交。Render 继续使用现有的 `render.yaml`、`HOST=0.0.0.0` 和 `CHAT_API_KEY`；如果启用留言，再补 Supabase 的三个变量。

设计记录与学习材料在 `notes/`，上一版说明保存在 `notes/README-V06-archive.md`。
