# This document describes things which have been added to the [original decaffeinate](https://github.com/decaffeinate/decaffeinate).


## Static generator methods

### --correct-static-generator-methods

For some reason the original `decaffeinate` converts a static method-generator to a wrong syntax: `*static methodName()` instead of `static *methodName()`.

`--correct-static-generator-methods` option fixes this problem:

```javascript
class MyClass
  @m: ->
    yield doSomething()
```
is converted to:
```javascript
class MyClass {
 static *m() {
    return yield doSomething();
  }
}
```


## Bound instance methods

### --bind-methods-after-super-call

The original `decaffeinate` converts Coffeescript "fat arrow" instance [methods to method binding BEFORE `super` call](https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md#javascript-after-decaffeinate). This is incorrect in a ES6 class.

`--bind-methods-after-super-call` option fixes this problem:

```javascript
class Desc extends Base
  constructor: ->
    x = get()
    super(x)

  m: =>

  m2: =>
```
is converted to:
```javascript
class Desc extends Base {
  constructor() {
    const x = get();
    super(x);                      // super() call before bindings
    this.m = this.m.bind(this);
    this.m2 = this.m2.bind(this);
  }

  m() {}

  m2() {}
}
```

When there is no explicit constructor in a Coffee class:

```javascript
class Desc extends Base
  m: =>

  m2: =>
```
is converted to:
```javascript
class Desc extends Base {
  constructor(...args) {
    super(...args);               // super() call before bindings
    this.m = this.m.bind(this);
    this.m2 = this.m2.bind(this);
  }

  m() {}

  m2() {}
}
```

### --compact-methods-binding

There is also one more extra option - `--compact-methods-binding`.

The option causes all instance methods binding in a single line:

```javascript
class Desc extends Base
  constructor: ->
    x = get()
    super(x)

  m: =>

  m2: =>
```
is converted to:
```javascript
class Desc extends Base {
  constructor() {
    const x = get();
    super(x);
    this._bindMethods('m', 'm2');  // the cmpact binding
  }

  m() {}

  m2() {}
}
```

Use of this option requires the application to be provided with `Object.prototype._bindMethods` implemented as follows:
```javascript
Object.defineProperty(Object.prototype, '_bindMethods', {
  enumerable: false,
  configurable: false,
  writable: false,
  value: function(...methods) {
    methods.forEach((m) => {
      const original = this[m];
      this[m] = this[m].bind(this);
      this[m].unbound = original;
    });
  }
});
```

In addition the wrapper for every bound method provides its unbound version accessible via a standard syntax: `obj.method.unbound`.

_Basically it makes sense to have an unbound method version under `obj.method` and its bound version under `obj.method.bound`. This approach is better, because it would allow to call an unbound method in a natural way - `obj.method()`. But it would force you to correct all the places where bound methods were already used in your Coffeescript program._


## Chains with existential operators (optional chaining)

### --use-optional-chaining-via-lodash-get

The original `decaffeinate` converts a call chain containing existential operators (access to an object property via`?`) to a procedure-style `__guard__` mess.

`--use-optional-chaining-via-lodash-get` option is designed to avoid this weird output by use of `lodash.get` in a relatively simple cases and by forcing manual coffescript corrections in complicated cases.

For example this chain:
```javascript
a().b?.c.d?.e
```

by the original `decaffeinate` is converted to:
```javascript
__guard__(__guard__(a().b, x1 => x1.c.d), x => x.e)

function __guard__(value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined;
}
```

with `--use-optional-chaining-via-lodash-get` option:
```javascript
_.get(a().b, 'c.d.e')
```

**Only relatively trivial chains can be converted automatically with `--use-optional-chaining-via-lodash-get` option.**

Very likely you will get an error, if a chain contains some operators except `?` or `.` somewhere after the first (somethines - after the second) `?` appearance in the chain - like:

`a?.b?.c()` or `a.b?()` or `a?.b?.c[0]` or `a.b?[0]` or `a?.b?.c = d` or `a?.b?.c++` etc.

You'll be provided with an explanation where the problem place starts and you will have to manually split the chain at least at this place in coffescript and ten repeat the `decaffeinate` call.

For example, on attempt to convert this code:
```javascript
res = a?.b?.c()?.d
```

you will get the following error:
```
Cannot automatically convert an optional chain with some operator other than `.` or `?` AFTER another `?` appearance earlier in the chain.

	Split the chain manually at this place:	`?.c().d`

> 36 | res = a?.b?.c()?.d
     |       ^^^^^^^^^^^^
```

and if you split the chain at the pointed place:
```javascript
b = a?.b
res = b.c()?.d if b
```
then both the chains should be converted succesfully.

Pay attention - [sometimes you should do a more specific test](https://developer.mozilla.org/en-US/docs/Glossary/Truthy) of `b` than just `if`.
E.g. `if(b)` or `b &&` is a good replacemnt for `b?` when `b` is an Object, but not good when it's, for example, a String.

_In a very complicated case it could be necessary to split a chain a few times  - just pass this process iteratively._
