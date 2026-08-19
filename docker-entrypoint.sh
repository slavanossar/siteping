#!/bin/sh
set -e

echo "Running database migrations..."
node ./migrate_modules/prisma/build/index.js migrate deploy

echo "Starting SitePing..."
exec node server.js
