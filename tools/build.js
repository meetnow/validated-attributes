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
const flow = require('rollup-plugin-flow');
const babel = require('rollup-plugin-babel');
const cleanup = require('rollup-plugin-cleanup');

const defaultPresets = [
  ['env', { modules: false }]
];

const defaultPlugins = [
  'external-helpers',
  'transform-flow-strip-types',
  'transform-object-rest-spread',
  ['transform-builtin-extend', {
    globals: ['Error'],
    approximate: true,
  }],
];

const bundles = [
  {
    format: 'es',
    dest: 'lib/index.jsnext.js',
    presets: [],
  },
  {
    format: 'cjs',
    dest: 'lib/index.js',
  },
  {
    format: 'umd',
    dest: 'lib/index.browser.js',
  },
];

let p = Promise.resolve();

// Clean up
p = p.then(() => del(['lib/*']));

// Compile
p = bundles.reduce((p, def) => {
  let { dest, format, presets, plugins } = def;
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
          babel({
            babelrc: false,
            exclude: 'node_modules/**',
            presets,
            plugins,
          }),
          cleanup(),
        ],
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
