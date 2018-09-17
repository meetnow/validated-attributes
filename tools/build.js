//
//  build.js
//  validated-attributes
//
//  Created by Patrick Schneider on 17.07.18.
//  Copyright (c) 2018 MeetNow! GmbH. All rights reserved.
//

'use strict';

const del = require('del');
const rollup = require('rollup');
const resolve = require('rollup-plugin-node-resolve');
const babel = require('rollup-plugin-babel');
const cleanup = require('rollup-plugin-cleanup');

const defaultPresets = [
  ['env', { modules: false }]
];

const defaultPlugins = [
  'external-helpers',
  'transform-flow-strip-types',
  'transform-object-rest-spread',
];

const bundles = [
  {
    format: 'es',
    dest: 'lib/index.jsnext.js',
    presets: [],
    external: ['es6-error'],
  },
  {
    format: 'cjs',
    dest: 'lib/index.js',
    external: ['es6-error'],
  },
  {
    format: 'umd',
    dest: 'lib/index.browser.js',
    external: [],
  },
];

let p = Promise.resolve();

// Clean up
p = p.then(() => del(['lib/*']));

// Compile
p = bundles.reduce((p, def) => {
  let { dest, format, presets, plugins, external } = def;
  if (presets == null) {
    presets = defaultPresets;
  }
  if (plugins == null) {
    plugins = defaultPlugins;
  }
  return p
    .then(() =>
      rollup.rollup({
        input: 'src/index.js',
        plugins: [
          resolve(),
          babel({
            babelrc: false,
            exclude: 'node_modules/**',
            presets,
            plugins,
          }),
          cleanup(),
        ],
        external,
      }))
    .then(bundle =>
      bundle.write({
        file: dest,
        format,
        sourcemap: true,
        name: format === 'umd' ? 'A' : undefined,
      }))
  },
  p
);

p.catch(err => console.error(err.stack));
