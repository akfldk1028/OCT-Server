/**
 * Webpack config for production electron main process
 */

import path from 'path';
import webpack from 'webpack';
import { merge } from 'webpack-merge';
import TerserPlugin from 'terser-webpack-plugin';
import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import CopyPlugin from 'copy-webpack-plugin';
import baseConfig from './webpack.config.base';
import webpackPaths from './webpack.paths';
import checkNodeEnv from '../scripts/check-node-env';
import deleteSourceMaps from '../scripts/delete-source-maps';

checkNodeEnv('production');
deleteSourceMaps();

// __dirname = .erb/configs (경로에 따라 조정)
// ../../../build 으로 올라가면 프로젝트 루트의 build 폴더
const libnutBinary = path.resolve(
  __dirname,
  '../../../build/libnut.node'
);

const configuration: webpack.Configuration = {
  devtool: 'source-map',
  mode: 'production',
  target: 'electron-main',

  entry: {
    main: path.join(webpackPaths.srcMainPath, 'main.ts'),
    preload: path.join(webpackPaths.srcMainPath, 'preload.ts'),
  },

  output: {
    path: webpackPaths.distMainPath,
    filename: '[name].js',
    library: {
      type: 'umd',
    },
  },

  optimization: {
    minimizer: [
      new TerserPlugin({
        parallel: true,
      }),
    ],
  },

  plugins: [
    new BundleAnalyzerPlugin({
      analyzerMode: process.env.ANALYZE === 'true' ? 'server' : 'disabled',
      analyzerPort: 8888,
    }),

    new webpack.EnvironmentPlugin({
      NODE_ENV: 'production',
      DEBUG_PROD: false,
      START_MINIMIZED: false,
    }),

    new webpack.DefinePlugin({
      'process.type': '"browser"',
    }),

    // ────────────────────────────────────
    // libnut.node 를 distMainPath 에 복사
    new CopyPlugin({
      patterns: [
        {
          from: libnutBinary,
          to: path.join(webpackPaths.distMainPath, 'libnut.node'),
        },
      ],
    }),
    // ────────────────────────────────────
  ],

  module: {
    rules: [
      // .node 바이너리를 require 가능하게 처리
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
//  * Webpack config for production electron main process
//  */
//
// import path from 'path';
// import webpack from 'webpack';
// import { merge } from 'webpack-merge';
// import TerserPlugin from 'terser-webpack-plugin';
// import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
// import baseConfig from './webpack.config.base';
// import webpackPaths from './webpack.paths';
// import checkNodeEnv from '../scripts/check-node-env';
// import deleteSourceMaps from '../scripts/delete-source-maps';
//
// checkNodeEnv('production');
// deleteSourceMaps();
//
// const configuration: webpack.Configuration = {
//   devtool: 'source-map',
//
//   mode: 'production',
//
//   target: 'electron-main',
//
//   entry: {
//     main: path.join(webpackPaths.srcMainPath, 'main.ts'),
//     preload: path.join(webpackPaths.srcMainPath, 'preload.ts'),
//   },
//
//   output: {
//     path: webpackPaths.distMainPath,
//     filename: '[name].js',
//     library: {
//       type: 'umd',
//     },
//   },
//
//   optimization: {
//     minimizer: [
//       new TerserPlugin({
//         parallel: true,
//       }),
//     ],
//   },
//
//   plugins: [
//     new BundleAnalyzerPlugin({
//       analyzerMode: process.env.ANALYZE === 'true' ? 'server' : 'disabled',
//       analyzerPort: 8888,
//     }),
//
//     /**
//      * Create global constants which can be configured at compile time.
//      *
//      * Useful for allowing different behaviour between development builds and
//      * release builds
//      *
//      * NODE_ENV should be production so that modules do not perform certain
//      * development checks
//      */
//     new webpack.EnvironmentPlugin({
//       NODE_ENV: 'production',
//       DEBUG_PROD: false,
//       START_MINIMIZED: false,
//     }),
//
//     new webpack.DefinePlugin({
//       'process.type': '"browser"',
//     }),
//   ],
//
//   /**
//    * Disables webpack processing of __dirname and __filename.
//    * If you run the bundle in node.js it falls back to these values of node.js.
//    * https://github.com/webpack/webpack/issues/2010
//    */
//   node: {
//     __dirname: false,
//     __filename: false,
//   },
// };
//
// export default merge(baseConfig, configuration);
