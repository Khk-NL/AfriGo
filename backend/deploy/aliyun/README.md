# 阿里云部署准备

本目录只保存可公开的部署模板，不保存真实域名、密码、AccessKey 或 AppSecret。

## 约定

- ECS 上运行 Express/MySQL，Node 服务只监听服务器本机端口 `3001`，该端口不对公网开放。
- 反向代理对外提供 HTTPS，并转发至 `127.0.0.1:3001`；本目录同时提供 Nginx 与 Caddy 两套模板，按机器上实际在用的那套选一个。
- 生产域名约定为 `afrigo-api.allezafrique.cn`（与小程序 `REMOTE_API_BASE`、`PUBLIC_BASE_URL`、微信合法域名三处保持一致）。
- 社区图片由服务端上传到私有 OSS Bucket，小程序不接触 OSS AccessKey。
- 数据库使用独立应用账号，不使用 root 账号运行 API。
- 正式环境变量放在 `/etc/afrigo/api.env`，权限建议设为 `600`。

## 上线前配置

1. 复制 `.env.example` 的字段到 `/etc/afrigo/api.env` 并填写真实值。
2. 为 ECS 绑定实例 RAM Role，只授予目标 Bucket 的 `community/*` 前缀所需权限：把 `ram-oss-policy.json` 里的 `<your-bucket>` 换成真实 Bucket 名后作为该角色的自定义权限策略；对象只读写 `community/` 前缀，不使用长期 AccessKey。
3. 正式环境设置 `OSS_CREDENTIAL_MODE=ecs_ram_role`、`ALIBABA_CLOUD_ECS_METADATA=<角色名>` 和 `ALIBABA_CLOUD_IMDSV1_DISABLE=true`；不要配置长期 AccessKey。SDK 会从实例元数据获取并自动刷新 STS 凭据。
   **轻量应用服务器（SAS）不支持实例 RAM 角色**（`CreateInstances` 没有 `RamRoleName` 参数，也取不到实例元数据），必须改用 `OSS_CREDENTIAL_MODE=environment` + 一对只授 `community/*` 的 RAM 用户 AccessKey。缺 AccessKey 不再阻断启动：启动日志告警，媒体自动落到本地磁盘。
   **媒体存储**由 `STORAGE_PROVIDER` 选择：`oss`（私有 Bucket + 签名 URL）或 `local`（服务器本地磁盘，经 `/media` 前缀对外提供）。留空时自动判断——OSS 凭据齐全走 `oss`，否则退回 `local`，因此没有云凭据也能先用图片与头像功能。本地模式的文件在 `<代码目录>/backend/var/uploads/`，备份时记得一并备份。
   如需开启旅中翻译，先开通阿里云机器翻译，再把 `ram-translate-policy.json` 中的最小权限追加给同一 ECS RAM Role，最后设置 `ALIYUN_TRANSLATE_ENABLED=true`。
   如需开启海外路线预估，用 `NAVIGATION_PROVIDER` 选择地图服务：`amap-overseas`（需企业开发者认证并工单开通海外 LBS 权限，配合 `AMAP_NAVIGATION_ENABLED=true` 与 `AMAP_WEB_SERVICE_KEY`）、`mapbox`（配合 `MAPBOX_ACCESS_TOKEN`，自助开通）、`google-directions`（配合 `GOOGLE_MAPS_API_KEY`）或 `disabled`。Key 只保存在 ECS 环境文件中；切换 Provider 不需要改动小程序。
4. 配置反向代理：机器上用 Nginx 就改 `nginx.conf.example`（域名与证书路径），用 Caddy 就把 `Caddyfile.example` 的站点块追加到 `/etc/caddy/Caddyfile`。Caddy 会自动申请证书；`reverse_proxy` 指向 `127.0.0.1:3001`。若这台机器上已有其它站点，务必只**追加**新站点块，不要改动已有站点——`api.<域名>` 这类看起来"没用过"的 hostname 可能正被其它应用占用。
5. 把 `afrigo-api.service.example` 安装为 systemd service。
6. 运行 `npm ci`、`npm run init-db`，再按需运行 `npm run import-excel`；导入完成后执行 `npm prune --omit=dev`，生产进程不加载仅用于可信工作簿导入的 `xlsx`。升级版本后也要重新执行 `npm run init-db`，用于创建新增表；初始化脚本使用 `CREATE TABLE IF NOT EXISTS`，不会删除已有数据。
7. 将 `https://afrigo-api.allezafrique.cn` 加入微信公众平台的 request 和 uploadFile 合法域名。
8. 将小程序 `config/env.js` 中的 `REMOTE_API_BASE` 改成 `https://afrigo-api.allezafrique.cn`（develop 环境不受影响，仍走本机 `127.0.0.1:3001`）。
9. 启动后先访问 `https://你的域名/api/health`（也可用无前缀的 `/health`），确认返回 `{"ok":true,"service":"afrigo-api",...}` 且 `db` 为 `ok`；如果返回 `Cannot GET /api/health`，说明 3001 端口上运行的进程不是这份代码（多半是旧进程未重启或监听端口被别的服务占用），先看 `systemctl status` 与 `ss -ltnp | grep 3001`，再配置体验版。

## 数据库账号与备份

- `init-db` 首次执行时可临时提供 `DB_ROOT_PASSWORD`，它按 `DB_APP_HOST`（同机部署建议 `127.0.0.1`）创建运行账号，仅授予目标数据库的 `SELECT/INSERT/UPDATE/DELETE` 权限。初始化完成后从 `/etc/afrigo/api.env` 删除 root 密码。
- 建议使用阿里云 RDS 自动备份；自建 MySQL 至少每日执行一次 `mysqldump --single-transaction --routines --triggers`，备份文件加密后保存到独立 Bucket，并定期在临时数据库执行恢复演练。
- 备份账号只授予备份所需的只读与锁表权限，不复用 API 运行账号或 root。

## 凭据规则

- 不使用阿里云主账号 AccessKey。
- 不把 OSS AccessKey 或微信 AppSecret 放入小程序、Git、日志或截图。
- RAM 权限限定 Bucket、对象前缀和必要操作，定期轮换长期凭据。
- 如果发现凭据泄露，立即禁用并轮换，而不是只删除 Git 中的文本。
- systemd 环境文件使用 `root:root`、权限 `600`；应用进程用户不得修改该文件。
