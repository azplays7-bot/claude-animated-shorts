#!/usr/bin/env bash
# Build a runnable Remotion project from this skill's templates.
# usage: ./setup.sh <target-dir> [--no-install]
set -euo pipefail
SKILL="$(cd "$(dirname "$0")" && pwd)"
DEST="${1:?usage: ./setup.sh <target-dir> [--no-install]}"
if [ -e "$DEST/package.json" ]; then echo "error: $DEST already has a package.json; refusing to overwrite" >&2; exit 1; fi
mkdir -p "$DEST"
cp -R "$SKILL/templates/project/." "$DEST/"
mkdir -p "$DEST/src/videos/bridge" "$DEST/scripts" "$DEST/audio" "$DEST/out"
cp "$SKILL"/templates/bridge/* "$DEST/src/videos/bridge/"
cp "$SKILL"/templates/scripts/* "$DEST/scripts/"
cp "$SKILL"/templates/audio/* "$DEST/audio/"
if [ "${2:-}" != "--no-install" ]; then (cd "$DEST" && npm install); fi
cat <<MSG
Project ready in $DEST
  cd "$DEST"
  npm run still        # renders frames 100 and 400 to out/test/
  npm run studio       # opens Remotion Studio
  npm run render:2k    # final 1440x2560 render
Optional: put Kenney CC0 .glb models in public/bridge/kenney/ (see the README there).
Python helpers need: pip install numpy scipy pillow
MSG
