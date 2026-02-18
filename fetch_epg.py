"""
fetch_epg.py
GitHub Actions에서 실행 - Wavve API로 편성표 수집 후 data.json 저장
"""
import requests, json, re
from datetime import datetime, timezone, timedelta

# ── 설정 ──────────────────────────────────────────
KST = timezone(timedelta(hours=9))
NOW = datetime.now(KST)
TODAY_ISO     = NOW.strftime("%Y-%m-%d")
dates = [
    (NOW).strftime("%Y%m%d"),
    (NOW + timedelta(days=1)).strftime("%Y%m%d"),
]

TARGET_CHANNELS = {
    'KBS1', 'KBS2', 'MBC', 'SBS',
    'tvN', 'OCN', 'OCN Movies', 'OCN Movies2',
    'CGV', '채널CGV',
}
WINDOW_START = 21 * 60 + 30   # 21:30
WINDOW_END   = 22 * 60        # 22:00

WAVVE_KEY = "E5F3E0D30947AA5440556471321BB6D9"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    "Accept": "application/json",
    "Origin": "https://www.wavve.com",
    "Referer": "https://www.wavve.com/",
}

# ── 유틸 ─────────────────────────────────────────
def parse_time(raw):
    if not raw: return ''
    m = re.search(r'(\d{1,2}):(\d{2})', str(raw))
    if m: return f"{int(m.group(1)):02d}:{m.group(2)}"
    if re.match(r'^\d{4}$', str(raw)): return f"{raw[:2]}:{raw[2:4]}"
    return ''

def in_window(start):
    if not start: return False
    h, m = map(int, start.split(':'))
    t = h * 60 + m
    return WINDOW_START <= t < WINDOW_END

def calc_runtime(start, end):
    try:
        sh, sm = map(int, start.split(':'))
        eh, em = map(int, end.split(':'))
        diff = (eh*60+em) - (sh*60+sm)
        if diff < 0: diff += 1440
        return diff if diff > 0 else None
    except: return None

def parse_rating(raw):
    raw = str(raw)
    if re.search(r'19|adult', raw, re.I): return '19세'
    if re.search(r'15', raw): return '15세'
    if re.search(r'12', raw): return '12세'
    if re.search(r'7|all|^0$', raw, re.I): return '전체'
    return raw or ''

# ── Wavve API ─────────────────────────────────────
def fetch_channels():
    url = f"https://api.wavve.com/v4/live/channels?apikey={WAVVE_KEY}&credential=none&device=mobile&drm=none&formattype=json&partnerId=P-CH&prdtype=2"
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        r.raise_for_status()
        items = r.json().get('data', {}).get('items', []) or r.json().get('items', [])
        return {
            (ch.get('channelcode') or ch.get('channel_code', '')): 
            (ch.get('channelname') or ch.get('channel_name', ''))
            for ch in items
        }
    except Exception as e:
        print(f"채널 API 실패: {e}")
        return {}

def fallback_channels():
    return {
        'KBS1':'KBS1','KBS2':'KBS2','MBC':'MBC','SBS':'SBS',
        'C01':'tvN','C23':'OCN','OCN_MOVIES':'OCN Movies',
        'CGV':'CGV','CH_CGV':'채널CGV',
    }

def fetch_epg(channel_code, channel_name):
    url = (f"https://api.wavve.com/v4/live/epgs?apikey={WAVVE_KEY}"
           f"&credential=none&device=mobile&drm=none&formattype=json"
           f"&limit=500&offset=0&partnerId=P-CH&prdtype=2"
           f"&startdate={TODAY_COMPACT}&enddate={TODAY_COMPACT}"
           f"&channelcode={channel_code}")
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        r.raise_for_status()
        items = r.json().get('data', {}).get('items', []) or r.json().get('items', [])
        results = []
        for item in items:
            start = parse_time(item.get('starttime') or item.get('start_time',''))
            end   = parse_time(item.get('endtime')   or item.get('end_time',''))
            if not start: continue

            genres = []
            if item.get('category_name'): genres.append(item['category_name'])
            if item.get('genre') and item.get('genre') != item.get('category_name'):
                genres.append(item['genre'])

            runtime = item.get('runtime')
            runtime = int(runtime) if runtime else calc_runtime(start, end)

            results.append({
                "date":       TODAY_ISO,
                "channel":    channel_name,
                "start":      start,
                "end":        end,
                "title":      item.get('title') or item.get('program_name','(제목 없음)'),
                "genres":     genres,
                "runtimeMin": runtime,
                "age":        parse_rating(item.get('ratings') or item.get('age','')),
                "plot":       item.get('synopsis') or item.get('description',''),
            })
        return results
    except Exception as e:
        print(f"  EPG 실패 [{channel_name}]: {e}")
        return []

# ── 메인 ─────────────────────────────────────────
def main():
    print(f"[{NOW.strftime('%Y-%m-%d %H:%M KST')}] 편성표 수집 시작")

    channel_map = fetch_channels()
    if not channel_map:
        print("fallback 채널맵 사용")
        channel_map = fallback_channels()
    print(f"채널 수: {len(channel_map)}")

    all_items = []
    for code, name in channel_map.items():
        if name not in TARGET_CHANNELS:
            continue
        print(f"  수집 중: {name} ({code})")
        items = fetch_epg(code, name)
        all_items.extend(items)

    filtered = [p for p in all_items if in_window(p['start'])]
    filtered.sort(key=lambda x: x['start'])

    print(f"21:30~22:00 시작 프로그램: {len(filtered)}개")
    for p in filtered:
        print(f"  {p['channel']:<12} {p['start']}  {p['title']}")

    with open('data.json', 'w', encoding='utf-8') as f:
        json.dump({"items": filtered}, f, ensure_ascii=False, indent=2)
    print("data.json 저장 완료")

if __name__ == '__main__':
    main()