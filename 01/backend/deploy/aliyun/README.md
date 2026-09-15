# 阿里云部署准备

本目录只保存可公开的部署模板，不保存真实域名、密码、AccessKey 或 AppSecret。

## 约定

- ECS 上运行 Express/MySQL，Node 服务只监听服务器本机端口 `3001`。
- Nginx 对外提供 HTTPS，并反向代理至 `127.0.0.1:3001`。
- 社区图片由服务端上传到私有 OSS Bucket，小程序不接触 OSS AccessKey。
- 数据库使用独立应用账号，不使用 root 账号运行 API。
- 正式环境变量放在 `/etc/liunianun/api.env`，权限建议设为 `600`。

## 上线前配置

1. 复制 `.env.example` 的字段到 `/etc/liunianun/api.env` 并填写真实值。
2. 创建专用 RAM 身份，只授予目标 Bucket 指定前缀所需的最小权限。
3. 优先为 ECS 绑定 RAM Role 并使用临时凭据；当前代码的长期 AccessKey 环境变量仅作为初期兼容方式。
4. 把 `nginx.conf.example` 中的域名和证书路径替换为真实值。
5. 把 `liunianun-api.service.example` 安装为 systemd service。
6. 运行 `npm run init-db`，再按需运行 `npm run import-excel`。
7. 将 HTTPS API 域名加入微信公众平台的 request 和 uploadFile 合法域名。
8. 将小程序 `config/env.js` 中的 `REMOTE_API_BASE` 改成正式 HTTPS API 地址。

## 凭据规则

- 不使用阿里云主账号 AccessKey。
- 不把 OSS AccessKey 或微信 AppSecret 放入小程序、Git、日志或截图。
- RAM 权限限定 Bucket、对象前缀和必要操作，定期轮换长期凭据。
- 如果发现凭据泄露，立即禁用并轮换，而不是只删除 Git 中的文本。
