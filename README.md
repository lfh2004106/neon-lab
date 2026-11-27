# Spark 的日记

V0.8：深空首页、嵌入式小工坊、英语沙龙与个人博客。保留原有 GitHub 仓库和 Render 地址。

初学者可从 [入门开发手册](docs/入门开发手册/00-从这里开始.md) 开始：用通俗语言解释开发过程，附文件地图、结构图、开发日志、学习资料与内容模板。手册于 2026-11-24 按 `e0860ff` 代码整理，当前待验收，尚未导入 Obsidian。

## 在线地址

- 完整网站（含 AI / 留言板）：<https://neon-lab.onrender.com>
- GitHub Pages 静态镜像：<https://lfh2004106.github.io/neon-lab/>
- GitHub 仓库：<https://github.com/lfh2004106/neon-lab>

页面、AI 对话和公共留言必须使用 Render 完整站点。Render 免费实例会休眠，第一次打开可能需要等待。

## 星球贴图

首页星球使用本地地球贴图 `assets/earth-blue-marble.jpg`（NASA Blue Marble 地球影像，取自 three.js examples 的 `earth_atmos_2048.jpg`），只用于个人学习展示。原来的蓝色光晕和蓝紫边缘已移除，星球外恢复为透明星空。

## 页面

- `index.html`：可拖动的小星球，用星球、目的地按钮进入嵌入式与英语；博客从嵌入式页进入。
- `embedded.html`：嵌入式小工坊，包含 GitHub、Spark 的第一个真实项目“爱心点阵”、资料收藏和项目记录；项目源码可打开 Arduino IDE 风格的只读预览页。
- `english.html`：AI 英语沙龙、对话结束后的练习报告、资料收藏与光弧留言板。
- `blog.html`：个人博客，继续使用 `posts/` 里的 Markdown 文章和本地写作表单。

## 本地运行

需要 Node.js 22+：

```powershell
node server.mjs
```

然后打开终端显示的本地网址。也可以直接双击 HTML 查看项目源码、笔记和资料收藏；AI 对话、公共留言和本地发布文章仍需要 HTTP 服务。

直接打开 HTML 时，页面读取随站点提供的 `site-content.js`；通过网址访问时读取原始 `.ino`、Markdown 和 JSON 文件。修改这些公开内容后，运行 `node scripts/build-posts.mjs`，同步更新文章索引和本地阅读内容包。不要手动编辑生成的 `site-content.js`。

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

AI 对话里出现回复后，聊天输入框旁会出现「生成练习报告」。报告由服务端 `/api/report` 请求同一个模型生成，内容只保留在本次页面中，可以复制；生成报告也会占用一次每小时请求额度。

## 匿名留言

留言板使用 Supabase Postgres，后端 `guestbook-api.mjs` 持有服务端密钥。留言会以一条发光弧线从页面上飘过，鼠标停在留言上可以暂停阅读。

启用步骤：

1. 在 Supabase SQL Editor 执行 `supabase/guestbook.sql`；
2. 在 Render 环境变量填写 `SUPABASE_URL`、`SUPABASE_SECRET_KEY`；
3. 设置 `SITE_URL=https://neon-lab.onrender.com`（不要末尾斜杠）。

未配置时页面会明确显示「留言板尚未开放」，不会伪造成功。昵称 1–24 字，正文 1–600 字；同一客户端一分钟一次，全站一天最多 500 条。详情见 `notes/11-Spark的日记精简版.md`。

## 资料收藏

编辑 `data/resources.json` 的 `embedded` 和 `english` 数组，每项包含 `title`、`description`、`url`、`tag`，再运行 `node scripts/build-posts.mjs`。提交后所有访客看到同一份收藏。英语收藏目前为空。

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

## 首个真实项目：爱心点阵

2026-11-25 导入用户提供的爱心点阵项目，存于 `projects/heart-matrix/`。入口为 `projects/heart-matrix/index.html`，源码为 `heart_matrix/heart_matrix.ino`，原始源码逐字节保留。三个旧教学项目及两篇示例日志已从网站删除；现有三篇文章都围绕此真实项目。

导入记录见 `notes/13-爱心点阵真实项目导入.md`。早期笔记与开发手册仍作为历史版本保留，其“三个示例项目”描述不代表当前项目清单。

三篇网页文章分别精简自 `E:\deepseekproject\real\notes` 中的学习笔记、排错笔记、项目记录。`projects/heart-matrix/notes/` 保留完整原文副本，技术勘误放在网页整理版中。源码及原笔记没有改动。后续修复记录见 `notes/14-源码与原始笔记本地阅读.md`；部署时也要提交生成的 `site-content.js`。

2026-11-26：资料收藏只展示 Arduino 官网与官方文档；实验日志和博客列表只展示主项目。学习笔记、排错笔记通过 frontmatter 的 `parent: 2026-11-25-heart-matrix` 归入项目内部，不重复出现在列表中，原有直达链接仍然有效。
