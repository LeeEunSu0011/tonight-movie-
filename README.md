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

---

## 1단계: 아이콘 만들기

PWA와 앱 스토어 모두 아이콘이 필요해요.

1. https://www.canva.com 접속
2. 512×512 사이즈로 새 디자인 만들기
3. 영화 관련 아이콘/이모지로 디자인 (예: 🎬 배경에 넣기)
4. PNG로 내보내기
5. `icons/` 폴더에 `icon-512.png` 저장
6. https://www.iloveimg.com/resize-image 에서 192×192로 리사이즈 → `icon-192.png` 저장

---

## 2단계: GitHub에 올리기

### GitHub 계정 없으면 먼저 가입
https://github.com/signup (무료)

### 저장소 만들기
1. https://github.com/new 접속
2. Repository name: `tonight-movie`
3. **Public** 선택 ← 반드시 Public이어야 무료
4. Create repository 클릭

### 파일 올리기 (코드 몰라도 OK)
1. 생성된 저장소 페이지에서 **"uploading an existing file"** 클릭
2. 파일 전체 드래그 앤 드롭
3. **Commit changes** 클릭

---

## 3단계: GitHub Pages 활성화

1. 저장소 → **Settings** 탭
2. 왼쪽 메뉴 → **Pages**
3. Source: **Deploy from a branch**
4. Branch: **main** / **/ (root)** 선택
5. **Save** 클릭

약 1~2분 후 아래 주소로 접속 가능:
```
https://[내 GitHub 아이디].github.io/tonight-movie
```

---

## 4단계: 폰에서 앱처럼 사용 (PWA)

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

## 5단계: 앱 스토어 출시 (Capacitor)

PWA를 그대로 네이티브 앱으로 변환해서 출시해요.
HTML/CSS/JS 코드를 한 줄도 안 바꿔도 됩니다.

### 사전 준비
- Node.js 설치: https://nodejs.org (LTS 버전)
- Mac이면 Xcode 설치 (App Store에서 무료)
- Android Studio 설치: https://developer.android.com/studio

### Capacitor 설치 및 초기화

```bash
# 프로젝트 폴더에서
npm init -y
npm install @capacitor/core @capacitor/cli
npx cap init "오늘 밤 영화" "com.yourname.tonightmovie" --web-dir .
```

### Android 앱 빌드

```bash
npm install @capacitor/android
npx cap add android
npx cap sync android
npx cap open android
```
→ Android Studio 열림 → **Build → Generate Signed APK** 로 출시 파일 생성

### iOS 앱 빌드 (Mac 필요)

```bash
npm install @capacitor/ios
npx cap add ios
npx cap sync ios
npx cap open ios
```
→ Xcode 열림 → **Product → Archive** 로 출시 파일 생성

---

## 6단계: 스토어 등록

### Google Play Store
- 개발자 등록비: **$25 (1회)**
- https://play.google.com/console
- APK 또는 AAB 파일 업로드

### Apple App Store
- 개발자 등록비: **$99/년**
- https://developer.apple.com
- Xcode로 빌드한 IPA 파일 업로드
- 심사 기간: 1~3일

---

## 업데이트 방법

코드 수정 후 GitHub에 파일만 다시 올리면:
- **PWA**: 즉시 자동 반영
- **앱**: `npx cap sync` 후 스토어에 새 버전 제출

---

## 문제 해결

| 증상 | 해결 |
|---|---|
| 데이터가 안 나옴 | 새로고침 버튼 → 그래도 안 되면 네트워크 확인 |
| GitHub Pages 404 | Settings → Pages 설정 확인, branch가 main인지 확인 |
| 홈 화면 추가 안 보임 | Safari(iOS) 또는 Chrome(Android)에서만 가능 |
| 아이콘이 안 나옴 | icons/ 폴더에 icon-192.png, icon-512.png 있는지 확인 |
| Wavve API 오류 | API 구조 변경 가능성 → app.js JSON 키 확인 |
