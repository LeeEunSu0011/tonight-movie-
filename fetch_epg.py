"""
fetch_epg.py - epg.pw API 사용 버전 (해외 서버에서도 접근 가능)
"""
import requests, json, re
from datetime import datetime, timezone, timedelta
from xml.etree import ElementTree as ET

KST = timezone(timedelta(hours=9))
NOW = datetime.now(KST)

DATES_ISO = [
    (NOW).strftime("%Y-%m-%d"),
    (NOW + timedelta(days=1)).strftime("%Y-%m-%d"),
]

WINDOW_START = 21 * 60 + 30
WINDOW_END   = 22 * 60

# epg.pw 채널 ID 매핑 (channel_id → 표시 이름)
# https://epg.pw/areas/kr.html 에서 확인된 한국 채널 ID
CHANNEL_MAP = {
    'KBS1TV.kr':    'KBS1',
    'KBS2TV.kr':    'KBS2',
    'MBCTV.kr':     'MBC',
    'SBSTV.kr':     'SBS',
    'tvN.kr':       'tvN',
    'OCN.kr':       'OCN',
    'CGV.kr':       'CGV',
    'ChannelCGV.kr':'채널CGV',
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; EPGFetcher/1.0)",
    "Accept": "application/json, application/xml",
}

def time_str(ts):
    """epoch timestamp → HH:MM (KST)"""
    try:
        dt = datetime.fromtimestamp(int(ts), tz=KST)
        return dt.strftime("%H:%M")
    except: return ''

def in_window(start_str):
    if not start_str: return False
    h, m = map(int, start_str.split(':'))
    return WINDOW_START <= h * 60 + m < WINDOW_END

def date_of_ts(ts):
    """epoch timestamp → YYYY-MM-DD (KST)"""
    try:
        dt = datetime.fromtimestamp(int(ts), tz=KST)
        return dt.strftime("%Y-%m-%d")
    except: return ''

def fetch_epg_json(channel_id, channel_name, date_iso):
    """epg.pw JSON API 호출"""
    url = f"https://epg.pw/api/epg.json?channel_id={channel_id}&date={date_iso}"
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        r.raise_for_status()
        programs = r.json()
        print(f"  [{channel_name}] {len(programs)}개 프로그램")

        results = []
        for p in programs:
            # epg.pw는 start/stop이 epoch timestamp
            start = time_str(p.get('start', 0))
            end   = time_str(p.get('stop', 0))
            prog_date = date_of_ts(p.get('start', 0))

            if prog_date != date_iso: continue
            if not in_window(start): continue

            title = p.get('title', {})
            if isinstance(title, dict):
                title = title.get('ko') or title.get('en') or next(iter(title.values()), '(제목 없음)')

            desc = p.get('description', {})
            if isinstance(desc, dict):
                desc = desc.get('ko') or desc.get('en') or next(iter(desc.values()), '')

            category = p.get('category', {})
            genres = []
            if isinstance(category, dict):
                cat = category.get('ko') or category.get('en') or ''
                if cat: genres.append(cat)
            elif isinstance(category, str) and category:
                genres.append(category)

            results.append({
                "date":       date_iso,
                "channel":    channel_name,
                "start":      start,
                "end":        end,
                "title":      title or '(제목 없음)',
                "genres":     genres,
                "runtimeMin": None,
                "age":        '',
                "plot":       desc or '',
            })

            print(f"    ★ {start} {title}")
        return results
    except Exception as e:
        print(f"  [{channel_name}] 실패: {e}")
        return []

def main():
    print(f"[{NOW.strftime('%Y-%m-%d %H:%M KST')}] epg.pw 편성표 수집 시작")
    print(f"수집 날짜: {', '.join(DATES_ISO)}\n")

    all_items = []
    for date_iso in DATES_ISO:
        print(f"── {date_iso} 수집 중 ──")
        for channel_id, channel_name in CHANNEL_MAP.items():
            items = fetch_epg_json(channel_id, channel_name, date_iso)
            all_items.extend(items)

    all_items.sort(key=lambda x: (x['date'], x['start']))
    print(f"\n✅ 총 {len(all_items)}개 프로그램 수집 완료")

    updated_at = NOW.strftime("%Y-%m-%dT%H:%M:%S+09:00")
    with open('data.json', 'w', encoding='utf-8') as f:
        json.dump({"updatedAt": updated_at, "items": all_items}, f, ensure_ascii=False, indent=2)
    print(f"data.json 저장 완료 (updatedAt: {updated_at})")

if __name__ == '__main__':
    main()
