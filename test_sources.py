"""
test_sources.py v3 - 네이버 최소 요청으로 전체 편성표 가져오기 탐색
"""
import requests, json
from datetime import datetime, timezone, timedelta

KST = timezone(timedelta(hours=9))
NOW = datetime.now(KST)
DATE_DASH = NOW.strftime("%Y-%m-%d")

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/html, */*",
    "Accept-Language": "ko-KR,ko;q=0.9",
    "Referer": "https://tv.naver.com/schedule",
}

results = {}

# 네이버 TV 편성표 - 전체 채널 한번에 가져오는 URL 탐색
urls = [
    # 전체 편성표 페이지 (한 번에 모든 채널)
    ("전체편성표_메인",     f"https://tv.naver.com/schedule?scheduledDate={DATE_DASH}"),
    # 내부 API 후보들
    ("API_전체채널",        f"https://tv.naver.com/api/schedule?scheduledDate={DATE_DASH}"),
    ("API_편성표v1",        f"https://tv.naver.com/api/v1/schedules?date={DATE_DASH}"),
    ("API_편성표v2",        f"https://api.tv.naver.com/v1/schedules?date={DATE_DASH}"),
]

for name, url in urls:
    try:
        r = requests.get(url, headers=HEADERS, timeout=10)
        size = len(r.content)
        print(f"\n[{name}] 상태:{r.status_code} 크기:{size}bytes")
        try:
            j = r.json()
            print(f"  → JSON! 키: {list(j.keys()) if isinstance(j, dict) else type(j)}")
            print(f"  → 샘플: {str(j)[:300]}")
            results[name] = {"ok": True, "format": "JSON", "sample": str(j)[:300]}
        except:
            # HTML이면 앞부분만 출력
            preview = r.text[:500]
            print(f"  → HTML 앞부분:\n{preview}")
            results[name] = {"ok": size > 1000, "format": "HTML", "size": size, "preview": preview}
    except Exception as e:
        print(f"  → 실패: {e}")
        results[name] = {"ok": False, "error": str(e)}

with open("test_results.json", "w", encoding="utf-8") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
print("\n\n=== 요약 ===")
for name, r in results.items():
    print(f"{'✅' if r.get('ok') else '❌'} {name}")