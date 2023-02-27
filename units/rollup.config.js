import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import { terser } from 'rollup-plugin-terser';
import json from '@rollup/plugin-json';
import { defineConfig } from 'rollup';
import dtsBundle from 'rollup-plugin-dts-bundle';
import typescript from 'rollup-plugin-typescript2';

const plugins = [
  resolve({
    preferBuiltins: false, // you need this one to avoid using node resolutions
    browser: true, // you need this to make sure node things in universal modules don't get included
  }),
  commonjs(),
  json(),
  //terser(),
];

const watch = {
  buildDelay: 200, // delay build until 200 ms after last change
  include: 'dist-browser/**/*.js',
  exclude: [
    'dist-browser/browser/bundle.mjs',
    'dist-browser/test/browser/bundle.mjs',
  ],
};

// use defineConfig to get typings in editor:
export default defineConfig([
  {
    input: 'dist-browser/browser/index.js',
    plugins: [
      ...plugins,
      //typescript(),
      dtsBundle({
        bundle: {
          name: '@modusjs/units',
          main: 'dist-browser/index.d.ts',
          out: 'bundle.d.ts',
        },
      }),
    ],
    watch,
    output: {
      file: 'dist-browser/bundle.mjs',
      format: 'esm',
      sourcemap: true,
    },
  },
  {
    input: 'dist-browser/test/browser/index.js',
    plugins,
    watch,
    output: {
      file: 'dist-browser/test/browser/bundle.mjs',
      format: 'esm',
      sourcemap: true,
    },
  },

  /*
  // Only build UMD bundle when not in watch
  {
    input: "dist/index.js",
    plugins: [ resolve() ],
    output: {
      file: "dist/index.umd.js",
      format: "umd",
    },
    watch: false,
  }
*/
]);