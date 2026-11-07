#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="$ROOT_DIR/.env"

if [[ -f "$ENV_FILE" ]]; then
  printf '%s\n' ".env already exists; leaving it unchanged."
  exit 0
fi

postgres_password="$(openssl rand -hex 16)"
access_token_sig="$(openssl rand -base64 48 | tr -d '\n')"
encryption_kek="$(openssl rand -base64 32 | tr -d '\n')"

if [[ "$(printf '%s' "$encryption_kek" | base64 --decode | wc -c)" -ne 32 ]]; then
  printf '%s\n' "Generated ENCRYPTION_KEK was not 32 bytes after base64 decoding." >&2
  exit 1
fi

cp "$ROOT_DIR/.env.example" "$ENV_FILE"
sed -i \
  -e "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$postgres_password|" \
  -e "s|^ACCESS_TOKEN_SIG=.*|ACCESS_TOKEN_SIG=$access_token_sig|" \
  -e "s|^ENCRYPTION_KEK=.*|ENCRYPTION_KEK=$encryption_kek|" \
  "$ENV_FILE"

printf '%s\n' ".env created with generated database, token, and encryption keys."
printf '%s\n' "Add your GEMINI_API_KEY to .env, then back up .env securely."
printf '%s\n' "Warning: losing or changing ENCRYPTION_KEK makes stored data permanently unreadable."