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




