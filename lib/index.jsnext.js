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
function typeofPlus(x) {
  return typeConversion[typeof x] || typeConversion[objToString.call(x)] || (x ? 'object' : 'null');
}
function hasOwnProperty(obj, name) {
  return objHasOwnProperty.call(obj, name);
}
function assign(obj, source) {
  if (source != null) {
    for (const key in source) {
      if (hasOwnProperty(source, key)) {
        obj[key] = source[key];
      }
    }
  }
  return obj;
}
function keys(obj) {
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
function inspect(value, depth = 3) {
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

class AttributeValidationError extends Error {
  constructor(expected, got, optional) {
    super(`expected: ${expected}${optional ? ' (optional)' : ''}\ngot: ${inspect(got)}`);
    this.expected = expected;
    this.got = got;
    this.optional = optional;
  }
}
class Attribute {
  constructor(validator, defaultsTo) {
    this.flags = {};
    this.default = defaultsTo;
    this.isOptional = false;
    this._validator = validator;
  }
  validate(input) {
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
  newDefault() {
    if (typeof this.default === 'function') {
      return this.default();
    }
    else {
      return this.default;
    }
  }
  mergeDefault(value, nullIsUndefined) {
    if (value === undefined || (value === null && (!this.isOptional || nullIsUndefined))) {
      return this.newDefault();
    }
    else {
      return value;
    }
  }
  newSkeleton() {
    return null;
  }
  defaultsTo(newDefault) {
    const c = this._clone();
    c.default = newDefault;
    return c;
  }
  as(...flags) {
    const c = this._clone();
    for (const flag of flags) {
      if (typeof flag !== 'string') {
        throw new Error('flags must be strings');
      }
      c.flags[flag] = true;
    }
    return c;
  }
  with(flags) {
    const c = this._clone();
    assign(c.flags, flags);
    return c;
  }
  makeOptional() {
    const c = this._clone();
    c.isOptional = true;
    return c;
  }
  _clone() {
    return new Attribute(this._validator)._copyAttrProps(this);
  }
  _copyAttrProps(source) {
    this.name = source.name;
    this.isOptional = source.isOptional;
    this.default = source.default;
    assign(this.flags, source.flags);
    return this;
  }
}

class FixedAttribute extends Attribute {
  constructor(value) {
    super(x => x === value, value);
    this.value = value;
    this.valueType = typeofPlus(value);
  }
  _clone() {
    return new FixedAttribute(this.value)._copyAttrProps(this);
  }
}
class ObjectAttribute extends Attribute {
  constructor(Cls) {
    super(x => x instanceof Cls, () => new Cls());
    this.cls = Cls;
  }
  _clone() {
    return new ObjectAttribute(this.cls)._copyAttrProps(this);
  }
}

class EnumAttribute extends Attribute {
  constructor(values) {
    const attrs = values.map(toAttribute);
    super(x => attrs.some(y => isValid(y, x)), attrs[0].default);
    this.values = attrs;
  }
  _clone() {
    return new EnumAttribute(this.values)._copyAttrProps(this);
  }
}
class TupleAttribute extends Attribute {
  constructor(selements) {
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
  validate(input) {
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
  mergeDefault(value, nullIsUndefined) {
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
  _clone() {
    return new TupleAttribute(this.elements)._copyAttrProps(this);
  }
}
class CompoundAttribute extends Attribute {
  constructor(validator, skeletonMaker, iterator) {
    super(validator, skeletonMaker);
    this._skeletonMaker = skeletonMaker;
    this._iterator = iterator;
  }
  ofType(spec) {
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
  validate(input) {
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
  _clone() {
    return new CompoundAttribute(this._validator, this._skeletonMaker, this._iterator)._copyAttrProps(this);
  }
  _copyAttrProps(source) {
    super._copyAttrProps(source);
    if (source instanceof CompoundAttribute) {
      this.elementAttr = source.elementAttr;
    }
    return this;
  }
}
class SchemaAttribute extends Attribute {
  constructor(sfields) {
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
  validate(input) {
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
  mergeDefault(value, nullIsUndefined) {
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
  _clone() {
    return new SchemaAttribute(this.fields)._copyAttrProps(this);
  }
}
function toAttribute(v) {
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
function isValid(spec, value) {
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

const INTEGER_RE = /^[0-9]+$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STRING_DATE_RE = /^[0-9]{4}-(1[0-2]|0[1-9])-(3[01]|[1-2][0-9]|0[1-9])$/;
const EMAIL_RE = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;
const required = {
  fixed: (v) => {
    const a = new FixedAttribute(v);
    a.name = JSON.stringify(v);
    return a;
  },
  string: new Attribute(x => typeofPlus(x) === 'string', ''),
  integerString: new Attribute((x) => typeofPlus(x) === 'string' && INTEGER_RE.test(x), '0'),
  nonemptyString: new Attribute((x) => typeofPlus(x) === 'string' && x.trim().length > 0, '-'),
  uuid: new Attribute((x) => typeofPlus(x) === 'string' && UUID_RE.test(x), '00000000-0000-4000-8000-000000000000'),
  email: new Attribute((x) => typeofPlus(x) === 'string' && EMAIL_RE.test(x), 'name@example.com'),
  dateString: new Attribute((x) => typeofPlus(x) === 'string' && STRING_DATE_RE.test(x) && !Number.isNaN(Date.parse(x)), '2000-01-01'),
  boolean: new Attribute(x => typeofPlus(x) === 'boolean', false),
  number: new Attribute(x => typeofPlus(x) === 'number', 0),
  integer: new Attribute(x => typeofPlus(x) === 'number' && x === parseInt(x, 10), 0),
  regexp: new Attribute(x => typeofPlus(x) === 'regexp', () => new RegExp('')),
  date: new Attribute(x => typeofPlus(x) === 'date', () => new Date()),
  function: new Attribute(x => typeofPlus(x) === 'function', () => () => undefined),
  array: new CompoundAttribute(
    x => typeofPlus(x) === 'array',
    () => [],
    (a, ev) => a.forEach(ev)
  ),
  map: new CompoundAttribute(
    x => typeofPlus(x) === 'object',
    () => {},
    (o, ev) => keys(o).forEach(n => ev(o[n], n))
  ),
  tuple: (elements) => {
    const a = new TupleAttribute(elements);
    a.name = 'tuple';
    return a;
  },
  schema: (fields) => {
    const a = new SchemaAttribute(fields);
    a.name = 'schema';
    return a;
  },
  instanceOf: (cls) => {
    const a = new ObjectAttribute(cls);
    a.name = `instanceOf(${cls.name})`;
    return a;
  },
  oneOf: (...args) => {
    const a = new EnumAttribute(args);
    a.name = `oneOf(${a.values.map((attr) => attr.name).join(', ')})`;
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
const optional = {
  fixed: (v) => required.fixed(v).makeOptional(),
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
  tuple: (elements) => required.tuple(elements).makeOptional(),
  schema: (fields) => required.schema(fields).makeOptional(),
  instanceOf: (cls) => required.instanceOf(cls).makeOptional(),
  oneOf: (...args) => required.oneOf(...args).makeOptional(),
};
var index = {
  typeofPlus,
  Attribute,
  FixedAttribute,
  CompoundAttribute,
  TupleAttribute,
  SchemaAttribute,
  ObjectAttribute,
  EnumAttribute,
  AttributeValidationError,
  validate: (spec, value) => toAttribute(spec).validate(value),
  isValid,
  newDefault: (spec) => toAttribute(spec).newDefault(),
  mergeDefault: (spec, value, nullIsUndefined) => toAttribute(spec).mergeDefault(value, nullIsUndefined),
  newSkeleton: (spec) => toAttribute(spec).newSkeleton(),
  toAttribute,
  optional,
  required,
  ...required,
};

export default index;
//# sourceMappingURL=index.jsnext.js.map
