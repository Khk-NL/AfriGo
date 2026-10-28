# AfriGo 网页版

静态网页直接读取现有 Express API。生产环境由 `Caddyfile.site` 提供 HTTPS，并将同源 `/api/*` 和 `/media/*` 反向代理到 `127.0.0.1:3001`。站点文件放在 `/opt/afrigo/web`。

登录流程：网页创建五分钟有效的挑战，服务端生成携带挑战 ID 的微信小程序码；用户在小程序 `pages/web-login/web-login` 确认后，网页凭独立的浏览器密钥领取一次性会话。会话沿用现有 `auth_sessions` 表。

**上线扫码登录需要发布包含 `pages/web-login/web-login` 的小程序新版本。** 正式版未包含该页面时，微信二维码接口会返回 `41030`。该发布步骤需要小程序管理员在微信公众平台完成审核与发布。
