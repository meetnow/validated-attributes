//
//  simple.js
//  validated-attributes
//
//  Created by Patrick Schneider on 17.07.18.
//  Copyright (c) 2018 MeetNow! GmbH. All rights reserved.
//
// @flow
//

import { Attribute } from './base';

import { typeofPlus } from './util';

/**
 Represents a simple fixed value attribute

 The comparison is done with the === operator.
 @access public
 */
export class FixedAttribute extends Attribute {
  /**
   The fixed value itself
   @access protected
   */
  value: mixed;

  /**
   Type of the fixed value
   @access protected
   */
  valueType: string;

  constructor(value: mixed) {
    super(x => x === value, value);
    this.value = value;
    this.valueType = typeofPlus(value);
  }

  /**
   Clone the attribute

   Overrides base implementation
   @access protected
   */
  _clone(): FixedAttribute {
    return new FixedAttribute(this.value)._copyAttrProps(this);
  }
}

/**
 Represents an instanceOf-attribute

 The class is instantiated with an empty constructor as default.
 @access public
 */
export class ObjectAttribute extends Attribute {
  /**
   Class object
   @access protected
   */
  cls: any;

  constructor(Cls: any) {
    super(x => x instanceof Cls, () => new Cls());
    this.cls = Cls;
  }

  /**
   Clone the attribute

   Overrides base implementation
   @access protected
   */
  _clone(): ObjectAttribute {
    return new ObjectAttribute(this.cls)._copyAttrProps(this);
  }
}
