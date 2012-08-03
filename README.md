**Some reactive helpers for meteor**

**Install**

Use [meteorite](http://possibilities.github.com/meteorite/):

```json
{
  "packages": {
    "deps-extensions": {
      "git": "https://github.com/tmeasday/meteor-deps-extensions.git"
    }
  }
}
```

Then add via:

```bash
mrt add deps-extensions
```

**Usage**
 
```js
 Meteor.deps.add_reactive_variable(object, name, default_value)
```

Which adds three functions to object: object.name(), object.name.set() and object.name.equals() which behave reactively.


```js
 Meteor.deps.await(test_fn, cb)
```

Which will set up a context to repeatedly test test_fn and then call cb when it succeeds. There's more details and an example in the file.
