
'use strict';

var _ = require('lodash'),
	async = require('express-async');

/**
 * Create middleware that transparently contextualizes specific properties.
 *
 * It allows for other middleware to be oblivious that properties they are
 * manipulating are encapsulated within a specific context. For example, a
 * property "foo" contextualized on a per-middleware basis means that every time
 * middleware tries to access `req.foo` it manipulates a variable specific to
 * that piece of middleware. You may then later recover all the different
 * versions of `foo`, each specific to one particular middleware.
 *
 * @param {Object} options Configuration options.
 * @param {Array} options.properties The properties of request to contextualize.
 * @param {String} options.context Name of the variable to store in the request.
 * @returns {Function} Middleware.
 */
module.exports = function create(options) {

	/**
	 * @param {Object} object Thing to get the context identifier of.
	 * @returns {String} The context identifier.
	 */
	function get(object) {
		return object['__ctx_' + options.context];
	}

	/**
	 * @param {Object} object Thing to set the context identifier of.
	 * @param {String} value Chosen context identifier.
	 * @returns {void}
	 */
	function set(object, value) {
		object['__ctx_' + options.context] = value;
	}

	// Accept just a single string and normalize to options.properties.
	if (_.isString(options)) {
		options = [ options ];
	}

	// Accept just an array of strings and normalize to options.properties.
	if (_.isArray(options)) {
		options = { properties: options };
	}

	if (!_.isObject(options)) {
		throw new TypeError();
	}

	// Defaults.
	options = _.assign({
		context: 'context',
		get: get,
		set: set
	}, options);

	// Type checks
	var invalid = _.reject(options.properties, _.isString);

	if (invalid.length > 0 || !_.isArray(options.properties)) {
		throw new TypeError('Properties not strings: ' + invalid);
	}

	function context(req) {
		if (!_.has(req, options.context)) {
			throw new TypeError('Uncontextualized.');
		}
		return req[options.context];
	}

	function current(req) {
		var ctx = context(req), key = options.get(req);
		if (!_.has(ctx, key)) {
			ctx[key] = { };
		}
		return ctx[key];
	}

	var count = 0;

	/**
	 * @param {Function} middleware Middleware to contextualize.
	 * @returns {Function} Wrapped middleware.
	 */
	function wrap(middleware) {

		// Type safety
		if (!_.isFunction(middleware)) {
			throw new TypeError('Middleware must be a function.');
		}

		// Assign name if needed
		if (!options.get(middleware)) {
			options.set(middleware, 'middleware_ctx_' + (count++));
		}

		// Wrap
		return function wrapped(req, res, next) {
			options.set(req, options.get(middleware));
			middleware(req, res, function unload(err) {
				// Unload the context after the middleware has finished
				options.set(req, null);
				// Pass-thru
				next(err);
			});
		};
	}

	function pick(req, set) {
		if (_.isUndefined(this.context)) {
			return context(req);
		} else if (_.isArray(this.context) || set) {
			return _.pick(context(req), this.context);
		} else {
			return context(req)[this.context];
		}
	}

	function contextualize(req, property) {
		Object.defineProperty(req, property, {
			get: function getContextProperty() {
				return current(req)[property];
			},
			set: function setContextProperty(value) {
				current(req)[property] = value;
			}
		});
	}

	function inject(req) {
		if (!_.has(req, options.context)) {
			req[options.context] = { };
			_.forEach(options.properties, function forProperty(property) {
				contextualize(req, property);
			});
		}
	}

	function middleware(req, res, next) {
		inject(req);
		next();
	}

	function chain(fn) {
		return _.assign(async.serial([this, fn]), this);
	}

	function mixin(properties) {
		var self = this;
		return _.assign(function mixee(req, res, next) {
			self(req, res, next);
		}, this, properties);
	}

	function only(contexts) {
		var fn, ctx;
		if (_.isArray(contexts)) {
			fn = async.parallel(_.map(contexts, wrap));
			ctx = _.map(contexts, options.get);
		} else {
			fn = wrap(contexts);
			ctx = options.get(contexts);
		}
		return this.mixin({ context: ctx }).chain(fn);
	}

	return _.assign(middleware, {
		of: pick,
		for: only,
		get: options.get,
		set: options.set,
		chain: chain,
		mixin: mixin
	});
};
