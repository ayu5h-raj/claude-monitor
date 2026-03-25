#!/bin/bash
set -e

echo "==> Building Next.js production bundle..."
npm run build

echo "==> Compiling Electron TypeScript..."
npx tsc -p electron/tsconfig.json

echo "==> Packaging with electron-builder..."
npx electron-builder --mac --publish never

echo "==> Done! Output in release/"
ls -lh release/*.dmg 2>/dev/null || echo "(no .dmg files found)"
