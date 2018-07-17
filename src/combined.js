//
//  combined.js
//  validated-attributes
//
//  Created by Patrick Schneider on 17.07.18.
//  Copyright (c) 2018 MeetNow! GmbH. All rights reserved.
//
// @flow
//

import { AttributeValidationError, Attribute } from './base';

import { FixedAttribute } from './simple';

import type { ValidatorFn, ElementIterator } from './types';

import { typeofPlus, hasOwnProperty } from './util';

/**
 Represents an oneOf-attribute

 The first value is used to generate the default.
 */
export class EnumAttribute extends Attribute {
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
 Represents an array attribute with fixed number and type of entries

 The default value is an array with default values of each type. The skeleton
 is either `null` for optional tuples or an array with all values set to the
 skeleton of each type.
 */
export class TupleAttribute extends Attribute {
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

    if (input == null) {
      return input;
    }

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

  newSkeleton(): ?Array<mixed> {
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
 Represents array and map attributes

 Optionally the values can be type-checked as well. Use `ofType` for this.

 If the attribute is marked as optional, `newSkeleton` will return null.
 Otherwise it creates an empty array or map.
 */
export class CompoundAttribute extends Attribute {
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

    if (input == null || this.elementAttr == null) {
      return input;
    }

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
export class SchemaAttribute extends Attribute {
  /** Fields to validate */
  fields: {[string]: Attribute};

  constructor(sfields: {[string]: any}) {
    if (typeofPlus(sfields) !== 'object') {
      throw new Error('you need to pass a plain object describing the attributes');
    }

    const fields = {};
    for (const f in sfields) {
      if (hasOwnProperty(sfields, f)) {
        fields[f] = toAttribute(sfields[f]);
      }
    }

    super(x => typeofPlus(x) === 'object', () => {
      const obj = {};
      for (const f in fields) {
        if (hasOwnProperty(fields, f)) {
          obj[f] = fields[f].newDefault();
        }
      }
      return obj;
    });
    this.fields = fields;
  }

  validate(input: any): any {
    super.validate(input);

    if (input == null) {
      return input;
    }

    const errors = [];
    for (const f in this.fields) {
      if (hasOwnProperty(this.fields, f)) {
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
        if (hasOwnProperty(this.fields, f)) {
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
        if (hasOwnProperty(this.fields, f)) {
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
export function toAttribute(v: any): Attribute {
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
export function isValid(spec: any, value: mixed): boolean {
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
