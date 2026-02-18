"""
fetch_epg.py - epg.pw API + 채널ID 자동 탐색
"""
import requests, json, re
from datetime import datetime, timezone, timedelta

KST = timezone(timedelta(hours=9))
NOW = datetime.now(KST)

DATES_ISO = [
    NOW.strftime("%Y-%m-%d"),
    (NOW + timedelta(days=1)).strftime("%Y-%m-%d"),
]

WINDOW_START = 21 * 60 + 30
WINDOW_END   = 22 * 60

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; EPGFetcher/1.0)",
    "Accept": "application/json",
}

# epg.pw 채널 ID 후보 목록 (여러 ID를 시도해서 데이터 있는 것 사용)
CHANNEL_CANDIDATES = {
    'KBS1': ['KBS1TV.kr', 'KBS1.kr', 'kbs1tv.kr'],
    'KBS2': ['KBS2TV.kr', 'KBS2.kr', 'kbs2tv.kr'],
    'MBC':  ['MBCTV.kr', 'MBC.kr', 'mbc.kr'],
    'SBS':  ['SBSTV.kr', 'SBS.kr', 'sbs.kr'],
    'tvN':  ['tvN.kr', 'tvnkorea.kr', 'TVN.kr'],
    'OCN':  ['OCN.kr', 'ocn.kr'],
    'CGV':  ['CGV.kr', 'cgv.kr', 'ChannelCGV.kr'],
    '채널CGV': ['ChannelCGV.kr', 'channelcgv.kr'],
}

def time_str(ts):
    try:
        dt = datetime.fromtimestamp(int(ts), tz=KST)
        return dt.strftime("%H:%M")
    except: return ''

def date_of_ts(ts):
    try:
        dt = datetime.fromtimestamp(int(ts), tz=KST)
        return dt.strftime("%Y-%m-%d")
    except: return ''

def in_window(s):
    if not s: return False
    h, m = map(int, s.split(':'))
    return WINDOW_START <= h * 60 + m < WINDOW_END

def fetch_channel_epg(channel_id, channel_name, date_iso):
    url = f"https://epg.pw/api/epg.json?channel_id={channel_id}&date={date_iso}"
    try:
        r = requests.get(url, headers=HEADERS, timeout=15)
        r.raise_for_status()
        programs = r.json()
        if not isinstance(programs, list) or len(programs) == 0:
            return None  # 이 ID는 데이터 없음
        print(f"  ✅ [{channel_name}] ID={channel_id} → {len(programs)}개")

        results = []
        for p in programs:
            start = time_str(p.get('start', 0))
            end   = time_str(p.get('stop', 0))
            prog_date = date_of_ts(p.get('start', 0))
            if prog_date != date_iso or not in_window(start):
                continue

            title = p.get('title', '')
            if isinstance(title, dict):
                title = title.get('ko') or title.get('en') or next(iter(title.values()), '(제목 없음)')

            desc = p.get('description', '')
            if isinstance(desc, dict):
                desc = desc.get('ko') or desc.get('en') or next(iter(desc.values()), '')

            cat = p.get('category', '')
            genres = []
            if isinstance(cat, dict):
                c = cat.get('ko') or cat.get('en') or ''
                if c: genres.append(c)
            elif cat:
                genres.append(str(cat))

            results.append({
                "date": date_iso, "channel": channel_name,
                "start": start, "end": end,
                "title": title or '(제목 없음)',
                "genres": genres, "runtimeMin": None,
                "age": '', "plot": desc or '',
            })
            if results:
                print(f"    ★ {start} {title}")
        return results
    except Exception as e:
        print(f"  ❌ [{channel_name}] ID={channel_id} 실패: {e}")
        return None

def find_working_channel(channel_name, candidates, date_iso):
    """후보 ID 중 데이터가 있는 첫 번째 ID 사용"""
    for cid in candidates:
        result = fetch_channel_epg(cid, channel_name, date_iso)
        if result is not None:
            return result
    print(f"  ⚠️  [{channel_name}] 모든 ID 실패")
    return []

def main():
    print(f"[{NOW.strftime('%Y-%m-%d %H:%M KST')}] epg.pw 편성표 수집 시작")
    print(f"수집 날짜: {', '.join(DATES_ISO)}\n")

    all_items = []
    for date_iso in DATES_ISO:
        print(f"── {date_iso} ──")
        for ch_name, candidates in CHANNEL_CANDIDATES.items():
            items = find_working_channel(ch_name, candidates, date_iso)
            all_items.extend(items)

    all_items.sort(key=lambda x: (x['date'], x['start']))
    print(f"\n✅ 총 {len(all_items)}개 프로그램")

    updated_at = NOW.strftime("%Y-%m-%dT%H:%M:%S+09:00")
    with open('data.json', 'w', encoding='utf-8') as f:
        json.dump({"updatedAt": updated_at, "items": all_items}, f, ensure_ascii=False, indent=2)
    print(f"data.json 저장 완료")

if __name__ == '__main__':
    main()