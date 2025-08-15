# 🚀 MCP 서버 자동화 테스트 실행 가이드

## 📋 목차
1. [사전 준비](#1-사전-준비)
2. [환경 설정](#2-환경-설정)
3. [단계별 테스트 실행](#3-단계별-테스트-실행)
4. [결과 확인](#4-결과-확인)
5. [문제 해결](#5-문제-해결)

---

## 1. 사전 준비

### ✅ 필수 요구사항 확인

**시스템 요구사항:**
- Node.js 18+ 설치됨
- NPX 사용 가능
- Python 3.8+ 설치됨 (선택사항)
- Git 설치됨

**데이터베이스 테이블:**
- `mcp_servers` - MCP 서버 기본 정보
- `mcp_configs` - 서버 설정 옵션 (크롤링 데이터)
- `user_mcp_usage` - 사용자 설치 기록
- `install_methods` - 설치 방법 정보
- `profiles` - 사용자 프로필

**확인 명령어:**
```bash
# Node.js 및 NPX 확인
node --version
npx --version

# Python 확인 (선택사항)
python --version
pip --version

# Git 확인
git --version
```

---

## 2. 환경 설정

### 📁 Step 1: 환경 설정 파일 생성

```bash
# Linux/Mac
cp scripts/.env.test scripts/.env.local

# Windows
copy scripts\.env.test scripts\.env.local
```

### ⚙️ Step 2: 환경 변수 설정

`scripts/.env.local` 파일을 열고 다음 값들을 실제 값으로 변경:

```bash
# Supabase 설정 (필수)
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here

# 테스트 사용자 ID (필수)
TEST_USER_ID=your-user-profile-id

# 테스트 설정 (선택사항)
MAX_SERVERS_TO_TEST=3
DELAY_BETWEEN_TESTS=3000
MAX_RETRIES=2
```

### 🔐 Step 3: 권한 확인

```bash
# 테스트 디렉토리 생성 권한 확인
mkdir -p reports
ls -la reports/

# Windows에서
mkdir reports
dir reports
```

---

## 3. 단계별 테스트 실행

### 🧪 Phase 1: 환경 호환성 테스트 (2-3분)

```bash
npm run test:mcp:bundling
```

**목적:** NPX/Python 환경이 올바르게 설정되었는지 확인
**예상 결과:** 시스템 요구사항 점검 리포트

### 🔍 Phase 2: 데이터베이스 검증 (1-2분)

```bash
npm run test:mcp:database
```

**목적:** DB 스키마, 외래키, 데이터 무결성 확인
**예상 결과:** 데이터베이스 상태 검증 리포트

### ⚡ Phase 3: 빠른 설치 테스트 (5-10분)

```bash
npm run test:mcp:quick
```

**목적:** 3개 서버로 빠른 설치/검증/제거 테스트
**예상 결과:** 기본 설치 기능 동작 확인

### 📊 Phase 4: 표준 테스트 (15-20분)

```bash
npm run test:mcp:enhanced
```

**목적:** 10개 서버로 종합적인 설치 테스트
**예상 결과:** 상세한 성능 및 안정성 분석

### 🎯 Phase 5: 종합 테스트 (30-45분)

```bash
npm run test:mcp:comprehensive
```

**목적:** 모든 테스트 모듈을 통합하여 최종 품질 검증
**예상 결과:** 경영진 리포트 및 배포 준비도 평가

---

## 4. 결과 확인

### 📄 생성되는 리포트 파일들

```
reports/
├── bundling-test-{timestamp}.json          # 환경 호환성
├── db-verification-{timestamp}.json        # DB 검증
├── enhanced-mcp-test-{timestamp}.json      # 표준 테스트
├── enhanced-mcp-test-{timestamp}.html      # HTML 리포트
├── comprehensive-{timestamp}/              # 종합 테스트
│   ├── comprehensive-report.json
│   ├── comprehensive-report.html
│   └── executive-summary.txt

logs/
├── mcp-test-{timestamp}-{id}.json          # 상세 실행 로그
├── mcp-test-{timestamp}-{id}-summary.txt   # 로그 요약
└── ... (테스트별 개별 로그 파일들)
```

### 📋 상세 로그 기능

**모든 테스트에서 자동 생성되는 로그:**
- **실시간 진행 상황**: 각 단계별 상세 로그
- **에러 상세 정보**: 스택 트레이스 및 컨텍스트
- **성능 메트릭**: 설치 시간, DB 쿼리 시간 등
- **콘솔 출력 캡처**: 모든 console.log 출력 저장
- **세션 정보**: 환경, 설정, 실행 시간 등

### 🎯 성공 기준

| 테스트 유형 | 성공 기준 | 비고 |
|-------------|-----------|------|
| 환경 호환성 | 80% 이상 | NPX/Python 정상 동작 |
| DB 검증 | 90% 이상 | 중요 실패 0개 |
| 설치 테스트 | 70% 이상 | 기본 설치 기능 동작 |
| 종합 평가 | READY 상태 | 배포 준비 완료 |

### 📊 결과 해석

**READY (준비 완료):**
- ✅ 운영 환경 배포 가능
- 모든 주요 테스트 통과

**CAUTION (주의 필요):**
- ⚠️ 일부 개선 후 배포 가능
- 비중요 문제들 해결 권장

**NOT_READY (배포 불가):**
- ❌ 중요한 문제 해결 필요
- 추가 개발/수정 후 재테스트

---

## 5. 문제 해결

### 🔧 일반적인 문제들

#### "환경변수 설정 오류"
```bash
# 문제: SUPABASE_URL이 설정되지 않음
# 해결: .env.local 파일 확인
cat scripts/.env.local
```

#### "NPX 명령어 실패"
```bash
# 문제: NPX가 설치되지 않음
# 해결: Node.js 재설치 또는 업데이트
npm install -g npx
```

#### "데이터베이스 연결 실패"
```bash
# 문제: Supabase 연결 불가
# 해결: URL 및 키 확인, 네트워크 점검
curl -I https://your-project.supabase.co
```

#### "권한 오류"
```bash
# 문제: 파일 생성 권한 없음
# 해결: 관리자 권한으로 실행 또는 권한 변경
sudo chmod 755 scripts/
```

### 🐛 디버깅 모드

상세한 로그가 필요한 경우:

```bash
# 디버그 모드로 실행
DEBUG_MODE=true VERBOSE_LOGGING=true npm run test:mcp:quick

# 상세 로깅이 포함된 테스트 실행
npm run test:mcp:enhanced:logged
npm run test:mcp:bundling
npm run test:mcp:database
npm run test:mcp:sequential
```

### 📋 로그 파일 확인 방법

**실행 후 로그 위치:**
```bash
# 로그 디렉토리 확인
ls -la logs/

# 최신 로그 파일 확인 (Windows)
dir logs\ /od

# 로그 요약 보기
cat logs/mcp-test-*-summary.txt
```

**로그 파일 내용:**
- **JSON 로그**: 모든 상세 정보 (프로그래밍 분석용)
- **요약 TXT**: 사람이 읽기 쉬운 형태 (문제 파악용)
- **오류 스택 트레이스**: 정확한 오류 위치 및 원인
- **성능 메트릭**: 각 단계별 소요 시간
- **환경 정보**: 실행 환경, Node.js 버전 등

### 📞 지원 요청

문제가 해결되지 않는 경우:

1. **로그 파일 확인**: `reports/` 폴더의 최신 파일
2. **환경 정보 수집**: 
   ```bash
   node --version
   npm --version
   echo $NODE_ENV
   ```
3. **오류 메시지 복사**: 전체 콘솔 출력
4. **스크린샷**: 오류 화면 또는 결과 화면

---

## 🚀 Windows 사용자를 위한 간편 실행

GUI 인터페이스를 원하시면:

```cmd
# Windows 명령 프롬프트에서
scripts\run-mcp-tests.bat
```

메뉴에서 원하는 테스트를 선택하여 실행할 수 있습니다.

---

## ⏱️ 예상 소요 시간

| 테스트 유형 | 소요 시간 | 추천 시점 |
|-------------|-----------|-----------|
| 환경 호환성 | 2-3분 | 개발 환경 최초 설정 시 |
| DB 검증 | 1-2분 | 스키마 변경 후 |
| 빠른 테스트 | 5-10분 | 일일 개발 중 |
| 표준 테스트 | 15-20분 | 주간 품질 점검 |
| 종합 테스트 | 30-45분 | 배포 전 최종 검증 |

---

## 📈 지속적 개선

테스트 결과를 바탕으로:

1. **성공률 모니터링**: 70% 미만 시 원인 분석
2. **성능 최적화**: 평균 설치 시간 단축
3. **새로운 MCP 서버 추가**: 테스트 커버리지 확장
4. **환경별 최적화**: Windows/Mac/Linux 호환성

---

**🎯 목표: 사용자가 오류 없이 MCP 서버를 설치할 수 있도록 보장**

*이 가이드를 따라 실행하시면 런칭 전에 모든 설치 시나리오를 검증할 수 있습니다.*