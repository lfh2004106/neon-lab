# DeepSeek 英语沙龙接入方案

核对时间：2026-11-23。用户选择 DeepSeek；当前尚未配置真实密钥。

## 第一阶段：本机文字对话

保留现有结构：网页 → 本机 Node `/api/chat` → DeepSeek → 网页。优先完成文字交流，不把人物配图或真人身份发送给模型；角色是视觉引导，AI 仍明确标注身份。

复制项目根目录 `.env.example` 为 `.env`，在本机填写：

```dotenv
CHAT_API_URL=https://api.deepseek.com/chat/completions
CHAT_API_KEY=在本机填入你的密钥
CHAT_MODEL=deepseek-flash
CHAT_PROVIDER=deepseek
PORT=4177
```

Node.js 22+ 下运行 `node server.mjs`，浏览器访问 `http://127.0.0.1:4177/english.html`，选择“AI 对话”。修改配置后需要重启。不要把 `.env` 提交到 GitHub，密钥不写入 HTML 或浏览器存储。

官方目前列出 `deepseek-flash` 与 `deepseek-v4-pro`。本项目先选 Flash；采用 `thinking: { type: "disabled" }`，让任务专注于简短的英语交流。接口地址与模型名依据[首次调用文档](https://api-docs.deepseek.com/)；开关依据[思考模式文档](https://api-docs.deepseek.com/guides/thinking_mode/)。费用随实际输入输出 token 计费，以[官方价格页](https://api-docs.deepseek.com/quick_start/pricing/)为准。

## 对话体验

- 一次通常回复 2–5 句，接一个自然的问题。
- 用户需要时用中文解释，默认顺着用户英语水平交流。
- 每次最多轻微纠正一处表达，避免变成批改试卷。
- 三个房间的历史互相隔离；发送最近有限上下文，刷新清空 AI 历史。
- 等待回复时禁用重复发送；失败保留输入；提供“新对话”。

当前采用非流式文本回复。下一阶段可加逐字输出、词汇收藏和对话导出；再考虑语音，避免第一版过重。

## 部署路线

本机阶段：Node 同源托管网页与 API，密钥仅在服务端。

GitHub 阶段：源码与公开笔记进仓库，`.env` 留在本机。GitHub Pages 只能托管静态页面，不能直接运行当前 Node 后端。

公网阶段：把前后端部署到支持 Node 的托管服务，增加登录、用户配额、请求频率限制、费用上限监控、HTTPS 和明确的对话数据说明，再开放给他人。当前接口仅监听本机，不当作多人生产服务直接公开。

## 验收

1. 未配置密钥时给出明确提示。
2. 正确配置后发送英文问题，收到真实模型回复。
3. 下一条提及上一条内容，检查上下文是否延续。
4. 切换房间不混入其他房间历史。
5. 密钥错误、网络失败时保留原输入。

本地模拟服务测试能验证请求格式、错误处理和 DeepSeek 参数，但不能代替真实密钥联调。目前真实调用尚未执行。

## 2026-11-23 补充：公开部署

- 推荐把整个 Node 服务部署到 Render，与静态页面同域，密钥只放环境变量；
- 服务端已加入按 IP 的每小时请求上限（`CHAT_RATE_LIMIT`，默认 30）和来源检查；
- GitHub 上传、Render 配置、日志发布流程见项目根目录的 `DEPLOY.md`；
- 不要把 `.env`、密钥或带密钥的截图提交到 GitHub。
