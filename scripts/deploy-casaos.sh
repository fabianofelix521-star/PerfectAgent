#!/usr/bin/env bash
set -euo pipefail

DEPLOY_HOST="${DEPLOY_HOST:-192.168.0.185}"
DEPLOY_USER="${DEPLOY_USER:-fabiano}"
REMOTE="${DEPLOY_USER}@${DEPLOY_HOST}"
REMOTE_DIR="${DEPLOY_DIR:-/DATA/AppData/nexus-ultra-agi}"
SERVICE_NAME="${DEPLOY_SERVICE:-nexus-ultra-agi}"
PORT="${PORT:-3336}"
KEEP_RELEASES="${KEEP_RELEASES:-3}"
SSH_OPTS=(-o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new)

control_path="${TMPDIR:-/tmp}/nexus-ultra-agi-ssh-%C"
SSH_OPTS+=(
  -o ControlMaster=auto
  -o ControlPersist=10m
  -o ControlPath="$control_path"
)

cleanup_ssh_control() {
  ssh -O exit "${SSH_OPTS[@]}" "$REMOTE" >/dev/null 2>&1 || true
}

trap cleanup_ssh_control EXIT

die() {
  printf 'deploy-casaos: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "missing required command: $1"
}

for cmd in git npm rsync ssh; do
  require_cmd "$cmd"
done

[[ -n "${NEXUS_AUTH_KEY:-}" ]] || die "export NEXUS_AUTH_KEY before deploying"
[[ "$REMOTE_DIR" == /* ]] || die "DEPLOY_DIR must be absolute"
[[ "$REMOTE_DIR" =~ ^/[A-Za-z0-9._/-]+$ ]] || die "DEPLOY_DIR contains unsupported characters"

case "$REMOTE_DIR" in
  /|/DATA|/DATA/AppData|/opt|/srv|/var|/var/www|/home|/root)
    die "refusing broad deploy directory: $REMOTE_DIR"
    ;;
esac

remote_base_name="$(basename "$REMOTE_DIR" | tr '[:upper:]' '[:lower:]')"
case "$remote_base_name" in
  *openclaw*|*crowagent*)
    die "refusing to deploy into protected sibling app directory: $REMOTE_DIR"
    ;;
esac

if ! git diff --quiet || ! git diff --cached --quiet; then
  die "working tree has uncommitted changes; commit before deploying"
fi

commit="$(git rev-parse --short HEAD)"
release="$(date -u +%Y%m%d%H%M%S)-${commit}"
release_dir="$REMOTE_DIR/releases/$release"

printf 'Building Nexus Ultra AGI release %s...\n' "$release"
npm run typecheck
npm run test
npm run build

printf 'Checking SSH access to %s...\n' "$REMOTE"
ssh "${SSH_OPTS[@]}" "$REMOTE" 'printf "connected as %s on %s\n" "$(whoami)" "$(hostname)"'

printf 'Checking sudo access on %s...\n' "$REMOTE"
ssh -tt "${SSH_OPTS[@]}" "$REMOTE" 'sudo -v'

printf 'Protecting sibling apps and creating release directory...\n'
ssh "${SSH_OPTS[@]}" "$REMOTE" "set -euo pipefail
for sibling in /DATA/AppData/openclaw /DATA/AppData/OpenClaw /DATA/AppData/crowagent /DATA/AppData/CrowAgent; do
  if [ \"\$sibling\" = '$REMOTE_DIR' ]; then
    echo 'refusing protected sibling path' >&2
    exit 1
  fi
done
sudo -n mkdir -p '$release_dir' '$REMOTE_DIR/shared'
sudo -n chown -R \$(id -u):\$(id -g) '$REMOTE_DIR'
"

printf 'Syncing source and build output to %s...\n' "$release_dir"
rsync -az --delete \
  --exclude '.git/' \
  --exclude 'node_modules/' \
  --exclude 'coverage/' \
  --exclude '.env' \
  --exclude '.env.local' \
  --exclude '.DS_Store' \
  ./ "$REMOTE:$release_dir/"

printf 'Installing dependencies on remote...\n'
ssh "${SSH_OPTS[@]}" "$REMOTE" "set -euo pipefail
cd '$release_dir'
npm ci
ln -sfn '$release_dir' '$REMOTE_DIR/current.tmp'
mv -Tf '$REMOTE_DIR/current.tmp' '$REMOTE_DIR/current'
"

printf 'Installing service environment...\n'
printf 'NODE_ENV=production\nPORT=%s\nNEXUS_AUTH_KEY=%s\n' "$PORT" "$NEXUS_AUTH_KEY" \
  | ssh "${SSH_OPTS[@]}" "$REMOTE" "sudo -n install -m 600 -o root -g root /dev/stdin '$REMOTE_DIR/shared/nexus-ultra-agi.env'"

service_file="$(mktemp)"
cat >"$service_file" <<SERVICE
[Unit]
Description=Nexus Ultra AGI
After=network.target

[Service]
Type=simple
WorkingDirectory=$REMOTE_DIR/current
EnvironmentFile=$REMOTE_DIR/shared/nexus-ultra-agi.env
ExecStart=/usr/bin/env npm run start
Restart=always
RestartSec=5
KillSignal=SIGINT
SyslogIdentifier=$SERVICE_NAME

[Install]
WantedBy=multi-user.target
SERVICE

ssh "${SSH_OPTS[@]}" "$REMOTE" "sudo -n tee '/etc/systemd/system/$SERVICE_NAME.service' >/dev/null" <"$service_file"
rm -f "$service_file"

printf 'Restarting %s...\n' "$SERVICE_NAME"
ssh "${SSH_OPTS[@]}" "$REMOTE" "set -euo pipefail
sudo -n systemctl daemon-reload
sudo -n systemctl enable '$SERVICE_NAME'
sudo -n systemctl restart '$SERVICE_NAME'
sudo -n systemctl status '$SERVICE_NAME' --no-pager -l
"

printf 'Cleaning old releases, keeping %s...\n' "$KEEP_RELEASES"
ssh "${SSH_OPTS[@]}" "$REMOTE" "set -euo pipefail
cd '$REMOTE_DIR/releases'
ls -1dt */ | tail -n +$((KEEP_RELEASES + 1)) | xargs -r rm -rf
"

printf 'Deploy complete: http://%s:%s/ (%s)\n' "$DEPLOY_HOST" "$PORT" "$commit"