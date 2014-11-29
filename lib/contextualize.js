
'use strict';

var _ = require('lodash');

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
		if (!_.has(object, '__ctx_' + options.context)) {
			throw new TypeError();
		}
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

	function context(req, source) {
		if (!_.has(req, options.context)) {
			throw new TypeError('Uncontextualized.');
		}

		if (_.isUndefined(source)) {
			return req[options.context];
		}

		var key = options.get(source);

		if (!_.has(req[options.context], key)) {
			req[options.context][key] = { };
		}

		return req[options.context][key];
	}

	var count = 0;

	/**
	 * @param {String} name Name to associate with the middleware.
	 * @param {Function} middleware Middleware to contextualize.
	 * @returns {Function} Wrapped middleware.
	 */
	function use(name, middleware) {

		if (_.isFunction(name)) {
			middleware = name;
			name = middleware.name || ('anon_' + (count++));
		}

		if (_.isEmpty(name)) {
			throw new TypeError('Must provide a name.');
		}

		options.set(middleware, name);

		return function inject(req, res, next) {
			// Someone forgot to include the context middleware!
			if (!_.has(req, options.context)) {
				return next(new Error());
			}

			options.set(req, name);
			middleware(req, res, next);
		};
	}


	function contextualize(req, property) {
		Object.defineProperty(req, property, {
			get: function getContextProperty() {
				return context(req, req)[property];
			},
			set: function setContextProperty(value) {
				context(req, req)[property] = value;
			}
		});
	}

	// Middleware that injects the contextualization.
	function middleware(req, res, next) {
		req[options.context] = { };
		_.forEach(options.properties, function contextProperty(property) {
			contextualize(req, property);
		});
		next();
	}

	// Provide nice helper methods along with the middleware.
	return _.assign(middleware, {
		for: context,
		of: use
	});
};
