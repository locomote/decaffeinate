# This document describes things which have been added to the [original decaffeinate](https://github.com/decaffeinate/decaffeinate).


## Static generator methods

### --correct-static-generator-methods

For some reason the original `decaffeinate` converts a static method-generator to a wrong syntax: `*static methodName()` instead of `static *methodName()`.

`--correct-static-generator-methods` option fixes this problem.


## Bound instance methods

### --bind-methods-after-super-call

The original `decaffeinate` converts Coffeescript "fat arrow" instance [methods to method binding BEFORE `super` call](https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md#javascript-after-decaffeinate). This is incorrect in a ES6 class.

To address this problem `--bind-methods-after-super-call` option has been added.

### --compact-methods-binding

There is also one more extra option - `--compact-methods-binding`.

The option causes all instance methods binding in a single line: `this._bindMethods('method1', 'method2');`

Use of this option requres the application to be provided with `Object.prototype._bindMethods` implementated as follows:
```
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




