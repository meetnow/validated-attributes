'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _es6Error = require('es6-error');

var _es6Error2 = _interopRequireDefault(_es6Error);

var _util = require('util');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var objHasOwnProperty = Object.prototype.hasOwnProperty;
var objToString = Object.prototype.toString;

var typeConversion = {
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
  '[object Null]': 'null'
};

var INTEGER_RE = /^[0-9]+$/;
var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
var STRING_DATE_RE = /^[0-9]{4}-(1[0-2]|0[1-9])-(3[01]|[1-2][0-9]|0[1-9])$/;

var EMAIL_RE = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i;

function assign(obj, source) {
  if (source != null) {
    for (var key in source) {
      if (objHasOwnProperty.call(source, key)) {
        obj[key] = source[key];
      }
    }
  }
  return obj;
}

function keys(obj) {
  if (typeof obj !== 'function' && ((typeof obj === 'undefined' ? 'undefined' : _typeof(obj)) !== 'object' || obj === null)) {
    throw new TypeError('Object.keys called on non-object');
  }
  var result = [];
  for (var key in obj) {
    if (objHasOwnProperty.call(obj, key)) {
      result.push(key);
    }
  }
  return result;
}

function typeofPlus(x) {
  return typeConversion[typeof x === 'undefined' ? 'undefined' : _typeof(x)] || typeConversion[objToString.call(x)] || (x ? 'object' : 'null');
}

var AttributeValidationError = function (_ExtendableError) {
  _inherits(AttributeValidationError, _ExtendableError);

  function AttributeValidationError(expected, got, optional) {
    _classCallCheck(this, AttributeValidationError);

    var _this = _possibleConstructorReturn(this, (AttributeValidationError.__proto__ || Object.getPrototypeOf(AttributeValidationError)).call(this, 'expected: ' + expected + (optional ? ' (optional)' : '') + '\ngot: ' + (0, _util.inspect)(got, { depth: 3, breakLength: 80 })));

    _this.expected = expected;
    _this.got = got;
    _this.optional = optional;
    return _this;
  }

  return AttributeValidationError;
}(_es6Error2.default);

var Attribute = function () {
  function Attribute(validator, defaultsTo) {
    _classCallCheck(this, Attribute);

    this.flags = {};
    this.default = defaultsTo;
    this.isOptional = false;
    this._validator = validator;
  }

  _createClass(Attribute, [{
    key: 'validate',
    value: function validate(input) {
      if (input == null) {
        if (!this.isOptional) {
          throw new AttributeValidationError(this.name, input, false);
        }
      } else if (!this._validator(input)) {
        throw new AttributeValidationError(this.name, input, true);
      }
      return input;
    }
  }, {
    key: 'newDefault',
    value: function newDefault() {
      if (typeof this.default === 'function') {
        return this.default();
      } else {
        return this.default;
      }
    }
  }, {
    key: 'mergeDefault',
    value: function mergeDefault(value, nullIsUndefined) {
      if (value === undefined || value === null && (!this.isOptional || nullIsUndefined)) {
        return this.newDefault();
      } else {
        return value;
      }
    }
  }, {
    key: 'newSkeleton',
    value: function newSkeleton() {
      return null;
    }
  }, {
    key: 'defaultsTo',
    value: function defaultsTo(newDefault) {
      var c = this._clone();
      c.default = newDefault;
      return c;
    }
  }, {
    key: 'as',
    value: function as() {
      var c = this._clone();

      for (var _len = arguments.length, flags = Array(_len), _key = 0; _key < _len; _key++) {
        flags[_key] = arguments[_key];
      }

      var _iteratorNormalCompletion = true;
      var _didIteratorError = false;
      var _iteratorError = undefined;

      try {
        for (var _iterator = flags[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
          var flag = _step.value;

          if (typeof flag !== 'string') {
            throw new Error('flags must be strings');
          }
          c.flags[flag] = true;
        }
      } catch (err) {
        _didIteratorError = true;
        _iteratorError = err;
      } finally {
        try {
          if (!_iteratorNormalCompletion && _iterator.return) {
            _iterator.return();
          }
        } finally {
          if (_didIteratorError) {
            throw _iteratorError;
          }
        }
      }

      return c;
    }
  }, {
    key: 'with',
    value: function _with(flags) {
      var c = this._clone();
      assign(c.flags, flags);
      return c;
    }
  }, {
    key: 'makeOptional',
    value: function makeOptional() {
      var c = this._clone();
      c.isOptional = true;
      return c;
    }
  }, {
    key: '_clone',
    value: function _clone() {
      return new Attribute(this._validator)._copyAttrProps(this);
    }
  }, {
    key: '_copyAttrProps',
    value: function _copyAttrProps(source) {
      this.name = source.name;
      this.isOptional = source.isOptional;
      this.default = source.default;
      assign(this.flags, source.flags);
      return this;
    }
  }]);

  return Attribute;
}();

var FixedAttribute = function (_Attribute) {
  _inherits(FixedAttribute, _Attribute);

  function FixedAttribute(value) {
    _classCallCheck(this, FixedAttribute);

    var _this2 = _possibleConstructorReturn(this, (FixedAttribute.__proto__ || Object.getPrototypeOf(FixedAttribute)).call(this, function (x) {
      return x === value;
    }, value));

    _this2.value = value;
    _this2.valueType = typeofPlus(value);
    return _this2;
  }

  _createClass(FixedAttribute, [{
    key: '_clone',
    value: function _clone() {
      return new FixedAttribute(this.value)._copyAttrProps(this);
    }
  }]);

  return FixedAttribute;
}(Attribute);

var ObjectAttribute = function (_Attribute2) {
  _inherits(ObjectAttribute, _Attribute2);

  function ObjectAttribute(Cls) {
    _classCallCheck(this, ObjectAttribute);

    var _this3 = _possibleConstructorReturn(this, (ObjectAttribute.__proto__ || Object.getPrototypeOf(ObjectAttribute)).call(this, function (x) {
      return x instanceof Cls;
    }, function () {
      return new Cls();
    }));

    _this3.cls = Cls;
    return _this3;
  }

  _createClass(ObjectAttribute, [{
    key: '_clone',
    value: function _clone() {
      return new ObjectAttribute(this.cls)._copyAttrProps(this);
    }
  }]);

  return ObjectAttribute;
}(Attribute);

var TupleAttribute = function (_Attribute3) {
  _inherits(TupleAttribute, _Attribute3);

  function TupleAttribute(selements) {
    _classCallCheck(this, TupleAttribute);

    if (typeofPlus(selements) !== 'array') {
      throw new Error('you need to pass a plain array describing the elements');
    }

    var elements = [];
    for (var i = 0; i < selements.length; i++) {
      elements.push(toAttribute(selements[i]));
    }

    var _this4 = _possibleConstructorReturn(this, (TupleAttribute.__proto__ || Object.getPrototypeOf(TupleAttribute)).call(this, function (x) {
      return typeofPlus(x) === 'array';
    }, function () {
      return elements.map(function (e) {
        return e.newDefault();
      });
    }));

    _this4.elements = elements;
    return _this4;
  }

  _createClass(TupleAttribute, [{
    key: 'validate',
    value: function validate(input) {
      _get(TupleAttribute.prototype.__proto__ || Object.getPrototypeOf(TupleAttribute.prototype), 'validate', this).call(this, input);

      if (input.length !== this.elements.length) {
        throw new AttributeValidationError('tuple of length ' + this.elements.length, 'tuple of length ' + input.length, this.isOptional);
      }

      var errors = [];
      for (var i = 0; i < this.elements.length; i++) {
        try {
          this.elements[i].validate(input[i]);
        } catch (err) {
          if (err instanceof AttributeValidationError) {
            errors.push({
              expected: err.expected + ' element',
              index: i,
              optional: err.optional,
              got: err.got
            });
          } else {
            throw err;
          }
        }
      }
      if (errors.length > 0) {
        throw new AttributeValidationError('valid ' + this.name + ' fields', errors, this.isOptional);
      }

      return input;
    }
  }, {
    key: 'mergeDefault',
    value: function mergeDefault(value, nullIsUndefined) {
      if (value === undefined || value === null && (!this.isOptional || nullIsUndefined)) {
        return this.newDefault();
      } else if (value == null || !Array.isArray(value)) {
        throw new Error('value must be an array (or undefined)');
      } else if (value.length !== this.elements.length) {
        throw new Error('the number of elements must be equal');
      } else {
        var arr = [];
        for (var i = 0; i < this.elements.length; i++) {
          arr.push(this.elements[i].mergeDefault(value[i], nullIsUndefined));
        }
        return arr;
      }
    }
  }, {
    key: 'newSkeleton',
    value: function newSkeleton() {
      if (this.isOptional) {
        return null;
      } else {
        return this.elements.map(function (e) {
          return e.newSkeleton();
        });
      }
    }
  }, {
    key: '_clone',
    value: function _clone() {
      return new TupleAttribute(this.elements)._copyAttrProps(this);
    }
  }]);

  return TupleAttribute;
}(Attribute);

var EnumAttribute = function (_Attribute4) {
  _inherits(EnumAttribute, _Attribute4);

  function EnumAttribute(values) {
    _classCallCheck(this, EnumAttribute);

    var attrs = values.map(toAttribute);

    var _this5 = _possibleConstructorReturn(this, (EnumAttribute.__proto__ || Object.getPrototypeOf(EnumAttribute)).call(this, function (x) {
      return attrs.some(function (y) {
        return isValid(y, x);
      });
    }, attrs[0].default));

    _this5.values = attrs;
    return _this5;
  }

  _createClass(EnumAttribute, [{
    key: '_clone',
    value: function _clone() {
      return new EnumAttribute(this.values)._copyAttrProps(this);
    }
  }]);

  return EnumAttribute;
}(Attribute);

var CompoundAttribute = function (_Attribute5) {
  _inherits(CompoundAttribute, _Attribute5);

  function CompoundAttribute(validator, skeletonMaker, iterator) {
    _classCallCheck(this, CompoundAttribute);

    var _this6 = _possibleConstructorReturn(this, (CompoundAttribute.__proto__ || Object.getPrototypeOf(CompoundAttribute)).call(this, validator, skeletonMaker));

    _this6._skeletonMaker = skeletonMaker;
    _this6._iterator = iterator;
    return _this6;
  }

  _createClass(CompoundAttribute, [{
    key: 'ofType',
    value: function ofType(spec) {
      var c = this._clone();
      var elementAttr = toAttribute(spec);
      c.elementAttr = elementAttr;
      var i = this.name.indexOf('<');
      if (i === -1) {
        c.name = this.name + '<' + elementAttr.name + '>';
      } else {
        c.name = this.name.substr(0, i) + '<' + elementAttr.name + '>';
      }
      return c;
    }
  }, {
    key: 'validate',
    value: function validate(input) {
      _get(CompoundAttribute.prototype.__proto__ || Object.getPrototypeOf(CompoundAttribute.prototype), 'validate', this).call(this, input);

      if (input != null && this.elementAttr != null) {
        var eltAttr = this.elementAttr;
        var errors = [];
        this._iterator(input, function (elt, index) {
          try {
            eltAttr.validate(elt);
          } catch (err) {
            if (err instanceof AttributeValidationError) {
              errors.push({
                expected: err.expected + ' element',
                key: index,
                optional: err.optional,
                got: err.got
              });
            } else {
              throw err;
            }
          }
        });
        if (errors.length > 0) {
          throw new AttributeValidationError('valid ' + this.name + ' elements', errors, this.isOptional);
        }
      }

      return input;
    }
  }, {
    key: 'newSkeleton',
    value: function newSkeleton() {
      if (this.isOptional) {
        return null;
      } else {
        return this._skeletonMaker();
      }
    }
  }, {
    key: '_clone',
    value: function _clone() {
      return new CompoundAttribute(this._validator, this._skeletonMaker, this._iterator)._copyAttrProps(this);
    }
  }, {
    key: '_copyAttrProps',
    value: function _copyAttrProps(source) {
      _get(CompoundAttribute.prototype.__proto__ || Object.getPrototypeOf(CompoundAttribute.prototype), '_copyAttrProps', this).call(this, source);

      if (source instanceof CompoundAttribute) {
        this.elementAttr = source.elementAttr;
      }
      return this;
    }
  }]);

  return CompoundAttribute;
}(Attribute);

var SchemaAttribute = function (_Attribute6) {
  _inherits(SchemaAttribute, _Attribute6);

  function SchemaAttribute(sfields) {
    _classCallCheck(this, SchemaAttribute);

    if (typeofPlus(sfields) !== 'object') {
      throw new Error('you need to pass a plain object describing the attributes');
    }

    var fields = {};
    for (var f in sfields) {
      if (objHasOwnProperty.call(sfields, f)) {
        fields[f] = toAttribute(sfields[f]);
      }
    }

    var _this7 = _possibleConstructorReturn(this, (SchemaAttribute.__proto__ || Object.getPrototypeOf(SchemaAttribute)).call(this, function (x) {
      return typeofPlus(x) === 'object';
    }, function () {
      var obj = {};
      for (var _f in fields) {
        if (objHasOwnProperty.call(fields, _f)) {
          obj[_f] = fields[_f].newDefault();
        }
      }
      return obj;
    }));

    _this7.fields = fields;
    return _this7;
  }

  _createClass(SchemaAttribute, [{
    key: 'validate',
    value: function validate(input) {
      _get(SchemaAttribute.prototype.__proto__ || Object.getPrototypeOf(SchemaAttribute.prototype), 'validate', this).call(this, input);

      var errors = [];
      for (var f in this.fields) {
        if (objHasOwnProperty.call(this.fields, f)) {
          try {
            this.fields[f].validate(input[f]);
          } catch (err) {
            if (err instanceof AttributeValidationError) {
              errors.push({
                expected: err.expected + ' field',
                name: f,
                optional: err.optional,
                got: err.got
              });
            } else {
              throw err;
            }
          }
        }
      }
      if (errors.length > 0) {
        throw new AttributeValidationError('valid ' + this.name, errors, this.isOptional);
      }

      return input;
    }
  }, {
    key: 'mergeDefault',
    value: function mergeDefault(value, nullIsUndefined) {
      if (value === undefined || value === null && (!this.isOptional || nullIsUndefined)) {
        return this.newDefault();
      } else if (value == null || (typeof value === 'undefined' ? 'undefined' : _typeof(value)) !== 'object') {
        throw new Error('value must be an object (or undefined)');
      } else {
        var obj = {};
        for (var f in this.fields) {
          if (objHasOwnProperty.call(this.fields, f)) {
            obj[f] = this.fields[f].mergeDefault(value[f], nullIsUndefined);
          }
        }
        return obj;
      }
    }
  }, {
    key: 'newSkeleton',
    value: function newSkeleton() {
      if (this.isOptional) {
        return null;
      } else {
        var obj = {};
        for (var f in this.fields) {
          if (objHasOwnProperty.call(this.fields, f)) {
            obj[f] = this.fields[f].newSkeleton();
          }
        }
        return obj;
      }
    }
  }, {
    key: '_clone',
    value: function _clone() {
      return new SchemaAttribute(this.fields)._copyAttrProps(this);
    }
  }]);

  return SchemaAttribute;
}(Attribute);

function toAttribute(v) {
  if (v instanceof Attribute) {
    return v;
  }

  switch (typeofPlus(v)) {
    case 'object':
      {
        var a = new SchemaAttribute(v);
        a.name = 'schema';
        return a;
      }
    case 'array':
      {
        var _a = new TupleAttribute(v);
        _a.name = 'tuple';
        return _a;
      }
    default:
      {
        var _a2 = new FixedAttribute(v);
        _a2.name = JSON.stringify(v);
        return _a2;
      }
  }
}

function isValid(spec, value) {
  try {
    toAttribute(spec).validate(value);
    return true;
  } catch (err) {
    if (err instanceof AttributeValidationError) {
      return false;
    } else {
      throw err;
    }
  }
}

var required = {
  fixed: function fixed(v) {
    var a = new FixedAttribute(v);
    a.name = JSON.stringify(v);
    return a;
  },

  string: new Attribute(function (x) {
    return typeofPlus(x) === 'string';
  }, ''),
  integerString: new Attribute(function (x) {
    return typeofPlus(x) === 'string' && INTEGER_RE.test(x);
  }, '0'),
  nonemptyString: new Attribute(function (x) {
    return typeofPlus(x) === 'string' && x.trim().length > 0;
  }, '-'),
  uuid: new Attribute(function (x) {
    return typeofPlus(x) === 'string' && UUID_RE.test(x);
  }, '00000000-0000-4000-8000-000000000000'),
  email: new Attribute(function (x) {
    return typeofPlus(x) === 'string' && EMAIL_RE.test(x);
  }, 'name@example.com'),
  dateString: new Attribute(function (x) {
    return typeofPlus(x) === 'string' && STRING_DATE_RE.test(x) && !Number.isNaN(Date.parse(x));
  }, '2000-01-01'),

  boolean: new Attribute(function (x) {
    return typeofPlus(x) === 'boolean';
  }, false),
  number: new Attribute(function (x) {
    return typeofPlus(x) === 'number';
  }, 0),
  integer: new Attribute(function (x) {
    return typeofPlus(x) === 'number' && x === parseInt(x, 10);
  }, 0),
  regexp: new Attribute(function (x) {
    return typeofPlus(x) === 'regexp';
  }, function () {
    return new RegExp('');
  }),
  date: new Attribute(function (x) {
    return typeofPlus(x) === 'date';
  }, function () {
    return new Date();
  }),
  function: new Attribute(function (x) {
    return typeofPlus(x) === 'function';
  }, function () {
    return function () {
      return undefined;
    };
  }),

  array: new CompoundAttribute(function (x) {
    return typeofPlus(x) === 'array';
  }, function () {
    return [];
  }, function (a, ev) {
    return a.forEach(ev);
  }),
  map: new CompoundAttribute(function (x) {
    return typeofPlus(x) === 'object';
  }, function () {}, function (o, ev) {
    return keys(o).forEach(function (n) {
      return ev(o[n], n);
    });
  }),

  tuple: function tuple(elements) {
    var a = new TupleAttribute(elements);
    a.name = 'tuple';
    return a;
  },
  schema: function schema(fields) {
    var a = new SchemaAttribute(fields);
    a.name = 'schema';
    return a;
  },

  instanceOf: function instanceOf(cls) {
    var a = new ObjectAttribute(cls);
    a.name = 'instanceOf(' + cls.name + ')';
    return a;
  },
  oneOf: function oneOf() {
    for (var _len2 = arguments.length, args = Array(_len2), _key2 = 0; _key2 < _len2; _key2++) {
      args[_key2] = arguments[_key2];
    }

    var a = new EnumAttribute(args);
    a.name = 'oneOf(' + a.values.map(function (attr) {
      return attr.name;
    }).join(', ') + ')';
    return a;
  }
};

for (var attrName in required) {
  if (objHasOwnProperty.call(required, attrName)) {
    var a = required[attrName];
    if (typeof a !== 'function') {
      a.name = attrName;
    }
  }
}

var optional = {
  fixed: function fixed(v) {
    return required.fixed(v).makeOptional();
  },

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

  tuple: function tuple(elements) {
    return required.tuple(elements).makeOptional();
  },
  schema: function schema(fields) {
    return required.schema(fields).makeOptional();
  },
  instanceOf: function instanceOf(cls) {
    return required.instanceOf(cls).makeOptional();
  },
  oneOf: function oneOf() {
    return required.oneOf.apply(required, arguments).makeOptional();
  }
};

exports.default = _extends({
  typeofPlus: typeofPlus,

  validate: function validate(spec, value) {
    return toAttribute(spec).validate(value);
  },
  isValid: isValid,
  newDefault: function newDefault(spec) {
    return toAttribute(spec).newDefault();
  },
  mergeDefault: function mergeDefault(spec, value, nullIsUndefined) {
    return toAttribute(spec).mergeDefault(value, nullIsUndefined);
  },
  newSkeleton: function newSkeleton(spec) {
    return toAttribute(spec).newSkeleton();
  },
  toAttribute: toAttribute,

  Attribute: Attribute,
  FixedAttribute: FixedAttribute,
  CompoundAttribute: CompoundAttribute,
  TupleAttribute: TupleAttribute,
  SchemaAttribute: SchemaAttribute,
  ObjectAttribute: ObjectAttribute,
  EnumAttribute: EnumAttribute,
  AttributeValidationError: AttributeValidationError,

  optional: optional,
  required: required

}, required);