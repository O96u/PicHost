#!/bin/sh
set -e

if [ "$1" = "reset-password" ]; then
  exec node /app/server/cli/reset-password.mjs
fi

exec node /app/.output/server/index.mjs "$@"
