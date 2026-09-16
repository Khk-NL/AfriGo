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
2. 为 ECS 绑定实例 RAM Role，只授予目标 Bucket 的 `community/*` 前缀所需权限。
3. 正式环境设置 `OSS_CREDENTIAL_MODE=ecs_ram_role`、`ALIBABA_CLOUD_ECS_METADATA=<角色名>` 和 `ALIBABA_CLOUD_IMDSV1_DISABLE=true`；不要配置长期 AccessKey。SDK 会从实例元数据获取并自动刷新 STS 凭据。
   如需开启旅中翻译，先开通阿里云机器翻译，再把 `ram-translate-policy.json` 中的最小权限追加给同一 ECS RAM Role，最后设置 `ALIYUN_TRANSLATE_ENABLED=true`。
4. 把 `nginx.conf.example` 中的域名和证书路径替换为真实值。
5. 把 `liunianun-api.service.example` 安装为 systemd service。
6. 运行 `npm ci`、`npm run init-db`，再按需运行 `npm run import-excel`；导入完成后执行 `npm prune --omit=dev`，生产进程不加载仅用于可信工作簿导入的 `xlsx`。升级版本后也要重新执行 `npm run init-db`，用于创建新增表；初始化脚本使用 `CREATE TABLE IF NOT EXISTS`，不会删除已有数据。
7. 将 HTTPS API 域名加入微信公众平台的 request 和 uploadFile 合法域名。
8. 将小程序 `config/env.js` 中的 `REMOTE_API_BASE` 改成正式 HTTPS API 地址。
9. 启动后先访问 `https://你的域名/api/health`，确认返回 `{"ok":true}`，再配置体验版。

## 数据库账号与备份

- `init-db` 首次执行时可临时提供 `DB_ROOT_PASSWORD`，它按 `DB_APP_HOST`（同机部署建议 `127.0.0.1`）创建运行账号，仅授予目标数据库的 `SELECT/INSERT/UPDATE/DELETE` 权限。初始化完成后从 `/etc/liunianun/api.env` 删除 root 密码。
- 建议使用阿里云 RDS 自动备份；自建 MySQL 至少每日执行一次 `mysqldump --single-transaction --routines --triggers`，备份文件加密后保存到独立 Bucket，并定期在临时数据库执行恢复演练。
- 备份账号只授予备份所需的只读与锁表权限，不复用 API 运行账号或 root。

## 凭据规则

- 不使用阿里云主账号 AccessKey。
- 不把 OSS AccessKey 或微信 AppSecret 放入小程序、Git、日志或截图。
- RAM 权限限定 Bucket、对象前缀和必要操作，定期轮换长期凭据。
- 如果发现凭据泄露，立即禁用并轮换，而不是只删除 Git 中的文本。
- systemd 环境文件使用 `root:root`、权限 `600`；应用进程用户不得修改该文件。
