#!/usr/bin/env python3
"""
Populate image_url + video_url for all 98 exercises.
Images: free-exercise-db (GitHub, no key needed)
Videos: YouTube Data API v3 (skips exercises already populated)
"""
import re, time, unicodedata, json
import requests
import psycopg2

# ── Config ──────────────────────────────────────────────────────────
YOUTUBE_KEY = "AIzaSyBs6b7KbN77xZLYmlVaGPf1599evOFkyes"
DB_URL      = "postgresql://postgres:123456@localhost:5432/fit_challenge"

IMAGE_BASE  = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/"
FREE_DB_URL = "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json"
YT_URL      = "https://www.googleapis.com/youtube/v3/search"

# ── Helpers ──────────────────────────────────────────────────────────
def norm(s: str) -> str:
    nfd = unicodedata.normalize("NFD", s or "")
    plain = "".join(c for c in nfd if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]", "", plain.lower())

def yt_search(name: str, retries: int = 3) -> str | None:
    for attempt in range(retries):
        try:
            r = requests.get(YT_URL, params={
                "key": YOUTUBE_KEY,
                "q": f"{name} exercise tutorial proper form",
                "part": "id",
                "type": "video",
                "maxResults": 1,
                "videoDuration": "short",
                "relevanceLanguage": "en",
            }, timeout=10)
            if r.status_code == 429:
                wait = 2 ** attempt * 3  # 3s, 6s, 12s
                print(f"     ⏳ rate-limited, waiting {wait}s...")
                time.sleep(wait)
                continue
            r.raise_for_status()
            items = r.json().get("items", [])
            if items:
                vid_id = items[0]["id"]["videoId"]
                return f"https://www.youtube.com/embed/{vid_id}"
        except Exception as e:
            print(f"     ⚠️  YouTube error ({name}): {e}")
            time.sleep(2)
    return None

# ── Step 1: DB ───────────────────────────────────────────────────────
print("🔌 Connecting to database...")
conn = psycopg2.connect(DB_URL)
cur = conn.cursor()
cur.execute("SELECT exercise_id, exercise_name, image_url, video_url FROM exercises ORDER BY exercise_id")
db_rows = cur.fetchall()
print(f"   {len(db_rows)} exercises total\n")

# ── Step 2: free-exercise-db for images ─────────────────────────────
print("📦 Fetching free-exercise-db (GitHub, no key needed)...")
fdb = requests.get(FREE_DB_URL, timeout=30).json()
print(f"   Got {len(fdb)} exercises\n")

# Build lookup: norm(name) → first image URL
img_lookup: dict[str, str] = {}
for ex in fdb:
    key = norm(ex.get("name", ""))
    imgs = ex.get("images", [])
    if imgs:
        img_lookup[key] = IMAGE_BASE + imgs[0]   # use first (static) image

# ── Step 3: Match + update ───────────────────────────────────────────
print("🔗 Processing exercises...\n")
img_hits = img_miss = vid_hits = vid_miss = 0

for ex_id, ex_name, cur_img, cur_vid in db_rows:
    key = norm(ex_name)
    updates: dict[str, str] = {}

    # ── Image ──────────────────────────────────────────────────────
    if not cur_img:
        url = img_lookup.get(key)
        if not url:
            # Partial match: try first 8+ chars
            for k, v in img_lookup.items():
                if len(key) >= 8 and len(k) >= 8 and (k.startswith(key[:8]) or key.startswith(k[:8])):
                    url = v
                    break
        if url:
            updates["image_url"] = url
            img_hits += 1
        else:
            img_miss += 1

    # ── Video (skip if already set) ────────────────────────────────
    if not cur_vid:
        time.sleep(1.2)   # stay well under YouTube quota
        vid = yt_search(ex_name)
        if vid:
            updates["video_url"] = vid
            vid_hits += 1
        else:
            vid_miss += 1

    # Report
    img_icon = "✅" if "image_url" in updates else ("⏭️" if cur_img else "❌")
    vid_icon = "🎬" if "video_url" in updates else ("⏭️" if cur_vid else "❌")
    print(f"  [{ex_id:3d}] {ex_name:<38} img:{img_icon}  vid:{vid_icon}")

    # Write
    if updates:
        set_parts = ", ".join(f"{c} = %s" for c in updates)
        cur.execute(
            f"UPDATE exercises SET {set_parts} WHERE exercise_id = %s",
            list(updates.values()) + [ex_id],
        )

conn.commit()
conn.close()

print(f"""
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ Done!
   Images: {img_hits} new  |  {img_miss} not found
   Videos: {vid_hits} new  |  {vid_miss} not found
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
""")
