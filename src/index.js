//
//  index.js
//  validated-attributes
//
//  Created by Patrick Schneider on 17.05.17.
//  Copyright (c) 2017-2018 MeetNow! GmbH. All rights reserved.
//
// @flow
//

import { AttributeValidationError, Attribute } from './base';

import { FixedAttribute, ObjectAttribute } from './simple';

import {
  EnumAttribute,
  TupleAttribute,
  CompoundAttribute,
  SchemaAttribute,
  toAttribute,
  isValid,
} from './combined';

import type {
  ValidatorFn,
  DefaultValue,
  ElementValidatorFn,
  ElementIterator,
} from './types';

import {
  typeofPlus,
  hasOwnProperty,
  keys,
} from './util';

const INTEGER_RE = /^[0-9]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STRING_DATE_RE = /^[0-9]{4}-(1[0-2]|0[1-9])-(3[01]|[1-2][0-9]|0[1-9])$/;

// http://www.regular-expressions.info/email.html
const EMAIL_RE = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

const required = {
  fixed: (v: mixed) => {
    const a = new FixedAttribute(v);
    a.name = JSON.stringify(v);
    return a;
  },

  string: new Attribute(x => typeofPlus(x) === 'string', ''),
  integerString: new Attribute((x: any) => typeofPlus(x) === 'string' && INTEGER_RE.test(x), '0'),
  nonemptyString: new Attribute((x: any) => typeofPlus(x) === 'string' && x.trim().length > 0, '-'),
  uuid: new Attribute((x: any) => typeofPlus(x) === 'string' && UUID_RE.test(x), '00000000-0000-4000-8000-000000000000'),
  email: new Attribute((x: any) => typeofPlus(x) === 'string' && EMAIL_RE.test(x), 'name@example.com'),
  dateString: new Attribute((x: any) => typeofPlus(x) === 'string' && STRING_DATE_RE.test(x) && !Number.isNaN(Date.parse(x)), '2000-01-01'),

  boolean: new Attribute(x => typeofPlus(x) === 'boolean', false),
  number: new Attribute(x => typeofPlus(x) === 'number', 0),
  integer: new Attribute(x => typeofPlus(x) === 'number' && x === parseInt(x, 10), 0),
  regexp: new Attribute(x => typeofPlus(x) === 'regexp', () => new RegExp('')),
  date: new Attribute(x => typeofPlus(x) === 'date', () => new Date()),
  function: new Attribute(x => typeofPlus(x) === 'function', () => () => undefined),

  array: new CompoundAttribute(
    x => typeofPlus(x) === 'array',
    () => [],
    (a: Array<mixed>, ev: ElementValidatorFn) => a.forEach(ev)
  ),
  map: new CompoundAttribute(
    x => typeofPlus(x) === 'object',
    () => {},
    (o: Object, ev: ElementValidatorFn) => keys(o).forEach(n => ev(o[n], n))
  ),

  tuple: (elements: Array<mixed>) => {
    const a = new TupleAttribute(elements);
    a.name = 'tuple';
    return a;
  },
  schema: (fields: {[string]: mixed}) => {
    const a = new SchemaAttribute(fields);
    a.name = 'schema';
    return a;
  },

  instanceOf: (cls: any) => {
    const a = new ObjectAttribute(cls);
    a.name = `instanceOf(${cls.name})`;
    return a;
  },
  oneOf: (...args: Array<mixed>) => {
    const a = new EnumAttribute(args);
    a.name = `oneOf(${a.values.map((attr: Attribute) => attr.name).join(', ')})`;
    return a;
  },
};

for (const attrName in required) {
  if (hasOwnProperty(required, attrName)) {
    const a = required[attrName];
    if (typeof a !== 'function') {
      a.name = attrName;
    }
  }
}

const optional: typeof(required) = {
  fixed: (v: mixed) => required.fixed(v).makeOptional(),

  string: required.string.makeOptional(),
  nonemptyString: required.nonemptyString.makeOptional(),
  integerString: required.integerString.makeOptional(),
  uuid: required.uuid.makeOptional(),
  email: required.email.makeOptional(),
  dateString: required.dateString.makeOptional(),

  boolean: required.boolean.makeOptional(),
  number: required.number.makeOptional(),
  integer: required.integer.makeOptional(),
  regexp: required.regexp.makeOptional(),
  date: required.date.makeOptional(),
  function: required.function.makeOptional(),

  array: required.array.makeOptional(),
  map: required.map.makeOptional(),

  tuple: (elements: Array<mixed>) => required.tuple(elements).makeOptional(),
  schema: (fields: {[string]: mixed}) => required.schema(fields).makeOptional(),
  instanceOf: (cls: any) => required.instanceOf(cls).makeOptional(),
  oneOf: (...args: Array<mixed>) => required.oneOf(...args).makeOptional(),
};

export default {
  typeofPlus,

  Attribute,
  FixedAttribute,
  CompoundAttribute,
  TupleAttribute,
  SchemaAttribute,
  ObjectAttribute,
  EnumAttribute,
  AttributeValidationError,

  validate: (spec: any, value: mixed): any => toAttribute(spec).validate(value),
  isValid,
  newDefault: (spec: any): any => toAttribute(spec).newDefault(),
  mergeDefault: (spec: any, value: mixed, nullIsUndefined: ?boolean): any => toAttribute(spec).mergeDefault(value, nullIsUndefined),
  newSkeleton: (spec: any): any => toAttribute(spec).newSkeleton(),
  toAttribute,

  optional,
  required,

  ...required,
};

export type {
  ValidatorFn,
  DefaultValue,
  ElementValidatorFn,
  ElementIterator,
};
