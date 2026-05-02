#!/usr/bin/env bash
set -euo pipefail

REMOTE="fabiano@192.168.0.185"
DEPLOY_USER="fabiano"
REMOTE_DIR="/DATA/AppData/nexus-ultra-agi"
SERVICE_NAME="nexus-ultra-agi"
KEEP_RELEASES=3
CONTROL_PATH="$HOME/.ssh/nua-%C"
SSH_OPTS=(
  -o ConnectTimeout=10
  -o StrictHostKeyChecking=accept-new
  -o ControlMaster=auto
  -o ControlPersist=10m
  -o ControlPath="$CONTROL_PATH"
)
RSYNC_RSH="ssh ${SSH_OPTS[*]}"
SUDO_PASSWORD=""

cleanup_ssh_control() {
  ssh -O exit "${SSH_OPTS[@]}" "$REMOTE" >/dev/null 2>&1 || true
}
trap cleanup_ssh_control EXIT

prompt_sudo_password() {
  if [[ -z "$SUDO_PASSWORD" ]]; then
    printf 'Remote sudo password for %s: ' "$REMOTE" >&2
    IFS= read -rs SUDO_PASSWORD
    printf '\n' >&2
  fi
}

run_remote_root() {
  local remote_script="$1"
  prompt_sudo_password
  {
    printf '%s\n' "$SUDO_PASSWORD"
    printf '%s\n' "$remote_script"
  } | ssh "${SSH_OPTS[@]}" "$REMOTE" 'sudo -S -p "" bash -se'
}

commit="$(git rev-parse --short HEAD)"
release="$(date -u +%Y%m%d%H%M%S)-${commit}-manual"
release_dir="$REMOTE_DIR/releases/$release"

npm run build
ssh "${SSH_OPTS[@]}" "$REMOTE" 'printf "connected as %s on %s\n" "$(whoami)" "$(hostname)"'

run_remote_root "set -euo pipefail
mkdir -p '$release_dir' '$REMOTE_DIR/shared'
chown -R '$DEPLOY_USER':'$DEPLOY_USER' '$REMOTE_DIR'
"

rsync -az -e "$RSYNC_RSH" --delete \
  --exclude '.git/' \
  --exclude 'node_modules/' \
  --exclude 'coverage/' \
  --exclude '.env' \
  --exclude '.env.local' \
  --exclude '.DS_Store' \
  ./ "$REMOTE:$release_dir/"

ssh "${SSH_OPTS[@]}" "$REMOTE" "set -euo pipefail
cd '$release_dir'
npm ci --legacy-peer-deps
ln -sfn '$release_dir' '$REMOTE_DIR/current.tmp'
mv -Tf '$REMOTE_DIR/current.tmp' '$REMOTE_DIR/current'
"

run_remote_root "set -euo pipefail
systemctl daemon-reload
systemctl restart '$SERVICE_NAME'
systemctl status '$SERVICE_NAME' --no-pager -l
"

ssh "${SSH_OPTS[@]}" "$REMOTE" "set -euo pipefail
cd '$REMOTE_DIR/releases'
ls -1dt */ | tail -n +$((KEEP_RELEASES + 1)) | xargs -r rm -rf
"

printf 'Manual deploy complete: http://192.168.0.185:3336/ (%s)\n' "$release"
