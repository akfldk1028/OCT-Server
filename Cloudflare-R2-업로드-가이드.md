# 🚀 Cloudflare R2에 Electron 앱 업로드 & 배포 가이드

## 📋 사전 요구사항
- Cloudflare 계정
- wrangler CLI 설치됨
- 빌드된 Electron 앱 (exe 파일)

## 🔧 1. Wrangler 설정 및 업데이트

### Wrangler 최신 버전으로 업데이트
```bash
npm install -g wrangler@latest
```

### Cloudflare 로그인 확인
```bash
wrangler whoami
```

## 📦 2. R2 버킷 생성 (최초 1회만)

### 버킷 생성
```bash
wrangler r2 bucket create contextor
```

### 버킷 목록 확인
```bash
wrangler r2 bucket list
```

## 🚀 3. 파일 업로드 (핵심 명령어)

### ⚠️ 중요: 반드시 --remote 플래그 사용!
```bash
wrangler r2 object put contextor/Contextor-Setup-Final.exe --file=".\release\build\Contextor Setup 0.0.1.exe" --remote
```

**주의사항:**
- `--remote` 플래그 필수! (안 하면 대시보드에 안 나타남)
- 파일 경로에 공백이 있으면 따옴표로 감싸기
- `contextor/파일명` 형식으로 버킷명 포함

## 🔗 4. 다운로드 링크 생성

### 임시 다운로드 링크 (1주일 유효)
```bash
wrangler r2 object presign contextor/Contextor-Setup-Final.exe --expires-in 604800
```

### Public 버킷 설정 (영구 링크)
1. Cloudflare 대시보드 → R2 → contextor 버킷
2. **설정** 탭 → **Public access** 활성화
3. 영구 링크: `https://pub-[계정ID].r2.dev/Contextor-Setup-Final.exe`

## ✅ 5. 업로드 확인

### 파일 다운로드 테스트
```bash
wrangler r2 object get contextor/Contextor-Setup-Final.exe --file="test-download.exe"
```

### 파일 크기 확인
```bash
dir test-download.exe
```

## 🐛 문제 해결

### 대시보드에서 파일이 안 보일 때
1. **wrangler 최신 버전** 확인
2. **--remote 플래그** 사용했는지 확인  
3. 브라우저 강력 새로고침 (`Ctrl + F5`)
4. 몇 분 기다린 후 다시 확인

### 업로드 실패할 때
1. 파일 경로 확인 (공백, 특수문자)
2. 인터넷 연결 확인
3. Cloudflare 로그인 상태 확인

## 📝 파일명 규칙

### 권장 파일명 형식
```
[앱이름]-Setup-[버전].exe
예: Contextor-Setup-0.0.1.exe
```

### R2 객체 경로 형식
```
[버킷명]/[파일명]
예: contextor/Contextor-Setup-Final.exe
```

## 🎯 완성된 명령어 템플릿

```bash
# 1. 최신 wrangler 설치
npm install -g wrangler@latest

# 2. 로그인 확인
wrangler whoami

# 3. 버킷 생성 (최초 1회)
wrangler r2 bucket create [버킷명]

# 4. 파일 업로드 (핵심!)
wrangler r2 object put [버킷명]/[업로드할파일명] --file="[로컬파일경로]" --remote

# 5. 다운로드 링크 생성
wrangler r2 object presign [버킷명]/[파일명] --expires-in 604800
```

## 🌐 사용자 배포용 링크

### 임시 링크 (보안, 기간 제한)
- presign 명령어로 생성
- 1주일~1개월 유효
- 안전함

### 영구 링크 (Public 버킷)
- `https://pub-[계정ID].r2.dev/[파일명]`
- 영구적으로 접근 가능
- 누구나 다운로드 가능

---

## 💡 다음 업로드 시 간단 명령어

```bash
# OCT 앱 새 버전 업로드
cd electorn/OCT-Server
wrangler r2 object put contextor/OCT-Setup-[새버전].exe --file=".\release\build\Contextor Setup [버전].exe" --remote

# 다운로드 링크 생성
wrangler r2 object presign contextor/OCT-Setup-[새버전].exe --expires-in 604800
```

🎉 **이제 이 가이드만 따라하면 됩니다!** 