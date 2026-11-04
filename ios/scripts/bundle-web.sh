#!/bin/sh
# Xcode build phase "Bundle web game": copies the game from the repository root into the app
# bundle (Backup7105.app/web), so the app always ships the same game as the web version.
set -eu
REPO="${PROJECT_DIR}/.."
DEST="${TARGET_BUILD_DIR}/${UNLOCALIZED_RESOURCES_FOLDER_PATH}/web"
rm -rf "$DEST"
mkdir -p "$DEST"
for f in index.html styles.css manifest.webmanifest; do cp "$REPO/$f" "$DEST/"; done
cp -R "$REPO/src" "$REPO/icons" "$DEST/"
# The web build id (from the service worker's cache name), shown in Settings → Display info.
if [ -f "$REPO/sw.js" ]; then
  sed -n 's/.*backup7105-\([0-9a-f]*\).*/\1/p' "$REPO/sw.js" | head -n 1 > "$DEST/build.txt"
fi
echo "Bundled web game into $DEST"
