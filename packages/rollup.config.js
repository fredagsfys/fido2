import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import postcss from 'rollup-plugin-postcss';

const commonPlugins = [
  resolve(),
  postcss({
    inject: false,
    extract: 'base.css',
  }),
];

export default [
  // SDK bundle
  {
    input: 'sdk/index.ts',
    output: [
      {
        file: 'dist/sdk/index.js',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/sdk/index.mjs',
        format: 'es',
        sourcemap: true,
      },
      {
        file: 'dist/acme-pay.min.js',
        format: 'iife',
        name: 'ACME',
        sourcemap: true,
      },
    ],
    plugins: [
      ...commonPlugins,
      typescript({ tsconfig: './tsconfig.json' }),
    ],
  },
  // Web Component bundle
  {
    input: 'web-component/acme-pay.ts',
    output: [
      {
        file: 'dist/web-component/acme-pay.js',
        format: 'cjs',
        sourcemap: true,
      },
      {
        file: 'dist/web-component/acme-pay.mjs',
        format: 'es',
        sourcemap: true,
      },
    ],
    plugins: [
      ...commonPlugins,
      typescript({ tsconfig: './tsconfig.json' }),
    ],
  },
];
