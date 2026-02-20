#!/usr/bin/env python3
# fetch_epg.py - epg2xml XML → data.json (영화 장르만 필터링)

import subprocess, json, re, os
from datetime import datetime, timedelta, timezone
from xml.etree import ElementTree as ET

KST = timezone(timedelta(hours=9))
REPO_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_JSON = os.path.join(REPO_DIR, 'data.json')
EPG2XML_BIN = '/home/ubuntu/epg_env/bin/epg2xml'
EPG2XML_CONF = '/home/ubuntu/epg2xml.json'

WINDOW_START = 21 * 60 + 30
WINDOW_END   = 22 * 60 + 10

# 영화 장르 키워드
MOVIE_GENRES = {'영화', 'movie', '무비'}

# 채널 ID → 표시 이름
CHANNEL_MAP = {
    '11.sk': 'KBS1',  '12.sk': 'KBS2',
    '13.sk': 'MBC',   '14.sk': 'SBS',
    '872.sk': 'tvN',  '178.sk': 'OCN',
    '187.sk': 'OCN Movies', '179.sk': 'OCN Movies2',
}

def parse_dt(s):
    try:
        return datetime.strptime(s[:14], '%Y%m%d%H%M%S').replace(tzinfo=KST)
    except:
        return None

def time_str(dt):
    return dt.strftime('%H:%M') if dt else ''

def date_str(dt):
    return dt.strftime('%Y-%m-%d') if dt else ''

def strip_episode(title):
    return re.sub(r'\s*[\(\[]?\d+부작?[\)\]]?$', '', title).strip()

def clean_plot(text):
    if not text: return ''
    # "장르 : ...\n등급 : ...\n" 제거
    lines = text.strip().split('\n')
    clean = []
    for line in lines:
        if line.startswith('장르') or line.startswith('등급') or line.strip() == '':
            continue
        clean.append(line.strip())
    return ' '.join(clean).strip()

def is_movie(genres):
    return any(g.strip().lower() in MOVIE_GENRES for g in genres)

def in_window(dt):
    if not dt: return False
    m = dt.hour * 60 + dt.minute
    return WINDOW_START <= m < WINDOW_END

def main():
    print('epg2xml 실행 중...')
    result = subprocess.run(
        [EPG2XML_BIN, 'run', '--config', EPG2XML_CONF],
        capture_output=True, text=True, encoding='utf-8'
    )

    xml_data = result.stdout
    if not xml_data.strip():
        print('⚠️  epg2xml 출력 없음')
        print(result.stderr[:500])
        return

    root = ET.fromstring(xml_data)
    items = []

    for prog in root.findall('.//programme'):
        start_dt = parse_dt(prog.get('start', ''))
        stop_dt  = parse_dt(prog.get('stop', ''))
        ch_id    = prog.get('channel', '')

        if not in_window(start_dt):
            continue

        ch_name = CHANNEL_MAP.get(ch_id, ch_id)

        title_el = prog.find('title')
        title = strip_episode(title_el.text or '') if title_el is not None else ''

        desc_el = prog.find('desc')
        plot = clean_plot(desc_el.text) if desc_el is not None and desc_el.text else ''

        genres = [c.text.strip() for c in prog.findall('category') if c.text]

        # 영화 장르 필터
        if not is_movie(genres):
            print(f'  [스킵] {ch_name} {time_str(start_dt)} {title} ({genres})')
            continue

        rating_el = prog.find('.//rating/value')
        age = rating_el.text.strip() if rating_el is not None and rating_el.text else ''

        runtime = int((stop_dt - start_dt).total_seconds() // 60) if stop_dt else 0

        items.append({
            'date': date_str(start_dt),
            'channel': ch_name,
            'start': time_str(start_dt),
            'end': time_str(stop_dt),
            'title': title,
            'genres': genres,
            'runtimeMin': runtime,
            'age': age,
            'plot': plot,
        })
        print(f'  ✅ {ch_name} {time_str(start_dt)} {title}')

    items.sort(key=lambda x: (x['date'], x['start']))

    output = {
        'updatedAt': datetime.now(KST).isoformat(),
        'items': items,
    }

    with open(DATA_JSON, 'w', encoding='utf-8') as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    print(f'\n✅ {len(items)}개 영화 수집 완료')
    print(f'data.json 저장 완료')

if __name__ == '__main__':
    main()
