<img src=".erb/img/erb-banner.svg" width="100%" />

<br>

<p>
  Electron React Boilerplate uses <a href="https://electron.atom.io/">Electron</a>, <a href="https://facebook.github.io/react/">React</a>, <a href="https://github.com/reactjs/react-router">React Router</a>, <a href="https://webpack.js.org/">Webpack</a> and <a href="https://www.npmjs.com/package/react-refresh">React Fast Refresh</a>.
</p>

<br>

## Maintainers

- [Amila Welihinda](https://github.com/amilajack)
- [John Tran](https://github.com/jooohhn)
- [C. T. Lin](https://github.com/chentsulin)
- [Jhen-Jie Hong](https://github.com/jhen0409)

## License

MIT © [Electron React Boilerplate](https://github.com/electron-react-boilerplate)

## 멀티 플랫폼 지원 (Web + Electron)

이 프로젝트는 일렉트론 데스크톱 앱과 웹 애플리케이션을 동시에 개발할 수 있도록 구성되어 있습니다.

### 웹 모드로 실행하기

웹 모드로 애플리케이션을 실행하려면 다음 명령어를 사용합니다:

```bash
npm run start:web
```

이 명령어는 브라우저에서 실행되는 웹 애플리케이션 모드로 실행됩니다. 기본적으로 `http://localhost:3000`에서 접근할 수 있습니다.

### 일렉트론 모드로 실행하기

일렉트론 데스크톱 앱 모드로 실행하려면 다음 명령어를 사용합니다:

```bash
npm start
```

### 빌드하기

#### 웹 애플리케이션 빌드

웹 애플리케이션으로 빌드하려면 다음 명령어를 사용합니다:

```bash
npm run build:web
```

빌드 결과물은 `dist/renderer` 디렉토리에 생성됩니다.

#### 일렉트론 애플리케이션 빌드

일렉트론 애플리케이션으로 빌드하려면 다음 명령어를 사용합니다:

```bash
npm run package
```

### 플랫폼별 라우팅

코드에서 현재 실행 환경을 감지하려면 `src/renderer/utils/environment.ts`에 있는 유틸리티 함수를 사용합니다:

```typescript
import { isElectron, IS_ELECTRON, IS_WEB } from './utils/environment';

// 조건부 렌더링 예시
{IS_ELECTRON && <ElectronOnlyComponent />}
{IS_WEB && <WebOnlyComponent />}
```

플랫폼별 라우팅은 `src/renderer/utils/router.ts`에서 관리됩니다.

[github-actions-status]: https://github.com/electron-react-boilerplate/electron-react-boilerplate/workflows/Test/badge.svg
[github-actions-url]: https://github.com/electron-react-boilerplate/electron-react-boilerplate/actions
[github-tag-image]: https://img.shields.io/github/tag/electron-react-boilerplate/electron-react-boilerplate.svg?label=version
[github-tag-url]: https://github.com/electron-react-boilerplate/electron-react-boilerplate/releases/latest
[stackoverflow-img]: https://img.shields.io/badge/stackoverflow-electron_react_boilerplate-blue.svg
[stackoverflow-url]: https://stackoverflow.com/questions/tagged/electron-react-boilerplate
