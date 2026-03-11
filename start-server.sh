#!/usr/bin/env sh
set -eu

ROOT_DIR=$(cd "$(dirname "$0")" && pwd)
MINISERVE_DIR="$ROOT_DIR/miniserve"

cd "$ROOT_DIR"

if [ ! -d "$MINISERVE_DIR" ]; then
  echo "miniserve directory not found at $MINISERVE_DIR"
  exit 1
fi

UNAME_S=$(uname -s)
UNAME_M=$(uname -m)
TARGET=""

case "$UNAME_S" in
  Darwin)
    case "$UNAME_M" in
      arm64) TARGET="aarch64-apple-darwin" ;;
      x86_64) TARGET="x86_64-apple-darwin" ;;
      *)
        echo "Unsupported macOS architecture: $UNAME_M"
        exit 1
        ;;
    esac
    ;;
  Linux)
    case "$UNAME_M" in
      x86_64) TARGET="x86_64-unknown-linux-gnu" ;;
      *)
        echo "Unsupported Linux architecture: $UNAME_M"
        exit 1
        ;;
    esac
    ;;
  *)
    echo "Unsupported OS: $UNAME_S"
    exit 1
    ;;
 esac

BIN=$(ls "$MINISERVE_DIR"/miniserve-hqcc-*"$TARGET" 2>/dev/null | head -n 1 || true)

if [ -z "$BIN" ]; then
  echo "miniserve binary not found for target $TARGET"
  exit 1
fi

chmod +x "$BIN" || true

exec "$BIN" --index index.html --spa "$@"
