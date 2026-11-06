#!/bin/bash
# First-time local setup. Requires: Docker (compose plugin), Node.js (see .nvmrc), mkcert.
set -e
cd "$(dirname "$0")"

# dependencies (node_modules are mounted into the containers)
npm ci
npm run build -w @repo/shared-types

# TLS cert for https://localhost
mkcert -install
./apps/nginx/dev/generate-certs.sh

# start and seed
docker compose -f docker-compose.dev.yml up -d --build --wait
docker compose -f docker-compose.dev.yml exec api npm run seed

echo "Ready: https://localhost"
