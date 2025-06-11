import 'webpack-dev-server';
import path from 'path';
import fs from 'fs';
import webpack from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import chalk from 'chalk';
import { merge } from 'webpack-merge';
import { execSync, spawn } from 'child_process';
import ReactRefreshWebpackPlugin from '@pmmmwh/react-refresh-webpack-plugin';
import baseConfig from './webpack.config.base';
import webpackPaths from './webpack.paths';
import checkNodeEnv from '../scripts/check-node-env';

// When an ESLint server is running, we can't set the NODE_ENV so we'll check if it's
// at the dev webpack config is not accidentally run in a production environment
if (process.env.NODE_ENV === 'production') {
  checkNodeEnv('development');
}

// 웹 모드 확인 (PLATFORM 환경변수 체크)
const isWebMode = process.env.PLATFORM === 'web';

const port = process.env.PORT || (isWebMode ? 3000 : 1212);
const manifest = path.resolve(webpackPaths.dllPath, 'renderer.json');
const skipDLLs =
  module.parent?.filename.includes('webpack.config.renderer.dev.dll') ||
  module.parent?.filename.includes('webpack.config.eslint');

/**
 * Warn if the DLL is not built
 */
if (
  !skipDLLs &&
  !(fs.existsSync(webpackPaths.dllPath) && fs.existsSync(manifest))
) {
  console.log(
    chalk.black.bgYellow.bold(
      'The DLL files are missing. Sit back while we build them for you with "npm run build-dll"',
    ),
  );
  execSync('npm run postinstall');
}

const configuration: webpack.Configuration = {
  // ───────────────────────────────────────────────────────────────────────────────
  // 1) .node 확장자를 인식하도록 extensions에 추가
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json', '.node'],
    fallback: {
      fs: false,                                      // 브라우저에서 fs 무시
      path: require.resolve('path-browserify'),       // path 대체
      electron: false,                                // electron 모듈 무시
    },
    alias: {
      fs: false,
      path: false,
      electron: false,
    },
  },

  // ───────────────────────────────────────────────────────────────────────────────
  // 2) externals를 배열로 지정하고 .node 파일은 런타임 require 처리
  externals: [
    'electron',                       // 기존 electron require 처리
    'fsevents',
    'crypto-browserify',
    /\.node$/,                        // 네이티브 .node 바이너리 제외
  ],

  devtool: 'inline-source-map',
  mode: 'development',

  // 웹 모드일 때는 'web'만, Electron 모드일 때는 web + electron-renderer
  target: isWebMode ? ['web'] : ['web', 'electron-renderer'],

  entry: [
    `webpack-dev-server/client?http://localhost:${port}/dist`,
    'webpack/hot/only-dev-server',
    path.join(webpackPaths.srcRendererPath, 'index.tsx'),
  ],

  output: {
    path: webpackPaths.distRendererPath,
    publicPath: '/',
    filename: 'renderer.dev.js',
    library: {
      type: 'umd',
    },
  },

  // ───────────────────────────────────────────────────────────────────────────────
  // 3) module.rules 배열 맨 뒤에 node-loader 룰을 추가
  module: {
    rules: [
      {
        test: /\.s?(c|a)ss$/,
        use: [
          'style-loader',
          {
            loader: 'css-loader',
            options: {
              modules: true,
              sourceMap: true,
              importLoaders: 1,
            },
          },
          'sass-loader',
        ],
        include: /\.module\.s?(c|a)ss$/,
      },
      {
        test: /\.s?css$/,
        use: [
          'style-loader',
          'css-loader',
          'sass-loader',
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: [require('tailwindcss'), require('autoprefixer')],
              },
            },
          },
        ],
        exclude: /\.module\.s?(c|a)ss$/,
      },
      // Fonts
      {
        test: /\.(woff|woff2|eot|ttf|otf)$/i,
        type: 'asset/resource',
      },
      // Images
      {
        test: /\.(png|jpg|jpeg|gif)$/i,
        type: 'asset/resource',
      },
      // SVG
      {
        test: /\.svg$/,
        use: [
          {
            loader: '@svgr/webpack',
            options: {
              prettier: false,
              svgo: false,
              svgoConfig: {
                plugins: [{ removeViewBox: false }],
              },
              titleProp: true,
              ref: true,
            },
          },
          'file-loader',
        ],
      },

      // ← 여기에 추가된 node-loader 룰
      {
        test: /\.node$/,
        use: 'node-loader',
      },
    ],
  },

  plugins: [
    ...(skipDLLs
      ? []
      : [
          new webpack.DllReferencePlugin({
            context: webpackPaths.dllPath,
            manifest: require(manifest),
            sourceType: 'var',
          }),
        ]),

    new webpack.NoEmitOnErrorsPlugin(),

    new webpack.EnvironmentPlugin({
      NODE_ENV: 'development',
      PLATFORM: isWebMode ? 'web' : 'electron',
    }),

    new webpack.LoaderOptionsPlugin({
      debug: true,
    }),

    new ReactRefreshWebpackPlugin(),

    new HtmlWebpackPlugin({
      filename: path.join('index.html'),
      template: path.join(webpackPaths.srcRendererPath, 'index.ejs'),
      minify: {
        collapseWhitespace: true,
        removeAttributeQuotes: true,
        removeComments: true,
      },
      isBrowser: isWebMode,
      env: process.env.NODE_ENV,
      isDevelopment: process.env.NODE_ENV !== 'production',
      nodeModules: webpackPaths.appNodeModulesPath,
    }),
  ],

  node: {
    __dirname: false,
    __filename: false,
  },

  devServer: {
    port,
    compress: true,
    hot: true,
    headers: { 'Access-Control-Allow-Origin': '*' },
    static: {
      publicPath: '/',
    },
    historyApiFallback: {
      verbose: true,
    },
    setupMiddlewares(middlewares) {
      if (!isWebMode) {
        console.log('Starting preload.js builder...');
        const preloadProcess = spawn('npm', ['run', 'start:preload'], {
          shell: true,
          stdio: 'inherit',
        })
          .on('close', (code: number) => process.exit(code!))
          .on('error', (spawnError) => console.error(spawnError));

        console.log('Starting Main Process...');
        let args = ['run', 'start:main'];
        if (process.env.MAIN_ARGS) {
          args = args.concat(
            ['--', ...process.env.MAIN_ARGS.matchAll(/"[^"]+"|[^\s"]+/g)].flat(),
          );
        }
        spawn('npm', args, {
          shell: true,
          stdio: 'inherit',
        })
          .on('close', (code: number) => {
            preloadProcess.kill();
            process.exit(code!);
          })
          .on('error', (spawnError) => console.error(spawnError));
      } else {
        console.log('🌐 Running in web mode - Electron processes skipped');
      }
      return middlewares;
    },
  },
};

export default merge(baseConfig, configuration);
