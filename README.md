# 非常行：非洲旅游微信小程序

面向赴非旅行与工作的微信小程序，提供签证、安全、健康、风俗、劳务、常用语、景点推荐和社区内容。

## 项目结构

- `01/`：微信小程序源码。
- `01/backend/`：Express + MySQL API 服务。
- `整合版.xlsx`：11 个国家的初始内容数据源。
- `01/backend/deploy/aliyun/`：阿里云 ECS、Nginx、systemd 部署示例。

## 已完成

- 微信登录换取服务端会话，用户身份与角色只信任服务端数据。
- MySQL 内容、收藏、通知和帖子管理接口。
- 阿里云 OSS 私有图片上传与签名访问。
- ISO 3166-1 alpha-2 国家代码关联。
- 社区发布、持久化点赞与评论、微信分享、个人内容管理、收藏、消息。
- 11 国资料的远程优先与离线回退；景点、推荐支持搜索、筛选和详情。

## 本地运行

1. 复制 `01/backend/.env.example` 为 `.env`，填写本地 MySQL 和微信测试配置，不要提交该文件。
2. 在 `01/backend` 执行 `pnpm install`、`pnpm run init-db`、`pnpm run import-excel`、`pnpm start`。
3. 用微信开发者工具打开 `01`，开发环境默认请求 `http://127.0.0.1:3000`。

部署到阿里云前，请阅读 [`01/backend/deploy/aliyun/README.md`](01/backend/deploy/aliyun/README.md) 和 [`SECURITY_REMOTE_SERVICE_BACKLOG.md`](SECURITY_REMOTE_SERVICE_BACKLOG.md)。生产凭据必须通过服务器环境变量或 RAM 角色提供，不能写入仓库或小程序。
