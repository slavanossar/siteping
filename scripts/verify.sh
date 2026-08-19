#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.docker-test}"

if [[ ! -f "$ENV_FILE" ]]; then
  cat > "$ENV_FILE" <<'EOF'
POSTGRES_PASSWORD=testpgpass123
DATABASE_URL=postgresql://siteping:testpgpass123@postgres:5432/siteping
SITEPING_API_KEY=test-api-key-secret-value
SITEPING_ADMIN_PASSWORD=test-admin-pass
SITEPING_SESSION_SECRET=test-session-secret-value
SITEPING_ALLOWED_ORIGINS=https://siteping.slavanossar.dev
SITEPING_DASHBOARD_PROJECTS=test-project
SITEPING_BASE_URL=https://siteping.slavanossar.dev
EOF
fi

mkdir -p data/postgres

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

BASE_URL="${BASE_URL:-http://localhost:8130}"

echo "Starting Docker Compose stack..."
docker compose \
  --env-file "$ENV_FILE" \
  -f docker-compose.yml \
  -f docker-compose.test.yml \
  up -d --build

echo "Waiting for health check..."
for _ in $(seq 1 60); do
  if curl -fsS "$BASE_URL/api/health" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

echo "1) Health endpoint"
curl -fsS "$BASE_URL/api/health"
echo

echo "2) Unauthenticated GET should be rejected"
GET_STATUS="$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/siteping?projectName=test-project")"
if [[ "$GET_STATUS" != "401" ]]; then
  echo "Expected 401, got $GET_STATUS"
  exit 1
fi
echo "GET /api/siteping -> $GET_STATUS"

echo "3) Unauthenticated PATCH/DELETE should be rejected"
PATCH_STATUS="$(curl -s -o /dev/null -w '%{http_code}' -X PATCH "$BASE_URL/api/siteping" \
  -H 'Content-Type: application/json' \
  -d '{"id":"x","projectName":"test-project","status":"resolved"}')"
DELETE_STATUS="$(curl -s -o /dev/null -w '%{http_code}' -X DELETE "$BASE_URL/api/siteping" \
  -H 'Content-Type: application/json' \
  -d '{"id":"x","projectName":"test-project"}')"
if [[ "$PATCH_STATUS" != "401" || "$DELETE_STATUS" != "401" ]]; then
  echo "Expected PATCH/DELETE 401, got PATCH=$PATCH_STATUS DELETE=$DELETE_STATUS"
  exit 1
fi
echo "PATCH /api/siteping -> $PATCH_STATUS"
echo "DELETE /api/siteping -> $DELETE_STATUS"

echo "4) Unauthenticated OPTIONS should succeed"
OPTIONS_STATUS="$(curl -s -o /dev/null -w '%{http_code}' -X OPTIONS "$BASE_URL/api/siteping")"
if [[ "$OPTIONS_STATUS" != "204" && "$OPTIONS_STATUS" != "200" ]]; then
  echo "Expected 204/200, got $OPTIONS_STATUS"
  exit 1
fi
echo "OPTIONS /api/siteping -> $OPTIONS_STATUS"

echo "5) Unauthenticated POST should be accepted"
POST_STATUS="$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE_URL/api/siteping" \
  -H 'Content-Type: application/json' \
  -d '{
    "projectName":"test-project",
    "type":"bug",
    "message":"integration test",
    "url":"https://example.com",
    "viewport":"1200x800",
    "userAgent":"verify-script",
    "authorName":"Tester",
    "authorEmail":"test@example.com",
    "clientId":"verify-post-001",
    "annotations":[]
  }')"
if [[ "$POST_STATUS" != "201" && "$POST_STATUS" != "200" ]]; then
  echo "Expected 201/200, got $POST_STATUS"
  exit 1
fi
echo "POST /api/siteping -> $POST_STATUS"

echo "6) Dashboard requires authentication"
HOME_STATUS="$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/")"
if [[ "$HOME_STATUS" != "307" && "$HOME_STATUS" != "302" && "$HOME_STATUS" != "308" ]]; then
  echo "Expected redirect to login, got $HOME_STATUS"
  exit 1
fi
echo "/ -> $HOME_STATUS"

echo "7) Login + authenticated internal GET"
COOKIE_JAR="$(mktemp)"
LOGIN_STATUS="$(curl -s -o /dev/null -w '%{http_code}' -c "$COOKIE_JAR" -X POST "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"password\":\"$SITEPING_ADMIN_PASSWORD\"}")"
if [[ "$LOGIN_STATUS" != "200" ]]; then
  echo "Expected login 200, got $LOGIN_STATUS"
  exit 1
fi

AUTH_GET_STATUS="$(curl -s -o /dev/null -w '%{http_code}' -b "$COOKIE_JAR" \
  "$BASE_URL/api/internal/siteping?projectName=test-project")"
if [[ "$AUTH_GET_STATUS" != "200" ]]; then
  echo "Expected authenticated GET 200, got $AUTH_GET_STATUS"
  exit 1
fi
echo "GET /api/internal/siteping -> $AUTH_GET_STATUS"

echo "8) Logout removes dashboard access"
curl -fsS -b "$COOKIE_JAR" -X POST "$BASE_URL/api/auth/logout" >/dev/null
POST_LOGOUT_STATUS="$(curl -s -o /dev/null -w '%{http_code}' -b "$COOKIE_JAR" \
  "$BASE_URL/api/internal/siteping?projectName=test-project")"
if [[ "$POST_LOGOUT_STATUS" != "401" ]]; then
  echo "Expected 401 after logout, got $POST_LOGOUT_STATUS"
  exit 1
fi
echo "GET after logout -> $POST_LOGOUT_STATUS"

echo "9) PostgreSQL is not published on host"
if nc -z localhost 5432 >/dev/null 2>&1; then
  echo "Port 5432 is open on localhost — expected it to be closed"
  exit 1
fi
echo "Port 5432 is not exposed on localhost"

echo "10) API key is not present in client bundles"
if rg -q "SITEPING_API_KEY|test-api-key-secret-value" .next/static 2>/dev/null; then
  echo "Found API key material in client static bundles"
  exit 1
fi
echo "No API key found in .next/static"

echo "All verification checks passed."
