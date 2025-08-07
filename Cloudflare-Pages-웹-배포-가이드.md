# 🌐 Cloudflare Pages에 웹사이트 배포 가이드

## 📋 사전 요구사항
- Cloudflare 계정
- wrangler CLI 설치됨  
- 빌드된 웹 파일들 (HTML, CSS, JS)

## 🔧 1. Wrangler 설정 및 로그인 확인

### Wrangler 최신 버전으로 업데이트
```bash
npm install -g wrangler@latest
```

### Cloudflare 로그인 확인
```bash
wrangler whoami
```

## 📊 2. 기존 Pages 프로젝트 확인

### 프로젝트 목록 확인
```bash
wrangler pages project list
```

### 배포 목록 확인
```bash
wrangler pages deployment list --project-name=[프로젝트명]
```

## 🚀 3. 웹사이트 배포 (핵심 명령어)

### ⚡ 기존 프로젝트에 새 버전 배포
```bash
wrangler pages deploy ./release/app/dist/renderer --project-name=contextor-download-page
```

### 🆕 새 프로젝트 생성 후 배포
```bash
# 1. 새 프로젝트 생성
wrangler pages project create [새프로젝트명]

# 2. 배포
wrangler pages deploy [빌드폴더경로] --project-name=[새프로젝트명]
```

**주의사항:**
- 빌드 폴더 경로가 정확해야 함 (`index.html`이 있는 폴더)
- 프로젝트명은 기존에 있는 것을 사용하거나 새로 생성
- Git dirty warning이 나와도 정상 배포됨

## 🔗 4. 배포 완료 후 확인

### 배포 성공 시 받게 되는 정보:
```
✨ Success! Uploaded X files (Y.YY sec)
🌎 Deploying...
✨ Deployment complete! Take a peek over at https://[랜덤ID].[프로젝트명].pages.dev
✨ Deployment alias URL: https://[브랜치명].[프로젝트명].pages.dev
```

### 접근 가능한 URL들:
- **고유 배포 URL:** `https://[랜덤ID].[프로젝트명].pages.dev`
- **브랜치 별칭 URL:** `https://[브랜치명].[프로젝트명].pages.dev`
- **메인 프로젝트 URL:** `https://[프로젝트명].pages.dev`

## ✅ 5. 배포 상태 확인

### 최신 배포 목록 보기
```bash
wrangler pages deployment list --project-name=[프로젝트명]
```

### 브라우저에서 확인
1. 제공받은 URL로 접속
2. 새로운 변경사항이 반영되었는지 확인
3. 캐시 때문에 안 보이면 `Ctrl + F5` (강력 새로고침)

## 🐛 문제 해결

### 404 오류가 날 때
1. **index.html 파일 확인** - 빌드 폴더 최상위에 있어야 함
2. **빌드 폴더 경로 확인** - `index.html`이 있는 정확한 폴더
3. **상대 경로 확인** - CSS, JS 파일 경로가 올바른지

### 업로드 실패할 때  
1. **wrangler 로그인 상태** 확인
2. **인터넷 연결** 확인
3. **빌드 파일 존재** 확인
4. **프로젝트명 정확성** 확인

### 변경사항이 안 보일 때
1. **브라우저 캐시 삭제** (`Ctrl + Shift + Del`)
2. **강력 새로고침** (`Ctrl + F5`)  
3. **시크릿 모드로 확인**
4. **몇 분 후 다시 확인** (전파 시간)

## 📁 빌드 폴더 구조 확인

### 올바른 구조 예시:
```
release/app/dist/renderer/
├── index.html          # 필수!
├── style.css
├── renderer.js
├── style.css.map
└── renderer.js.map
```

### 확인 명령어:
```bash
# Windows
dir .\release\app\dist\renderer\

# PowerShell 
Get-ChildItem .\release\app\dist\renderer\
```

## 🎯 OCT 프로젝트 전용 명령어 템플릿

```bash
# 1. OCT 프로젝트 디렉토리로 이동
cd D:\Data\06_OCT\electorn\OCT-Server

# 2. 웹 빌드 실행 (필요시)
npm run build:web

# 3. Cloudflare 로그인 확인
wrangler whoami

# 4. 기존 프로젝트에 배포
wrangler pages deploy ./release/app/dist/renderer --project-name=contextor-download-page

# 5. 배포 결과 확인
wrangler pages deployment list --project-name=contextor-download-page
```

## 🌐 최종 배포 URL들

### contextor-download-page 프로젝트:
- **메인 URL:** `https://contextor-download-page.pages.dev`
- **A1_Dev 브랜치:** `https://a1-dev.contextor-download-page.pages.dev`
- **최신 배포:** `https://316fa7c7.contextor-download-page.pages.dev`

## 💡 다음 배포 시 간단 명령어

```bash
# OCT 웹사이트 새 버전 배포
cd D:\Data\06_OCT\electorn\OCT-Server
wrangler pages deploy ./release/app/dist/renderer --project-name=contextor-download-page
```

## 📚 참고 자료

- [Cloudflare Pages 공식 문서](https://developers.cloudflare.com/pages/)
- [Static HTML 배포 가이드](https://developers.cloudflare.com/pages/framework-guides/deploy-anything) 
- [Pages 디버깅 가이드](https://developers.cloudflare.com/pages/configuration/debugging-pages/)

---

🎉 **이제 이 가이드만 따라하면 언제든지 웹사이트를 쉽게 배포할 수 있습니다!** 