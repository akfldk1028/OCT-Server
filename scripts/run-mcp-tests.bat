@echo off
:: MCP 서버 자동화 설치 테스트 실행 스크립트
setlocal enabledelayedexpansion

echo.
echo ========================================
echo MCP 서버 자동화 설치 테스트
echo ========================================
echo.

:: 현재 디렉토리를 프로젝트 루트로 변경
cd /d "%~dp0\.."

:: 환경변수 설정 확인
if not exist "scripts\.env.local" (
    echo ⚠️ 환경변수 파일이 없습니다.
    echo scripts\.env.test를 scripts\.env.local로 복사하고 설정을 수정해주세요.
    echo.
    echo 복사 중...
    copy "scripts\.env.test" "scripts\.env.local"
    echo.
    echo ✅ scripts\.env.local 파일이 생성되었습니다.
    echo 파일을 수정한 후 다시 실행해주세요.
    echo.
    pause
    exit /b 1
)

:: 테스트 유형 선택
echo 테스트 유형을 선택하세요:
echo.
echo 1. 빠른 테스트 (3개 서버, ~5분)
echo 2. 표준 테스트 (10개 서버, ~15분)  
echo 3. 전체 테스트 (20개 서버, ~30분)
echo 4. 종합 테스트 (모든 모듈, ~45분)
echo 5. 환경 호환성 테스트
echo 6. 데이터베이스 검증
echo 7. 사용자 정의
echo.
set /p choice="선택 (1-7): "

:: reports 디렉토리 생성
if not exist "reports" mkdir reports

:: 환경변수 로드
for /f "tokens=1,2 delims==" %%a in (scripts\.env.local) do (
    if not "%%a"=="" if not "%%a:~0,1%"=="#" (
        set %%a=%%b
    )
)

:: 테스트 실행
echo.
echo 🚀 테스트 시작...
echo 📊 환경: %NODE_ENV%
echo 👤 사용자 ID: %TEST_USER_ID%
echo.

if "%choice%"=="1" (
    echo ⚡ 빠른 테스트 실행 중...
    call npm run test:mcp:quick
) else if "%choice%"=="2" (
    echo 📊 표준 테스트 실행 중...
    call npm run test:mcp:enhanced
) else if "%choice%"=="3" (
    echo 🔥 전체 테스트 실행 중...
    call npm run test:mcp:full
) else if "%choice%"=="4" (
    echo 🎯 종합 테스트 실행 중 (모든 모듈)...
    call npm run test:mcp:comprehensive
) else if "%choice%"=="5" (
    echo 🧪 환경 호환성 테스트 실행 중...
    call npm run test:mcp:bundling
) else if "%choice%"=="6" (
    echo 🔍 데이터베이스 검증 실행 중...
    call npm run test:mcp:database
) else if "%choice%"=="7" (
    echo.
    set /p custom_count="테스트할 서버 수를 입력하세요: "
    echo 🎯 사용자 정의 테스트 실행 중 (!custom_count!개 서버)...
    set MAX_SERVERS_TO_TEST=!custom_count!
    call npm run test:mcp:enhanced
) else (
    echo ❌ 잘못된 선택입니다.
    goto :EOF
)

:: 결과 확인
echo.
if %ERRORLEVEL% equ 0 (
    echo ✅ 테스트가 성공적으로 완료되었습니다!
    echo.
    echo 📄 리포트 파일:
    for %%f in (reports\*.html) do (
        echo    HTML: %%f
    )
    for %%f in (reports\*.json) do (
        echo    JSON: %%f
    )
    echo.
    set /p open_report="HTML 리포트를 여시겠습니까? (y/n): "
    if /i "!open_report!"=="y" (
        for %%f in (reports\enhanced-mcp-test-*.html) do (
            echo 📂 리포트 열기: %%f
            start "" "%%f"
            goto :report_opened
        )
        :report_opened
    )
) else (
    echo ❌ 테스트 실행 중 오류가 발생했습니다.
    echo 📋 로그를 확인하여 문제를 파악해주세요.
)

echo.
echo 🏁 완료!
pause