#Some reactive helpers for meteor

##Install

Use [meteorite](http://oortcloud.github.com/meteorite/):
Then add via:

```bash
mrt add deps-extensions
```

##Usage

###Adding Reactive Variables
```js
 Meteor.deps.addReactiveVariable(object, 'something', default_value)
```

Which adds three functions to object: object.something(), object.something.set() and object.something.equals() which behave reactively.

###Using reactive contexts

####`repeat`
```js
Meteor.deps.repeat(fn)
```
Repeatedly call `fn`, once each time the dependencies that it uses changes. For example:
```js
Meteor.deps.repeat(function() {
  console.log("current_post_id is: " Session.get('current_post_id'));
});
```

####`isolate`
```js
Meteor.deps.isolate(fn)
```
Kill all reactivity inside `fn`, so that the current context isn't ever invalidated by that code. Returns the result of `fn`. For example:
```js
Meteor.deps.isolate(function() {
  return Comments.find({}, {order: {score: 1}});
});
```
Will return a list of comments that is 'unreactive' and thus won't reorder as the user reads them.

####`await`
```js
 Meteor.deps.await(predicate, cb)
```
Repeatedly (reactively) call `predicate` until it's true, then call `cb` *once only*. For example
```js
Meteor.deps.await(function() { return Router.currentPage() === 'home'; }, function() {
  alert('Welcome to my site! Nice to see you!');
});
```

####`memoize`
```js
 Meteor.deps.memoize(fn)
```
Returns a function that wraps `fn` in a context, so that `fn`'s reactivity can be maintained, whilst minimizing the number of calls to it. Example:
```js
var cheapReactiveFn = Meteor.deps.memoize(function() {
  return expensiveReactiveFn();
});
```
Now `reactiveFn` can be called many times, but `expensiveReactiveFn` will only get called once (per value it returns);
