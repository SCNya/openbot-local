#!/usr/bin/env bash
# OpenBot Local: build an unsigned arm64 macOS app from current upstream OpenBot plus no-login.patch.
# Personal, noncommercial use only (PolyForm Noncommercial 1.0.0). Not affiliated with nightly-labs.
#
# Usage (on an Apple silicon Mac with git, bun and Xcode Command Line Tools):
#   curl -fsSLO https://raw.githubusercontent.com/SCNya/openbot-local/local-no-login/scripts/apply-and-build-mac.sh
#   bash apply-and-build-mac.sh [work-dir] [upstream-ref]
# Env: PATCH_URL / PATCH_FILE override where no-login.patch comes from.
set -euo pipefail

WORK_DIR="${1:-$HOME/openbot-local-build}"
UPSTREAM_REF="${2:-main}"
UPSTREAM_URL="https://github.com/nightly-labs/openbot.git"
PATCH_URL="${PATCH_URL:-https://raw.githubusercontent.com/SCNya/openbot-local/local-no-login/no-login.patch}"

if [[ "$(uname -s)" != "Darwin" || "$(uname -m)" != "arm64" ]]; then
  echo "This script builds for macOS arm64 and must run on an Apple silicon Mac." >&2
  exit 1
fi
command -v git >/dev/null || { echo "git is required (xcode-select --install)" >&2; exit 1; }
command -v bun >/dev/null || { echo "bun is required: https://bun.sh (curl -fsSL https://bun.sh/install | bash)" >&2; exit 1; }

if [[ -d "$WORK_DIR/.git" ]]; then
  echo "==> Updating $WORK_DIR"
  git -C "$WORK_DIR" fetch --depth 1 origin "$UPSTREAM_REF"
  git -C "$WORK_DIR" checkout -f FETCH_HEAD
  git -C "$WORK_DIR" clean -fdx -e node_modules
else
  echo "==> Cloning $UPSTREAM_URL ($UPSTREAM_REF)"
  git clone --depth 1 --branch "$UPSTREAM_REF" "$UPSTREAM_URL" "$WORK_DIR"
fi
cd "$WORK_DIR"
echo "==> Upstream commit: $(git rev-parse --short HEAD)"

PATCH="${PATCH_FILE:-}"
if [[ -z "$PATCH" ]]; then
  PATCH="$(mktemp -t no-login).patch"
  curl -fsSL "$PATCH_URL" -o "$PATCH"
fi
echo "==> Applying $PATCH"
if ! git apply --3way --whitespace=nowarn "$PATCH"; then
  echo "The patch no longer applies cleanly to upstream $UPSTREAM_REF." >&2
  echo "Resolve the conflicts above (see README-LOCAL.md, section about rebasing) or build an older ref." >&2
  exit 2
fi

echo "==> Installing dependencies"
bun install

echo "==> Building unsigned arm64 app"
export CSC_IDENTITY_AUTO_DISCOVERY=false
bun run voice:prepare-runtime
bun run prepare:remote-desktop-runtime
bun run verify:remote-desktop-runtime
bun run prepare:cua-driver
bun run build
bunx electron-builder --mac --arm64 --publish never \
  --config.mac.identity=null --config.mac.notarize=false \
  --config.mac.target=dmg

echo
echo "==> Done. Artifacts:"
ls -1 "$WORK_DIR"/dist/*.dmg 2>/dev/null || ls -1 "$WORK_DIR"/dist 2>/dev/null || true
cat <<'NOTE'

Install: open the .dmg and drag "OpenBot Local" to /Applications.
The app is unsigned, so Gatekeeper blocks the first launch. Remove the quarantine flag once:
  xattr -dr com.apple.quarantine "/Applications/OpenBot Local.app"
Check the architecture:
  file "/Applications/OpenBot Local.app/Contents/MacOS/"*
NOTE
