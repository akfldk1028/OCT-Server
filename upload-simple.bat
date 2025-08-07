@echo off
chcp 65001 >nul
title Contextor 업로드

echo.
echo 🚀 Contextor 앱 R2 업로드 (간단 버전)
echo ==========================================

REM 여기서 버전 수정하세요!
set "VERSION=0.0.1"
set "FILENAME=Contextor-Setup-v%VERSION%.exe"

echo 📅 파일명: %FILENAME%
echo ⚠️  버전 변경시 위 VERSION=0.0.1 수정하세요
echo.

REM 파일 확인
set "BUILD_FILE=.\release\build\Contextor Setup 0.0.1.exe"
if not exist "%BUILD_FILE%" (
    echo ❌ 빌드 파일 없음: %BUILD_FILE%
    pause
    exit /b 1
)

echo ✅ 빌드 파일 OK
echo.

REM 업로드
echo 🚀 업로드 중...
wrangler r2 object put contextor/%FILENAME% --file="%BUILD_FILE%" --remote

echo.
echo ✅ 업로드 완료!
echo 📁 파일: %FILENAME%
echo 🔗 다운로드: https://pub-[계정ID].r2.dev/%FILENAME%
echo.
pause