# small-middlewares
Small middlewares library for any purposes

# Install
## Yarn
```sh
yarn add small-middlewares
```
## NPM
```sh
npm install small-middlewares
```

# Usage examples
You should create an instance, and use it where you want.

```js
const instance = new Middlewares();
instance.use(() => console.info('You are in the first step'));
instance.use(() => console.info('You are one step closer'));
instance.use(() => console.info('You are in the third step'));

const result = await instance.process();
if (result) {
	// it happens, because all middlewares are completed, and result is true
	doSomethingAfterMiddlewaresChain();
}
```

## Stop execution chain
If you want to stop middlewares execution, just return `false` from one of them.

```js
const instance = new Middlewares();
instance.use(() => console.info('You are in the first step'));
instance.use(() => console.info('You are one step closer'));
instance.use((user) => user === 'admin');
instance.use(() => console.info('It happens only if user is admin'));

const user = 'notAdmin';
const result = await instance.process(user);
if (result) {
	// it not happens, because result is now false
	doSomethingAfterMiddlewaresChain();
}
```

## In classes

For example in pseudoclass:
```js
import { Middlewares } from 'small-middlewares';

class Log {
	constructor() {
		this.before = new Middlewares();
		this.after = new Middlewares();
	}

	#run(values) {
		console.info('You reached the log');
		console.log(values);
	}

	async run(values) {
		if (!await this.before.process(values)) return;
		this.#run(values);
		await this.after(values);
	}
}

const logger = new Log();

logger.before.use(() => console.info('You are in the first step'));
logger.before.use(() => console.info('You are one step closer'));
logger.before.use((values) => {
	// If we want to stop chain, when «values» is not an Array
	// we return false from middleware
	return Array.isArray(values);
});
```

## In HTTP routes
```js
import { createServer } from 'http';
import { Middlewares } from 'small-middlewares';

import { User } from './storage/models.js';

const middlewares = new Middlewares();

// Any middleware could be an async function
const isUser = async (req, res, scope) => {
	const user = await User.findByToken(req.headers.authorization);
	// stops chain, if no user found
	if (!user) return false;
	scope.user = user;
};

const isAdmin = (req, res, scope) => {
	const { user } = scope;
	// stops chain, if user is not an admin
	return user.isAdmin;
};

const logHeaders = (req) => {
	// just log every headers object
	console.dir(req.headers, { depth: 10 });
};

middlewares.use(logHeaders, isUser, isAdmin);

createServer(async (req, res) => {
	try {
		const scope = {};
		const result = await middlewares.process(req, res, scope);

		if (!result) {
			res.writeHead(400);
			return res.end('Bad Request');
		}

		res.writeHead(200, { 'Content-Type': 'application/json' });
		return res.end(JSON.stringify(scope.user));
	} catch(err) {
		console.error(err);
		res.writeHead(500);
		return res.end('Internal Error');
	}

}).
	listen(3000);
```

# Methods
## `instance.use(...middlewares)`
It adds one or many middlewares into the chain.
Each middleware is a new param

## `instance.unuse(...middlewares)`
It removes one or many middlewares from the chain.
Each middleware is a new param

## `instance.useFirst(...middlewares)`
It like use, but it adds middelewares in the head of the chain.
Each middleware is a new param

## `instance.useBefore(middleware, ...middlewares)`
It adds one or many middlewares before a specific middleware (first param)
Each middleware is a new param

## `instance.useAfter(middleware, ...middlewares)`
It adds one or many middlewares after a specific middleware (first param)
Each middleware is a new param

## `instance.reset()`
Removes all middlewares from the chain

## `instance.process(...args)`
Asynchronously calls middlewares from chain with the `...args`, one by one.
If any middleware returns or resolves `false`, chain will stop, and the method will resolve `false`.
In other case, the method will resolve `true`.

## `instance.processWithStop(...args)`
It like the process method, but has differenes.
Asynchronously calls middlewares from chain with the `...args` and `stop`, one by one.

`stop` is a special function, if middleware will call `stop`, it will stop the chain.
Let's rewrite one of the previous examples:
```js
const instance = new Middlewares();
instance.use(() => console.info('You are in the first step'));
instance.use(() => console.info('You are one step closer'));
instance.use((user, stop) => {
	// if user is not admin, middleware will stop chain
	if (user !== 'admin') stop();
});
instance.use(() => console.info('It happens only if user is admin'));

const user = 'notAdmin';
const result = await instance.process(user);
if (result) {
	// it not happens, because result is now false
	doSomethingAfterMiddlewaresChain();
}
```

The `processWithStop` does not check that returns or resolves a middleware.
The method stops only when `stop` function were called.

It also possible to put an error to the `stop` function.
If middleware do this, the error will be thrown from `processWithStop`.

The method resolves `false`, when it was stopped, and `true` in other case.

