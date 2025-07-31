# 🐍 Electron Python 번들링 완벽 가이드

## 📋 개요

이 가이드는 **Electron React 보일러플레이트**에 **Python 3.10 embeddable**을 번들링하여 사용자가 Python을 별도로 설치하지 않고도 MCP 서버를 실행할 수 있도록 하는 방법을 설명합니다.

## 🎯 목표

- ✅ Python 3.10 embeddable 번들링
- ✅ pip, uv, MCP CLI 포함
- ✅ 사용자 별도 Python 설치 불필요
- ✅ 149MB 단일 인스톨러 생성

---

## 📂 1단계: Python 폴더 구조 준비

### 1.1 Python 폴더 생성
```bash
# OCT-Server 프로젝트 루트에서
mkdir python
```

### 1.2 Python 3.10 Embeddable 다운로드
```powershell
# PowerShell에서 실행
Invoke-WebRequest -Uri "https://www.python.org/ftp/python/3.10.11/python-3.10.11-embed-amd64.zip" -OutFile "python/python-3.10.11-embed-amd64.zip"
```

### 1.3 압축 해제 및 정리
```powershell
# 압축 해제
Expand-Archive -Path "python/python-3.10.11-embed-amd64.zip" -DestinationPath "python/python-3.10.11-embed-amd64"

# 파일들을 python 폴더로 이동
move "python/python-3.10.11-embed-amd64/*.*" "python/"

# 불필요한 폴더 및 파일 정리
rmdir "python/python-3.10.11-embed-amd64"
del "python/python-3.10.11-embed-amd64.zip"
```

---

## ⚙️ 2단계: Python 환경 설정

### 2.1 폴더 구조 생성
```powershell
mkdir "python/Scripts"
mkdir "python/Lib/site-packages"
```

### 2.2 Python 경로 설정 파일 수정
`python/python310._pth` 파일을 다음과 같이 수정:

```
python310.zip
.
Scripts
Lib/site-packages

# Uncomment to run site.main() automatically
import site
```

### 2.3 pip 설치
```powershell
# get-pip.py 다운로드
Invoke-WebRequest -Uri "https://bootstrap.pypa.io/get-pip.py" -OutFile "python/get-pip.py"

# pip 설치
python/python.exe python/get-pip.py
```

### 2.4 uv 및 MCP CLI 설치
```powershell
# uv 설치
python/python.exe -m pip install uv

# MCP CLI 설치
python/python.exe -m uv pip install "mcp[cli]"
```

### 2.5 설치 확인
```powershell
# pip 버전 확인
python/python.exe -m pip --version

# MCP CLI 확인
python/Scripts/mcp.exe --help
```

---

## 📦 3단계: Electron 번들링 설정

### 3.1 package.json 설정 업데이트
`package.json`의 `build.extraResources` 섹션에 Python 폴더 추가:

```json
{
  "build": {
    "extraResources": [
      "./assets/**",
      {
        "from": "python",
        "to": "python",
        "filter": [
          "**/*"
        ]
      }
    ]
  }
}
```

---

## 🧹 4단계: 캐시 정리 (필요 시)

### 4.1 Electron 관련 캐시 정리
```powershell
# npm 캐시 정리
Remove-Item -Recurse -Force "$env:APPDATA\npm-cache" -ErrorAction SilentlyContinue

# Electron 캐시 정리  
Remove-Item -Recurse -Force "$env:USERPROFILE\.electron" -ErrorAction SilentlyContinue

# Electron-builder 캐시 정리
Remove-Item -Recurse -Force "$env:USERPROFILE\AppData\Local\electron-builder\Cache" -ErrorAction SilentlyContinue
```

---

## 🚀 5단계: 최종 빌드

### 5.1 일반 빌드
```bash
npm run build
```

### 5.2 패키징
```bash
npm run package
```

### 5.3 권한 문제 해결 방법들

#### 방법 1: 서명 없이 빌드
```bash
npm run package -- --config.win.sign=false
```

#### 방법 2: 관리자 권한으로 실행
```powershell
# 관리자 권한 PowerShell에서
cd D:\Data\06_OCT\electorn\OCT-Server
npm run package
```

#### 방법 3: Developer Mode 활성화
```powershell
# Windows 개발자 모드 설정 열기
start ms-settings:developers
# "개발자 모드" 켜기
```

#### 방법 4: 테스트용 빌드 (압축 없음, 빠름)
```bash
npm run package -- --dir
```

---

## ✅ 6단계: 결과 확인

### 6.1 빌드 결과물 확인
```powershell
dir release/build
```

**기대 결과:**
- ✅ `Contextor Setup 0.0.1.exe` (약 149MB)
- ✅ `win-unpacked/` 폴더
- ✅ `latest.yml`, `.blockmap` 파일들

### 6.2 Python 번들링 확인
```powershell
dir release/build/win-unpacked/resources/python
```

**기대 결과:**
- ✅ `python.exe`
- ✅ `Scripts/` 폴더 (pip.exe, mcp.exe, uv.exe 포함)
- ✅ `Lib/site-packages/` 폴더
- ✅ 모든 Python 라이브러리들

---

## 🎯 최종 결과

### 사용자 경험
1. **간단한 설치**: `Contextor Setup 0.0.1.exe` 더블클릭
2. **Python 불필요**: 별도 Python 설치 없이 바로 사용
3. **MCP 서버 지원**: 앱에서 바로 Python MCP 서버 실행 가능

### 개발자 이점
- 🚀 **단일 배포**: 하나의 인스톨러로 모든 환경 해결
- 🔧 **환경 통일**: 모든 사용자가 동일한 Python 3.10 환경 사용
- 📦 **의존성 관리**: pip, uv, MCP CLI 모두 포함

---

## 🛠️ 트러블슈팅

### 문제 1: 심볼릭 링크 권한 오류
```
ERROR: Cannot create symbolic link : 클라이언트에 필요한 권한을 보유하지 않습니다
```

**해결책:**
1. 관리자 권한으로 PowerShell 실행
2. Windows Developer Mode 활성화: `start ms-settings:developers`
3. 서명 없이 빌드: `npm run package -- --config.win.sign=false`

### 문제 2: 빌드 시간이 너무 오래 걸림
```bash
# 테스트용 빠른 빌드 (압축 없음)
npm run package -- --dir
```

### 문제 3: 캐시 문제
```powershell
# 모든 캐시 정리 후 재빌드
Remove-Item -Recurse -Force "$env:APPDATA\npm-cache" -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force "$env:USERPROFILE\.electron" -ErrorAction SilentlyContinue
npm run package
```

---

## 📝 참고 자료

- [Electron Builder 공식 문서](https://www.electron.build/)
- [Python Embeddable 가이드](https://docs.python.org/3/using/windows.html#windows-embeddable)
- [MCP CLI 문서](https://modelcontextprotocol.io/)

---

## 🎉 완료!

이제 Python이 완전히 번들링된 Electron 앱이 완성되었습니다! 

**결과물**: `release/build/Contextor Setup 0.0.1.exe` (149MB)

사용자들은 이 파일 하나만 다운로드해서 설치하면 Python을 별도로 설치하지 않고도 모든 MCP 기능을 사용할 수 있습니다! 🚀 