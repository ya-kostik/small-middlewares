import { jest, describe, test, expect } from '@jest/globals';

import { Middlewares } from './Middlewares.js';
import { MiddlewaresError } from './MiddlewaresError.js';

const wait = (ms) => new Promise(r => setTimeout(r, ms));

describe('Middlewares', () => {
	test('use', () => {
		const instance = new Middlewares();
		instance.use(() => {});
		expect(instance.length).toBe(1);
	});

	test('unuse', () => {
		const instance = new Middlewares();
		const middleware = () => {};
		instance.use(middleware);
		instance.use(() => {});
		expect(instance.length).toBe(2);
		instance.unuse(middleware);
		expect(instance.length).toBe(1);
	});

	test('use many', () => {
		const instance = new Middlewares();
		instance.use(() => {}, () => {});
		expect(instance.length).toBe(2);
	});

	test('unuse many', () => {
		const instance = new Middlewares();
		const testMiddlewares = [() => {}, () => {}, () => {}];
		instance.use(...testMiddlewares);
		expect(instance.length).toBe(testMiddlewares.length);
		const [m1, m2] = testMiddlewares;
		instance.unuse(m1, m2);
		expect(instance.length).toBe(testMiddlewares.length - 2);
	});

	test('unuse middleware which not exists', () => {
		const instance = new Middlewares();
		instance.use(() => {});
		expect(instance.length).toBe(1);
		instance.unuse(() => {});
		expect(instance.length).toBe(1);
	});

	test('unuse all instances of the middleware', () => {
		const instance = new Middlewares();
		const middleware = () => {};
		const middlewares = [jest.fn(), middleware, jest.fn(), middleware];
		instance.use(...middlewares);
		expect(instance.length).toBe(4);
		instance.unuse(middleware);
		expect(instance.length).toBe(2);
	});

	test('use an async funciton', () => {
		const instance = new Middlewares();
		instance.use(async () => {});
		expect(instance.length).toBe(1);
	});

	test('do not use a generator', () => {
		const instance = new Middlewares();
		const gen = function* () {};
		expect(() => instance.use(gen)).toThrow(MiddlewaresError);
	});

	test('do not use other types', () => {
		const instance = new Middlewares();
		const types = [0, 1, false, true, {}, [], Buffer.from([]), 'string'];
		for (const type of types) {
			expect(() => instance.use(type)).toThrow(MiddlewaresError);
		}
	});

	test('reset', () => {
		const instance = new Middlewares();
		const middlewares = [() => {}, () => {}, () => {}];
		instance.use(...middlewares);
		expect(instance.length).toBe(middlewares.length);
		instance.reset();
		expect(instance.length).toBe(0);
	});

	test('process', async () => {
		const instance = new Middlewares();
		const middlewares = [jest.fn(), jest.fn(), jest.fn(), jest.fn()];
		const args = [1, 2, 3];
		instance.use(...middlewares);
		await instance.process(...args);

		for (const middleware of middlewares) {
			expect(middleware).toHaveBeenCalledWith(...args);
		}

		await instance.process(...args);

		for (const middleware of middlewares) {
			expect(middleware).toHaveBeenCalledTimes(2);
		}
	});

	test('process break', async () => {
		const instance = new Middlewares();
		const middlewares = [jest.fn(() => false), jest.fn(() => true)];
		instance.use(...middlewares);
		await instance.process();

		const [called, notCalled] = middlewares;
		expect(called).toHaveBeenCalled();
		expect(notCalled).not.toHaveBeenCalled();
	});

	test('processWithStop', async () => {
		const instance = new Middlewares();
		const middlewares = [jest.fn(), jest.fn(), jest.fn(), jest.fn()];
		const args = [1, 2, 3];
		instance.use(...middlewares);
		await instance.processWithStop(...args);

		for (const middleware of middlewares) {
			expect(middleware).toHaveBeenCalledWith(...args, expect.any(Function));
		}
	});

	test('processWithStop break', async () => {
		const instance = new Middlewares();
		const middlewares = [jest.fn(), jest.fn(), jest.fn((a, b, c, stop) => stop()), jest.fn()];
		const args = [1, 2, 3];
		instance.use(...middlewares);
		await instance.processWithStop(...args);

		for (const middleware of middlewares.slice(0, middlewares.length - 1)) {
			expect(middleware).toHaveBeenCalledWith(...args, expect.any(Function));
		}

		const [last] = middlewares.slice(-1);
		expect(last).not.toHaveBeenCalled();
	});

	test('process async order', async () => {
		const instance = new Middlewares();
		const results = [];
		const expectedResults = [1, 2, 3];
		const middlewares = [
			jest.fn(async () => wait(30).then(results.push(1))),
			jest.fn(async () => wait(20).then(results.push(2))),
			jest.fn(async () => wait(10).then(results.push(3)))
		];
		instance.use(...middlewares);

		await instance.process();

		expect(results).toEqual(expectedResults);
	});

	test('processWithStop error break', async () => {
		const instance = new Middlewares();
		const message = 'stop error bla bla bla';
		const middlewares = [
			jest.fn(),
			jest.fn((stop) => stop(new Error(message))),
			jest.fn()
		];
		instance.use(...middlewares);
		await expect(
			() => instance.processWithStop()
		).rejects.toThrow(message);

		const [last] = middlewares.slice(-1);
		expect(last).not.toHaveBeenCalled();
	});

	test('useFirst', async () => {
		const instance = new Middlewares();
		const results = [];
		const expectedResults = [1, 0, 2, 3];
		const middlewares = [
			jest.fn(async () => wait(10).then(results.push(2))),
			jest.fn(async () => wait(5).then(results.push(3)))
		];
		const firstMiddlewares = [
			jest.fn(async () => wait(15).then(results.push(1))),
			jest.fn(async () => wait(20).then(results.push(0)))
		];

		instance.use(...middlewares);
		instance.useFirst(...firstMiddlewares);

		await instance.process();

		expect(results).toEqual(expectedResults);
	});

	test('useBefore', async () => {
		const instance = new Middlewares();
		const results = [];
		const expectedResults = [1, 0, 2, 3];
		const middlewares = [
			jest.fn(async () => wait(15).then(results.push(1))),
			jest.fn(async () => wait(10).then(results.push(2))),
			jest.fn(async () => wait(5).then(results.push(3)))
		];
		const zero = jest.fn(async () => wait(20).then(results.push(0)));

		const [, before] = middlewares;
		instance.use(...middlewares);
		instance.useBefore(before, zero);

		await instance.process();

		expect(results).toEqual(expectedResults);
	});

	test('useAfter', async () => {
		const instance = new Middlewares();
		const results = [];
		const expectedResults = [1, 2, 0, 3];
		const middlewares = [
			jest.fn(async () => wait(15).then(results.push(1))),
			jest.fn(async () => wait(10).then(results.push(2))),
			jest.fn(async () => wait(5).then(results.push(3)))
		];
		const zero = jest.fn(async () => wait(20).then(results.push(0)));

		const [, after] = middlewares;
		instance.use(...middlewares);
		instance.useAfter(after, zero);

		await instance.process();

		expect(results).toEqual(expectedResults);
	});
});
