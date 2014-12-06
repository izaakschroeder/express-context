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

function middleware1(req, res, next) {
	req.foo = 5;
	req.bar = 10;
	next();
}

function middleware2(req, res, next) {
	req.foo = 7;
	req.bar = 1;
	next();
}

var context = contextualize(['foo', 'bar']);

// Contextualize
app.use(context);

// Use routes with the give context
app.use(context.for(middleware1));
app.use(context.for(middleware2));

// Recover the context
app.use(function (req, res, next) {

	console.log(context.for(middleware1).of(req));
	// { foo: 5, bar: 10 }

	console.log(context.for(middleware2).of(req));
	// { foo: 7, bar: 1 }

	next();
});
```

[express]: http://expressjs.com/
