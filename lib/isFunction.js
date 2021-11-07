const Tag = {
	FUNCTION: '[object Function]',
	ASYNC_FUNCTION: '[object AsyncFunction]'
};

/**
 * isFunction based on isFunction from lodash
 *
 * @license
 * Lodash <https://lodash.com/>
 * Copyright OpenJS Foundation and other contributors <https://openjsf.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */
export function isFunction(value) {
	const tag = Object.prototype.toString.call(value);
	return tag === Tag.FUNCTION || tag === Tag.ASYNC_FUNCTION;
}
