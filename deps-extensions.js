(function(Meteor) {
// Add 3 functions to an object to create a reactive variable on it.
//
// For example Router.addReactiveVariable('currentPage', initial_value) will create three methods:
//
//   - Router.currentPage(notReactive = false):
//      reads the value of currentPage, reactively?
//
//   - Router.currentPage.equals(value):
//      is currentPage === value ala the session
//
//   - Router.currentPage.set(value):
//      changes the value of currentPage, reactively
//       (i.e. invalidates all contexts that have read this variable)

Meteor.deps.addReactiveVariable = function(object, name, value) {
  // the variable is hidden via closures
  var variable = value;
  var contexts = {}, equalsContexts = {};


  object[name] = function(notReactive) {
    return Meteor.deps.addReactiveVariable.readVariable(notReactive, variable, contexts);
  };

  object[name].equals = function(value) {
    return Meteor.deps.addReactiveVariable.variableEquals(value, variable, equalsContexts);
  };

  object[name].set = function(newValue) {
    variable = Meteor.deps.addReactiveVariable.setVariable(newValue, variable, contexts, equalsContexts);
  };
};

_.extend(Meteor.deps.addReactiveVariable, {
  readVariable: function (notReactive, variable, contexts) {
    // templates will pass in an object here, so we want to be sure they've passed true
    if (notReactive === true)
      return variable;

    var context = Meteor.deps.Context.current;

    if (context && !(context.id in contexts)) {
      contexts[context.id] = context;
      context.onInvalidate(function () {
        delete contexts[contexts.id];
      });
    }

    return variable;
  },

  variableEquals: function(value, variable, equalsContexts) {
    var context = Meteor.deps.Context.current;
    if (context) {
      if (!(value in equalsContexts))
        equalsContexts[value] = {};

      if (!(context.id in equalsContexts[value])) {
        equalsContexts[value][context.id] = context;
        context.onInvalidate(function () {
          delete equalsContexts[value][context.id];

          // clean up [key][value] if it's now empty, so we don't use
          // O(n) memory for n = values seen ever
          for (var x in equalsContexts[value])
            return;
          delete equalsContexts[value];
        });
      }
    }
    return variable === value;
  },

  setVariable: function(newValue, variable, contexts, equalsContexts) {
    var oldValue = variable;
    if (newValue === oldValue)
      return oldValue;

    var invalidate = function (map) {
      if (map)
        for (var id in map)
          map[id].invalidate();
    };

    invalidate(contexts);
    invalidate(equalsContexts[oldValue]);
    invalidate(equalsContexts[newValue]);

    return newValue;
  }
});

// just setup a basic reactive context.
//
// Example (continuing from above):
//   Meteor.deps.repeat(function() {
//     console.log(Router.currentPage());
//   });
Meteor.deps.repeat = function(fn) {
  var context = new Meteor.deps.Context();
  context.onInvalidate(function() {
    Meteor.deps.repeat(fn);
  });

  context.run(fn);
};

// kill reactivity in inner code
//
// Example: (will just return the first currentPage it sees):
//   Meteor.deps.isolate(function() {
//     return Router.currentPage();
//   });
Meteor.deps.isolate = function(fn) {
  var context = new Meteor.deps.Context();
  return context.run(fn);
};

// listen to a reactive fn and when it returns true call callback.
//
// Example (continuing from above):
//   Meteor.deps.await(function() { Router.currentPage_equals('home'); }, function() { console.log('first time at home'); });
Meteor.deps.await = function(testFn, callback) {
  var done = false;
  var context = new Meteor.deps.Context();
  context.onInvalidate(function() {
    if (!done)
      Meteor.deps.await(testFn, callback);
  });

  context.run(function() {
    if (testFn()) {
      done = true;
      callback();
    }
  });
};

}(Meteor));

Meteor.deps.memoize = function(fn) {
  var result;
  var contexts = {};

  Meteor.deps.repeat(function() {
    result = fn();

    for (var id in contexts)
      contexts[id].invalidate();
  });

  return function() {
    var context = Meteor.deps.Context.current;
    if (context && !(context.id in contexts)) {
      contexts[context.id] = context;
      context.onInvalidate(function () {
        delete contexts[contexts.id];
      });
    }

    return result;
  };
};