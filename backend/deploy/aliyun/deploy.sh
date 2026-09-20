#!/usr/bin/env bash
# AfriGo 后端一键部署（Ubuntu/Debian + systemd + Caddy + 容器化 MySQL）
#
# 用法：
#   sudo bash backend/deploy/aliyun/deploy.sh /root/AfriGo
#
# 幂等：可重复执行；不会覆盖已存在的 /etc/afrigo/api.env，也不会重复追加 Caddy 站点。
# 可用环境变量覆盖：REPO_DIR / DOMAIN / NPM_REGISTRY

set -euo pipefail

SOURCE_DIR="${1:-}"
REPO_DIR="${REPO_DIR:-/opt/afrigo}"
ENV_FILE=/etc/afrigo/api.env
APP_USER=afrigo
SERVICE_NAME=afrigo-api
DOMAIN="${DOMAIN:-afrigo-api.allezafrique.cn}"
PORT="${PORT:-3001}"
NPM_REGISTRY="${NPM_REGISTRY:-}"

log()  { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m[warn] %s\033[0m\n' "$*"; }
die()  { printf '\033[1;31m[error] %s\033[0m\n' "$*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "请用 root 运行：sudo bash $0 $SOURCE_DIR"

log "0/9 检查代码包"
[[ -n "$SOURCE_DIR" ]] || die "缺少参数：sudo bash $0 <代码包目录>"
[[ -d "$SOURCE_DIR/backend" && -d "$SOURCE_DIR/miniprogram" ]] \
  || die "$SOURCE_DIR 下没有 backend/ 与 miniprogram/，可能是旧代码包"
grep -q '"name": "afrigo-backend"' "$SOURCE_DIR/backend/package.json" \
  || warn "backend/package.json 包名不是 afrigo-backend，请确认代码版本"
echo "代码包: $SOURCE_DIR"

log "1/9 检查环境变量"
[[ -f "$ENV_FILE" ]] || die "$ENV_FILE 不存在：请先把本机 backend/.env 内容写进去"
grep -q '^NODE_ENV=production' "$ENV_FILE"   || warn "NODE_ENV 不是 production"
grep -q '^HOST=127.0.0.1' "$ENV_FILE"        || warn "HOST 不是 127.0.0.1（会对所有网卡监听）"
grep -q '^DB_APP_HOST=%' "$ENV_FILE"         || warn "DB_APP_HOST 建议为 %（容器化 MySQL 以 docker 网关 IP 连接）"
if grep -q '^OSS_CREDENTIAL_MODE=ecs_ram_role' "$ENV_FILE"; then
  oss_role="$(curl -s --max-time 3 http://100.100.100.200/latest/meta-data/ram/security-credentials/ 2>/dev/null || true)"
  if [[ -z "$oss_role" ]]; then
    warn "OSS 走 ecs_ram_role，但本机取不到实例元数据（轻量应用服务器 SAS 不支持实例 RAM 角色）"
    warn "请改为：OSS_CREDENTIAL_MODE=environment + 只授 community/* 的 RAM 用户 AccessKey"
  else
    echo "检测到实例 RAM Role: $oss_role"
  fi
fi
chmod 600 "$ENV_FILE"; chown root:root "$ENV_FILE"

log "2/9 同步代码到 $REPO_DIR"
id -u "$APP_USER" >/dev/null 2>&1 || useradd --system --home "$REPO_DIR" --shell /usr/sbin/nologin "$APP_USER"
mkdir -p "$REPO_DIR"
if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete --exclude node_modules "$SOURCE_DIR"/ "$REPO_DIR"/
else
  cp -a "$SOURCE_DIR"/. "$REPO_DIR"/
fi
chown -R "$APP_USER:$APP_USER" "$REPO_DIR"
# 本地磁盘存储模式（未配 OSS 凭据时的默认值）需要这个目录可写
install -d -o "$APP_USER" -g "$APP_USER" "$REPO_DIR/backend/var/uploads"
echo "已同步（node_modules 不参与同步）"

log "3/9 安装依赖（全量，import-excel 需要 devDependency xlsx）"
cd "$REPO_DIR/backend"
if [[ -n "$NPM_REGISTRY" ]]; then
  sudo -u "$APP_USER" -H npm ci --registry="$NPM_REGISTRY"
else
  sudo -u "$APP_USER" -H npm ci
fi

log "4/9 初始化数据库"
ss -ltn 2>/dev/null | grep -q ':3306' || warn "本机 3306 没有监听，确认 DB_HOST 是否可达"
set -a; . "$ENV_FILE"; set +a
npm run init-db
npm run import-excel
if grep -q '^DB_ROOT_PASSWORD=.\+' "$ENV_FILE"; then
  sed -i 's/^DB_ROOT_PASSWORD=.*/DB_ROOT_PASSWORD=/' "$ENV_FILE"
  echo "已清空 DB_ROOT_PASSWORD"
fi

log "5/9 裁掉 dev 依赖"
sudo -u "$APP_USER" -H npm prune --omit=dev

log "6/9 安装并启动 systemd 服务"
install -m 644 "$REPO_DIR/backend/deploy/aliyun/afrigo-api.service.example" "/etc/systemd/system/$SERVICE_NAME.service"
sed -i "s#^WorkingDirectory=.*#WorkingDirectory=$REPO_DIR/backend#" "/etc/systemd/system/$SERVICE_NAME.service"
grep -q "^EnvironmentFile=$ENV_FILE$" "/etc/systemd/system/$SERVICE_NAME.service" \
  || sed -i "s#^EnvironmentFile=.*#EnvironmentFile=$ENV_FILE#" "/etc/systemd/system/$SERVICE_NAME.service"
systemctl daemon-reload
systemctl enable --now "$SERVICE_NAME"
sleep 2
systemctl is-active --quiet "$SERVICE_NAME" || { journalctl -u "$SERVICE_NAME" -n 30 --no-pager; die "服务未启动"; }

log "7/9 本机健康检查"
curl -fsS "http://127.0.0.1:$PORT/api/health" && echo \
  || { journalctl -u "$SERVICE_NAME" -n 30 --no-pager; die "健康检查失败"; }

log "8/9 配置 Caddy"
if grep -q "$DOMAIN" /etc/caddy/Caddyfile; then
  echo "Caddyfile 已包含 $DOMAIN，跳过追加"
else
  printf '\n%s {\n  encode zstd gzip\n  reverse_proxy 127.0.0.1:%s\n  log\n}\n' "$DOMAIN" "$PORT" >> /etc/caddy/Caddyfile
  echo "已追加站点 $DOMAIN"
fi
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy

log "9/9 外部验收"
sleep 3
curl -fsS "https://$DOMAIN/api/health" && echo || warn "外部访问失败：等几秒重试，并确认安全组已放行 80/443"
curl -sI "https://$DOMAIN/api/health" | grep -i '^x-frame-options' \
  || warn "没看到 X-Frame-Options：该域名可能转发到了别的应用"

log "完成"
cat <<EOF
服务名      : $SERVICE_NAME（systemctl status $SERVICE_NAME）
代码目录    : $REPO_DIR
环境文件    : $ENV_FILE
对外地址    : https://$DOMAIN/api/health
日志        : journalctl -u $SERVICE_NAME -f

仍需手动完成：
  1) 微信公众平台 → request / uploadFile 合法域名 加入 $DOMAIN
  2) 建议在 1Panel 里把 MySQL 端口映射改为 127.0.0.1:3306:3306，并确认安全组未放行 3306
EOF
