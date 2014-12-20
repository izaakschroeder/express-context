# express-context

Middleware for [express] to seamlessly contextualize specific properties.

![build status](http://img.shields.io/travis/izaakschroeder/express-context.svg?style=flat&branch=master)
![coverage](http://img.shields.io/coveralls/izaakschroeder/express-context.svg?style=flat&branch=master)
![license](http://img.shields.io/npm/l/express-context.svg?style=flat)
![version](http://img.shields.io/npm/v/express-context.svg?style=flat)
![downloads](http://img.shields.io/npm/dm/express-context.svg?style=flat)

It allows for other middleware to be oblivious that properties they are manipulating are encapsulated within a specific context. For example, a property "foo" contextualized on a per-middleware basis means that every time middleware tries to access `req.foo` it manipulates a variable specific to that piece of middleware. You may then later recover all the different versions of `foo`, each specific to one particular middleware.

```javascript
var express = require('express'),
	contextualize = require('express-context'),
	app = express();

function mw1(req, res, next) {
	req.foo = 5;
	req.bar = 10;
	next();
}

function mw2(req, res, next) {
	req.foo = 7;
	req.bar = 1;
	next();
}

var context = contextualize(['foo', 'bar']);

var cmw1 = context.for(mw1),
	cmw2 = context.for(mw2);

app.get('/', cmw1, cmw2, function (req, res, next) {

	console.log(cmw1.of(req));
	// { foo: 5, bar: 10 }

	console.log(cmw2.of(req));
	// { foo: 7, bar: 1 }

	next();
});
```

## Building Fluent APIs

Create your API by creating a new context with an ID that's unique to your module, declaring all the properties that your API is concerned with, and then adding in all the mixins your module provides:

```javascript
var context = require('express-context');

var mixins = {
	ok: function() {
		var context = this;
		return this.chain(function(req, res, next) {
			req.status(200).send(context.of(req));
		});
	}
}

function api() {
	return context({
		context: '__my_api',
		properties: [ 'data' ]
	}).mixin(mixins);
}

module.exports = api;
```

Then make use of your API:

```javascript
var api = require('api')(),
	app = require('express')();

app.get('/all', api.ok());
app.get('/bob', api.for(function(req, res, next) {
	req.data = 'bob';
}).ok());
```

## API

### chain(method)

Continue the chain with a new method.

```javascript
// res is now middleware that invokes context AND the new given function
var res = context.chain(function(req, res, next) {
	next();
});
```

### mixin(properties)

Add new properties to the chain.

```javascript
// res now has everything in context plus foo = 5
var res = context.mixin({ foo: 5 });
```

### for(middleware)

Get chained middleware representing the contextualized version of the arguments.

```javascript
// res is a function for the contextualized version of mw1
// res is also a chain whose context is the context of mw1
var res = context.for(mw1);
```

```javascript
// res is a function for the parallel execution of contextualized versions of
// both mw1 and m2.
// res is also a chain whose context is the context of mw1 and mw2.
var res = context.for([mw1, mw2]);
```

### of(request)

Get the value of the chain's context for a specific request

```javascript
// res is an object whose keys correspond to all the contexts that were set
// during the processing of req.
var res = context.of(req);
```

```javascript
// res is the result of the single context for mw1 that was set during the
// processing of req.
var res = context.for(mw1).of(req);
```

[express]: http://expressjs.com/
