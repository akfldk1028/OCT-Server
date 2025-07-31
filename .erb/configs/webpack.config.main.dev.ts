/**
 * Webpack config for development electron main process
 */

import path from 'path';
import webpack from 'webpack';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import { merge } from 'webpack-merge';
import checkNodeEnv from '../scripts/check-node-env';
import baseConfig from './webpack.config.base';
import webpackPaths from './webpack.paths';
import CopyPlugin from 'copy-webpack-plugin';

if (process.env.NODE_ENV === 'production') {
  checkNodeEnv('development');
}

// 실제 libnut.node 바이너리 위치 (환경에 맞게 한 번만 확인)
const libnutBinary = path.resolve(
  __dirname,
  '../../../build/libnut.node'
);

const configuration: webpack.Configuration = {
  // 소스맵 켜기
  devtool: 'inline-source-map',
  mode: 'development',
  target: 'electron-main',

  entry: {
    main: path.join(webpackPaths.srcMainPath, 'main.ts'),
    preload: path.join(webpackPaths.srcMainPath, 'preload.ts'),
  },

  output: {
    path: webpackPaths.dllPath,
    filename: '[name].bundle.dev.js',
    library: { type: 'umd' },
  },

  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: process.env.ANALYZE === 'true' ? 'server' : 'disabled',
      analyzerPort: 8888,
    }),
    new webpack.DefinePlugin({ 'process.type': '"browser"' }),

    // ────────────────────────────────────
    // libnut.node 를 .erb/dll 과 build 폴더 두 곳에 복사
    new CopyPlugin({
      patterns: [
        {
          from: libnutBinary,
          to: path.join(webpackPaths.dllPath, 'libnut.node'),
        },
        {
          from: libnutBinary,
          to: path.resolve(__dirname, '../../build/libnut.node'),
        },
      ],
    }),
    // ────────────────────────────────────
  ],

  module: {
    rules: [
      // .node 바이너리를 node-loader 로 require 가능하게 처리
      {
        test: /\.node$/,
        use: 'node-loader',
      },
    ],
  },

  node: {
    __dirname: false,
    __filename: false,
  },

  // .node 파일은 번들에 포함하지 않고 런타임 require
  externals: [
    /\.node$/,
    {
      morgan: 'commonjs morgan',
      'swagger-ui-express': 'commonjs swagger-ui-express',
      'swagger-jsdoc': 'commonjs swagger-jsdoc',
      'spawn-rx': 'commonjs spawn-rx',
      'win32-api': 'commonjs win32-api',
      'koffi': 'commonjs koffi',
      'ref-napi': 'commonjs ref-napi',
      'windows-api': 'commonjs windows-api',
    },
  ],
};

export default merge(baseConfig, configuration);



// /**
//  * Webpack config for development electron main process
//  */

// import path from 'path';
// import webpack from 'webpack';
// import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
// import { merge } from 'webpack-merge';
// import checkNodeEnv from '../scripts/check-node-env';
// import baseConfig from './webpack.config.base';
// import webpackPaths from './webpack.paths';

// // When an ESLint server is running, we can't set the NODE_ENV so we'll check if it's
// // at the dev webpack config is not accidentally run in a production environment
// if (process.env.NODE_ENV === 'production') {
//   checkNodeEnv('development');
// }

// const configuration: webpack.Configuration = {
//   devtool: 'inline-source-map',

//   mode: 'development',

//   target: 'electron-main',

//   entry: {
//     main: path.join(webpackPaths.srcMainPath, 'main.ts'),
//     preload: path.join(webpackPaths.srcMainPath, 'preload.ts'),
//   },

//   output: {
//     path: webpackPaths.dllPath,
//     filename: '[name].bundle.dev.js',
//     library: {
//       type: 'umd',
//     },
//   },

//   plugins: [
//     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//     // @ts-ignore
//     new BundleAnalyzerPlugin({
//       analyzerMode: process.env.ANALYZE === 'true' ? 'server' : 'disabled',
//       analyzerPort: 8888,
//     }),

//     new webpack.DefinePlugin({
//       'process.type': '"browser"',
//     }),
//   ],

//   /**
//    * Disables webpack processing of __dirname and __filename.
//    * If you run the bundle in node.js it falls back to these values of node.js.
//    * https://github.com/webpack/webpack/issues/2010
//    */
//   node: {
//     __dirname: false,
//     __filename: false,
//   },
//   externals: {
//     'morgan': 'commonjs morgan',
//     'swagger-ui-express': 'commonjs swagger-ui-express',
//     'swagger-jsdoc': 'commonjs swagger-jsdoc',
//     'spawn-rx': 'commonjs spawn-rx',
//      },
// };

// export default merge(baseConfig, configuration);


