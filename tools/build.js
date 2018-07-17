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

const bundles = [
  {
    format: 'es',
    dest: 'lib/index.jsnext.js',
    transpile: false,
  },
  {
    format: 'cjs',
    dest: 'lib/index.js',
    transpile: true,
  },
  {
    format: 'umd',
    dest: 'lib/index.browser.js',
    transpile: true,
  },
];

const babelPlugins = [
  'external-helpers',
  'transform-flow-strip-types',
  'transform-class-properties',
  'transform-object-rest-spread',
  ['transform-builtin-extend', {
    globals: ['Error'],
    approximate: true,
  }],
];

let p = Promise.resolve();

// Clean up
p = p.then(() => del(['lib/*']));

// Compile
p = bundles.reduce(
  (p, def) =>
    p
      .then(() =>
        rollup.rollup({
          input: 'src/index.js',
          plugins: (def.transpile ? [
            babel({
              babelrc: false,
              exclude: 'node_modules/**',
              presets: [['env', { modules: false }]],
              plugins: babelPlugins,
            }),
            cleanup(),
          ] : [
            flow({ pretty: true }),
            cleanup(),
          ]),
        }))
      .then(bundle =>
        bundle.write({
          file: def.dest,
          format: def.format,
          sourcemap: true,
          name: def.format === 'umd' ? 'A' : undefined,
        })),
  p
);

p.catch(err => console.error(err.stack));
