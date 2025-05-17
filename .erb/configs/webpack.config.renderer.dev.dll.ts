/**
 * Builds the DLL for development electron renderer process
 */

import webpack from 'webpack';
import path from 'path';
import { merge } from 'webpack-merge';
import baseConfig from './webpack.config.base';
import webpackPaths from './webpack.paths';
import { dependencies } from '../../package.json';
import checkNodeEnv from '../scripts/check-node-env';

checkNodeEnv('development');

const dist = webpackPaths.dllPath;

// MCP SDK와 관련 패키지를 DLL에서 제외
const excludePackages = [
  '@modelcontextprotocol/sdk',
  '@xyflow/react', // XYFlow React도 렌더러 DLL에 포함할 필요 없으면 제외
  'type-fest', // type-fest 모듈 파싱 오류 방지
  'yaml', // yaml/browser → CJS로 alias 하지 않을 거면 제외
  'swagger-jsdoc', // swagger-jsdoc 의존성 제거
  'elkjs',
  // 추가적으로 문제가 되는 패키지 여기에 추가
];

// DLL에 포함될 패키지 필터링
// const dllDependencies = Object.keys(dependencies || {}).filter(
//   (dependency) => !excludePackages.includes(dependency),
// );


const dllDependencies = [
  ...Object.keys(dependencies || {}).filter(
    (dep) =>
      !excludePackages.includes(dep) &&
      dep !== 'react-router' &&
      dep !== '@react-router/dev',
  ),
];
// 'react-router'가 필요하고 아직 없다면 여기서 한 번만 추가
if (
  !dllDependencies.includes('react-router-dom') &&
  dependencies['react-router-dom']
) {
  dllDependencies.push('react-router-dom');
}

const configuration: webpack.Configuration = {
  context: webpackPaths.rootPath,

  devtool: 'eval',

  mode: 'development',

  target: 'electron-renderer',

  externals: [
    'fsevents',
    'crypto-browserify',
    ...excludePackages, // 제외할 패키지들을 externals에도 추가
  ],

  /**
   * Use *`module`* from *`webpack.config.renderer.dev.js`*
   */
  module: require('./webpack.config.renderer.dev').default.module,

  entry: {
    renderer: dllDependencies, // 필터링된 의존성 목록 사용
  },

  output: {
    path: dist,
    filename: '[name].dev.dll.js',
    library: {
      name: 'renderer',
      type: 'var',
    },
  },

  resolve: {
    // 필요한 경우 fallback 추가
    fallback: {
      path: false,
      fs: false,
      stream: false,
      buffer: false,
      util: false,
    },
  },

  plugins: [
    new webpack.DllPlugin({
      path: path.join(dist, '[name].json'),
      name: '[name]',
    }),

    /**
     * Create global constants which can be configured at compile time.
     *
     * Useful for allowing different behaviour between development builds and
     * release builds
     *
     * NODE_ENV should be production so that modules do not perform certain
     * development checks
     */
    new webpack.EnvironmentPlugin({
      NODE_ENV: 'development',
    }),

    new webpack.LoaderOptionsPlugin({
      debug: true,
      options: {
        context: webpackPaths.srcPath,
        output: {
          path: webpackPaths.dllPath,
        },
      },
    }),
  ],
};

export default merge(baseConfig, configuration);
