Tinytest.add("add reactive variable basics", function(test) {
  var obj = {};
  Meteor.deps.add_reactive_variable(obj, 'foo', 'default');
  
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


var test_code_invalidates = function(test, obj, should_be, callback) {
  obj.foo.set('first');
  
  var context = new Meteor.deps.Context();
  var invalidated = false;
  context.on_invalidate(function() { invalidated = true; });
  context.run(callback);
  test.equal(invalidated, false);
  
  obj.foo.set('second');
  Meteor.flush();
  test.equal(invalidated, should_be);
}

Tinytest.add("add reactive variable reactivity", function(test) {
  var obj = {};
  Meteor.deps.add_reactive_variable(obj, 'foo', 'default');
  Meteor.deps.add_reactive_variable(obj, 'bar', 'default');
  
  // this always invalidates when we change foo
  test_code_invalidates(test, obj, true, function() {
    test.equal(obj.foo(), 'first');
  });
  
  // this never invalidates when we change foo
  test_code_invalidates(test, obj, false, function() {
    test.equal(obj.bar(), 'default');
  });
  
  // reading foo(true) shouldn't behave reactively
  test_code_invalidates(test, obj, false, function() {
    test.equal(obj.foo(true), 'first');
  });
  
  // this should invalidate as we go first -> second
  test_code_invalidates(test, obj, true, function() {
    test.equal(obj.foo.equals('first'), true);
  });
  
  // this should invalidate as we go first -> second
  test_code_invalidates(test, obj, true, function() {
    test.equal(obj.foo.equals('second'), false);
  });
  
  // this should NOT invalidate because we go first -> second (third isn't involved)
  test_code_invalidates(test, obj, false, function() {
    test.equal(obj.foo.equals('third'), false);
  });  
});


Tinytest.add("repeat", function(test) {
  var obj = {};
  Meteor.deps.add_reactive_variable(obj, 'foo', 'default');
  
  var repeat_called = 0;
  Meteor.deps.repeat(function() {
    obj.foo();
    repeat_called += 1;
  });
  
  test.equal(repeat_called, 1);
  
  obj.foo.set(3);
  Meteor.flush();
  test.equal(repeat_called, 2);
  
  obj.foo.set(5);
  Meteor.flush();
  test.equal(repeat_called, 3);
});

Tinytest.add("isolate", function(test) {
  var obj = {};
  Meteor.deps.add_reactive_variable(obj, 'foo', 'default');
  
  var repeat_called = 0;
  Meteor.deps.repeat(function() {
    var ret = Meteor.deps.isolate(function() {
      return obj.foo();
    });
    test.equal(ret, 'default');
    repeat_called += 1;
  });
  
  test.equal(repeat_called, 1);
  
  obj.foo.set(3);
  Meteor.flush();
  test.equal(repeat_called, 1);
  
  obj.foo.set(5);
  Meteor.flush();
  test.equal(repeat_called, 1);
});

Tinytest.add("await", function(test) {
  var obj = {};
  Meteor.deps.add_reactive_variable(obj, 'foo', 'default');
  
  var await_called = 0;
  Meteor.deps.await(function() { return obj.foo.equals(5); }, function() {
    await_called += 1;
  });
  
  test.equal(await_called, 0);
  
  obj.foo.set(3);
  Meteor.flush();
  test.equal(await_called, 0);
  
  obj.foo.set(5);
  Meteor.flush();
  test.equal(await_called, 1);
  
  obj.foo.set(6);
  Meteor.flush();
  test.equal(await_called, 1);
  
  obj.foo.set(5);
  Meteor.flush();
  test.equal(await_called, 1);
});

Tinytest.add("memoize", function(test) {
  var obj = {};
  Meteor.deps.add_reactive_variable(obj, 'foo', 'default');
  
  var inner_called = 0;
  var fn = Meteor.deps.memoize(function() {
    inner_called += 1;
    return obj.foo();
  });
  Meteor.flush();
  test.equal(inner_called, 1);
  
  var first_called = 0;
  Meteor.deps.repeat(function() {
    var ret = fn();
    test.equal(ret, obj.foo(true));
    first_called += 1;
  });
  
  Meteor.flush();
  test.equal(inner_called, 1);
  test.equal(first_called, 1);
  
  var second_called = 0;
  Meteor.deps.repeat(function() {
    var ret = fn();
    test.equal(ret, obj.foo(true));
    second_called += 1;
  });
  
  Meteor.flush();
  test.equal(inner_called, 1);
  test.equal(first_called, 1);
  test.equal(second_called, 1);
  
  obj.foo.set(3);
  Meteor.flush();
  test.equal(inner_called, 2);
  test.equal(first_called, 2);
  test.equal(second_called, 2);
  
  obj.foo.set(4);
  Meteor.flush();
  test.equal(inner_called, 3);
  test.equal(first_called, 3);
  test.equal(second_called, 3);
});
