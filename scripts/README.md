# MCP 서버 자동화 설치 테스트 시스템

이 시스템은 MCP (Model Context Protocol) 서버들의 설치 과정을 자동으로 테스트하여 런칭 전에 오류 없는 설치를 보장합니다.

## 📋 목표

- **런칭 전 품질 보증**: 사용자가 경험할 수 있는 설치 오류를 사전에 발견
- **순차적 테스트**: 여러 MCP 서버를 하나씩 설치/검증/제거하는 전체 사이클 테스트
- **환경별 테스트**: NPX 및 Python 번들링 환경 집중 테스트 (Docker 제외)
- **자동화된 리포트**: 상세한 성공/실패 통계 및 HTML 리포트 생성

## 🚀 빠른 시작

### 1. 환경 설정

```bash
# 환경변수 파일 복사 및 설정
cp scripts/.env.test scripts/.env.local
# scripts/.env.local 파일을 열어서 실제 값으로 수정
```

### 2. 빠른 테스트 (3개 서버)

```bash
npm run test:mcp:quick
```

### 3. 일반 테스트 (10개 서버)

```bash
npm run test:mcp:enhanced
```

### 4. 전체 테스트 (20개 서버)

```bash
npm run test:mcp:full
```

## 🔧 테스트 명령어

| 명령어 | 설명 | 서버 수 | 소요 시간 |
|--------|------|---------|-----------|
| `npm run test:mcp:quick` | 빠른 테스트 | 3개 | ~5분 |
| `npm run test:mcp:enhanced` | 표준 테스트 | 10개 | ~15분 |
| `npm run test:mcp:full` | 전체 테스트 | 20개 | ~30분 |

## 📊 테스트 과정

각 MCP 서버에 대해 다음 단계를 순차적으로 실행합니다:

1. **설치 시도**: NPX 또는 Python 방법으로 실제 설치 수행
2. **DB 검증**: `user_mcp_usage` 테이블에 설치 기록이 올바르게 저장되었는지 확인
3. **정리**: 설치된 서버를 DB에서 제거하여 다음 테스트를 위한 클린 상태 유지
4. **결과 기록**: 각 단계의 성공/실패, 소요 시간, 오류 메시지 저장

## 📈 리포트

테스트 완료 후 다음 파일들이 생성됩니다:

- **JSON 리포트**: `reports/enhanced-mcp-test-{timestamp}.json`
- **HTML 리포트**: `reports/enhanced-mcp-test-{timestamp}.html`

### HTML 리포트 포함 내용

- 📊 전체 성공률 및 통계
- 🔧 설치 방법별 성공/실패 현황
- ⚡ 성능 통계 (설치 시간 등)
- ⚠️ 주요 오류 분석
- 📋 상세 테스트 결과 테이블

## ⚙️ 설정 옵션

### 환경변수

```bash
# 테스트할 최대 서버 수
MAX_SERVERS_TO_TEST=10

# 테스트 간 대기 시간 (밀리초)
DELAY_BETWEEN_TESTS=3000

# 실패 시 최대 재시도 횟수
MAX_RETRIES=2

# 설치 타임아웃 (밀리초)
TEST_TIMEOUT=120000

# 테스트 사용자 ID
TEST_USER_ID=test-user-id

# Supabase 설정
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-anon-key
```

### 설정 파일

`scripts/mcp-test-config.json`에서 더 세부적인 설정을 조정할 수 있습니다:

- 우선순위 서버 목록
- 제외할 서버 목록
- 성능 임계값
- 리포트 옵션

## 🔍 시스템 요구사항

테스트 실행 전에 다음 도구들이 설치되어 있어야 합니다:

- **Node.js & NPX**: NPX 방법 테스트용
- **Python & Pip**: Python 패키지 설치 테스트용

시스템이 자동으로 요구사항을 확인하고 누락된 도구를 알려줍니다.

## 📝 테스트 결과 해석

### 성공률 기준

- **70% 이상**: ✅ 양호 (런칭 가능)
- **50-70%**: ⚠️ 주의 (일부 수정 필요)
- **50% 미만**: ❌ 위험 (대대적인 수정 필요)

### 일반적인 실패 원인

1. **네트워크 타임아웃**: 패키지 다운로드 실패
2. **의존성 충돌**: 기존 패키지와의 버전 충돌
3. **권한 오류**: 설치 권한 부족
4. **잘못된 설정**: 부정확한 패키지명 또는 명령어

## 🛠️ 고급 사용법

### 사용자 정의 테스트

특정 서버만 테스트하고 싶다면:

```bash
# 환경변수로 필터링
FILTER_SERVERS="file-manager,git-integration" npm run test:mcp:enhanced
```

### 디버그 모드

상세한 로그를 보고 싶다면:

```bash
DEBUG_MODE=true VERBOSE_LOGGING=true npm run test:mcp:enhanced
```

### CI/CD 통합

GitHub Actions 등에서 사용할 때:

```bash
# 실패 시 exit code 1로 종료
npm run test:mcp:enhanced
if [ $? -ne 0 ]; then
  echo "MCP 설치 테스트 실패!"
  exit 1
fi
```

## 🏗️ 아키텍처

### 핵심 파일

- `test-mcp-installations.ts`: 기본 테스트 시스템
- `enhanced-mcp-tester.ts`: 향상된 테스트 시스템 (권장)
- `real-mcp-installer.ts`: 실제 설치 로직
- `mcp-test-config.json`: 설정 파일

### 데이터베이스 테이블

- `mcp_servers`: 사용 가능한 MCP 서버 정보
- `mcp_configs`: 서버별 설치 방법 정보
- `user_mcp_usage`: 사용자별 설치 기록

## 🤝 기여 방법

새로운 테스트 케이스나 개선사항이 있다면:

1. 브랜치 생성: `git checkout -b feature/test-improvements`
2. 변경사항 커밋: `git commit -m "Add new test cases"`
3. 풀 리퀘스트 생성

## ⚠️ 주의사항

- **테스트 환경**: 실제 패키지를 설치하므로 테스트 전용 환경에서 실행 권장
- **네트워크 연결**: 인터넷 연결이 필요합니다
- **권한**: 패키지 설치 권한이 필요할 수 있습니다
- **리소스**: 대량 테스트 시 시스템 리소스를 많이 사용할 수 있습니다

## 📞 문의

이 테스트 시스템에 대한 문의사항이나 개선 제안이 있으시면 팀에 연락해 주세요.

---

*이 테스트 시스템은 사용자에게 안정적인 MCP 서버 설치 경험을 제공하기 위해 개발되었습니다.*