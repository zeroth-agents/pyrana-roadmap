#!/bin/sh
set -e

echo "Running database migrations..."
node src/db/migrate.mjs

echo "Starting server..."
exec node server.js
