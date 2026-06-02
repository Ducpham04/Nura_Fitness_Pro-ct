#!/usr/bin/env python3
"""
populate_exercise_media.py
==========================
Tự động điền image_url + video_url cho bảng exercises từ 2 nguồn:
  1. ExerciseDB (RapidAPI) → GIF animations  (match theo exercise name)
  2. YouTube Data API v3   → Tutorial videos (search tự động)

CÁCH DÙNG:
  pip install requests psycopg2-binary python-dotenv google-api-python-client

  Tạo file .env (hoặc export biến môi trường):
    RAPIDAPI_KEY=xxxx            # từ rapidapi.com → ExerciseDB
    YOUTUBE_API_KEY=xxxx         # từ console.cloud.google.com → YouTube Data API v3
    DB_URL=postgresql://user:pass@localhost:5432/fitchallenge

  Chạy:
    python scripts/populate_exercise_media.py
    python scripts/populate_exercise_media.py --dry-run     # xem trước, không ghi DB
    python scripts/populate_exercise_media.py --only-images  # chỉ điền ảnh
    python scripts/populate_exercise_media.py --only-videos  # chỉ điền video
"""

import os, re, sys, time, argparse, unicodedata
import psycopg2
import requests

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass  # dotenv optional


# ─────────────────────────────────────────────────────
# Config
# ─────────────────────────────────────────────────────
RAPIDAPI_KEY   = os.getenv("RAPIDAPI_KEY", "")
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY", "")
DB_URL         = os.getenv("DB_URL", "postgresql://postgres:postgres@localhost:5432/fitchallenge")

EXERCISEDB_URL  = "https://exercisedb.p.rapidapi.com/exercises?limit=1350&offset=0"
YOUTUBE_SEARCH  = "https://www.googleapis.com/youtube/v3/search"


# ─────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────
def normalize(s: str) -> str:
    """Lowercase + strip diacritics + remove non-alnum for fuzzy matching."""
    if not s:
        return ""
    nfd = unicodedata.normalize("NFD", s)
    stripped = "".join(c for c in nfd if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]", "", stripped.lower())


def extract_youtube_id(url: str) -> str | None:
    """Extract video ID from various YouTube URL formats."""
    patterns = [
        r"youtube\.com/embed/([a-zA-Z0-9_-]{11})",
        r"youtube\.com/watch\?v=([a-zA-Z0-9_-]{11})",
        r"youtu\.be/([a-zA-Z0-9_-]{11})",
    ]
    for p in patterns:
        m = re.search(p, url)
        if m:
            return m.group(1)
    return None


# ─────────────────────────────────────────────────────
# Step 1 — fetch ExerciseDB catalog
# ─────────────────────────────────────────────────────
def fetch_exercisedb() -> list[dict]:
    if not RAPIDAPI_KEY:
        print("⚠️  RAPIDAPI_KEY not set — skipping image fetch")
        return []
    headers = {
        "X-RapidAPI-Key": RAPIDAPI_KEY,
        "X-RapidAPI-Host": "exercisedb.p.rapidapi.com",
    }
    print("📡 Fetching ExerciseDB catalog...")
    r = requests.get(EXERCISEDB_URL, headers=headers, timeout=30)
    r.raise_for_status()
    data = r.json()
    print(f"   Got {len(data)} exercises from ExerciseDB")
    return data  # [{id, name, gifUrl, target, secondaryMuscles, equipment, bodyPart, instructions}, ...]


def build_exercisedb_lookup(data: list[dict]) -> dict[str, dict]:
    """Index ExerciseDB exercises by normalized name for O(1) lookup."""
    lookup = {}
    for ex in data:
        key = normalize(ex.get("name", ""))
        if key:
            lookup[key] = ex
    return lookup


# ─────────────────────────────────────────────────────
# Step 2 — YouTube search
# ─────────────────────────────────────────────────────
def youtube_search(exercise_name: str) -> str | None:
    """Return an embed URL for the best tutorial video, or None."""
    if not YOUTUBE_API_KEY:
        return None
    params = {
        "key": YOUTUBE_API_KEY,
        "q": f"{exercise_name} exercise tutorial proper form",
        "part": "id",
        "type": "video",
        "maxResults": 1,
        "videoDuration": "short",      # < 4 minutes
        "relevanceLanguage": "en",
        "safeSearch": "strict",
    }
    try:
        r = requests.get(YOUTUBE_SEARCH, params=params, timeout=10)
        r.raise_for_status()
        items = r.json().get("items", [])
        if items:
            vid_id = items[0]["id"]["videoId"]
            return f"https://www.youtube.com/embed/{vid_id}"
    except Exception as e:
        print(f"   ⚠️  YouTube search failed for '{exercise_name}': {e}")
    return None


# ─────────────────────────────────────────────────────
# Step 3 — update database
# ─────────────────────────────────────────────────────
def run(dry_run: bool, only_images: bool, only_videos: bool):
    # Connect
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    # Load exercise catalog from DB
    cur.execute("SELECT id, exercise_name, image_url, video_url FROM exercises ORDER BY id")
    db_exercises = cur.fetchall()
    print(f"🏋️  Found {len(db_exercises)} exercises in database\n")

    # Fetch external sources
    exercisedb_data = [] if only_videos else fetch_exercisedb()
    exercisedb_lookup = build_exercisedb_lookup(exercisedb_data)

    stats = {"image_match": 0, "image_skip": 0, "video_found": 0, "video_skip": 0}

    for ex_id, ex_name, cur_image, cur_video in db_exercises:
        updates = {}
        key = normalize(ex_name)

        # ── Image from ExerciseDB ──────────────────────────────────────
        if not only_videos and not cur_image:
            match = exercisedb_lookup.get(key)
            if not match:
                # Try partial match (first 2 words)
                words = key[:12]  # first ~12 chars
                for k, v in exercisedb_lookup.items():
                    if k.startswith(words) or words in k:
                        match = v
                        break

            if match and match.get("gifUrl"):
                updates["image_url"] = match["gifUrl"]
                stats["image_match"] += 1
                print(f"  ✅ [{ex_id}] {ex_name[:35]:<35} → image from '{match['name']}'")
            else:
                stats["image_skip"] += 1
                print(f"  ❌ [{ex_id}] {ex_name[:35]:<35} → no image match")

        # ── Video from YouTube ─────────────────────────────────────────
        if not only_images and not cur_video:
            time.sleep(0.1)  # rate limit guard
            vid_url = youtube_search(ex_name)
            if vid_url:
                updates["video_url"] = vid_url
                stats["video_found"] += 1
                print(f"  🎬 [{ex_id}] {ex_name[:35]:<35} → {vid_url}")
            else:
                stats["video_skip"] += 1

        # ── Write to DB ────────────────────────────────────────────────
        if updates and not dry_run:
            set_clause = ", ".join(f"{col} = %s" for col in updates)
            values = list(updates.values()) + [ex_id]
            cur.execute(f"UPDATE exercises SET {set_clause} WHERE id = %s", values)

    if not dry_run:
        conn.commit()
        print("\n✅ Database updated!")
    else:
        print("\n🔍 DRY RUN — no changes written")

    conn.close()

    print(f"""
📊 Summary:
   Images matched : {stats['image_match']}  |  not found : {stats['image_skip']}
   Videos found   : {stats['video_found']}  |  not found : {stats['video_skip']}
""")


# ─────────────────────────────────────────────────────
# Fallback: manual YouTube mapping
# (use this when you don't have a YouTube API key)
# ─────────────────────────────────────────────────────
MANUAL_YOUTUBE_MAP = {
    # format: "exercise_name_normalized": "youtube_video_id"
    "pushup":               "IODxDxX7oi4",
    "squatbodyweight":       "aclHkVaku9U",
    "lunge":                "QOVaHwm-Q6U",
    "plank":                "ASdvN_XEl_c",
    "burpee":               "dZgVxmf6jkA",
    "mountainclimber":      "nmwgirgXLYM",
    "jumpingjack":          "c4DAnQ6DtF8",
    "pullup":               "eGo4IYlbE5g",
    "chinup":               "brhRXlOhsAM",
    "dip":                  "yQLPPd7JFvg",
    "dumbbellcurl":         "ykJmrZ5v0Oo",
    "dumbbellpress":        "VmB1G1K7v94",
    "dumbbellrow":          "kBWAon7ItDw",
    "renegaderow":          "YzP4cJZpP3E",
    "gobletswedge":         "MeIiIdhvXT4",
    "romaniandeadlift":     "JCXUYuzwNrM",
    "hipthrust":            "xDmFkJxPzeM",
    "glutebridge":          "wPM8icPu6H8",
    "calfraise":            "gwLzBJYoWlQ",
    "legrase":              "l4kQd9eWclE",
    "russiantwist":         "wkD8rjkodUI",
    "bicyclecrimp":         "cbKIDZ_XM44",
    "deadbug":              "4XLEnwUr1d8",
    "hollowbodyhold":       "LlDNef_Ztsc",
    "inverted row":         "KOaCM93bBUk",
}


def apply_manual_map(dry_run: bool):
    """Apply the manual YouTube map where video_url is still NULL."""
    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()
    cur.execute("SELECT id, exercise_name FROM exercises WHERE video_url IS NULL")
    rows = cur.fetchall()
    updated = 0
    for ex_id, ex_name in rows:
        key = normalize(ex_name)
        vid_id = MANUAL_YOUTUBE_MAP.get(key)
        if vid_id:
            url = f"https://www.youtube.com/embed/{vid_id}"
            if not dry_run:
                cur.execute("UPDATE exercises SET video_url = %s WHERE id = %s", (url, ex_id))
            print(f"  🎬 [{ex_id}] {ex_name} → {url}")
            updated += 1
    if not dry_run:
        conn.commit()
    conn.close()
    print(f"\nManual map applied: {updated} exercises updated")


# ─────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Populate exercise media URLs")
    parser.add_argument("--dry-run",      action="store_true", help="Preview without writing to DB")
    parser.add_argument("--only-images",  action="store_true", help="Only populate image_url")
    parser.add_argument("--only-videos",  action="store_true", help="Only populate video_url")
    parser.add_argument("--manual-map",   action="store_true", help="Apply built-in YouTube video map (no API key needed)")
    args = parser.parse_args()

    if args.manual_map:
        apply_manual_map(dry_run=args.dry_run)
    else:
        if not RAPIDAPI_KEY and not YOUTUBE_API_KEY:
            print("❌ No API keys set. Set RAPIDAPI_KEY and/or YOUTUBE_API_KEY")
            print("   Or use --manual-map to apply the built-in YouTube mapping (no API key needed)")
            sys.exit(1)
        run(
            dry_run=args.dry_run,
            only_images=args.only_images,
            only_videos=args.only_videos,
        )
