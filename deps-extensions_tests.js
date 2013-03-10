Tinytest.add("add reactive variable basics", function(test) {
  var obj = {};
  Meteor.deps.addReactiveVariable(obj, 'foo', 'default');

  test.equal(obj.foo(), 'default');
  test.equal(obj.foo.equals('default'), true);
  test.equal(obj.foo.equals('random'), false);

  obj.foo.set('random');
  test.equal(obj.foo(), 'random');
  test.equal(obj.foo.equals('default'), false);
  test.equal(obj.foo.equals('random'), true);

  // woops, better make sure resetting to the same value doesn't break us
  obj.foo.set('random');
  test.equal(obj.foo(), 'random');
});


var testCodeInvalidates = function(test, obj, should_be, callback) {
  obj.foo.set('first');

  var context = new Meteor.deps.Context();
  var invalidated = false;
  context.onInvalidate(function() { invalidated = true; });
  context.run(callback);
  test.equal(invalidated, false);

  obj.foo.set('second');
  Meteor.flush();
  test.equal(invalidated, should_be);
};

Tinytest.add("add reactive variable reactivity", function(test) {
  var obj = {};
  Meteor.deps.addReactiveVariable(obj, 'foo', 'default');
  Meteor.deps.addReactiveVariable(obj, 'bar', 'default');

  // this always invalidates when we change foo
  testCodeInvalidates(test, obj, true, function() {
    test.equal(obj.foo(), 'first');
  });

  // this never invalidates when we change foo
  testCodeInvalidates(test, obj, false, function() {
    test.equal(obj.bar(), 'default');
  });

  // reading foo(true) shouldn't behave reactively
  testCodeInvalidates(test, obj, false, function() {
    test.equal(obj.foo(true), 'first');
  });

  // this should invalidate as we go first -> second
  testCodeInvalidates(test, obj, true, function() {
    test.equal(obj.foo.equals('first'), true);
  });

  // this should invalidate as we go first -> second
  testCodeInvalidates(test, obj, true, function() {
    test.equal(obj.foo.equals('second'), false);
  });

  // this should NOT invalidate because we go first -> second (third isn't involved)
  testCodeInvalidates(test, obj, false, function() {
    test.equal(obj.foo.equals('third'), false);
  });
});


Tinytest.add("repeat", function(test) {
  var obj = {};
  Meteor.deps.addReactiveVariable(obj, 'foo', 'default');

  var repeatCalled = 0;
  Meteor.deps.repeat(function() {
    obj.foo();
    repeatCalled += 1;
  });

  test.equal(repeatCalled, 1);

  obj.foo.set(3);
  Meteor.flush();
  test.equal(repeatCalled, 2);

  obj.foo.set(5);
  Meteor.flush();
  test.equal(repeatCalled, 3);
});

Tinytest.add("isolate", function(test) {
  var obj = {};
  Meteor.deps.addReactiveVariable(obj, 'foo', 'default');

  var repeatCalled = 0;
  Meteor.deps.repeat(function() {
    var ret = Meteor.deps.isolate(function() {
      return obj.foo();
    });
    test.equal(ret, 'default');
    repeatCalled += 1;
  });

  test.equal(repeatCalled, 1);

  obj.foo.set(3);
  Meteor.flush();
  test.equal(repeatCalled, 1);

  obj.foo.set(5);
  Meteor.flush();
  test.equal(repeatCalled, 1);
});

Tinytest.add("await", function(test) {
  var obj = {};
  Meteor.deps.addReactiveVariable(obj, 'foo', 'default');

  var awaitCalled = 0;
  Meteor.deps.await(function() { return obj.foo.equals(5); }, function() {
    awaitCalled += 1;
  });

  test.equal(awaitCalled, 0);

  obj.foo.set(3);
  Meteor.flush();
  test.equal(awaitCalled, 0);

  obj.foo.set(5);
  Meteor.flush();
  test.equal(awaitCalled, 1);

  obj.foo.set(6);
  Meteor.flush();
  test.equal(awaitCalled, 1);

  obj.foo.set(5);
  Meteor.flush();
  test.equal(awaitCalled, 1);
});

Tinytest.add("memoize", function(test) {
  var obj = {};
  Meteor.deps.addReactiveVariable(obj, 'foo', 'default');

  var innerCalled = 0;
  var fn = Meteor.deps.memoize(function() {
    innerCalled += 1;
    return obj.foo();
  });
  Meteor.flush();
  test.equal(innerCalled, 1);

  var firstCalled = 0;
  Meteor.deps.repeat(function() {
    var ret = fn();
    test.equal(ret, obj.foo(true));
    firstCalled += 1;
  });

  Meteor.flush();
  test.equal(innerCalled, 1);
  test.equal(firstCalled, 1);

  var secondCalled = 0;
  Meteor.deps.repeat(function() {
    var ret = fn();
    test.equal(ret, obj.foo(true));
    secondCalled += 1;
  });

  Meteor.flush();
  test.equal(innerCalled, 1);
  test.equal(firstCalled, 1);
  test.equal(secondCalled, 1);

  obj.foo.set(3);
  Meteor.flush();
  test.equal(innerCalled, 2);
  test.equal(firstCalled, 2);
  test.equal(secondCalled, 2);

  obj.foo.set(4);
  Meteor.flush();
  test.equal(innerCalled, 3);
  test.equal(firstCalled, 3);
  test.equal(secondCalled, 3);
});
