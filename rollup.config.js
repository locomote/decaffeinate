/**
 * NOTE: This file must only use node v0.12 features + ES modules.
 */

import babel from 'rollup-plugin-babel';
import json from 'rollup-plugin-json';
import babelrc from 'babelrc-rollup';

const pkg = require('./package.json');
const external = Object.keys(pkg.dependencies).concat(['path', 'fs']);

export default {
  entry: 'src/index.js',
  plugins: [
    json(),
    babel(babelrc())
  ],
  external: external,
  targets: [
    {
      format: 'cjs',
      dest: pkg['main']
    },
    {
      format: 'es6',
      dest: pkg['jsnext:main']
    }
  ]
};
