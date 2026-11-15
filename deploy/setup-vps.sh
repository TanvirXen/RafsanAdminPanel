#!/usr/bin/env bash
# One-time VPS setup for the admin panel. Run as root on the VPS:
#
#   sudo bash setup-vps.sh <RUNNER_REGISTRATION_TOKEN> [runner_user]
#
# Get the token (valid 1 hour) from your PC:
#   gh api -X POST repos/TanvirXen/RafsanAdminPanel/actions/runners/registration-token --jq .token
#
# It is safe to re-run. It:
#   1. writes /etc/rafsan-admin/.env.production (if missing)
#   2. installs the nginx site for admin.rafsansabab.com (HTTP; HTTPS via certbot after DNS)
#   3. installs a GitHub Actions runner (label: rafsan-admin) as a systemd service
set -euo pipefail

TOKEN="${1:?usage: setup-vps.sh <RUNNER_REGISTRATION_TOKEN> [runner_user]}"
REPO_URL="https://github.com/TanvirXen/RafsanAdminPanel"
DOMAIN="admin.rafsansabab.com"
APP_PORT=3300
RUNNER_NAME="rafsan-admin-01"
RUNNER_LABELS="rafsan-admin"
RUNNER_VERSION="2.321.0"

[ "$(id -u)" -eq 0 ] || { echo "Run as root (sudo)."; exit 1; }

# Reuse the user that runs the existing frontend/backend runners if we can find one.
RUNNER_USER="${2:-}"
if [ -z "$RUNNER_USER" ]; then
  existing=$(ls -d /home/*/actions-runner*/.runner /home/*/*runner*/.runner 2>/dev/null | head -1 || true)
  RUNNER_USER=$( [ -n "$existing" ] && stat -c %U "$existing" || echo github-runner )
fi
echo ">> Runner user: $RUNNER_USER"

if ss -ltn "( sport = :$APP_PORT )" | grep -q LISTEN; then
  echo "!! Port $APP_PORT is already in use. Pick another port (workflow APP_PORT + nginx conf)."; exit 1
fi

# ---------- prerequisites ----------
need=()
for c in node rsync curl nginx; do command -v "$c" >/dev/null || need+=("$c"); done
if [ ${#need[@]} -gt 0 ]; then
  echo ">> Installing: ${need[*]}"
  apt-get update -y
  for c in "${need[@]}"; do
    [ "$c" = node ] && { echo "!! Node.js missing; install Node 20+ first."; exit 1; }
    apt-get install -y "$c"
  done
fi
command -v pm2 >/dev/null || npm i -g pm2
command -v certbot >/dev/null || apt-get install -y certbot python3-certbot-nginx

# ---------- runner user ----------
if ! id "$RUNNER_USER" >/dev/null 2>&1; then
  useradd -m -s /bin/bash "$RUNNER_USER"
fi
# Workflow needs sudo for rsync into /app and root pm2.
if ! sudo -l -U "$RUNNER_USER" 2>/dev/null | grep -q NOPASSWD; then
  echo "$RUNNER_USER ALL=(ALL) NOPASSWD:ALL" > "/etc/sudoers.d/90-$RUNNER_USER"
  chmod 440 "/etc/sudoers.d/90-$RUNNER_USER"
fi

# ---------- env ----------
mkdir -p /etc/rafsan-admin /app/rafsan-admin
if [ ! -f /etc/rafsan-admin/.env.production ]; then
  cat > /etc/rafsan-admin/.env.production <<EOF
NEXT_PUBLIC_API_BASE=https://api.rafsansabab.com/api
EOF
fi
chmod 600 /etc/rafsan-admin/.env.production
echo ">> Env: /etc/rafsan-admin/.env.production"

# ---------- nginx ----------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
conf=/etc/nginx/sites-available/$DOMAIN
if [ ! -f "$conf" ]; then
  if [ -f "$SCRIPT_DIR/nginx-admin.conf" ]; then
    cp "$SCRIPT_DIR/nginx-admin.conf" "$conf"
  else
    curl -fsSL "https://raw.githubusercontent.com/TanvirXen/RafsanAdminPanel/main/deploy/nginx-admin.conf" -o "$conf"
  fi
  ln -sf "$conf" /etc/nginx/sites-enabled/$DOMAIN
else
  echo ">> $conf exists, leaving it alone"
fi
nginx -t && systemctl reload nginx

# ---------- GitHub runner ----------
RDIR="/home/$RUNNER_USER/actions-runner-admin"
if [ ! -f "$RDIR/.runner" ]; then
  mkdir -p "$RDIR" && cd "$RDIR"
  curl -fsSL -o runner.tgz \
    "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz"
  tar xzf runner.tgz && rm runner.tgz
  chown -R "$RUNNER_USER:$RUNNER_USER" "$RDIR"
  sudo -u "$RUNNER_USER" ./config.sh --unattended \
    --url "$REPO_URL" --token "$TOKEN" \
    --name "$RUNNER_NAME" --labels "$RUNNER_LABELS" --work _work --replace
  ./svc.sh install "$RUNNER_USER"
fi
cd "$RDIR" && ./svc.sh start || true
./svc.sh status | head -5 || true

cat <<EOF

========================================================================
Done. Next:
  1. Trigger first deploy: push to main, or
       gh workflow run deploy.yml -R TanvirXen/RafsanAdminPanel
  2. Check locally on VPS:  curl -I http://127.0.0.1:$APP_PORT/login
  3. After DNS A record  $DOMAIN -> this VPS IP  has propagated:
       certbot --nginx -d $DOMAIN --redirect -m <your-email> --agree-tos -n
========================================================================
EOF
