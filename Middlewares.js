const ErrorMessage = {
	VALUE_IS_NOT_A_MIDDLEWARE: 'Value is not a middleware. Expected a Function or an AsyncFunction'
};

const FunctionTag = {
	FUNCTION: '[object Function]',
	ASYNC_FUNCTION: '[object AsyncFunction]'
};

const RelativePosition = {
	BEFORE: 0,
	AFTER: 1
};

/**
 * Checks that a middleware is correct
 * Based on isFunction from lodash <https://lodash.com/license>
 *
 * @license
 * Lodash <https://lodash.com/>
 * Copyright OpenJS Foundation and other contributors <https://openjsf.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */
export function isMiddleware(value) {
	const tag = Object.prototype.toString.call(value);
	return tag === FunctionTag.FUNCTION || tag === FunctionTag.ASYNC_FUNCTION;
}

/**
 * MiddlewaresError
 * Represents class for an errors from this module
 */
export class MiddlewaresError extends Error {}

/**
 * Middlewares
 * class for simple middlewares engine
 *
 * Run your functions one by one, and stop execution when you need it
 */
export class Middlewares {
	#middlewares = [];

	get length() {
		return this.#middlewares.length;
	}

	/**
	 * Add new middleware into the chain
	 * @param  {...Function} middlewares — to add, one by one, each middleware is a new param
	 */
	use(...middlewares) {
		this.#change('use', middlewares);
	}

	/**
	 * Remove the middleware from the chain
	 * @param  {...Function} middlewares — to remove, each middleware is a new param
	 */
	unuse(...middlewares) {
		this.#change('unuse', middlewares);
	}

	/**
	 * Add middleware into the beginig of the chain
	 * @param  {...Function} middlewares — to add, one by one, each middleware is a new param
	 */
	useFirst(...middlewares) {
		middlewares.reverse();
		this.#change('useFirst', middlewares);
	}

	/**
	 * Add middleware into the chain before specific function — the last argument
	 * @param  {Function} middleware — Function before which you need to insert middlewares
	 * @param  {...Function} middlewares — to add, one by one, each middleware is a new param
	 */
	useBefore(middleware, ...middlewares) {
		this.#change(
			'useRelative', middlewares, middleware, RelativePosition.BEFORE
		);
	}

	/**
	 * Add middleware into the chain before specific function — the last argument
	 * @param  {Function} middleware — Function after which you need to insert middlewares
	 * @param  {...Function} middlewares — to add, one by one, each middleware is a new param
	 */
	useAfter(middleware, ...middlewares) {
		this.#change(
			'useRelative', middlewares, middleware, RelativePosition.AFTER
		);
	}

	/**
	 * Remove all middlewares
	 */
	reset() {
		this.#middlewares = [];
	}

	#change(command, middlewares, ...args) {
		const commands = {
			use: (m) => this.#useOne(m),
			unuse: (m) => this.#unuseOne(m),
			useFirst: (m) => this.#useFirst(m),
			useRelative: (m, fn, diff) => this.#useRelative(m, fn, diff)
		};

		for (const middleware of middlewares) {
			if (!isMiddleware(middleware)) {
				throw new MiddlewaresError(ErrorMessage.VALUE_IS_NOT_A_MIDDLEWARE);
			}
			commands[command](middleware, ...args);
		}
	}

	#useOne(middleware) {
		this.#middlewares.push(middleware);
	}

	#unuseOne(middleware) {
		this.#middlewares = this.#middlewares.
			filter((m) => m !== middleware);
	}

	#useFirst(middleware) {
		this.#middlewares.unshift(middleware);
	}

	#useRelative(middleware, fn, diff) {
		for (let i = 0; i < this.#middlewares.length; i++) {
			const m = this.#middlewares[i];
			if (fn !== m) continue;
			this.#middlewares.splice(i + diff, 0, middleware);
			i += 1;
		}
	}

	/**
	 * Run middlewares
	 * If any of middleware returns false, all chain will be stopped
	 * Pass all own arguments to a middleware
	 * @return {Promise<boolean>} true/false — true if all chain is complete
	 */
	async process() {
		for (const middleware of this.#middlewares) {
			const isStop = await middleware(...arguments);
			if (isStop === false) return false;
		}
		return true;
	}

	/**
	 * Run middlewares
	 * If any of middleware calls cb in the last argument, all chain will be stopped
	 * @return {Promise<boolean>} true/false — true if all chain is complete
	 */
	async processWithStop() {
		let isStop = false;
		const stop = (err) => {
			isStop = true;
			if (err) throw err;
		};
		for (const middleware of this.#middlewares) {
			await middleware(...arguments, stop);
			if (isStop) return false;
		}
		return true;
	}

	#wrap(fn, type) {
		const middlewares = this;
		return async function() {
			const result = await middlewares[type](...arguments);
			if (!result) return;
			return fn.apply(this, arguments);
		};
	}

	/**
	 * Wraps around a function and returns new function which process middlewares
	 * If chain is completed, it will call the original function
	 * @param  {Function} fn — function to wrap around
	 * @return {Function} new wrapped function
	 */
	wrap(fn) {
		return this.#wrap(fn, 'process');
	}

	/**
	 * Wraps around a function and returns new function which process middlewares
	 * If chain is completed, it will call the original function
	 * @param  {Function} fn — function to wrap around
	 * @return {Function} new wrapped function
	 */
	wrapWithStop(fn) {
		return this.#wrap(fn, 'processWithStop');
	}
}
