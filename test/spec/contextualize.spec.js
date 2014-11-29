
'use strict';

var contextualize = require('contextualize'),
	express = require('express'),
	request = require('supertest');

describe('contextualize', function() {

	beforeEach(function() {
		this.app = express();
	});

	it('should', function() {
		contextualize('foo');
	});

	it('should', function() {
		contextualize([ 'foo', 'bar' ]);
	});

	it('should', function() {
		contextualize({ properties: ['foo', 'bar' ] });
	});

	it('should fail on invalid properties', function() {
		expect(function() {
			contextualize(5);
		}).to.throw(TypeError);
	});

	it('should fail on invalid properties', function() {
		expect(function() {
			contextualize({ properties: true });
		}).to.throw(TypeError);
	});

	it('should fail on invalid properties', function() {
		expect(function() {
			contextualize({ properties: [ 'yes', true ] });
		}).to.throw(TypeError);
	});

	it('should fail if the context is not set', function(done) {
		var context = contextualize('magic');
		this.app.use(context.of(function x(req, res, next) {
			req.magic = 'lol';
			next();
		}));
		request(this.app).get('/').expect(function(res) {
			expect(res.statusCode).to.equal(500);
		}).end(done);
	});

	it('should return contextualized values within middleware', function(done) {
		var context = contextualize('foo');
		this.app.use(context);

		this.app.use(context.of(function a(req, res, next) {
			req.foo = 'bananas';
			expect(req.foo).to.equal('bananas');
			next();
		}));

		this.app.get('/', function(req, res) {
			res.status(200).send(context.for(req));
		});

		request(this.app).get('/').end(done);
	});

	it('should work lel', function(done) {
		var context = contextualize({
			properties: [ 'foo' ],
			context: 'bananas'
		});

		this.app.use(context);

		this.app.use(context.of(function a(req, res, next) {
			req.foo = 'bananas';
			next();
		}));

		this.app.use(context.of(function b(req, res, next) {
			req.foo = 'apples';
			next();
		}));

		this.app.get('/', function(req, res) {
			res.status(200).send(context.for(req));
		});

		request(this.app).get('/').expect(function(res) {
			expect(res.body).to.deep.equal({
				a: { foo: 'bananas' },
				b: { foo: 'apples' }
			});
		}).end(done);
	});

	it('should generate names for anonymous functions', function() {
		var context = contextualize('foo');
		context.of(function() {

		});
	});

	describe('#for', function() {
		it('should fail on non-contextualized objects', function() {
			var context = contextualize('foo');
			expect(function() {
				context.for(function() {

				});
			}).to.throw(TypeError);
		});

		it('should fail on non-contextualized objects', function() {
			var context = contextualize('foo');
			expect(function() {
				context.for({ context: { } }, function() {

				});
			}).to.throw(TypeError);
		});
	});

	describe('#of', function() {
		it('should fail with no name', function() {
			var context = contextualize('foo');
			expect(function() {
				context.of('', function() {

				});
			}).to.throw(TypeError);
		});

		it('should fail with non-string name', function() {
			var context = contextualize('foo');
			expect(function() {
				context.of(true, function() {

				});
			}).to.throw(TypeError);
		});
	});
});
