//
//  index.js
//  validated-attributes
//
//  Created by Patrick Schneider on 17.05.17.
//  Copyright (c) 2017 MeetNow! GmbH. All rights reserved.
//
// @flow
//

import ExtendableError from 'es6-error';
import { inspect } from 'util';

export type ValidatorFn = (input: mixed) => boolean;
export type DefaultValue = (() => mixed) | mixed;
export type ElementValidatorFn = (element: mixed, index: number | string) => void;
export type ElementIterator = (input: any, elementValidator: ElementValidatorFn) => void;

const objHasOwnProperty = Object.prototype.hasOwnProperty;
const objToString = Object.prototype.toString;

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
};

const INTEGER_RE = /^[0-9]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STRING_DATE_RE = /^[0-9]{4}-(1[0-2]|0[1-9])-(3[01]|[1-2][0-9]|0[1-9])$/;

// http://www.regular-expressions.info/email.html
const EMAIL_RE = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

// Two "permanent" polyfills to circumvent browser/node problems
function assign(obj: Object, source: ?Object): Object {
  if (source != null) {
    for (const key in source) {
      if (objHasOwnProperty.call(source, key)) {
        obj[key] = source[key]; // eslint-disable-line no-param-reassign
      }
    }
  }
  return obj;
}

function keys(obj: Object): Array<string> {
  if (typeof obj !== 'function' && (typeof obj !== 'object' || obj === null)) {
    throw new TypeError('Object.keys called on non-object');
  }
  const result = [];
  for (const key in obj) {
    if (objHasOwnProperty.call(obj, key)) {
      result.push(key);
    }
  }
  return result;
}

function typeofPlus(x: mixed): string {
  return typeConversion[typeof x] || typeConversion[objToString.call(x)] || (x ? 'object' : 'null');
}

/**
 Error class for validation errors

 You might want to test a thrown error with `instanceof` against this class.
 */
class AttributeValidationError extends ExtendableError {
  expected: string;
  got: mixed;
  optional: boolean;

  constructor(expected: string, got: mixed, optional: boolean) {
    super(`expected: ${expected}${optional ? ' (optional)' : ''}\ngot: ${inspect(got, { depth: 3, breakLength: 80 })}`);
    this.expected = expected;
    this.got = got;
    this.optional = optional;
  }
}

/**
 Base class for attributes

 You can inherit from this class to extend Attribute.js; you must override at
 least the `_clone` method.
 */
class Attribute {
  /** Name of the attribute; usually reflects its type */
  name: string;

  /** Arbitrary flags you can use for your application purposes */
  flags: {[string]: mixed};

  /** Default value of the attribute (function that creates a default or immutable value) */
  default: DefaultValue;

  /** Whether this attribute is marked as optional; changes behavior of validate and newSkeleton */
  isOptional: bool;

  /** Base validator function */
  _validator: ValidatorFn;

  /**
   Base constructor for attribute objects

   Takes a validator function and a default value
   */
  constructor(validator: ValidatorFn, defaultsTo: ?DefaultValue) {
    this.flags = {};
    this.default = defaultsTo;
    this.isOptional = false;
    this._validator = validator;
  }

  /**
   Main method for validation

   Throws `AttributeValidationError` on, you guessed it, validation errors.
   Returns the validated object on success.

   The default implementation calls the underlying validator function

   Note: for use with flow type, cast the returned object to your target type.
   */
  validate(input: mixed): any {
    if (input == null) {
      if (!this.isOptional) {
        throw new AttributeValidationError(this.name, input, false);
      }
    }
    else if (!this._validator(input)) {
      throw new AttributeValidationError(this.name, input, this.isOptional);
    }
    return input;
  }

  /**
   Creates a new default value for this attribute

   Returns the value set with `defaultsTo` or, if it is a function, invokes
   it and returns its result.
   */
  newDefault(): mixed {
    if (typeof this.default === 'function') {
      return this.default();
    }
    else {
      return this.default;
    }
  }

  /**
   Merges the given value with the default of this attribute

   Optionally treats `null` as `undefined` even for optional attributes.

   Works best for schema or tuple attributes since it works recursively; it will
   also remove any fields that are not specified in the schema (!)
   */
  mergeDefault(value: mixed, nullIsUndefined: ?boolean): any {
    if (value === undefined || (value === null && (!this.isOptional || nullIsUndefined))) {
      return this.newDefault();
    }
    else {
      return value;
    }
  }

  /**
   Returns a new skeleton for this attribute

   This is most useful for schema or compound attributes, where it will emit
   an object or array whose fields are set to null or which is empty.
   */
  newSkeleton(): mixed {
    return null;
  }

  /**
   Sets the attributes default value

   The default can be a (immutable) value or a function creating a value. The
   latter is recommended if the value is something mutable, like an array or
   object.

   Clones the attribute object.
   */
  defaultsTo(newDefault: DefaultValue): this {
    const c = this._clone();
    c.default = newDefault;
    return c;
  }

  /**
   Adds one or more boolean flags

   Same as calling `with({'flag1': true, 'flag2': true, ...})`.

   Clones the attribute object.
   */
  as(...flags: Array<string>): this {
    const c = this._clone();
    for (const flag of flags) {
      if (typeof flag !== 'string') {
        throw new Error('flags must be strings');
      }
      c.flags[flag] = true;
    }
    return c;
  }

  /**
   Adds one or more arbitrary flags

   Clones the attribute object.
   */
  with(flags: {[string]: mixed}): this {
    const c = this._clone();
    assign(c.flags, flags);
    return c;
  }

  /**
   Turns the attribute optional

   Clones the attribute object.
   */
  makeOptional(): this {
    const c = this._clone();
    c.isOptional = true;
    return c;
  }

  /**
   Internal method to clone an attribute object

   Subclasses must override this method, and call `_copyAttrProps` on the new
   instance. Do not call the base implementation.
   */
  _clone(): Attribute {
    return new Attribute(this._validator)._copyAttrProps(this);
  }

  /**
   Internal method that copies internal properties from the given attribute to
   this attribute

   Used by `_clone`. Subclasses must call the base implementation before copying
   their own properties.

   The base implementation copies the name, isOptional, default and flags
   (as shallow copy). Returns `this`.
   */
  _copyAttrProps(source: Attribute): this {
    this.name = source.name;
    this.isOptional = source.isOptional;
    this.default = source.default;
    assign(this.flags, source.flags);
    return this;
  }
}

class FixedAttribute extends Attribute {
  /** The fixed value itself */
  value: mixed;

  /** Type of the fixed value */
  valueType: string;

  constructor(value: mixed) {
    super(x => x === value, value);
    this.value = value;
    this.valueType = typeofPlus(value);
  }

  _clone(): FixedAttribute {
    return new FixedAttribute(this.value)._copyAttrProps(this);
  }
}

/**
 Represents an instanceOf-attribute

 The class is instantiated with an emty constructor as default.
 */
class ObjectAttribute extends Attribute {
  cls: any;

  constructor(Cls: any) {
    super(x => x instanceof Cls, () => new Cls());
    this.cls = Cls;
  }

  _clone(): ObjectAttribute {
    return new ObjectAttribute(this.cls)._copyAttrProps(this);
  }
}

/**
 Represents an array attribute with fixed number and type of entries

 The default value is an array with default values of each type. The skeleton
 is either `null` for optional tuples or an array with all values set to the
 skeleton of each type.
 */
class TupleAttribute extends Attribute {
  /** Array of attributes to validate the tuple's contents against */
  elements: Array<Attribute>;

  constructor(selements: Array<any>) {
    if (typeofPlus(selements) !== 'array') {
      throw new Error('you need to pass a plain array describing the elements');
    }

    const elements = [];
    for (let i = 0; i < selements.length; i++) {
      elements.push(toAttribute(selements[i]));
    }

    super(x => typeofPlus(x) === 'array', () => elements.map(e => e.newDefault()));
    this.elements = elements;
  }

  validate(input: any): any {
    super.validate(input);

    if (input.length !== this.elements.length) {
      throw new AttributeValidationError(
        `tuple of length ${this.elements.length}`,
        `tuple of length ${input.length}`,
        this.isOptional
      );
    }

    const errors = [];
    for (let i = 0; i < this.elements.length; i++) {
      try {
        this.elements[i].validate(input[i]);
      }
      catch (err) {
        if (err instanceof AttributeValidationError) {
          errors.push({
            expected: `${err.expected} element`,
            index: i,
            optional: err.optional,
            got: err.got,
          });
        }
        else {
          throw err;
        }
      }
    }
    if (errors.length > 0) {
      throw new AttributeValidationError(`valid ${this.name} fields`, errors, this.isOptional);
    }

    return input;
  }

  mergeDefault(value: mixed, nullIsUndefined: ?boolean): any {
    if (value === undefined || (value === null && (!this.isOptional || nullIsUndefined))) {
      return this.newDefault();
    }
    else if (value == null || !Array.isArray(value)) {
      throw new Error('value must be an array (or undefined)');
    }
    else if (value.length !== this.elements.length) {
      throw new Error('the number of elements must be equal');
    }
    else {
      const arr = [];
      for (let i = 0; i < this.elements.length; i++) {
        arr.push(this.elements[i].mergeDefault(value[i], nullIsUndefined));
      }
      return arr;
    }
  }

  newSkeleton() {
    if (this.isOptional) {
      return null;
    }
    else {
      return this.elements.map(e => e.newSkeleton());
    }
  }

  _clone(): TupleAttribute {
    return new TupleAttribute(this.elements)._copyAttrProps(this);
  }
}

/**
 Represents an oneOf-attribute

 The first value is used to generate the default.
 */
class EnumAttribute extends Attribute {
  /** List of valid attributes for this enum */
  values: Array<Attribute>;

  constructor(values: Array<any>) {
    const attrs = values.map(toAttribute);
    super(x => attrs.some(y => isValid(y, x)), attrs[0].default);
    this.values = attrs;
  }

  _clone(): EnumAttribute {
    return new EnumAttribute(this.values)._copyAttrProps(this);
  }
}

/**
 Represents array and map attributes

 Optionally the values can be type-checked as well. Use `ofType` for this.

 If the attribute is marked as optional, `newSkeleton` will return null.
 Otherwise it creates an empty array or map.
 */
class CompoundAttribute extends Attribute {
  /** Attribute that all elements must have */
  elementAttr: ?Attribute;

  _skeletonMaker: () => mixed;
  _iterator: ElementIterator;

  constructor(validator: ValidatorFn, skeletonMaker: () => mixed, iterator: ElementIterator) {
    super(validator, skeletonMaker);
    this._skeletonMaker = skeletonMaker;
    this._iterator = iterator;
  }

  /**
   Bind a type to the contents of the compound attribute

   All values of the compound will be validated against the given attribute.

   Clones the attribute object.
   */
  ofType(spec: any): this {
    const c = this._clone();
    const elementAttr = toAttribute(spec);
    c.elementAttr = elementAttr;
    const i = this.name.indexOf('<');
    if (i === -1) {
      c.name = `${this.name}<${elementAttr.name}>`;
    }
    else {
      c.name = `${this.name.substr(0, i)}<${elementAttr.name}>`;
    }
    return c;
  }

  validate(input: mixed): any {
    super.validate(input);

    if (input != null && this.elementAttr != null) {
      const eltAttr = this.elementAttr;
      const errors = [];
      this._iterator(input, (elt, index) => {
        try {
          eltAttr.validate(elt);
        }
        catch (err) {
          if (err instanceof AttributeValidationError) {
            errors.push({
              expected: `${err.expected} element`,
              key: index,
              optional: err.optional,
              got: err.got,
            });
          }
          else {
            throw err;
          }
        }
      });
      if (errors.length > 0) {
        throw new AttributeValidationError(`valid ${this.name} elements`, errors, this.isOptional);
      }
    }

    return input;
  }

  newSkeleton() {
    if (this.isOptional) {
      return null;
    }
    else {
      return this._skeletonMaker();
    }
  }

  _clone(): CompoundAttribute {
    return new CompoundAttribute(this._validator, this._skeletonMaker, this._iterator)._copyAttrProps(this);
  }

  _copyAttrProps(source: Attribute): this {
    super._copyAttrProps(source);
    // source is contravariant, need to check
    if (source instanceof CompoundAttribute) {
      this.elementAttr = source.elementAttr;
    }
    return this;
  }
}

/**
 Represents a (plain) object attribute with fields of given types

 The default value is an object with default values of each type for each field.
 The skeleton is either `null` for optional schemas or an object with all values
 set to the skeleton of each type.
 */
class SchemaAttribute extends Attribute {
  /** Fields to validate */
  fields: {[string]: Attribute};

  constructor(sfields: {[string]: any}) {
    if (typeofPlus(sfields) !== 'object') {
      throw new Error('you need to pass a plain object describing the attributes');
    }

    const fields = {};
    for (const f in sfields) {
      if (objHasOwnProperty.call(sfields, f)) {
        fields[f] = toAttribute(sfields[f]);
      }
    }

    super(x => typeofPlus(x) === 'object', () => {
      const obj = {};
      for (const f in fields) {
        if (objHasOwnProperty.call(fields, f)) {
          obj[f] = fields[f].newDefault();
        }
      }
      return obj;
    });
    this.fields = fields;
  }

  validate(input: any): any {
    super.validate(input);

    const errors = [];
    for (const f in this.fields) {
      if (objHasOwnProperty.call(this.fields, f)) {
        try {
          this.fields[f].validate(input[f]);
        }
        catch (err) {
          if (err instanceof AttributeValidationError) {
            errors.push({
              expected: `${err.expected} field`,
              name: f,
              optional: err.optional,
              got: err.got,
            });
          }
          else {
            throw err;
          }
        }
      }
    }
    if (errors.length > 0) {
      throw new AttributeValidationError(`valid ${this.name}`, errors, this.isOptional);
    }

    return input;
  }

  mergeDefault(value: mixed, nullIsUndefined: ?boolean): any {
    if (value === undefined || (value === null && (!this.isOptional || nullIsUndefined))) {
      return this.newDefault();
    }
    else if (value == null || typeof value !== 'object') {
      throw new Error('value must be an object (or undefined)');
    }
    else {
      const obj = {};
      for (const f in this.fields) {
        if (objHasOwnProperty.call(this.fields, f)) {
          obj[f] = this.fields[f].mergeDefault(value[f], nullIsUndefined);
        }
      }
      return obj;
    }
  }

  newSkeleton() {
    if (this.isOptional) {
      return null;
    }
    else {
      const obj = {};
      for (const f in this.fields) {
        if (objHasOwnProperty.call(this.fields, f)) {
          obj[f] = this.fields[f].newSkeleton();
        }
      }
      return obj;
    }
  }

  _clone(): SchemaAttribute {
    return new SchemaAttribute(this.fields)._copyAttrProps(this);
  }
}

/**
 Converts a fixed value or tuple or schema
 */
function toAttribute(v: any): Attribute {
  if (v instanceof Attribute) {
    return v;
  }

  switch (typeofPlus(v)) {
    case 'object': {
      const a = new SchemaAttribute(v);
      a.name = 'schema';
      return a;
    }
    case 'array': {
      const a = new TupleAttribute(v);
      a.name = 'tuple';
      return a;
    }
    default: {
      const a = new FixedAttribute(v);
      a.name = JSON.stringify(v);
      return a;
    }
  }
}

/**
 Tests a value against a specification

 Returns true or false rather than trowing an exception
 */
function isValid(spec: any, value: mixed): boolean {
  try {
    toAttribute(spec).validate(value);
    return true;
  }
  catch (err) {
    if (err instanceof AttributeValidationError) {
      return false;
    }
    else {
      throw err;
    }
  }
}

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
  if (objHasOwnProperty.call(required, attrName)) {
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

  validate: (spec: any, value: mixed): any => toAttribute(spec).validate(value),
  isValid,
  newDefault: (spec: any): any => toAttribute(spec).newDefault(),
  mergeDefault: (spec: any, value: mixed, nullIsUndefined: ?boolean): any => toAttribute(spec).mergeDefault(value, nullIsUndefined),
  newSkeleton: (spec: any): any => toAttribute(spec).newSkeleton(),
  toAttribute,

  Attribute,
  FixedAttribute,
  CompoundAttribute,
  TupleAttribute,
  SchemaAttribute,
  ObjectAttribute,
  EnumAttribute,
  AttributeValidationError,

  optional,
  required,

  ...required,
};
