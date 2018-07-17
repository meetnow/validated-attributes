//
//  base.js
//  validated-attributes
//
//  Created by Patrick Schneider on 17.07.18.
//  Copyright (c) 2018 MeetNow! GmbH. All rights reserved.
//
// @flow
//

import type { ValidatorFn, DefaultValue } from './types';

import { assign, inspect } from './util';

/**
 Error class for validation errors

 You might want to test a thrown error with `instanceof` against this class.
 */
export class AttributeValidationError extends Error {
  expected: string;
  got: mixed;
  optional: boolean;

  constructor(expected: string, got: mixed, optional: boolean) {
    super(`expected: ${expected}${optional ? ' (optional)' : ''}\ngot: ${inspect(got)}`);
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
export class Attribute {
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
