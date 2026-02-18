# 오늘 밤 영화 🎬

21:30~22:00 사이 시작하는 TV 영화 편성표 PWA + 앱.

---

## 파일 구조

```
tonight-movie/
├── index.html      ← 메인 화면
├── styles.css      ← 스타일
├── app.js          ← API 호출 + 파싱 + 렌더링
├── manifest.json   ← PWA 설정
├── sw.js           ← Service Worker (오프라인 캐시)
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

## 폰에서 앱처럼 사용 (PWA)

### iPhone
1. Safari로 위 주소 접속
2. 하단 공유 버튼(□↑) 탭
3. **"홈 화면에 추가"** 탭
4. 추가 → 홈 화면에 앱 아이콘 생성 완료 ✅

### Android
1. Chrome으로 위 주소 접속
2. 주소창 오른쪽 메뉴(⋮) 탭
3. **"앱 설치"** 또는 **"홈 화면에 추가"** 탭
4. 설치 → 완료 ✅

---
