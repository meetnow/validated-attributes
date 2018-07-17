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

export class FixedAttribute extends Attribute {
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
export class ObjectAttribute extends Attribute {
  cls: any;

  constructor(Cls: any) {
    super(x => x instanceof Cls, () => new Cls());
    this.cls = Cls;
  }

  _clone(): ObjectAttribute {
    return new ObjectAttribute(this.cls)._copyAttrProps(this);
  }
}
