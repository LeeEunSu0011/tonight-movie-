# 🎬 오늘 밤 영화

> 오늘 밤 21:30~22:10 사이에 시작하는 TV 영화 편성표를 한눈에 확인하는 PWA

**배포 주소:** https://leeeunsu0011.github.io/tonight-movie-

---

## 개발 목적

"오늘 밤에 볼 만한 영화가 TV에 있나?" 라는 단순한 질문에서 시작했습니다.  
매번 여러 채널 편성표를 뒤지지 않고, 21:30~22:10 사이에 시작하는 **영화만** 모아서 보여주는 서비스입니다.

---

## 주요 기능

- 📺 **영화 전용 필터** - OCN, OCN Movies, OCN Movies2, tvN 등 영화 채널에서 영화 장르만 수집
- 🕙 **시간대 필터** - 21:30~22:10 시작 프로그램만 표시
- 🎬 **영화 포스터** - TMDB API로 자동 검색 및 표시
- 🔞 **연령 배지** - 12·15세 ⚠️ 노란색, 19세 🔞 빨간색으로 구분
- 📝 **줄거리 제공** - 영화 시놉시스 표시
- ⏱ **런타임 표시** - 영화 상영 시간
- 🔄 **자동 갱신** - 하루 4회(0, 6, 12, 18시) 자동 업데이트
- 📱 **PWA 지원** - 홈 화면에 추가하여 앱처럼 사용 가능

---

## 지원 채널

| 채널 | 소스 |
|------|------|
| KBS1 | SK IPTV |
| KBS2 | SK IPTV |
| MBC | SK IPTV |
| SBS | SK IPTV |
| tvN | SK IPTV |
| OCN | SK IPTV |
| OCN Movies | SK IPTV |
| OCN Movies2 | SK IPTV |

> KBS1/2, MBC, SBS는 영화 장르 편성 시에만 표시됩니다.

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| 프론트엔드 | HTML, CSS, Vanilla JS |
| 포스터 | TMDB API |
| 데이터 수집 | Python 3, [epg2xml](https://github.com/epg2xml/epg2xml) |
| 서버 | Oracle Cloud Free Tier |
| 호스팅 | GitHub Pages |
| 자동화 | crontab |

---

## 시스템 아키텍처

```
오라클 클라우드 서버
  │
  ├─ crontab: 매일 0, 6, 12, 18시 자동 실행
  │
  ├─ epg2xml run
  │    └─ SK IPTV 서버에서 XML 편성표 수신
  │
  ├─ fetch_epg.py
  │    ├─ XML 파싱
  │    ├─ 21:30~22:10 시작 프로그램 필터
  │    ├─ 영화 장르만 추출
  │    └─ data.json 저장
  │
  └─ push_data.sh
       └─ GitHub 자동 push
            │
            ▼
       GitHub Pages (PWA 호스팅)
            │
            ▼
       사용자 브라우저 / 홈 화면 앱
            │
            └─ TMDB API → 영화 포스터 로드
```

---

## 파일 구조

```
tonight-movie-/
├── index.html          # 메인 페이지
├── app.js              # 메인 진입점 (이벤트 연결, 앱 시작)
├── config.js           # 설정 (API 키 등) - 서버에서 직접 관리
├── epg.js              # data.json 로드 및 캐시
├── tmdb.js             # TMDB 포스터 검색 및 캐시
├── ui.js               # UI 렌더링 (카드, 배지, 날짜 등)
├── utils.js            # 공통 유틸 (날짜, 시간 계산 등)
├── styles.css          # 스타일시트
├── manifest.json       # PWA 매니페스트
├── sw.js               # 서비스 워커 (오프라인 캐시)
├── data.json           # 편성표 데이터 (서버가 자동 업데이트)
└── icons/
    ├── icon-192.png
    └── icon-512.png
```

---

## 오라클 서버 구성 (별도 운영)

```
/home/ubuntu/
├── tonight-movie-/     # GitHub 클론
│   ├── fetch_epg.py    # EPG 수집 및 파싱 스크립트 (gitignore)
│   ├── config.js       # 설정 파일 (gitignore)
│   └── data.json       # 생성된 편성표 데이터
├── epg2xml.json        # epg2xml 채널 설정
├── push_data.sh        # GitHub 자동 push 스크립트 (gitignore)
└── epg_env/            # Python 가상환경
```

```

**crontab 설정:**
```
0 0,6,12,18 * * * /home/ubuntu/epg_env/bin/python3 /home/ubuntu/tonight-movie-/fetch_epg.py && /home/ubuntu/push_data.sh
```

**push_data.sh 충돌 방지 전략:**
```bash
git fetch origin
git reset --hard origin/main  # GitHub 최신 상태로 맞춤
git add data.json
git commit -m "Auto Update: $(date)"
git push origin main
```

---

## PWA 설치 방법

### 안드로이드 (Chrome)
1. 브라우저에서 사이트 접속
2. 우측 상단 메뉴(⋮) → **홈 화면에 추가**
3. 앱처럼 실행 가능

### iOS (Safari)
1. Safari에서 사이트 접속
2. 하단 공유 버튼(□↑) → **홈 화면에 추가**
3. 앱처럼 실행 가능

---

## 라이선스

개인 비상업적 용도로만 사용합니다.  
편성표 데이터 출처: SK IPTV (epg2xml을 통한 수집)  
포스터 이미지 출처: [TMDB](https://www.themoviedb.org/)
