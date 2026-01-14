const __pluginConfig =  {
  "name": "windy-plugin-vfr-planner",
  "version": "0.1.0",
  "icon": "✈️",
  "title": "VFR Flight Planner",
  "description": "VFR flight planning with ForeFlight import support",
  "author": "Nicolas",
  "repository": "https://github.com/nrioux/windy-plugin-vfr-planner",
  "desktopUI": "rhpane",
  "mobileUI": "fullscreen",
  "desktopWidth": 400,
  "routerPath": "/vfr-planner",
  "private": true,
  "addToContextmenu": true,
  "listenToSingleclick": true,
  "built": 1768355326921,
  "builtReadable": "2026-01-14T01:48:46.921Z",
  "screenshot": "screenshot.jpg"
};

// transformCode: import bcast from '@windy/broadcast';
const bcast = W.broadcast;

// transformCode: import { map } from '@windy/map';
const { map } = W.map;

// transformCode: import { singleclick } from '@windy/singleclick';
const { singleclick } = W.singleclick;

// transformCode: import store from '@windy/store';
const store = W.store;

// transformCode: import { getPointForecastData, getMeteogramForecastData } from '@windy/fetch';
const { getPointForecastData, getMeteogramForecastData } = W.fetch;


/** @returns {void} */
function noop() {}

function run(fn) {
	return fn();
}

function blank_object() {
	return Object.create(null);
}

/**
 * @param {Function[]} fns
 * @returns {void}
 */
function run_all(fns) {
	fns.forEach(run);
}

/**
 * @param {any} thing
 * @returns {thing is Function}
 */
function is_function(thing) {
	return typeof thing === 'function';
}

/** @returns {boolean} */
function safe_not_equal(a, b) {
	return a != a ? b == b : a !== b || (a && typeof a === 'object') || typeof a === 'function';
}

/** @returns {boolean} */
function is_empty(obj) {
	return Object.keys(obj).length === 0;
}

/** @type {typeof globalThis} */
const globals =
	typeof window !== 'undefined'
		? window
		: typeof globalThis !== 'undefined'
		? globalThis
		: // @ts-ignore Node typings have this
		  global;

/**
 * @param {Node} target
 * @param {Node} node
 * @returns {void}
 */
function append(target, node) {
	target.appendChild(node);
}

/**
 * @param {Node} target
 * @param {string} style_sheet_id
 * @param {string} styles
 * @returns {void}
 */
function append_styles(target, style_sheet_id, styles) {
	const append_styles_to = get_root_for_style(target);
	if (!append_styles_to.getElementById(style_sheet_id)) {
		const style = element('style');
		style.id = style_sheet_id;
		style.textContent = styles;
		append_stylesheet(append_styles_to, style);
	}
}

/**
 * @param {Node} node
 * @returns {ShadowRoot | Document}
 */
function get_root_for_style(node) {
	if (!node) return document;
	const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
	if (root && /** @type {ShadowRoot} */ (root).host) {
		return /** @type {ShadowRoot} */ (root);
	}
	return node.ownerDocument;
}

/**
 * @param {ShadowRoot | Document} node
 * @param {HTMLStyleElement} style
 * @returns {CSSStyleSheet}
 */
function append_stylesheet(node, style) {
	append(/** @type {Document} */ (node).head || node, style);
	return style.sheet;
}

/**
 * @param {Node} target
 * @param {Node} node
 * @param {Node} [anchor]
 * @returns {void}
 */
function insert(target, node, anchor) {
	target.insertBefore(node, anchor || null);
}

/**
 * @param {Node} node
 * @returns {void}
 */
function detach(node) {
	if (node.parentNode) {
		node.parentNode.removeChild(node);
	}
}

/**
 * @returns {void} */
function destroy_each(iterations, detaching) {
	for (let i = 0; i < iterations.length; i += 1) {
		if (iterations[i]) iterations[i].d(detaching);
	}
}

/**
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} name
 * @returns {HTMLElementTagNameMap[K]}
 */
function element(name) {
	return document.createElement(name);
}

/**
 * @template {keyof SVGElementTagNameMap} K
 * @param {K} name
 * @returns {SVGElement}
 */
function svg_element(name) {
	return document.createElementNS('http://www.w3.org/2000/svg', name);
}

/**
 * @param {string} data
 * @returns {Text}
 */
function text(data) {
	return document.createTextNode(data);
}

/**
 * @returns {Text} */
function space() {
	return text(' ');
}

/**
 * @returns {Text} */
function empty() {
	return text('');
}

/**
 * @param {EventTarget} node
 * @param {string} event
 * @param {EventListenerOrEventListenerObject} handler
 * @param {boolean | AddEventListenerOptions | EventListenerOptions} [options]
 * @returns {() => void}
 */
function listen(node, event, handler, options) {
	node.addEventListener(event, handler, options);
	return () => node.removeEventListener(event, handler, options);
}

/**
 * @returns {(event: any) => any} */
function stop_propagation(fn) {
	return function (event) {
		event.stopPropagation();
		// @ts-ignore
		return fn.call(this, event);
	};
}

/**
 * @param {Element} node
 * @param {string} attribute
 * @param {string} [value]
 * @returns {void}
 */
function attr(node, attribute, value) {
	if (value == null) node.removeAttribute(attribute);
	else if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
}

/** @returns {number} */
function to_number(value) {
	return value === '' ? null : +value;
}

/**
 * @param {Element} element
 * @returns {ChildNode[]}
 */
function children(element) {
	return Array.from(element.childNodes);
}

/**
 * @param {Text} text
 * @param {unknown} data
 * @returns {void}
 */
function set_data(text, data) {
	data = '' + data;
	if (text.data === data) return;
	text.data = /** @type {string} */ (data);
}

/**
 * @returns {void} */
function set_input_value(input, value) {
	input.value = value == null ? '' : value;
}

/**
 * @returns {void} */
function set_style(node, key, value, important) {
	if (value == null) {
		node.style.removeProperty(key);
	} else {
		node.style.setProperty(key, value, '');
	}
}

/**
 * @returns {void} */
function toggle_class(element, name, toggle) {
	// The `!!` is required because an `undefined` flag means flipping the current state.
	element.classList.toggle(name, !!toggle);
}

/**
 * @template T
 * @param {string} type
 * @param {T} [detail]
 * @param {{ bubbles?: boolean, cancelable?: boolean }} [options]
 * @returns {CustomEvent<T>}
 */
function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
	return new CustomEvent(type, { detail, bubbles, cancelable });
}

/**
 * @typedef {Node & {
 * 	claim_order?: number;
 * 	hydrate_init?: true;
 * 	actual_end_child?: NodeEx;
 * 	childNodes: NodeListOf<NodeEx>;
 * }} NodeEx
 */

/** @typedef {ChildNode & NodeEx} ChildNodeEx */

/** @typedef {NodeEx & { claim_order: number }} NodeEx2 */

/**
 * @typedef {ChildNodeEx[] & {
 * 	claim_info?: {
 * 		last_index: number;
 * 		total_claimed: number;
 * 	};
 * }} ChildNodeArray
 */

let current_component;

/** @returns {void} */
function set_current_component(component) {
	current_component = component;
}

function get_current_component() {
	if (!current_component) throw new Error('Function called outside component initialization');
	return current_component;
}

/**
 * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
 * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
 * it can be called from an external module).
 *
 * If a function is returned _synchronously_ from `onMount`, it will be called when the component is unmounted.
 *
 * `onMount` does not run inside a [server-side component](https://svelte.dev/docs#run-time-server-side-component-api).
 *
 * https://svelte.dev/docs/svelte#onmount
 * @template T
 * @param {() => import('./private.js').NotFunction<T> | Promise<import('./private.js').NotFunction<T>> | (() => any)} fn
 * @returns {void}
 */
function onMount(fn) {
	get_current_component().$$.on_mount.push(fn);
}

/**
 * Schedules a callback to run immediately before the component is unmounted.
 *
 * Out of `onMount`, `beforeUpdate`, `afterUpdate` and `onDestroy`, this is the
 * only one that runs inside a server-side component.
 *
 * https://svelte.dev/docs/svelte#ondestroy
 * @param {() => any} fn
 * @returns {void}
 */
function onDestroy(fn) {
	get_current_component().$$.on_destroy.push(fn);
}

/**
 * Creates an event dispatcher that can be used to dispatch [component events](https://svelte.dev/docs#template-syntax-component-directives-on-eventname).
 * Event dispatchers are functions that can take two arguments: `name` and `detail`.
 *
 * Component events created with `createEventDispatcher` create a
 * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
 * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
 * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
 * property and can contain any type of data.
 *
 * The event dispatcher can be typed to narrow the allowed event names and the type of the `detail` argument:
 * ```ts
 * const dispatch = createEventDispatcher<{
 *  loaded: never; // does not take a detail argument
 *  change: string; // takes a detail argument of type string, which is required
 *  optional: number | null; // takes an optional detail argument of type number
 * }>();
 * ```
 *
 * https://svelte.dev/docs/svelte#createeventdispatcher
 * @template {Record<string, any>} [EventMap=any]
 * @returns {import('./public.js').EventDispatcher<EventMap>}
 */
function createEventDispatcher() {
	const component = get_current_component();
	return (type, detail, { cancelable = false } = {}) => {
		const callbacks = component.$$.callbacks[type];
		if (callbacks) {
			// TODO are there situations where events could be dispatched
			// in a server (non-DOM) environment?
			const event = custom_event(/** @type {string} */ (type), detail, { cancelable });
			callbacks.slice().forEach((fn) => {
				fn.call(component, event);
			});
			return !event.defaultPrevented;
		}
		return true;
	};
}

const dirty_components = [];
const binding_callbacks = [];

let render_callbacks = [];

const flush_callbacks = [];

const resolved_promise = /* @__PURE__ */ Promise.resolve();

let update_scheduled = false;

/** @returns {void} */
function schedule_update() {
	if (!update_scheduled) {
		update_scheduled = true;
		resolved_promise.then(flush);
	}
}

/** @returns {Promise<void>} */
function tick() {
	schedule_update();
	return resolved_promise;
}

/** @returns {void} */
function add_render_callback(fn) {
	render_callbacks.push(fn);
}

// flush() calls callbacks in this order:
// 1. All beforeUpdate callbacks, in order: parents before children
// 2. All bind:this callbacks, in reverse order: children before parents.
// 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
//    for afterUpdates called during the initial onMount, which are called in
//    reverse order: children before parents.
// Since callbacks might update component values, which could trigger another
// call to flush(), the following steps guard against this:
// 1. During beforeUpdate, any updated components will be added to the
//    dirty_components array and will cause a reentrant call to flush(). Because
//    the flush index is kept outside the function, the reentrant call will pick
//    up where the earlier call left off and go through all dirty components. The
//    current_component value is saved and restored so that the reentrant call will
//    not interfere with the "parent" flush() call.
// 2. bind:this callbacks cannot trigger new flush() calls.
// 3. During afterUpdate, any updated components will NOT have their afterUpdate
//    callback called a second time; the seen_callbacks set, outside the flush()
//    function, guarantees this behavior.
const seen_callbacks = new Set();

let flushidx = 0; // Do *not* move this inside the flush() function

/** @returns {void} */
function flush() {
	// Do not reenter flush while dirty components are updated, as this can
	// result in an infinite loop. Instead, let the inner flush handle it.
	// Reentrancy is ok afterwards for bindings etc.
	if (flushidx !== 0) {
		return;
	}
	const saved_component = current_component;
	do {
		// first, call beforeUpdate functions
		// and update components
		try {
			while (flushidx < dirty_components.length) {
				const component = dirty_components[flushidx];
				flushidx++;
				set_current_component(component);
				update(component.$$);
			}
		} catch (e) {
			// reset dirty state to not end up in a deadlocked state and then rethrow
			dirty_components.length = 0;
			flushidx = 0;
			throw e;
		}
		set_current_component(null);
		dirty_components.length = 0;
		flushidx = 0;
		while (binding_callbacks.length) binding_callbacks.pop()();
		// then, once components are updated, call
		// afterUpdate functions. This may cause
		// subsequent updates...
		for (let i = 0; i < render_callbacks.length; i += 1) {
			const callback = render_callbacks[i];
			if (!seen_callbacks.has(callback)) {
				// ...so guard against infinite loops
				seen_callbacks.add(callback);
				callback();
			}
		}
		render_callbacks.length = 0;
	} while (dirty_components.length);
	while (flush_callbacks.length) {
		flush_callbacks.pop()();
	}
	update_scheduled = false;
	seen_callbacks.clear();
	set_current_component(saved_component);
}

/** @returns {void} */
function update($$) {
	if ($$.fragment !== null) {
		$$.update();
		run_all($$.before_update);
		const dirty = $$.dirty;
		$$.dirty = [-1];
		$$.fragment && $$.fragment.p($$.ctx, dirty);
		$$.after_update.forEach(add_render_callback);
	}
}

/**
 * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
 * @param {Function[]} fns
 * @returns {void}
 */
function flush_render_callbacks(fns) {
	const filtered = [];
	const targets = [];
	render_callbacks.forEach((c) => (fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c)));
	targets.forEach((c) => c());
	render_callbacks = filtered;
}

const outroing = new Set();

/**
 * @type {Outro}
 */
let outros;

/**
 * @returns {void} */
function group_outros() {
	outros = {
		r: 0,
		c: [],
		p: outros // parent group
	};
}

/**
 * @returns {void} */
function check_outros() {
	if (!outros.r) {
		run_all(outros.c);
	}
	outros = outros.p;
}

/**
 * @param {import('./private.js').Fragment} block
 * @param {0 | 1} [local]
 * @returns {void}
 */
function transition_in(block, local) {
	if (block && block.i) {
		outroing.delete(block);
		block.i(local);
	}
}

/**
 * @param {import('./private.js').Fragment} block
 * @param {0 | 1} local
 * @param {0 | 1} [detach]
 * @param {() => void} [callback]
 * @returns {void}
 */
function transition_out(block, local, detach, callback) {
	if (block && block.o) {
		if (outroing.has(block)) return;
		outroing.add(block);
		outros.c.push(() => {
			outroing.delete(block);
			if (callback) {
				if (detach) block.d(1);
				callback();
			}
		});
		block.o(local);
	} else if (callback) {
		callback();
	}
}

/** @typedef {1} INTRO */
/** @typedef {0} OUTRO */
/** @typedef {{ direction: 'in' | 'out' | 'both' }} TransitionOptions */
/** @typedef {(node: Element, params: any, options: TransitionOptions) => import('../transition/public.js').TransitionConfig} TransitionFn */

/**
 * @typedef {Object} Outro
 * @property {number} r
 * @property {Function[]} c
 * @property {Object} p
 */

/**
 * @typedef {Object} PendingProgram
 * @property {number} start
 * @property {INTRO|OUTRO} b
 * @property {Outro} [group]
 */

/**
 * @typedef {Object} Program
 * @property {number} a
 * @property {INTRO|OUTRO} b
 * @property {1|-1} d
 * @property {number} duration
 * @property {number} start
 * @property {number} end
 * @property {Outro} [group]
 */

// general each functions:

function ensure_array_like(array_like_or_iterator) {
	return array_like_or_iterator?.length !== undefined
		? array_like_or_iterator
		: Array.from(array_like_or_iterator);
}

// keyed each functions:

/** @returns {void} */
function destroy_block(block, lookup) {
	block.d(1);
	lookup.delete(block.key);
}

/** @returns {any[]} */
function update_keyed_each(
	old_blocks,
	dirty,
	get_key,
	dynamic,
	ctx,
	list,
	lookup,
	node,
	destroy,
	create_each_block,
	next,
	get_context
) {
	let o = old_blocks.length;
	let n = list.length;
	let i = o;
	const old_indexes = {};
	while (i--) old_indexes[old_blocks[i].key] = i;
	const new_blocks = [];
	const new_lookup = new Map();
	const deltas = new Map();
	const updates = [];
	i = n;
	while (i--) {
		const child_ctx = get_context(ctx, list, i);
		const key = get_key(child_ctx);
		let block = lookup.get(key);
		if (!block) {
			block = create_each_block(key, child_ctx);
			block.c();
		} else {
			// defer updates until all the DOM shuffling is done
			updates.push(() => block.p(child_ctx, dirty));
		}
		new_lookup.set(key, (new_blocks[i] = block));
		if (key in old_indexes) deltas.set(key, Math.abs(i - old_indexes[key]));
	}
	const will_move = new Set();
	const did_move = new Set();
	/** @returns {void} */
	function insert(block) {
		transition_in(block, 1);
		block.m(node, next);
		lookup.set(block.key, block);
		next = block.first;
		n--;
	}
	while (o && n) {
		const new_block = new_blocks[n - 1];
		const old_block = old_blocks[o - 1];
		const new_key = new_block.key;
		const old_key = old_block.key;
		if (new_block === old_block) {
			// do nothing
			next = new_block.first;
			o--;
			n--;
		} else if (!new_lookup.has(old_key)) {
			// remove old block
			destroy(old_block, lookup);
			o--;
		} else if (!lookup.has(new_key) || will_move.has(new_key)) {
			insert(new_block);
		} else if (did_move.has(old_key)) {
			o--;
		} else if (deltas.get(new_key) > deltas.get(old_key)) {
			did_move.add(new_key);
			insert(new_block);
		} else {
			will_move.add(old_key);
			o--;
		}
	}
	while (o--) {
		const old_block = old_blocks[o];
		if (!new_lookup.has(old_block.key)) destroy(old_block, lookup);
	}
	while (n) insert(new_blocks[n - 1]);
	run_all(updates);
	return new_blocks;
}

/** @returns {void} */
function create_component(block) {
	block && block.c();
}

/** @returns {void} */
function mount_component(component, target, anchor) {
	const { fragment, after_update } = component.$$;
	fragment && fragment.m(target, anchor);
	// onMount happens before the initial afterUpdate
	add_render_callback(() => {
		const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
		// if the component was destroyed immediately
		// it will update the `$$.on_destroy` reference to `null`.
		// the destructured on_destroy may still reference to the old array
		if (component.$$.on_destroy) {
			component.$$.on_destroy.push(...new_on_destroy);
		} else {
			// Edge case - component was destroyed immediately,
			// most likely as a result of a binding initialising
			run_all(new_on_destroy);
		}
		component.$$.on_mount = [];
	});
	after_update.forEach(add_render_callback);
}

/** @returns {void} */
function destroy_component(component, detaching) {
	const $$ = component.$$;
	if ($$.fragment !== null) {
		flush_render_callbacks($$.after_update);
		run_all($$.on_destroy);
		$$.fragment && $$.fragment.d(detaching);
		// TODO null out other refs, including component.$$ (but need to
		// preserve final state?)
		$$.on_destroy = $$.fragment = null;
		$$.ctx = [];
	}
}

/** @returns {void} */
function make_dirty(component, i) {
	if (component.$$.dirty[0] === -1) {
		dirty_components.push(component);
		schedule_update();
		component.$$.dirty.fill(0);
	}
	component.$$.dirty[(i / 31) | 0] |= 1 << i % 31;
}

// TODO: Document the other params
/**
 * @param {SvelteComponent} component
 * @param {import('./public.js').ComponentConstructorOptions} options
 *
 * @param {import('./utils.js')['not_equal']} not_equal Used to compare props and state values.
 * @param {(target: Element | ShadowRoot) => void} [append_styles] Function that appends styles to the DOM when the component is first initialised.
 * This will be the `add_css` function from the compiled component.
 *
 * @returns {void}
 */
function init(
	component,
	options,
	instance,
	create_fragment,
	not_equal,
	props,
	append_styles = null,
	dirty = [-1]
) {
	const parent_component = current_component;
	set_current_component(component);
	/** @type {import('./private.js').T$$} */
	const $$ = (component.$$ = {
		fragment: null,
		ctx: [],
		// state
		props,
		update: noop,
		not_equal,
		bound: blank_object(),
		// lifecycle
		on_mount: [],
		on_destroy: [],
		on_disconnect: [],
		before_update: [],
		after_update: [],
		context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
		// everything else
		callbacks: blank_object(),
		dirty,
		skip_bound: false,
		root: options.target || parent_component.$$.root
	});
	append_styles && append_styles($$.root);
	let ready = false;
	$$.ctx = instance
		? instance(component, options.props || {}, (i, ret, ...rest) => {
				const value = rest.length ? rest[0] : ret;
				if ($$.ctx && not_equal($$.ctx[i], ($$.ctx[i] = value))) {
					if (!$$.skip_bound && $$.bound[i]) $$.bound[i](value);
					if (ready) make_dirty(component, i);
				}
				return ret;
		  })
		: [];
	$$.update();
	ready = true;
	run_all($$.before_update);
	// `false` as a special case of no DOM component
	$$.fragment = create_fragment ? create_fragment($$.ctx) : false;
	if (options.target) {
		if (options.hydrate) {
			// TODO: what is the correct type here?
			// @ts-expect-error
			const nodes = children(options.target);
			$$.fragment && $$.fragment.l(nodes);
			nodes.forEach(detach);
		} else {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			$$.fragment && $$.fragment.c();
		}
		if (options.intro) transition_in(component.$$.fragment);
		mount_component(component, options.target, options.anchor);
		flush();
	}
	set_current_component(parent_component);
}

/**
 * Base class for Svelte components. Used when dev=false.
 *
 * @template {Record<string, any>} [Props=any]
 * @template {Record<string, any>} [Events=any]
 */
class SvelteComponent {
	/**
	 * ### PRIVATE API
	 *
	 * Do not use, may change at any time
	 *
	 * @type {any}
	 */
	$$ = undefined;
	/**
	 * ### PRIVATE API
	 *
	 * Do not use, may change at any time
	 *
	 * @type {any}
	 */
	$$set = undefined;

	/** @returns {void} */
	$destroy() {
		destroy_component(this, 1);
		this.$destroy = noop;
	}

	/**
	 * @template {Extract<keyof Events, string>} K
	 * @param {K} type
	 * @param {((e: Events[K]) => void) | null | undefined} callback
	 * @returns {() => void}
	 */
	$on(type, callback) {
		if (!is_function(callback)) {
			return noop;
		}
		const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
		callbacks.push(callback);
		return () => {
			const index = callbacks.indexOf(callback);
			if (index !== -1) callbacks.splice(index, 1);
		};
	}

	/**
	 * @param {Partial<Props>} props
	 * @returns {void}
	 */
	$set(props) {
		if (this.$$set && !is_empty(props)) {
			this.$$.skip_bound = true;
			this.$$set(props);
			this.$$.skip_bound = false;
		}
	}
}

/**
 * @typedef {Object} CustomElementPropDefinition
 * @property {string} [attribute]
 * @property {boolean} [reflect]
 * @property {'String'|'Boolean'|'Number'|'Array'|'Object'} [type]
 */

// generated during release, do not modify

const PUBLIC_VERSION = '4';

if (typeof window !== 'undefined')
	// @ts-ignore
	(window.__svelte || (window.__svelte = { v: new Set() })).v.add(PUBLIC_VERSION);

const config = {
    name: 'windy-plugin-vfr-planner',
    title: 'VFR Flight Planner'};

var validator$2 = {};

var util$3 = {};

(function (exports$1) {

	const nameStartChar = ':A-Za-z_\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD';
	const nameChar = nameStartChar + '\\-.\\d\\u00B7\\u0300-\\u036F\\u203F-\\u2040';
	const nameRegexp = '[' + nameStartChar + '][' + nameChar + ']*';
	const regexName = new RegExp('^' + nameRegexp + '$');

	const getAllMatches = function(string, regex) {
	  const matches = [];
	  let match = regex.exec(string);
	  while (match) {
	    const allmatches = [];
	    allmatches.startIndex = regex.lastIndex - match[0].length;
	    const len = match.length;
	    for (let index = 0; index < len; index++) {
	      allmatches.push(match[index]);
	    }
	    matches.push(allmatches);
	    match = regex.exec(string);
	  }
	  return matches;
	};

	const isName = function(string) {
	  const match = regexName.exec(string);
	  return !(match === null || typeof match === 'undefined');
	};

	exports$1.isExist = function(v) {
	  return typeof v !== 'undefined';
	};

	exports$1.isEmptyObject = function(obj) {
	  return Object.keys(obj).length === 0;
	};

	/**
	 * Copy all the properties of a into b.
	 * @param {*} target
	 * @param {*} a
	 */
	exports$1.merge = function(target, a, arrayMode) {
	  if (a) {
	    const keys = Object.keys(a); // will return an array of own properties
	    const len = keys.length; //don't make it inline
	    for (let i = 0; i < len; i++) {
	      if (arrayMode === 'strict') {
	        target[keys[i]] = [ a[keys[i]] ];
	      } else {
	        target[keys[i]] = a[keys[i]];
	      }
	    }
	  }
	};
	/* exports.merge =function (b,a){
	  return Object.assign(b,a);
	} */

	exports$1.getValue = function(v) {
	  if (exports$1.isExist(v)) {
	    return v;
	  } else {
	    return '';
	  }
	};

	// const fakeCall = function(a) {return a;};
	// const fakeCallNoReturn = function() {};

	exports$1.isName = isName;
	exports$1.getAllMatches = getAllMatches;
	exports$1.nameRegexp = nameRegexp; 
} (util$3));

const util$2 = util$3;

const defaultOptions$2 = {
  allowBooleanAttributes: false, //A tag can have attributes without any value
  unpairedTags: []
};

//const tagsPattern = new RegExp("<\\/?([\\w:\\-_\.]+)\\s*\/?>","g");
validator$2.validate = function (xmlData, options) {
  options = Object.assign({}, defaultOptions$2, options);

  //xmlData = xmlData.replace(/(\r\n|\n|\r)/gm,"");//make it single line
  //xmlData = xmlData.replace(/(^\s*<\?xml.*?\?>)/g,"");//Remove XML starting tag
  //xmlData = xmlData.replace(/(<!DOCTYPE[\s\w\"\.\/\-\:]+(\[.*\])*\s*>)/g,"");//Remove DOCTYPE
  const tags = [];
  let tagFound = false;

  //indicates that the root tag has been closed (aka. depth 0 has been reached)
  let reachedRoot = false;

  if (xmlData[0] === '\ufeff') {
    // check for byte order mark (BOM)
    xmlData = xmlData.substr(1);
  }
  
  for (let i = 0; i < xmlData.length; i++) {

    if (xmlData[i] === '<' && xmlData[i+1] === '?') {
      i+=2;
      i = readPI(xmlData,i);
      if (i.err) return i;
    }else if (xmlData[i] === '<') {
      //starting of tag
      //read until you reach to '>' avoiding any '>' in attribute value
      let tagStartPos = i;
      i++;
      
      if (xmlData[i] === '!') {
        i = readCommentAndCDATA(xmlData, i);
        continue;
      } else {
        let closingTag = false;
        if (xmlData[i] === '/') {
          //closing tag
          closingTag = true;
          i++;
        }
        //read tagname
        let tagName = '';
        for (; i < xmlData.length &&
          xmlData[i] !== '>' &&
          xmlData[i] !== ' ' &&
          xmlData[i] !== '\t' &&
          xmlData[i] !== '\n' &&
          xmlData[i] !== '\r'; i++
        ) {
          tagName += xmlData[i];
        }
        tagName = tagName.trim();
        //console.log(tagName);

        if (tagName[tagName.length - 1] === '/') {
          //self closing tag without attributes
          tagName = tagName.substring(0, tagName.length - 1);
          //continue;
          i--;
        }
        if (!validateTagName(tagName)) {
          let msg;
          if (tagName.trim().length === 0) {
            msg = "Invalid space after '<'.";
          } else {
            msg = "Tag '"+tagName+"' is an invalid name.";
          }
          return getErrorObject('InvalidTag', msg, getLineNumberForPosition(xmlData, i));
        }

        const result = readAttributeStr(xmlData, i);
        if (result === false) {
          return getErrorObject('InvalidAttr', "Attributes for '"+tagName+"' have open quote.", getLineNumberForPosition(xmlData, i));
        }
        let attrStr = result.value;
        i = result.index;

        if (attrStr[attrStr.length - 1] === '/') {
          //self closing tag
          const attrStrStart = i - attrStr.length;
          attrStr = attrStr.substring(0, attrStr.length - 1);
          const isValid = validateAttributeString(attrStr, options);
          if (isValid === true) {
            tagFound = true;
            //continue; //text may presents after self closing tag
          } else {
            //the result from the nested function returns the position of the error within the attribute
            //in order to get the 'true' error line, we need to calculate the position where the attribute begins (i - attrStr.length) and then add the position within the attribute
            //this gives us the absolute index in the entire xml, which we can use to find the line at last
            return getErrorObject(isValid.err.code, isValid.err.msg, getLineNumberForPosition(xmlData, attrStrStart + isValid.err.line));
          }
        } else if (closingTag) {
          if (!result.tagClosed) {
            return getErrorObject('InvalidTag', "Closing tag '"+tagName+"' doesn't have proper closing.", getLineNumberForPosition(xmlData, i));
          } else if (attrStr.trim().length > 0) {
            return getErrorObject('InvalidTag', "Closing tag '"+tagName+"' can't have attributes or invalid starting.", getLineNumberForPosition(xmlData, tagStartPos));
          } else if (tags.length === 0) {
            return getErrorObject('InvalidTag', "Closing tag '"+tagName+"' has not been opened.", getLineNumberForPosition(xmlData, tagStartPos));
          } else {
            const otg = tags.pop();
            if (tagName !== otg.tagName) {
              let openPos = getLineNumberForPosition(xmlData, otg.tagStartPos);
              return getErrorObject('InvalidTag',
                "Expected closing tag '"+otg.tagName+"' (opened in line "+openPos.line+", col "+openPos.col+") instead of closing tag '"+tagName+"'.",
                getLineNumberForPosition(xmlData, tagStartPos));
            }

            //when there are no more tags, we reached the root level.
            if (tags.length == 0) {
              reachedRoot = true;
            }
          }
        } else {
          const isValid = validateAttributeString(attrStr, options);
          if (isValid !== true) {
            //the result from the nested function returns the position of the error within the attribute
            //in order to get the 'true' error line, we need to calculate the position where the attribute begins (i - attrStr.length) and then add the position within the attribute
            //this gives us the absolute index in the entire xml, which we can use to find the line at last
            return getErrorObject(isValid.err.code, isValid.err.msg, getLineNumberForPosition(xmlData, i - attrStr.length + isValid.err.line));
          }

          //if the root level has been reached before ...
          if (reachedRoot === true) {
            return getErrorObject('InvalidXml', 'Multiple possible root nodes found.', getLineNumberForPosition(xmlData, i));
          } else if(options.unpairedTags.indexOf(tagName) !== -1); else {
            tags.push({tagName, tagStartPos});
          }
          tagFound = true;
        }

        //skip tag text value
        //It may include comments and CDATA value
        for (i++; i < xmlData.length; i++) {
          if (xmlData[i] === '<') {
            if (xmlData[i + 1] === '!') {
              //comment or CADATA
              i++;
              i = readCommentAndCDATA(xmlData, i);
              continue;
            } else if (xmlData[i+1] === '?') {
              i = readPI(xmlData, ++i);
              if (i.err) return i;
            } else {
              break;
            }
          } else if (xmlData[i] === '&') {
            const afterAmp = validateAmpersand(xmlData, i);
            if (afterAmp == -1)
              return getErrorObject('InvalidChar', "char '&' is not expected.", getLineNumberForPosition(xmlData, i));
            i = afterAmp;
          }else {
            if (reachedRoot === true && !isWhiteSpace(xmlData[i])) {
              return getErrorObject('InvalidXml', "Extra text at the end", getLineNumberForPosition(xmlData, i));
            }
          }
        } //end of reading tag text value
        if (xmlData[i] === '<') {
          i--;
        }
      }
    } else {
      if ( isWhiteSpace(xmlData[i])) {
        continue;
      }
      return getErrorObject('InvalidChar', "char '"+xmlData[i]+"' is not expected.", getLineNumberForPosition(xmlData, i));
    }
  }

  if (!tagFound) {
    return getErrorObject('InvalidXml', 'Start tag expected.', 1);
  }else if (tags.length == 1) {
      return getErrorObject('InvalidTag', "Unclosed tag '"+tags[0].tagName+"'.", getLineNumberForPosition(xmlData, tags[0].tagStartPos));
  }else if (tags.length > 0) {
      return getErrorObject('InvalidXml', "Invalid '"+
          JSON.stringify(tags.map(t => t.tagName), null, 4).replace(/\r?\n/g, '')+
          "' found.", {line: 1, col: 1});
  }

  return true;
};

function isWhiteSpace(char){
  return char === ' ' || char === '\t' || char === '\n'  || char === '\r';
}
/**
 * Read Processing insstructions and skip
 * @param {*} xmlData
 * @param {*} i
 */
function readPI(xmlData, i) {
  const start = i;
  for (; i < xmlData.length; i++) {
    if (xmlData[i] == '?' || xmlData[i] == ' ') {
      //tagname
      const tagname = xmlData.substr(start, i - start);
      if (i > 5 && tagname === 'xml') {
        return getErrorObject('InvalidXml', 'XML declaration allowed only at the start of the document.', getLineNumberForPosition(xmlData, i));
      } else if (xmlData[i] == '?' && xmlData[i + 1] == '>') {
        //check if valid attribut string
        i++;
        break;
      } else {
        continue;
      }
    }
  }
  return i;
}

function readCommentAndCDATA(xmlData, i) {
  if (xmlData.length > i + 5 && xmlData[i + 1] === '-' && xmlData[i + 2] === '-') {
    //comment
    for (i += 3; i < xmlData.length; i++) {
      if (xmlData[i] === '-' && xmlData[i + 1] === '-' && xmlData[i + 2] === '>') {
        i += 2;
        break;
      }
    }
  } else if (
    xmlData.length > i + 8 &&
    xmlData[i + 1] === 'D' &&
    xmlData[i + 2] === 'O' &&
    xmlData[i + 3] === 'C' &&
    xmlData[i + 4] === 'T' &&
    xmlData[i + 5] === 'Y' &&
    xmlData[i + 6] === 'P' &&
    xmlData[i + 7] === 'E'
  ) {
    let angleBracketsCount = 1;
    for (i += 8; i < xmlData.length; i++) {
      if (xmlData[i] === '<') {
        angleBracketsCount++;
      } else if (xmlData[i] === '>') {
        angleBracketsCount--;
        if (angleBracketsCount === 0) {
          break;
        }
      }
    }
  } else if (
    xmlData.length > i + 9 &&
    xmlData[i + 1] === '[' &&
    xmlData[i + 2] === 'C' &&
    xmlData[i + 3] === 'D' &&
    xmlData[i + 4] === 'A' &&
    xmlData[i + 5] === 'T' &&
    xmlData[i + 6] === 'A' &&
    xmlData[i + 7] === '['
  ) {
    for (i += 8; i < xmlData.length; i++) {
      if (xmlData[i] === ']' && xmlData[i + 1] === ']' && xmlData[i + 2] === '>') {
        i += 2;
        break;
      }
    }
  }

  return i;
}

const doubleQuote = '"';
const singleQuote = "'";

/**
 * Keep reading xmlData until '<' is found outside the attribute value.
 * @param {string} xmlData
 * @param {number} i
 */
function readAttributeStr(xmlData, i) {
  let attrStr = '';
  let startChar = '';
  let tagClosed = false;
  for (; i < xmlData.length; i++) {
    if (xmlData[i] === doubleQuote || xmlData[i] === singleQuote) {
      if (startChar === '') {
        startChar = xmlData[i];
      } else if (startChar !== xmlData[i]) ; else {
        startChar = '';
      }
    } else if (xmlData[i] === '>') {
      if (startChar === '') {
        tagClosed = true;
        break;
      }
    }
    attrStr += xmlData[i];
  }
  if (startChar !== '') {
    return false;
  }

  return {
    value: attrStr,
    index: i,
    tagClosed: tagClosed
  };
}

/**
 * Select all the attributes whether valid or invalid.
 */
const validAttrStrRegxp = new RegExp('(\\s*)([^\\s=]+)(\\s*=)?(\\s*([\'"])(([\\s\\S])*?)\\5)?', 'g');

//attr, ="sd", a="amit's", a="sd"b="saf", ab  cd=""

function validateAttributeString(attrStr, options) {
  //console.log("start:"+attrStr+":end");

  //if(attrStr.trim().length === 0) return true; //empty string

  const matches = util$2.getAllMatches(attrStr, validAttrStrRegxp);
  const attrNames = {};

  for (let i = 0; i < matches.length; i++) {
    if (matches[i][1].length === 0) {
      //nospace before attribute name: a="sd"b="saf"
      return getErrorObject('InvalidAttr', "Attribute '"+matches[i][2]+"' has no space in starting.", getPositionFromMatch(matches[i]))
    } else if (matches[i][3] !== undefined && matches[i][4] === undefined) {
      return getErrorObject('InvalidAttr', "Attribute '"+matches[i][2]+"' is without value.", getPositionFromMatch(matches[i]));
    } else if (matches[i][3] === undefined && !options.allowBooleanAttributes) {
      //independent attribute: ab
      return getErrorObject('InvalidAttr', "boolean attribute '"+matches[i][2]+"' is not allowed.", getPositionFromMatch(matches[i]));
    }
    /* else if(matches[i][6] === undefined){//attribute without value: ab=
                    return { err: { code:"InvalidAttr",msg:"attribute " + matches[i][2] + " has no value assigned."}};
                } */
    const attrName = matches[i][2];
    if (!validateAttrName(attrName)) {
      return getErrorObject('InvalidAttr', "Attribute '"+attrName+"' is an invalid name.", getPositionFromMatch(matches[i]));
    }
    if (!attrNames.hasOwnProperty(attrName)) {
      //check for duplicate attribute.
      attrNames[attrName] = 1;
    } else {
      return getErrorObject('InvalidAttr', "Attribute '"+attrName+"' is repeated.", getPositionFromMatch(matches[i]));
    }
  }

  return true;
}

function validateNumberAmpersand(xmlData, i) {
  let re = /\d/;
  if (xmlData[i] === 'x') {
    i++;
    re = /[\da-fA-F]/;
  }
  for (; i < xmlData.length; i++) {
    if (xmlData[i] === ';')
      return i;
    if (!xmlData[i].match(re))
      break;
  }
  return -1;
}

function validateAmpersand(xmlData, i) {
  // https://www.w3.org/TR/xml/#dt-charref
  i++;
  if (xmlData[i] === ';')
    return -1;
  if (xmlData[i] === '#') {
    i++;
    return validateNumberAmpersand(xmlData, i);
  }
  let count = 0;
  for (; i < xmlData.length; i++, count++) {
    if (xmlData[i].match(/\w/) && count < 20)
      continue;
    if (xmlData[i] === ';')
      break;
    return -1;
  }
  return i;
}

function getErrorObject(code, message, lineNumber) {
  return {
    err: {
      code: code,
      msg: message,
      line: lineNumber.line || lineNumber,
      col: lineNumber.col,
    },
  };
}

function validateAttrName(attrName) {
  return util$2.isName(attrName);
}

// const startsWithXML = /^xml/i;

function validateTagName(tagname) {
  return util$2.isName(tagname) /* && !tagname.match(startsWithXML) */;
}

//this function returns the line number for the character at the given index
function getLineNumberForPosition(xmlData, index) {
  const lines = xmlData.substring(0, index).split(/\r?\n/);
  return {
    line: lines.length,

    // column number is last line's length + 1, because column numbering starts at 1:
    col: lines[lines.length - 1].length + 1
  };
}

//this function returns the position of the first character of match within attrStr
function getPositionFromMatch(match) {
  return match.startIndex + match[1].length;
}

var OptionsBuilder = {};

const defaultOptions$1 = {
    preserveOrder: false,
    attributeNamePrefix: '@_',
    attributesGroupName: false,
    textNodeName: '#text',
    ignoreAttributes: true,
    removeNSPrefix: false, // remove NS from tag name or attribute name if true
    allowBooleanAttributes: false, //a tag can have attributes without any value
    //ignoreRootElement : false,
    parseTagValue: true,
    parseAttributeValue: false,
    trimValues: true, //Trim string values of tag and attributes
    cdataPropName: false,
    numberParseOptions: {
      hex: true,
      leadingZeros: true,
      eNotation: true
    },
    tagValueProcessor: function(tagName, val) {
      return val;
    },
    attributeValueProcessor: function(attrName, val) {
      return val;
    },
    stopNodes: [], //nested tags will not be parsed even for errors
    alwaysCreateTextNode: false,
    isArray: () => false,
    commentPropName: false,
    unpairedTags: [],
    processEntities: true,
    htmlEntities: false,
    ignoreDeclaration: false,
    ignorePiTags: false,
    transformTagName: false,
    transformAttributeName: false,
    updateTag: function(tagName, jPath, attrs){
      return tagName
    },
    // skipEmptyListItem: false
};
   
const buildOptions$1 = function(options) {
    return Object.assign({}, defaultOptions$1, options);
};

OptionsBuilder.buildOptions = buildOptions$1;
OptionsBuilder.defaultOptions = defaultOptions$1;

class XmlNode{
  constructor(tagname) {
    this.tagname = tagname;
    this.child = []; //nested tags, text, cdata, comments in order
    this[":@"] = {}; //attributes map
  }
  add(key,val){
    // this.child.push( {name : key, val: val, isCdata: isCdata });
    if(key === "__proto__") key = "#__proto__";
    this.child.push( {[key]: val });
  }
  addChild(node) {
    if(node.tagname === "__proto__") node.tagname = "#__proto__";
    if(node[":@"] && Object.keys(node[":@"]).length > 0){
      this.child.push( { [node.tagname]: node.child, [":@"]: node[":@"] });
    }else {
      this.child.push( { [node.tagname]: node.child });
    }
  };
}

var xmlNode$1 = XmlNode;

const util$1 = util$3;

//TODO: handle comments
function readDocType$1(xmlData, i){
    
    const entities = {};
    if( xmlData[i + 3] === 'O' &&
         xmlData[i + 4] === 'C' &&
         xmlData[i + 5] === 'T' &&
         xmlData[i + 6] === 'Y' &&
         xmlData[i + 7] === 'P' &&
         xmlData[i + 8] === 'E')
    {    
        i = i+9;
        let angleBracketsCount = 1;
        let hasBody = false, comment = false;
        let exp = "";
        for(;i<xmlData.length;i++){
            if (xmlData[i] === '<' && !comment) { //Determine the tag type
                if( hasBody && isEntity(xmlData, i)){
                    i += 7; 
                    let entityName, val;
                    [entityName, val,i] = readEntityExp(xmlData,i+1);
                    if(val.indexOf("&") === -1) //Parameter entities are not supported
                        entities[ validateEntityName(entityName) ] = {
                            regx : RegExp( `&${entityName};`,"g"),
                            val: val
                        };
                }
                else if( hasBody && isElement(xmlData, i))  i += 8;//Not supported
                else if( hasBody && isAttlist(xmlData, i))  i += 8;//Not supported
                else if( hasBody && isNotation(xmlData, i)) i += 9;//Not supported
                else if( isComment)                         comment = true;
                else                                        throw new Error("Invalid DOCTYPE");

                angleBracketsCount++;
                exp = "";
            } else if (xmlData[i] === '>') { //Read tag content
                if(comment){
                    if( xmlData[i - 1] === "-" && xmlData[i - 2] === "-"){
                        comment = false;
                        angleBracketsCount--;
                    }
                }else {
                    angleBracketsCount--;
                }
                if (angleBracketsCount === 0) {
                  break;
                }
            }else if( xmlData[i] === '['){
                hasBody = true;
            }else {
                exp += xmlData[i];
            }
        }
        if(angleBracketsCount !== 0){
            throw new Error(`Unclosed DOCTYPE`);
        }
    }else {
        throw new Error(`Invalid Tag instead of DOCTYPE`);
    }
    return {entities, i};
}

function readEntityExp(xmlData,i){
    //External entities are not supported
    //    <!ENTITY ext SYSTEM "http://normal-website.com" >

    //Parameter entities are not supported
    //    <!ENTITY entityname "&anotherElement;">

    //Internal entities are supported
    //    <!ENTITY entityname "replacement text">
    
    //read EntityName
    let entityName = "";
    for (; i < xmlData.length && (xmlData[i] !== "'" && xmlData[i] !== '"' ); i++) {
        // if(xmlData[i] === " ") continue;
        // else 
        entityName += xmlData[i];
    }
    entityName = entityName.trim();
    if(entityName.indexOf(" ") !== -1) throw new Error("External entites are not supported");

    //read Entity Value
    const startChar = xmlData[i++];
    let val = "";
    for (; i < xmlData.length && xmlData[i] !== startChar ; i++) {
        val += xmlData[i];
    }
    return [entityName, val, i];
}

function isComment(xmlData, i){
    if(xmlData[i+1] === '!' &&
    xmlData[i+2] === '-' &&
    xmlData[i+3] === '-') return true
    return false
}
function isEntity(xmlData, i){
    if(xmlData[i+1] === '!' &&
    xmlData[i+2] === 'E' &&
    xmlData[i+3] === 'N' &&
    xmlData[i+4] === 'T' &&
    xmlData[i+5] === 'I' &&
    xmlData[i+6] === 'T' &&
    xmlData[i+7] === 'Y') return true
    return false
}
function isElement(xmlData, i){
    if(xmlData[i+1] === '!' &&
    xmlData[i+2] === 'E' &&
    xmlData[i+3] === 'L' &&
    xmlData[i+4] === 'E' &&
    xmlData[i+5] === 'M' &&
    xmlData[i+6] === 'E' &&
    xmlData[i+7] === 'N' &&
    xmlData[i+8] === 'T') return true
    return false
}

function isAttlist(xmlData, i){
    if(xmlData[i+1] === '!' &&
    xmlData[i+2] === 'A' &&
    xmlData[i+3] === 'T' &&
    xmlData[i+4] === 'T' &&
    xmlData[i+5] === 'L' &&
    xmlData[i+6] === 'I' &&
    xmlData[i+7] === 'S' &&
    xmlData[i+8] === 'T') return true
    return false
}
function isNotation(xmlData, i){
    if(xmlData[i+1] === '!' &&
    xmlData[i+2] === 'N' &&
    xmlData[i+3] === 'O' &&
    xmlData[i+4] === 'T' &&
    xmlData[i+5] === 'A' &&
    xmlData[i+6] === 'T' &&
    xmlData[i+7] === 'I' &&
    xmlData[i+8] === 'O' &&
    xmlData[i+9] === 'N') return true
    return false
}

function validateEntityName(name){
    if (util$1.isName(name))
	return name;
    else
        throw new Error(`Invalid entity name ${name}`);
}

var DocTypeReader = readDocType$1;

const hexRegex = /^[-+]?0x[a-fA-F0-9]+$/;
const numRegex = /^([\-\+])?(0*)([0-9]*(\.[0-9]*)?)$/;
// const octRegex = /^0x[a-z0-9]+/;
// const binRegex = /0x[a-z0-9]+/;

 
const consider = {
    hex :  true,
    // oct: false,
    leadingZeros: true,
    decimalPoint: "\.",
    eNotation: true,
    //skipLike: /regex/
};

function toNumber$1(str, options = {}){
    options = Object.assign({}, consider, options );
    if(!str || typeof str !== "string" ) return str;
    
    let trimmedStr  = str.trim();
    
    if(options.skipLike !== undefined && options.skipLike.test(trimmedStr)) return str;
    else if(str==="0") return 0;
    else if (options.hex && hexRegex.test(trimmedStr)) {
        return parse_int(trimmedStr, 16);
    // }else if (options.oct && octRegex.test(str)) {
    //     return Number.parseInt(val, 8);
    }else if (trimmedStr.search(/[eE]/)!== -1) { //eNotation
        const notation = trimmedStr.match(/^([-\+])?(0*)([0-9]*(\.[0-9]*)?[eE][-\+]?[0-9]+)$/); 
        // +00.123 => [ , '+', '00', '.123', ..
        if(notation){
            // console.log(notation)
            if(options.leadingZeros){ //accept with leading zeros
                trimmedStr = (notation[1] || "") + notation[3];
            }else {
                if(notation[2] === "0" && notation[3][0]=== ".");else {
                    return str;
                }
            }
            return options.eNotation ? Number(trimmedStr) : str;
        }else {
            return str;
        }
    // }else if (options.parseBin && binRegex.test(str)) {
    //     return Number.parseInt(val, 2);
    }else {
        //separate negative sign, leading zeros, and rest number
        const match = numRegex.exec(trimmedStr);
        // +00.123 => [ , '+', '00', '.123', ..
        if(match){
            const sign = match[1];
            const leadingZeros = match[2];
            let numTrimmedByZeros = trimZeros(match[3]); //complete num without leading zeros
            //trim ending zeros for floating number
            
            if(!options.leadingZeros && leadingZeros.length > 0 && sign && trimmedStr[2] !== ".") return str; //-0123
            else if(!options.leadingZeros && leadingZeros.length > 0 && !sign && trimmedStr[1] !== ".") return str; //0123
            else if(options.leadingZeros && leadingZeros===str) return 0; //00
            
            else {//no leading zeros or leading zeros are allowed
                const num = Number(trimmedStr);
                const numStr = "" + num;

                if(numStr.search(/[eE]/) !== -1){ //given number is long and parsed to eNotation
                    if(options.eNotation) return num;
                    else return str;
                }else if(trimmedStr.indexOf(".") !== -1){ //floating number
                    if(numStr === "0" && (numTrimmedByZeros === "") ) return num; //0.0
                    else if(numStr === numTrimmedByZeros) return num; //0.456. 0.79000
                    else if( sign && numStr === "-"+numTrimmedByZeros) return num;
                    else return str;
                }
                
                if(leadingZeros){
                    return (numTrimmedByZeros === numStr) || (sign+numTrimmedByZeros === numStr) ? num : str
                }else  {
                    return (trimmedStr === numStr) || (trimmedStr === sign+numStr) ? num : str
                }
            }
        }else { //non-numeric string
            return str;
        }
    }
}

/**
 * 
 * @param {string} numStr without leading zeros
 * @returns 
 */
function trimZeros(numStr){
    if(numStr && numStr.indexOf(".") !== -1){//float
        numStr = numStr.replace(/0+$/, ""); //remove ending zeros
        if(numStr === ".")  numStr = "0";
        else if(numStr[0] === ".")  numStr = "0"+numStr;
        else if(numStr[numStr.length-1] === ".")  numStr = numStr.substr(0,numStr.length-1);
        return numStr;
    }
    return numStr;
}

function parse_int(numStr, base){
    //polyfill
    if(parseInt) return parseInt(numStr, base);
    else if(Number.parseInt) return Number.parseInt(numStr, base);
    else if(window && window.parseInt) return window.parseInt(numStr, base);
    else throw new Error("parseInt, Number.parseInt, window.parseInt are not supported")
}

var strnum = toNumber$1;

function getIgnoreAttributesFn$2(ignoreAttributes) {
    if (typeof ignoreAttributes === 'function') {
        return ignoreAttributes
    }
    if (Array.isArray(ignoreAttributes)) {
        return (attrName) => {
            for (const pattern of ignoreAttributes) {
                if (typeof pattern === 'string' && attrName === pattern) {
                    return true
                }
                if (pattern instanceof RegExp && pattern.test(attrName)) {
                    return true
                }
            }
        }
    }
    return () => false
}

var ignoreAttributes = getIgnoreAttributesFn$2;

///@ts-check

const util = util$3;
const xmlNode = xmlNode$1;
const readDocType = DocTypeReader;
const toNumber = strnum;
const getIgnoreAttributesFn$1 = ignoreAttributes;

// const regx =
//   '<((!\\[CDATA\\[([\\s\\S]*?)(]]>))|((NAME:)?(NAME))([^>]*)>|((\\/)(NAME)\\s*>))([^<]*)'
//   .replace(/NAME/g, util.nameRegexp);

//const tagsRegx = new RegExp("<(\\/?[\\w:\\-\._]+)([^>]*)>(\\s*"+cdataRegx+")*([^<]+)?","g");
//const tagsRegx = new RegExp("<(\\/?)((\\w*:)?([\\w:\\-\._]+))([^>]*)>([^<]*)("+cdataRegx+"([^<]*))*([^<]+)?","g");

let OrderedObjParser$1 = class OrderedObjParser{
  constructor(options){
    this.options = options;
    this.currentNode = null;
    this.tagsNodeStack = [];
    this.docTypeEntities = {};
    this.lastEntities = {
      "apos" : { regex: /&(apos|#39|#x27);/g, val : "'"},
      "gt" : { regex: /&(gt|#62|#x3E);/g, val : ">"},
      "lt" : { regex: /&(lt|#60|#x3C);/g, val : "<"},
      "quot" : { regex: /&(quot|#34|#x22);/g, val : "\""},
    };
    this.ampEntity = { regex: /&(amp|#38|#x26);/g, val : "&"};
    this.htmlEntities = {
      "space": { regex: /&(nbsp|#160);/g, val: " " },
      // "lt" : { regex: /&(lt|#60);/g, val: "<" },
      // "gt" : { regex: /&(gt|#62);/g, val: ">" },
      // "amp" : { regex: /&(amp|#38);/g, val: "&" },
      // "quot" : { regex: /&(quot|#34);/g, val: "\"" },
      // "apos" : { regex: /&(apos|#39);/g, val: "'" },
      "cent" : { regex: /&(cent|#162);/g, val: "¢" },
      "pound" : { regex: /&(pound|#163);/g, val: "£" },
      "yen" : { regex: /&(yen|#165);/g, val: "¥" },
      "euro" : { regex: /&(euro|#8364);/g, val: "€" },
      "copyright" : { regex: /&(copy|#169);/g, val: "©" },
      "reg" : { regex: /&(reg|#174);/g, val: "®" },
      "inr" : { regex: /&(inr|#8377);/g, val: "₹" },
      "num_dec": { regex: /&#([0-9]{1,7});/g, val : (_, str) => String.fromCharCode(Number.parseInt(str, 10)) },
      "num_hex": { regex: /&#x([0-9a-fA-F]{1,6});/g, val : (_, str) => String.fromCharCode(Number.parseInt(str, 16)) },
    };
    this.addExternalEntities = addExternalEntities;
    this.parseXml = parseXml;
    this.parseTextData = parseTextData;
    this.resolveNameSpace = resolveNameSpace;
    this.buildAttributesMap = buildAttributesMap;
    this.isItStopNode = isItStopNode;
    this.replaceEntitiesValue = replaceEntitiesValue$1;
    this.readStopNodeData = readStopNodeData;
    this.saveTextToParentTag = saveTextToParentTag;
    this.addChild = addChild;
    this.ignoreAttributesFn = getIgnoreAttributesFn$1(this.options.ignoreAttributes);
  }

};

function addExternalEntities(externalEntities){
  const entKeys = Object.keys(externalEntities);
  for (let i = 0; i < entKeys.length; i++) {
    const ent = entKeys[i];
    this.lastEntities[ent] = {
       regex: new RegExp("&"+ent+";","g"),
       val : externalEntities[ent]
    };
  }
}

/**
 * @param {string} val
 * @param {string} tagName
 * @param {string} jPath
 * @param {boolean} dontTrim
 * @param {boolean} hasAttributes
 * @param {boolean} isLeafNode
 * @param {boolean} escapeEntities
 */
function parseTextData(val, tagName, jPath, dontTrim, hasAttributes, isLeafNode, escapeEntities) {
  if (val !== undefined) {
    if (this.options.trimValues && !dontTrim) {
      val = val.trim();
    }
    if(val.length > 0){
      if(!escapeEntities) val = this.replaceEntitiesValue(val);
      
      const newval = this.options.tagValueProcessor(tagName, val, jPath, hasAttributes, isLeafNode);
      if(newval === null || newval === undefined){
        //don't parse
        return val;
      }else if(typeof newval !== typeof val || newval !== val){
        //overwrite
        return newval;
      }else if(this.options.trimValues){
        return parseValue(val, this.options.parseTagValue, this.options.numberParseOptions);
      }else {
        const trimmedVal = val.trim();
        if(trimmedVal === val){
          return parseValue(val, this.options.parseTagValue, this.options.numberParseOptions);
        }else {
          return val;
        }
      }
    }
  }
}

function resolveNameSpace(tagname) {
  if (this.options.removeNSPrefix) {
    const tags = tagname.split(':');
    const prefix = tagname.charAt(0) === '/' ? '/' : '';
    if (tags[0] === 'xmlns') {
      return '';
    }
    if (tags.length === 2) {
      tagname = prefix + tags[1];
    }
  }
  return tagname;
}

//TODO: change regex to capture NS
//const attrsRegx = new RegExp("([\\w\\-\\.\\:]+)\\s*=\\s*(['\"])((.|\n)*?)\\2","gm");
const attrsRegx = new RegExp('([^\\s=]+)\\s*(=\\s*([\'"])([\\s\\S]*?)\\3)?', 'gm');

function buildAttributesMap(attrStr, jPath, tagName) {
  if (this.options.ignoreAttributes !== true && typeof attrStr === 'string') {
    // attrStr = attrStr.replace(/\r?\n/g, ' ');
    //attrStr = attrStr || attrStr.trim();

    const matches = util.getAllMatches(attrStr, attrsRegx);
    const len = matches.length; //don't make it inline
    const attrs = {};
    for (let i = 0; i < len; i++) {
      const attrName = this.resolveNameSpace(matches[i][1]);
      if (this.ignoreAttributesFn(attrName, jPath)) {
        continue
      }
      let oldVal = matches[i][4];
      let aName = this.options.attributeNamePrefix + attrName;
      if (attrName.length) {
        if (this.options.transformAttributeName) {
          aName = this.options.transformAttributeName(aName);
        }
        if(aName === "__proto__") aName  = "#__proto__";
        if (oldVal !== undefined) {
          if (this.options.trimValues) {
            oldVal = oldVal.trim();
          }
          oldVal = this.replaceEntitiesValue(oldVal);
          const newVal = this.options.attributeValueProcessor(attrName, oldVal, jPath);
          if(newVal === null || newVal === undefined){
            //don't parse
            attrs[aName] = oldVal;
          }else if(typeof newVal !== typeof oldVal || newVal !== oldVal){
            //overwrite
            attrs[aName] = newVal;
          }else {
            //parse
            attrs[aName] = parseValue(
              oldVal,
              this.options.parseAttributeValue,
              this.options.numberParseOptions
            );
          }
        } else if (this.options.allowBooleanAttributes) {
          attrs[aName] = true;
        }
      }
    }
    if (!Object.keys(attrs).length) {
      return;
    }
    if (this.options.attributesGroupName) {
      const attrCollection = {};
      attrCollection[this.options.attributesGroupName] = attrs;
      return attrCollection;
    }
    return attrs
  }
}

const parseXml = function(xmlData) {
  xmlData = xmlData.replace(/\r\n?/g, "\n"); //TODO: remove this line
  const xmlObj = new xmlNode('!xml');
  let currentNode = xmlObj;
  let textData = "";
  let jPath = "";
  for(let i=0; i< xmlData.length; i++){//for each char in XML data
    const ch = xmlData[i];
    if(ch === '<'){
      // const nextIndex = i+1;
      // const _2ndChar = xmlData[nextIndex];
      if( xmlData[i+1] === '/') {//Closing Tag
        const closeIndex = findClosingIndex(xmlData, ">", i, "Closing Tag is not closed.");
        let tagName = xmlData.substring(i+2,closeIndex).trim();

        if(this.options.removeNSPrefix){
          const colonIndex = tagName.indexOf(":");
          if(colonIndex !== -1){
            tagName = tagName.substr(colonIndex+1);
          }
        }

        if(this.options.transformTagName) {
          tagName = this.options.transformTagName(tagName);
        }

        if(currentNode){
          textData = this.saveTextToParentTag(textData, currentNode, jPath);
        }

        //check if last tag of nested tag was unpaired tag
        const lastTagName = jPath.substring(jPath.lastIndexOf(".")+1);
        if(tagName && this.options.unpairedTags.indexOf(tagName) !== -1 ){
          throw new Error(`Unpaired tag can not be used as closing tag: </${tagName}>`);
        }
        let propIndex = 0;
        if(lastTagName && this.options.unpairedTags.indexOf(lastTagName) !== -1 ){
          propIndex = jPath.lastIndexOf('.', jPath.lastIndexOf('.')-1);
          this.tagsNodeStack.pop();
        }else {
          propIndex = jPath.lastIndexOf(".");
        }
        jPath = jPath.substring(0, propIndex);

        currentNode = this.tagsNodeStack.pop();//avoid recursion, set the parent tag scope
        textData = "";
        i = closeIndex;
      } else if( xmlData[i+1] === '?') {

        let tagData = readTagExp(xmlData,i, false, "?>");
        if(!tagData) throw new Error("Pi Tag is not closed.");

        textData = this.saveTextToParentTag(textData, currentNode, jPath);
        if( (this.options.ignoreDeclaration && tagData.tagName === "?xml") || this.options.ignorePiTags);else {
  
          const childNode = new xmlNode(tagData.tagName);
          childNode.add(this.options.textNodeName, "");
          
          if(tagData.tagName !== tagData.tagExp && tagData.attrExpPresent){
            childNode[":@"] = this.buildAttributesMap(tagData.tagExp, jPath, tagData.tagName);
          }
          this.addChild(currentNode, childNode, jPath);

        }


        i = tagData.closeIndex + 1;
      } else if(xmlData.substr(i + 1, 3) === '!--') {
        const endIndex = findClosingIndex(xmlData, "-->", i+4, "Comment is not closed.");
        if(this.options.commentPropName){
          const comment = xmlData.substring(i + 4, endIndex - 2);

          textData = this.saveTextToParentTag(textData, currentNode, jPath);

          currentNode.add(this.options.commentPropName, [ { [this.options.textNodeName] : comment } ]);
        }
        i = endIndex;
      } else if( xmlData.substr(i + 1, 2) === '!D') {
        const result = readDocType(xmlData, i);
        this.docTypeEntities = result.entities;
        i = result.i;
      }else if(xmlData.substr(i + 1, 2) === '![') {
        const closeIndex = findClosingIndex(xmlData, "]]>", i, "CDATA is not closed.") - 2;
        const tagExp = xmlData.substring(i + 9,closeIndex);

        textData = this.saveTextToParentTag(textData, currentNode, jPath);

        let val = this.parseTextData(tagExp, currentNode.tagname, jPath, true, false, true, true);
        if(val == undefined) val = "";

        //cdata should be set even if it is 0 length string
        if(this.options.cdataPropName){
          currentNode.add(this.options.cdataPropName, [ { [this.options.textNodeName] : tagExp } ]);
        }else {
          currentNode.add(this.options.textNodeName, val);
        }
        
        i = closeIndex + 2;
      }else {//Opening tag
        let result = readTagExp(xmlData,i, this.options.removeNSPrefix);
        let tagName= result.tagName;
        const rawTagName = result.rawTagName;
        let tagExp = result.tagExp;
        let attrExpPresent = result.attrExpPresent;
        let closeIndex = result.closeIndex;

        if (this.options.transformTagName) {
          tagName = this.options.transformTagName(tagName);
        }
        
        //save text as child node
        if (currentNode && textData) {
          if(currentNode.tagname !== '!xml'){
            //when nested tag is found
            textData = this.saveTextToParentTag(textData, currentNode, jPath, false);
          }
        }

        //check if last tag was unpaired tag
        const lastTag = currentNode;
        if(lastTag && this.options.unpairedTags.indexOf(lastTag.tagname) !== -1 ){
          currentNode = this.tagsNodeStack.pop();
          jPath = jPath.substring(0, jPath.lastIndexOf("."));
        }
        if(tagName !== xmlObj.tagname){
          jPath += jPath ? "." + tagName : tagName;
        }
        if (this.isItStopNode(this.options.stopNodes, jPath, tagName)) {
          let tagContent = "";
          //self-closing tag
          if(tagExp.length > 0 && tagExp.lastIndexOf("/") === tagExp.length - 1){
            if(tagName[tagName.length - 1] === "/"){ //remove trailing '/'
              tagName = tagName.substr(0, tagName.length - 1);
              jPath = jPath.substr(0, jPath.length - 1);
              tagExp = tagName;
            }else {
              tagExp = tagExp.substr(0, tagExp.length - 1);
            }
            i = result.closeIndex;
          }
          //unpaired tag
          else if(this.options.unpairedTags.indexOf(tagName) !== -1){
            
            i = result.closeIndex;
          }
          //normal tag
          else {
            //read until closing tag is found
            const result = this.readStopNodeData(xmlData, rawTagName, closeIndex + 1);
            if(!result) throw new Error(`Unexpected end of ${rawTagName}`);
            i = result.i;
            tagContent = result.tagContent;
          }

          const childNode = new xmlNode(tagName);
          if(tagName !== tagExp && attrExpPresent){
            childNode[":@"] = this.buildAttributesMap(tagExp, jPath, tagName);
          }
          if(tagContent) {
            tagContent = this.parseTextData(tagContent, tagName, jPath, true, attrExpPresent, true, true);
          }
          
          jPath = jPath.substr(0, jPath.lastIndexOf("."));
          childNode.add(this.options.textNodeName, tagContent);
          
          this.addChild(currentNode, childNode, jPath);
        }else {
  //selfClosing tag
          if(tagExp.length > 0 && tagExp.lastIndexOf("/") === tagExp.length - 1){
            if(tagName[tagName.length - 1] === "/"){ //remove trailing '/'
              tagName = tagName.substr(0, tagName.length - 1);
              jPath = jPath.substr(0, jPath.length - 1);
              tagExp = tagName;
            }else {
              tagExp = tagExp.substr(0, tagExp.length - 1);
            }
            
            if(this.options.transformTagName) {
              tagName = this.options.transformTagName(tagName);
            }

            const childNode = new xmlNode(tagName);
            if(tagName !== tagExp && attrExpPresent){
              childNode[":@"] = this.buildAttributesMap(tagExp, jPath, tagName);
            }
            this.addChild(currentNode, childNode, jPath);
            jPath = jPath.substr(0, jPath.lastIndexOf("."));
          }
    //opening tag
          else {
            const childNode = new xmlNode( tagName);
            this.tagsNodeStack.push(currentNode);
            
            if(tagName !== tagExp && attrExpPresent){
              childNode[":@"] = this.buildAttributesMap(tagExp, jPath, tagName);
            }
            this.addChild(currentNode, childNode, jPath);
            currentNode = childNode;
          }
          textData = "";
          i = closeIndex;
        }
      }
    }else {
      textData += xmlData[i];
    }
  }
  return xmlObj.child;
};

function addChild(currentNode, childNode, jPath){
  const result = this.options.updateTag(childNode.tagname, jPath, childNode[":@"]);
  if(result === false);else if(typeof result === "string"){
    childNode.tagname = result;
    currentNode.addChild(childNode);
  }else {
    currentNode.addChild(childNode);
  }
}

const replaceEntitiesValue$1 = function(val){

  if(this.options.processEntities){
    for(let entityName in this.docTypeEntities){
      const entity = this.docTypeEntities[entityName];
      val = val.replace( entity.regx, entity.val);
    }
    for(let entityName in this.lastEntities){
      const entity = this.lastEntities[entityName];
      val = val.replace( entity.regex, entity.val);
    }
    if(this.options.htmlEntities){
      for(let entityName in this.htmlEntities){
        const entity = this.htmlEntities[entityName];
        val = val.replace( entity.regex, entity.val);
      }
    }
    val = val.replace( this.ampEntity.regex, this.ampEntity.val);
  }
  return val;
};
function saveTextToParentTag(textData, currentNode, jPath, isLeafNode) {
  if (textData) { //store previously collected data as textNode
    if(isLeafNode === undefined) isLeafNode = currentNode.child.length === 0;
    
    textData = this.parseTextData(textData,
      currentNode.tagname,
      jPath,
      false,
      currentNode[":@"] ? Object.keys(currentNode[":@"]).length !== 0 : false,
      isLeafNode);

    if (textData !== undefined && textData !== "")
      currentNode.add(this.options.textNodeName, textData);
    textData = "";
  }
  return textData;
}

//TODO: use jPath to simplify the logic
/**
 * 
 * @param {string[]} stopNodes 
 * @param {string} jPath
 * @param {string} currentTagName 
 */
function isItStopNode(stopNodes, jPath, currentTagName){
  const allNodesExp = "*." + currentTagName;
  for (const stopNodePath in stopNodes) {
    const stopNodeExp = stopNodes[stopNodePath];
    if( allNodesExp === stopNodeExp || jPath === stopNodeExp  ) return true;
  }
  return false;
}

/**
 * Returns the tag Expression and where it is ending handling single-double quotes situation
 * @param {string} xmlData 
 * @param {number} i starting index
 * @returns 
 */
function tagExpWithClosingIndex(xmlData, i, closingChar = ">"){
  let attrBoundary;
  let tagExp = "";
  for (let index = i; index < xmlData.length; index++) {
    let ch = xmlData[index];
    if (attrBoundary) {
        if (ch === attrBoundary) attrBoundary = "";//reset
    } else if (ch === '"' || ch === "'") {
        attrBoundary = ch;
    } else if (ch === closingChar[0]) {
      if(closingChar[1]){
        if(xmlData[index + 1] === closingChar[1]){
          return {
            data: tagExp,
            index: index
          }
        }
      }else {
        return {
          data: tagExp,
          index: index
        }
      }
    } else if (ch === '\t') {
      ch = " ";
    }
    tagExp += ch;
  }
}

function findClosingIndex(xmlData, str, i, errMsg){
  const closingIndex = xmlData.indexOf(str, i);
  if(closingIndex === -1){
    throw new Error(errMsg)
  }else {
    return closingIndex + str.length - 1;
  }
}

function readTagExp(xmlData,i, removeNSPrefix, closingChar = ">"){
  const result = tagExpWithClosingIndex(xmlData, i+1, closingChar);
  if(!result) return;
  let tagExp = result.data;
  const closeIndex = result.index;
  const separatorIndex = tagExp.search(/\s/);
  let tagName = tagExp;
  let attrExpPresent = true;
  if(separatorIndex !== -1){//separate tag name and attributes expression
    tagName = tagExp.substring(0, separatorIndex);
    tagExp = tagExp.substring(separatorIndex + 1).trimStart();
  }

  const rawTagName = tagName;
  if(removeNSPrefix){
    const colonIndex = tagName.indexOf(":");
    if(colonIndex !== -1){
      tagName = tagName.substr(colonIndex+1);
      attrExpPresent = tagName !== result.data.substr(colonIndex + 1);
    }
  }

  return {
    tagName: tagName,
    tagExp: tagExp,
    closeIndex: closeIndex,
    attrExpPresent: attrExpPresent,
    rawTagName: rawTagName,
  }
}
/**
 * find paired tag for a stop node
 * @param {string} xmlData 
 * @param {string} tagName 
 * @param {number} i 
 */
function readStopNodeData(xmlData, tagName, i){
  const startIndex = i;
  // Starting at 1 since we already have an open tag
  let openTagCount = 1;

  for (; i < xmlData.length; i++) {
    if( xmlData[i] === "<"){ 
      if (xmlData[i+1] === "/") {//close tag
          const closeIndex = findClosingIndex(xmlData, ">", i, `${tagName} is not closed`);
          let closeTagName = xmlData.substring(i+2,closeIndex).trim();
          if(closeTagName === tagName){
            openTagCount--;
            if (openTagCount === 0) {
              return {
                tagContent: xmlData.substring(startIndex, i),
                i : closeIndex
              }
            }
          }
          i=closeIndex;
        } else if(xmlData[i+1] === '?') { 
          const closeIndex = findClosingIndex(xmlData, "?>", i+1, "StopNode is not closed.");
          i=closeIndex;
        } else if(xmlData.substr(i + 1, 3) === '!--') { 
          const closeIndex = findClosingIndex(xmlData, "-->", i+3, "StopNode is not closed.");
          i=closeIndex;
        } else if(xmlData.substr(i + 1, 2) === '![') { 
          const closeIndex = findClosingIndex(xmlData, "]]>", i, "StopNode is not closed.") - 2;
          i=closeIndex;
        } else {
          const tagData = readTagExp(xmlData, i, '>');

          if (tagData) {
            const openTagName = tagData && tagData.tagName;
            if (openTagName === tagName && tagData.tagExp[tagData.tagExp.length-1] !== "/") {
              openTagCount++;
            }
            i=tagData.closeIndex;
          }
        }
      }
  }//end for loop
}

function parseValue(val, shouldParse, options) {
  if (shouldParse && typeof val === 'string') {
    //console.log(options)
    const newval = val.trim();
    if(newval === 'true' ) return true;
    else if(newval === 'false' ) return false;
    else return toNumber(val, options);
  } else {
    if (util.isExist(val)) {
      return val;
    } else {
      return '';
    }
  }
}


var OrderedObjParser_1 = OrderedObjParser$1;

var node2json = {};

/**
 * 
 * @param {array} node 
 * @param {any} options 
 * @returns 
 */
function prettify$1(node, options){
  return compress( node, options);
}

/**
 * 
 * @param {array} arr 
 * @param {object} options 
 * @param {string} jPath 
 * @returns object
 */
function compress(arr, options, jPath){
  let text;
  const compressedObj = {};
  for (let i = 0; i < arr.length; i++) {
    const tagObj = arr[i];
    const property = propName$1(tagObj);
    let newJpath = "";
    if(jPath === undefined) newJpath = property;
    else newJpath = jPath + "." + property;

    if(property === options.textNodeName){
      if(text === undefined) text = tagObj[property];
      else text += "" + tagObj[property];
    }else if(property === undefined){
      continue;
    }else if(tagObj[property]){
      
      let val = compress(tagObj[property], options, newJpath);
      const isLeaf = isLeafTag(val, options);

      if(tagObj[":@"]){
        assignAttributes( val, tagObj[":@"], newJpath, options);
      }else if(Object.keys(val).length === 1 && val[options.textNodeName] !== undefined && !options.alwaysCreateTextNode){
        val = val[options.textNodeName];
      }else if(Object.keys(val).length === 0){
        if(options.alwaysCreateTextNode) val[options.textNodeName] = "";
        else val = "";
      }

      if(compressedObj[property] !== undefined && compressedObj.hasOwnProperty(property)) {
        if(!Array.isArray(compressedObj[property])) {
            compressedObj[property] = [ compressedObj[property] ];
        }
        compressedObj[property].push(val);
      }else {
        //TODO: if a node is not an array, then check if it should be an array
        //also determine if it is a leaf node
        if (options.isArray(property, newJpath, isLeaf )) {
          compressedObj[property] = [val];
        }else {
          compressedObj[property] = val;
        }
      }
    }
    
  }
  // if(text && text.length > 0) compressedObj[options.textNodeName] = text;
  if(typeof text === "string"){
    if(text.length > 0) compressedObj[options.textNodeName] = text;
  }else if(text !== undefined) compressedObj[options.textNodeName] = text;
  return compressedObj;
}

function propName$1(obj){
  const keys = Object.keys(obj);
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    if(key !== ":@") return key;
  }
}

function assignAttributes(obj, attrMap, jpath, options){
  if (attrMap) {
    const keys = Object.keys(attrMap);
    const len = keys.length; //don't make it inline
    for (let i = 0; i < len; i++) {
      const atrrName = keys[i];
      if (options.isArray(atrrName, jpath + "." + atrrName, true, true)) {
        obj[atrrName] = [ attrMap[atrrName] ];
      } else {
        obj[atrrName] = attrMap[atrrName];
      }
    }
  }
}

function isLeafTag(obj, options){
  const { textNodeName } = options;
  const propCount = Object.keys(obj).length;
  
  if (propCount === 0) {
    return true;
  }

  if (
    propCount === 1 &&
    (obj[textNodeName] || typeof obj[textNodeName] === "boolean" || obj[textNodeName] === 0)
  ) {
    return true;
  }

  return false;
}
node2json.prettify = prettify$1;

const { buildOptions} = OptionsBuilder;
const OrderedObjParser = OrderedObjParser_1;
const { prettify} = node2json;
const validator$1 = validator$2;

let XMLParser$1 = class XMLParser{
    
    constructor(options){
        this.externalEntities = {};
        this.options = buildOptions(options);
        
    }
    /**
     * Parse XML dats to JS object 
     * @param {string|Buffer} xmlData 
     * @param {boolean|Object} validationOption 
     */
    parse(xmlData,validationOption){
        if(typeof xmlData === "string");else if( xmlData.toString){
            xmlData = xmlData.toString();
        }else {
            throw new Error("XML data is accepted in String or Bytes[] form.")
        }
        if( validationOption){
            if(validationOption === true) validationOption = {}; //validate with default options
            
            const result = validator$1.validate(xmlData, validationOption);
            if (result !== true) {
              throw Error( `${result.err.msg}:${result.err.line}:${result.err.col}` )
            }
          }
        const orderedObjParser = new OrderedObjParser(this.options);
        orderedObjParser.addExternalEntities(this.externalEntities);
        const orderedResult = orderedObjParser.parseXml(xmlData);
        if(this.options.preserveOrder || orderedResult === undefined) return orderedResult;
        else return prettify(orderedResult, this.options);
    }

    /**
     * Add Entity which is not by default supported by this library
     * @param {string} key 
     * @param {string} value 
     */
    addEntity(key, value){
        if(value.indexOf("&") !== -1){
            throw new Error("Entity value can't have '&'")
        }else if(key.indexOf("&") !== -1 || key.indexOf(";") !== -1){
            throw new Error("An entity must be set without '&' and ';'. Eg. use '#xD' for '&#xD;'")
        }else if(value === "&"){
            throw new Error("An entity with value '&' is not permitted");
        }else {
            this.externalEntities[key] = value;
        }
    }
};

var XMLParser_1 = XMLParser$1;

const EOL = "\n";

/**
 * 
 * @param {array} jArray 
 * @param {any} options 
 * @returns 
 */
function toXml(jArray, options) {
    let indentation = "";
    if (options.format && options.indentBy.length > 0) {
        indentation = EOL;
    }
    return arrToStr(jArray, options, "", indentation);
}

function arrToStr(arr, options, jPath, indentation) {
    let xmlStr = "";
    let isPreviousElementTag = false;

    for (let i = 0; i < arr.length; i++) {
        const tagObj = arr[i];
        const tagName = propName(tagObj);
        if(tagName === undefined) continue;

        let newJPath = "";
        if (jPath.length === 0) newJPath = tagName;
        else newJPath = `${jPath}.${tagName}`;

        if (tagName === options.textNodeName) {
            let tagText = tagObj[tagName];
            if (!isStopNode(newJPath, options)) {
                tagText = options.tagValueProcessor(tagName, tagText);
                tagText = replaceEntitiesValue(tagText, options);
            }
            if (isPreviousElementTag) {
                xmlStr += indentation;
            }
            xmlStr += tagText;
            isPreviousElementTag = false;
            continue;
        } else if (tagName === options.cdataPropName) {
            if (isPreviousElementTag) {
                xmlStr += indentation;
            }
            xmlStr += `<![CDATA[${tagObj[tagName][0][options.textNodeName]}]]>`;
            isPreviousElementTag = false;
            continue;
        } else if (tagName === options.commentPropName) {
            xmlStr += indentation + `<!--${tagObj[tagName][0][options.textNodeName]}-->`;
            isPreviousElementTag = true;
            continue;
        } else if (tagName[0] === "?") {
            const attStr = attr_to_str(tagObj[":@"], options);
            const tempInd = tagName === "?xml" ? "" : indentation;
            let piTextNodeName = tagObj[tagName][0][options.textNodeName];
            piTextNodeName = piTextNodeName.length !== 0 ? " " + piTextNodeName : ""; //remove extra spacing
            xmlStr += tempInd + `<${tagName}${piTextNodeName}${attStr}?>`;
            isPreviousElementTag = true;
            continue;
        }
        let newIdentation = indentation;
        if (newIdentation !== "") {
            newIdentation += options.indentBy;
        }
        const attStr = attr_to_str(tagObj[":@"], options);
        const tagStart = indentation + `<${tagName}${attStr}`;
        const tagValue = arrToStr(tagObj[tagName], options, newJPath, newIdentation);
        if (options.unpairedTags.indexOf(tagName) !== -1) {
            if (options.suppressUnpairedNode) xmlStr += tagStart + ">";
            else xmlStr += tagStart + "/>";
        } else if ((!tagValue || tagValue.length === 0) && options.suppressEmptyNode) {
            xmlStr += tagStart + "/>";
        } else if (tagValue && tagValue.endsWith(">")) {
            xmlStr += tagStart + `>${tagValue}${indentation}</${tagName}>`;
        } else {
            xmlStr += tagStart + ">";
            if (tagValue && indentation !== "" && (tagValue.includes("/>") || tagValue.includes("</"))) {
                xmlStr += indentation + options.indentBy + tagValue + indentation;
            } else {
                xmlStr += tagValue;
            }
            xmlStr += `</${tagName}>`;
        }
        isPreviousElementTag = true;
    }

    return xmlStr;
}

function propName(obj) {
    const keys = Object.keys(obj);
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if(!obj.hasOwnProperty(key)) continue;
        if (key !== ":@") return key;
    }
}

function attr_to_str(attrMap, options) {
    let attrStr = "";
    if (attrMap && !options.ignoreAttributes) {
        for (let attr in attrMap) {
            if(!attrMap.hasOwnProperty(attr)) continue;
            let attrVal = options.attributeValueProcessor(attr, attrMap[attr]);
            attrVal = replaceEntitiesValue(attrVal, options);
            if (attrVal === true && options.suppressBooleanAttributes) {
                attrStr += ` ${attr.substr(options.attributeNamePrefix.length)}`;
            } else {
                attrStr += ` ${attr.substr(options.attributeNamePrefix.length)}="${attrVal}"`;
            }
        }
    }
    return attrStr;
}

function isStopNode(jPath, options) {
    jPath = jPath.substr(0, jPath.length - options.textNodeName.length - 1);
    let tagName = jPath.substr(jPath.lastIndexOf(".") + 1);
    for (let index in options.stopNodes) {
        if (options.stopNodes[index] === jPath || options.stopNodes[index] === "*." + tagName) return true;
    }
    return false;
}

function replaceEntitiesValue(textValue, options) {
    if (textValue && textValue.length > 0 && options.processEntities) {
        for (let i = 0; i < options.entities.length; i++) {
            const entity = options.entities[i];
            textValue = textValue.replace(entity.regex, entity.val);
        }
    }
    return textValue;
}
var orderedJs2Xml = toXml;

//parse Empty Node as self closing node
const buildFromOrderedJs = orderedJs2Xml;
const getIgnoreAttributesFn = ignoreAttributes;

const defaultOptions = {
  attributeNamePrefix: '@_',
  attributesGroupName: false,
  textNodeName: '#text',
  ignoreAttributes: true,
  cdataPropName: false,
  format: false,
  indentBy: '  ',
  suppressEmptyNode: false,
  suppressUnpairedNode: true,
  suppressBooleanAttributes: true,
  tagValueProcessor: function(key, a) {
    return a;
  },
  attributeValueProcessor: function(attrName, a) {
    return a;
  },
  preserveOrder: false,
  commentPropName: false,
  unpairedTags: [],
  entities: [
    { regex: new RegExp("&", "g"), val: "&amp;" },//it must be on top
    { regex: new RegExp(">", "g"), val: "&gt;" },
    { regex: new RegExp("<", "g"), val: "&lt;" },
    { regex: new RegExp("\'", "g"), val: "&apos;" },
    { regex: new RegExp("\"", "g"), val: "&quot;" }
  ],
  processEntities: true,
  stopNodes: [],
  // transformTagName: false,
  // transformAttributeName: false,
  oneListGroup: false
};

function Builder(options) {
  this.options = Object.assign({}, defaultOptions, options);
  if (this.options.ignoreAttributes === true || this.options.attributesGroupName) {
    this.isAttribute = function(/*a*/) {
      return false;
    };
  } else {
    this.ignoreAttributesFn = getIgnoreAttributesFn(this.options.ignoreAttributes);
    this.attrPrefixLen = this.options.attributeNamePrefix.length;
    this.isAttribute = isAttribute;
  }

  this.processTextOrObjNode = processTextOrObjNode;

  if (this.options.format) {
    this.indentate = indentate;
    this.tagEndChar = '>\n';
    this.newLine = '\n';
  } else {
    this.indentate = function() {
      return '';
    };
    this.tagEndChar = '>';
    this.newLine = '';
  }
}

Builder.prototype.build = function(jObj) {
  if(this.options.preserveOrder){
    return buildFromOrderedJs(jObj, this.options);
  }else {
    if(Array.isArray(jObj) && this.options.arrayNodeName && this.options.arrayNodeName.length > 1){
      jObj = {
        [this.options.arrayNodeName] : jObj
      };
    }
    return this.j2x(jObj, 0, []).val;
  }
};

Builder.prototype.j2x = function(jObj, level, ajPath) {
  let attrStr = '';
  let val = '';
  const jPath = ajPath.join('.');
  for (let key in jObj) {
    if(!Object.prototype.hasOwnProperty.call(jObj, key)) continue;
    if (typeof jObj[key] === 'undefined') {
      // supress undefined node only if it is not an attribute
      if (this.isAttribute(key)) {
        val += '';
      }
    } else if (jObj[key] === null) {
      // null attribute should be ignored by the attribute list, but should not cause the tag closing
      if (this.isAttribute(key)) {
        val += '';
      } else if (key === this.options.cdataPropName) {
        val += '';
      } else if (key[0] === '?') {
        val += this.indentate(level) + '<' + key + '?' + this.tagEndChar;
      } else {
        val += this.indentate(level) + '<' + key + '/' + this.tagEndChar;
      }
      // val += this.indentate(level) + '<' + key + '/' + this.tagEndChar;
    } else if (jObj[key] instanceof Date) {
      val += this.buildTextValNode(jObj[key], key, '', level);
    } else if (typeof jObj[key] !== 'object') {
      //premitive type
      const attr = this.isAttribute(key);
      if (attr && !this.ignoreAttributesFn(attr, jPath)) {
        attrStr += this.buildAttrPairStr(attr, '' + jObj[key]);
      } else if (!attr) {
        //tag value
        if (key === this.options.textNodeName) {
          let newval = this.options.tagValueProcessor(key, '' + jObj[key]);
          val += this.replaceEntitiesValue(newval);
        } else {
          val += this.buildTextValNode(jObj[key], key, '', level);
        }
      }
    } else if (Array.isArray(jObj[key])) {
      //repeated nodes
      const arrLen = jObj[key].length;
      let listTagVal = "";
      let listTagAttr = "";
      for (let j = 0; j < arrLen; j++) {
        const item = jObj[key][j];
        if (typeof item === 'undefined') ; else if (item === null) {
          if(key[0] === "?") val += this.indentate(level) + '<' + key + '?' + this.tagEndChar;
          else val += this.indentate(level) + '<' + key + '/' + this.tagEndChar;
          // val += this.indentate(level) + '<' + key + '/' + this.tagEndChar;
        } else if (typeof item === 'object') {
          if(this.options.oneListGroup){
            const result = this.j2x(item, level + 1, ajPath.concat(key));
            listTagVal += result.val;
            if (this.options.attributesGroupName && item.hasOwnProperty(this.options.attributesGroupName)) {
              listTagAttr += result.attrStr;
            }
          }else {
            listTagVal += this.processTextOrObjNode(item, key, level, ajPath);
          }
        } else {
          if (this.options.oneListGroup) {
            let textValue = this.options.tagValueProcessor(key, item);
            textValue = this.replaceEntitiesValue(textValue);
            listTagVal += textValue;
          } else {
            listTagVal += this.buildTextValNode(item, key, '', level);
          }
        }
      }
      if(this.options.oneListGroup){
        listTagVal = this.buildObjectNode(listTagVal, key, listTagAttr, level);
      }
      val += listTagVal;
    } else {
      //nested node
      if (this.options.attributesGroupName && key === this.options.attributesGroupName) {
        const Ks = Object.keys(jObj[key]);
        const L = Ks.length;
        for (let j = 0; j < L; j++) {
          attrStr += this.buildAttrPairStr(Ks[j], '' + jObj[key][Ks[j]]);
        }
      } else {
        val += this.processTextOrObjNode(jObj[key], key, level, ajPath);
      }
    }
  }
  return {attrStr: attrStr, val: val};
};

Builder.prototype.buildAttrPairStr = function(attrName, val){
  val = this.options.attributeValueProcessor(attrName, '' + val);
  val = this.replaceEntitiesValue(val);
  if (this.options.suppressBooleanAttributes && val === "true") {
    return ' ' + attrName;
  } else return ' ' + attrName + '="' + val + '"';
};

function processTextOrObjNode (object, key, level, ajPath) {
  const result = this.j2x(object, level + 1, ajPath.concat(key));
  if (object[this.options.textNodeName] !== undefined && Object.keys(object).length === 1) {
    return this.buildTextValNode(object[this.options.textNodeName], key, result.attrStr, level);
  } else {
    return this.buildObjectNode(result.val, key, result.attrStr, level);
  }
}

Builder.prototype.buildObjectNode = function(val, key, attrStr, level) {
  if(val === ""){
    if(key[0] === "?") return  this.indentate(level) + '<' + key + attrStr+ '?' + this.tagEndChar;
    else {
      return this.indentate(level) + '<' + key + attrStr + this.closeTag(key) + this.tagEndChar;
    }
  }else {

    let tagEndExp = '</' + key + this.tagEndChar;
    let piClosingChar = "";
    
    if(key[0] === "?") {
      piClosingChar = "?";
      tagEndExp = "";
    }
  
    // attrStr is an empty string in case the attribute came as undefined or null
    if ((attrStr || attrStr === '') && val.indexOf('<') === -1) {
      return ( this.indentate(level) + '<' +  key + attrStr + piClosingChar + '>' + val + tagEndExp );
    } else if (this.options.commentPropName !== false && key === this.options.commentPropName && piClosingChar.length === 0) {
      return this.indentate(level) + `<!--${val}-->` + this.newLine;
    }else {
      return (
        this.indentate(level) + '<' + key + attrStr + piClosingChar + this.tagEndChar +
        val +
        this.indentate(level) + tagEndExp    );
    }
  }
};

Builder.prototype.closeTag = function(key){
  let closeTag = "";
  if(this.options.unpairedTags.indexOf(key) !== -1){ //unpaired
    if(!this.options.suppressUnpairedNode) closeTag = "/";
  }else if(this.options.suppressEmptyNode){ //empty
    closeTag = "/";
  }else {
    closeTag = `></${key}`;
  }
  return closeTag;
};

Builder.prototype.buildTextValNode = function(val, key, attrStr, level) {
  if (this.options.cdataPropName !== false && key === this.options.cdataPropName) {
    return this.indentate(level) + `<![CDATA[${val}]]>` +  this.newLine;
  }else if (this.options.commentPropName !== false && key === this.options.commentPropName) {
    return this.indentate(level) + `<!--${val}-->` +  this.newLine;
  }else if(key[0] === "?") {//PI tag
    return  this.indentate(level) + '<' + key + attrStr+ '?' + this.tagEndChar; 
  }else {
    let textValue = this.options.tagValueProcessor(key, val);
    textValue = this.replaceEntitiesValue(textValue);
  
    if( textValue === ''){
      return this.indentate(level) + '<' + key + attrStr + this.closeTag(key) + this.tagEndChar;
    }else {
      return this.indentate(level) + '<' + key + attrStr + '>' +
         textValue +
        '</' + key + this.tagEndChar;
    }
  }
};

Builder.prototype.replaceEntitiesValue = function(textValue){
  if(textValue && textValue.length > 0 && this.options.processEntities){
    for (let i=0; i<this.options.entities.length; i++) {
      const entity = this.options.entities[i];
      textValue = textValue.replace(entity.regex, entity.val);
    }
  }
  return textValue;
};

function indentate(level) {
  return this.options.indentBy.repeat(level);
}

function isAttribute(name /*, options*/) {
  if (name.startsWith(this.options.attributeNamePrefix) && name !== this.options.textNodeName) {
    return name.substr(this.attrPrefixLen);
  } else {
    return false;
  }
}

var json2xml = Builder;

const validator = validator$2;
const XMLParser = XMLParser_1;
const XMLBuilder = json2xml;

var fxp = {
  XMLParser: XMLParser,
  XMLValidator: validator,
  XMLBuilder: XMLBuilder
};

const VALID_WAYPOINT_TYPES = [
    'AIRPORT',
    'USER WAYPOINT',
    'VOR',
    'NDB',
    'INT',
    'INT-VRP'
];
const xmlParser = new fxp.XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseAttributeValue: true,
    trimValues: true
});
/**
 * Parse waypoint type string to WaypointType enum
 */ function parseWaypointType(typeStr) {
    const normalized = typeStr.toUpperCase().trim();
    if (VALID_WAYPOINT_TYPES.includes(normalized)) {
        return normalized;
    }
    // Default to USER WAYPOINT for unknown types
    return 'USER WAYPOINT';
}
/**
 * Parse a single waypoint from the waypoint-table
 */ function parseWaypoint(wpData) {
    return {
        identifier: String(wpData['identifier'] || '').toUpperCase(),
        type: parseWaypointType(String(wpData['type'] || 'USER WAYPOINT')),
        countryCode: String(wpData['country-code'] || ''),
        lat: Number(wpData['lat']) || 0,
        lon: Number(wpData['lon']) || 0,
        comment: wpData['comment'] ? String(wpData['comment']) : undefined,
        elevation: wpData['elevation'] !== undefined ? Number(wpData['elevation']) : undefined
    };
}
/**
 * Parse the waypoint-table section
 */ function parseWaypointTable(tableData) {
    const waypoints = [];
    if (!tableData || !tableData['waypoint']) {
        return waypoints;
    }
    // Handle both single waypoint and array of waypoints
    const wpArray = Array.isArray(tableData['waypoint']) ? tableData['waypoint'] : [
        tableData['waypoint']
    ];
    for (const wp of wpArray){
        if (wp && typeof wp === 'object') {
            waypoints.push(parseWaypoint(wp));
        }
    }
    return waypoints;
}
/**
 * Parse a single route-point
 */ function parseRoutePoint(rpData) {
    return {
        waypointIdentifier: String(rpData['waypoint-identifier'] || '').toUpperCase(),
        waypointType: parseWaypointType(String(rpData['waypoint-type'] || 'USER WAYPOINT')),
        waypointCountryCode: String(rpData['waypoint-country-code'] || '')
    };
}
/**
 * Parse the route section
 */ function parseRoute(routeData) {
    if (!routeData) {
        return undefined;
    }
    const points = [];
    if (routeData['route-point']) {
        const rpArray = Array.isArray(routeData['route-point']) ? routeData['route-point'] : [
            routeData['route-point']
        ];
        for (const rp of rpArray){
            if (rp && typeof rp === 'object') {
                points.push(parseRoutePoint(rp));
            }
        }
    }
    return {
        name: String(routeData['route-name'] || 'Unnamed Route'),
        description: routeData['route-description'] ? String(routeData['route-description']) : undefined,
        flightPlanIndex: Number(routeData['flight-plan-index']) || 1,
        points
    };
}
/**
 * Parse an FPL XML string into FPLFlightPlan structure
 */ function parseFPL(xmlString) {
    try {
        const parsed = xmlParser.parse(xmlString);
        const fp = parsed['flight-plan'];
        if (!fp) {
            return {
                success: false,
                error: 'Invalid FPL file: missing flight-plan root element'
            };
        }
        if (!fp['waypoint-table']) {
            return {
                success: false,
                error: 'Invalid FPL file: missing waypoint-table'
            };
        }
        const flightPlan = {
            created: fp['created'] ? new Date(fp['created']) : undefined,
            waypointTable: parseWaypointTable(fp['waypoint-table']),
            route: fp['route'] ? parseRoute(fp['route']) : undefined
        };
        return {
            success: true,
            flightPlan
        };
    } catch (error) {
        return {
            success: false,
            error: `Failed to parse FPL file: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
}
/**
 * Validate an FPL flight plan
 */ function validateFPL(flightPlan) {
    const errors = [];
    // Validate waypoint table
    if (!flightPlan.waypointTable || flightPlan.waypointTable.length === 0) {
        errors.push({
            field: 'waypointTable',
            message: 'Flight plan must contain at least one waypoint'
        });
    }
    // Validate each waypoint
    for(let i = 0; i < flightPlan.waypointTable.length; i++){
        const wp = flightPlan.waypointTable[i];
        if (!wp.identifier || wp.identifier.length === 0) {
            errors.push({
                field: `waypointTable[${i}].identifier`,
                message: 'Waypoint identifier is required'
            });
        } else if (wp.identifier.length > 12) {
            errors.push({
                field: `waypointTable[${i}].identifier`,
                message: 'Waypoint identifier must be 12 characters or less',
                value: wp.identifier
            });
        }
        if (wp.lat < -90 || wp.lat > 90) {
            errors.push({
                field: `waypointTable[${i}].lat`,
                message: 'Latitude must be between -90 and 90',
                value: wp.lat
            });
        }
        if (wp.lon < -180 || wp.lon > 180) {
            errors.push({
                field: `waypointTable[${i}].lon`,
                message: 'Longitude must be between -180 and 180',
                value: wp.lon
            });
        }
    }
    // Validate route points reference existing waypoints
    if (flightPlan.route) {
        const waypointIds = new Set(flightPlan.waypointTable.map((wp)=>wp.identifier));
        for(let i = 0; i < flightPlan.route.points.length; i++){
            const rp = flightPlan.route.points[i];
            if (!waypointIds.has(rp.waypointIdentifier)) {
                errors.push({
                    field: `route.points[${i}].waypointIdentifier`,
                    message: `Route point references unknown waypoint: ${rp.waypointIdentifier}`,
                    value: rp.waypointIdentifier
                });
            }
        }
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
/**
 * Generate a unique ID for a waypoint
 */ function generateWaypointId(identifier, index) {
    return `${identifier}-${index}-${Date.now()}`;
}
/**
 * Convert FPL flight plan to internal FlightPlan format
 */ function convertToFlightPlan(fpl, filename) {
    // Build waypoint lookup map
    const waypointMap = new Map();
    for (const wp of fpl.waypointTable){
        waypointMap.set(wp.identifier, wp);
    }
    // Determine waypoint order from route or use table order
    let orderedWaypoints;
    if (fpl.route && fpl.route.points.length > 0) {
        orderedWaypoints = fpl.route.points.map((rp)=>waypointMap.get(rp.waypointIdentifier)).filter((wp)=>wp !== undefined);
    } else {
        orderedWaypoints = fpl.waypointTable;
    }
    // Convert to internal Waypoint format
    const waypoints = orderedWaypoints.map((fplWp, index)=>({
            id: generateWaypointId(fplWp.identifier, index),
            name: fplWp.identifier,
            type: fplWp.type,
            lat: fplWp.lat,
            lon: fplWp.lon,
            comment: fplWp.comment,
            elevation: fplWp.elevation
        }));
    // Generate flight plan name
    const planName = fpl.route?.name || (waypoints.length >= 2 ? `${waypoints[0].name} to ${waypoints[waypoints.length - 1].name}` : 'Unnamed Flight Plan');
    return {
        id: `fp-${Date.now()}`,
        name: planName,
        waypoints,
        aircraft: {
            airspeed: 100,
            defaultAltitude: 3000
        },
        totals: {
            distance: 0,
            ete: 0
        },
        sourceFile: filename,
        sourceFormat: 'fpl'
    };
}
/**
 * Read and parse an FPL file from a File object
 */ async function readFPLFile(file) {
    return new Promise((resolve)=>{
        const reader = new FileReader();
        reader.onload = (event)=>{
            const content = event.target?.result;
            if (typeof content === 'string') {
                resolve(parseFPL(content));
            } else {
                resolve({
                    success: false,
                    error: 'Failed to read file content'
                });
            }
        };
        reader.onerror = ()=>{
            resolve({
                success: false,
                error: 'Failed to read file'
            });
        };
        reader.readAsText(file);
    });
}

/**
 * @module helpers
 */
/**
 * Earth Radius used with the Harvesine formula and approximates using a spherical (non-ellipsoid) Earth.
 *
 * @memberof helpers
 * @type {number}
 */
var earthRadius = 6371008.8;
/**
 * Unit of measurement factors using a spherical (non-ellipsoid) earth radius.
 *
 * @memberof helpers
 * @type {Object}
 */
var factors = {
    centimeters: earthRadius * 100,
    centimetres: earthRadius * 100,
    degrees: earthRadius / 111325,
    feet: earthRadius * 3.28084,
    inches: earthRadius * 39.37,
    kilometers: earthRadius / 1000,
    kilometres: earthRadius / 1000,
    meters: earthRadius,
    metres: earthRadius,
    miles: earthRadius / 1609.344,
    millimeters: earthRadius * 1000,
    millimetres: earthRadius * 1000,
    nauticalmiles: earthRadius / 1852,
    radians: 1,
    yards: earthRadius * 1.0936,
};
/**
 * Wraps a GeoJSON {@link Geometry} in a GeoJSON {@link Feature}.
 *
 * @name feature
 * @param {Geometry} geometry input geometry
 * @param {Object} [properties={}] an Object of key-value pairs to add as properties
 * @param {Object} [options={}] Optional Parameters
 * @param {Array<number>} [options.bbox] Bounding Box Array [west, south, east, north] associated with the Feature
 * @param {string|number} [options.id] Identifier associated with the Feature
 * @returns {Feature} a GeoJSON Feature
 * @example
 * var geometry = {
 *   "type": "Point",
 *   "coordinates": [110, 50]
 * };
 *
 * var feature = turf.feature(geometry);
 *
 * //=feature
 */
function feature(geom, properties, options) {
    if (options === void 0) { options = {}; }
    var feat = { type: "Feature" };
    if (options.id === 0 || options.id) {
        feat.id = options.id;
    }
    if (options.bbox) {
        feat.bbox = options.bbox;
    }
    feat.properties = {};
    feat.geometry = geom;
    return feat;
}
/**
 * Creates a {@link Point} {@link Feature} from a Position.
 *
 * @name point
 * @param {Array<number>} coordinates longitude, latitude position (each in decimal degrees)
 * @param {Object} [properties={}] an Object of key-value pairs to add as properties
 * @param {Object} [options={}] Optional Parameters
 * @param {Array<number>} [options.bbox] Bounding Box Array [west, south, east, north] associated with the Feature
 * @param {string|number} [options.id] Identifier associated with the Feature
 * @returns {Feature<Point>} a Point feature
 * @example
 * var point = turf.point([-75.343, 39.984]);
 *
 * //=point
 */
function point(coordinates, properties, options) {
    if (options === void 0) { options = {}; }
    if (!coordinates) {
        throw new Error("coordinates is required");
    }
    if (!Array.isArray(coordinates)) {
        throw new Error("coordinates must be an Array");
    }
    if (coordinates.length < 2) {
        throw new Error("coordinates must be at least 2 numbers long");
    }
    if (!isNumber(coordinates[0]) || !isNumber(coordinates[1])) {
        throw new Error("coordinates must contain numbers");
    }
    var geom = {
        type: "Point",
        coordinates: coordinates,
    };
    return feature(geom, properties, options);
}
/**
 * Convert a distance measurement (assuming a spherical Earth) from radians to a more friendly unit.
 * Valid units: miles, nauticalmiles, inches, yards, meters, metres, kilometers, centimeters, feet
 *
 * @name radiansToLength
 * @param {number} radians in radians across the sphere
 * @param {string} [units="kilometers"] can be degrees, radians, miles, inches, yards, metres,
 * meters, kilometres, kilometers.
 * @returns {number} distance
 */
function radiansToLength(radians, units) {
    if (units === void 0) { units = "kilometers"; }
    var factor = factors[units];
    if (!factor) {
        throw new Error(units + " units is invalid");
    }
    return radians * factor;
}
/**
 * Converts an angle in radians to degrees
 *
 * @name radiansToDegrees
 * @param {number} radians angle in radians
 * @returns {number} degrees between 0 and 360 degrees
 */
function radiansToDegrees(radians) {
    var degrees = radians % (2 * Math.PI);
    return (degrees * 180) / Math.PI;
}
/**
 * Converts an angle in degrees to radians
 *
 * @name degreesToRadians
 * @param {number} degrees angle between 0 and 360 degrees
 * @returns {number} angle in radians
 */
function degreesToRadians(degrees) {
    var radians = degrees % 360;
    return (radians * Math.PI) / 180;
}
/**
 * isNumber
 *
 * @param {*} num Number to validate
 * @returns {boolean} true/false
 * @example
 * turf.isNumber(123)
 * //=true
 * turf.isNumber('foo')
 * //=false
 */
function isNumber(num) {
    return !isNaN(num) && num !== null && !Array.isArray(num);
}

/**
 * Unwrap a coordinate from a Point Feature, Geometry or a single coordinate.
 *
 * @name getCoord
 * @param {Array<number>|Geometry<Point>|Feature<Point>} coord GeoJSON Point or an Array of numbers
 * @returns {Array<number>} coordinates
 * @example
 * var pt = turf.point([10, 10]);
 *
 * var coord = turf.getCoord(pt);
 * //= [10, 10]
 */
function getCoord(coord) {
    if (!coord) {
        throw new Error("coord is required");
    }
    if (!Array.isArray(coord)) {
        if (coord.type === "Feature" &&
            coord.geometry !== null &&
            coord.geometry.type === "Point") {
            return coord.geometry.coordinates;
        }
        if (coord.type === "Point") {
            return coord.coordinates;
        }
    }
    if (Array.isArray(coord) &&
        coord.length >= 2 &&
        !Array.isArray(coord[0]) &&
        !Array.isArray(coord[1])) {
        return coord;
    }
    throw new Error("coord must be GeoJSON Point or an Array of numbers");
}

//http://en.wikipedia.org/wiki/Haversine_formula
//http://www.movable-type.co.uk/scripts/latlong.html
/**
 * Calculates the distance between two {@link Point|points} in degrees, radians, miles, or kilometers.
 * This uses the [Haversine formula](http://en.wikipedia.org/wiki/Haversine_formula) to account for global curvature.
 *
 * @name distance
 * @param {Coord | Point} from origin point or coordinate
 * @param {Coord | Point} to destination point or coordinate
 * @param {Object} [options={}] Optional parameters
 * @param {string} [options.units='kilometers'] can be degrees, radians, miles, or kilometers
 * @returns {number} distance between the two points
 * @example
 * var from = turf.point([-75.343, 39.984]);
 * var to = turf.point([-75.534, 39.123]);
 * var options = {units: 'miles'};
 *
 * var distance = turf.distance(from, to, options);
 *
 * //addToMap
 * var addToMap = [from, to];
 * from.properties.distance = distance;
 * to.properties.distance = distance;
 */
function distance(from, to, options) {
    if (options === void 0) { options = {}; }
    var coordinates1 = getCoord(from);
    var coordinates2 = getCoord(to);
    var dLat = degreesToRadians(coordinates2[1] - coordinates1[1]);
    var dLon = degreesToRadians(coordinates2[0] - coordinates1[0]);
    var lat1 = degreesToRadians(coordinates1[1]);
    var lat2 = degreesToRadians(coordinates2[1]);
    var a = Math.pow(Math.sin(dLat / 2), 2) +
        Math.pow(Math.sin(dLon / 2), 2) * Math.cos(lat1) * Math.cos(lat2);
    return radiansToLength(2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)), options.units);
}

// http://en.wikipedia.org/wiki/Haversine_formula
// http://www.movable-type.co.uk/scripts/latlong.html
/**
 * Takes two {@link Point|points} and finds the geographic bearing between them,
 * i.e. the angle measured in degrees from the north line (0 degrees)
 *
 * @name bearing
 * @param {Coord} start starting Point
 * @param {Coord} end ending Point
 * @param {Object} [options={}] Optional parameters
 * @param {boolean} [options.final=false] calculates the final bearing if true
 * @returns {number} bearing in decimal degrees, between -180 and 180 degrees (positive clockwise)
 * @example
 * var point1 = turf.point([-75.343, 39.984]);
 * var point2 = turf.point([-75.534, 39.123]);
 *
 * var bearing = turf.bearing(point1, point2);
 *
 * //addToMap
 * var addToMap = [point1, point2]
 * point1.properties['marker-color'] = '#f00'
 * point2.properties['marker-color'] = '#0f0'
 * point1.properties.bearing = bearing
 */
function bearing(start, end, options) {
    if (options === void 0) { options = {}; }
    // Reverse calculation
    if (options.final === true) {
        return calculateFinalBearing(start, end);
    }
    var coordinates1 = getCoord(start);
    var coordinates2 = getCoord(end);
    var lon1 = degreesToRadians(coordinates1[0]);
    var lon2 = degreesToRadians(coordinates2[0]);
    var lat1 = degreesToRadians(coordinates1[1]);
    var lat2 = degreesToRadians(coordinates2[1]);
    var a = Math.sin(lon2 - lon1) * Math.cos(lat2);
    var b = Math.cos(lat1) * Math.sin(lat2) -
        Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
    return radiansToDegrees(Math.atan2(a, b));
}
/**
 * Calculates Final Bearing
 *
 * @private
 * @param {Coord} start starting Point
 * @param {Coord} end ending Point
 * @returns {number} bearing
 */
function calculateFinalBearing(start, end) {
    // Swap start & end
    var bear = bearing(end, start);
    bear = (bear + 180) % 360;
    return bear;
}

/**
 * Calculate bearing between two points (degrees true)
 */ function calculateBearing(fromLat, fromLon, toLat, toLon) {
    const bearing$1 = bearing(point([
        fromLon,
        fromLat
    ]), point([
        toLon,
        toLat
    ]));
    // Normalize to 0-360
    return (bearing$1 + 360) % 360;
}
/**
 * Calculate distance between two points in nautical miles
 */ function calculateDistance$1(fromLat, fromLon, toLat, toLon) {
    return distance(point([
        fromLon,
        fromLat
    ]), point([
        toLon,
        toLat
    ]), {
        units: 'nauticalmiles'
    });
}
/**
 * Calculate headwind component (positive = headwind, negative = tailwind)
 */ function calculateHeadwindComponent(trackTrue, windDir, windSpeed) {
    // Wind direction is where wind comes FROM
    // Convert to radians
    const trackRad = trackTrue * Math.PI / 180;
    const windRad = windDir * Math.PI / 180;
    // Headwind component: positive = headwind (slowing down), negative = tailwind (speeding up)
    return windSpeed * Math.cos(windRad - trackRad);
}
/**
 * Calculate ground speed given TAS and wind
 */ function calculateGroundSpeed(tas, trackTrue, windDir, windSpeed) {
    // Calculate headwind component
    const headwind = calculateHeadwindComponent(trackTrue, windDir, windSpeed);
    // Ground speed calculation (simplified, ignores wind correction angle)
    // Ground speed = TAS - headwind (headwind positive = slower, negative = faster)
    const groundSpeed = tas - headwind;
    return Math.max(0, groundSpeed);
}
/**
 * Calculate leg data between two waypoints
 */ function calculateLeg(from, to, tas = 100, windDir, windSpeed) {
    const bearing = calculateBearing(from.lat, from.lon, to.lat, to.lon);
    const distance = calculateDistance$1(from.lat, from.lon, to.lat, to.lon);
    let groundSpeed;
    let ete;
    if (windDir !== undefined && windSpeed !== undefined) {
        groundSpeed = calculateGroundSpeed(tas, bearing, windDir, windSpeed);
        ete = groundSpeed > 0 ? distance / groundSpeed * 60 : undefined;
    } else {
        groundSpeed = tas;
        ete = distance / tas * 60;
    }
    return {
        distance,
        bearing,
        groundSpeed,
        ete
    };
}
/**
 * Calculate navigation data for all waypoints in a flight plan
 */ function calculateFlightPlanNavigation(waypoints, tas = 100) {
    if (waypoints.length === 0) {
        return {
            waypoints: [],
            totals: {
                distance: 0,
                ete: 0
            }
        };
    }
    let totalDistance = 0;
    let totalEte = 0;
    let weightedHeadwindSum = 0; // For distance-weighted average
    const updatedWaypoints = waypoints.map((wp, index)=>{
        if (index === 0) {
            // First waypoint has no leg data
            return {
                ...wp,
                distance: 0,
                bearing: 0,
                ete: 0
            };
        }
        const prevWp = waypoints[index - 1];
        const leg = calculateLeg(prevWp, wp, tas, wp.windDir, wp.windSpeed);
        totalDistance += leg.distance;
        if (leg.ete) {
            totalEte += leg.ete;
        }
        // Calculate headwind component for this leg (if wind data available)
        if (wp.windDir !== undefined && wp.windSpeed !== undefined && leg.bearing !== undefined) {
            const headwind = calculateHeadwindComponent(leg.bearing, wp.windDir, wp.windSpeed);
            // Weight by distance for accurate average
            weightedHeadwindSum += headwind * leg.distance;
        }
        return {
            ...wp,
            distance: leg.distance,
            bearing: leg.bearing,
            groundSpeed: leg.groundSpeed,
            ete: leg.ete
        };
    });
    // Calculate distance-weighted average headwind
    const averageHeadwind = totalDistance > 0 ? weightedHeadwindSum / totalDistance : undefined;
    return {
        waypoints: updatedWaypoints,
        totals: {
            distance: totalDistance,
            ete: totalEte,
            averageGroundSpeed: totalEte > 0 ? totalDistance / totalEte * 60 : tas,
            averageHeadwind
        }
    };
}
/**
 * Format distance for display
 */ function formatDistance(nm) {
    return `${nm.toFixed(1)} NM`;
}
/**
 * Format bearing for display
 */ function formatBearing(degrees) {
    return `${Math.round(degrees).toString().padStart(3, '0')}°`;
}
/**
 * Format ETE for display
 */ function formatEte(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
        return `${hours}h ${mins.toString().padStart(2, '0')}m`;
    }
    return `${mins}m`;
}
/**
 * Format headwind/tailwind for display
 */ function formatHeadwind(headwind) {
    const absValue = Math.abs(headwind);
    if (headwind > 0) {
        return `HW ${absValue.toFixed(0)} kt`;
    } else if (headwind < 0) {
        return `TW ${absValue.toFixed(0)} kt`;
    }
    return 'No wind';
}

/**
 * GPX file exporter
 * Exports flight plans to GPX format for GPS devices
 */ /**
 * Convert a flight plan to GPX XML string
 */ function exportToGPX(flightPlan) {
    const timestamp = new Date().toISOString();
    const waypointsXml = flightPlan.waypoints.map((wp)=>createWaypointXml(wp)).join('\n    ');
    const routePointsXml = flightPlan.waypoints.map((wp)=>createRoutePointXml(wp)).join('\n      ');
    return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="VFR Flight Planner - Windy Plugin"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${escapeXml(flightPlan.name)}</name>
    <time>${timestamp}</time>
  </metadata>

  <!-- Waypoints -->
  ${waypointsXml}

  <!-- Route -->
  <rte>
    <name>${escapeXml(flightPlan.name)}</name>
    ${routePointsXml}
  </rte>
</gpx>`;
}
function createWaypointXml(wp) {
    const elevationXml = wp.elevation !== undefined ? `\n      <ele>${feetToMeters(wp.elevation).toFixed(1)}</ele>` : '';
    const commentXml = wp.comment ? `\n      <cmt>${escapeXml(wp.comment)}</cmt>` : '';
    const descXml = wp.type !== 'USER WAYPOINT' ? `\n      <desc>${escapeXml(wp.type)}</desc>` : '';
    return `<wpt lat="${wp.lat.toFixed(6)}" lon="${wp.lon.toFixed(6)}">
      <name>${escapeXml(wp.name)}</name>${elevationXml}${commentXml}${descXml}
      <sym>${getGpxSymbol(wp.type)}</sym>
    </wpt>`;
}
function createRoutePointXml(wp) {
    const elevationXml = wp.elevation !== undefined ? `\n        <ele>${feetToMeters(wp.elevation).toFixed(1)}</ele>` : '';
    return `<rtept lat="${wp.lat.toFixed(6)}" lon="${wp.lon.toFixed(6)}">
        <name>${escapeXml(wp.name)}</name>${elevationXml}
      </rtept>`;
}
function getGpxSymbol(type) {
    switch(type){
        case 'AIRPORT':
            return 'Airport';
        case 'VOR':
            return 'Navaid, VOR';
        case 'NDB':
            return 'Navaid, NDB';
        case 'INT':
        case 'INT-VRP':
            return 'Waypoint';
        case 'USER WAYPOINT':
        default:
            return 'Flag, Blue';
    }
}
function feetToMeters(feet) {
    return feet * 0.3048;
}
function escapeXml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
/**
 * Trigger a file download in the browser
 */ function downloadGPX(flightPlan) {
    const gpxContent = exportToGPX(flightPlan);
    const blob = new Blob([
        gpxContent
    ], {
        type: 'application/gpx+xml'
    });
    const url = URL.createObjectURL(blob);
    const filename = `${flightPlan.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.gpx`;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

const DEFAULT_ALERT_THRESHOLDS = {
    windSpeed: 25,
    gustSpeed: 35,
    visibility: 5,
    cloudBase: 1500,
    precipitation: 5
};
/**
 * Convert m/s to knots
 */ function msToKnots(ms) {
    return ms * 1.94384;
}
/**
 * Convert Kelvin to Celsius
 */ function kelvinToCelsius(k) {
    return k - 273.15;
}
/**
 * Convert meters to feet
 */ function metersToFeet$1(m) {
    return m * 3.28084;
}
/**
 * Pressure level definitions with approximate altitudes
 */ const PRESSURE_LEVELS = [
    {
        level: 'surface',
        altitudeFeet: 0
    },
    {
        level: '1000h',
        altitudeFeet: 330
    },
    {
        level: '950h',
        altitudeFeet: 1600
    },
    {
        level: '900h',
        altitudeFeet: 3300
    },
    {
        level: '850h',
        altitudeFeet: 5000
    },
    {
        level: '700h',
        altitudeFeet: 10000
    },
    {
        level: '500h',
        altitudeFeet: 18000
    },
    {
        level: '300h',
        altitudeFeet: 30000
    },
    {
        level: '200h',
        altitudeFeet: 39000
    }
];
/**
 * Convert altitude in feet MSL to approximate pressure level (hPa)
 * Uses standard atmosphere model
 * @param altitudeFeet - Altitude in feet MSL
 * @returns Pressure level string (e.g., "850h") or "surface" for low altitudes
 */ function altitudeToPressureLevel(altitudeFeet) {
    if (altitudeFeet < 500) {
        return 'surface';
    }
    // Find the appropriate level
    for(let i = PRESSURE_LEVELS.length - 1; i >= 0; i--){
        if (altitudeFeet >= PRESSURE_LEVELS[i].altitudeFeet) {
            return PRESSURE_LEVELS[i].level;
        }
    }
    return 'surface';
}
/**
 * Get the two pressure levels that bracket the target altitude for interpolation
 * @param altitudeFeet - Target altitude in feet MSL
 * @returns Object with lower and upper pressure levels and their altitudes, plus interpolation fraction
 */ function getBracketingPressureLevels(altitudeFeet) {
    if (altitudeFeet < 0) {
        return null;
    }
    // If below lowest level, use surface only
    if (altitudeFeet < PRESSURE_LEVELS[1].altitudeFeet) {
        return {
            lower: PRESSURE_LEVELS[0],
            upper: PRESSURE_LEVELS[1],
            fraction: altitudeFeet / PRESSURE_LEVELS[1].altitudeFeet
        };
    }
    // Find the two levels that bracket the altitude
    for(let i = 1; i < PRESSURE_LEVELS.length; i++){
        const lower = PRESSURE_LEVELS[i - 1];
        const upper = PRESSURE_LEVELS[i];
        if (altitudeFeet >= lower.altitudeFeet && altitudeFeet <= upper.altitudeFeet) {
            const altitudeRange = upper.altitudeFeet - lower.altitudeFeet;
            const fraction = altitudeRange > 0 ? (altitudeFeet - lower.altitudeFeet) / altitudeRange : 0;
            return {
                lower,
                upper,
                fraction
            };
        }
    }
    // Above highest level, use highest two levels
    const last = PRESSURE_LEVELS[PRESSURE_LEVELS.length - 1];
    const secondLast = PRESSURE_LEVELS[PRESSURE_LEVELS.length - 2];
    return {
        lower: secondLast,
        upper: last,
        fraction: 1.0 // At or above highest level
    };
}
/**
 * Estimate visibility from relative humidity (rough approximation)
 */ function estimateVisibility(humidity) {
    // Very rough estimate - high humidity = lower visibility
    if (humidity >= 100) return 0.5;
    if (humidity >= 95) return 2;
    if (humidity >= 90) return 5;
    if (humidity >= 80) return 10;
    return 20;
}
/**
 * Fetches vertical wind data for all pressure levels using getMeteogramForecastData with extended: 'true'
 * This is the approach used by the flyxc windy-sounding plugin
 * @param lat - Latitude
 * @param lon - Longitude
 * @param enableLogging - Enable debug logging
 * @returns Object with wind data at each pressure level (windU-XXXh, windV-XXXh keys)
 */ async function fetchVerticalWindData(lat, lon, enableLogging = false) {
    try {
        // Log the request parameters
        const requestParams = {
            model: 'ecmwf',
            location: {
                lat,
                lon,
                step: 1
            },
            options: {
                extended: 'true'
            }
        };
        if (enableLogging) {
            console.log(`[VFR Debug] ========== getMeteogramForecastData REQUEST ==========`);
            console.log(`[VFR Debug] Request params:`, JSON.stringify(requestParams, null, 2));
        }
        // Use getMeteogramForecastData with extended: 'true' to get all pressure levels
        // This is the approach used by flyxc windy-sounding plugin
        const result = await getMeteogramForecastData('ecmwf', {
            lat,
            lon,
            step: 1
        }, {
            extended: 'true'
        } // extended option to get all pressure levels
        );
        if (enableLogging) {
            console.log(`[VFR Debug] ========== getMeteogramForecastData RAW RESPONSE ==========`);
            console.log(`[VFR Debug] Full result object:`, result);
            console.log(`[VFR Debug] Result type:`, typeof result);
            console.log(`[VFR Debug] Result keys:`, result ? Object.keys(result) : 'null');
            if (result?.data) {
                console.log(`[VFR Debug] result.data keys:`, Object.keys(result.data));
                console.log(`[VFR Debug] result.data:`, result.data);
            }
            if (result?.data?.data) {
                const dataKeys = Object.keys(result.data.data);
                console.log(`[VFR Debug] result.data.data keys (${dataKeys.length}):`, dataKeys);
                // Show wind-related keys specifically
                const windKeys = dataKeys.filter((k)=>k.includes('wind') || k.includes('Wind'));
                console.log(`[VFR Debug] Wind-related keys:`, windKeys);
                // Log sample values for first wind key
                if (windKeys.length > 0) {
                    console.log(`[VFR Debug] Sample ${windKeys[0]}:`, result.data.data[windKeys[0]]);
                }
            }
            console.log(`[VFR Debug] ========================================================`);
        }
        return result?.data?.data || null;
    } catch (error) {
        console.error('[VFR Planner] Error fetching vertical wind data:', error);
        if (enableLogging) {
            console.log(`[VFR Debug] Error details:`, error);
        }
        return null;
    }
}
/**
 * Meteogram pressure levels with approximate altitudes in feet
 * These are the levels available from getMeteogramForecastData with extended: 'true'
 * Includes all standard pressure levels from surface to stratosphere
 */ const METEOGRAM_PRESSURE_LEVELS = [
    {
        level: '1000h',
        altitudeFeet: 330
    },
    {
        level: '975h',
        altitudeFeet: 1000
    },
    {
        level: '950h',
        altitudeFeet: 1600
    },
    {
        level: '925h',
        altitudeFeet: 2500
    },
    {
        level: '900h',
        altitudeFeet: 3300
    },
    {
        level: '850h',
        altitudeFeet: 5000
    },
    {
        level: '800h',
        altitudeFeet: 6200
    },
    {
        level: '700h',
        altitudeFeet: 10000
    },
    {
        level: '600h',
        altitudeFeet: 14000
    },
    {
        level: '500h',
        altitudeFeet: 18000
    },
    {
        level: '400h',
        altitudeFeet: 23500
    },
    {
        level: '300h',
        altitudeFeet: 30000
    },
    {
        level: '250h',
        altitudeFeet: 34000
    },
    {
        level: '200h',
        altitudeFeet: 39000
    },
    {
        level: '150h',
        altitudeFeet: 45000
    },
    {
        level: '100h',
        altitudeFeet: 53000
    }
];
/**
 * Extracts wind at a specific altitude from meteogram vertical data
 * Interpolates between pressure levels based on altitude
 * @param meteogramData - Data from getMeteogramForecastData with extended: 'true'
 * @param altitudeFt - Target altitude in feet MSL
 * @param timeIndex - Index in the time series (0 for current)
 * @param enableLogging - Enable debug logging
 * @returns Wind speed (knots) and direction (degrees), or null if not available
 */ function getWindAtAltitudeFromMeteogram(meteogramData, altitudeFt, timeIndex = 0, enableLogging = false) {
    if (!meteogramData) return null;
    // First, get all available wind levels using dynamic key discovery
    const allWinds = getAllWindLevelsFromMeteogram(meteogramData, timeIndex, false); // Don't double-log
    if (allWinds.length === 0) {
        if (enableLogging) {
            console.log(`[VFR Debug] getWindAtAltitude: No wind levels found in meteogram data`);
        }
        return null;
    }
    // Sort by altitude
    const sortedWinds = [
        ...allWinds
    ].sort((a, b)=>a.altitudeFeet - b.altitudeFeet);
    if (enableLogging) {
        console.log(`[VFR Debug] getWindAtAltitude: target=${altitudeFt}ft, available levels:`, sortedWinds.map((w)=>`${w.level}(${w.altitudeFeet}ft)`));
    }
    // Find bracketing levels
    let lowerWind = sortedWinds[0];
    let upperWind = sortedWinds[sortedWinds.length - 1];
    for(let i = 0; i < sortedWinds.length - 1; i++){
        if (altitudeFt >= sortedWinds[i].altitudeFeet && altitudeFt <= sortedWinds[i + 1].altitudeFeet) {
            lowerWind = sortedWinds[i];
            upperWind = sortedWinds[i + 1];
            break;
        }
    }
    // If altitude is below lowest level, use lowest
    if (altitudeFt < sortedWinds[0].altitudeFeet) {
        lowerWind = sortedWinds[0];
        upperWind = sortedWinds[0];
    }
    // If altitude is above highest level, use highest
    if (altitudeFt > sortedWinds[sortedWinds.length - 1].altitudeFeet) {
        lowerWind = sortedWinds[sortedWinds.length - 1];
        upperWind = sortedWinds[sortedWinds.length - 1];
    }
    // Interpolate between the two levels
    let windSpeed;
    let windDir;
    let usedLevel;
    if (lowerWind === upperWind) {
        // Same level - no interpolation needed
        windSpeed = lowerWind.windSpeed;
        windDir = lowerWind.windDir;
        usedLevel = lowerWind.level;
    } else {
        // Interpolate
        const altRange = upperWind.altitudeFeet - lowerWind.altitudeFeet;
        const fraction = altRange > 0 ? (altitudeFt - lowerWind.altitudeFeet) / altRange : 0;
        // For wind direction, we need to handle the wrap-around at 360°
        let dirDiff = upperWind.windDir - lowerWind.windDir;
        if (dirDiff > 180) dirDiff -= 360;
        if (dirDiff < -180) dirDiff += 360;
        windDir = lowerWind.windDir + dirDiff * fraction;
        if (windDir < 0) windDir += 360;
        if (windDir >= 360) windDir -= 360;
        // Linear interpolation for speed
        windSpeed = lowerWind.windSpeed + (upperWind.windSpeed - lowerWind.windSpeed) * fraction;
        usedLevel = `${lowerWind.level}-${upperWind.level}`;
        if (enableLogging) {
            console.log(`[VFR Debug] Interpolating: ${lowerWind.level}(${lowerWind.altitudeFeet}ft) -> ${upperWind.level}(${upperWind.altitudeFeet}ft), fraction=${fraction.toFixed(2)}`);
        }
    }
    if (enableLogging) {
        console.log(`[VFR Debug] Result: ${Math.round(windDir)}° @ ${Math.round(windSpeed)}kt (level: ${usedLevel})`);
    }
    return {
        windSpeed,
        windDir,
        level: usedLevel
    };
}
/**
 * Find wind U/V key pairs dynamically from meteogram data
 * Searches for patterns like windU-850h, wind_u-850h, gh-850h, etc.
 */ function findWindKeyPairs(meteogramData, enableLogging = false) {
    const allKeys = Object.keys(meteogramData);
    const levelKeyPairs = new Map();
    // Find all potential U keys
    const uKeysByLevel = new Map();
    const vKeysByLevel = new Map();
    for (const key of allKeys){
        // Check for U component patterns
        let match = key.match(/wind.*[uU][-_]?(\d+h?)/i);
        if (match) {
            const level = match[1].endsWith('h') ? match[1] : `${match[1]}h`;
            uKeysByLevel.set(level, key);
            continue;
        }
        // Check for V component patterns
        match = key.match(/wind.*[vV][-_]?(\d+h?)/i);
        if (match) {
            const level = match[1].endsWith('h') ? match[1] : `${match[1]}h`;
            vKeysByLevel.set(level, key);
        }
    }
    if (enableLogging) {
        console.log(`[VFR Debug] Found U keys:`, Array.from(uKeysByLevel.entries()));
        console.log(`[VFR Debug] Found V keys:`, Array.from(vKeysByLevel.entries()));
    }
    // Match U and V keys by level
    for (const [level, uKey] of uKeysByLevel){
        const vKey = vKeysByLevel.get(level);
        if (vKey) {
            levelKeyPairs.set(level, {
                uKey,
                vKey
            });
        }
    }
    return levelKeyPairs;
}
/**
 * Extracts wind at ALL pressure levels from meteogram data
 * Dynamically finds wind keys regardless of format (windU-850h, wind_u_850h, etc.)
 * @param meteogramData - Data from getMeteogramForecastData with extended: 'true'
 * @param timeIndex - Index in the time series (0 for current)
 * @param enableLogging - Enable debug logging
 * @returns Array of wind data at each available level
 */ function getAllWindLevelsFromMeteogram(meteogramData, timeIndex = 0, enableLogging = false) {
    if (!meteogramData) return [];
    const winds = [];
    const allKeys = Object.keys(meteogramData);
    if (enableLogging) {
        console.log(`[VFR Debug] getAllWindLevels - total keys: ${allKeys.length}`);
        // Log wind-related keys
        const windKeys = allKeys.filter((k)=>k.toLowerCase().includes('wind'));
        console.log(`[VFR Debug] Wind-related keys:`, windKeys);
    }
    // Try dynamic key discovery first
    const keyPairs = findWindKeyPairs(meteogramData, enableLogging);
    if (keyPairs.size > 0) {
        if (enableLogging) {
            console.log(`[VFR Debug] Using dynamic key discovery, found ${keyPairs.size} level pairs`);
        }
        for (const [level, { uKey, vKey }] of keyPairs){
            const uArr = meteogramData[uKey];
            const vArr = meteogramData[vKey];
            if (Array.isArray(uArr) && Array.isArray(vArr) && uArr.length > timeIndex && vArr.length > timeIndex) {
                const u = uArr[timeIndex];
                const v = vArr[timeIndex];
                if (typeof u === 'number' && typeof v === 'number') {
                    // Find altitude for this level - only accept known pressure levels
                    const levelInfo = METEOGRAM_PRESSURE_LEVELS.find((pl)=>pl.level === level);
                    if (!levelInfo) {
                        // Skip unknown levels to avoid wrong altitude calculations
                        if (enableLogging) {
                            console.log(`[VFR Debug] Skipping unknown level: ${level}`);
                        }
                        continue;
                    }
                    const speedMs = Math.sqrt(u * u + v * v);
                    const speedKt = speedMs * 1.94384;
                    const dir = (Math.atan2(-u, -v) * 180 / Math.PI + 360) % 360;
                    winds.push({
                        level,
                        altitudeFeet: levelInfo.altitudeFeet,
                        windSpeed: speedKt,
                        windDir: dir
                    });
                    if (enableLogging) {
                        console.log(`[VFR Debug] Level ${level} (${levelInfo.altitudeFeet}ft): ${uKey}=${u}, ${vKey}=${v} -> ${Math.round(dir)}°/${Math.round(speedKt)}kt`);
                    }
                }
            }
        }
    }
    // Fallback: try predefined key formats
    if (winds.length === 0) {
        if (enableLogging) {
            console.log(`[VFR Debug] Dynamic discovery found no winds, trying predefined formats...`);
        }
        for (const pl of METEOGRAM_PRESSURE_LEVELS){
            // Try different key formats for U component
            const uKeyVariants = [
                `windU-${pl.level}`,
                `wind_u-${pl.level}`,
                `wind-u-${pl.level}`,
                `windU_${pl.level}`,
                `wind_u_${pl.level}`
            ];
            const vKeyVariants = [
                `windV-${pl.level}`,
                `wind_v-${pl.level}`,
                `wind-v-${pl.level}`,
                `windV_${pl.level}`,
                `wind_v_${pl.level}`
            ];
            let u;
            let v;
            let foundUKey = '';
            let foundVKey = '';
            // Find matching U key
            for (const key of uKeyVariants){
                if (meteogramData[key] !== undefined) {
                    const arr = meteogramData[key];
                    u = Array.isArray(arr) ? arr[timeIndex] : arr;
                    foundUKey = key;
                    break;
                }
            }
            // Find matching V key
            for (const key of vKeyVariants){
                if (meteogramData[key] !== undefined) {
                    const arr = meteogramData[key];
                    v = Array.isArray(arr) ? arr[timeIndex] : arr;
                    foundVKey = key;
                    break;
                }
            }
            if (enableLogging && pl.level === '850h') {
                console.log(`[VFR Debug] Predefined lookup for ${pl.level}: foundU=${foundUKey}(${u}), foundV=${foundVKey}(${v})`);
            }
            if (typeof u === 'number' && typeof v === 'number') {
                const speedMs = Math.sqrt(u * u + v * v);
                const speedKt = speedMs * 1.94384;
                const dir = (Math.atan2(-u, -v) * 180 / Math.PI + 360) % 360;
                winds.push({
                    level: pl.level,
                    altitudeFeet: pl.altitudeFeet,
                    windSpeed: speedKt,
                    windDir: dir
                });
            }
        }
    }
    // Sort by altitude (ascending - low to high)
    winds.sort((a, b)=>a.altitudeFeet - b.altitudeFeet);
    if (enableLogging) {
        console.log(`[VFR Debug] getAllWindLevels found ${winds.length} levels:`, winds.map((w)=>`${w.level}(${w.altitudeFeet}ft)`));
    }
    return winds;
}
/**
 * Get interpolation indices for a target time within timestamps array
 * This allows us to interpolate between forecast timesteps like WindyVFRPlugIn does
 */ function getInterpolationIndices(timestamps, targetTime) {
    const target = targetTime ?? Date.now();
    // Find the bracket containing the target time
    for(let i = 0; i < timestamps.length - 1; i++){
        if (target >= timestamps[i] && target <= timestamps[i + 1]) {
            const timeDiff = timestamps[i + 1] - timestamps[i];
            const fraction = timeDiff > 0 ? (target - timestamps[i]) / timeDiff : 0;
            return {
                lowerIndex: i,
                upperIndex: i + 1,
                fraction,
                needsInterpolation: fraction > 0 && fraction < 1
            };
        }
    }
    // Target is outside range - find closest
    let closestIndex = 0;
    let closestDiff = Math.abs(timestamps[0] - target);
    for(let i = 1; i < timestamps.length; i++){
        const diff = Math.abs(timestamps[i] - target);
        if (diff < closestDiff) {
            closestDiff = diff;
            closestIndex = i;
        }
    }
    return {
        lowerIndex: closestIndex,
        upperIndex: closestIndex,
        fraction: 0,
        needsInterpolation: false
    };
}
/**
 * Interpolate between two values
 */ function interpolateValue(value0, value1, fraction) {
    if (value0 === null || value0 === undefined || isNaN(value0)) {
        return value1 !== null && value1 !== undefined && !isNaN(value1) ? value1 : null;
    }
    if (value1 === null || value1 === undefined || isNaN(value1)) {
        return value0;
    }
    return value0 + (value1 - value0) * fraction;
}
async function getForecastTimeRange(lat, lon) {
    try {
        const product = store.get('product') || 'ecmwf';
        // Add timeout to prevent hanging
        const fetchPromise = getPointForecastData(product, {
            lat,
            lon
        }, {}, {});
        const timeoutPromise = new Promise((_, reject)=>{
            setTimeout(()=>{
                reject(new Error('Forecast time range fetch timeout'));
            }, 10000); // 10 second timeout
        });
        const response = await Promise.race([
            fetchPromise,
            timeoutPromise
        ]);
        const { data } = response.data;
        const timestamps = data.ts;
        if (!timestamps || timestamps.length === 0) {
            return null;
        }
        return {
            start: timestamps[0],
            end: timestamps[timestamps.length - 1],
            timestamps
        };
    } catch (error) {
        console.error('Failed to get forecast time range:', error);
        return null;
    }
}
/**
 * Fetch weather data for a single waypoint at a specific time
 * Uses Windy Point Forecast API with pressure levels for altitude-specific wind data
 * @param altitude - Altitude in feet MSL for wind data (optional, defaults to surface)
 */ async function fetchWaypointWeather(lat, lon, pluginName, targetTimestamp, waypointName, altitude, enableLogging = false) {
    try {
        // Get current product from store (same as Windy picker uses)
        const product = store.get('product');
        // Get bracketing pressure levels for interpolation if altitude is specified
        let bracketingLevels = null;
        let levels = [
            'surface'
        ];
        if (altitude !== undefined && altitude > 0) {
            bracketingLevels = getBracketingPressureLevels(altitude);
            if (bracketingLevels) {
                // Request both bracketing levels plus surface for other data
                levels = [
                    'surface',
                    bracketingLevels.lower.level,
                    bracketingLevels.upper.level
                ];
                // Remove duplicates
                levels = [
                    ...new Set(levels)
                ];
                if (enableLogging && waypointName) {
                    console.log(`[VFR Planner] Fetching weather for ${waypointName} at ${altitude} ft MSL`);
                    console.log(`[VFR Planner] Interpolating between ${bracketingLevels.lower.level} (${bracketingLevels.lower.altitudeFeet}ft) and ${bracketingLevels.upper.level} (${bracketingLevels.upper.altitudeFeet}ft)`);
                    console.log(`[VFR Planner] Interpolation fraction: ${(bracketingLevels.fraction * 100).toFixed(1)}%`);
                }
            } else {
                // Fallback to single level if bracketing fails
                const pressureLevel1 = altitudeToPressureLevel(altitude);
                levels = pressureLevel1 === 'surface' ? [
                    'surface'
                ] : [
                    'surface',
                    pressureLevel1
                ];
                if (enableLogging && waypointName) {
                    console.log(`[VFR Planner] Fetching weather for ${waypointName} at ${altitude} ft MSL (pressure level: ${pressureLevel1})`);
                }
            }
        } else {
            if (enableLogging && waypointName) {
                console.log(`[VFR Planner] Fetching weather for ${waypointName} at surface`);
            }
        }
        // Try to use getPointForecastData with levels option first
        // If that doesn't work, we'll try the direct API call
        let response;
        let responseData;
        try {
            // First, try passing levels in options to getPointForecastData
            // This might work if Windy's plugin API supports it
            const options = {};
            if (levels.length > 0 && levels[0] !== 'surface') {
                options.levels = levels;
            }
            try {
                const pointForecastResponse = await getPointForecastData(product, {
                    lat,
                    lon
                }, options, {});
                // Check if response has level-specific data
                const data = pointForecastResponse.data?.data;
                if (data && (data[`wind-${pressureLevel}`] || data.wind)) {
                    // Response has the data we need
                    responseData = data;
                } else {
                    // No level-specific data, try direct API
                    throw new Error('No level-specific data in response');
                }
            } catch (pointForecastError) {
                // getPointForecastData doesn't support levels, try direct API call
                if (enableLogging && waypointName) {
                    console.log(`[VFR Planner] getPointForecastData doesn't support levels, trying direct API for ${waypointName}`);
                }
                const requestBody = {
                    lat,
                    lon,
                    model: product,
                    parameters: [
                        'wind',
                        'windDir',
                        'temp',
                        'dewPoint',
                        'pressure',
                        'rh',
                        'mm',
                        'cbase',
                        'gust'
                    ],
                    levels: levels
                };
                // Use native fetch to call Windy's Point Forecast API
                // Note: This may require API key or may not work from plugin context
                const apiUrl = 'https://api.windy.com/api/point-forecast/v2';
                const apiResponse = await fetch(apiUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestBody)
                });
                const responseStatus = apiResponse.status;
                const responseStatusText = apiResponse.statusText;
                // Read response body once
                let responseBodyText = '';
                let apiResult = null;
                try {
                    responseBodyText = await apiResponse.text();
                    if (responseBodyText) {
                        apiResult = JSON.parse(responseBodyText);
                    }
                } catch (e) {
                    responseBodyText = 'Could not parse response';
                }
                if (!apiResponse.ok) {
                    throw new Error(`Point Forecast API returned ${responseStatus}: ${responseStatusText}`);
                }
                responseData = apiResult?.data || apiResult;
            }
        } catch (apiError) {
            // If both methods fail, fall back to getPointForecastData for surface data
            if (enableLogging && waypointName) {
                console.warn(`[VFR Planner] Point Forecast API failed for ${waypointName}, falling back to surface data:`, apiError);
            }
            // Fall back to original method for surface data only
            const fallbackResponse = await getPointForecastData(product, {
                lat,
                lon
            }, {}, {});
            // Use the fallback response data (surface level only)
            responseData = fallbackResponse.data?.data;
            // Clear bracketing levels since we're using surface data only
            bracketingLevels = null;
            if (enableLogging && waypointName) {
                console.log(`[VFR Planner] Using surface data fallback for ${waypointName}`);
            }
        }
        // The response has data keys like 'wind-surface', 'wind-850h', 'windDir-850h', etc.
        // responseData is already set above
        // Debug: log available data keys and wind at all levels
        if (enableLogging && waypointName) {
            console.log(`[VFR Debug] Response data keys for ${waypointName}:`, Object.keys(responseData || {}));
            // Check for wind-specific keys
            const windKeys = Object.keys(responseData || {}).filter((k)=>k.includes('wind'));
            console.log(`[VFR Debug] Wind-related keys:`, windKeys);
            // Log wind at all available pressure levels
            const levels = [
                {
                    key: 'surface',
                    alt: '10m AGL',
                    desc: 'Surface wind'
                },
                {
                    key: '1000h',
                    alt: '330 ft',
                    desc: 'Near surface'
                },
                {
                    key: '950h',
                    alt: '1,600 ft',
                    desc: 'Low level'
                },
                {
                    key: '900h',
                    alt: '3,300 ft',
                    desc: 'Boundary layer'
                },
                {
                    key: '850h',
                    alt: '5,000 ft',
                    desc: 'GA / Low clouds'
                },
                {
                    key: '700h',
                    alt: '10,000 ft',
                    desc: 'Mid-altitude'
                },
                {
                    key: '500h',
                    alt: '18,000 ft',
                    desc: 'Mid-troposphere'
                },
                {
                    key: '300h',
                    alt: '30,000 ft',
                    desc: 'Jet stream'
                },
                {
                    key: '200h',
                    alt: '39,000 ft',
                    desc: 'Upper troposphere'
                }
            ];
            console.log(`[VFR Debug] ===== Wind at all levels for ${waypointName} =====`);
            levels.forEach((level)=>{
                const windKey = level.key === 'surface' ? 'wind' : `wind-${level.key}`;
                const windDirKey = level.key === 'surface' ? 'windDir' : `windDir-${level.key}`;
                const windArr = responseData[windKey] || responseData[`wind-${level.key}`];
                const windDirArr = responseData[windDirKey] || responseData[`windDir-${level.key}`];
                if (windArr && windDirArr) {
                    // Get first value (current time) and convert m/s to knots
                    const windMs = windArr[0];
                    const windKt = Math.round(windMs * 1.94384);
                    const windDeg = Math.round(windDirArr[0]);
                    console.log(`[VFR Debug]   ${level.key.padEnd(8)} (${level.alt.padEnd(10)}): ${String(windDeg).padStart(3, '0')}° @ ${String(windKt).padStart(2)}kt - ${level.desc}`);
                } else {
                    console.log(`[VFR Debug]   ${level.key.padEnd(8)} (${level.alt.padEnd(10)}): N/A - ${level.desc}`);
                }
            });
            console.log(`[VFR Debug] ================================================`);
        }
        // Get wind data at flight altitude using meteogram vertical data
        let windSpeed;
        let windDir;
        let gustData;
        let usedPressureLevel = 'surface';
        let verticalWinds = [];
        // Fetch meteogram data for vertical wind levels
        console.log(`[VFR Debug] Fetching meteogram for ${waypointName}, altitude=${altitude}...`);
        const meteogramData = await fetchVerticalWindData(lat, lon, true); // Always log for debugging
        console.log(`[VFR Debug] Meteogram result for ${waypointName}:`, meteogramData ? `${Object.keys(meteogramData).length} keys` : 'NULL');
        if (meteogramData) {
            // Get all wind levels
            verticalWinds = getAllWindLevelsFromMeteogram(meteogramData, 0, true); // Always log for debugging
            console.log(`[VFR Debug] Extracted ${verticalWinds.length} vertical wind levels`);
            if (enableLogging && waypointName) {
                console.log(`[VFR Planner] Vertical winds for ${waypointName}:`, verticalWinds.map((w)=>`${w.level}(${w.altitudeFeet}ft): ${Math.round(w.windDir)}°@${Math.round(w.windSpeed)}kt`).join(', '));
            }
            // Try to get altitude-specific wind
            if (altitude !== undefined && altitude > 0) {
                const altitudeWind = getWindAtAltitudeFromMeteogram(meteogramData, altitude, 0, enableLogging);
                if (altitudeWind) {
                    windSpeed = altitudeWind.windSpeed;
                    windDir = altitudeWind.windDir;
                    usedPressureLevel = altitudeWind.level;
                    if (enableLogging && waypointName) {
                        console.log(`[VFR Planner] ✓ Wind at ${altitude}ft for ${waypointName}: ${Math.round(windDir)}° @ ${Math.round(windSpeed)}kt (level: ${usedPressureLevel})`);
                    }
                }
            }
        }
        // Fallback to surface wind from point forecast if altitude wind not available
        let windData;
        let windDirData;
        if (windSpeed === undefined || windDir === undefined) {
            usedPressureLevel = 'surface';
            windData = responseData['wind-surface'] || responseData.wind;
            windDirData = responseData['windDir-surface'] || responseData.windDir;
            gustData = responseData['gust-surface'] || responseData.gust;
            if (enableLogging && waypointName) {
                console.log(`[VFR Debug] Falling back to surface wind for ${waypointName}:`, {
                    windDataFound: !!windData,
                    windDirDataFound: !!windDirData,
                    windSample: windData?.slice?.(0, 3),
                    windDirSample: windDirData?.slice?.(0, 3)
                });
            }
        } else {
            // We have altitude wind, but still get gust from surface
            gustData = responseData['gust-surface'] || responseData.gust;
        }
        // Get other data from surface level
        const tempData = responseData['temp-surface'] || responseData.temp;
        const dewPointData = responseData['dewPoint-surface'] || responseData.dewPoint;
        const pressureData = responseData['pressure-surface'] || responseData.pressure;
        const rhData = responseData['rh-surface'] || responseData.rh;
        const mmData = responseData['mm-surface'] || responseData.mm;
        const cbaseData = responseData['cbase-surface'] || responseData.cbase;
        // Get timestamps
        const timestamps = responseData.ts || responseData['ts-surface'] || [];
        if (!timestamps || timestamps.length === 0) {
            if (enableLogging) {
                console.error(`[VFR Planner] No timestamp data for ${waypointName}`);
            }
            return null;
        }
        // Use target timestamp if provided, otherwise use Windy's current timestamp
        const windyTimestamp = store.get('timestamp');
        const effectiveTimestamp = targetTimestamp ?? windyTimestamp ?? Date.now();
        // Interpolate to get values at the target time
        const interp = getInterpolationIndices(timestamps, effectiveTimestamp);
        const { lowerIndex, upperIndex, fraction, needsInterpolation } = interp;
        // Extract wind data - use altitude wind if available, otherwise interpolate from surface arrays
        let finalWindSpeed;
        let finalWindDir;
        if (windSpeed !== undefined && windDir !== undefined) {
            // Use altitude-specific wind (already in knots)
            finalWindSpeed = windSpeed;
            finalWindDir = windDir;
        } else {
            // Fallback: interpolate from surface wind arrays
            const windLower = windData?.[lowerIndex] || 0;
            const windUpper = windData?.[upperIndex] || 0;
            const windMs = needsInterpolation ? interpolateValue(windLower, windUpper, fraction) ?? 0 : windLower;
            finalWindSpeed = msToKnots(windMs);
            const windDirLower = windDirData?.[lowerIndex] || 0;
            const windDirUpper = windDirData?.[upperIndex] || 0;
            finalWindDir = windDirLower;
            if (needsInterpolation && windDirData) {
                let diff = windDirUpper - windDirLower;
                if (diff > 180) diff -= 360;
                if (diff < -180) diff += 360;
                finalWindDir = windDirLower + diff * fraction;
                if (finalWindDir < 0) finalWindDir += 360;
                if (finalWindDir >= 360) finalWindDir -= 360;
            }
        }
        // Extract other weather data
        const tempLower = tempData?.[lowerIndex] || 273.15;
        const tempUpper = tempData?.[upperIndex] || 273.15;
        const tempKelvin = needsInterpolation ? interpolateValue(tempLower, tempUpper, fraction) ?? 273.15 : tempLower;
        const tempCelsius = kelvinToCelsius(tempKelvin);
        let dewPointCelsius;
        if (dewPointData) {
            const dewLower = dewPointData[lowerIndex];
            const dewUpper = dewPointData[upperIndex];
            const dewKelvin = needsInterpolation ? interpolateValue(dewLower, dewUpper, fraction) : dewLower;
            if (dewKelvin !== null && dewKelvin !== undefined && !isNaN(dewKelvin)) {
                dewPointCelsius = kelvinToCelsius(dewKelvin);
            }
        }
        // Cloud base (from surface level)
        let cloudBase;
        let cloudBaseDisplay;
        if (cbaseData && Array.isArray(cbaseData) && cbaseData.length > 0) {
            const cbaseLower = cbaseData[lowerIndex];
            const cbaseUpper = cbaseData[upperIndex];
            const isLowerValid = cbaseLower !== null && cbaseLower !== undefined && !isNaN(cbaseLower) && cbaseLower > 0;
            const isUpperValid = cbaseUpper !== null && cbaseUpper !== undefined && !isNaN(cbaseUpper) && cbaseUpper > 0;
            let cbaseValue = null;
            if (needsInterpolation) {
                if (isLowerValid && isUpperValid) {
                    cbaseValue = interpolateValue(cbaseLower, cbaseUpper, fraction);
                }
            } else {
                cbaseValue = isLowerValid ? cbaseLower : isUpperValid ? cbaseUpper : null;
            }
            if (cbaseValue !== null && cbaseValue !== undefined && !isNaN(cbaseValue) && cbaseValue > 0) {
                cloudBase = cbaseValue;
                const cloudBaseFeet = metersToFeet$1(cloudBase);
                cloudBaseDisplay = `${Math.round(cloudBaseFeet)} ft`;
            }
        }
        // Extract gust data
        const gustMs = gustData ? needsInterpolation ? interpolateValue(gustData[lowerIndex], gustData[upperIndex], fraction) ?? 0 : gustData[lowerIndex] || 0 : undefined;
        const weather = {
            windSpeed: finalWindSpeed,
            windDir: finalWindDir,
            windGust: gustMs !== undefined ? msToKnots(gustMs) : undefined,
            windAltitude: altitude,
            windLevel: usedPressureLevel,
            verticalWinds: verticalWinds.length > 0 ? verticalWinds : undefined,
            temperature: tempCelsius,
            dewPoint: dewPointCelsius,
            pressure: pressureData ? needsInterpolation ? (interpolateValue(pressureData[lowerIndex], pressureData[upperIndex], fraction) ?? 0) / 100 : (pressureData[lowerIndex] || 0) / 100 : undefined,
            cloudBase,
            cloudBaseDisplay,
            humidity: rhData ? needsInterpolation ? interpolateValue(rhData[lowerIndex], rhData[upperIndex], fraction) ?? undefined : rhData[lowerIndex] : undefined,
            visibility: rhData ? estimateVisibility(needsInterpolation ? interpolateValue(rhData[lowerIndex], rhData[upperIndex], fraction) ?? 0 : rhData[lowerIndex] || 0) : undefined,
            precipitation: mmData ? needsInterpolation ? interpolateValue(mmData[lowerIndex], mmData[upperIndex], fraction) ?? undefined : mmData[lowerIndex] : undefined,
            timestamp: timestamps[lowerIndex]
        };
        if (enableLogging && waypointName) {
            console.log(`[VFR Planner] Fetched weather for ${waypointName} at ${usedPressureLevel}:`, {
                windSpeed: `${Math.round(weather.windSpeed)} kt`,
                windDir: `${Math.round(weather.windDir)}°`,
                windAltitude: weather.windAltitude ? `${weather.windAltitude} ft MSL` : 'surface',
                temperature: `${Math.round(weather.temperature)}°C`,
                pressureLevel: usedPressureLevel
            });
        }
        return weather;
    } catch (error) {
        console.error('Failed to fetch weather for waypoint:', error);
        return null;
    }
}
/**
 * Fetch weather for all waypoints in a flight plan
 * @param waypoints - Array of waypoints with ETE data
 * @param pluginName - Plugin name for API calls
 * @param departureTime - Optional departure timestamp (ms). If provided, weather is fetched for estimated arrival time at each waypoint
 * @param altitude - Altitude in feet MSL for wind data (optional, defaults to surface)
 */ async function fetchFlightPlanWeather(waypoints, pluginName, departureTime, altitude, enableLogging = false) {
    const weatherMap = new Map();
    // Calculate cumulative ETE to get arrival time at each waypoint
    let cumulativeEteMinutes = 0;
    // Fetch weather for all waypoints in parallel with individual error handling
    const promises = waypoints.map(async (wp, index)=>{
        try {
            // Calculate target time for this waypoint
            let targetTime;
            if (departureTime) {
                // Add cumulative ETE to departure time
                targetTime = departureTime + cumulativeEteMinutes * 60 * 1000;
            }
            // Add this waypoint's ETE to cumulative for next waypoint
            cumulativeEteMinutes += wp.ete || 0;
            // Add timeout to prevent hanging (15 seconds per waypoint)
            const weatherPromise = fetchWaypointWeather(wp.lat, wp.lon, pluginName, targetTime, wp.name, altitude, enableLogging);
            const timeoutPromise = new Promise((resolve)=>{
                setTimeout(()=>{
                    if (enableLogging) {
                        console.warn(`[VFR] Weather fetch timeout for waypoint ${wp.name} (${wp.id})`);
                    }
                    resolve(null);
                }, 15000); // Reduced to 15 seconds
            });
            const weather = await Promise.race([
                weatherPromise,
                timeoutPromise
            ]);
            if (weather) {
                weatherMap.set(wp.id, weather);
            }
        } catch (error) {
            // Individual waypoint errors shouldn't stop the entire operation
            if (enableLogging) {
                console.error(`[VFR] Error fetching weather for waypoint ${wp.name} (${wp.id}):`, error);
            }
        // Continue with other waypoints even if one fails
        }
    });
    // Use allSettled to ensure all promises complete (even if some fail)
    await Promise.allSettled(promises);
    return weatherMap;
}
/**
 * Check for weather alerts at a waypoint
 * @param weather - Weather data for the waypoint
 * @param thresholds - Alert thresholds
 * @param plannedAltitude - Planned flight altitude in feet (optional, for altitude conflict check)
 */ function checkWeatherAlerts(weather, thresholds = DEFAULT_ALERT_THRESHOLDS, plannedAltitude) {
    const alerts = [];
    // Wind speed alert
    if (weather.windSpeed >= thresholds.windSpeed) {
        alerts.push({
            type: 'wind',
            severity: weather.windSpeed >= thresholds.windSpeed * 1.5 ? 'warning' : 'caution',
            message: `Wind ${Math.round(weather.windSpeed)} kt`,
            value: weather.windSpeed,
            threshold: thresholds.windSpeed
        });
    }
    // Gust alert
    if (weather.windGust && weather.windGust >= thresholds.gustSpeed) {
        alerts.push({
            type: 'gust',
            severity: weather.windGust >= thresholds.gustSpeed * 1.3 ? 'warning' : 'caution',
            message: `Gust ${Math.round(weather.windGust)} kt`,
            value: weather.windGust,
            threshold: thresholds.gustSpeed
        });
    }
    // Visibility alert
    if (weather.visibility && weather.visibility < thresholds.visibility) {
        alerts.push({
            type: 'visibility',
            severity: weather.visibility < thresholds.visibility / 2 ? 'warning' : 'caution',
            message: `Vis ${weather.visibility.toFixed(1)} km`,
            value: weather.visibility,
            threshold: thresholds.visibility
        });
    }
    // Cloud base alert
    // Note: weather.cloudBase is in meters AGL, but thresholds.cloudBase is in feet
    if (weather.cloudBase) {
        const cloudBaseFeet = metersToFeet$1(weather.cloudBase);
        // Use rounded value (no decimals)
        const ceilingDisplay = `${Math.round(cloudBaseFeet)} ft`;
        if (cloudBaseFeet < thresholds.cloudBase) {
            alerts.push({
                type: 'ceiling',
                severity: cloudBaseFeet < thresholds.cloudBase / 2 ? 'warning' : 'caution',
                message: `Ceiling ${ceilingDisplay}`,
                value: cloudBaseFeet,
                threshold: thresholds.cloudBase
            });
        }
        // Altitude conflict alert: cloud ceiling below planned altitude
        if (plannedAltitude !== undefined && plannedAltitude > 0 && cloudBaseFeet < plannedAltitude) {
            const margin = plannedAltitude - cloudBaseFeet;
            // Use rounded value for planned altitude
            const plannedAltDisplay = `${Math.round(plannedAltitude)} ft`;
            alerts.push({
                type: 'altitude-conflict',
                severity: margin > 500 ? 'warning' : 'caution',
                message: `Ceiling ${ceilingDisplay} below planned ${plannedAltDisplay}`,
                value: cloudBaseFeet,
                threshold: plannedAltitude
            });
        }
    }
    // Precipitation alert
    if (weather.precipitation && weather.precipitation >= thresholds.precipitation) {
        alerts.push({
            type: 'rain',
            severity: weather.precipitation >= thresholds.precipitation * 2 ? 'warning' : 'caution',
            message: `Rain ${weather.precipitation.toFixed(1)} mm`,
            value: weather.precipitation,
            threshold: thresholds.precipitation
        });
    }
    return alerts;
}
/**
 * Format wind for display
 */ function formatWind(speed, direction, altitude) {
    const dir = Math.round(direction).toString().padStart(3, '0');
    const speedStr = `${dir}°/${Math.round(speed)} kt`;
    if (altitude !== undefined && altitude > 0) {
        return `${speedStr} @ ${Math.round(altitude)}ft`;
    }
    return speedStr;
}
/**
 * Format temperature for display
 */ function formatTemperature(celsius) {
    return `${Math.round(celsius)}°C`;
}
/**
 * Get the full cbase table for a location
 * Returns all cloud base values with their timestamps
 */ async function getCbaseTable(lat, lon, waypointName, enableLogging = false) {
    try {
        const product = store.get('product');
        const response = await getPointForecastData(product, {
            lat,
            lon
        }, {}, {});
        const { data } = response.data;
        if (!data.cbase || !Array.isArray(data.cbase) || data.cbase.length === 0) {
            if (enableLogging) {
                console.log('[VFR] cbase table:', {
                    waypoint: waypointName || 'Unknown',
                    message: 'Not available for this location'
                });
            }
            return null;
        }
        const cbaseTable = data.ts.map((ts, idx)=>{
            const cb = data.cbase?.[idx];
            const hasValue = cb !== null && cb !== undefined && !isNaN(cb) && cb > 0;
            return {
                timestamp: ts,
                timestampISO: new Date(ts).toISOString(),
                cbase: hasValue ? cb : null,
                cbaseFeet: hasValue ? metersToFeet$1(cb) : null
            };
        });
        if (enableLogging) {
            console.log('[VFR] Full cbase table:', {
                waypoint: waypointName || 'Unknown',
                location: {
                    lat,
                    lon
                },
                product,
                totalPoints: cbaseTable.length,
                table: cbaseTable
            });
        }
        return cbaseTable;
    } catch (error) {
        console.error('Failed to get cbase table:', error);
        return null;
    }
}

/**
 * Interpolation utilities for VFR Planner
 * Provides linear and angular interpolation functions for wind and navigation data
 */ /**
 * Linear interpolation between two values
 * @param a - Start value
 * @param b - End value
 * @param t - Interpolation factor (0 to 1)
 * @returns Interpolated value
 */ function lerp(a, b, t) {
    return a + (b - a) * t;
}
/**
 * Angular interpolation with wrap-around handling
 * Prevents "spinning" errors when interpolating between angles like 350° and 10°
 * @param a - Start angle in degrees (0-360)
 * @param b - End angle in degrees (0-360)
 * @param t - Interpolation factor (0 to 1)
 * @returns Interpolated angle in degrees (0-360)
 */ function lerpAngle(a, b, t) {
    // Calculate the difference, handling wrap-around
    let diff = b - a;
    // Use shortest path around the circle
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    // Interpolate
    let result = a + diff * t;
    // Normalize to 0-360 range
    if (result < 0) result += 360;
    if (result >= 360) result -= 360;
    return result;
}
/**
 * Find the two waypoints that bracket a given distance along the route
 * @param distance - Distance in NM from start of route
 * @param waypoints - Array of waypoints with distance data
 * @returns Bracketing waypoints info, or null if not found
 */ function findBracketingWaypoints(distance, waypoints) {
    if (waypoints.length < 2) return null;
    let cumulativeDistance = 0;
    // Find the segment containing the target distance
    for(let i = 0; i < waypoints.length - 1; i++){
        const prevWp = waypoints[i];
        const nextWp = waypoints[i + 1];
        const legDistance = prevWp.distance || 0;
        const nextCumulativeDistance = cumulativeDistance + legDistance;
        if (distance >= cumulativeDistance && distance <= nextCumulativeDistance) {
            const fraction = legDistance > 0 ? (distance - cumulativeDistance) / legDistance : 0;
            return {
                prevWaypoint: prevWp,
                nextWaypoint: nextWp,
                prevIndex: i,
                nextIndex: i + 1,
                prevDistance: cumulativeDistance,
                nextDistance: nextCumulativeDistance,
                fraction
            };
        }
        cumulativeDistance = nextCumulativeDistance;
    }
    // If beyond the end, return last segment
    if (distance >= cumulativeDistance && waypoints.length >= 2) {
        const lastIndex = waypoints.length - 1;
        return {
            prevWaypoint: waypoints[lastIndex - 1],
            nextWaypoint: waypoints[lastIndex],
            prevIndex: lastIndex - 1,
            nextIndex: lastIndex,
            prevDistance: cumulativeDistance - (waypoints[lastIndex - 1].distance || 0),
            nextDistance: cumulativeDistance,
            fraction: 1.0
        };
    }
    return null;
}
/**
 * Interpolate wind data between two waypoints
 * @param distance - Distance in NM from start of route
 * @param waypoints - Array of waypoints
 * @param weatherData - Map of waypoint ID to weather data
 * @param bearing - Track bearing at this point (for wind component calculation)
 * @returns Interpolated wind data
 */ function interpolateWindBetweenWaypoints(distance, waypoints, weatherData, bearing) {
    const defaultWind = {
        windSpeed: 0,
        windDir: 0,
        headwindComponent: 0,
        crosswindComponent: 0
    };
    const bracket = findBracketingWaypoints(distance, waypoints);
    if (!bracket) return defaultWind;
    const prevWx = weatherData.get(bracket.prevWaypoint.id);
    const nextWx = weatherData.get(bracket.nextWaypoint.id);
    // If we don't have weather data for both waypoints, use what we have
    if (!prevWx && !nextWx) return defaultWind;
    // If only one has data, use that
    if (!prevWx && nextWx) {
        return calculateWindComponents(nextWx, bearing);
    }
    if (prevWx && !nextWx) {
        return calculateWindComponents(prevWx, bearing);
    }
    // Both have data - interpolate
    const t = bracket.fraction;
    const windSpeed = lerp(prevWx.windSpeed, nextWx.windSpeed, t);
    const windDir = lerpAngle(prevWx.windDir, nextWx.windDir, t);
    // Interpolate gust if both have it
    let windGust;
    if (prevWx.windGust !== undefined && nextWx.windGust !== undefined) {
        windGust = lerp(prevWx.windGust, nextWx.windGust, t);
    } else if (prevWx.windGust !== undefined) {
        windGust = prevWx.windGust;
    } else if (nextWx.windGust !== undefined) {
        windGust = nextWx.windGust;
    }
    // Calculate wind components
    let headwindComponent = 0;
    let crosswindComponent = 0;
    if (bearing !== undefined) {
        const trackRad = bearing * Math.PI / 180;
        const windRad = windDir * Math.PI / 180;
        const angleDiff = trackRad - windRad;
        headwindComponent = windSpeed * Math.cos(angleDiff);
        crosswindComponent = windSpeed * Math.sin(angleDiff);
    }
    return {
        windSpeed,
        windDir,
        windGust,
        headwindComponent,
        crosswindComponent
    };
}
/**
 * Calculate wind components from weather data
 */ function calculateWindComponents(wx, bearing) {
    let headwindComponent = 0;
    let crosswindComponent = 0;
    if (bearing !== undefined) {
        const trackRad = bearing * Math.PI / 180;
        const windRad = wx.windDir * Math.PI / 180;
        const angleDiff = trackRad - windRad;
        headwindComponent = wx.windSpeed * Math.cos(angleDiff);
        crosswindComponent = wx.windSpeed * Math.sin(angleDiff);
    }
    return {
        windSpeed: wx.windSpeed,
        windDir: wx.windDir,
        windGust: wx.windGust,
        headwindComponent,
        crosswindComponent
    };
}
/**
 * Interpolate bearing between waypoints
 * @param distance - Distance in NM from start
 * @param waypoints - Array of waypoints with bearing data
 * @returns Interpolated bearing in degrees, or undefined
 */ function interpolateBearing(distance, waypoints) {
    const bracket = findBracketingWaypoints(distance, waypoints);
    if (!bracket) return undefined;
    // Use the bearing of the segment we're in (from prevWaypoint)
    // Bearing doesn't change much within a segment, so use the segment's bearing
    return bracket.prevWaypoint.bearing;
}

/**
 * Convert meters to feet
 */ function metersToFeet(m) {
    return m * 3.28084;
}
/**
 * Estimate cloud top from cloud base
 * Uses typical cloud thickness based on cloud type
 * @param cloudBase - Cloud base altitude (in feet, MSL or AGL depending on context)
 * @returns Cloud top altitude (same reference as input)
 */ function estimateCloudTop(cloudBase) {
    // Typical cloud thickness:
    // - Cumulus: 2000-5000 feet
    // - Stratocumulus: 1000-3000 feet
    // - Cumulonimbus: 10000+ feet
    // Using a conservative estimate of 3000 feet for most clouds
    const typicalThickness = 3000; // feet
    return cloudBase + typicalThickness;
}
/**
 * Evaluate VFR flight conditions for a profile segment
 * @param point - Profile data point with weather and terrain
 * @param flightAltitude - Planned flight altitude MSL
 * @param wx - Weather data for additional parameters
 * @param isTerminal - True if this is a departure or arrival waypoint (wind checks apply)
 * @returns Object with condition assessment and reasons
 */ function evaluateSegmentCondition(point, flightAltitude, wx, isTerminal = false) {
    const reasons = [];
    // Check for missing critical data
    if (point.windSpeed === undefined || point.windSpeed === 0) {
        return {
            condition: 'unknown',
            reasons: [
                'Missing wind data'
            ]
        };
    }
    // NOTE: Missing cloud base data (undefined) means CLEAR SKY, not missing data
    // This is a GOOD VFR condition, so we don't return 'unknown' for missing clouds
    // Calculate terrain clearance
    const terrainMSL = point.terrainElevation ?? 0;
    const terrainClearance = flightAltitude - terrainMSL;
    // Get additional weather parameters (with defaults)
    const visibility = wx?.visibility ?? 10; // Default to good visibility if not available
    const precipitation = wx?.precipitation ?? 0; // Default to no precipitation
    const gustSpeed = wx?.windGust; // May be undefined
    // Calculate cloud-related values ONLY if clouds are present
    let cloudBaseAGL;
    let cloudClearance;
    if (point.cloudBase !== undefined) {
        const cloudBaseMSL = point.cloudBase; // Already in MSL from profileService
        cloudBaseAGL = cloudBaseMSL - terrainMSL;
        cloudClearance = cloudBaseMSL - flightAltitude;
        // Check for IMC conditions (flying in clouds) - CRITICAL
        if (flightAltitude >= cloudBaseMSL) {
            reasons.push('Aircraft above cloud base (IMC)');
            return {
                condition: 'poor',
                reasons
            };
        }
    }
    // Collect criteria for evaluation
    const criteria = {
        windSpeed: point.windSpeed,
        gustSpeed,
        cloudBaseAGL: cloudBaseAGL ?? 999999,
        visibility,
        precipitation,
        terrainClearance,
        cloudClearance: cloudClearance ?? 999999
    };
    // Evaluate conditions - Red (Poor) takes priority
    let isPoor = false;
    let isMarginal = false;
    // Wind speed checks - ONLY for departure/arrival waypoints
    // High winds and gusts are primarily a concern for takeoff and landing operations
    if (isTerminal) {
        if (criteria.windSpeed > 25) {
            reasons.push(`High wind (${Math.round(criteria.windSpeed)}kt)`);
            isPoor = true;
        } else if (criteria.windSpeed > 20) {
            reasons.push(`Elevated wind (${Math.round(criteria.windSpeed)}kt)`);
            isMarginal = true;
        }
        // Gust checks
        if (criteria.gustSpeed !== undefined) {
            if (criteria.gustSpeed > 35) {
                reasons.push(`High gusts (${Math.round(criteria.gustSpeed)}kt)`);
                isPoor = true;
            } else if (criteria.gustSpeed > 30) {
                reasons.push(`Elevated gusts (${Math.round(criteria.gustSpeed)}kt)`);
                isMarginal = true;
            }
        }
    }
    // Cloud base AGL checks - ONLY when clouds are present
    // If cloudBase is undefined, it means clear sky (no cloud issues)
    if (cloudBaseAGL !== undefined) {
        if (criteria.cloudBaseAGL < 1500) {
            reasons.push(`Low ceiling (${Math.round(criteria.cloudBaseAGL)}ft AGL)`);
            isPoor = true;
        } else if (criteria.cloudBaseAGL < 2000) {
            reasons.push(`Marginal ceiling (${Math.round(criteria.cloudBaseAGL)}ft AGL)`);
            isMarginal = true;
        }
    }
    // Visibility checks
    if (criteria.visibility < 5) {
        reasons.push(`Low visibility (${criteria.visibility.toFixed(1)}km)`);
        isPoor = true;
    } else if (criteria.visibility < 8) {
        reasons.push(`Reduced visibility (${criteria.visibility.toFixed(1)}km)`);
        isMarginal = true;
    }
    // Precipitation checks
    if (criteria.precipitation > 5) {
        reasons.push(`Heavy precipitation (${criteria.precipitation.toFixed(1)}mm)`);
        isPoor = true;
    } else if (criteria.precipitation > 2) {
        reasons.push(`Moderate precipitation (${criteria.precipitation.toFixed(1)}mm)`);
        isMarginal = true;
    }
    // Terrain clearance checks
    if (criteria.terrainClearance < 500) {
        reasons.push(`Low terrain clearance (${Math.round(criteria.terrainClearance)}ft)`);
        isPoor = true;
    } else if (criteria.terrainClearance < 1000) {
        reasons.push(`Marginal terrain clearance (${Math.round(criteria.terrainClearance)}ft)`);
        isMarginal = true;
    }
    // Cloud clearance checks - ONLY when clouds are present
    // If cloudClearance is undefined, it means clear sky (no cloud clearance issues)
    if (cloudClearance !== undefined) {
        if (criteria.cloudClearance < 200) {
            reasons.push(`Insufficient cloud clearance (${Math.round(criteria.cloudClearance)}ft)`);
            isPoor = true;
        } else if (criteria.cloudClearance < 500) {
            reasons.push(`Marginal cloud clearance (${Math.round(criteria.cloudClearance)}ft)`);
            isMarginal = true;
        }
    }
    // Determine final condition
    if (isPoor) {
        return {
            condition: 'poor',
            reasons
        };
    }
    if (isMarginal) {
        return {
            condition: 'marginal',
            reasons
        };
    }
    // All checks passed - Good VFR
    return {
        condition: 'good',
        reasons: []
    };
}
/**
 * Interpolate altitude between waypoints
 * @param distance - Distance along route in NM
 * @param waypoints - Array of waypoints
 * @param defaultAltitude - Default altitude if no waypoint altitude specified
 * @returns Interpolated altitude in feet MSL
 */ function interpolateAltitude(distance, waypoints, defaultAltitude) {
    if (waypoints.length === 0) return defaultAltitude;
    if (waypoints.length === 1) return waypoints[0].altitude ?? defaultAltitude;
    let cumulativeDistance = 0;
    // Find the two waypoints to interpolate between
    for(let i = 0; i < waypoints.length - 1; i++){
        const wp1 = waypoints[i];
        const wp2 = waypoints[i + 1];
        const legDistance = wp1.distance || 0;
        if (distance >= cumulativeDistance && distance <= cumulativeDistance + legDistance) {
            // Interpolate between wp1 and wp2
            const alt1 = wp1.altitude ?? defaultAltitude;
            const alt2 = wp2.altitude ?? defaultAltitude;
            const t = (distance - cumulativeDistance) / legDistance;
            return alt1 + (alt2 - alt1) * t;
        }
        cumulativeDistance += legDistance;
    }
    // If beyond the end, return last waypoint altitude
    return waypoints[waypoints.length - 1].altitude ?? defaultAltitude;
}
/**
 * Calculate profile data points for the altitude profile graph
 * Includes ALL sampled elevation points for accurate terrain visualization,
 * plus waypoints with full weather and condition data
 * @param waypoints - Array of waypoints from the flight plan
 * @param weatherData - Map of waypoint ID to weather data
 * @param defaultAltitude - Default altitude in feet (from flight plan aircraft profile)
 * @param elevationProfile - Optional array of elevation points from terrain sampling
 * @returns Array of profile data points
 */ function calculateProfileData(waypoints, weatherData, defaultAltitude = 3000, elevationProfile = []) {
    if (waypoints.length === 0) {
        return [];
    }
    const profilePoints = [];
    // Strategy: Include ALL elevation profile points for terrain detail,
    // marking waypoint indices so we can add weather data later
    if (elevationProfile.length > 0) {
        // Add all elevation profile points (includes waypoints + intermediate samples)
        elevationProfile.forEach((elevPoint)=>{
            // Convert elevation from meters to feet
            const terrainElevation = metersToFeet(elevPoint.elevation);
            // Check if this is a waypoint
            const isWaypoint = elevPoint.waypointIndex !== undefined;
            const wp = isWaypoint ? waypoints[elevPoint.waypointIndex] : undefined;
            const wx = wp ? weatherData.get(wp.id) : undefined;
            // For waypoints, use the waypoint's actual altitude; for terrain samples, interpolate
            const altitude = isWaypoint && wp ? wp.altitude ?? defaultAltitude : interpolateAltitude(elevPoint.distance, waypoints, defaultAltitude);
            // For waypoints, calculate full weather data
            let cloudBase;
            let cloudTop;
            let headwindComponent = 0;
            let crosswindComponent = 0;
            let windSpeed = 0;
            let windDir = 0;
            // Debug: log waypoint weather lookup
            if (isWaypoint && wp) {
                console.log(`[Profile Debug] Waypoint ${wp.name} (${wp.id}): wx=${wx ? 'found' : 'NOT FOUND'}, weatherData size=${weatherData.size}`);
                if (!wx && weatherData.size > 0) {
                    console.log(`[Profile Debug] Available keys:`, Array.from(weatherData.keys()));
                }
            }
            if (isWaypoint && wx && wp) {
                // Get cloud data
                if (wx.cloudBase !== undefined && wx.cloudBase !== null && !isNaN(wx.cloudBase) && wx.cloudBase > 0) {
                    const cloudBaseAGL = metersToFeet(wx.cloudBase);
                    const terrainMSL = terrainElevation ?? 0;
                    cloudBase = cloudBaseAGL + terrainMSL;
                    cloudTop = estimateCloudTop(cloudBase);
                }
                // Calculate wind components
                windSpeed = wx.windSpeed;
                windDir = wx.windDir;
                if (wp.bearing !== undefined) {
                    headwindComponent = calculateHeadwindComponent(wp.bearing, wx.windDir, wx.windSpeed);
                    const trackRad = wp.bearing * Math.PI / 180;
                    const windRad = wx.windDir * Math.PI / 180;
                    crosswindComponent = wx.windSpeed * Math.sin(trackRad - windRad);
                } else if (elevPoint.waypointIndex > 0) {
                    const prevWp = waypoints[elevPoint.waypointIndex - 1];
                    if (prevWp.bearing !== undefined) {
                        headwindComponent = calculateHeadwindComponent(prevWp.bearing, wx.windDir, wx.windSpeed);
                        const trackRad = prevWp.bearing * Math.PI / 180;
                        const windRad = wx.windDir * Math.PI / 180;
                        crosswindComponent = wx.windSpeed * Math.sin(trackRad - windRad);
                    }
                }
            } else if (!isWaypoint) {
                // Interpolate wind for terrain sample points (non-waypoints)
                // This fills the gap between waypoints with interpolated wind data
                const bearing = interpolateBearing(elevPoint.distance, waypoints);
                const interpolatedWind = interpolateWindBetweenWaypoints(elevPoint.distance, waypoints, weatherData, bearing);
                windSpeed = interpolatedWind.windSpeed;
                windDir = interpolatedWind.windDir;
                headwindComponent = interpolatedWind.headwindComponent;
                crosswindComponent = interpolatedWind.crosswindComponent;
            }
            // Create profile point
            const point = {
                distance: elevPoint.distance,
                altitude,
                terrainElevation,
                cloudBase,
                cloudTop,
                headwindComponent,
                crosswindComponent,
                windSpeed,
                windDir,
                verticalWinds: wx?.verticalWinds,
                waypointId: wp?.id,
                waypointName: wp?.name
            };
            // Evaluate segment condition only for waypoints
            if (isWaypoint && wp) {
                const isTerminal = elevPoint.waypointIndex === 0 || elevPoint.waypointIndex === waypoints.length - 1;
                const conditionResult = evaluateSegmentCondition(point, altitude, wx, isTerminal);
                point.condition = conditionResult.condition;
                point.conditionReasons = conditionResult.reasons;
            }
            profilePoints.push(point);
        });
    } else {
        // Fallback: No elevation profile, create points from waypoints only
        let cumulativeDistance = 0;
        waypoints.forEach((wp, index)=>{
            const wx = weatherData.get(wp.id);
            const altitude = wp.altitude ?? defaultAltitude;
            const terrainElevation = wp.elevation ? metersToFeet(wp.elevation) : undefined;
            // Get cloud data
            let cloudBase;
            let cloudTop;
            if (wx?.cloudBase !== undefined && wx.cloudBase !== null && !isNaN(wx.cloudBase) && wx.cloudBase > 0) {
                const cloudBaseAGL = metersToFeet(wx.cloudBase);
                const terrainMSL = terrainElevation ?? 0;
                cloudBase = cloudBaseAGL + terrainMSL;
                cloudTop = estimateCloudTop(cloudBase);
            }
            // Calculate wind components
            let headwindComponent = 0;
            let crosswindComponent = 0;
            let windSpeed = 0;
            let windDir = 0;
            if (wx) {
                windSpeed = wx.windSpeed;
                windDir = wx.windDir;
                if (wp.bearing !== undefined) {
                    headwindComponent = calculateHeadwindComponent(wp.bearing, wx.windDir, wx.windSpeed);
                    const trackRad = wp.bearing * Math.PI / 180;
                    const windRad = wx.windDir * Math.PI / 180;
                    crosswindComponent = wx.windSpeed * Math.sin(trackRad - windRad);
                } else if (index > 0) {
                    const prevWp = waypoints[index - 1];
                    if (prevWp.bearing !== undefined) {
                        headwindComponent = calculateHeadwindComponent(prevWp.bearing, wx.windDir, wx.windSpeed);
                        const trackRad = prevWp.bearing * Math.PI / 180;
                        const windRad = wx.windDir * Math.PI / 180;
                        crosswindComponent = wx.windSpeed * Math.sin(trackRad - windRad);
                    }
                }
            }
            const point = {
                distance: cumulativeDistance,
                altitude,
                terrainElevation,
                cloudBase,
                cloudTop,
                headwindComponent,
                crosswindComponent,
                windSpeed,
                windDir,
                verticalWinds: wx?.verticalWinds,
                waypointId: wp.id,
                waypointName: wp.name
            };
            const isTerminal = index === 0 || index === waypoints.length - 1;
            const conditionResult = evaluateSegmentCondition(point, altitude, wx, isTerminal);
            point.condition = conditionResult.condition;
            point.conditionReasons = conditionResult.reasons;
            profilePoints.push(point);
            if (index < waypoints.length - 1) {
                cumulativeDistance += wp.distance || 0;
            }
        });
    }
    return profilePoints;
}

/**
 * Elevation service using Open-Meteo API
 * Fetches terrain elevation data along flight route
 */ /**
 * Calculate great circle distance between two points (Haversine formula)
 * @returns Distance in nautical miles
 */ function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 3440.065; // Earth radius in nautical miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
/**
 * Interpolate a point along great circle path
 * @param lat1, lon1 - Start point
 * @param lat2, lon2 - End point
 * @param fraction - Position along path (0 to 1)
 * @returns Interpolated coordinates
 */ function interpolatePoint(lat1, lon1, lat2, lon2, fraction) {
    // Convert to radians
    const φ1 = lat1 * Math.PI / 180;
    const λ1 = lon1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const λ2 = lon2 * Math.PI / 180;
    // Calculate angular distance
    const d = 2 * Math.asin(Math.sqrt(Math.sin((φ2 - φ1) / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2));
    // Interpolate along great circle
    const a = Math.sin((1 - fraction) * d) / Math.sin(d);
    const b = Math.sin(fraction * d) / Math.sin(d);
    const x = a * Math.cos(φ1) * Math.cos(λ1) + b * Math.cos(φ2) * Math.cos(λ2);
    const y = a * Math.cos(φ1) * Math.sin(λ1) + b * Math.cos(φ2) * Math.sin(λ2);
    const z = a * Math.sin(φ1) + b * Math.sin(φ2);
    const φ = Math.atan2(z, Math.sqrt(x ** 2 + y ** 2));
    const λ = Math.atan2(y, x);
    return {
        lat: φ * 180 / Math.PI,
        lon: λ * 180 / Math.PI
    };
}
/**
 * Sample points along the flight route at regular intervals
 * @param waypoints - Flight plan waypoints
 * @param sampleIntervalNM - Distance between samples in nautical miles (default: 5 NM)
 * @returns Array of sampled points with lat/lon and cumulative distance, plus waypoint index if applicable
 */ function sampleRoutePoints(waypoints, sampleIntervalNM = 5) {
    if (waypoints.length < 2) return [];
    const sampledPoints = [];
    let cumulativeDistance = 0;
    // Always include first waypoint
    sampledPoints.push({
        lat: waypoints[0].lat,
        lon: waypoints[0].lon,
        distance: 0,
        waypointIndex: 0 // Mark as waypoint
    });
    // Sample along each leg
    for(let i = 0; i < waypoints.length - 1; i++){
        const wp1 = waypoints[i];
        const wp2 = waypoints[i + 1];
        const legDistance = calculateDistance(wp1.lat, wp1.lon, wp2.lat, wp2.lon);
        const numSamples = Math.floor(legDistance / sampleIntervalNM);
        // Sample intermediate points along this leg
        for(let j = 1; j <= numSamples; j++){
            const fraction = j * sampleIntervalNM / legDistance;
            const point = interpolatePoint(wp1.lat, wp1.lon, wp2.lat, wp2.lon, fraction);
            const pointDistance = cumulativeDistance + j * sampleIntervalNM;
            sampledPoints.push({
                lat: point.lat,
                lon: point.lon,
                distance: pointDistance
            });
        }
        // Always include the end waypoint of this leg
        cumulativeDistance += legDistance;
        sampledPoints.push({
            lat: wp2.lat,
            lon: wp2.lon,
            distance: cumulativeDistance,
            waypointIndex: i + 1 // Mark as waypoint
        });
    }
    return sampledPoints;
}
/**
 * Fetch elevations from Open-Meteo API for multiple points
 * Open-Meteo Elevation API: https://open-meteo.com/en/docs/elevation-api
 * Free, no API key required
 *
 * @param points - Array of lat/lon points
 * @param enableLogging - Enable debug logging
 * @returns Array of elevation points with elevations in meters MSL
 */ async function fetchElevations(points, enableLogging = false) {
    if (points.length === 0) return [];
    try {
        // Open-Meteo accepts comma-separated lat/lon lists
        const latitudes = points.map((p)=>p.lat.toFixed(6)).join(',');
        const longitudes = points.map((p)=>p.lon.toFixed(6)).join(',');
        const url = `https://api.open-meteo.com/v1/elevation?latitude=${latitudes}&longitude=${longitudes}`;
        if (enableLogging) {
            console.log(`[VFR Planner] Fetching elevations for ${points.length} points from Open-Meteo...`);
            console.log(`[VFR Planner] API URL: ${url}`);
            // Log first 5 points being queried
            console.log('[VFR Planner] First 5 points queried:', points.slice(0, 5).map((p, i)=>`[${i}] (${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}) @ ${p.distance.toFixed(1)}NM`));
        }
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Open-Meteo API error: ${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        if (enableLogging) {
            console.log('[VFR Planner] Open-Meteo API response:', data);
        }
        if (!data.elevation || !Array.isArray(data.elevation)) {
            throw new Error('Invalid response from Open-Meteo API');
        }
        // Combine elevations with original points
        const elevationPoints = points.map((point, index)=>({
                lat: point.lat,
                lon: point.lon,
                elevation: data.elevation[index],
                distance: point.distance,
                waypointIndex: point.waypointIndex
            }));
        if (enableLogging) {
            console.log(`[VFR Planner] Received ${elevationPoints.length} elevation points`);
            console.log(`[VFR Planner] Elevation range: ${Math.min(...data.elevation)}m to ${Math.max(...data.elevation)}m`);
            // Log first 5 points with full details for debugging
            console.log('[VFR Planner] First 5 elevation points received:');
            elevationPoints.slice(0, 5).forEach((p, i)=>{
                const wpMarker = p.waypointIndex !== undefined ? ` [WP ${p.waypointIndex}]` : '';
                console.log(`  [${i}]${wpMarker} (${p.lat.toFixed(6)}, ${p.lon.toFixed(6)}): ${p.elevation}m = ${(p.elevation * 3.28084).toFixed(1)}ft @ ${p.distance.toFixed(1)}NM`);
            });
            // Log all waypoint elevations specifically
            const waypointElevations = elevationPoints.filter((p)=>p.waypointIndex !== undefined);
            console.log(`[VFR Planner] Waypoint elevations (${waypointElevations.length} waypoints):`);
            waypointElevations.forEach((p)=>{
                console.log(`  WP ${p.waypointIndex}: ${p.elevation}m = ${(p.elevation * 3.28084).toFixed(1)}ft MSL`);
            });
        }
        return elevationPoints;
    } catch (error) {
        console.error('[VFR Planner] Error fetching elevations:', error);
        return [];
    }
}
/**
 * Fetch terrain elevation profile for entire flight route
 * @param waypoints - Flight plan waypoints
 * @param sampleIntervalNM - Distance between samples (default: 5 NM)
 * @param enableLogging - Enable debug logging
 * @returns Array of elevation points along the route
 */ async function fetchRouteElevationProfile(waypoints, sampleIntervalNM = 5, enableLogging = false) {
    if (waypoints.length < 2) {
        if (enableLogging) {
            console.log('[VFR Planner] Not enough waypoints for elevation profile');
        }
        return [];
    }
    if (enableLogging) {
        console.log('[VFR Planner] Original waypoint coordinates:');
        waypoints.forEach((wp, i)=>{
            console.log(`  [${i}] ${wp.name}: (${wp.lat.toFixed(6)}, ${wp.lon.toFixed(6)}), FPL elevation: ${wp.elevation ? wp.elevation + 'm' : 'N/A'}`);
        });
    }
    // Sample points along the route
    const sampledPoints = sampleRoutePoints(waypoints, sampleIntervalNM);
    if (enableLogging) {
        console.log(`[VFR Planner] Sampled ${sampledPoints.length} points along ${waypoints.length} waypoint route`);
    }
    // Fetch elevations for all sampled points in one API call
    const elevationPoints = await fetchElevations(sampledPoints, enableLogging);
    return elevationPoints;
}

/**
 * Plugin settings types
 */ const DEFAULT_SETTINGS = {
    defaultAirspeed: 100,
    defaultAltitude: 3000,
    showLabels: false,
    allowDrag: true,
    enableLogging: false,
    terrainSampleInterval: 5,
    distanceUnit: 'nm',
    altitudeUnit: 'ft',
    speedUnit: 'kt'
};

/* src/components/AltitudeProfile.svelte generated by Svelte v4.2.20 */

function add_css$1(target) {
	append_styles(target, "svelte-tougy9", ".profile-empty.svelte-tougy9.svelte-tougy9{padding:20px;text-align:center;color:rgba(255, 255, 255, 0.7);font-size:13px}.profile-empty.svelte-tougy9 p.svelte-tougy9{margin:0}.profile-container.svelte-tougy9.svelte-tougy9{padding:10px;display:flex;flex-direction:column;gap:10px}.cursor-info.svelte-tougy9.svelte-tougy9{padding:8px;background:rgba(255, 255, 255, 0.05);border-radius:4px;font-size:11px;color:rgba(255, 255, 255, 0.9);text-align:center;display:flex;flex-direction:column;gap:6px}.cursor-waypoint-info.svelte-tougy9.svelte-tougy9{display:flex;flex-direction:column;gap:2px}.cursor-winds-section.svelte-tougy9.svelte-tougy9{display:flex;flex-direction:column;gap:2px;padding-top:4px;border-top:1px solid rgba(255, 255, 255, 0.2)}.cursor-row.svelte-tougy9.svelte-tougy9{height:16px;line-height:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.winds-row.svelte-tougy9.svelte-tougy9{display:flex;justify-content:center;gap:6px;flex-wrap:nowrap}.condition-legend.svelte-tougy9.svelte-tougy9{display:flex;gap:15px;padding:8px;background-color:rgba(0, 0, 0, 0.3);border-radius:4px;font-size:11px;justify-content:center;flex-wrap:wrap}.legend-item.svelte-tougy9.svelte-tougy9{display:flex;align-items:center;gap:6px}.legend-color.svelte-tougy9.svelte-tougy9{width:20px;height:3px;border-radius:2px}.legend-label.svelte-tougy9.svelte-tougy9{color:rgba(255, 255, 255, 0.8)}.vertical-winds-label.svelte-tougy9.svelte-tougy9{color:rgba(255, 255, 255, 0.7);font-weight:bold;font-size:10px}.wind-level.svelte-tougy9.svelte-tougy9{color:rgba(255, 255, 255, 0.6);padding:1px 3px;background:rgba(255, 255, 255, 0.1);border-radius:3px;font-size:10px}.wind-level.flight-level.svelte-tougy9.svelte-tougy9{color:#4caf50;background:rgba(76, 175, 80, 0.2);font-weight:bold}.wind-level-empty.svelte-tougy9.svelte-tougy9{color:rgba(255, 255, 255, 0.4);font-size:10px;font-style:italic}.cursor-condition.svelte-tougy9.svelte-tougy9{font-weight:bold}.graph-container.svelte-tougy9.svelte-tougy9{width:100%;overflow-x:auto;background:rgba(0, 0, 0, 0.2);border-radius:4px;padding:10px}.profile-graph.svelte-tougy9.svelte-tougy9{display:block;background:#1a1a1a}");
}

function get_each_context$1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[30] = list[i];
	return child_ctx;
}

function get_each_context_1$1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[30] = list[i];
	child_ctx[34] = i;
	return child_ctx;
}

function get_each_context_2(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[36] = list[i];
	const constants_0 = /*altitudeToY*/ child_ctx[14](/*wind*/ child_ctx[36].altitudeFeet);
	child_ctx[37] = constants_0;
	const constants_1 = getWindLevelColor(/*wind*/ child_ctx[36].altitudeFeet, /*point*/ child_ctx[30].altitude);
	child_ctx[38] = constants_1;
	const constants_2 = generateSmallWindBarb(/*x*/ child_ctx[35], /*y*/ child_ctx[37], /*wind*/ child_ctx[36].windDir, /*wind*/ child_ctx[36].windSpeed);
	child_ctx[39] = constants_2;
	return child_ctx;
}

function get_each_context_3(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[42] = list[i];
	return child_ctx;
}

function get_if_ctx(ctx) {
	const child_ctx = ctx.slice();
	const constants_0 = /*distanceToX*/ child_ctx[13](/*point*/ child_ctx[30].distance);
	child_ctx[35] = constants_0;
	return child_ctx;
}

function get_each_context_4(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[30] = list[i];
	child_ctx[46] = i;
	return child_ctx;
}

function get_if_ctx_1(ctx) {
	const child_ctx = ctx.slice();
	const constants_0 = /*waypointProfileData*/ child_ctx[11][/*index*/ child_ctx[46] + 1];
	child_ctx[47] = constants_0;
	const constants_1 = getSegmentColor$1(/*point*/ child_ctx[30].condition);
	child_ctx[48] = constants_1;
	return child_ctx;
}

function get_each_context_5(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[30] = list[i];
	child_ctx[46] = i;
	return child_ctx;
}

function get_if_ctx_2(ctx) {
	const child_ctx = ctx.slice();
	const constants_0 = /*altitudeToY*/ child_ctx[14](/*point*/ child_ctx[30].cloudTop);
	child_ctx[50] = constants_0;
	const constants_1 = /*altitudeToY*/ child_ctx[14](/*point*/ child_ctx[30].cloudBase);
	child_ctx[51] = constants_1;
	const constants_2 = Math.abs(/*cloudBaseY*/ child_ctx[51] - /*cloudTopY*/ child_ctx[50]);
	child_ctx[52] = constants_2;
	const constants_3 = Math.min(/*cloudTopY*/ child_ctx[50], /*cloudBaseY*/ child_ctx[51]);
	child_ctx[53] = constants_3;
	return child_ctx;
}

function get_if_ctx_3(ctx) {
	const child_ctx = ctx.slice();
	const constants_0 = /*waypointProfileData*/ child_ctx[11][/*index*/ child_ctx[46] + 1];
	child_ctx[47] = constants_0;
	return child_ctx;
}

function get_each_context_6(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[54] = list[i];
	return child_ctx;
}

function get_each_context_7(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[54] = list[i];
	return child_ctx;
}

function get_each_context_8(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[36] = list[i];
	const constants_0 = /*cursorData*/ child_ctx[6] && Math.abs(/*wind*/ child_ctx[36].altitudeFeet - /*cursorData*/ child_ctx[6].altitude) < 500;
	child_ctx[60] = constants_0;
	return child_ctx;
}

function get_if_ctx_4(ctx) {
	const child_ctx = ctx.slice();
	const constants_0 = /*cursorData*/ child_ctx[6].verticalWinds.filter(w => w.altitudeFeet <= /*maxAltitude*/ child_ctx[1]).sort((a, b) => b.altitudeFeet - a.altitudeFeet);
	child_ctx[59] = constants_0;
	return child_ctx;
}

function get_each_context_9(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[36] = list[i];
	const constants_0 = /*cursorData*/ child_ctx[6] && Math.abs(/*wind*/ child_ctx[36].altitudeFeet - /*cursorData*/ child_ctx[6].altitude) < 500;
	child_ctx[60] = constants_0;
	return child_ctx;
}

function get_if_ctx_5(ctx) {
	const child_ctx = ctx.slice();
	const constants_0 = /*cursorData*/ child_ctx[6].verticalWinds.filter(w => w.altitudeFeet <= /*maxAltitude*/ child_ctx[1]).sort((a, b) => b.altitudeFeet - a.altitudeFeet);
	child_ctx[59] = constants_0;
	return child_ctx;
}

// (307:0) {:else}
function create_else_block$1(ctx) {
	let div14;
	let t0;
	let div4;
	let t12;
	let div12;
	let div8;
	let div5;
	let t13;
	let div6;
	let t14;
	let t15;
	let div7;
	let t16;
	let div11;
	let div9;
	let span8;
	let t18;
	let t19;
	let div10;
	let t20;
	let div13;
	let svg;
	let defs;
	let linearGradient;
	let stop0;
	let stop1;
	let stop2;
	let previous_key = /*scaleKey*/ ctx[10];
	let svg_viewBox_value;
	let mounted;
	let dispose;
	let if_block0 = /*settings*/ ctx[0].enableLogging && create_if_block_19$1(ctx);

	function select_block_type_1(ctx, dirty) {
		if (/*cursorData*/ ctx[6]) return create_if_block_18$1;
		return create_else_block_5;
	}

	let current_block_type = select_block_type_1(ctx);
	let if_block1 = current_block_type(ctx);

	function select_block_type_2(ctx, dirty) {
		if (/*cursorData*/ ctx[6] && /*cursorData*/ ctx[6].windSpeed > 0) return create_if_block_16$1;
		return create_else_block_4;
	}

	let current_block_type_1 = select_block_type_2(ctx);
	let if_block2 = current_block_type_1(ctx);

	function select_block_type_3(ctx, dirty) {
		if (/*cursorData*/ ctx[6]?.cloudBase !== undefined) return create_if_block_15$1;
		return create_else_block_3$1;
	}

	let current_block_type_2 = select_block_type_3(ctx);
	let if_block3 = current_block_type_2(ctx);

	function select_block_type_4(ctx, dirty) {
		if (/*cursorData*/ ctx[6]?.condition) return create_if_block_14$1;
		return create_else_block_2$1;
	}

	let current_block_type_3 = select_block_type_4(ctx);
	let if_block4 = current_block_type_3(ctx);

	function select_block_type_5(ctx, dirty) {
		if (/*cursorData*/ ctx[6]?.verticalWinds && /*cursorData*/ ctx[6].verticalWinds.length > 0) return create_if_block_13$1;
		return create_else_block_1$1;
	}

	function select_block_ctx(ctx, type) {
		if (type === create_if_block_13$1) return get_if_ctx_5(ctx);
		return ctx;
	}

	let current_block_type_4 = select_block_type_5(ctx);
	let if_block5 = current_block_type_4(select_block_ctx(ctx, current_block_type_4));
	let if_block6 = /*cursorData*/ ctx[6]?.verticalWinds && /*cursorData*/ ctx[6].verticalWinds.length > 0 && create_if_block_11$1(get_if_ctx_4(ctx));
	let key_block = create_key_block(ctx);

	return {
		c() {
			div14 = element("div");
			if (if_block0) if_block0.c();
			t0 = space();
			div4 = element("div");
			div4.innerHTML = `<div class="legend-item svelte-tougy9"><span class="legend-color svelte-tougy9" style="background-color: #4caf50;"></span> <span class="legend-label svelte-tougy9">Good VFR</span></div> <div class="legend-item svelte-tougy9"><span class="legend-color svelte-tougy9" style="background-color: #ff9800;"></span> <span class="legend-label svelte-tougy9">Marginal VFR</span></div> <div class="legend-item svelte-tougy9"><span class="legend-color svelte-tougy9" style="background-color: #f44336;"></span> <span class="legend-label svelte-tougy9">Poor VFR</span></div> <div class="legend-item svelte-tougy9"><span class="legend-color svelte-tougy9" style="background-color: #757575;"></span> <span class="legend-label svelte-tougy9">No Data</span></div>`;
			t12 = space();
			div12 = element("div");
			div8 = element("div");
			div5 = element("div");
			if_block1.c();
			t13 = space();
			div6 = element("div");
			if_block2.c();
			t14 = space();
			if_block3.c();
			t15 = space();
			div7 = element("div");
			if_block4.c();
			t16 = space();
			div11 = element("div");
			div9 = element("div");
			span8 = element("span");
			span8.textContent = "Winds Aloft:";
			t18 = space();
			if_block5.c();
			t19 = space();
			div10 = element("div");
			if (if_block6) if_block6.c();
			t20 = space();
			div13 = element("div");
			svg = svg_element("svg");
			defs = svg_element("defs");
			linearGradient = svg_element("linearGradient");
			stop0 = svg_element("stop");
			stop1 = svg_element("stop");
			stop2 = svg_element("stop");
			key_block.c();
			attr(div4, "class", "condition-legend svelte-tougy9");
			attr(div5, "class", "cursor-row svelte-tougy9");
			attr(div6, "class", "cursor-row svelte-tougy9");
			attr(div7, "class", "cursor-row cursor-condition svelte-tougy9");

			set_style(div7, "color", (/*cursorData*/ ctx[6]?.condition)
			? getSegmentColor$1(/*cursorData*/ ctx[6].condition)
			: 'rgba(255,255,255,0.4)');

			attr(div8, "class", "cursor-waypoint-info svelte-tougy9");
			attr(span8, "class", "vertical-winds-label svelte-tougy9");
			attr(div9, "class", "cursor-row winds-row svelte-tougy9");
			attr(div10, "class", "cursor-row winds-row svelte-tougy9");
			attr(div11, "class", "cursor-winds-section svelte-tougy9");
			attr(div12, "class", "cursor-info svelte-tougy9");
			attr(stop0, "offset", "0%");
			set_style(stop0, "stop-color", "#d4a574");
			set_style(stop0, "stop-opacity", "1");
			attr(stop1, "offset", "40%");
			set_style(stop1, "stop-color", "#a67c52");
			set_style(stop1, "stop-opacity", "1");
			attr(stop2, "offset", "100%");
			set_style(stop2, "stop-color", "#6b4423");
			set_style(stop2, "stop-opacity", "1");
			attr(linearGradient, "id", "terrainGradient");
			attr(linearGradient, "x1", "0%");
			attr(linearGradient, "y1", "0%");
			attr(linearGradient, "x2", "0%");
			attr(linearGradient, "y2", "100%");
			attr(svg, "class", "profile-graph svelte-tougy9");
			attr(svg, "width", /*graphWidth*/ ctx[3]);
			attr(svg, "height", graphHeight);
			attr(svg, "viewBox", svg_viewBox_value = `0 0 ${/*graphWidth*/ ctx[3]} ${graphHeight}`);
			attr(div13, "class", "graph-container svelte-tougy9");
			attr(div14, "class", "profile-container svelte-tougy9");
		},
		m(target, anchor) {
			insert(target, div14, anchor);
			if (if_block0) if_block0.m(div14, null);
			append(div14, t0);
			append(div14, div4);
			append(div14, t12);
			append(div14, div12);
			append(div12, div8);
			append(div8, div5);
			if_block1.m(div5, null);
			append(div8, t13);
			append(div8, div6);
			if_block2.m(div6, null);
			append(div6, t14);
			if_block3.m(div6, null);
			append(div8, t15);
			append(div8, div7);
			if_block4.m(div7, null);
			append(div12, t16);
			append(div12, div11);
			append(div11, div9);
			append(div9, span8);
			append(div9, t18);
			if_block5.m(div9, null);
			append(div11, t19);
			append(div11, div10);
			if (if_block6) if_block6.m(div10, null);
			append(div14, t20);
			append(div14, div13);
			append(div13, svg);
			append(svg, defs);
			append(defs, linearGradient);
			append(linearGradient, stop0);
			append(linearGradient, stop1);
			append(linearGradient, stop2);
			key_block.m(svg, null);
			/*svg_binding*/ ctx[27](svg);

			if (!mounted) {
				dispose = [
					listen(svg, "mousemove", /*handleMouseMove*/ ctx[15]),
					listen(svg, "mouseleave", /*handleMouseLeave*/ ctx[16])
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (/*settings*/ ctx[0].enableLogging) {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_19$1(ctx);
					if_block0.c();
					if_block0.m(div14, t0);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block1) {
				if_block1.p(ctx, dirty);
			} else {
				if_block1.d(1);
				if_block1 = current_block_type(ctx);

				if (if_block1) {
					if_block1.c();
					if_block1.m(div5, null);
				}
			}

			if (current_block_type_1 === (current_block_type_1 = select_block_type_2(ctx)) && if_block2) {
				if_block2.p(ctx, dirty);
			} else {
				if_block2.d(1);
				if_block2 = current_block_type_1(ctx);

				if (if_block2) {
					if_block2.c();
					if_block2.m(div6, t14);
				}
			}

			if (current_block_type_2 === (current_block_type_2 = select_block_type_3(ctx)) && if_block3) {
				if_block3.p(ctx, dirty);
			} else {
				if_block3.d(1);
				if_block3 = current_block_type_2(ctx);

				if (if_block3) {
					if_block3.c();
					if_block3.m(div6, null);
				}
			}

			if (current_block_type_3 === (current_block_type_3 = select_block_type_4(ctx)) && if_block4) {
				if_block4.p(ctx, dirty);
			} else {
				if_block4.d(1);
				if_block4 = current_block_type_3(ctx);

				if (if_block4) {
					if_block4.c();
					if_block4.m(div7, null);
				}
			}

			if (dirty[0] & /*cursorData*/ 64) {
				set_style(div7, "color", (/*cursorData*/ ctx[6]?.condition)
				? getSegmentColor$1(/*cursorData*/ ctx[6].condition)
				: 'rgba(255,255,255,0.4)');
			}

			if (current_block_type_4 === (current_block_type_4 = select_block_type_5(ctx)) && if_block5) {
				if_block5.p(select_block_ctx(ctx, current_block_type_4), dirty);
			} else {
				if_block5.d(1);
				if_block5 = current_block_type_4(select_block_ctx(ctx, current_block_type_4));

				if (if_block5) {
					if_block5.c();
					if_block5.m(div9, null);
				}
			}

			if (/*cursorData*/ ctx[6]?.verticalWinds && /*cursorData*/ ctx[6].verticalWinds.length > 0) {
				if (if_block6) {
					if_block6.p(get_if_ctx_4(ctx), dirty);
				} else {
					if_block6 = create_if_block_11$1(get_if_ctx_4(ctx));
					if_block6.c();
					if_block6.m(div10, null);
				}
			} else if (if_block6) {
				if_block6.d(1);
				if_block6 = null;
			}

			if (dirty[0] & /*scaleKey*/ 1024 && safe_not_equal(previous_key, previous_key = /*scaleKey*/ ctx[10])) {
				key_block.d(1);
				key_block = create_key_block(ctx);
				key_block.c();
				key_block.m(svg, null);
			} else {
				key_block.p(ctx, dirty);
			}

			if (dirty[0] & /*graphWidth*/ 8) {
				attr(svg, "width", /*graphWidth*/ ctx[3]);
			}

			if (dirty[0] & /*graphWidth*/ 8 && svg_viewBox_value !== (svg_viewBox_value = `0 0 ${/*graphWidth*/ ctx[3]} ${graphHeight}`)) {
				attr(svg, "viewBox", svg_viewBox_value);
			}
		},
		d(detaching) {
			if (detaching) {
				detach(div14);
			}

			if (if_block0) if_block0.d();
			if_block1.d();
			if_block2.d();
			if_block3.d();
			if_block4.d();
			if_block5.d();
			if (if_block6) if_block6.d();
			key_block.d(detaching);
			/*svg_binding*/ ctx[27](null);
			mounted = false;
			run_all(dispose);
		}
	};
}

// (303:0) {#if profileData.length === 0}
function create_if_block$1(ctx) {
	let div;

	return {
		c() {
			div = element("div");
			div.innerHTML = `<p class="svelte-tougy9">No profile data available. Please ensure you have at least 2 waypoints and weather data.</p>`;
			attr(div, "class", "profile-empty svelte-tougy9");
		},
		m(target, anchor) {
			insert(target, div, anchor);
		},
		p: noop,
		d(detaching) {
			if (detaching) {
				detach(div);
			}
		}
	};
}

// (310:4) {#if settings.enableLogging}
function create_if_block_19$1(ctx) {
	let div;
	let t0;
	let t1_value = /*waypointProfileData*/ ctx[11].length + "";
	let t1;
	let t2;
	let t3_value = /*profileData*/ ctx[2].filter(/*func*/ ctx[22]).length + "";
	let t3;
	let t4;
	let t5_value = /*waypointProfileData*/ ctx[11].filter(/*func_1*/ ctx[23]).length + "";
	let t5;
	let t6;
	let t7_value = /*waypointProfileData*/ ctx[11].filter(func_2$1).length + "";
	let t7;

	return {
		c() {
			div = element("div");
			t0 = text("Waypoints: ");
			t1 = text(t1_value);
			t2 = text(" |\n            Terrain samples: ");
			t3 = text(t3_value);
			t4 = text(" |\n            Clouds: ");
			t5 = text(t5_value);
			t6 = text(" |\n            Wind: ");
			t7 = text(t7_value);
			attr(div, "class", "debug-info");
			set_style(div, "font-size", "10px");
			set_style(div, "color", "rgba(255,255,255,0.5)");
			set_style(div, "padding", "4px");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, t0);
			append(div, t1);
			append(div, t2);
			append(div, t3);
			append(div, t4);
			append(div, t5);
			append(div, t6);
			append(div, t7);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*waypointProfileData*/ 2048 && t1_value !== (t1_value = /*waypointProfileData*/ ctx[11].length + "")) set_data(t1, t1_value);
			if (dirty[0] & /*profileData*/ 4 && t3_value !== (t3_value = /*profileData*/ ctx[2].filter(/*func*/ ctx[22]).length + "")) set_data(t3, t3_value);
			if (dirty[0] & /*waypointProfileData*/ 2048 && t5_value !== (t5_value = /*waypointProfileData*/ ctx[11].filter(/*func_1*/ ctx[23]).length + "")) set_data(t5, t5_value);
			if (dirty[0] & /*waypointProfileData*/ 2048 && t7_value !== (t7_value = /*waypointProfileData*/ ctx[11].filter(func_2$1).length + "")) set_data(t7, t7_value);
		},
		d(detaching) {
			if (detaching) {
				detach(div);
			}
		}
	};
}

// (346:16) {:else}
function create_else_block_5(ctx) {
	let t;

	return {
		c() {
			t = text("Altitude: -- | Terrain: -- | Distance: --");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		p: noop,
		d(detaching) {
			if (detaching) {
				detach(t);
			}
		}
	};
}

// (344:16) {#if cursorData}
function create_if_block_18$1(ctx) {
	let t0;
	let t1_value = Math.round(/*cursorData*/ ctx[6].altitude) + "";
	let t1;
	let t2;

	let t3_value = (/*cursorData*/ ctx[6].terrainElevation !== undefined
	? Math.round(/*cursorData*/ ctx[6].terrainElevation) + 'ft'
	: '--') + "";

	let t3;
	let t4;
	let t5_value = /*cursorData*/ ctx[6].distance.toFixed(1) + "";
	let t5;
	let t6;

	return {
		c() {
			t0 = text("Altitude: ");
			t1 = text(t1_value);
			t2 = text("ft | Terrain: ");
			t3 = text(t3_value);
			t4 = text(" | Distance: ");
			t5 = text(t5_value);
			t6 = text("NM");
		},
		m(target, anchor) {
			insert(target, t0, anchor);
			insert(target, t1, anchor);
			insert(target, t2, anchor);
			insert(target, t3, anchor);
			insert(target, t4, anchor);
			insert(target, t5, anchor);
			insert(target, t6, anchor);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*cursorData*/ 64 && t1_value !== (t1_value = Math.round(/*cursorData*/ ctx[6].altitude) + "")) set_data(t1, t1_value);

			if (dirty[0] & /*cursorData*/ 64 && t3_value !== (t3_value = (/*cursorData*/ ctx[6].terrainElevation !== undefined
			? Math.round(/*cursorData*/ ctx[6].terrainElevation) + 'ft'
			: '--') + "")) set_data(t3, t3_value);

			if (dirty[0] & /*cursorData*/ 64 && t5_value !== (t5_value = /*cursorData*/ ctx[6].distance.toFixed(1) + "")) set_data(t5, t5_value);
		},
		d(detaching) {
			if (detaching) {
				detach(t0);
				detach(t1);
				detach(t2);
				detach(t3);
				detach(t4);
				detach(t5);
				detach(t6);
			}
		}
	};
}

// (356:16) {:else}
function create_else_block_4(ctx) {
	let t;

	return {
		c() {
			t = text("Wind: --");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		p: noop,
		d(detaching) {
			if (detaching) {
				detach(t);
			}
		}
	};
}

// (351:16) {#if cursorData && cursorData.windSpeed > 0}
function create_if_block_16$1(ctx) {
	let t0;
	let t1_value = /*cursorData*/ ctx[6].windSpeed.toFixed(0) + "";
	let t1;
	let t2;
	let t3_value = Math.round(/*cursorData*/ ctx[6].windDir) + "";
	let t3;
	let t4;
	let if_block_anchor;
	let if_block = /*cursorData*/ ctx[6].headwindComponent !== 0 && create_if_block_17$1(ctx);

	return {
		c() {
			t0 = text("Wind: ");
			t1 = text(t1_value);
			t2 = text("kt @ ");
			t3 = text(t3_value);
			t4 = text("°\n                    ");
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			insert(target, t0, anchor);
			insert(target, t1, anchor);
			insert(target, t2, anchor);
			insert(target, t3, anchor);
			insert(target, t4, anchor);
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*cursorData*/ 64 && t1_value !== (t1_value = /*cursorData*/ ctx[6].windSpeed.toFixed(0) + "")) set_data(t1, t1_value);
			if (dirty[0] & /*cursorData*/ 64 && t3_value !== (t3_value = Math.round(/*cursorData*/ ctx[6].windDir) + "")) set_data(t3, t3_value);

			if (/*cursorData*/ ctx[6].headwindComponent !== 0) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block_17$1(ctx);
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		d(detaching) {
			if (detaching) {
				detach(t0);
				detach(t1);
				detach(t2);
				detach(t3);
				detach(t4);
				detach(if_block_anchor);
			}

			if (if_block) if_block.d(detaching);
		}
	};
}

// (353:20) {#if cursorData.headwindComponent !== 0}
function create_if_block_17$1(ctx) {
	let t0;

	let t1_value = (/*cursorData*/ ctx[6].headwindComponent > 0
	? 'HW'
	: 'TW') + "";

	let t1;
	let t2;
	let t3_value = Math.abs(/*cursorData*/ ctx[6].headwindComponent).toFixed(0) + "";
	let t3;
	let t4;

	return {
		c() {
			t0 = text("(");
			t1 = text(t1_value);
			t2 = space();
			t3 = text(t3_value);
			t4 = text("kt)");
		},
		m(target, anchor) {
			insert(target, t0, anchor);
			insert(target, t1, anchor);
			insert(target, t2, anchor);
			insert(target, t3, anchor);
			insert(target, t4, anchor);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*cursorData*/ 64 && t1_value !== (t1_value = (/*cursorData*/ ctx[6].headwindComponent > 0
			? 'HW'
			: 'TW') + "")) set_data(t1, t1_value);

			if (dirty[0] & /*cursorData*/ 64 && t3_value !== (t3_value = Math.abs(/*cursorData*/ ctx[6].headwindComponent).toFixed(0) + "")) set_data(t3, t3_value);
		},
		d(detaching) {
			if (detaching) {
				detach(t0);
				detach(t1);
				detach(t2);
				detach(t3);
				detach(t4);
			}
		}
	};
}

// (361:16) {:else}
function create_else_block_3$1(ctx) {
	let t;

	return {
		c() {
			t = text("| Cloud: --");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		p: noop,
		d(detaching) {
			if (detaching) {
				detach(t);
			}
		}
	};
}

// (359:16) {#if cursorData?.cloudBase !== undefined}
function create_if_block_15$1(ctx) {
	let t0;
	let t1_value = Math.round(/*cursorData*/ ctx[6].cloudBase) + "";
	let t1;
	let t2;
	let t3_value = Math.round(/*cursorData*/ ctx[6].cloudTop || 0) + "";
	let t3;
	let t4;

	return {
		c() {
			t0 = text("| Cloud: ");
			t1 = text(t1_value);
			t2 = text("-");
			t3 = text(t3_value);
			t4 = text("ft");
		},
		m(target, anchor) {
			insert(target, t0, anchor);
			insert(target, t1, anchor);
			insert(target, t2, anchor);
			insert(target, t3, anchor);
			insert(target, t4, anchor);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*cursorData*/ 64 && t1_value !== (t1_value = Math.round(/*cursorData*/ ctx[6].cloudBase) + "")) set_data(t1, t1_value);
			if (dirty[0] & /*cursorData*/ 64 && t3_value !== (t3_value = Math.round(/*cursorData*/ ctx[6].cloudTop || 0) + "")) set_data(t3, t3_value);
		},
		d(detaching) {
			if (detaching) {
				detach(t0);
				detach(t1);
				detach(t2);
				detach(t3);
				detach(t4);
			}
		}
	};
}

// (368:16) {:else}
function create_else_block_2$1(ctx) {
	let t;

	return {
		c() {
			t = text("Conditions: --");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		p: noop,
		d(detaching) {
			if (detaching) {
				detach(t);
			}
		}
	};
}

// (366:16) {#if cursorData?.condition}
function create_if_block_14$1(ctx) {
	let t0;
	let t1_value = /*cursorData*/ ctx[6].condition.toUpperCase() + "";
	let t1;

	return {
		c() {
			t0 = text("Conditions: ");
			t1 = text(t1_value);
		},
		m(target, anchor) {
			insert(target, t0, anchor);
			insert(target, t1, anchor);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*cursorData*/ 64 && t1_value !== (t1_value = /*cursorData*/ ctx[6].condition.toUpperCase() + "")) set_data(t1, t1_value);
		},
		d(detaching) {
			if (detaching) {
				detach(t0);
				detach(t1);
			}
		}
	};
}

// (385:16) {:else}
function create_else_block_1$1(ctx) {
	let span;

	return {
		c() {
			span = element("span");
			span.textContent = "No data";
			attr(span, "class", "wind-level-empty svelte-tougy9");
		},
		m(target, anchor) {
			insert(target, span, anchor);
		},
		p: noop,
		d(detaching) {
			if (detaching) {
				detach(span);
			}
		}
	};
}

// (377:16) {#if cursorData?.verticalWinds && cursorData.verticalWinds.length > 0}
function create_if_block_13$1(ctx) {
	let each_1_anchor;
	let each_value_9 = ensure_array_like(/*filteredWinds*/ ctx[59].slice(0, 4));
	let each_blocks = [];

	for (let i = 0; i < each_value_9.length; i += 1) {
		each_blocks[i] = create_each_block_9(get_each_context_9(ctx, each_value_9, i));
	}

	return {
		c() {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each_1_anchor = empty();
		},
		m(target, anchor) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(target, anchor);
				}
			}

			insert(target, each_1_anchor, anchor);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*cursorData, maxAltitude*/ 66) {
				each_value_9 = ensure_array_like(/*filteredWinds*/ ctx[59].slice(0, 4));
				let i;

				for (i = 0; i < each_value_9.length; i += 1) {
					const child_ctx = get_each_context_9(ctx, each_value_9, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block_9(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value_9.length;
			}
		},
		d(detaching) {
			if (detaching) {
				detach(each_1_anchor);
			}

			destroy_each(each_blocks, detaching);
		}
	};
}

// (379:20) {#each filteredWinds.slice(0, 4) as wind}
function create_each_block_9(ctx) {
	let span;
	let t0_value = Math.round(/*wind*/ ctx[36].altitudeFeet / 1000) + "";
	let t0;
	let t1;
	let t2_value = String(Math.round(/*wind*/ ctx[36].windDir)).padStart(3, '0') + "";
	let t2;
	let t3;
	let t4_value = Math.round(/*wind*/ ctx[36].windSpeed) + "";
	let t4;
	let t5;

	return {
		c() {
			span = element("span");
			t0 = text(t0_value);
			t1 = text("k:");
			t2 = text(t2_value);
			t3 = text("°/");
			t4 = text(t4_value);
			t5 = text("kt\n                        ");
			attr(span, "class", "wind-level svelte-tougy9");
			toggle_class(span, "flight-level", /*isFlightLevel*/ ctx[60]);
		},
		m(target, anchor) {
			insert(target, span, anchor);
			append(span, t0);
			append(span, t1);
			append(span, t2);
			append(span, t3);
			append(span, t4);
			append(span, t5);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*cursorData, maxAltitude*/ 66 && t0_value !== (t0_value = Math.round(/*wind*/ ctx[36].altitudeFeet / 1000) + "")) set_data(t0, t0_value);
			if (dirty[0] & /*cursorData, maxAltitude*/ 66 && t2_value !== (t2_value = String(Math.round(/*wind*/ ctx[36].windDir)).padStart(3, '0') + "")) set_data(t2, t2_value);
			if (dirty[0] & /*cursorData, maxAltitude*/ 66 && t4_value !== (t4_value = Math.round(/*wind*/ ctx[36].windSpeed) + "")) set_data(t4, t4_value);

			if (dirty[0] & /*cursorData, maxAltitude*/ 66) {
				toggle_class(span, "flight-level", /*isFlightLevel*/ ctx[60]);
			}
		},
		d(detaching) {
			if (detaching) {
				detach(span);
			}
		}
	};
}

// (390:16) {#if cursorData?.verticalWinds && cursorData.verticalWinds.length > 0}
function create_if_block_11$1(ctx) {
	let if_block_anchor;
	let if_block = /*filteredWinds*/ ctx[59].length > 4 && create_if_block_12$1(ctx);

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},
		p(ctx, dirty) {
			if (/*filteredWinds*/ ctx[59].length > 4) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block_12$1(ctx);
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		d(detaching) {
			if (detaching) {
				detach(if_block_anchor);
			}

			if (if_block) if_block.d(detaching);
		}
	};
}

// (392:20) {#if filteredWinds.length > 4}
function create_if_block_12$1(ctx) {
	let each_1_anchor;
	let each_value_8 = ensure_array_like(/*filteredWinds*/ ctx[59].slice(4, 8));
	let each_blocks = [];

	for (let i = 0; i < each_value_8.length; i += 1) {
		each_blocks[i] = create_each_block_8(get_each_context_8(ctx, each_value_8, i));
	}

	return {
		c() {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each_1_anchor = empty();
		},
		m(target, anchor) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(target, anchor);
				}
			}

			insert(target, each_1_anchor, anchor);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*cursorData, maxAltitude*/ 66) {
				each_value_8 = ensure_array_like(/*filteredWinds*/ ctx[59].slice(4, 8));
				let i;

				for (i = 0; i < each_value_8.length; i += 1) {
					const child_ctx = get_each_context_8(ctx, each_value_8, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block_8(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value_8.length;
			}
		},
		d(detaching) {
			if (detaching) {
				detach(each_1_anchor);
			}

			destroy_each(each_blocks, detaching);
		}
	};
}

// (393:24) {#each filteredWinds.slice(4, 8) as wind}
function create_each_block_8(ctx) {
	let span;
	let t0_value = Math.round(/*wind*/ ctx[36].altitudeFeet / 1000) + "";
	let t0;
	let t1;
	let t2_value = String(Math.round(/*wind*/ ctx[36].windDir)).padStart(3, '0') + "";
	let t2;
	let t3;
	let t4_value = Math.round(/*wind*/ ctx[36].windSpeed) + "";
	let t4;
	let t5;

	return {
		c() {
			span = element("span");
			t0 = text(t0_value);
			t1 = text("k:");
			t2 = text(t2_value);
			t3 = text("°/");
			t4 = text(t4_value);
			t5 = text("kt\n                            ");
			attr(span, "class", "wind-level svelte-tougy9");
			toggle_class(span, "flight-level", /*isFlightLevel*/ ctx[60]);
		},
		m(target, anchor) {
			insert(target, span, anchor);
			append(span, t0);
			append(span, t1);
			append(span, t2);
			append(span, t3);
			append(span, t4);
			append(span, t5);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*cursorData, maxAltitude*/ 66 && t0_value !== (t0_value = Math.round(/*wind*/ ctx[36].altitudeFeet / 1000) + "")) set_data(t0, t0_value);
			if (dirty[0] & /*cursorData, maxAltitude*/ 66 && t2_value !== (t2_value = String(Math.round(/*wind*/ ctx[36].windDir)).padStart(3, '0') + "")) set_data(t2, t2_value);
			if (dirty[0] & /*cursorData, maxAltitude*/ 66 && t4_value !== (t4_value = Math.round(/*wind*/ ctx[36].windSpeed) + "")) set_data(t4, t4_value);

			if (dirty[0] & /*cursorData, maxAltitude*/ 66) {
				toggle_class(span, "flight-level", /*isFlightLevel*/ ctx[60]);
			}
		},
		d(detaching) {
			if (detaching) {
				detach(span);
			}
		}
	};
}

// (428:12) {#each altitudeGridLines as line}
function create_each_block_7(ctx) {
	let line_1;
	let line_1_y__value;
	let line_1_x__value_1;
	let line_1_y__value_1;
	let text_1;
	let t_value = /*line*/ ctx[54].label + "";
	let t;
	let text_1_y_value;

	return {
		c() {
			line_1 = svg_element("line");
			text_1 = svg_element("text");
			t = text(t_value);
			attr(line_1, "x1", /*graphPadding*/ ctx[12].left);
			attr(line_1, "y1", line_1_y__value = /*line*/ ctx[54].y);
			attr(line_1, "x2", line_1_x__value_1 = /*graphWidth*/ ctx[3] - /*graphPadding*/ ctx[12].right);
			attr(line_1, "y2", line_1_y__value_1 = /*line*/ ctx[54].y);
			attr(line_1, "stroke", "rgba(255, 255, 255, 0.1)");
			attr(line_1, "stroke-width", "1");
			attr(text_1, "x", /*graphPadding*/ ctx[12].left - 10);
			attr(text_1, "y", text_1_y_value = /*line*/ ctx[54].y + 4);
			attr(text_1, "fill", "rgba(255, 255, 255, 0.6)");
			attr(text_1, "font-size", "10");
			attr(text_1, "text-anchor", "end");
		},
		m(target, anchor) {
			insert(target, line_1, anchor);
			insert(target, text_1, anchor);
			append(text_1, t);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*altitudeGridLines*/ 512 && line_1_y__value !== (line_1_y__value = /*line*/ ctx[54].y)) {
				attr(line_1, "y1", line_1_y__value);
			}

			if (dirty[0] & /*graphWidth*/ 8 && line_1_x__value_1 !== (line_1_x__value_1 = /*graphWidth*/ ctx[3] - /*graphPadding*/ ctx[12].right)) {
				attr(line_1, "x2", line_1_x__value_1);
			}

			if (dirty[0] & /*altitudeGridLines*/ 512 && line_1_y__value_1 !== (line_1_y__value_1 = /*line*/ ctx[54].y)) {
				attr(line_1, "y2", line_1_y__value_1);
			}

			if (dirty[0] & /*altitudeGridLines*/ 512 && t_value !== (t_value = /*line*/ ctx[54].label + "")) set_data(t, t_value);

			if (dirty[0] & /*altitudeGridLines*/ 512 && text_1_y_value !== (text_1_y_value = /*line*/ ctx[54].y + 4)) {
				attr(text_1, "y", text_1_y_value);
			}
		},
		d(detaching) {
			if (detaching) {
				detach(line_1);
				detach(text_1);
			}
		}
	};
}

// (446:12) {#each distanceGridLines as line}
function create_each_block_6(ctx) {
	let line_1;
	let line_1_x__value;
	let line_1_x__value_1;
	let text_1;
	let t_value = /*line*/ ctx[54].label + "";
	let t;
	let text_1_x_value;

	return {
		c() {
			line_1 = svg_element("line");
			text_1 = svg_element("text");
			t = text(t_value);
			attr(line_1, "x1", line_1_x__value = /*line*/ ctx[54].x);
			attr(line_1, "y1", /*graphPadding*/ ctx[12].top);
			attr(line_1, "x2", line_1_x__value_1 = /*line*/ ctx[54].x);
			attr(line_1, "y2", graphHeight - /*graphPadding*/ ctx[12].bottom);
			attr(line_1, "stroke", "rgba(255, 255, 255, 0.1)");
			attr(line_1, "stroke-width", "1");
			attr(text_1, "x", text_1_x_value = /*line*/ ctx[54].x);
			attr(text_1, "y", graphHeight - /*graphPadding*/ ctx[12].bottom + 20);
			attr(text_1, "fill", "rgba(255, 255, 255, 0.6)");
			attr(text_1, "font-size", "10");
			attr(text_1, "text-anchor", "middle");
		},
		m(target, anchor) {
			insert(target, line_1, anchor);
			insert(target, text_1, anchor);
			append(text_1, t);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*distanceGridLines*/ 256 && line_1_x__value !== (line_1_x__value = /*line*/ ctx[54].x)) {
				attr(line_1, "x1", line_1_x__value);
			}

			if (dirty[0] & /*distanceGridLines*/ 256 && line_1_x__value_1 !== (line_1_x__value_1 = /*line*/ ctx[54].x)) {
				attr(line_1, "x2", line_1_x__value_1);
			}

			if (dirty[0] & /*distanceGridLines*/ 256 && t_value !== (t_value = /*line*/ ctx[54].label + "")) set_data(t, t_value);

			if (dirty[0] & /*distanceGridLines*/ 256 && text_1_x_value !== (text_1_x_value = /*line*/ ctx[54].x)) {
				attr(text_1, "x", text_1_x_value);
			}
		},
		d(detaching) {
			if (detaching) {
				detach(line_1);
				detach(text_1);
			}
		}
	};
}

// (466:16) {#if index < waypointProfileData.length - 1}
function create_if_block_8$1(ctx) {
	let if_block_anchor;
	let if_block = /*point*/ ctx[30].cloudBase !== undefined && /*point*/ ctx[30].cloudTop !== undefined && /*point*/ ctx[30].cloudBase > 0 && /*point*/ ctx[30].cloudTop > 0 && create_if_block_9$1(get_if_ctx_2(ctx));

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},
		p(ctx, dirty) {
			if (/*point*/ ctx[30].cloudBase !== undefined && /*point*/ ctx[30].cloudTop !== undefined && /*point*/ ctx[30].cloudBase > 0 && /*point*/ ctx[30].cloudTop > 0) {
				if (if_block) {
					if_block.p(get_if_ctx_2(ctx), dirty);
				} else {
					if_block = create_if_block_9$1(get_if_ctx_2(ctx));
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		d(detaching) {
			if (detaching) {
				detach(if_block_anchor);
			}

			if (if_block) if_block.d(detaching);
		}
	};
}

// (468:20) {#if point.cloudBase !== undefined && point.cloudTop !== undefined && point.cloudBase > 0 && point.cloudTop > 0}
function create_if_block_9$1(ctx) {
	let if_block_anchor;
	let if_block = /*cloudHeight*/ ctx[52] > 0 && /*point*/ ctx[30].cloudTop <= /*maxAltitude*/ ctx[1] && create_if_block_10$1(ctx);

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},
		p(ctx, dirty) {
			if (/*cloudHeight*/ ctx[52] > 0 && /*point*/ ctx[30].cloudTop <= /*maxAltitude*/ ctx[1]) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block_10$1(ctx);
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		d(detaching) {
			if (detaching) {
				detach(if_block_anchor);
			}

			if (if_block) if_block.d(detaching);
		}
	};
}

// (473:24) {#if cloudHeight > 0 && point.cloudTop <= maxAltitude}
function create_if_block_10$1(ctx) {
	let rect;
	let rect_x_value;
	let rect_y_value;
	let rect_width_value;
	let rect_height_value;

	return {
		c() {
			rect = svg_element("rect");
			attr(rect, "x", rect_x_value = /*distanceToX*/ ctx[13](/*point*/ ctx[30].distance));
			attr(rect, "y", rect_y_value = /*cloudY*/ ctx[53]);
			attr(rect, "width", rect_width_value = Math.max(1, /*distanceToX*/ ctx[13](/*nextPoint*/ ctx[47].distance) - /*distanceToX*/ ctx[13](/*point*/ ctx[30].distance)));
			attr(rect, "height", rect_height_value = /*cloudHeight*/ ctx[52]);
			attr(rect, "fill", "rgba(100, 150, 200, 0.4)");
			attr(rect, "stroke", "rgba(100, 150, 200, 0.6)");
			attr(rect, "stroke-width", "1");
		},
		m(target, anchor) {
			insert(target, rect, anchor);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*waypointProfileData*/ 2048 && rect_x_value !== (rect_x_value = /*distanceToX*/ ctx[13](/*point*/ ctx[30].distance))) {
				attr(rect, "x", rect_x_value);
			}

			if (dirty[0] & /*waypointProfileData*/ 2048 && rect_y_value !== (rect_y_value = /*cloudY*/ ctx[53])) {
				attr(rect, "y", rect_y_value);
			}

			if (dirty[0] & /*waypointProfileData*/ 2048 && rect_width_value !== (rect_width_value = Math.max(1, /*distanceToX*/ ctx[13](/*nextPoint*/ ctx[47].distance) - /*distanceToX*/ ctx[13](/*point*/ ctx[30].distance)))) {
				attr(rect, "width", rect_width_value);
			}

			if (dirty[0] & /*waypointProfileData*/ 2048 && rect_height_value !== (rect_height_value = /*cloudHeight*/ ctx[52])) {
				attr(rect, "height", rect_height_value);
			}
		},
		d(detaching) {
			if (detaching) {
				detach(rect);
			}
		}
	};
}

// (465:12) {#each waypointProfileData as point, index}
function create_each_block_5(ctx) {
	let if_block_anchor;
	let if_block = /*index*/ ctx[46] < /*waypointProfileData*/ ctx[11].length - 1 && create_if_block_8$1(get_if_ctx_3(ctx));

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},
		p(ctx, dirty) {
			if (/*index*/ ctx[46] < /*waypointProfileData*/ ctx[11].length - 1) {
				if (if_block) {
					if_block.p(get_if_ctx_3(ctx), dirty);
				} else {
					if_block = create_if_block_8$1(get_if_ctx_3(ctx));
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		d(detaching) {
			if (detaching) {
				detach(if_block_anchor);
			}

			if (if_block) if_block.d(detaching);
		}
	};
}

// (489:12) {#if terrainPath}
function create_if_block_7$1(ctx) {
	let polygon;

	return {
		c() {
			polygon = svg_element("polygon");
			attr(polygon, "points", /*terrainPath*/ ctx[7]);
			attr(polygon, "fill", "url(#terrainGradient)");
			attr(polygon, "stroke", "#8b6914");
			attr(polygon, "stroke-width", "2.5");
			attr(polygon, "opacity", "1");
		},
		m(target, anchor) {
			insert(target, polygon, anchor);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*terrainPath*/ 128) {
				attr(polygon, "points", /*terrainPath*/ ctx[7]);
			}
		},
		d(detaching) {
			if (detaching) {
				detach(polygon);
			}
		}
	};
}

// (501:16) {#if index < waypointProfileData.length - 1}
function create_if_block_6$1(ctx) {
	let line_1;
	let line_1_x__value;
	let line_1_y__value;
	let line_1_x__value_1;
	let line_1_y__value_1;
	let line_1_stroke_value;

	return {
		c() {
			line_1 = svg_element("line");
			attr(line_1, "x1", line_1_x__value = /*distanceToX*/ ctx[13](/*point*/ ctx[30].distance));
			attr(line_1, "y1", line_1_y__value = /*altitudeToY*/ ctx[14](/*point*/ ctx[30].altitude));
			attr(line_1, "x2", line_1_x__value_1 = /*distanceToX*/ ctx[13](/*nextPoint*/ ctx[47].distance));
			attr(line_1, "y2", line_1_y__value_1 = /*altitudeToY*/ ctx[14](/*nextPoint*/ ctx[47].altitude));
			attr(line_1, "stroke", line_1_stroke_value = /*segmentColor*/ ctx[48]);
			attr(line_1, "stroke-width", "3");
			attr(line_1, "stroke-linecap", "round");
		},
		m(target, anchor) {
			insert(target, line_1, anchor);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*waypointProfileData*/ 2048 && line_1_x__value !== (line_1_x__value = /*distanceToX*/ ctx[13](/*point*/ ctx[30].distance))) {
				attr(line_1, "x1", line_1_x__value);
			}

			if (dirty[0] & /*waypointProfileData*/ 2048 && line_1_y__value !== (line_1_y__value = /*altitudeToY*/ ctx[14](/*point*/ ctx[30].altitude))) {
				attr(line_1, "y1", line_1_y__value);
			}

			if (dirty[0] & /*waypointProfileData*/ 2048 && line_1_x__value_1 !== (line_1_x__value_1 = /*distanceToX*/ ctx[13](/*nextPoint*/ ctx[47].distance))) {
				attr(line_1, "x2", line_1_x__value_1);
			}

			if (dirty[0] & /*waypointProfileData*/ 2048 && line_1_y__value_1 !== (line_1_y__value_1 = /*altitudeToY*/ ctx[14](/*nextPoint*/ ctx[47].altitude))) {
				attr(line_1, "y2", line_1_y__value_1);
			}

			if (dirty[0] & /*waypointProfileData*/ 2048 && line_1_stroke_value !== (line_1_stroke_value = /*segmentColor*/ ctx[48])) {
				attr(line_1, "stroke", line_1_stroke_value);
			}
		},
		d(detaching) {
			if (detaching) {
				detach(line_1);
			}
		}
	};
}

// (500:12) {#each waypointProfileData as point, index}
function create_each_block_4(ctx) {
	let if_block_anchor;
	let if_block = /*index*/ ctx[46] < /*waypointProfileData*/ ctx[11].length - 1 && create_if_block_6$1(get_if_ctx_1(ctx));

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},
		p(ctx, dirty) {
			if (/*index*/ ctx[46] < /*waypointProfileData*/ ctx[11].length - 1) {
				if (if_block) {
					if_block.p(get_if_ctx_1(ctx), dirty);
				} else {
					if_block = create_if_block_6$1(get_if_ctx_1(ctx));
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		d(detaching) {
			if (detaching) {
				detach(if_block_anchor);
			}

			if (if_block) if_block.d(detaching);
		}
	};
}

// (518:16) {#if point.verticalWinds && point.verticalWinds.length > 0}
function create_if_block_4$1(ctx) {
	let each_1_anchor;
	let each_value_2 = ensure_array_like(/*point*/ ctx[30].verticalWinds.filter(/*func_7*/ ctx[24]));
	let each_blocks = [];

	for (let i = 0; i < each_value_2.length; i += 1) {
		each_blocks[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
	}

	return {
		c() {
			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each_1_anchor = empty();
		},
		m(target, anchor) {
			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(target, anchor);
				}
			}

			insert(target, each_1_anchor, anchor);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*distanceToX, waypointProfileData, altitudeToY, maxAltitude*/ 26626) {
				each_value_2 = ensure_array_like(/*point*/ ctx[30].verticalWinds.filter(/*func_7*/ ctx[24]));
				let i;

				for (i = 0; i < each_value_2.length; i += 1) {
					const child_ctx = get_each_context_2(ctx, each_value_2, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block_2(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value_2.length;
			}
		},
		d(detaching) {
			if (detaching) {
				detach(each_1_anchor);
			}

			destroy_each(each_blocks, detaching);
		}
	};
}

// (527:24) {#if windBarb.staff}
function create_if_block_5$1(ctx) {
	let path;
	let path_d_value;
	let path_stroke_value;

	return {
		c() {
			path = svg_element("path");
			attr(path, "d", path_d_value = /*windBarb*/ ctx[39].staff);
			attr(path, "stroke", path_stroke_value = /*color*/ ctx[38]);
			attr(path, "stroke-width", "1.5");
			attr(path, "fill", "none");
		},
		m(target, anchor) {
			insert(target, path, anchor);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*waypointProfileData, maxAltitude*/ 2050 && path_d_value !== (path_d_value = /*windBarb*/ ctx[39].staff)) {
				attr(path, "d", path_d_value);
			}

			if (dirty[0] & /*waypointProfileData, maxAltitude*/ 2050 && path_stroke_value !== (path_stroke_value = /*color*/ ctx[38])) {
				attr(path, "stroke", path_stroke_value);
			}
		},
		d(detaching) {
			if (detaching) {
				detach(path);
			}
		}
	};
}

// (537:24) {#each windBarb.barbs as barb}
function create_each_block_3(ctx) {
	let path;
	let path_d_value;
	let path_stroke_value;
	let path_fill_value;

	return {
		c() {
			path = svg_element("path");
			attr(path, "d", path_d_value = /*barb*/ ctx[42].path);
			attr(path, "stroke", path_stroke_value = /*color*/ ctx[38]);
			attr(path, "stroke-width", "1.5");

			attr(path, "fill", path_fill_value = /*barb*/ ctx[42].type === 'triangle'
			? /*color*/ ctx[38]
			: 'none');

			attr(path, "stroke-linejoin", "miter");
		},
		m(target, anchor) {
			insert(target, path, anchor);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*waypointProfileData, maxAltitude*/ 2050 && path_d_value !== (path_d_value = /*barb*/ ctx[42].path)) {
				attr(path, "d", path_d_value);
			}

			if (dirty[0] & /*waypointProfileData, maxAltitude*/ 2050 && path_stroke_value !== (path_stroke_value = /*color*/ ctx[38])) {
				attr(path, "stroke", path_stroke_value);
			}

			if (dirty[0] & /*waypointProfileData, maxAltitude*/ 2050 && path_fill_value !== (path_fill_value = /*barb*/ ctx[42].type === 'triangle'
			? /*color*/ ctx[38]
			: 'none')) {
				attr(path, "fill", path_fill_value);
			}
		},
		d(detaching) {
			if (detaching) {
				detach(path);
			}
		}
	};
}

// (521:20) {#each point.verticalWinds.filter(w => w.altitudeFeet <= maxAltitude && w.windSpeed >= 3) as wind}
function create_each_block_2(ctx) {
	let if_block_anchor;
	let circle;
	let circle_cx_value;
	let circle_cy_value;
	let circle_fill_value;
	let if_block = /*windBarb*/ ctx[39].staff && create_if_block_5$1(ctx);
	let each_value_3 = ensure_array_like(/*windBarb*/ ctx[39].barbs);
	let each_blocks = [];

	for (let i = 0; i < each_value_3.length; i += 1) {
		each_blocks[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
	}

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			circle = svg_element("circle");
			attr(circle, "cx", circle_cx_value = /*x*/ ctx[35]);
			attr(circle, "cy", circle_cy_value = /*y*/ ctx[37]);
			attr(circle, "r", "2");
			attr(circle, "fill", circle_fill_value = /*color*/ ctx[38]);
		},
		m(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(target, anchor);
				}
			}

			insert(target, circle, anchor);
		},
		p(ctx, dirty) {
			if (/*windBarb*/ ctx[39].staff) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block_5$1(ctx);
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}

			if (dirty[0] & /*distanceToX, waypointProfileData, altitudeToY, maxAltitude*/ 26626) {
				each_value_3 = ensure_array_like(/*windBarb*/ ctx[39].barbs);
				let i;

				for (i = 0; i < each_value_3.length; i += 1) {
					const child_ctx = get_each_context_3(ctx, each_value_3, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block_3(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(circle.parentNode, circle);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value_3.length;
			}

			if (dirty[0] & /*waypointProfileData*/ 2048 && circle_cx_value !== (circle_cx_value = /*x*/ ctx[35])) {
				attr(circle, "cx", circle_cx_value);
			}

			if (dirty[0] & /*waypointProfileData, maxAltitude*/ 2050 && circle_cy_value !== (circle_cy_value = /*y*/ ctx[37])) {
				attr(circle, "cy", circle_cy_value);
			}

			if (dirty[0] & /*waypointProfileData, maxAltitude*/ 2050 && circle_fill_value !== (circle_fill_value = /*color*/ ctx[38])) {
				attr(circle, "fill", circle_fill_value);
			}
		},
		d(detaching) {
			if (detaching) {
				detach(if_block_anchor);
				detach(circle);
			}

			if (if_block) if_block.d(detaching);
			destroy_each(each_blocks, detaching);
		}
	};
}

// (517:12) {#each waypointProfileData as point, pointIndex}
function create_each_block_1$1(ctx) {
	let if_block_anchor;
	let if_block = /*point*/ ctx[30].verticalWinds && /*point*/ ctx[30].verticalWinds.length > 0 && create_if_block_4$1(get_if_ctx(ctx));

	return {
		c() {
			if (if_block) if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},
		p(ctx, dirty) {
			if (/*point*/ ctx[30].verticalWinds && /*point*/ ctx[30].verticalWinds.length > 0) {
				if (if_block) {
					if_block.p(get_if_ctx(ctx), dirty);
				} else {
					if_block = create_if_block_4$1(get_if_ctx(ctx));
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		d(detaching) {
			if (detaching) {
				detach(if_block_anchor);
			}

			if (if_block) if_block.d(detaching);
		}
	};
}

// (579:16) {#if point.waypointName}
function create_if_block_3$1(ctx) {
	let text_1;
	let t_value = /*point*/ ctx[30].waypointName + "";
	let t;
	let text_1_x_value;
	let mounted;
	let dispose;

	function click_handler_1() {
		return /*click_handler_1*/ ctx[26](/*point*/ ctx[30]);
	}

	return {
		c() {
			text_1 = svg_element("text");
			t = text(t_value);
			attr(text_1, "x", text_1_x_value = /*distanceToX*/ ctx[13](/*point*/ ctx[30].distance));
			attr(text_1, "y", /*graphPadding*/ ctx[12].top - 5);
			attr(text_1, "fill", "rgba(255, 255, 255, 0.9)");
			attr(text_1, "font-size", "11");
			attr(text_1, "font-weight", "500");
			attr(text_1, "text-anchor", "middle");
			set_style(text_1, "cursor", "pointer");
		},
		m(target, anchor) {
			insert(target, text_1, anchor);
			append(text_1, t);

			if (!mounted) {
				dispose = listen(text_1, "click", click_handler_1);
				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;
			if (dirty[0] & /*waypointProfileData*/ 2048 && t_value !== (t_value = /*point*/ ctx[30].waypointName + "")) set_data(t, t_value);

			if (dirty[0] & /*waypointProfileData*/ 2048 && text_1_x_value !== (text_1_x_value = /*distanceToX*/ ctx[13](/*point*/ ctx[30].distance))) {
				attr(text_1, "x", text_1_x_value);
			}
		},
		d(detaching) {
			if (detaching) {
				detach(text_1);
			}

			mounted = false;
			dispose();
		}
	};
}

// (559:12) {#each waypointProfileData as point}
function create_each_block$1(ctx) {
	let line_1;
	let line_1_x__value;
	let line_1_x__value_1;
	let circle;
	let circle_cx_value;
	let circle_cy_value;
	let if_block_anchor;
	let mounted;
	let dispose;

	function click_handler() {
		return /*click_handler*/ ctx[25](/*point*/ ctx[30]);
	}

	let if_block = /*point*/ ctx[30].waypointName && create_if_block_3$1(ctx);

	return {
		c() {
			line_1 = svg_element("line");
			circle = svg_element("circle");
			if (if_block) if_block.c();
			if_block_anchor = empty();
			attr(line_1, "x1", line_1_x__value = /*distanceToX*/ ctx[13](/*point*/ ctx[30].distance));
			attr(line_1, "y1", /*graphPadding*/ ctx[12].top);
			attr(line_1, "x2", line_1_x__value_1 = /*distanceToX*/ ctx[13](/*point*/ ctx[30].distance));
			attr(line_1, "y2", graphHeight - /*graphPadding*/ ctx[12].bottom);
			attr(line_1, "stroke", "rgba(255, 255, 255, 0.3)");
			attr(line_1, "stroke-width", "1");
			attr(line_1, "stroke-dasharray", "2,2");
			attr(circle, "cx", circle_cx_value = /*distanceToX*/ ctx[13](/*point*/ ctx[30].distance));
			attr(circle, "cy", circle_cy_value = /*altitudeToY*/ ctx[14](/*point*/ ctx[30].altitude));
			attr(circle, "r", "5");
			attr(circle, "fill", "#ff00ff");
			attr(circle, "stroke", "white");
			attr(circle, "stroke-width", "2");
			set_style(circle, "cursor", "pointer");
		},
		m(target, anchor) {
			insert(target, line_1, anchor);
			insert(target, circle, anchor);
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);

			if (!mounted) {
				dispose = listen(circle, "click", click_handler);
				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;

			if (dirty[0] & /*waypointProfileData*/ 2048 && line_1_x__value !== (line_1_x__value = /*distanceToX*/ ctx[13](/*point*/ ctx[30].distance))) {
				attr(line_1, "x1", line_1_x__value);
			}

			if (dirty[0] & /*waypointProfileData*/ 2048 && line_1_x__value_1 !== (line_1_x__value_1 = /*distanceToX*/ ctx[13](/*point*/ ctx[30].distance))) {
				attr(line_1, "x2", line_1_x__value_1);
			}

			if (dirty[0] & /*waypointProfileData*/ 2048 && circle_cx_value !== (circle_cx_value = /*distanceToX*/ ctx[13](/*point*/ ctx[30].distance))) {
				attr(circle, "cx", circle_cx_value);
			}

			if (dirty[0] & /*waypointProfileData*/ 2048 && circle_cy_value !== (circle_cy_value = /*altitudeToY*/ ctx[14](/*point*/ ctx[30].altitude))) {
				attr(circle, "cy", circle_cy_value);
			}

			if (/*point*/ ctx[30].waypointName) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block_3$1(ctx);
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		d(detaching) {
			if (detaching) {
				detach(line_1);
				detach(circle);
				detach(if_block_anchor);
			}

			if (if_block) if_block.d(detaching);
			mounted = false;
			dispose();
		}
	};
}

// (594:12) {#if cursorDistance !== null}
function create_if_block_1$1(ctx) {
	let line_1;
	let line_1_x__value;
	let line_1_x__value_1;
	let if_block_anchor;
	let if_block = /*cursorData*/ ctx[6] && create_if_block_2$1(ctx);

	return {
		c() {
			line_1 = svg_element("line");
			if (if_block) if_block.c();
			if_block_anchor = empty();
			attr(line_1, "x1", line_1_x__value = /*distanceToX*/ ctx[13](/*cursorDistance*/ ctx[5]));
			attr(line_1, "y1", /*graphPadding*/ ctx[12].top);
			attr(line_1, "x2", line_1_x__value_1 = /*distanceToX*/ ctx[13](/*cursorDistance*/ ctx[5]));
			attr(line_1, "y2", graphHeight - /*graphPadding*/ ctx[12].bottom);
			attr(line_1, "stroke", "rgba(255, 255, 255, 0.5)");
			attr(line_1, "stroke-width", "1");
			attr(line_1, "stroke-dasharray", "4,4");
		},
		m(target, anchor) {
			insert(target, line_1, anchor);
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*cursorDistance*/ 32 && line_1_x__value !== (line_1_x__value = /*distanceToX*/ ctx[13](/*cursorDistance*/ ctx[5]))) {
				attr(line_1, "x1", line_1_x__value);
			}

			if (dirty[0] & /*cursorDistance*/ 32 && line_1_x__value_1 !== (line_1_x__value_1 = /*distanceToX*/ ctx[13](/*cursorDistance*/ ctx[5]))) {
				attr(line_1, "x2", line_1_x__value_1);
			}

			if (/*cursorData*/ ctx[6]) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block_2$1(ctx);
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		d(detaching) {
			if (detaching) {
				detach(line_1);
				detach(if_block_anchor);
			}

			if (if_block) if_block.d(detaching);
		}
	};
}

// (604:16) {#if cursorData}
function create_if_block_2$1(ctx) {
	let circle;
	let circle_cx_value;
	let circle_cy_value;

	return {
		c() {
			circle = svg_element("circle");
			attr(circle, "cx", circle_cx_value = /*distanceToX*/ ctx[13](/*cursorDistance*/ ctx[5]));
			attr(circle, "cy", circle_cy_value = /*altitudeToY*/ ctx[14](/*cursorData*/ ctx[6].altitude));
			attr(circle, "r", "6");
			attr(circle, "fill", "white");
			attr(circle, "stroke", "#3498db");
			attr(circle, "stroke-width", "2");
		},
		m(target, anchor) {
			insert(target, circle, anchor);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*cursorDistance*/ 32 && circle_cx_value !== (circle_cx_value = /*distanceToX*/ ctx[13](/*cursorDistance*/ ctx[5]))) {
				attr(circle, "cx", circle_cx_value);
			}

			if (dirty[0] & /*cursorData*/ 64 && circle_cy_value !== (circle_cy_value = /*altitudeToY*/ ctx[14](/*cursorData*/ ctx[6].altitude))) {
				attr(circle, "cy", circle_cy_value);
			}
		},
		d(detaching) {
			if (detaching) {
				detach(circle);
			}
		}
	};
}

// (426:12) {#key scaleKey}
function create_key_block(ctx) {
	let each0_anchor;
	let each1_anchor;
	let each2_anchor;
	let if_block0_anchor;
	let each3_anchor;
	let each4_anchor;
	let each5_anchor;
	let if_block1_anchor;
	let each_value_7 = ensure_array_like(/*altitudeGridLines*/ ctx[9]);
	let each_blocks_5 = [];

	for (let i = 0; i < each_value_7.length; i += 1) {
		each_blocks_5[i] = create_each_block_7(get_each_context_7(ctx, each_value_7, i));
	}

	let each_value_6 = ensure_array_like(/*distanceGridLines*/ ctx[8]);
	let each_blocks_4 = [];

	for (let i = 0; i < each_value_6.length; i += 1) {
		each_blocks_4[i] = create_each_block_6(get_each_context_6(ctx, each_value_6, i));
	}

	let each_value_5 = ensure_array_like(/*waypointProfileData*/ ctx[11]);
	let each_blocks_3 = [];

	for (let i = 0; i < each_value_5.length; i += 1) {
		each_blocks_3[i] = create_each_block_5(get_each_context_5(ctx, each_value_5, i));
	}

	let if_block0 = /*terrainPath*/ ctx[7] && create_if_block_7$1(ctx);
	let each_value_4 = ensure_array_like(/*waypointProfileData*/ ctx[11]);
	let each_blocks_2 = [];

	for (let i = 0; i < each_value_4.length; i += 1) {
		each_blocks_2[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
	}

	let each_value_1 = ensure_array_like(/*waypointProfileData*/ ctx[11]);
	let each_blocks_1 = [];

	for (let i = 0; i < each_value_1.length; i += 1) {
		each_blocks_1[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
	}

	let each_value = ensure_array_like(/*waypointProfileData*/ ctx[11]);
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
	}

	let if_block1 = /*cursorDistance*/ ctx[5] !== null && create_if_block_1$1(ctx);

	return {
		c() {
			for (let i = 0; i < each_blocks_5.length; i += 1) {
				each_blocks_5[i].c();
			}

			each0_anchor = empty();

			for (let i = 0; i < each_blocks_4.length; i += 1) {
				each_blocks_4[i].c();
			}

			each1_anchor = empty();

			for (let i = 0; i < each_blocks_3.length; i += 1) {
				each_blocks_3[i].c();
			}

			each2_anchor = empty();
			if (if_block0) if_block0.c();
			if_block0_anchor = empty();

			for (let i = 0; i < each_blocks_2.length; i += 1) {
				each_blocks_2[i].c();
			}

			each3_anchor = empty();

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				each_blocks_1[i].c();
			}

			each4_anchor = empty();

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			each5_anchor = empty();
			if (if_block1) if_block1.c();
			if_block1_anchor = empty();
		},
		m(target, anchor) {
			for (let i = 0; i < each_blocks_5.length; i += 1) {
				if (each_blocks_5[i]) {
					each_blocks_5[i].m(target, anchor);
				}
			}

			insert(target, each0_anchor, anchor);

			for (let i = 0; i < each_blocks_4.length; i += 1) {
				if (each_blocks_4[i]) {
					each_blocks_4[i].m(target, anchor);
				}
			}

			insert(target, each1_anchor, anchor);

			for (let i = 0; i < each_blocks_3.length; i += 1) {
				if (each_blocks_3[i]) {
					each_blocks_3[i].m(target, anchor);
				}
			}

			insert(target, each2_anchor, anchor);
			if (if_block0) if_block0.m(target, anchor);
			insert(target, if_block0_anchor, anchor);

			for (let i = 0; i < each_blocks_2.length; i += 1) {
				if (each_blocks_2[i]) {
					each_blocks_2[i].m(target, anchor);
				}
			}

			insert(target, each3_anchor, anchor);

			for (let i = 0; i < each_blocks_1.length; i += 1) {
				if (each_blocks_1[i]) {
					each_blocks_1[i].m(target, anchor);
				}
			}

			insert(target, each4_anchor, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(target, anchor);
				}
			}

			insert(target, each5_anchor, anchor);
			if (if_block1) if_block1.m(target, anchor);
			insert(target, if_block1_anchor, anchor);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*graphPadding, altitudeGridLines, graphWidth*/ 4616) {
				each_value_7 = ensure_array_like(/*altitudeGridLines*/ ctx[9]);
				let i;

				for (i = 0; i < each_value_7.length; i += 1) {
					const child_ctx = get_each_context_7(ctx, each_value_7, i);

					if (each_blocks_5[i]) {
						each_blocks_5[i].p(child_ctx, dirty);
					} else {
						each_blocks_5[i] = create_each_block_7(child_ctx);
						each_blocks_5[i].c();
						each_blocks_5[i].m(each0_anchor.parentNode, each0_anchor);
					}
				}

				for (; i < each_blocks_5.length; i += 1) {
					each_blocks_5[i].d(1);
				}

				each_blocks_5.length = each_value_7.length;
			}

			if (dirty[0] & /*distanceGridLines, graphPadding*/ 4352) {
				each_value_6 = ensure_array_like(/*distanceGridLines*/ ctx[8]);
				let i;

				for (i = 0; i < each_value_6.length; i += 1) {
					const child_ctx = get_each_context_6(ctx, each_value_6, i);

					if (each_blocks_4[i]) {
						each_blocks_4[i].p(child_ctx, dirty);
					} else {
						each_blocks_4[i] = create_each_block_6(child_ctx);
						each_blocks_4[i].c();
						each_blocks_4[i].m(each1_anchor.parentNode, each1_anchor);
					}
				}

				for (; i < each_blocks_4.length; i += 1) {
					each_blocks_4[i].d(1);
				}

				each_blocks_4.length = each_value_6.length;
			}

			if (dirty[0] & /*distanceToX, waypointProfileData, altitudeToY, maxAltitude*/ 26626) {
				each_value_5 = ensure_array_like(/*waypointProfileData*/ ctx[11]);
				let i;

				for (i = 0; i < each_value_5.length; i += 1) {
					const child_ctx = get_each_context_5(ctx, each_value_5, i);

					if (each_blocks_3[i]) {
						each_blocks_3[i].p(child_ctx, dirty);
					} else {
						each_blocks_3[i] = create_each_block_5(child_ctx);
						each_blocks_3[i].c();
						each_blocks_3[i].m(each2_anchor.parentNode, each2_anchor);
					}
				}

				for (; i < each_blocks_3.length; i += 1) {
					each_blocks_3[i].d(1);
				}

				each_blocks_3.length = each_value_5.length;
			}

			if (/*terrainPath*/ ctx[7]) {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_7$1(ctx);
					if_block0.c();
					if_block0.m(if_block0_anchor.parentNode, if_block0_anchor);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (dirty[0] & /*distanceToX, waypointProfileData, altitudeToY*/ 26624) {
				each_value_4 = ensure_array_like(/*waypointProfileData*/ ctx[11]);
				let i;

				for (i = 0; i < each_value_4.length; i += 1) {
					const child_ctx = get_each_context_4(ctx, each_value_4, i);

					if (each_blocks_2[i]) {
						each_blocks_2[i].p(child_ctx, dirty);
					} else {
						each_blocks_2[i] = create_each_block_4(child_ctx);
						each_blocks_2[i].c();
						each_blocks_2[i].m(each3_anchor.parentNode, each3_anchor);
					}
				}

				for (; i < each_blocks_2.length; i += 1) {
					each_blocks_2[i].d(1);
				}

				each_blocks_2.length = each_value_4.length;
			}

			if (dirty[0] & /*waypointProfileData, maxAltitude, distanceToX, altitudeToY*/ 26626) {
				each_value_1 = ensure_array_like(/*waypointProfileData*/ ctx[11]);
				let i;

				for (i = 0; i < each_value_1.length; i += 1) {
					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

					if (each_blocks_1[i]) {
						each_blocks_1[i].p(child_ctx, dirty);
					} else {
						each_blocks_1[i] = create_each_block_1$1(child_ctx);
						each_blocks_1[i].c();
						each_blocks_1[i].m(each4_anchor.parentNode, each4_anchor);
					}
				}

				for (; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].d(1);
				}

				each_blocks_1.length = each_value_1.length;
			}

			if (dirty[0] & /*distanceToX, waypointProfileData, graphPadding, handleWaypointClick, altitudeToY*/ 161792) {
				each_value = ensure_array_like(/*waypointProfileData*/ ctx[11]);
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$1(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block$1(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(each5_anchor.parentNode, each5_anchor);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}

			if (/*cursorDistance*/ ctx[5] !== null) {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block_1$1(ctx);
					if_block1.c();
					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}
		},
		d(detaching) {
			if (detaching) {
				detach(each0_anchor);
				detach(each1_anchor);
				detach(each2_anchor);
				detach(if_block0_anchor);
				detach(each3_anchor);
				detach(each4_anchor);
				detach(each5_anchor);
				detach(if_block1_anchor);
			}

			destroy_each(each_blocks_5, detaching);
			destroy_each(each_blocks_4, detaching);
			destroy_each(each_blocks_3, detaching);
			if (if_block0) if_block0.d(detaching);
			destroy_each(each_blocks_2, detaching);
			destroy_each(each_blocks_1, detaching);
			destroy_each(each_blocks, detaching);
			if (if_block1) if_block1.d(detaching);
		}
	};
}

function create_fragment$1(ctx) {
	let if_block_anchor;

	function select_block_type(ctx, dirty) {
		if (/*profileData*/ ctx[2].length === 0) return create_if_block$1;
		return create_else_block$1;
	}

	let current_block_type = select_block_type(ctx);
	let if_block = current_block_type(ctx);

	return {
		c() {
			if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},
		p(ctx, dirty) {
			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
				if_block.p(ctx, dirty);
			} else {
				if_block.d(1);
				if_block = current_block_type(ctx);

				if (if_block) {
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) {
				detach(if_block_anchor);
			}

			if_block.d(detaching);
		}
	};
}

let graphHeight = 400;

function getSegmentColor$1(condition) {
	switch (condition) {
		case 'good':
			return '#4caf50';
		case 'marginal':
			return '#ff9800';
		case 'poor':
			return '#f44336';
		case 'unknown':
		default:
			return '#757575';
	}
}

function generateSmallWindBarb(x, y, windDir, windSpeed, scale = 0.6) {
	const staffLength = 20 * scale;
	const barbLength = 8 * scale;
	const shortBarbLength = 4 * scale;
	const triangleSize = 6 * scale;
	const angle = (windDir - 90) * Math.PI / 180;
	const staffEndX = x + Math.cos(angle) * staffLength;
	const staffEndY = y + Math.sin(angle) * staffLength;
	const staff = `M ${x},${y} L ${staffEndX},${staffEndY}`;
	const barbs = [];
	let remainingSpeed = Math.round(windSpeed);
	let barbPosition = 0;
	const barbSpacing = 4 * scale;

	while (remainingSpeed >= 50) {
		const posX = x + Math.cos(angle) * (staffLength - barbPosition);
		const posY = y + Math.sin(angle) * (staffLength - barbPosition);
		const perpAngle = angle + Math.PI / 2;
		const tip1X = posX + Math.cos(perpAngle) * triangleSize;
		const tip1Y = posY + Math.sin(perpAngle) * triangleSize;
		const tip2X = posX + Math.cos(angle) * triangleSize;
		const tip2Y = posY + Math.sin(angle) * triangleSize;

		barbs.push({
			path: `M ${posX},${posY} L ${tip1X},${tip1Y} L ${tip2X},${tip2Y} Z`,
			type: 'triangle'
		});

		remainingSpeed -= 50;
		barbPosition += barbSpacing * 1.5;
	}

	while (remainingSpeed >= 10) {
		const posX = x + Math.cos(angle) * (staffLength - barbPosition);
		const posY = y + Math.sin(angle) * (staffLength - barbPosition);
		const perpAngle = angle + Math.PI / 2;
		const barbEndX = posX + Math.cos(perpAngle) * barbLength;
		const barbEndY = posY + Math.sin(perpAngle) * barbLength;

		barbs.push({
			path: `M ${posX},${posY} L ${barbEndX},${barbEndY}`,
			type: 'long'
		});

		remainingSpeed -= 10;
		barbPosition += barbSpacing;
	}

	if (remainingSpeed >= 5) {
		const posX = x + Math.cos(angle) * (staffLength - barbPosition);
		const posY = y + Math.sin(angle) * (staffLength - barbPosition);
		const perpAngle = angle + Math.PI / 2;
		const barbEndX = posX + Math.cos(perpAngle) * shortBarbLength;
		const barbEndY = posY + Math.sin(perpAngle) * shortBarbLength;

		barbs.push({
			path: `M ${posX},${posY} L ${barbEndX},${barbEndY}`,
			type: 'short'
		});
	}

	if (windSpeed < 3) {
		return { staff: '', barbs: [] };
	}

	return { staff, barbs };
}

function getWindLevelColor(levelAltitude, flightAltitude) {
	const diff = Math.abs(levelAltitude - flightAltitude);

	if (diff < 500) {
		return 'rgba(76, 175, 80, 0.95)';
	} else if (diff < 2000) {
		return 'rgba(255, 193, 7, 0.8)';
	} else {
		return 'rgba(255, 255, 255, 0.5)';
	}
}

const func_2$1 = p => p.windSpeed > 0;

function instance$1($$self, $$props, $$invalidate) {
	let profileData;
	let waypointProfileData;
	let scaleKey;
	let altitudeGridLines;
	let distanceGridLines;
	let terrainPath;
	let { flightPlan } = $$props;
	let { weatherData } = $$props;
	let { elevationProfile = [] } = $$props;
	let { settings } = $$props;
	let { maxAltitude = 15000 } = $$props;
	let { scale = 511 } = $$props;
	const dispatch = createEventDispatcher();
	const graphPadding = { top: 20, right: 20, bottom: 40, left: 60 };
	let graphWidth = 600;
	let svgElement;
	let cursorDistance = null;
	let cursorData = null;

	function interpolateAtDistance(distance) {
		if (profileData.length === 0) return null;
		if (profileData.length === 1) return profileData[0];

		for (let i = 0; i < profileData.length - 1; i++) {
			const p1 = profileData[i];
			const p2 = profileData[i + 1];

			if (distance >= p1.distance && distance <= p2.distance) {
				const t = (distance - p1.distance) / (p2.distance - p1.distance);
				const nearestVerticalWinds = t < 0.5 ? p1.verticalWinds : p2.verticalWinds;

				return {
					distance,
					altitude: p1.altitude + (p2.altitude - p1.altitude) * t,
					terrainElevation: p1.terrainElevation !== undefined && p2.terrainElevation !== undefined
					? p1.terrainElevation + (p2.terrainElevation - p1.terrainElevation) * t
					: undefined,
					cloudBase: p1.cloudBase !== undefined && p2.cloudBase !== undefined
					? p1.cloudBase + (p2.cloudBase - p1.cloudBase) * t
					: undefined,
					cloudTop: p1.cloudTop !== undefined && p2.cloudTop !== undefined
					? p1.cloudTop + (p2.cloudTop - p1.cloudTop) * t
					: undefined,
					headwindComponent: p1.headwindComponent + (p2.headwindComponent - p1.headwindComponent) * t,
					crosswindComponent: p1.crosswindComponent + (p2.crosswindComponent - p1.crosswindComponent) * t,
					windSpeed: p1.windSpeed + (p2.windSpeed - p1.windSpeed) * t,
					windDir: lerpAngle(p1.windDir, p2.windDir, t),
					verticalWinds: nearestVerticalWinds,
					condition: p1.condition,
					conditionReasons: p1.conditionReasons
				};
			}
		}

		if (distance >= profileData[profileData.length - 1].distance) {
			return profileData[profileData.length - 1];
		}

		return profileData[0];
	}

	function distanceToX(distance) {
		if (profileData.length === 0) return graphPadding.left;
		const maxDistance = Math.max(...profileData.map(p => p.distance));
		if (maxDistance === 0) return graphPadding.left;
		const xRange = graphWidth - graphPadding.left - graphPadding.right;
		return graphPadding.left + distance / maxDistance * xRange;
	}

	function altitudeToY(altitude) {
		const yRange = graphHeight - graphPadding.top - graphPadding.bottom;
		return graphPadding.top + (1 - altitude / maxAltitude) * yRange;
	}

	function handleMouseMove(event) {
		if (!svgElement) return;
		const rect = svgElement.getBoundingClientRect();
		const x = event.clientX - rect.left;

		const maxDistance = profileData.length > 0
		? Math.max(...profileData.map(p => p.distance))
		: 0;

		const xRange = graphWidth - graphPadding.left - graphPadding.right;
		const distance = (x - graphPadding.left) / xRange * maxDistance;

		if (distance >= 0 && distance <= maxDistance) {
			$$invalidate(5, cursorDistance = distance);
			$$invalidate(6, cursorData = interpolateAtDistance(distance));
		} else {
			$$invalidate(5, cursorDistance = null);
			$$invalidate(6, cursorData = null);
		}
	}

	function handleMouseLeave() {
		$$invalidate(5, cursorDistance = null);
		$$invalidate(6, cursorData = null);
	}

	function handleWaypointClick(waypointId) {
		dispatch('waypointClick', waypointId);
	}

	const func = p => p.terrainElevation !== undefined;
	const func_1 = p => p.cloudBase !== undefined;
	const func_7 = w => w.altitudeFeet <= maxAltitude && w.windSpeed >= 3;
	const click_handler = point => point.waypointId && handleWaypointClick(point.waypointId);
	const click_handler_1 = point => point.waypointId && handleWaypointClick(point.waypointId);

	function svg_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			svgElement = $$value;
			$$invalidate(4, svgElement);
		});
	}

	$$self.$$set = $$props => {
		if ('flightPlan' in $$props) $$invalidate(18, flightPlan = $$props.flightPlan);
		if ('weatherData' in $$props) $$invalidate(19, weatherData = $$props.weatherData);
		if ('elevationProfile' in $$props) $$invalidate(20, elevationProfile = $$props.elevationProfile);
		if ('settings' in $$props) $$invalidate(0, settings = $$props.settings);
		if ('maxAltitude' in $$props) $$invalidate(1, maxAltitude = $$props.maxAltitude);
		if ('scale' in $$props) $$invalidate(21, scale = $$props.scale);
	};

	$$self.$$.update = () => {
		if ($$self.$$.dirty[0] & /*flightPlan, weatherData, elevationProfile*/ 1835008) {
			$$invalidate(2, profileData = calculateProfileData(flightPlan.waypoints, weatherData, flightPlan.aircraft.defaultAltitude, elevationProfile));
		}

		if ($$self.$$.dirty[0] & /*profileData*/ 4) {
			$$invalidate(11, waypointProfileData = profileData.filter(p => p.waypointId !== undefined));
		}

		if ($$self.$$.dirty[0] & /*maxAltitude*/ 2) {
			$$invalidate(10, scaleKey = `${maxAltitude}-${graphHeight}`);
		}

		if ($$self.$$.dirty[0] & /*profileData, scale*/ 2097156) {
			{
				if (profileData.length > 0) {
					const maxDistance = Math.max(...profileData.map(p => p.distance));
					const distanceMeters = maxDistance * 1852;
					$$invalidate(3, graphWidth = Math.max(600, Math.min(1200, distanceMeters / scale)));
				} else {
					$$invalidate(3, graphWidth = 600);
				}
			}
		}

		if ($$self.$$.dirty[0] & /*maxAltitude*/ 2) {
			$$invalidate(9, altitudeGridLines = (() => {
				const lines = [];
				const step = maxAltitude / 5;

				for (let i = 0; i <= 5; i++) {
					const altitude = i * step;

					lines.push({
						y: altitudeToY(altitude),
						label: `${Math.round(altitude)}ft`
					});
				}

				return lines;
			})());
		}

		if ($$self.$$.dirty[0] & /*profileData*/ 4) {
			$$invalidate(8, distanceGridLines = (() => {
				if (profileData.length === 0) return [];
				const maxDistance = Math.max(...profileData.map(p => p.distance));
				if (maxDistance === 0) return [];
				const lines = [];
				const step = maxDistance / 5;

				for (let i = 0; i <= 5; i++) {
					const distance = i * step;

					lines.push({
						x: distanceToX(distance),
						label: `${distance.toFixed(1)}NM`
					});
				}

				return lines;
			})());
		}

		if ($$self.$$.dirty[0] & /*maxAltitude, profileData, settings*/ 7) {
			$$invalidate(7, terrainPath = (() => {

				if (profileData.length === 0) {
					if (settings.enableLogging) console.log('[Profile] No profile data for terrain');
					return '';
				}

				const terrainPoints = profileData.filter(p => p.terrainElevation !== undefined);

				if (terrainPoints.length === 0) {
					if (settings.enableLogging) console.log('[Profile] No terrain elevation data in profile points');
					return '';
				}

				const bottomY = graphHeight - graphPadding.bottom;
				const points = [];
				points.push(`${distanceToX(terrainPoints[0].distance)},${bottomY}`);

				terrainPoints.forEach(p => {
					points.push(`${distanceToX(p.distance)},${altitudeToY(p.terrainElevation)}`);
				});

				points.push(`${distanceToX(terrainPoints[terrainPoints.length - 1].distance)},${bottomY}`);
				const path = points.join(' ');

				if (settings.enableLogging) {
					console.log(`[Profile] Terrain path generated: ${terrainPoints.length} points`);
					console.log(`[Profile] Terrain elevation range: ${Math.min(...terrainPoints.map(p => p.terrainElevation))}ft to ${Math.max(...terrainPoints.map(p => p.terrainElevation))}ft`);
					console.log(`[Profile] First 3 terrain points:`, terrainPoints.slice(0, 3).map(p => `${p.distance.toFixed(1)}NM @ ${p.terrainElevation.toFixed(0)}ft`));
				}

				return path;
			})());
		}
	};

	return [
		settings,
		maxAltitude,
		profileData,
		graphWidth,
		svgElement,
		cursorDistance,
		cursorData,
		terrainPath,
		distanceGridLines,
		altitudeGridLines,
		scaleKey,
		waypointProfileData,
		graphPadding,
		distanceToX,
		altitudeToY,
		handleMouseMove,
		handleMouseLeave,
		handleWaypointClick,
		flightPlan,
		weatherData,
		elevationProfile,
		scale,
		func,
		func_1,
		func_7,
		click_handler,
		click_handler_1,
		svg_binding
	];
}

class AltitudeProfile extends SvelteComponent {
	constructor(options) {
		super();

		init(
			this,
			options,
			instance$1,
			create_fragment$1,
			safe_not_equal,
			{
				flightPlan: 18,
				weatherData: 19,
				elevationProfile: 20,
				settings: 0,
				maxAltitude: 1,
				scale: 21
			},
			add_css$1,
			[-1, -1, -1]
		);
	}
}

/* src/plugin.svelte generated by Svelte v4.2.20 */

const { Map: Map_1 } = globals;

function add_css(target) {
	append_styles(target, "svelte-4szoo7", ".tabs.svelte-4szoo7.svelte-4szoo7{display:flex;padding:0 10px;gap:4px;margin-bottom:10px}.tab.svelte-4szoo7.svelte-4szoo7{flex:1;padding:8px 12px;background:rgba(255, 255, 255, 0.05);border:none;border-radius:4px;color:rgba(255, 255, 255, 0.7);cursor:pointer;font-size:13px;transition:all 0.15s ease}.tab.svelte-4szoo7.svelte-4szoo7:hover{background:rgba(255, 255, 255, 0.1)}.tab.active.svelte-4szoo7.svelte-4szoo7{background:#3498db;color:white}.tab.svelte-4szoo7.svelte-4szoo7:disabled{opacity:0.5;cursor:not-allowed}.profile-empty.svelte-4szoo7.svelte-4szoo7{padding:20px;text-align:center;color:rgba(255, 255, 255, 0.7);font-size:13px}.profile-empty.svelte-4szoo7 p.svelte-4szoo7{margin:0}.import-section.svelte-4szoo7.svelte-4szoo7{padding:10px}.drop-zone.svelte-4szoo7.svelte-4szoo7{border:2px dashed rgba(255, 255, 255, 0.3);border-radius:8px;padding:20px;text-align:center;transition:all 0.2s ease;cursor:pointer}.drop-zone.drag-over.svelte-4szoo7.svelte-4szoo7{border-color:#3498db;background:rgba(52, 152, 219, 0.1)}.drop-zone.svelte-4szoo7.svelte-4szoo7:hover{border-color:rgba(255, 255, 255, 0.5)}.drop-zone-content.svelte-4szoo7.svelte-4szoo7{display:flex;flex-direction:column;align-items:center;gap:8px}.drop-icon.svelte-4szoo7.svelte-4szoo7{font-size:32px}.btn-browse.svelte-4szoo7.svelte-4szoo7{margin-top:8px;padding:6px 16px;background:#3498db;border:none;border-radius:4px;color:white;cursor:pointer;font-size:13px}.btn-browse.svelte-4szoo7.svelte-4szoo7:hover{background:#2980b9}.flight-plan-loaded.svelte-4szoo7.svelte-4szoo7{display:flex;align-items:center;justify-content:space-between;gap:10px}.plan-name.svelte-4szoo7.svelte-4szoo7{font-weight:500;color:#3498db}.btn-clear.svelte-4szoo7.svelte-4szoo7{padding:4px 8px;background:rgba(255, 255, 255, 0.1);border:none;border-radius:4px;color:rgba(255, 255, 255, 0.7);cursor:pointer}.btn-clear.svelte-4szoo7.svelte-4szoo7:hover{background:rgba(231, 76, 60, 0.3);color:#e74c3c}.loading.svelte-4szoo7.svelte-4szoo7{color:#3498db}.error-message.svelte-4szoo7.svelte-4szoo7{margin-top:10px;padding:8px;background:rgba(231, 76, 60, 0.2);border-radius:4px;color:#e74c3c;font-size:12px}.departure-section.svelte-4szoo7.svelte-4szoo7{padding:0 10px 10px;border-bottom:1px solid rgba(255, 255, 255, 0.1);margin-bottom:10px}.departure-header.svelte-4szoo7.svelte-4szoo7{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.departure-label.svelte-4szoo7.svelte-4szoo7{font-size:12px;color:rgba(255, 255, 255, 0.7)}.departure-time.svelte-4szoo7.svelte-4szoo7{font-size:13px;font-weight:500;color:#3498db}.timeline-slider.svelte-4szoo7.svelte-4szoo7{position:relative}.slider.svelte-4szoo7.svelte-4szoo7{width:100%;height:6px;-webkit-appearance:none;appearance:none;background:rgba(255, 255, 255, 0.1);border-radius:3px;outline:none;cursor:pointer}.slider.svelte-4szoo7.svelte-4szoo7::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:18px;height:18px;background:#3498db;border-radius:50%;cursor:pointer;box-shadow:0 2px 4px rgba(0, 0, 0, 0.3);transition:transform 0.15s ease}.slider.svelte-4szoo7.svelte-4szoo7::-webkit-slider-thumb:hover{transform:scale(1.1)}.slider.svelte-4szoo7.svelte-4szoo7::-moz-range-thumb{width:18px;height:18px;background:#3498db;border-radius:50%;cursor:pointer;border:none;box-shadow:0 2px 4px rgba(0, 0, 0, 0.3)}.timeline-labels.svelte-4szoo7.svelte-4szoo7{display:flex;justify-content:space-between;margin-top:4px;font-size:10px;color:rgba(255, 255, 255, 0.5)}.departure-footer.svelte-4szoo7.svelte-4szoo7{display:flex;justify-content:space-between;align-items:center;margin-top:6px}.arrival-info.svelte-4szoo7.svelte-4szoo7{font-size:11px;color:rgba(255, 255, 255, 0.6)}.btn-sync.svelte-4szoo7.svelte-4szoo7{padding:4px 8px;background:rgba(255, 255, 255, 0.1);border:none;border-radius:4px;color:rgba(255, 255, 255, 0.6);cursor:pointer;font-size:10px;transition:all 0.15s ease}.btn-sync.svelte-4szoo7.svelte-4szoo7:hover{background:rgba(255, 255, 255, 0.15);color:rgba(255, 255, 255, 0.8)}.btn-sync.active.svelte-4szoo7.svelte-4szoo7{background:rgba(39, 174, 96, 0.3);color:#27ae60}.action-buttons.svelte-4szoo7.svelte-4szoo7{display:flex;gap:8px;padding:0 10px 10px}.btn-action.svelte-4szoo7.svelte-4szoo7{flex:1;padding:8px 12px;background:rgba(255, 255, 255, 0.1);border:none;border-radius:4px;color:rgba(255, 255, 255, 0.9);cursor:pointer;font-size:12px;transition:all 0.15s ease}.btn-action.svelte-4szoo7.svelte-4szoo7:hover{background:rgba(255, 255, 255, 0.15)}.btn-action.active.svelte-4szoo7.svelte-4szoo7{background:#27ae60;color:white}.btn-action.svelte-4szoo7.svelte-4szoo7:disabled{opacity:0.6;cursor:not-allowed}.btn-action.btn-weather.has-alerts.svelte-4szoo7.svelte-4szoo7{background:rgba(243, 156, 18, 0.3);border:1px solid #f39c12}.weather-error.svelte-4szoo7.svelte-4szoo7{margin:0 10px 10px;padding:8px;background:rgba(231, 76, 60, 0.2);border-radius:4px;color:#e74c3c;font-size:12px}.waypoint-section.svelte-4szoo7.svelte-4szoo7{padding:0 10px 10px}.section-header.svelte-4szoo7.svelte-4szoo7{display:flex;justify-content:space-between;align-items:center;padding:8px 0;font-size:12px;color:rgba(255, 255, 255, 0.7);border-bottom:1px solid rgba(255, 255, 255, 0.1)}.totals.svelte-4szoo7.svelte-4szoo7{font-weight:500;color:#3498db}.waypoint-table.svelte-4szoo7.svelte-4szoo7{max-height:350px;overflow-y:auto}.waypoint-row.svelte-4szoo7.svelte-4szoo7{display:flex;align-items:center;padding:8px 4px;border-bottom:1px solid rgba(255, 255, 255, 0.05);cursor:pointer;transition:background 0.15s ease}.waypoint-row.svelte-4szoo7.svelte-4szoo7:hover{background:rgba(255, 255, 255, 0.05)}.waypoint-row.svelte-4szoo7:hover .btn-move.svelte-4szoo7,.waypoint-row.svelte-4szoo7:hover .btn-delete.svelte-4szoo7{opacity:1}.waypoint-row.selected.svelte-4szoo7.svelte-4szoo7{background:rgba(52, 152, 219, 0.2)}.waypoint-row.has-warning.svelte-4szoo7.svelte-4szoo7{border-left:3px solid #e74c3c}.waypoint-row.has-caution.svelte-4szoo7.svelte-4szoo7:not(.has-warning){border-left:3px solid #f39c12}.wp-index.svelte-4szoo7.svelte-4szoo7{width:24px;font-size:11px;color:rgba(255, 255, 255, 0.5);text-align:center}.wp-info.svelte-4szoo7.svelte-4szoo7{flex:1;min-width:0}.wp-name.svelte-4szoo7.svelte-4szoo7{display:flex;align-items:center;gap:6px;font-weight:500}.wp-type-icon.svelte-4szoo7.svelte-4szoo7{font-size:14px}.wp-comment.svelte-4szoo7.svelte-4szoo7{font-size:11px;color:rgba(255, 255, 255, 0.5);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.wp-weather.svelte-4szoo7.svelte-4szoo7{display:flex;flex-wrap:wrap;gap:8px;margin-top:4px;font-size:10px;color:rgba(255, 255, 255, 0.7)}.wx-wind.svelte-4szoo7.svelte-4szoo7,.wx-temp.svelte-4szoo7.svelte-4szoo7,.wx-cloud.svelte-4szoo7.svelte-4szoo7{display:inline-flex;align-items:center;gap:2px}.wx-cloud.clickable.svelte-4szoo7.svelte-4szoo7{cursor:pointer;text-decoration:underline;opacity:0.9}.wx-cloud.clickable.svelte-4szoo7.svelte-4szoo7:hover{opacity:1;color:#3498db}.alert-badge.svelte-4szoo7.svelte-4szoo7{font-size:12px;margin-left:4px}.alert-badge.warning.svelte-4szoo7.svelte-4szoo7{animation:svelte-4szoo7-pulse 1s ease-in-out infinite}@keyframes svelte-4szoo7-pulse{0%,100%{opacity:1}50%{opacity:0.5}}.alert-row.svelte-4szoo7.svelte-4szoo7{display:flex;flex-wrap:wrap;gap:6px;padding:4px 4px 8px 28px;border-bottom:1px solid rgba(255, 255, 255, 0.05)}.alert-item.svelte-4szoo7.svelte-4szoo7{display:inline-block;padding:2px 6px;background:rgba(243, 156, 18, 0.2);border-radius:3px;font-size:10px;color:#f39c12}.alert-item.warning.svelte-4szoo7.svelte-4szoo7{background:rgba(231, 76, 60, 0.2);color:#e74c3c}.wp-nav.svelte-4szoo7.svelte-4szoo7{text-align:right;font-size:11px;min-width:60px}.wp-bearing.svelte-4szoo7.svelte-4szoo7{color:rgba(255, 255, 255, 0.7)}.wp-distance.svelte-4szoo7.svelte-4szoo7{color:#3498db}.wp-gs.svelte-4szoo7.svelte-4szoo7{color:#27ae60;font-weight:500}.wp-actions.svelte-4szoo7.svelte-4szoo7{display:flex;gap:2px;align-items:center}.btn-move.svelte-4szoo7.svelte-4szoo7{padding:2px 6px;background:transparent;border:none;color:rgba(255, 255, 255, 0.3);cursor:pointer;opacity:0;transition:all 0.15s ease;font-size:10px;line-height:1}.btn-move.svelte-4szoo7.svelte-4szoo7:hover:not(:disabled){color:#3498db;background:rgba(52, 152, 219, 0.1)}.btn-move.svelte-4szoo7.svelte-4szoo7:disabled{opacity:0.2;cursor:not-allowed}.btn-delete.svelte-4szoo7.svelte-4szoo7{padding:4px 6px;background:transparent;border:none;color:rgba(255, 255, 255, 0.3);cursor:pointer;opacity:0;transition:all 0.15s ease;font-size:12px}.btn-delete.svelte-4szoo7.svelte-4szoo7:hover{color:#e74c3c}.settings-section.svelte-4szoo7.svelte-4szoo7{padding:10px}.setting-group.svelte-4szoo7.svelte-4szoo7{margin-bottom:16px}.setting-label.svelte-4szoo7.svelte-4szoo7{display:block;font-size:12px;color:rgba(255, 255, 255, 0.7);margin-bottom:6px}.setting-input.svelte-4szoo7.svelte-4szoo7{display:flex;align-items:center;gap:8px}.setting-input.svelte-4szoo7 input[type=\"number\"].svelte-4szoo7{width:100px;padding:8px;background:rgba(255, 255, 255, 0.1);border:1px solid rgba(255, 255, 255, 0.2);border-radius:4px;color:white;font-size:14px}.setting-input.svelte-4szoo7 input[type=\"number\"].svelte-4szoo7:focus{outline:none;border-color:#3498db}.setting-input.svelte-4szoo7 .unit.svelte-4szoo7{font-size:12px;color:rgba(255, 255, 255, 0.5)}.setting-checkbox.svelte-4szoo7.svelte-4szoo7{display:flex;align-items:center;gap:8px;font-size:13px;color:rgba(255, 255, 255, 0.9);cursor:pointer}.setting-checkbox.svelte-4szoo7 input[type=\"checkbox\"].svelte-4szoo7{width:16px;height:16px;cursor:pointer}.setting-description.svelte-4szoo7.svelte-4szoo7{margin-top:6px;font-size:11px;color:rgba(255, 255, 255, 0.5);line-height:1.4}.setting-info.svelte-4szoo7.svelte-4szoo7{margin-top:20px;padding:10px;background:rgba(52, 152, 219, 0.1);border-radius:4px;font-size:12px;color:rgba(255, 255, 255, 0.6)}.setting-info.svelte-4szoo7 p.svelte-4szoo7{margin:0}");
}

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[80] = list[i];
	child_ctx[84] = i;
	const constants_0 = /*getWaypointWeather*/ child_ctx[35](/*wp*/ child_ctx[80].id);
	child_ctx[81] = constants_0;
	const constants_1 = /*getWaypointAlerts*/ child_ctx[36](/*wp*/ child_ctx[80].id);
	child_ctx[82] = constants_1;
	return child_ctx;
}

function get_each_context_1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[85] = list[i];
	return child_ctx;
}

// (13:4) {#if flightPlan}
function create_if_block_21(ctx) {
	let div;
	let button0;
	let t1;
	let button1;
	let t2;
	let button1_disabled_value;
	let t3;
	let button2;
	let mounted;
	let dispose;

	return {
		c() {
			div = element("div");
			button0 = element("button");
			button0.textContent = "Route";
			t1 = space();
			button1 = element("button");
			t2 = text("Profile");
			t3 = space();
			button2 = element("button");
			button2.textContent = "Settings";
			attr(button0, "class", "tab svelte-4szoo7");
			toggle_class(button0, "active", /*activeTab*/ ctx[6] === 'route');
			attr(button1, "class", "tab svelte-4szoo7");
			button1.disabled = button1_disabled_value = !/*flightPlan*/ ctx[0] || /*flightPlan*/ ctx[0].waypoints.length < 2;
			toggle_class(button1, "active", /*activeTab*/ ctx[6] === 'profile');
			attr(button2, "class", "tab svelte-4szoo7");
			toggle_class(button2, "active", /*activeTab*/ ctx[6] === 'settings');
			attr(div, "class", "tabs svelte-4szoo7");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, button0);
			append(div, t1);
			append(div, button1);
			append(button1, t2);
			append(div, t3);
			append(div, button2);

			if (!mounted) {
				dispose = [
					listen(button0, "click", /*click_handler_1*/ ctx[42]),
					listen(button1, "click", /*click_handler_2*/ ctx[43]),
					listen(button2, "click", /*click_handler_3*/ ctx[44])
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty[0] & /*activeTab*/ 64) {
				toggle_class(button0, "active", /*activeTab*/ ctx[6] === 'route');
			}

			if (dirty[0] & /*flightPlan*/ 1 && button1_disabled_value !== (button1_disabled_value = !/*flightPlan*/ ctx[0] || /*flightPlan*/ ctx[0].waypoints.length < 2)) {
				button1.disabled = button1_disabled_value;
			}

			if (dirty[0] & /*activeTab*/ 64) {
				toggle_class(button1, "active", /*activeTab*/ ctx[6] === 'profile');
			}

			if (dirty[0] & /*activeTab*/ 64) {
				toggle_class(button2, "active", /*activeTab*/ ctx[6] === 'settings');
			}
		},
		d(detaching) {
			if (detaching) {
				detach(div);
			}

			mounted = false;
			run_all(dispose);
		}
	};
}

// (60:12) {:else}
function create_else_block_3(ctx) {
	let div;
	let span;
	let t0_value = /*flightPlan*/ ctx[0].name + "";
	let t0;
	let t1;
	let button;
	let mounted;
	let dispose;

	return {
		c() {
			div = element("div");
			span = element("span");
			t0 = text(t0_value);
			t1 = space();
			button = element("button");
			button.textContent = "✕";
			attr(span, "class", "plan-name svelte-4szoo7");
			attr(button, "class", "btn-clear svelte-4szoo7");
			attr(button, "title", "Clear flight plan");
			attr(div, "class", "flight-plan-loaded svelte-4szoo7");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, span);
			append(span, t0);
			append(div, t1);
			append(div, button);

			if (!mounted) {
				dispose = listen(button, "click", /*clearFlightPlan*/ ctx[23]);
				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty[0] & /*flightPlan*/ 1 && t0_value !== (t0_value = /*flightPlan*/ ctx[0].name + "")) set_data(t0, t0_value);
		},
		d(detaching) {
			if (detaching) {
				detach(div);
			}

			mounted = false;
			dispose();
		}
	};
}

// (52:34) 
function create_if_block_20(ctx) {
	let div;
	let span0;
	let t1;
	let span1;
	let t3;
	let button;
	let mounted;
	let dispose;

	return {
		c() {
			div = element("div");
			span0 = element("span");
			span0.textContent = "✈️";
			t1 = space();
			span1 = element("span");
			span1.textContent = "Drop .fpl file here";
			t3 = space();
			button = element("button");
			button.textContent = "Browse...";
			attr(span0, "class", "drop-icon svelte-4szoo7");
			attr(button, "class", "btn-browse svelte-4szoo7");
			attr(div, "class", "drop-zone-content svelte-4szoo7");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, span0);
			append(div, t1);
			append(div, span1);
			append(div, t3);
			append(div, button);

			if (!mounted) {
				dispose = listen(button, "click", /*click_handler_4*/ ctx[46]);
				mounted = true;
			}
		},
		p: noop,
		d(detaching) {
			if (detaching) {
				detach(div);
			}

			mounted = false;
			dispose();
		}
	};
}

// (50:12) {#if isLoading}
function create_if_block_19(ctx) {
	let span;

	return {
		c() {
			span = element("span");
			span.textContent = "Loading...";
			attr(span, "class", "loading svelte-4szoo7");
		},
		m(target, anchor) {
			insert(target, span, anchor);
		},
		p: noop,
		d(detaching) {
			if (detaching) {
				detach(span);
			}
		}
	};
}

// (67:8) {#if error}
function create_if_block_18(ctx) {
	let div;
	let t;

	return {
		c() {
			div = element("div");
			t = text(/*error*/ ctx[4]);
			attr(div, "class", "error-message svelte-4szoo7");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, t);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*error*/ 16) set_data(t, /*error*/ ctx[4]);
		},
		d(detaching) {
			if (detaching) {
				detach(div);
			}
		}
	};
}

// (73:4) {#if activeTab === 'route'}
function create_if_block_3(ctx) {
	let t;
	let if_block1_anchor;
	let if_block0 = /*flightPlan*/ ctx[0] && create_if_block_13(ctx);
	let if_block1 = /*flightPlan*/ ctx[0] && /*flightPlan*/ ctx[0].waypoints.length > 0 && create_if_block_4(ctx);

	return {
		c() {
			if (if_block0) if_block0.c();
			t = space();
			if (if_block1) if_block1.c();
			if_block1_anchor = empty();
		},
		m(target, anchor) {
			if (if_block0) if_block0.m(target, anchor);
			insert(target, t, anchor);
			if (if_block1) if_block1.m(target, anchor);
			insert(target, if_block1_anchor, anchor);
		},
		p(ctx, dirty) {
			if (/*flightPlan*/ ctx[0]) {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_13(ctx);
					if_block0.c();
					if_block0.m(t.parentNode, t);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (/*flightPlan*/ ctx[0] && /*flightPlan*/ ctx[0].waypoints.length > 0) {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block_4(ctx);
					if_block1.c();
					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}
		},
		d(detaching) {
			if (detaching) {
				detach(t);
				detach(if_block1_anchor);
			}

			if (if_block0) if_block0.d(detaching);
			if (if_block1) if_block1.d(detaching);
		}
	};
}

// (75:8) {#if flightPlan}
function create_if_block_13(ctx) {
	let div;
	let button0;
	let t0;
	let button1;
	let t2;
	let button2;
	let t4;
	let button3;
	let t6;
	let button4;

	let t7_value = (/*isAddingWaypoint*/ ctx[7]
	? '✓ Click map'
	: '➕ Add Point') + "";

	let t7;
	let t8;
	let t9;
	let if_block2_anchor;
	let mounted;
	let dispose;

	function select_block_type_1(ctx, dirty) {
		if (/*isLoadingWeather*/ ctx[9]) return create_if_block_17;
		return create_else_block_2;
	}

	let current_block_type = select_block_type_1(ctx);
	let if_block0 = current_block_type(ctx);
	let if_block1 = /*weatherError*/ ctx[10] && create_if_block_16(ctx);
	let if_block2 = /*forecastRange*/ ctx[13] && create_if_block_14(ctx);

	return {
		c() {
			div = element("div");
			button0 = element("button");
			if_block0.c();
			t0 = space();
			button1 = element("button");
			button1.textContent = "📥 Export GPX";
			t2 = space();
			button2 = element("button");
			button2.textContent = "🗺️ Send to D&P";
			t4 = space();
			button3 = element("button");
			button3.textContent = "🔄 Reverse";
			t6 = space();
			button4 = element("button");
			t7 = text(t7_value);
			t8 = space();
			if (if_block1) if_block1.c();
			t9 = space();
			if (if_block2) if_block2.c();
			if_block2_anchor = empty();
			attr(button0, "class", "btn-action btn-weather svelte-4szoo7");
			button0.disabled = /*isLoadingWeather*/ ctx[9];
			attr(button0, "title", "Fetch weather for all waypoints");
			toggle_class(button0, "has-alerts", /*hasAnyAlerts*/ ctx[37]());
			attr(button1, "class", "btn-action svelte-4szoo7");
			attr(button1, "title", "Export as GPX");
			attr(button2, "class", "btn-action svelte-4szoo7");
			attr(button2, "title", "Open route in Windy Distance & Planning (new window)");
			attr(button3, "class", "btn-action svelte-4szoo7");
			attr(button3, "title", "Reverse the route order");
			attr(button4, "class", "btn-action svelte-4szoo7");
			attr(button4, "title", "Click on map to add waypoint");
			toggle_class(button4, "active", /*isAddingWaypoint*/ ctx[7]);
			attr(div, "class", "action-buttons svelte-4szoo7");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, button0);
			if_block0.m(button0, null);
			append(div, t0);
			append(div, button1);
			append(div, t2);
			append(div, button2);
			append(div, t4);
			append(div, button3);
			append(div, t6);
			append(div, button4);
			append(button4, t7);
			insert(target, t8, anchor);
			if (if_block1) if_block1.m(target, anchor);
			insert(target, t9, anchor);
			if (if_block2) if_block2.m(target, anchor);
			insert(target, if_block2_anchor, anchor);

			if (!mounted) {
				dispose = [
					listen(button0, "click", /*handleReadWeather*/ ctx[34]),
					listen(button1, "click", /*handleExportGPX*/ ctx[31]),
					listen(button2, "click", /*handleSendToDistancePlanning*/ ctx[32]),
					listen(button3, "click", /*handleReverseRoute*/ ctx[33]),
					listen(button4, "click", /*toggleAddWaypoint*/ ctx[29])
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (current_block_type !== (current_block_type = select_block_type_1(ctx))) {
				if_block0.d(1);
				if_block0 = current_block_type(ctx);

				if (if_block0) {
					if_block0.c();
					if_block0.m(button0, null);
				}
			}

			if (dirty[0] & /*isLoadingWeather*/ 512) {
				button0.disabled = /*isLoadingWeather*/ ctx[9];
			}

			if (dirty[0] & /*isAddingWaypoint*/ 128 && t7_value !== (t7_value = (/*isAddingWaypoint*/ ctx[7]
			? '✓ Click map'
			: '➕ Add Point') + "")) set_data(t7, t7_value);

			if (dirty[0] & /*isAddingWaypoint*/ 128) {
				toggle_class(button4, "active", /*isAddingWaypoint*/ ctx[7]);
			}

			if (/*weatherError*/ ctx[10]) {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block_16(ctx);
					if_block1.c();
					if_block1.m(t9.parentNode, t9);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}

			if (/*forecastRange*/ ctx[13]) {
				if (if_block2) {
					if_block2.p(ctx, dirty);
				} else {
					if_block2 = create_if_block_14(ctx);
					if_block2.c();
					if_block2.m(if_block2_anchor.parentNode, if_block2_anchor);
				}
			} else if (if_block2) {
				if_block2.d(1);
				if_block2 = null;
			}
		},
		d(detaching) {
			if (detaching) {
				detach(div);
				detach(t8);
				detach(t9);
				detach(if_block2_anchor);
			}

			if_block0.d();
			if (if_block1) if_block1.d(detaching);
			if (if_block2) if_block2.d(detaching);
			mounted = false;
			run_all(dispose);
		}
	};
}

// (86:20) {:else}
function create_else_block_2(ctx) {
	let t;

	return {
		c() {
			t = text("🌤️ Read Wx");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		d(detaching) {
			if (detaching) {
				detach(t);
			}
		}
	};
}

// (84:20) {#if isLoadingWeather}
function create_if_block_17(ctx) {
	let t;

	return {
		c() {
			t = text("⏳ Loading...");
		},
		m(target, anchor) {
			insert(target, t, anchor);
		},
		d(detaching) {
			if (detaching) {
				detach(t);
			}
		}
	};
}

// (116:12) {#if weatherError}
function create_if_block_16(ctx) {
	let div;
	let t;

	return {
		c() {
			div = element("div");
			t = text(/*weatherError*/ ctx[10]);
			attr(div, "class", "weather-error svelte-4szoo7");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, t);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*weatherError*/ 1024) set_data(t, /*weatherError*/ ctx[10]);
		},
		d(detaching) {
			if (detaching) {
				detach(div);
			}
		}
	};
}

// (121:12) {#if forecastRange}
function create_if_block_14(ctx) {
	let div4;
	let div0;
	let span0;
	let t1;
	let span1;
	let t2_value = formatDepartureTime(/*departureTime*/ ctx[12]) + "";
	let t2;
	let t3;
	let div2;
	let input;
	let input_min_value;
	let input_max_value;
	let t4;
	let div1;
	let span2;
	let t5_value = formatShortTime(/*forecastRange*/ ctx[13].start) + "";
	let t5;
	let t6;
	let span3;
	let t7_value = formatShortTime(/*forecastRange*/ ctx[13].end) + "";
	let t7;
	let t8;
	let div3;
	let t9;
	let button;
	let t10;
	let t11_value = (/*syncWithWindy*/ ctx[14] ? 'Synced' : 'Sync') + "";
	let t11;
	let button_title_value;
	let mounted;
	let dispose;
	let if_block = /*flightPlan*/ ctx[0] && /*flightPlan*/ ctx[0].totals.ete > 0 && create_if_block_15(ctx);

	return {
		c() {
			div4 = element("div");
			div0 = element("div");
			span0 = element("span");
			span0.textContent = "🕐 Departure";
			t1 = space();
			span1 = element("span");
			t2 = text(t2_value);
			t3 = space();
			div2 = element("div");
			input = element("input");
			t4 = space();
			div1 = element("div");
			span2 = element("span");
			t5 = text(t5_value);
			t6 = space();
			span3 = element("span");
			t7 = text(t7_value);
			t8 = space();
			div3 = element("div");
			if (if_block) if_block.c();
			t9 = space();
			button = element("button");
			t10 = text("🔗 ");
			t11 = text(t11_value);
			attr(span0, "class", "departure-label svelte-4szoo7");
			attr(span1, "class", "departure-time svelte-4szoo7");
			attr(div0, "class", "departure-header svelte-4szoo7");
			attr(input, "type", "range");
			attr(input, "min", input_min_value = /*forecastRange*/ ctx[13].start);
			attr(input, "max", input_max_value = /*forecastRange*/ ctx[13].end);
			attr(input, "step", 3600000);
			attr(input, "class", "slider svelte-4szoo7");
			attr(div1, "class", "timeline-labels svelte-4szoo7");
			attr(div2, "class", "timeline-slider svelte-4szoo7");
			attr(button, "class", "btn-sync svelte-4szoo7");

			attr(button, "title", button_title_value = /*syncWithWindy*/ ctx[14]
			? 'Synced with Windy timeline'
			: 'Click to sync with Windy timeline');

			toggle_class(button, "active", /*syncWithWindy*/ ctx[14]);
			attr(div3, "class", "departure-footer svelte-4szoo7");
			attr(div4, "class", "departure-section svelte-4szoo7");
		},
		m(target, anchor) {
			insert(target, div4, anchor);
			append(div4, div0);
			append(div0, span0);
			append(div0, t1);
			append(div0, span1);
			append(span1, t2);
			append(div4, t3);
			append(div4, div2);
			append(div2, input);
			set_input_value(input, /*departureTime*/ ctx[12]);
			append(div2, t4);
			append(div2, div1);
			append(div1, span2);
			append(span2, t5);
			append(div1, t6);
			append(div1, span3);
			append(span3, t7);
			append(div4, t8);
			append(div4, div3);
			if (if_block) if_block.m(div3, null);
			append(div3, t9);
			append(div3, button);
			append(button, t10);
			append(button, t11);

			if (!mounted) {
				dispose = [
					listen(input, "change", /*input_change_input_handler*/ ctx[47]),
					listen(input, "input", /*input_change_input_handler*/ ctx[47]),
					listen(input, "change", /*handleDepartureTimeChange*/ ctx[38]),
					listen(button, "click", /*toggleWindySync*/ ctx[39])
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty[0] & /*departureTime*/ 4096 && t2_value !== (t2_value = formatDepartureTime(/*departureTime*/ ctx[12]) + "")) set_data(t2, t2_value);

			if (dirty[0] & /*forecastRange*/ 8192 && input_min_value !== (input_min_value = /*forecastRange*/ ctx[13].start)) {
				attr(input, "min", input_min_value);
			}

			if (dirty[0] & /*forecastRange*/ 8192 && input_max_value !== (input_max_value = /*forecastRange*/ ctx[13].end)) {
				attr(input, "max", input_max_value);
			}

			if (dirty[0] & /*departureTime*/ 4096) {
				set_input_value(input, /*departureTime*/ ctx[12]);
			}

			if (dirty[0] & /*forecastRange*/ 8192 && t5_value !== (t5_value = formatShortTime(/*forecastRange*/ ctx[13].start) + "")) set_data(t5, t5_value);
			if (dirty[0] & /*forecastRange*/ 8192 && t7_value !== (t7_value = formatShortTime(/*forecastRange*/ ctx[13].end) + "")) set_data(t7, t7_value);

			if (/*flightPlan*/ ctx[0] && /*flightPlan*/ ctx[0].totals.ete > 0) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block_15(ctx);
					if_block.c();
					if_block.m(div3, t9);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}

			if (dirty[0] & /*syncWithWindy*/ 16384 && t11_value !== (t11_value = (/*syncWithWindy*/ ctx[14] ? 'Synced' : 'Sync') + "")) set_data(t11, t11_value);

			if (dirty[0] & /*syncWithWindy*/ 16384 && button_title_value !== (button_title_value = /*syncWithWindy*/ ctx[14]
			? 'Synced with Windy timeline'
			: 'Click to sync with Windy timeline')) {
				attr(button, "title", button_title_value);
			}

			if (dirty[0] & /*syncWithWindy*/ 16384) {
				toggle_class(button, "active", /*syncWithWindy*/ ctx[14]);
			}
		},
		d(detaching) {
			if (detaching) {
				detach(div4);
			}

			if (if_block) if_block.d();
			mounted = false;
			run_all(dispose);
		}
	};
}

// (143:24) {#if flightPlan && flightPlan.totals.ete > 0}
function create_if_block_15(ctx) {
	let span;
	let t0;
	let t1_value = formatDepartureTime(/*departureTime*/ ctx[12] + /*flightPlan*/ ctx[0].totals.ete * 60000) + "";
	let t1;

	return {
		c() {
			span = element("span");
			t0 = text("ETA: ");
			t1 = text(t1_value);
			attr(span, "class", "arrival-info svelte-4szoo7");
		},
		m(target, anchor) {
			insert(target, span, anchor);
			append(span, t0);
			append(span, t1);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*departureTime, flightPlan*/ 4097 && t1_value !== (t1_value = formatDepartureTime(/*departureTime*/ ctx[12] + /*flightPlan*/ ctx[0].totals.ete * 60000) + "")) set_data(t1, t1_value);
		},
		d(detaching) {
			if (detaching) {
				detach(span);
			}
		}
	};
}

// (160:8) {#if flightPlan && flightPlan.waypoints.length > 0}
function create_if_block_4(ctx) {
	let div2;
	let div0;
	let span0;
	let t0;
	let t1_value = /*flightPlan*/ ctx[0].waypoints.length + "";
	let t1;
	let t2;
	let t3;
	let span1;
	let t4_value = formatDistance(/*flightPlan*/ ctx[0].totals.distance) + "";
	let t4;
	let t5;
	let t6_value = formatEte(/*flightPlan*/ ctx[0].totals.ete) + "";
	let t6;
	let t7;
	let t8;
	let div1;
	let each_blocks = [];
	let each_1_lookup = new Map_1();
	let if_block = /*flightPlan*/ ctx[0].totals.averageHeadwind !== undefined && create_if_block_12(ctx);
	let each_value = ensure_array_like(/*flightPlan*/ ctx[0].waypoints);
	const get_key = ctx => /*wp*/ ctx[80].id;

	for (let i = 0; i < each_value.length; i += 1) {
		let child_ctx = get_each_context(ctx, each_value, i);
		let key = get_key(child_ctx);
		each_1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
	}

	return {
		c() {
			div2 = element("div");
			div0 = element("div");
			span0 = element("span");
			t0 = text("Waypoints (");
			t1 = text(t1_value);
			t2 = text(")");
			t3 = space();
			span1 = element("span");
			t4 = text(t4_value);
			t5 = text(" · ");
			t6 = text(t6_value);
			t7 = space();
			if (if_block) if_block.c();
			t8 = space();
			div1 = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr(span1, "class", "totals svelte-4szoo7");
			attr(div0, "class", "section-header svelte-4szoo7");
			attr(div1, "class", "waypoint-table svelte-4szoo7");
			attr(div2, "class", "waypoint-section svelte-4szoo7");
		},
		m(target, anchor) {
			insert(target, div2, anchor);
			append(div2, div0);
			append(div0, span0);
			append(span0, t0);
			append(span0, t1);
			append(span0, t2);
			append(div0, t3);
			append(div0, span1);
			append(span1, t4);
			append(span1, t5);
			append(span1, t6);
			append(span1, t7);
			if (if_block) if_block.m(span1, null);
			append(div2, t8);
			append(div2, div1);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(div1, null);
				}
			}
		},
		p(ctx, dirty) {
			if (dirty[0] & /*flightPlan*/ 1 && t1_value !== (t1_value = /*flightPlan*/ ctx[0].waypoints.length + "")) set_data(t1, t1_value);
			if (dirty[0] & /*flightPlan*/ 1 && t4_value !== (t4_value = formatDistance(/*flightPlan*/ ctx[0].totals.distance) + "")) set_data(t4, t4_value);
			if (dirty[0] & /*flightPlan*/ 1 && t6_value !== (t6_value = formatEte(/*flightPlan*/ ctx[0].totals.ete) + "")) set_data(t6, t6_value);

			if (/*flightPlan*/ ctx[0].totals.averageHeadwind !== undefined) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block_12(ctx);
					if_block.c();
					if_block.m(span1, null);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}

			if (dirty[0] & /*flightPlan, selectedWaypointId, selectWaypoint, deleteWaypoint, moveWaypointDown, moveWaypointUp, settings*/ 486572035 | dirty[1] & /*getWaypointAlerts, getWaypointWeather*/ 48) {
				each_value = ensure_array_like(/*flightPlan*/ ctx[0].waypoints);
				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, div1, destroy_block, create_each_block, null, get_each_context);
			}
		},
		d(detaching) {
			if (detaching) {
				detach(div2);
			}

			if (if_block) if_block.d();

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].d();
			}
		}
	};
}

// (166:24) {#if flightPlan.totals.averageHeadwind !== undefined}
function create_if_block_12(ctx) {
	let t0;
	let t1_value = formatHeadwind(/*flightPlan*/ ctx[0].totals.averageHeadwind) + "";
	let t1;

	return {
		c() {
			t0 = text("· ");
			t1 = text(t1_value);
		},
		m(target, anchor) {
			insert(target, t0, anchor);
			insert(target, t1, anchor);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*flightPlan*/ 1 && t1_value !== (t1_value = formatHeadwind(/*flightPlan*/ ctx[0].totals.averageHeadwind) + "")) set_data(t1, t1_value);
		},
		d(detaching) {
			if (detaching) {
				detach(t0);
				detach(t1);
			}
		}
	};
}

// (187:36) {#if alerts.length > 0}
function create_if_block_11(ctx) {
	let span;

	return {
		c() {
			span = element("span");
			span.textContent = "⚠️";
			attr(span, "class", "alert-badge svelte-4szoo7");
			toggle_class(span, "warning", /*alerts*/ ctx[82].some(func));
		},
		m(target, anchor) {
			insert(target, span, anchor);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*flightPlan*/ 1 | dirty[1] & /*getWaypointAlerts*/ 32) {
				toggle_class(span, "warning", /*alerts*/ ctx[82].some(func));
			}
		},
		d(detaching) {
			if (detaching) {
				detach(span);
			}
		}
	};
}

// (193:32) {#if wp.comment}
function create_if_block_10(ctx) {
	let div;
	let t_value = /*wp*/ ctx[80].comment + "";
	let t;

	return {
		c() {
			div = element("div");
			t = text(t_value);
			attr(div, "class", "wp-comment svelte-4szoo7");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, t);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*flightPlan*/ 1 && t_value !== (t_value = /*wp*/ ctx[80].comment + "")) set_data(t, t_value);
		},
		d(detaching) {
			if (detaching) {
				detach(div);
			}
		}
	};
}

// (196:32) {#if wx}
function create_if_block_8(ctx) {
	let div;
	let span0;
	let t0;
	let t1_value = formatWind(/*wx*/ ctx[81].windSpeed, /*wx*/ ctx[81].windDir, /*wx*/ ctx[81].windAltitude) + "";
	let t1;
	let span0_title_value;
	let t2;
	let span1;
	let t3;
	let t4_value = formatTemperature(/*wx*/ ctx[81].temperature) + "";
	let t4;
	let t5;
	let span2;
	let t6;
	let t7_value = (/*wx*/ ctx[81].cloudBaseDisplay ?? 'N/A') + "";
	let t7;
	let span2_title_value;
	let mounted;
	let dispose;
	let if_block = /*wx*/ ctx[81].windLevel && /*wx*/ ctx[81].windLevel !== 'surface' && create_if_block_9(ctx);

	function click_handler_5() {
		return /*click_handler_5*/ ctx[48](/*wx*/ ctx[81], /*wp*/ ctx[80]);
	}

	return {
		c() {
			div = element("div");
			span0 = element("span");
			t0 = text("💨 ");
			t1 = text(t1_value);
			if (if_block) if_block.c();
			t2 = space();
			span1 = element("span");
			t3 = text("🌡️ ");
			t4 = text(t4_value);
			t5 = space();
			span2 = element("span");
			t6 = text("☁️ ");
			t7 = text(t7_value);
			attr(span0, "class", "wx-wind svelte-4szoo7");

			attr(span0, "title", span0_title_value = /*wx*/ ctx[81].windAltitude
			? `Wind at ${Math.round(/*wx*/ ctx[81].windAltitude)}ft (${/*wx*/ ctx[81].windLevel || 'surface'})`
			: 'Surface wind');

			attr(span1, "class", "wx-temp svelte-4szoo7");
			attr(span1, "title", "Temperature");
			attr(span2, "class", "wx-cloud svelte-4szoo7");

			attr(span2, "title", span2_title_value = /*wx*/ ctx[81].cloudBase !== undefined
			? 'Click to view full cbase table in console'
			: 'Cloud base (ECMWF) - N/A');

			toggle_class(span2, "clickable", /*wx*/ ctx[81].cloudBase !== undefined);
			attr(div, "class", "wp-weather svelte-4szoo7");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, span0);
			append(span0, t0);
			append(span0, t1);
			if (if_block) if_block.m(span0, null);
			append(div, t2);
			append(div, span1);
			append(span1, t3);
			append(span1, t4);
			append(div, t5);
			append(div, span2);
			append(span2, t6);
			append(span2, t7);

			if (!mounted) {
				dispose = listen(span2, "click", click_handler_5);
				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;
			if (dirty[0] & /*flightPlan*/ 1 && t1_value !== (t1_value = formatWind(/*wx*/ ctx[81].windSpeed, /*wx*/ ctx[81].windDir, /*wx*/ ctx[81].windAltitude) + "")) set_data(t1, t1_value);

			if (/*wx*/ ctx[81].windLevel && /*wx*/ ctx[81].windLevel !== 'surface') {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block_9(ctx);
					if_block.c();
					if_block.m(span0, null);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}

			if (dirty[0] & /*flightPlan*/ 1 && span0_title_value !== (span0_title_value = /*wx*/ ctx[81].windAltitude
			? `Wind at ${Math.round(/*wx*/ ctx[81].windAltitude)}ft (${/*wx*/ ctx[81].windLevel || 'surface'})`
			: 'Surface wind')) {
				attr(span0, "title", span0_title_value);
			}

			if (dirty[0] & /*flightPlan*/ 1 && t4_value !== (t4_value = formatTemperature(/*wx*/ ctx[81].temperature) + "")) set_data(t4, t4_value);
			if (dirty[0] & /*flightPlan*/ 1 && t7_value !== (t7_value = (/*wx*/ ctx[81].cloudBaseDisplay ?? 'N/A') + "")) set_data(t7, t7_value);

			if (dirty[0] & /*flightPlan*/ 1 && span2_title_value !== (span2_title_value = /*wx*/ ctx[81].cloudBase !== undefined
			? 'Click to view full cbase table in console'
			: 'Cloud base (ECMWF) - N/A')) {
				attr(span2, "title", span2_title_value);
			}

			if (dirty[0] & /*flightPlan*/ 1 | dirty[1] & /*getWaypointWeather*/ 16) {
				toggle_class(span2, "clickable", /*wx*/ ctx[81].cloudBase !== undefined);
			}
		},
		d(detaching) {
			if (detaching) {
				detach(div);
			}

			if (if_block) if_block.d();
			mounted = false;
			dispose();
		}
	};
}

// (198:237) {#if wx.windLevel && wx.windLevel !== 'surface'}
function create_if_block_9(ctx) {
	let small;
	let t0;
	let t1_value = /*wx*/ ctx[81].windLevel + "";
	let t1;
	let t2;

	return {
		c() {
			small = element("small");
			t0 = text("(");
			t1 = text(t1_value);
			t2 = text(")");
			set_style(small, "opacity", "0.7");
		},
		m(target, anchor) {
			insert(target, small, anchor);
			append(small, t0);
			append(small, t1);
			append(small, t2);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*flightPlan*/ 1 && t1_value !== (t1_value = /*wx*/ ctx[81].windLevel + "")) set_data(t1, t1_value);
		},
		d(detaching) {
			if (detaching) {
				detach(small);
			}
		}
	};
}

// (222:32) {:else}
function create_else_block_1(ctx) {
	let div0;
	let t1;
	let div1;

	return {
		c() {
			div0 = element("div");
			div0.textContent = "---";
			t1 = space();
			div1 = element("div");
			div1.textContent = "DEP";
			attr(div0, "class", "wp-bearing svelte-4szoo7");
			attr(div1, "class", "wp-distance svelte-4szoo7");
		},
		m(target, anchor) {
			insert(target, div0, anchor);
			insert(target, t1, anchor);
			insert(target, div1, anchor);
		},
		p: noop,
		d(detaching) {
			if (detaching) {
				detach(div0);
				detach(t1);
				detach(div1);
			}
		}
	};
}

// (216:32) {#if index > 0}
function create_if_block_6(ctx) {
	let div0;
	let t0_value = formatBearing(/*wp*/ ctx[80].bearing || 0) + "";
	let t0;
	let t1;
	let div1;
	let t2_value = formatDistance(/*wp*/ ctx[80].distance || 0) + "";
	let t2;
	let t3;
	let if_block_anchor;
	let if_block = /*wp*/ ctx[80].groundSpeed && create_if_block_7(ctx);

	return {
		c() {
			div0 = element("div");
			t0 = text(t0_value);
			t1 = space();
			div1 = element("div");
			t2 = text(t2_value);
			t3 = space();
			if (if_block) if_block.c();
			if_block_anchor = empty();
			attr(div0, "class", "wp-bearing svelte-4szoo7");
			attr(div1, "class", "wp-distance svelte-4szoo7");
		},
		m(target, anchor) {
			insert(target, div0, anchor);
			append(div0, t0);
			insert(target, t1, anchor);
			insert(target, div1, anchor);
			append(div1, t2);
			insert(target, t3, anchor);
			if (if_block) if_block.m(target, anchor);
			insert(target, if_block_anchor, anchor);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*flightPlan*/ 1 && t0_value !== (t0_value = formatBearing(/*wp*/ ctx[80].bearing || 0) + "")) set_data(t0, t0_value);
			if (dirty[0] & /*flightPlan*/ 1 && t2_value !== (t2_value = formatDistance(/*wp*/ ctx[80].distance || 0) + "")) set_data(t2, t2_value);

			if (/*wp*/ ctx[80].groundSpeed) {
				if (if_block) {
					if_block.p(ctx, dirty);
				} else {
					if_block = create_if_block_7(ctx);
					if_block.c();
					if_block.m(if_block_anchor.parentNode, if_block_anchor);
				}
			} else if (if_block) {
				if_block.d(1);
				if_block = null;
			}
		},
		d(detaching) {
			if (detaching) {
				detach(div0);
				detach(t1);
				detach(div1);
				detach(t3);
				detach(if_block_anchor);
			}

			if (if_block) if_block.d(detaching);
		}
	};
}

// (219:36) {#if wp.groundSpeed}
function create_if_block_7(ctx) {
	let div;
	let t0;
	let t1_value = Math.round(/*wp*/ ctx[80].groundSpeed) + "";
	let t1;

	return {
		c() {
			div = element("div");
			t0 = text("GS ");
			t1 = text(t1_value);
			attr(div, "class", "wp-gs svelte-4szoo7");
			attr(div, "title", "Ground speed");
		},
		m(target, anchor) {
			insert(target, div, anchor);
			append(div, t0);
			append(div, t1);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*flightPlan*/ 1 && t1_value !== (t1_value = Math.round(/*wp*/ ctx[80].groundSpeed) + "")) set_data(t1, t1_value);
		},
		d(detaching) {
			if (detaching) {
				detach(div);
			}
		}
	};
}

// (247:24) {#if alerts.length > 0}
function create_if_block_5(ctx) {
	let div;
	let t;
	let each_value_1 = ensure_array_like(/*alerts*/ ctx[82]);
	let each_blocks = [];

	for (let i = 0; i < each_value_1.length; i += 1) {
		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
	}

	return {
		c() {
			div = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t = space();
			attr(div, "class", "alert-row svelte-4szoo7");
		},
		m(target, anchor) {
			insert(target, div, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(div, null);
				}
			}

			append(div, t);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*flightPlan*/ 1 | dirty[1] & /*getWaypointAlerts*/ 32) {
				each_value_1 = ensure_array_like(/*alerts*/ ctx[82]);
				let i;

				for (i = 0; i < each_value_1.length; i += 1) {
					const child_ctx = get_each_context_1(ctx, each_value_1, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block_1(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(div, t);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value_1.length;
			}
		},
		d(detaching) {
			if (detaching) {
				detach(div);
			}

			destroy_each(each_blocks, detaching);
		}
	};
}

// (249:32) {#each alerts as alert}
function create_each_block_1(ctx) {
	let span;
	let t_value = /*alert*/ ctx[85].message + "";
	let t;

	return {
		c() {
			span = element("span");
			t = text(t_value);
			attr(span, "class", "alert-item svelte-4szoo7");
			toggle_class(span, "warning", /*alert*/ ctx[85].severity === 'warning');
		},
		m(target, anchor) {
			insert(target, span, anchor);
			append(span, t);
		},
		p(ctx, dirty) {
			if (dirty[0] & /*flightPlan*/ 1 && t_value !== (t_value = /*alert*/ ctx[85].message + "")) set_data(t, t_value);

			if (dirty[0] & /*flightPlan*/ 1 | dirty[1] & /*getWaypointAlerts*/ 32) {
				toggle_class(span, "warning", /*alert*/ ctx[85].severity === 'warning');
			}
		},
		d(detaching) {
			if (detaching) {
				detach(span);
			}
		}
	};
}

// (172:20) {#each flightPlan.waypoints as wp, index (wp.id)}
function create_each_block(key_1, ctx) {
	let div5;
	let div0;
	let t0_value = /*index*/ ctx[84] + 1 + "";
	let t0;
	let t1;
	let div2;
	let div1;
	let span;
	let t2_value = getWaypointIcon(/*wp*/ ctx[80].type) + "";
	let t2;
	let t3;
	let t4_value = /*wp*/ ctx[80].name + "";
	let t4;
	let t5;
	let t6;
	let t7;
	let t8;
	let div3;
	let t9;
	let div4;
	let button0;
	let t10;
	let button0_disabled_value;
	let t11;
	let button1;
	let t12;
	let button1_disabled_value;
	let t13;
	let button2;
	let t15;
	let if_block4_anchor;
	let mounted;
	let dispose;
	let if_block0 = /*alerts*/ ctx[82].length > 0 && create_if_block_11(ctx);
	let if_block1 = /*wp*/ ctx[80].comment && create_if_block_10(ctx);
	let if_block2 = /*wx*/ ctx[81] && create_if_block_8(ctx);

	function select_block_type_2(ctx, dirty) {
		if (/*index*/ ctx[84] > 0) return create_if_block_6;
		return create_else_block_1;
	}

	let current_block_type = select_block_type_2(ctx);
	let if_block3 = current_block_type(ctx);

	function click_handler_6() {
		return /*click_handler_6*/ ctx[49](/*wp*/ ctx[80]);
	}

	function click_handler_7() {
		return /*click_handler_7*/ ctx[50](/*wp*/ ctx[80]);
	}

	function click_handler_8() {
		return /*click_handler_8*/ ctx[51](/*wp*/ ctx[80]);
	}

	function click_handler_9() {
		return /*click_handler_9*/ ctx[52](/*wp*/ ctx[80]);
	}

	let if_block4 = /*alerts*/ ctx[82].length > 0 && create_if_block_5(ctx);

	return {
		key: key_1,
		first: null,
		c() {
			div5 = element("div");
			div0 = element("div");
			t0 = text(t0_value);
			t1 = space();
			div2 = element("div");
			div1 = element("div");
			span = element("span");
			t2 = text(t2_value);
			t3 = space();
			t4 = text(t4_value);
			t5 = space();
			if (if_block0) if_block0.c();
			t6 = space();
			if (if_block1) if_block1.c();
			t7 = space();
			if (if_block2) if_block2.c();
			t8 = space();
			div3 = element("div");
			if_block3.c();
			t9 = space();
			div4 = element("div");
			button0 = element("button");
			t10 = text("▲");
			t11 = space();
			button1 = element("button");
			t12 = text("▼");
			t13 = space();
			button2 = element("button");
			button2.textContent = "🗑";
			t15 = space();
			if (if_block4) if_block4.c();
			if_block4_anchor = empty();
			attr(div0, "class", "wp-index svelte-4szoo7");
			attr(span, "class", "wp-type-icon svelte-4szoo7");
			attr(div1, "class", "wp-name svelte-4szoo7");
			attr(div2, "class", "wp-info svelte-4szoo7");
			attr(div3, "class", "wp-nav svelte-4szoo7");
			attr(button0, "class", "btn-move svelte-4szoo7");
			attr(button0, "title", "Move up");
			button0.disabled = button0_disabled_value = /*index*/ ctx[84] === 0;
			attr(button1, "class", "btn-move svelte-4szoo7");
			attr(button1, "title", "Move down");
			button1.disabled = button1_disabled_value = /*index*/ ctx[84] === /*flightPlan*/ ctx[0].waypoints.length - 1;
			attr(button2, "class", "btn-delete svelte-4szoo7");
			attr(button2, "title", "Delete waypoint");
			attr(div4, "class", "wp-actions svelte-4szoo7");
			attr(div5, "class", "waypoint-row svelte-4szoo7");
			toggle_class(div5, "selected", /*selectedWaypointId*/ ctx[1] === /*wp*/ ctx[80].id);
			toggle_class(div5, "has-warning", /*alerts*/ ctx[82].some(func_1));
			toggle_class(div5, "has-caution", /*alerts*/ ctx[82].some(func_2));
			this.first = div5;
		},
		m(target, anchor) {
			insert(target, div5, anchor);
			append(div5, div0);
			append(div0, t0);
			append(div5, t1);
			append(div5, div2);
			append(div2, div1);
			append(div1, span);
			append(span, t2);
			append(div1, t3);
			append(div1, t4);
			append(div1, t5);
			if (if_block0) if_block0.m(div1, null);
			append(div2, t6);
			if (if_block1) if_block1.m(div2, null);
			append(div2, t7);
			if (if_block2) if_block2.m(div2, null);
			append(div5, t8);
			append(div5, div3);
			if_block3.m(div3, null);
			append(div5, t9);
			append(div5, div4);
			append(div4, button0);
			append(button0, t10);
			append(div4, t11);
			append(div4, button1);
			append(button1, t12);
			append(div4, t13);
			append(div4, button2);
			insert(target, t15, anchor);
			if (if_block4) if_block4.m(target, anchor);
			insert(target, if_block4_anchor, anchor);

			if (!mounted) {
				dispose = [
					listen(button0, "click", stop_propagation(click_handler_6)),
					listen(button1, "click", stop_propagation(click_handler_7)),
					listen(button2, "click", stop_propagation(click_handler_8)),
					listen(div5, "click", click_handler_9)
				];

				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;
			if (dirty[0] & /*flightPlan*/ 1 && t0_value !== (t0_value = /*index*/ ctx[84] + 1 + "")) set_data(t0, t0_value);
			if (dirty[0] & /*flightPlan*/ 1 && t2_value !== (t2_value = getWaypointIcon(/*wp*/ ctx[80].type) + "")) set_data(t2, t2_value);
			if (dirty[0] & /*flightPlan*/ 1 && t4_value !== (t4_value = /*wp*/ ctx[80].name + "")) set_data(t4, t4_value);

			if (/*alerts*/ ctx[82].length > 0) {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_11(ctx);
					if_block0.c();
					if_block0.m(div1, null);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (/*wp*/ ctx[80].comment) {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block_10(ctx);
					if_block1.c();
					if_block1.m(div2, t7);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}

			if (/*wx*/ ctx[81]) {
				if (if_block2) {
					if_block2.p(ctx, dirty);
				} else {
					if_block2 = create_if_block_8(ctx);
					if_block2.c();
					if_block2.m(div2, null);
				}
			} else if (if_block2) {
				if_block2.d(1);
				if_block2 = null;
			}

			if (current_block_type === (current_block_type = select_block_type_2(ctx)) && if_block3) {
				if_block3.p(ctx, dirty);
			} else {
				if_block3.d(1);
				if_block3 = current_block_type(ctx);

				if (if_block3) {
					if_block3.c();
					if_block3.m(div3, null);
				}
			}

			if (dirty[0] & /*flightPlan*/ 1 && button0_disabled_value !== (button0_disabled_value = /*index*/ ctx[84] === 0)) {
				button0.disabled = button0_disabled_value;
			}

			if (dirty[0] & /*flightPlan*/ 1 && button1_disabled_value !== (button1_disabled_value = /*index*/ ctx[84] === /*flightPlan*/ ctx[0].waypoints.length - 1)) {
				button1.disabled = button1_disabled_value;
			}

			if (dirty[0] & /*selectedWaypointId, flightPlan*/ 3) {
				toggle_class(div5, "selected", /*selectedWaypointId*/ ctx[1] === /*wp*/ ctx[80].id);
			}

			if (dirty[0] & /*flightPlan*/ 1 | dirty[1] & /*getWaypointAlerts*/ 32) {
				toggle_class(div5, "has-warning", /*alerts*/ ctx[82].some(func_1));
			}

			if (dirty[0] & /*flightPlan*/ 1 | dirty[1] & /*getWaypointAlerts*/ 32) {
				toggle_class(div5, "has-caution", /*alerts*/ ctx[82].some(func_2));
			}

			if (/*alerts*/ ctx[82].length > 0) {
				if (if_block4) {
					if_block4.p(ctx, dirty);
				} else {
					if_block4 = create_if_block_5(ctx);
					if_block4.c();
					if_block4.m(if_block4_anchor.parentNode, if_block4_anchor);
				}
			} else if (if_block4) {
				if_block4.d(1);
				if_block4 = null;
			}
		},
		d(detaching) {
			if (detaching) {
				detach(div5);
				detach(t15);
				detach(if_block4_anchor);
			}

			if (if_block0) if_block0.d();
			if (if_block1) if_block1.d();
			if (if_block2) if_block2.d();
			if_block3.d();
			if (if_block4) if_block4.d(detaching);
			mounted = false;
			run_all(dispose);
		}
	};
}

// (263:4) {#if activeTab === 'profile' && flightPlan && flightPlan.waypoints.length >= 2}
function create_if_block_1(ctx) {
	let current_block_type_index;
	let if_block;
	let if_block_anchor;
	let current;
	const if_block_creators = [create_if_block_2, create_else_block];
	const if_blocks = [];

	function select_block_type_3(ctx, dirty) {
		if (/*weatherData*/ ctx[8].size === 0) return 0;
		return 1;
	}

	current_block_type_index = select_block_type_3(ctx);
	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

	return {
		c() {
			if_block.c();
			if_block_anchor = empty();
		},
		m(target, anchor) {
			if_blocks[current_block_type_index].m(target, anchor);
			insert(target, if_block_anchor, anchor);
			current = true;
		},
		p(ctx, dirty) {
			let previous_block_index = current_block_type_index;
			current_block_type_index = select_block_type_3(ctx);

			if (current_block_type_index === previous_block_index) {
				if_blocks[current_block_type_index].p(ctx, dirty);
			} else {
				group_outros();

				transition_out(if_blocks[previous_block_index], 1, 1, () => {
					if_blocks[previous_block_index] = null;
				});

				check_outros();
				if_block = if_blocks[current_block_type_index];

				if (!if_block) {
					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
					if_block.c();
				} else {
					if_block.p(ctx, dirty);
				}

				transition_in(if_block, 1);
				if_block.m(if_block_anchor.parentNode, if_block_anchor);
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block);
			current = true;
		},
		o(local) {
			transition_out(if_block);
			current = false;
		},
		d(detaching) {
			if (detaching) {
				detach(if_block_anchor);
			}

			if_blocks[current_block_type_index].d(detaching);
		}
	};
}

// (268:8) {:else}
function create_else_block(ctx) {
	let altitudeprofile;
	let current;

	altitudeprofile = new AltitudeProfile({
			props: {
				flightPlan: /*flightPlan*/ ctx[0],
				weatherData: /*weatherData*/ ctx[8],
				elevationProfile: /*elevationProfile*/ ctx[11],
				settings: /*settings*/ ctx[15],
				maxAltitude: /*maxProfileAltitude*/ ctx[16],
				scale: /*profileScale*/ ctx[17]
			}
		});

	altitudeprofile.$on("waypointClick", /*waypointClick_handler*/ ctx[53]);

	return {
		c() {
			create_component(altitudeprofile.$$.fragment);
		},
		m(target, anchor) {
			mount_component(altitudeprofile, target, anchor);
			current = true;
		},
		p(ctx, dirty) {
			const altitudeprofile_changes = {};
			if (dirty[0] & /*flightPlan*/ 1) altitudeprofile_changes.flightPlan = /*flightPlan*/ ctx[0];
			if (dirty[0] & /*weatherData*/ 256) altitudeprofile_changes.weatherData = /*weatherData*/ ctx[8];
			if (dirty[0] & /*elevationProfile*/ 2048) altitudeprofile_changes.elevationProfile = /*elevationProfile*/ ctx[11];
			if (dirty[0] & /*settings*/ 32768) altitudeprofile_changes.settings = /*settings*/ ctx[15];
			if (dirty[0] & /*maxProfileAltitude*/ 65536) altitudeprofile_changes.maxAltitude = /*maxProfileAltitude*/ ctx[16];
			if (dirty[0] & /*profileScale*/ 131072) altitudeprofile_changes.scale = /*profileScale*/ ctx[17];
			altitudeprofile.$set(altitudeprofile_changes);
		},
		i(local) {
			if (current) return;
			transition_in(altitudeprofile.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(altitudeprofile.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			destroy_component(altitudeprofile, detaching);
		}
	};
}

// (264:8) {#if weatherData.size === 0}
function create_if_block_2(ctx) {
	let div;

	return {
		c() {
			div = element("div");
			div.innerHTML = `<p class="svelte-4szoo7">Please click &quot;Read Wx&quot; to fetch weather data before viewing the profile.</p>`;
			attr(div, "class", "profile-empty svelte-4szoo7");
		},
		m(target, anchor) {
			insert(target, div, anchor);
		},
		p: noop,
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) {
				detach(div);
			}
		}
	};
}

// (282:4) {#if activeTab === 'settings' && flightPlan}
function create_if_block(ctx) {
	let div14;
	let div1;
	let label0;
	let t1;
	let div0;
	let input0;
	let t2;
	let span0;
	let t4;
	let div3;
	let label1;
	let t6;
	let div2;
	let input1;
	let t7;
	let span1;
	let t9;
	let div4;
	let label2;
	let input2;
	let t10;
	let t11;
	let div5;
	let label3;
	let input3;
	let t12;
	let t13;
	let div8;
	let label4;
	let t15;
	let div6;
	let input4;
	let t16;
	let span2;
	let t18;
	let div7;
	let t19;
	let br;
	let t20;
	let t21_value = /*settings*/ ctx[15].terrainSampleInterval + "";
	let t21;
	let t22;
	let t23_value = Math.ceil((/*flightPlan*/ ctx[0].totals.distance || 0) / /*settings*/ ctx[15].terrainSampleInterval) + /*flightPlan*/ ctx[0].waypoints.length + "";
	let t23;
	let t24;
	let t25;
	let div11;
	let label5;
	let t27;
	let div9;
	let input5;
	let t28;
	let span3;
	let t30;
	let div10;
	let t32;
	let div12;
	let label6;
	let input6;
	let t33;
	let t34;
	let div13;
	let p;
	let t35;

	let t36_value = (/*settings*/ ctx[15].allowDrag
	? 'Drag markers on map to reposition waypoints'
	: 'Enable dragging to reposition waypoints') + "";

	let t36;
	let mounted;
	let dispose;

	return {
		c() {
			div14 = element("div");
			div1 = element("div");
			label0 = element("label");
			label0.textContent = "Default Airspeed (TAS)";
			t1 = space();
			div0 = element("div");
			input0 = element("input");
			t2 = space();
			span0 = element("span");
			span0.textContent = "kt";
			t4 = space();
			div3 = element("div");
			label1 = element("label");
			label1.textContent = "Default Altitude";
			t6 = space();
			div2 = element("div");
			input1 = element("input");
			t7 = space();
			span1 = element("span");
			span1.textContent = "ft";
			t9 = space();
			div4 = element("div");
			label2 = element("label");
			input2 = element("input");
			t10 = text("\n                    Allow waypoint dragging");
			t11 = space();
			div5 = element("div");
			label3 = element("label");
			input3 = element("input");
			t12 = text("\n                    Show waypoint labels on map");
			t13 = space();
			div8 = element("div");
			label4 = element("label");
			label4.textContent = "Terrain Sample Interval";
			t15 = space();
			div6 = element("div");
			input4 = element("input");
			t16 = space();
			span2 = element("span");
			span2.textContent = "NM";
			t18 = space();
			div7 = element("div");
			t19 = text("Distance between terrain elevation samples. Lower = more detail, but slower.\n                    ");
			br = element("br");
			t20 = text("Current: ");
			t21 = text(t21_value);
			t22 = text(" NM interval will fetch ~");
			t23 = text(t23_value);
			t24 = text(" elevation points");
			t25 = space();
			div11 = element("div");
			label5 = element("label");
			label5.textContent = "Profile Top Height";
			t27 = space();
			div9 = element("div");
			input5 = element("input");
			t28 = space();
			span3 = element("span");
			span3.textContent = "ft MSL";
			t30 = space();
			div10 = element("div");
			div10.textContent = "Maximum altitude displayed on the altitude profile graph.";
			t32 = space();
			div12 = element("div");
			label6 = element("label");
			input6 = element("input");
			t33 = text("\n                    Enable debug logging");
			t34 = space();
			div13 = element("div");
			p = element("p");
			t35 = text("Tip: ");
			t36 = text(t36_value);
			attr(label0, "class", "setting-label svelte-4szoo7");
			attr(input0, "type", "number");
			attr(input0, "min", "50");
			attr(input0, "max", "500");
			attr(input0, "class", "svelte-4szoo7");
			attr(span0, "class", "unit svelte-4szoo7");
			attr(div0, "class", "setting-input svelte-4szoo7");
			attr(div1, "class", "setting-group svelte-4szoo7");
			attr(label1, "class", "setting-label svelte-4szoo7");
			attr(input1, "type", "number");
			attr(input1, "min", "0");
			attr(input1, "max", "45000");
			attr(input1, "step", "500");
			attr(input1, "class", "svelte-4szoo7");
			attr(span1, "class", "unit svelte-4szoo7");
			attr(div2, "class", "setting-input svelte-4szoo7");
			attr(div3, "class", "setting-group svelte-4szoo7");
			attr(input2, "type", "checkbox");
			attr(input2, "class", "svelte-4szoo7");
			attr(label2, "class", "setting-checkbox svelte-4szoo7");
			attr(div4, "class", "setting-group svelte-4szoo7");
			attr(input3, "type", "checkbox");
			attr(input3, "class", "svelte-4szoo7");
			attr(label3, "class", "setting-checkbox svelte-4szoo7");
			attr(div5, "class", "setting-group svelte-4szoo7");
			attr(label4, "class", "setting-label svelte-4szoo7");
			attr(input4, "type", "number");
			attr(input4, "min", "1");
			attr(input4, "max", "10");
			attr(input4, "step", "0.5");
			attr(input4, "class", "svelte-4szoo7");
			attr(span2, "class", "unit svelte-4szoo7");
			attr(div6, "class", "setting-input svelte-4szoo7");
			attr(div7, "class", "setting-description svelte-4szoo7");
			attr(div8, "class", "setting-group svelte-4szoo7");
			attr(label5, "class", "setting-label svelte-4szoo7");
			attr(input5, "type", "number");
			attr(input5, "min", "1000");
			attr(input5, "max", "60000");
			attr(input5, "step", "1000");
			attr(input5, "class", "svelte-4szoo7");
			attr(span3, "class", "unit svelte-4szoo7");
			attr(div9, "class", "setting-input svelte-4szoo7");
			attr(div10, "class", "setting-description svelte-4szoo7");
			attr(div11, "class", "setting-group svelte-4szoo7");
			attr(input6, "type", "checkbox");
			attr(input6, "class", "svelte-4szoo7");
			attr(label6, "class", "setting-checkbox svelte-4szoo7");
			attr(div12, "class", "setting-group svelte-4szoo7");
			attr(p, "class", "svelte-4szoo7");
			attr(div13, "class", "setting-info svelte-4szoo7");
			attr(div14, "class", "settings-section svelte-4szoo7");
		},
		m(target, anchor) {
			insert(target, div14, anchor);
			append(div14, div1);
			append(div1, label0);
			append(div1, t1);
			append(div1, div0);
			append(div0, input0);
			set_input_value(input0, /*settings*/ ctx[15].defaultAirspeed);
			append(div0, t2);
			append(div0, span0);
			append(div14, t4);
			append(div14, div3);
			append(div3, label1);
			append(div3, t6);
			append(div3, div2);
			append(div2, input1);
			set_input_value(input1, /*settings*/ ctx[15].defaultAltitude);
			append(div2, t7);
			append(div2, span1);
			append(div14, t9);
			append(div14, div4);
			append(div4, label2);
			append(label2, input2);
			input2.checked = /*settings*/ ctx[15].allowDrag;
			append(label2, t10);
			append(div14, t11);
			append(div14, div5);
			append(div5, label3);
			append(label3, input3);
			input3.checked = /*settings*/ ctx[15].showLabels;
			append(label3, t12);
			append(div14, t13);
			append(div14, div8);
			append(div8, label4);
			append(div8, t15);
			append(div8, div6);
			append(div6, input4);
			set_input_value(input4, /*settings*/ ctx[15].terrainSampleInterval);
			append(div6, t16);
			append(div6, span2);
			append(div8, t18);
			append(div8, div7);
			append(div7, t19);
			append(div7, br);
			append(div7, t20);
			append(div7, t21);
			append(div7, t22);
			append(div7, t23);
			append(div7, t24);
			append(div14, t25);
			append(div14, div11);
			append(div11, label5);
			append(div11, t27);
			append(div11, div9);
			append(div9, input5);
			set_input_value(input5, /*maxProfileAltitude*/ ctx[16]);
			append(div9, t28);
			append(div9, span3);
			append(div11, t30);
			append(div11, div10);
			append(div14, t32);
			append(div14, div12);
			append(div12, label6);
			append(label6, input6);
			input6.checked = /*settings*/ ctx[15].enableLogging;
			append(label6, t33);
			append(div14, t34);
			append(div14, div13);
			append(div13, p);
			append(p, t35);
			append(p, t36);

			if (!mounted) {
				dispose = [
					listen(input0, "input", /*input0_input_handler*/ ctx[54]),
					listen(input0, "change", /*handleSettingsChange*/ ctx[30]),
					listen(input1, "input", /*input1_input_handler*/ ctx[55]),
					listen(input1, "change", /*handleSettingsChange*/ ctx[30]),
					listen(input2, "change", /*input2_change_handler*/ ctx[56]),
					listen(input2, "change", /*handleSettingsChange*/ ctx[30]),
					listen(input3, "change", /*input3_change_handler*/ ctx[57]),
					listen(input3, "change", /*handleSettingsChange*/ ctx[30]),
					listen(input4, "input", /*input4_input_handler*/ ctx[58]),
					listen(input4, "change", /*handleSettingsChange*/ ctx[30]),
					listen(input5, "input", /*input5_input_handler*/ ctx[59]),
					listen(input6, "change", /*input6_change_handler*/ ctx[60]),
					listen(input6, "change", /*handleSettingsChange*/ ctx[30])
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (dirty[0] & /*settings*/ 32768 && to_number(input0.value) !== /*settings*/ ctx[15].defaultAirspeed) {
				set_input_value(input0, /*settings*/ ctx[15].defaultAirspeed);
			}

			if (dirty[0] & /*settings*/ 32768 && to_number(input1.value) !== /*settings*/ ctx[15].defaultAltitude) {
				set_input_value(input1, /*settings*/ ctx[15].defaultAltitude);
			}

			if (dirty[0] & /*settings*/ 32768) {
				input2.checked = /*settings*/ ctx[15].allowDrag;
			}

			if (dirty[0] & /*settings*/ 32768) {
				input3.checked = /*settings*/ ctx[15].showLabels;
			}

			if (dirty[0] & /*settings*/ 32768 && to_number(input4.value) !== /*settings*/ ctx[15].terrainSampleInterval) {
				set_input_value(input4, /*settings*/ ctx[15].terrainSampleInterval);
			}

			if (dirty[0] & /*settings*/ 32768 && t21_value !== (t21_value = /*settings*/ ctx[15].terrainSampleInterval + "")) set_data(t21, t21_value);
			if (dirty[0] & /*flightPlan, settings*/ 32769 && t23_value !== (t23_value = Math.ceil((/*flightPlan*/ ctx[0].totals.distance || 0) / /*settings*/ ctx[15].terrainSampleInterval) + /*flightPlan*/ ctx[0].waypoints.length + "")) set_data(t23, t23_value);

			if (dirty[0] & /*maxProfileAltitude*/ 65536 && to_number(input5.value) !== /*maxProfileAltitude*/ ctx[16]) {
				set_input_value(input5, /*maxProfileAltitude*/ ctx[16]);
			}

			if (dirty[0] & /*settings*/ 32768) {
				input6.checked = /*settings*/ ctx[15].enableLogging;
			}

			if (dirty[0] & /*settings*/ 32768 && t36_value !== (t36_value = (/*settings*/ ctx[15].allowDrag
			? 'Drag markers on map to reposition waypoints'
			: 'Enable dragging to reposition waypoints') + "")) set_data(t36, t36_value);
		},
		d(detaching) {
			if (detaching) {
				detach(div14);
			}

			mounted = false;
			run_all(dispose);
		}
	};
}

function create_fragment(ctx) {
	let div0;
	let t1;
	let section;
	let div1;
	let t3;
	let t4;
	let div3;
	let div2;
	let input;
	let t5;
	let t6;
	let t7;
	let t8;
	let t9;
	let current;
	let mounted;
	let dispose;
	let if_block0 = /*flightPlan*/ ctx[0] && create_if_block_21(ctx);

	function select_block_type(ctx, dirty) {
		if (/*isLoading*/ ctx[2]) return create_if_block_19;
		if (!/*flightPlan*/ ctx[0]) return create_if_block_20;
		return create_else_block_3;
	}

	let current_block_type = select_block_type(ctx);
	let if_block1 = current_block_type(ctx);
	let if_block2 = /*error*/ ctx[4] && create_if_block_18(ctx);
	let if_block3 = /*activeTab*/ ctx[6] === 'route' && create_if_block_3(ctx);
	let if_block4 = /*activeTab*/ ctx[6] === 'profile' && /*flightPlan*/ ctx[0] && /*flightPlan*/ ctx[0].waypoints.length >= 2 && create_if_block_1(ctx);
	let if_block5 = /*activeTab*/ ctx[6] === 'settings' && /*flightPlan*/ ctx[0] && create_if_block(ctx);

	return {
		c() {
			div0 = element("div");
			div0.textContent = `${/*title*/ ctx[18]}`;
			t1 = space();
			section = element("section");
			div1 = element("div");
			div1.textContent = `${/*title*/ ctx[18]}`;
			t3 = space();
			if (if_block0) if_block0.c();
			t4 = space();
			div3 = element("div");
			div2 = element("div");
			input = element("input");
			t5 = space();
			if_block1.c();
			t6 = space();
			if (if_block2) if_block2.c();
			t7 = space();
			if (if_block3) if_block3.c();
			t8 = space();
			if (if_block4) if_block4.c();
			t9 = space();
			if (if_block5) if_block5.c();
			attr(div0, "class", "plugin__mobile-header");
			attr(div1, "class", "plugin__title plugin__title--chevron-back");
			attr(input, "type", "file");
			attr(input, "accept", ".fpl,.xml");
			set_style(input, "display", "none");
			attr(div2, "class", "drop-zone svelte-4szoo7");
			toggle_class(div2, "drag-over", /*isDragOver*/ ctx[3]);
			attr(div3, "class", "import-section svelte-4szoo7");
			attr(section, "class", "plugin__content");
		},
		m(target, anchor) {
			insert(target, div0, anchor);
			insert(target, t1, anchor);
			insert(target, section, anchor);
			append(section, div1);
			append(section, t3);
			if (if_block0) if_block0.m(section, null);
			append(section, t4);
			append(section, div3);
			append(div3, div2);
			append(div2, input);
			/*input_binding*/ ctx[45](input);
			append(div2, t5);
			if_block1.m(div2, null);
			append(div3, t6);
			if (if_block2) if_block2.m(div3, null);
			append(section, t7);
			if (if_block3) if_block3.m(section, null);
			append(section, t8);
			if (if_block4) if_block4.m(section, null);
			append(section, t9);
			if (if_block5) if_block5.m(section, null);
			current = true;

			if (!mounted) {
				dispose = [
					listen(div1, "click", /*click_handler*/ ctx[41]),
					listen(input, "change", /*handleFileSelect*/ ctx[22]),
					listen(div2, "dragover", /*handleDragOver*/ ctx[19]),
					listen(div2, "dragleave", /*handleDragLeave*/ ctx[20]),
					listen(div2, "drop", /*handleDrop*/ ctx[21])
				];

				mounted = true;
			}
		},
		p(ctx, dirty) {
			if (/*flightPlan*/ ctx[0]) {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_21(ctx);
					if_block0.c();
					if_block0.m(section, t4);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block1) {
				if_block1.p(ctx, dirty);
			} else {
				if_block1.d(1);
				if_block1 = current_block_type(ctx);

				if (if_block1) {
					if_block1.c();
					if_block1.m(div2, null);
				}
			}

			if (!current || dirty[0] & /*isDragOver*/ 8) {
				toggle_class(div2, "drag-over", /*isDragOver*/ ctx[3]);
			}

			if (/*error*/ ctx[4]) {
				if (if_block2) {
					if_block2.p(ctx, dirty);
				} else {
					if_block2 = create_if_block_18(ctx);
					if_block2.c();
					if_block2.m(div3, null);
				}
			} else if (if_block2) {
				if_block2.d(1);
				if_block2 = null;
			}

			if (/*activeTab*/ ctx[6] === 'route') {
				if (if_block3) {
					if_block3.p(ctx, dirty);
				} else {
					if_block3 = create_if_block_3(ctx);
					if_block3.c();
					if_block3.m(section, t8);
				}
			} else if (if_block3) {
				if_block3.d(1);
				if_block3 = null;
			}

			if (/*activeTab*/ ctx[6] === 'profile' && /*flightPlan*/ ctx[0] && /*flightPlan*/ ctx[0].waypoints.length >= 2) {
				if (if_block4) {
					if_block4.p(ctx, dirty);

					if (dirty[0] & /*activeTab, flightPlan*/ 65) {
						transition_in(if_block4, 1);
					}
				} else {
					if_block4 = create_if_block_1(ctx);
					if_block4.c();
					transition_in(if_block4, 1);
					if_block4.m(section, t9);
				}
			} else if (if_block4) {
				group_outros();

				transition_out(if_block4, 1, 1, () => {
					if_block4 = null;
				});

				check_outros();
			}

			if (/*activeTab*/ ctx[6] === 'settings' && /*flightPlan*/ ctx[0]) {
				if (if_block5) {
					if_block5.p(ctx, dirty);
				} else {
					if_block5 = create_if_block(ctx);
					if_block5.c();
					if_block5.m(section, null);
				}
			} else if (if_block5) {
				if_block5.d(1);
				if_block5 = null;
			}
		},
		i(local) {
			if (current) return;
			transition_in(if_block4);
			current = true;
		},
		o(local) {
			transition_out(if_block4);
			current = false;
		},
		d(detaching) {
			if (detaching) {
				detach(div0);
				detach(t1);
				detach(section);
			}

			if (if_block0) if_block0.d();
			/*input_binding*/ ctx[45](null);
			if_block1.d();
			if (if_block2) if_block2.d();
			if (if_block3) if_block3.d();
			if (if_block4) if_block4.d();
			if (if_block5) if_block5.d();
			mounted = false;
			run_all(dispose);
		}
	};
}

function getSegmentColor(condition) {
	switch (condition) {
		case 'good':
			return '#4caf50';
		case 'marginal':
			return '#ff9800';
		case 'poor':
			return '#f44336';
		case 'unknown':
		default:
			return '#757575';
	}
}

function getWaypointIcon(type) {
	switch (type) {
		case 'AIRPORT':
			return '🛫';
		case 'VOR':
			return '📡';
		case 'NDB':
			return '📻';
		case 'INT':
		case 'INT-VRP':
			return '📍';
		case 'USER WAYPOINT':
		default:
			return '📌';
	}
}

function getMarkerColor(type) {
	switch (type) {
		case 'AIRPORT':
			return '#e74c3c';
		case 'VOR':
			return '#3498db';
		case 'NDB':
			return '#9b59b6';
		case 'INT':
		case 'INT-VRP':
			return '#2ecc71';
		case 'USER WAYPOINT':
		default:
			return '#f39c12';
	}
}

function formatDepartureTime(timestamp) {
	const date = new Date(timestamp);
	const now = new Date();
	const isToday = date.toDateString() === now.toDateString();
	const tomorrow = new Date(now);
	tomorrow.setDate(tomorrow.getDate() + 1);
	const isTomorrow = date.toDateString() === tomorrow.toDateString();
	const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

	if (isToday) {
		return `Today ${timeStr}`;
	} else if (isTomorrow) {
		return `Tomorrow ${timeStr}`;
	} else {
		const dateStr = date.toLocaleDateString([], {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});

		return `${dateStr} ${timeStr}`;
	}
}

function formatShortTime(timestamp) {
	const date = new Date(timestamp);
	const now = new Date();
	const isToday = date.toDateString() === now.toDateString();

	if (isToday) {
		return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
	} else {
		return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
	}
}

const func = a => a.severity === 'warning';
const func_1 = a => a.severity === 'warning';
const func_2 = a => a.severity === 'caution';

function instance($$self, $$props, $$invalidate) {
	const { name, title } = config;
	const STORAGE_KEY = `vfr-planner-session-${name}`;
	let flightPlan = null;
	let selectedWaypointId = null;
	let isLoading = false;
	let isDragOver = false;
	let error = null;
	let fileInput;
	let activeTab = 'route';
	let isAddingWaypoint = false;
	let weatherData = new Map();
	let weatherAlerts = new Map();
	let isLoadingWeather = false;
	let weatherError = null;
	let elevationProfile = [];
	let departureTime = Date.now();
	let forecastRange = null;
	let syncWithWindy = true;
	let isUpdatingFromWindy = false;
	let isUpdatingToWindy = false;
	let settings = { ...DEFAULT_SETTINGS };
	let maxProfileAltitude = 15000;
	let profileScale = 511;
	let routeLayer = null;
	let waypointMarkers = null;
	let markerMap = new Map();

	function handleDragOver(event) {
		event.preventDefault();
		$$invalidate(3, isDragOver = true);
	}

	function handleDragLeave() {
		$$invalidate(3, isDragOver = false);
	}

	async function handleDrop(event) {
		event.preventDefault();
		$$invalidate(3, isDragOver = false);
		const files = event.dataTransfer?.files;

		if (files && files.length > 0) {
			await loadFile(files[0]);
		}
	}

	async function handleFileSelect(event) {
		const input = event.target;

		if (input.files && input.files.length > 0) {
			await loadFile(input.files[0]);
		}
	}

	async function loadFile(file) {
		$$invalidate(4, error = null);
		$$invalidate(2, isLoading = true);

		try {
			const result = await readFPLFile(file);

			if (!result.success || !result.flightPlan) {
				$$invalidate(4, error = result.error || 'Failed to parse file');
				$$invalidate(2, isLoading = false);
				return;
			}

			const validation = validateFPL(result.flightPlan);

			if (!validation.valid) {
				$$invalidate(4, error = validation.errors.map(e => e.message).join(', '));
				$$invalidate(2, isLoading = false);
				return;
			}

			let plan = convertToFlightPlan(result.flightPlan, file.name);
			plan.aircraft.airspeed = settings.defaultAirspeed;
			plan.aircraft.defaultAltitude = settings.defaultAltitude;
			const navResult = calculateFlightPlanNavigation(plan.waypoints, plan.aircraft.airspeed);

			plan = {
				...plan,
				waypoints: navResult.waypoints,
				totals: navResult.totals
			};

			$$invalidate(0, flightPlan = plan);
			updateMapLayers();
			fitMapToRoute();
			saveSession();
		} catch(err) {
			$$invalidate(4, error = err instanceof Error ? err.message : 'Unknown error');
		} finally {
			$$invalidate(2, isLoading = false);
		}
	}

	function clearFlightPlan() {
		$$invalidate(0, flightPlan = null);
		$$invalidate(1, selectedWaypointId = null);
		$$invalidate(4, error = null);
		$$invalidate(7, isAddingWaypoint = false);
		$$invalidate(6, activeTab = 'route');
		$$invalidate(8, weatherData = new Map());
		weatherAlerts = new Map();
		$$invalidate(10, weatherError = null);
		$$invalidate(13, forecastRange = null);
		$$invalidate(12, departureTime = Date.now());
		clearMapLayers();
		saveSession();
	}

	function selectWaypoint(wp) {
		$$invalidate(1, selectedWaypointId = wp.id);
		map.panTo([wp.lat, wp.lon]);
	}

	function selectWaypointById(waypointId) {
		if (!flightPlan) return;
		const wp = flightPlan.waypoints.find(w => w.id === waypointId);

		if (wp) {
			selectWaypoint(wp);
			$$invalidate(6, activeTab = 'route');
		}
	}

	async function insertWaypointOnSegment(segmentIndex, lat, lon) {
		if (!flightPlan) return;

		const newWaypoint = {
			id: `wp_${Date.now()}`,
			name: `WP${flightPlan.waypoints.length + 1}`,
			type: 'user',
			lat,
			lon,
			altitude: flightPlan.aircraft.defaultAltitude
		};

		const newWaypoints = [
			...flightPlan.waypoints.slice(0, segmentIndex + 1),
			newWaypoint,
			...flightPlan.waypoints.slice(segmentIndex + 1)
		];

		const navResult = calculateFlightPlanNavigation(newWaypoints, flightPlan.aircraft.airspeed);

		$$invalidate(0, flightPlan = {
			...flightPlan,
			waypoints: navResult.waypoints,
			totals: navResult.totals
		});

		await tick();

		if (settings.enableLogging) {
			console.log('[VFR Planner] Inserted waypoint:', newWaypoint.name, 'at', segmentIndex + 1, 'Total waypoints:', flightPlan.waypoints.length);
		}

		if (settings.enableLogging) {
			console.log('[VFR Planner] Scheduling updateMapLayers via requestAnimationFrame');
		}

		requestAnimationFrame(() => {
			if (settings.enableLogging) {
				console.log('[VFR Planner] requestAnimationFrame callback executing');
			}

			updateMapLayers();
		});

		saveSession();
		$$invalidate(1, selectedWaypointId = newWaypoint.id);
	}

	async function moveWaypointUp(waypointId) {
		if (!flightPlan) return;
		const index = flightPlan.waypoints.findIndex(wp => wp.id === waypointId);
		if (index <= 0) return;
		const newWaypoints = [...flightPlan.waypoints];
		const temp = newWaypoints[index - 1];
		newWaypoints[index - 1] = newWaypoints[index];
		newWaypoints[index] = temp;
		const navResult = calculateFlightPlanNavigation(newWaypoints, flightPlan.aircraft.airspeed);

		$$invalidate(0, flightPlan = {
			...flightPlan,
			waypoints: navResult.waypoints,
			totals: navResult.totals
		});

		await tick();

		if (settings.enableLogging) {
			console.log('[VFR Planner] Moved waypoint up:', newWaypoints[index - 1].name);
		}

		if (settings.enableLogging) {
			console.log('[VFR Planner] Scheduling updateMapLayers via requestAnimationFrame');
		}

		requestAnimationFrame(() => {
			if (settings.enableLogging) {
				console.log('[VFR Planner] requestAnimationFrame callback executing');
			}

			updateMapLayers();
		});

		saveSession();
	}

	async function moveWaypointDown(waypointId) {
		if (!flightPlan) return;
		const index = flightPlan.waypoints.findIndex(wp => wp.id === waypointId);
		if (index < 0 || index >= flightPlan.waypoints.length - 1) return;
		const newWaypoints = [...flightPlan.waypoints];
		const temp = newWaypoints[index];
		newWaypoints[index] = newWaypoints[index + 1];
		newWaypoints[index + 1] = temp;
		const navResult = calculateFlightPlanNavigation(newWaypoints, flightPlan.aircraft.airspeed);

		$$invalidate(0, flightPlan = {
			...flightPlan,
			waypoints: navResult.waypoints,
			totals: navResult.totals
		});

		await tick();

		if (settings.enableLogging) {
			console.log('[VFR Planner] Moved waypoint down:', newWaypoints[index + 1].name);
		}

		if (settings.enableLogging) {
			console.log('[VFR Planner] Scheduling updateMapLayers via requestAnimationFrame');
		}

		requestAnimationFrame(() => {
			if (settings.enableLogging) {
				console.log('[VFR Planner] requestAnimationFrame callback executing');
			}

			updateMapLayers();
		});

		saveSession();
	}

	function deleteWaypoint(waypointId) {
		if (!flightPlan) return;
		const newWaypoints = flightPlan.waypoints.filter(wp => wp.id !== waypointId);

		if (newWaypoints.length === 0) {
			clearFlightPlan();
			return;
		}

		const navResult = calculateFlightPlanNavigation(newWaypoints, settings.defaultAirspeed);

		$$invalidate(0, flightPlan = {
			...flightPlan,
			waypoints: navResult.waypoints,
			totals: navResult.totals
		});

		if (selectedWaypointId === waypointId) {
			$$invalidate(1, selectedWaypointId = null);
		}

		updateMapLayers();
		saveSession();
	}

	function handleWaypointDrag(waypointId, newLat, newLon) {
		if (!flightPlan || !settings.allowDrag) return;

		const newWaypoints = flightPlan.waypoints.map(wp => {
			if (wp.id === waypointId) {
				return { ...wp, lat: newLat, lon: newLon };
			}

			return wp;
		});

		const navResult = calculateFlightPlanNavigation(newWaypoints, settings.defaultAirspeed);

		$$invalidate(0, flightPlan = {
			...flightPlan,
			waypoints: navResult.waypoints,
			totals: navResult.totals
		});

		updateMapLayers();
		saveSession();
	}

	function toggleAddWaypoint() {
		$$invalidate(7, isAddingWaypoint = !isAddingWaypoint);
	}

	function handleMapClick(latLon) {
		if (!isAddingWaypoint || !flightPlan) return;
		const { lat, lon } = latLon;

		const newWaypoint = {
			id: `wp-${Date.now()}`,
			name: `WPT${flightPlan.waypoints.length + 1}`,
			type: 'USER WAYPOINT',
			lat,
			lon
		};

		const newWaypoints = [...flightPlan.waypoints, newWaypoint];
		const navResult = calculateFlightPlanNavigation(newWaypoints, settings.defaultAirspeed);

		$$invalidate(0, flightPlan = {
			...flightPlan,
			waypoints: navResult.waypoints,
			totals: navResult.totals
		});

		$$invalidate(7, isAddingWaypoint = false);
		updateMapLayers();
		saveSession();
	}

	function handleSettingsChange() {
		if (!flightPlan) return;
		$$invalidate(0, flightPlan.aircraft.airspeed = settings.defaultAirspeed, flightPlan);
		$$invalidate(0, flightPlan.aircraft.defaultAltitude = settings.defaultAltitude, flightPlan);
		const navResult = calculateFlightPlanNavigation(flightPlan.waypoints, settings.defaultAirspeed);

		$$invalidate(0, flightPlan = {
			...flightPlan,
			waypoints: navResult.waypoints,
			totals: navResult.totals
		});

		updateMapLayers();
		saveSession();
	}

	function handleExportGPX() {
		if (!flightPlan) return;
		downloadGPX(flightPlan);
	}

	function handleSendToDistancePlanning() {
		if (!flightPlan || flightPlan.waypoints.length === 0) return;
		const waypoints = flightPlan.waypoints.map(wp => `${wp.lat.toFixed(4)},${wp.lon.toFixed(4)}`).join(';');
		const windyUrl = `https://www.windy.com/distance/${waypoints}`;
		window.open(windyUrl, '_blank', 'noopener,noreferrer');
	}

	function handleReverseRoute() {
		if (!flightPlan || flightPlan.waypoints.length < 2) return;
		const reversedWaypoints = [...flightPlan.waypoints].reverse();
		let newName = flightPlan.name;
		const nameMatch = flightPlan.name.match(/^(.+?)\s+to\s+(.+)$/i);

		if (nameMatch) {
			newName = `${nameMatch[2]} to ${nameMatch[1]}`;
		} else if (flightPlan.waypoints.length >= 2) {
			const first = reversedWaypoints[0].name;
			const last = reversedWaypoints[reversedWaypoints.length - 1].name;
			newName = `${first} to ${last}`;
		}

		const navResult = calculateFlightPlanNavigation(reversedWaypoints, settings.defaultAirspeed);
		$$invalidate(8, weatherData = new Map());
		weatherAlerts = new Map();
		$$invalidate(10, weatherError = null);

		$$invalidate(0, flightPlan = {
			...flightPlan,
			name: newName,
			waypoints: navResult.waypoints,
			totals: navResult.totals
		});

		$$invalidate(1, selectedWaypointId = null);
		updateMapLayers();
		fitMapToRoute();
		saveSession();
	}

	async function handleReadWeather() {
		if (!flightPlan) return;
		$$invalidate(9, isLoadingWeather = true);
		$$invalidate(10, weatherError = null);

		try {
			if (!forecastRange && flightPlan.waypoints.length > 0) {
				const firstWp = flightPlan.waypoints[0];
				$$invalidate(13, forecastRange = await getForecastTimeRange(firstWp.lat, firstWp.lon));

				if (forecastRange) {
					if (syncWithWindy) {
						const windyTimestamp = store.get('timestamp');

						if (windyTimestamp) {
							$$invalidate(12, departureTime = Math.max(forecastRange.start, Math.min(windyTimestamp, forecastRange.end)));
						} else {
							const now = Date.now();
							$$invalidate(12, departureTime = Math.max(forecastRange.start, Math.min(now, forecastRange.end)));
						}
					} else {
						const now = Date.now();
						$$invalidate(12, departureTime = Math.max(forecastRange.start, Math.min(now, forecastRange.end)));
					}
				}
			}

			const plannedAltitude = flightPlan.aircraft.defaultAltitude;
			const weatherFetchPromise = fetchFlightPlanWeather(flightPlan.waypoints, name, departureTime, plannedAltitude, settings.enableLogging);

			const overallTimeout = new Promise((_, reject) => {
					setTimeout(
						() => {
							reject(new Error('Weather fetch operation timed out after 60 seconds'));
						},
						60000
					);
				});

			$$invalidate(8, weatherData = await Promise.race([weatherFetchPromise, overallTimeout]));
			console.log(`[VFR Debug] Weather fetch complete: ${weatherData.size} waypoints with weather data`);

			if (weatherData.size > 0) {
				console.log(`[VFR Debug] Weather data keys:`, Array.from(weatherData.keys()));

				weatherData.forEach((wx, waypointId) => {
					const wp = flightPlan?.waypoints.find(w => w.id === waypointId);

					console.log(`[VFR Debug] Weather for ${wp?.name || waypointId}:`, {
						wind: `${Math.round(wx.windDir)}° @ ${Math.round(wx.windSpeed)} kt`,
						gust: wx.windGust ? `${Math.round(wx.windGust)} kt` : 'none',
						temp: `${Math.round(wx.temperature)}°C`,
						cloudBase: wx.cloudBase
						? `${Math.round(wx.cloudBase)}m AGL`
						: 'clear',
						visibility: wx.visibility ? `${wx.visibility.toFixed(1)} km` : 'N/A',
						pressure: wx.pressure ? `${Math.round(wx.pressure)} hPa` : 'N/A',
						windAltitude: wx.windAltitude ? `${wx.windAltitude} ft` : 'surface'
					});
				});
			}

			weatherAlerts = new Map();

			weatherData.forEach((wx, waypointId) => {
				const alerts = checkWeatherAlerts(wx, DEFAULT_ALERT_THRESHOLDS, plannedAltitude);

				if (alerts.length > 0) {
					weatherAlerts.set(waypointId, alerts);
				}
			});

			try {
				if (settings.enableLogging) {
					console.log(`[VFR Planner] Fetching terrain elevation profile from Open-Meteo (sampling every ${settings.terrainSampleInterval} NM)...`);
				}

				$$invalidate(11, elevationProfile = await fetchRouteElevationProfile(flightPlan.waypoints, settings.terrainSampleInterval, settings.enableLogging));

				if (settings.enableLogging) {
					console.log(`[VFR Planner] Terrain profile: ${elevationProfile.length} elevation points`);
				}
			} catch(elevError) {
				console.error('[VFR Planner] Error fetching elevation profile:', elevError);
				$$invalidate(11, elevationProfile = []);
			}

			recalculateWithWind();
			updateMapLayers();
		} catch(err) {
			$$invalidate(10, weatherError = err instanceof Error
			? err.message
			: 'Failed to fetch weather');

			console.error('[VFR Planner] Error fetching weather:', err);

			if (!weatherData || weatherData.size === 0) {
				$$invalidate(8, weatherData = new Map());
			}
		} finally {
			$$invalidate(9, isLoadingWeather = false);
		}
	}

	function recalculateWithWind() {
		if (!flightPlan) return;

		const updatedWaypoints = flightPlan.waypoints.map((wp, index) => {
			if (index === 0) return wp;
			flightPlan.waypoints[index - 1];
			const wx = weatherData.get(wp.id);

			if (wx && wp.bearing !== undefined) {
				const gs = calculateGroundSpeed(settings.defaultAirspeed, wp.bearing, wx.windDir, wx.windSpeed);
				const distance = wp.distance || 0;
				const ete = gs > 0 ? distance / gs * 60 : 0;
				return { ...wp, groundSpeed: gs, ete };
			}

			return wp;
		});

		const totalEte = updatedWaypoints.reduce((sum, wp) => sum + (wp.ete || 0), 0);
		const totalDistance = updatedWaypoints.reduce((sum, wp) => sum + (wp.distance || 0), 0);
		let weightedHeadwindSum = 0;

		updatedWaypoints.forEach((wp, index) => {
			if (index === 0) return;
			const wx = weatherData.get(wp.id);

			if (wx && wp.bearing !== undefined && wp.distance) {
				const headwind = calculateHeadwindComponent(wp.bearing, wx.windDir, wx.windSpeed);
				weightedHeadwindSum += headwind * wp.distance;
			}
		});

		const averageHeadwind = totalDistance > 0
		? weightedHeadwindSum / totalDistance
		: undefined;

		$$invalidate(0, flightPlan = {
			...flightPlan,
			waypoints: updatedWaypoints,
			totals: {
				...flightPlan.totals,
				ete: totalEte,
				averageHeadwind
			}
		});
	}

	function getWaypointWeather(waypointId) {
		return weatherData.get(waypointId);
	}

	function getWaypointAlerts(waypointId) {
		return weatherAlerts.get(waypointId) || [];
	}

	function hasAnyAlerts() {
		return weatherAlerts.size > 0;
	}

	async function handleDepartureTimeChange() {
		if (flightPlan && forecastRange) {
			if (syncWithWindy && !isUpdatingFromWindy && !isUpdatingToWindy) {
				isUpdatingToWindy = true;

				try {
					store.set('timestamp', departureTime);
				} finally {
					setTimeout(
						() => {
							isUpdatingToWindy = false;
						},
						100
					);
				}
			}

			await handleReadWeather();
			saveSession();
		}
	}

	function handleWindyTimestampChange(newTimestamp) {
		if (!syncWithWindy || !forecastRange || isLoadingWeather || isUpdatingToWindy) return;
		const clampedTime = Math.max(forecastRange.start, Math.min(newTimestamp, forecastRange.end));

		if (Math.abs(clampedTime - departureTime) > 5000) {
			isUpdatingFromWindy = true;
			$$invalidate(12, departureTime = clampedTime);

			handleReadWeather().finally(() => {
				isUpdatingFromWindy = false;
			});
		}
	}

	function toggleWindySync() {
		$$invalidate(14, syncWithWindy = !syncWithWindy);

		if (syncWithWindy && forecastRange) {
			const windyTimestamp = store.get('timestamp');

			if (windyTimestamp) {
				setTimeout(
					() => {
						handleWindyTimestampChange(windyTimestamp);
					},
					50
				);
			}
		} else if (!syncWithWindy) {
			isUpdatingFromWindy = false;
			isUpdatingToWindy = false;
		}

		saveSession();
	}

	function updateMapLayers() {
		if (settings.enableLogging) {
			console.log('[VFR Planner] updateMapLayers called, waypoints:', flightPlan?.waypoints.length);
			console.log('[VFR Planner] routeLayer exists:', !!routeLayer, 'waypointMarkers exists:', !!waypointMarkers);
		}

		clearMapLayers();

		if (settings.enableLogging) {
			console.log('[VFR Planner] After clearMapLayers: routeLayer:', !!routeLayer, 'waypointMarkers:', !!waypointMarkers);
		}

		if (!flightPlan || flightPlan.waypoints.length === 0) return;
		const profileData = calculateProfileData(flightPlan.waypoints, weatherData, flightPlan.aircraft.defaultAltitude, elevationProfile);
		routeLayer = new L.LayerGroup();

		for (let i = 0; i < flightPlan.waypoints.length - 1; i++) {
			const wp1 = flightPlan.waypoints[i];
			const wp2 = flightPlan.waypoints[i + 1];
			const condition = profileData[i]?.condition;
			const segmentCoords = [[wp1.lat, wp1.lon], [wp2.lat, wp2.lon]];
			const segmentColor = getSegmentColor(condition);

			const segment = new L.Polyline(segmentCoords,
			{
					color: segmentColor,
					weight: 4,
					opacity: 0.8
				});

			segment.on('click', e => {
				if (settings.allowDrag) {
					L.DomEvent.stopPropagation(e);
					insertWaypointOnSegment(i, e.latlng.lat, e.latlng.lng);
				}
			});

			segment.on('mouseover', () => {
				if (settings.allowDrag) {
					map.getContainer().style.cursor = 'crosshair';
				}
			});

			segment.on('mouseout', () => {
				map.getContainer().style.cursor = '';
			});

			routeLayer.addLayer(segment);
		}

		map.addLayer(routeLayer);

		if (settings.enableLogging) {
			console.log('[VFR Planner] Added routeLayer to map with', flightPlan.waypoints.length - 1, 'segments');
		}

		waypointMarkers = new L.LayerGroup();
		markerMap.clear();

		flightPlan.waypoints.forEach((wp, index) => {
			let marker;

			if (settings.allowDrag) {
				marker = new L.Marker([wp.lat, wp.lon],
				{
						draggable: true,
						icon: L.divIcon({
							className: 'wp-marker',
							html: `<div style="
                            width: 16px;
                            height: 16px;
                            border-radius: 50%;
                            background: ${getMarkerColor(wp.type)};
                            border: 2px solid white;
                            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
                        "></div>`,
							iconSize: [16, 16],
							iconAnchor: [8, 8]
						})
					});

				marker.on('dragend', e => {
					const latlng = e.target.getLatLng();
					handleWaypointDrag(wp.id, latlng.lat, latlng.lng);
				});

				markerMap.set(wp.id, marker);
			} else {
				marker = new L.CircleMarker([wp.lat, wp.lon],
				{
						radius: 8,
						fillColor: getMarkerColor(wp.type),
						color: '#fff',
						weight: 2,
						opacity: 1,
						fillOpacity: 0.8
					});
			}

			let tooltipContent = `<b>${index + 1}. ${wp.name}</b>${wp.comment ? `<br/><i>${wp.comment}</i>` : ''}`;
			const altitude = wp.altitude ?? flightPlan.aircraft.defaultAltitude;
			tooltipContent += '<br/><div style="margin-top: 2px; font-size: 11px;">';
			tooltipContent += `✈️ Altitude: ${Math.round(altitude)} ft MSL`;
			const pointData = profileData[index];

			if (pointData?.terrainElevation !== undefined) {
				const clearance = altitude - pointData.terrainElevation;
				tooltipContent += ` | ⛰️ Terrain: ${Math.round(pointData.terrainElevation)} ft`;
				tooltipContent += ` (${clearance >= 0 ? '+' : ''}${Math.round(clearance)} ft)`;
			}

			tooltipContent += '</div>';
			const wx = getWaypointWeather(wp.id);

			if (wx) {
				tooltipContent += '<br/><div style="margin-top: 4px;">';
				tooltipContent += `💨 ${formatWind(wx.windSpeed, wx.windDir, wx.windAltitude)}`;

				if (wx.windLevel && wx.windLevel !== 'surface') {
					tooltipContent += ` <span style="font-size: 9px; color: #888;">(${wx.windLevel})</span>`;
				}

				tooltipContent += ` | 🌡️ ${formatTemperature(wx.temperature)}`;
				tooltipContent += ` | ☁️ ${wx.cloudBaseDisplay ?? 'N/A'}`;
				tooltipContent += '</div>';

				if (wx.verticalWinds && wx.verticalWinds.length > 0) {
					tooltipContent += '<div style="margin-top: 6px; padding-top: 4px; border-top: 1px solid #444; font-size: 10px;">';
					tooltipContent += '<b>📊 Winds Aloft:</b><br/>';
					tooltipContent += '<table style="font-size: 10px; line-height: 1.3; margin-top: 2px;">';
					const sortedWinds = [...wx.verticalWinds].sort((a, b) => b.altitudeFeet - a.altitudeFeet);

					sortedWinds.forEach(w => {
						const isCurrentLevel = wx.windLevel?.includes(w.level);

						const highlight = isCurrentLevel
						? ' style="color: #4CAF50; font-weight: bold;"'
						: '';

						tooltipContent += `<tr${highlight}>`;
						tooltipContent += `<td style="padding-right: 8px;">${w.level}</td>`;
						tooltipContent += `<td style="padding-right: 4px; text-align: right;">${Math.round(w.altitudeFeet).toLocaleString()}ft</td>`;
						tooltipContent += `<td style="text-align: right;">${String(Math.round(w.windDir)).padStart(3, '0')}°/${Math.round(w.windSpeed)}kt</td>`;
						tooltipContent += '</tr>';
					});

					tooltipContent += '</table>';
					tooltipContent += '</div>';
				}
			}

			if (index > 0) {
				tooltipContent += '<br/><div style="margin-top: 2px; font-size: 11px;">';
				tooltipContent += `${formatBearing(wp.bearing || 0)} | ${formatDistance(wp.distance || 0)}`;

				if (wp.groundSpeed) {
					tooltipContent += ` | GS ${Math.round(wp.groundSpeed)}kt`;
				}

				tooltipContent += '</div>';
			}

			if (pointData?.condition) {
				const conditionColor = getSegmentColor(pointData.condition);
				tooltipContent += `<br/><span style="color: ${conditionColor}; font-weight: bold; margin-top: 4px; display: inline-block;">Conditions: ${pointData.condition.toUpperCase()}</span>`;

				if (pointData.conditionReasons && pointData.conditionReasons.length > 0) {
					tooltipContent += '<br/><span style="font-size: 10px;">';

					pointData.conditionReasons.forEach(reason => {
						tooltipContent += `<br/>⚠️ ${reason}`;
					});

					tooltipContent += '</span>';
				}
			}

			marker.bindTooltip(tooltipContent, { permanent: false, direction: 'top' });

			marker.on('click', () => {
				$$invalidate(1, selectedWaypointId = wp.id);
			});

			waypointMarkers?.addLayer(marker);
		});

		if (settings.enableLogging) {
			console.log('[VFR Planner] Created', flightPlan.waypoints.length, 'waypoint markers');
		}

		map.addLayer(waypointMarkers);

		if (settings.enableLogging) {
			console.log('[VFR Planner] Added waypointMarkers layer to map');
			console.log('[VFR Planner] Map has', map.getLayers ? map.getLayers().length : 'unknown', 'layers');
		}
	}

	function clearMapLayers() {
		if (routeLayer) {
			routeLayer.remove();
			routeLayer = null;
		}

		if (waypointMarkers) {
			waypointMarkers.remove();
			waypointMarkers = null;
		}

		markerMap.clear();
	}

	function fitMapToRoute() {
		if (!flightPlan || flightPlan.waypoints.length === 0) return;
		const bounds = L.latLngBounds(flightPlan.waypoints.map(wp => [wp.lat, wp.lon]));
		map.fitBounds(bounds, { padding: [50, 50] });
	}

	function saveSession() {
		try {
			const sessionData = {
				flightPlan: flightPlan
				? {
						...flightPlan,
						departureTime: flightPlan.departureTime
						? flightPlan.departureTime.getTime()
						: undefined,
						waypoints: flightPlan.waypoints.map(wp => ({
							...wp,
							eta: wp.eta ? wp.eta.getTime() : undefined
						}))
					}
				: null,
				settings,
				departureTime,
				syncWithWindy,
				activeTab,
				maxProfileAltitude,
				profileScale,
				version: '1.0'
			};

			localStorage.setItem(STORAGE_KEY, JSON.stringify(sessionData));
		} catch(error) {
			console.warn('[VFR Planner] Failed to save session:', error);
		}
	}

	function loadSession() {
		try {
			const saved = localStorage.getItem(STORAGE_KEY);
			if (!saved) return;
			const sessionData = JSON.parse(saved);

			if (sessionData.settings) {
				$$invalidate(15, settings = {
					...DEFAULT_SETTINGS,
					...sessionData.settings
				});
			}

			if (sessionData.departureTime) {
				$$invalidate(12, departureTime = sessionData.departureTime);
			}

			if (typeof sessionData.syncWithWindy === 'boolean') {
				$$invalidate(14, syncWithWindy = sessionData.syncWithWindy);
			}

			if (sessionData.activeTab) {
				$$invalidate(6, activeTab = sessionData.activeTab);
			}

			if (typeof sessionData.maxProfileAltitude === 'number') {
				$$invalidate(16, maxProfileAltitude = sessionData.maxProfileAltitude);
			}

			if (typeof sessionData.profileScale === 'number') {
				$$invalidate(17, profileScale = sessionData.profileScale);
			}

			if (sessionData.flightPlan) {
				const restoredPlan = {
					...sessionData.flightPlan,
					departureTime: sessionData.flightPlan.departureTime
					? new Date(sessionData.flightPlan.departureTime)
					: undefined,
					waypoints: sessionData.flightPlan.waypoints.map(wp => ({
						...wp,
						eta: wp.eta ? new Date(wp.eta) : undefined
					}))
				};

				$$invalidate(0, flightPlan = restoredPlan);
				updateMapLayers();
				fitMapToRoute();
			}
		} catch(error) {
			console.warn('[VFR Planner] Failed to load session:', error);
			localStorage.removeItem(STORAGE_KEY);
		}
	}

	const onopen = _params => {
		loadSession();

		if (flightPlan) {
			updateMapLayers();
		}
	};

	onMount(() => {
		singleclick.on(name, handleMapClick);
		store.on('timestamp', handleWindyTimestampChange);
	});

	onDestroy(() => {
		clearMapLayers();
		singleclick.off(name, handleMapClick);
		store.off('timestamp', handleWindyTimestampChange);
	});

	const click_handler = () => bcast.emit('rqstOpen', 'menu');
	const click_handler_1 = () => $$invalidate(6, activeTab = 'route');
	const click_handler_2 = () => $$invalidate(6, activeTab = 'profile');
	const click_handler_3 = () => $$invalidate(6, activeTab = 'settings');

	function input_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			fileInput = $$value;
			$$invalidate(5, fileInput);
		});
	}

	const click_handler_4 = () => fileInput?.click();

	function input_change_input_handler() {
		departureTime = to_number(this.value);
		$$invalidate(12, departureTime);
	}

	const click_handler_5 = (wx, wp) => {
		if (wx.cloudBase !== undefined && wp) {
			getCbaseTable(wp.lat, wp.lon, wp.name, settings.enableLogging);
		}
	};

	const click_handler_6 = wp => moveWaypointUp(wp.id);
	const click_handler_7 = wp => moveWaypointDown(wp.id);
	const click_handler_8 = wp => deleteWaypoint(wp.id);
	const click_handler_9 = wp => selectWaypoint(wp);
	const waypointClick_handler = e => selectWaypointById(e.detail);

	function input0_input_handler() {
		settings.defaultAirspeed = to_number(this.value);
		$$invalidate(15, settings);
	}

	function input1_input_handler() {
		settings.defaultAltitude = to_number(this.value);
		$$invalidate(15, settings);
	}

	function input2_change_handler() {
		settings.allowDrag = this.checked;
		$$invalidate(15, settings);
	}

	function input3_change_handler() {
		settings.showLabels = this.checked;
		$$invalidate(15, settings);
	}

	function input4_input_handler() {
		settings.terrainSampleInterval = to_number(this.value);
		$$invalidate(15, settings);
	}

	function input5_input_handler() {
		maxProfileAltitude = to_number(this.value);
		$$invalidate(16, maxProfileAltitude);
	}

	function input6_change_handler() {
		settings.enableLogging = this.checked;
		$$invalidate(15, settings);
	}

	return [
		flightPlan,
		selectedWaypointId,
		isLoading,
		isDragOver,
		error,
		fileInput,
		activeTab,
		isAddingWaypoint,
		weatherData,
		isLoadingWeather,
		weatherError,
		elevationProfile,
		departureTime,
		forecastRange,
		syncWithWindy,
		settings,
		maxProfileAltitude,
		profileScale,
		title,
		handleDragOver,
		handleDragLeave,
		handleDrop,
		handleFileSelect,
		clearFlightPlan,
		selectWaypoint,
		selectWaypointById,
		moveWaypointUp,
		moveWaypointDown,
		deleteWaypoint,
		toggleAddWaypoint,
		handleSettingsChange,
		handleExportGPX,
		handleSendToDistancePlanning,
		handleReverseRoute,
		handleReadWeather,
		getWaypointWeather,
		getWaypointAlerts,
		hasAnyAlerts,
		handleDepartureTimeChange,
		toggleWindySync,
		onopen,
		click_handler,
		click_handler_1,
		click_handler_2,
		click_handler_3,
		input_binding,
		click_handler_4,
		input_change_input_handler,
		click_handler_5,
		click_handler_6,
		click_handler_7,
		click_handler_8,
		click_handler_9,
		waypointClick_handler,
		input0_input_handler,
		input1_input_handler,
		input2_change_handler,
		input3_change_handler,
		input4_input_handler,
		input5_input_handler,
		input6_change_handler
	];
}

class Plugin extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, { onopen: 40 }, add_css, [-1, -1, -1]);
	}

	get onopen() {
		return this.$$.ctx[40];
	}
}


// transformCode: Export statement was modified
export { __pluginConfig, Plugin as default };
//# sourceMappingURL=plugin.js.map
