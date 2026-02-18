"""
test_sources.py - GitHub Actions에서 실행해서 어떤 소스가 되는지 테스트
"""
import requests, json

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/html, */*",
    "Accept-Language": "ko-KR,ko;q=0.9",
    "Referer": "https://www.naver.com/",
}

DATE = "20260218"

tests = [
    ("KBS1 편성표",  f"https://pcast.kbs.co.kr/api/schedule?channel=K1&date={DATE}"),
    ("KBS2 편성표",  f"https://pcast.kbs.co.kr/api/schedule?channel=K2&date={DATE}"),
    ("MBC 편성표",   f"https://schedule.imbc.com/Schedule/Onair?startDt={DATE}&endDt={DATE}&svcType=0101"),
    ("SBS 편성표",   f"https://static.apis.sbs.co.kr/program-api/1.0/schedule/tv?date={DATE}&channelCode=S01"),
    ("TVING tvN",   f"https://api.tving.com/v2/media/schedules?broadDate={DATE}&broadcastDate={DATE}&pageNo=1&pageSize=100&channelCode=C00004"),
    ("TVING OCN",   f"https://api.tving.com/v2/media/schedules?broadDate={DATE}&broadcastDate={DATE}&pageNo=1&pageSize=100&channelCode=C00019"),
    ("네이버 편성표", f"https://tv.naver.com/schedule/channel?scheduledDate={DATE}&channelId=9"),
]

results = {}
for name, url in tests:
    try:
        r = requests.get(url, headers=HEADERS, timeout=10)
        ok = r.status_code == 200 and len(r.content) > 200
        try:
            j = r.json()
            fmt = "JSON"
        except:
            fmt = "HTML"
        print(f"{'✅' if ok else '⚠️ '} {name}: {r.status_code} {fmt} ({len(r.content)}bytes)")
        results[name] = {"status": r.status_code, "format": fmt, "size": len(r.content), "ok": ok}
        if ok and fmt == "JSON":
            print(f"   → 응답 샘플: {str(j)[:200]}")
    except Exception as e:
        print(f"❌ {name}: {e}")
        results[name] = {"status": 0, "ok": False, "error": str(e)}

print("\n\n=== 결과 요약 ===")
for name, r in results.items():
    print(f"{'✅' if r.get('ok') else '❌'} {name}")

with open("test_results.json", "w") as f:
    json.dump(results, f, ensure_ascii=False, indent=2)
print("\ntest_results.json 저장 완료")