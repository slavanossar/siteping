#!/bin/sh
set -e

echo "Prisma version: $(npx prisma --version)"

echo "Running database migrations..."
npx prisma migrate deploy

echo "Starting SitePing..."
exec node server.js
