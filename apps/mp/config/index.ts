import path from 'node:path';
import { defineConfig } from '@tarojs/cli';

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
