#!/bin/bash
# Generates a locally-trusted TLS cert for https://localhost (dev nginx).
# Requires mkcert (see apps/nginx/readme.md). Run once; certs/ is git-ignored.
# The first time on a machine, also trust mkcert's CA:  mkcert -install
set -e

CERTS_DIR="$(cd "$(dirname "$0")" && pwd)/certs"
mkdir -p "$CERTS_DIR"

mkcert \
  -cert-file "$CERTS_DIR/localhost.pem" \
  -key-file "$CERTS_DIR/localhost-key.pem" \
  localhost www.localhost 127.0.0.1 ::1
