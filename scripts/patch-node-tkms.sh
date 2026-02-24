#!/bin/sh
# Patch node-tkms to use browser globals instead of require('util')
# for TextEncoder/TextDecoder. This is needed because node-tkms is a
# Node.js-only package that gets bundled into the browser via @fhevm/mock-utils.
TKMS_FILE="node_modules/.pnpm/node-tkms@0.12.5/node_modules/node-tkms/kms_lib.js"
if [ -f "$TKMS_FILE" ]; then
  sed -i.bak "s/const { TextEncoder, TextDecoder } = require(\`util\`);/const TextEncoder = globalThis.TextEncoder; const TextDecoder = globalThis.TextDecoder;/" "$TKMS_FILE"
  rm -f "${TKMS_FILE}.bak"
  echo "Patched node-tkms for browser compatibility"
fi
