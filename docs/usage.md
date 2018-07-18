
The intended way of using this library is through importing it as `A` and then
using it declaratively. Like this, things will almost form a readable sentence.
After creating the Attribute objects, a call to `.validate(something)` will do
the job; an error is thrown on failure or the value is returned as-is on
success. The error can be inspected for your program logic to create appropriate
error messages towards the user. Should you only require a boolean value if the
validation succeeded, the `isValid()` helper function can be used.

The greatest power of this library is the way things can be re-used and
combined, which is most useful for schema attributes. See the example below.

## Example ##

```javascript
import A from 'validated-attributes';

const Address = A.schema({
  street: A.required.string,
  city: A.required.string,
  zip: A.required.string,
  country: A.required.string,
  state: A.optional.string,
});

const User = A.schema({
  firstName: A.required.string,
  lastName: A.required.string,
  email: A.required.string,
  privateAddress: Address,
  bizAddress: Address.makeOptional(),
});
```

## List of Pre-Defined Objects ##

All of the following can be used directly, i.e. `A.<name>`. or by prepending
"required", i.e. `A.required.<name>`, which is just for readability. In addition
to that, the objects can be found in an optional variant `A.optional.<name>`
which is most useful in schema Attributes. At any time, a required Attribute can
be turned into an optional Attribute by calling `.makeOptional()`, but note that
this will create a new object each time.

```
A.string - Any string value
A.nonemptyString - Any string that is not the empty string
A.integerString - A string that consists of integer digits
A.uuid - A string that represents an UUID (uses a RegExp)
A.email - A string that represents an eMail address (uses a "close enough" RegExp)
A.dateString - A string that represents a date in the form YYYY-MM-DD (uses a RegExp followed by Date.parse)

A.boolean - Any boolean value
A.number - Any number value
A.integer - An integer number value
A.regexp - Any RegExp object
A.date - Any date object
A.function - Any function object

A.array - Any array value; can be customized, see CompoundAttribute.ofType
A.map - Any object with values; can be customized, see CompoundAttribute.ofType
```

## List of Factory Functions ##

The following can also be used directly, as required and as optional, but rather
than being a fixed value, they are in fact functions that create an Attribute
object.

```
A.fixed(v) - A fixed value, checked by ===

A.tuple(elements) - A fixed-length array with elements of the given Attribute type
A.schema(fields) - A plain object with the given Attribute fields

A.instanceOf(cls) - An object of a specific class
A.oneOf(...args) - The value can be a selection of Attributes; at least one should validate
```

## Defaults ##

Each Attribute object can produce a default value, that can be overridden by
calling `defaultsTo()` on the Attribute object. This will create a copy of the
Attribute object with the new default value set.

Either `newDefault()` or `mergeDefault()` can be used to produce a default
value. Compound Attribute objects will call this recursively on their inner
Attribute objects.

## Skeletons ##

In addition to a default value, a so-called skeleton value can be obtained
from an Attribute object. In almost all cases, this will return a `null` value,
but e.g. schema attributes will return an object with all fields set to either
`null` or - if a field is schema Attribute itself - a skeleton of the respective
type.
