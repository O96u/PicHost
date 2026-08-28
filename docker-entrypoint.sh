#!/bin/sh
set -e

if [ "$1" = "reset-password" ]; then
  exec node /app/server/cli/reset-password.mjs "${@:2}"
fi

if [ "$1" = "migrate" ]; then
  exec node /app/server/cli/migrate-to-single-images.mjs "${@:2}"
fi

exec node /app/.output/server/index.mjs "$@"
