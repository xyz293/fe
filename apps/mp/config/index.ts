import path from 'node:path';
import { defineConfig } from '@tarojs/cli';

const isH5 = process.env.TARO_ENV === 'h5';
// 编译期替换 process.env.TARO_APP_*，避免产物残留 process 引用（小程序运行时无 process 对象）
const defineConstants = {
  'process.env.TARO_APP_API_BASE_URL': JSON.stringify(process.env.TARO_APP_API_BASE_URL || (isH5 ? '/api' : 'http://localhost:8080/api')),
  'process.env.TARO_APP_TRACK_BASE_URL': JSON.stringify(process.env.TARO_APP_TRACK_BASE_URL || (isH5 ? '/api' : 'http://localhost:8080/api')),
};

export default defineConfig({
  projectName: 'xiaoa-mp',
  date: '2026-09-23',
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2,
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  defineConstants,
  framework: 'react',
  compiler: 'webpack5',
  compile: {
    include: [path.resolve(__dirname, '../../../share/src')],
  },
  mini: {
    postcss: {
      pxtransform: {
        enable: true,
      },
      cssModules: {
        enable: false,
      },
    },
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
  },
});
