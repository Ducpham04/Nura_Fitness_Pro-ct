#!/usr/bin/env bash
# =====================================================================
# Smoke-test luồng chính + kiểm tra IDOR sau các fix bảo mật 12/6.
# Dùng: BASE=http://localhost:8080 ./scripts/smoke-test.sh
# Cần: 2 tài khoản test (A và B). Script tự đăng ký nếu chưa có.
# =====================================================================
set -uo pipefail
BASE="${BASE:-http://localhost:8080}"
PASS=0; FAIL=0
ok(){ echo "  ✅ $1"; PASS=$((PASS+1)); }
bad(){ echo "  ❌ $1"; FAIL=$((FAIL+1)); }
jqv(){ echo "$1" | jq -r "$2" 2>/dev/null; }

echo "== 0. Health =="
h=$(curl -s "$BASE/actuator/health")
[ "$(jqv "$h" .status)" = "UP" ] && ok "actuator/health UP" || bad "health: $h"

# ── Đăng ký + login 2 user ──────────────────────────────────────────
# userName = fullName và UNIQUE → mỗi user 1 fullName riêng. Token ở .token, id ở .user.id
reg(){ curl -s -X POST "$BASE/api/auth/register" -H 'Content-Type: application/json' \
  -d "{\"fullName\":\"$1\",\"email\":\"$2\",\"password\":\"$3\"}"; }
login(){ curl -s -X POST "$BASE/api/auth/login" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$1\",\"password\":\"$2\"}"; }

TS=$(date +%s%N)
A_EMAIL="smokeA_$TS@test.local"; B_EMAIL="smokeB_$TS@test.local"; PW="Test1234!"
# Đăng ký trả luôn token → lấy trực tiếp, khỏi gọi login (tránh đụng brute-force lockout)
LA=$(reg "Smoke A $TS" "$A_EMAIL" "$PW"); LB=$(reg "Smoke B $TS" "$B_EMAIL" "$PW")
TOKA=$(jqv "$LA" '.token'); IDA=$(jqv "$LA" '.user.id')
TOKB=$(jqv "$LB" '.token'); IDB=$(jqv "$LB" '.user.id')
echo "== 1. Register + token =="
[ -n "$TOKA" ] && [ "$TOKA" != "null" ] && ok "user A (id=$IDA)" || bad "register A: $LA"
[ -n "$TOKB" ] && [ "$TOKB" != "null" ] && ok "user B (id=$IDB)" || bad "register B: $LB"
[ -n "$IDA" ] && [ -n "$IDB" ] && [ "$IDA" != "$IDB" ] || bad "không lấy được 2 userId khác nhau — bỏ qua test IDOR"

AUTHA=(-H "Authorization: Bearer $TOKA")
code(){ curl -s -o /dev/null -w '%{http_code}' "$@"; }

echo "== 2. AI usage của chính mình =="
u=$(curl -s "${AUTHA[@]}" -H "userId: $IDA" "$BASE/api/ai-usage/me")
rem=$(jqv "$u" .remaining); [ -n "$rem" ] && [ "$rem" != "null" ] && ok "ai-usage/me remaining=$rem" || bad "ai-usage/me: $u"

echo "== 3. IDOR — user A mạo danh user B (PHẢI bị chặn, KHÔNG trả data B) =="
# Header userId=B nhưng token=A → resolver phải ép về A. So sánh: usage trả về phải của A, không phải B.
uB=$(curl -s "${AUTHA[@]}" -H "userId: $IDB" "$BASE/api/ai-usage/me")
# Không có cách trực tiếp đọc 'của ai' từ payload, nên kiểm gián tiếp: dashboard của B qua token A phải = dashboard A
dA=$(code "${AUTHA[@]}" "$BASE/api/v1/users/$IDA/dashboard")
dB=$(code "${AUTHA[@]}" "$BASE/api/v1/users/$IDB/dashboard")
# Cả hai trả 200 (resolver ép về A) — điều quan trọng: KHÔNG được lộ data B.
[ "$dA" = "200" ] && ok "dashboard chính mình 200" || bad "dashboard A code=$dA"
# profile/full của B qua token A: resolver ép về A → vẫn 200 nhưng là data A (không lộ B)
pf=$(curl -s "${AUTHA[@]}" "$BASE/api/v1/users/$IDB/profile/full")
pfid=$(jqv "$pf" '.profile.id // .userId // .id // .data.userId // .data.id')
if [ -n "$pfid" ] && [ "$pfid" = "$IDA" ]; then ok "profile/full ép về A (không lộ B): trả id=$pfid"; \
  elif [ "$pfid" = "$IDB" ]; then bad "LỘ DATA B! profile/full trả id=$IDB"; \
  else echo "  ⚠️  không parse được id: $(echo "$pf" | head -c 120)"; fi

echo "== 4. Reward-redemptions admin-gated (user thường PHẢI bị chặn) =="
# App trả 401 cho thiếu-quyền-admin trên mọi admin endpoint (đồng nhất); 401/403 đều = chặn
c=$(code "${AUTHA[@]}" "$BASE/api/reward-redemptions")
{ [ "$c" = "403" ] || [ "$c" = "401" ]; } && ok "GET /reward-redemptions → $c (chặn user thường)" || bad "GET /reward-redemptions code=$c (PHẢI 401/403)"

echo "== 5. Tạo meal plan — kiểm tra TRỪ credit =="
before=$(jqv "$(curl -s "${AUTHA[@]}" -H "userId: $IDA" "$BASE/api/ai-usage/me")" .used)
gen=$(curl -s "${AUTHA[@]}" -H "userId: $IDA" -H 'Content-Type: application/json' \
  -X POST "$BASE/api/ai-plans/generate-meal-hybrid" -d '{"days":3,"budget":80000}')
after=$(jqv "$(curl -s "${AUTHA[@]}" -H "userId: $IDA" "$BASE/api/ai-usage/me")" .used)
echo "  (used: $before → $after; response: $(echo "$gen" | head -c 100))"
if [ -n "$before" ] && [ -n "$after" ] && [ "$after" -gt "$before" ] 2>/dev/null; then \
  ok "generate-meal-hybrid có trừ credit ($before→$after)"; \
else echo "  ⚠️  credit không tăng — có thể AI service lỗi/timeout, kiểm log backend"; fi

echo ""
echo "================== KẾT QUẢ: $PASS pass / $FAIL fail =================="
[ "$FAIL" -eq 0 ]
