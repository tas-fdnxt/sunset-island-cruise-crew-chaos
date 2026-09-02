#!/usr/bin/env bash
# S2B CONTRACT. The exact requests island.html and join.html make, sent to the real Sydney server.
# Needs a confirmed test user: SB_EMAIL, SB_PASS. Never run against a real family.
set -u
URL=https://whhzezkpejplaghiuuyk.supabase.co
KEY=sb_publishable_YV7G7ROGkFRwc4noDH4gNA_xXIeA3gd
P=0; F=0; ok(){ if [ "$1" = 1 ]; then P=$((P+1)); echo "PASS  $2"; else F=$((F+1)); echo "FAIL  $2  [$3]"; fi; }
J(){ python3 -c "import sys,json; d=json.load(sys.stdin); print(eval(sys.argv[1]))" "$1"; }
# 1. password grant, exactly as join.html sends it
TOK=$(curl -s -X POST "$URL/auth/v1/token?grant_type=password" -H "apikey: $KEY" -H "Content-Type: application/json" -d "{\"email\":\"$SB_EMAIL\",\"password\":\"$SB_PASS\"}")
AT=$(echo "$TOK" | J "d.get('access_token','')"); PARENT_ID=$(echo "$TOK" | J "d.get('user',{}).get('id','')")
ok $([ -n "$AT" ] && echo 1 || echo 0) "sign in returns a session" "$(echo "$TOK" | head -c 120)"
H=(-H "apikey: $KEY" -H "Authorization: Bearer $AT" -H "Content-Type: application/json")
# 2. family: none, then make one, exactly as join.html does
FAM=$(curl -s "$URL/rest/v1/families?select=id&limit=1" "${H[@]}")
ok $([ "$FAM" = "[]" ] && echo 1 || echo 0) "a fresh account sees no family" "$FAM"
FAM=$(curl -s -X POST "$URL/rest/v1/families?select=id" "${H[@]}" -H "Prefer: return=representation" -d "{\"owner\":\"$PARENT_ID\",\"adult_attested\":true}")
FID=$(echo "$FAM" | J "d[0]['id']")
ok $([ -n "$FID" ] && echo 1 || echo 0) "the family row is made" "$FAM"
# 3. child lookup then create, exactly as island.html does
K=$(curl -s "$URL/rest/v1/children?select=id&nickname=eq.TESTOLLIE&limit=1" "${H[@]}")
ok $([ "$K" = "[]" ] && echo 1 || echo 0) "no child yet" "$K"
K=$(curl -s -X POST "$URL/rest/v1/children?select=id" "${H[@]}" -H "Prefer: return=representation" -d "{\"family_id\":\"$FID\",\"nickname\":\"TESTOLLIE\",\"age_band\":\"5-8\",\"title\":\"CAPTAIN\",\"colour\":\"#FFF3E2\"}")
KID=$(echo "$K" | J "d[0]['id']")
ok $([ -n "$KID" ] && echo 1 || echo 0) "the child row is made" "$K"
BAD=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$URL/rest/v1/children" "${H[@]}" -d "{\"family_id\":\"$FID\",\"nickname\":\"ELEVENLETTERS\",\"age_band\":\"5-8\"}")
ok $([ "$BAD" = "400" ] && echo 1 || echo 0) "eleven letters refused over the API" "$BAD"
# 4. the upsert, exactly as SYNC.push sends it, then the read, exactly as SYNC.pull reads it
UP=$(curl -s -X POST "$URL/rest/v1/child_state?on_conflict=child_id,drawer&select=updated_at" "${H[@]}" -H "Prefer: resolution=merge-duplicates,return=representation" -d "{\"child_id\":\"$KID\",\"drawer\":\"save\",\"value\":{\"v\":1,\"i\":\"AgAAAcJGEw\",\"at\":1}}")
T1=$(echo "$UP" | J "d[0]['updated_at']")
ok $([ -n "$T1" ] && echo 1 || echo 0) "first upsert returns updated_at" "$UP"
UP=$(curl -s -X POST "$URL/rest/v1/child_state?on_conflict=child_id,drawer&select=updated_at,version" "${H[@]}" -H "Prefer: resolution=merge-duplicates,return=representation" -d "{\"child_id\":\"$KID\",\"drawer\":\"save\",\"value\":{\"v\":1,\"i\":\"AgAAAcJGEw\",\"at\":2}}")
V=$(echo "$UP" | J "d[0]['version']"); T2=$(echo "$UP" | J "d[0]['updated_at']")
ok $([ "$V" = "2" ] && [ "$T2" \> "$T1" ] && echo 1 || echo 0) "second upsert bumps version and timestamp" "$UP"
RD=$(curl -s "$URL/rest/v1/child_state?select=drawer,value,updated_at&child_id=eq.$KID" "${H[@]}")
AT2=$(echo "$RD" | J "d[0]['value']['at']")
ok $([ "$AT2" = "2" ] && echo 1 || echo 0) "the read returns the newest island" "$RD"
SN=$(curl -s "$URL/rest/v1/snapshots?select=day&child_id=eq.$KID" "${H[@]}")
ok $([ "$(echo "$SN" | J "len(d)")" = "1" ] && echo 1 || echo 0) "one snapshot for today, made by the trigger" "$SN"
# 5. consent, exactly as join.html sends it
C=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$URL/rest/v1/consents" "${H[@]}" -H "Prefer: return=minimal" -d "{\"family_id\":\"$FID\",\"child_id\":\"$KID\",\"what\":\"contract test\"}")
ok $([ "$C" = "201" ] && echo 1 || echo 0) "consent recorded" "$C"
# 6. the anonymous key alone sees nothing
AN=$(curl -s -o /dev/null -w "%{http_code}" "$URL/rest/v1/child_state?select=drawer" -H "apikey: $KEY")
ok $([ "$AN" = "401" ] || [ "$AN" = "403" ] && echo 1 || echo 0) "anonymous key refused" "$AN"
echo "RESULT: $((P+F)) checks, $P passed, $F failed"; exit $F
