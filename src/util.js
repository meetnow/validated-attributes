//
//  util.js
//  validated-attributes
//
//  Created by Patrick Schneider on 17.07.18.
//  Copyright (c) 2018 MeetNow! GmbH. All rights reserved.
//
// @flow
//

const typeConversion = {
  undefined: 'undefined',
  number: 'number',
  boolean: 'boolean',
  string: 'string',
  function: 'function',
  '[object Function]': 'function',
  '[object RegExp]': 'regexp',
  '[object Array]': 'array',
  '[object Date]': 'date',
  '[object Error]': 'error',
  '[object Null]': 'null',
  '[object Symbol]': 'symbol',
};

const objToString = Object.prototype.toString;

const objHasOwnProperty = Object.prototype.hasOwnProperty;

export function typeofPlus(x: mixed): string {
  return typeConversion[typeof x] || typeConversion[objToString.call(x)] || (x ? 'object' : 'null');
}

export function hasOwnProperty(obj: Object, name: string): boolean {
  return objHasOwnProperty.call(obj, name);
}

/**
 Variant of Object.assign to be consistent across implementations
 */
export function assign(obj: Object, source: ?Object): Object {
  if (source != null) {
    for (const key in source) {
      if (hasOwnProperty(source, key)) {
        obj[key] = source[key]; // eslint-disable-line no-param-reassign
      }
    }
  }
  return obj;
}

/**
 Variant of Object.keys to be consistent across implementations
 */
export function keys(obj: Object): Array<string> {
  if (typeof obj !== 'function' && (typeof obj !== 'object' || obj === null)) {
    throw new TypeError('Object.keys called on non-object');
  }
  const result = [];
  for (const key in obj) {
    if (hasOwnProperty(obj, key)) {
      result.push(key);
    }
  }
  return result;
}

/**
 A variant of the NodeJS' inspect function for internal use
 */
export function inspect(value: any, depth: number = 3) {
  let isArray;
  switch (typeofPlus(value)) {
    case 'undefined':
      return 'undefined';
    case 'number':
      return value.toString();
    case 'boolean':
      return (value ? 'true' : 'false');
    case 'string':
      return `'${JSON.stringify(value).replace(/^"|"$/g, '').replace(/'/g, "\\'").replace(/\\"/g, '"')}'`;
    case 'function':
      return (value.name ? `[Function: ${value.name}]` : '[Function]');
    case 'regexp':
      return RegExp.prototype.toString.call(value);
    case 'array':
      isArray = true;
      break;
    case 'date':
      return Date.prototype.toString.call(value);
    case 'error':
      return `[${Error.prototype.toString.call(value)}]`;
    case 'null':
      return 'null';
    case 'symbol':
      return Symbol.prototype.toString.call(value);
    default:
      isArray = false;
      break;
  }

  if (depth === -1) {
    if (isArray) {
      return '[Array]';
    }
    else {
      return '[Object]';
    }
  }

  const contents = [];
  if (isArray) {
    for (let i = 0, l = value.length; i < l; ++i) {
      contents.push(inspect(value[i], depth - 1));
    }
    return `[ ${contents.join(', ')} ]`;
  }
  else {
    keys(value).forEach((key) => {
      let name = JSON.stringify(key);
      if (name.match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)) {
        name = name.substr(1, name.length - 2);
      }
      else {
        name = name.replace(/'/g, "\\'").replace(/\\"/g, '"').replace(/(^"|"$)/g, "'");
      }
      contents.push(`${name}: ${inspect(value[key], depth - 1)}`);
    });
    return `{ ${contents.join(', ')} }`;
  }
}
