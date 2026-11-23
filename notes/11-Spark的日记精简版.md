# Spark 的日记 · V0.7

## 这次做减法

- 名称改为 Spark 的日记。保留现有 GitHub 仓库和 Render 地址，避免改变部署标识。
- 首页是可点的玩具星球，展开嵌入式、英语沙龙、项目博客入口。
- 嵌入式页只展示 GitHub、博客入口和资料书签，移除课程进度、实验台及长篇项目表单。
- 英语页保留对话窗口与人物头像，增加资料收藏和匿名昵称留言板，去掉冗长话题草稿区域。
- 日志改称个人博客，继续使用现有 Markdown 文章系统记录未来项目。
- 原有课程、代码、笔记和用户文章没有删除。

## 资料怎么添加

编辑 `data/resources.json`：`embedded` 是嵌入式资料，`english` 是英语收藏。每项有 `title`、`description`、`url`、`tag`。提交 GitHub 后随网站发布，所有访客看到同一份收藏。

英语列表暂为空，因为尚未收到用户实际收藏的链接；不将生成的推荐冒充用户收藏。

## 匿名留言上线

匿名留言采用 Supabase Postgres 持久化，避免 Render 临时文件重启丢失。当前缺少该数据库连接，页面会显示“留言板尚未开放”，不会伪装成功。

1. 创建或选择 Supabase 项目，在 SQL Editor 执行 `supabase/guestbook.sql`。
2. 在 Render 环境变量中填写 `SUPABASE_URL`、`SUPABASE_SECRET_KEY`（服务器 Secret key 或 legacy service_role key）。不要填公开 publishable / anon key。
3. `SITE_URL` 设置为实际完整网站源，例如 `https://neon-lab.onrender.com`，不带末尾斜杠。已有 `ALLOWED_ORIGINS` 也会被读取。
4. 发布新版后用两个浏览器分别留言和刷新，确认共享与持久化。

只公开昵称、正文和时间。后端只接受 24 字内昵称、600 字内正文；防刷在数据库事务中执行：同一客户端一分钟一次，全站一天最多 500 条。前端使用 textContent 展示留言，昵称不代表经过认证的真实身份。

管理：在 Supabase Table Editor 把不合适留言的 `is_public` 设为 false 即隐藏。不需要在网页公开管理密钥。客户端地址用服务器密钥散列后作为限流标识保存，数据库不存原始 IP；建议定期清理过期留言。基本限流不能替代大规模攻击防护，访问量上升时再接验证码。

SQL 默认对 anon/authenticated 禁止直接读写；只有后端 secret 对应的 service_role 可访问。接口不向浏览器返回密钥。

参考：[Supabase REST API](https://supabase.com/docs/guides/api)、[服务器密钥](https://supabase.com/docs/guides/api/api-keys)。

## 状态

本地页面与接口已实现。数据库尚未连接；本次未推送 GitHub、未触发 Render 部署。旧的 DeepSeek 接口配置没有更改。
