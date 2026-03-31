var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// ../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
var init_utils = __esm({
  "../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/unenv/dist/runtime/_internal/utils.mjs"() {
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name(createNotImplementedError, "createNotImplementedError");
    __name(notImplemented, "notImplemented");
    __name(notImplementedClass, "notImplementedClass");
  }
});

// ../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin, _performanceNow, nodeTiming, PerformanceEntry, PerformanceMark, PerformanceMeasure, PerformanceResourceTiming, PerformanceObserverEntryList, Performance, PerformanceObserver, performance;
var init_performance = __esm({
  "../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs"() {
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_utils();
    _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
    _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
    nodeTiming = {
      name: "node",
      entryType: "node",
      startTime: 0,
      duration: 0,
      nodeStart: 0,
      v8Start: 0,
      bootstrapComplete: 0,
      environment: 0,
      loopStart: 0,
      loopExit: 0,
      idleTime: 0,
      uvMetricsInfo: {
        loopCount: 0,
        events: 0,
        eventsWaiting: 0
      },
      detail: void 0,
      toJSON() {
        return this;
      }
    };
    PerformanceEntry = class {
      static {
        __name(this, "PerformanceEntry");
      }
      __unenv__ = true;
      detail;
      entryType = "event";
      name;
      startTime;
      constructor(name, options) {
        this.name = name;
        this.startTime = options?.startTime || _performanceNow();
        this.detail = options?.detail;
      }
      get duration() {
        return _performanceNow() - this.startTime;
      }
      toJSON() {
        return {
          name: this.name,
          entryType: this.entryType,
          startTime: this.startTime,
          duration: this.duration,
          detail: this.detail
        };
      }
    };
    PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
      static {
        __name(this, "PerformanceMark");
      }
      entryType = "mark";
      constructor() {
        super(...arguments);
      }
      get duration() {
        return 0;
      }
    };
    PerformanceMeasure = class extends PerformanceEntry {
      static {
        __name(this, "PerformanceMeasure");
      }
      entryType = "measure";
    };
    PerformanceResourceTiming = class extends PerformanceEntry {
      static {
        __name(this, "PerformanceResourceTiming");
      }
      entryType = "resource";
      serverTiming = [];
      connectEnd = 0;
      connectStart = 0;
      decodedBodySize = 0;
      domainLookupEnd = 0;
      domainLookupStart = 0;
      encodedBodySize = 0;
      fetchStart = 0;
      initiatorType = "";
      name = "";
      nextHopProtocol = "";
      redirectEnd = 0;
      redirectStart = 0;
      requestStart = 0;
      responseEnd = 0;
      responseStart = 0;
      secureConnectionStart = 0;
      startTime = 0;
      transferSize = 0;
      workerStart = 0;
      responseStatus = 0;
    };
    PerformanceObserverEntryList = class {
      static {
        __name(this, "PerformanceObserverEntryList");
      }
      __unenv__ = true;
      getEntries() {
        return [];
      }
      getEntriesByName(_name, _type) {
        return [];
      }
      getEntriesByType(type) {
        return [];
      }
    };
    Performance = class {
      static {
        __name(this, "Performance");
      }
      __unenv__ = true;
      timeOrigin = _timeOrigin;
      eventCounts = /* @__PURE__ */ new Map();
      _entries = [];
      _resourceTimingBufferSize = 0;
      navigation = void 0;
      timing = void 0;
      timerify(_fn, _options) {
        throw createNotImplementedError("Performance.timerify");
      }
      get nodeTiming() {
        return nodeTiming;
      }
      eventLoopUtilization() {
        return {};
      }
      markResourceTiming() {
        return new PerformanceResourceTiming("");
      }
      onresourcetimingbufferfull = null;
      now() {
        if (this.timeOrigin === _timeOrigin) {
          return _performanceNow();
        }
        return Date.now() - this.timeOrigin;
      }
      clearMarks(markName) {
        this._entries = markName ? this._entries.filter((e) => e.name !== markName) : this._entries.filter((e) => e.entryType !== "mark");
      }
      clearMeasures(measureName) {
        this._entries = measureName ? this._entries.filter((e) => e.name !== measureName) : this._entries.filter((e) => e.entryType !== "measure");
      }
      clearResourceTimings() {
        this._entries = this._entries.filter((e) => e.entryType !== "resource" || e.entryType !== "navigation");
      }
      getEntries() {
        return this._entries;
      }
      getEntriesByName(name, type) {
        return this._entries.filter((e) => e.name === name && (!type || e.entryType === type));
      }
      getEntriesByType(type) {
        return this._entries.filter((e) => e.entryType === type);
      }
      mark(name, options) {
        const entry = new PerformanceMark(name, options);
        this._entries.push(entry);
        return entry;
      }
      measure(measureName, startOrMeasureOptions, endMark) {
        let start;
        let end;
        if (typeof startOrMeasureOptions === "string") {
          start = this.getEntriesByName(startOrMeasureOptions, "mark")[0]?.startTime;
          end = this.getEntriesByName(endMark, "mark")[0]?.startTime;
        } else {
          start = Number.parseFloat(startOrMeasureOptions?.start) || this.now();
          end = Number.parseFloat(startOrMeasureOptions?.end) || this.now();
        }
        const entry = new PerformanceMeasure(measureName, {
          startTime: start,
          detail: {
            start,
            end
          }
        });
        this._entries.push(entry);
        return entry;
      }
      setResourceTimingBufferSize(maxSize) {
        this._resourceTimingBufferSize = maxSize;
      }
      addEventListener(type, listener, options) {
        throw createNotImplementedError("Performance.addEventListener");
      }
      removeEventListener(type, listener, options) {
        throw createNotImplementedError("Performance.removeEventListener");
      }
      dispatchEvent(event) {
        throw createNotImplementedError("Performance.dispatchEvent");
      }
      toJSON() {
        return this;
      }
    };
    PerformanceObserver = class {
      static {
        __name(this, "PerformanceObserver");
      }
      __unenv__ = true;
      static supportedEntryTypes = [];
      _callback = null;
      constructor(callback) {
        this._callback = callback;
      }
      takeRecords() {
        return [];
      }
      disconnect() {
        throw createNotImplementedError("PerformanceObserver.disconnect");
      }
      observe(options) {
        throw createNotImplementedError("PerformanceObserver.observe");
      }
      bind(fn) {
        return fn;
      }
      runInAsyncScope(fn, thisArg, ...args) {
        return fn.call(thisArg, ...args);
      }
      asyncId() {
        return 0;
      }
      triggerAsyncId() {
        return 0;
      }
      emitDestroy() {
        return this;
      }
    };
    performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();
  }
});

// ../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/unenv/dist/runtime/node/perf_hooks.mjs
var init_perf_hooks = __esm({
  "../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/unenv/dist/runtime/node/perf_hooks.mjs"() {
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_performance();
  }
});

// ../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
var init_performance2 = __esm({
  "../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs"() {
    init_perf_hooks();
    if (!("__unenv__" in performance)) {
      const proto = Performance.prototype;
      for (const key of Object.getOwnPropertyNames(proto)) {
        if (key !== "constructor" && !(key in performance)) {
          const desc = Object.getOwnPropertyDescriptor(proto, key);
          if (desc) {
            Object.defineProperty(performance, key, desc);
          }
        }
      }
    }
    globalThis.performance = performance;
    globalThis.Performance = Performance;
    globalThis.PerformanceEntry = PerformanceEntry;
    globalThis.PerformanceMark = PerformanceMark;
    globalThis.PerformanceMeasure = PerformanceMeasure;
    globalThis.PerformanceObserver = PerformanceObserver;
    globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList;
    globalThis.PerformanceResourceTiming = PerformanceResourceTiming;
  }
});

// ../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default;
var init_noop = __esm({
  "../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/unenv/dist/runtime/mock/noop.mjs"() {
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    noop_default = Object.assign(() => {
    }, { __unenv__: true });
  }
});

// ../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";
var _console, _ignoreErrors, _stderr, _stdout, log, info, trace, debug, table, error, warn, createTask, clear, count, countReset, dir, dirxml, group, groupEnd, groupCollapsed, profile, profileEnd, time, timeEnd, timeLog, timeStamp, Console, _times, _stdoutErrorHandler, _stderrErrorHandler;
var init_console = __esm({
  "../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/unenv/dist/runtime/node/console.mjs"() {
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_noop();
    init_utils();
    _console = globalThis.console;
    _ignoreErrors = true;
    _stderr = new Writable();
    _stdout = new Writable();
    log = _console?.log ?? noop_default;
    info = _console?.info ?? log;
    trace = _console?.trace ?? info;
    debug = _console?.debug ?? log;
    table = _console?.table ?? log;
    error = _console?.error ?? log;
    warn = _console?.warn ?? error;
    createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
    clear = _console?.clear ?? noop_default;
    count = _console?.count ?? noop_default;
    countReset = _console?.countReset ?? noop_default;
    dir = _console?.dir ?? noop_default;
    dirxml = _console?.dirxml ?? noop_default;
    group = _console?.group ?? noop_default;
    groupEnd = _console?.groupEnd ?? noop_default;
    groupCollapsed = _console?.groupCollapsed ?? noop_default;
    profile = _console?.profile ?? noop_default;
    profileEnd = _console?.profileEnd ?? noop_default;
    time = _console?.time ?? noop_default;
    timeEnd = _console?.timeEnd ?? noop_default;
    timeLog = _console?.timeLog ?? noop_default;
    timeStamp = _console?.timeStamp ?? noop_default;
    Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
    _times = /* @__PURE__ */ new Map();
    _stdoutErrorHandler = noop_default;
    _stderrErrorHandler = noop_default;
  }
});

// ../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole, assert, clear2, context, count2, countReset2, createTask2, debug2, dir2, dirxml2, error2, group2, groupCollapsed2, groupEnd2, info2, log2, profile2, profileEnd2, table2, time2, timeEnd2, timeLog2, timeStamp2, trace2, warn2, console_default;
var init_console2 = __esm({
  "../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs"() {
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_console();
    workerdConsole = globalThis["console"];
    ({
      assert,
      clear: clear2,
      context: (
        // @ts-expect-error undocumented public API
        context
      ),
      count: count2,
      countReset: countReset2,
      createTask: (
        // @ts-expect-error undocumented public API
        createTask2
      ),
      debug: debug2,
      dir: dir2,
      dirxml: dirxml2,
      error: error2,
      group: group2,
      groupCollapsed: groupCollapsed2,
      groupEnd: groupEnd2,
      info: info2,
      log: log2,
      profile: profile2,
      profileEnd: profileEnd2,
      table: table2,
      time: time2,
      timeEnd: timeEnd2,
      timeLog: timeLog2,
      timeStamp: timeStamp2,
      trace: trace2,
      warn: warn2
    } = workerdConsole);
    Object.assign(workerdConsole, {
      Console,
      _ignoreErrors,
      _stderr,
      _stderrErrorHandler,
      _stdout,
      _stdoutErrorHandler,
      _times
    });
    console_default = workerdConsole;
  }
});

// ../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
var init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console = __esm({
  "../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console"() {
    init_console2();
    globalThis.console = console_default;
  }
});

// ../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime;
var init_hrtime = __esm({
  "../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs"() {
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
      const now = Date.now();
      const seconds = Math.trunc(now / 1e3);
      const nanos = now % 1e3 * 1e6;
      if (startTime) {
        let diffSeconds = seconds - startTime[0];
        let diffNanos = nanos - startTime[0];
        if (diffNanos < 0) {
          diffSeconds = diffSeconds - 1;
          diffNanos = 1e9 + diffNanos;
        }
        return [diffSeconds, diffNanos];
      }
      return [seconds, nanos];
    }, "hrtime"), { bigint: /* @__PURE__ */ __name(function bigint() {
      return BigInt(Date.now() * 1e6);
    }, "bigint") });
  }
});

// ../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream;
var init_read_stream = __esm({
  "../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs"() {
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    ReadStream = class {
      static {
        __name(this, "ReadStream");
      }
      fd;
      isRaw = false;
      isTTY = false;
      constructor(fd) {
        this.fd = fd;
      }
      setRawMode(mode) {
        this.isRaw = mode;
        return this;
      }
    };
  }
});

// ../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream;
var init_write_stream = __esm({
  "../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs"() {
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    WriteStream = class {
      static {
        __name(this, "WriteStream");
      }
      fd;
      columns = 80;
      rows = 24;
      isTTY = false;
      constructor(fd) {
        this.fd = fd;
      }
      clearLine(dir3, callback) {
        callback && callback();
        return false;
      }
      clearScreenDown(callback) {
        callback && callback();
        return false;
      }
      cursorTo(x, y, callback) {
        callback && typeof callback === "function" && callback();
        return false;
      }
      moveCursor(dx, dy, callback) {
        callback && callback();
        return false;
      }
      getColorDepth(env2) {
        return 1;
      }
      hasColors(count3, env2) {
        return false;
      }
      getWindowSize() {
        return [this.columns, this.rows];
      }
      write(str, encoding, cb) {
        if (str instanceof Uint8Array) {
          str = new TextDecoder().decode(str);
        }
        try {
          console.log(str);
        } catch {
        }
        cb && typeof cb === "function" && cb();
        return false;
      }
    };
  }
});

// ../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/unenv/dist/runtime/node/tty.mjs
var init_tty = __esm({
  "../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/unenv/dist/runtime/node/tty.mjs"() {
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_read_stream();
    init_write_stream();
  }
});

// ../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION;
var init_node_version = __esm({
  "../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs"() {
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    NODE_VERSION = "22.14.0";
  }
});

// ../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";
var Process;
var init_process = __esm({
  "../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/unenv/dist/runtime/node/internal/process/process.mjs"() {
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_tty();
    init_utils();
    init_node_version();
    Process = class _Process extends EventEmitter {
      static {
        __name(this, "Process");
      }
      env;
      hrtime;
      nextTick;
      constructor(impl) {
        super();
        this.env = impl.env;
        this.hrtime = impl.hrtime;
        this.nextTick = impl.nextTick;
        for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter.prototype)]) {
          const value = this[prop];
          if (typeof value === "function") {
            this[prop] = value.bind(this);
          }
        }
      }
      // --- event emitter ---
      emitWarning(warning, type, code) {
        console.warn(`${code ? `[${code}] ` : ""}${type ? `${type}: ` : ""}${warning}`);
      }
      emit(...args) {
        return super.emit(...args);
      }
      listeners(eventName) {
        return super.listeners(eventName);
      }
      // --- stdio (lazy initializers) ---
      #stdin;
      #stdout;
      #stderr;
      get stdin() {
        return this.#stdin ??= new ReadStream(0);
      }
      get stdout() {
        return this.#stdout ??= new WriteStream(1);
      }
      get stderr() {
        return this.#stderr ??= new WriteStream(2);
      }
      // --- cwd ---
      #cwd = "/";
      chdir(cwd2) {
        this.#cwd = cwd2;
      }
      cwd() {
        return this.#cwd;
      }
      // --- dummy props and getters ---
      arch = "";
      platform = "";
      argv = [];
      argv0 = "";
      execArgv = [];
      execPath = "";
      title = "";
      pid = 200;
      ppid = 100;
      get version() {
        return `v${NODE_VERSION}`;
      }
      get versions() {
        return { node: NODE_VERSION };
      }
      get allowedNodeEnvironmentFlags() {
        return /* @__PURE__ */ new Set();
      }
      get sourceMapsEnabled() {
        return false;
      }
      get debugPort() {
        return 0;
      }
      get throwDeprecation() {
        return false;
      }
      get traceDeprecation() {
        return false;
      }
      get features() {
        return {};
      }
      get release() {
        return {};
      }
      get connected() {
        return false;
      }
      get config() {
        return {};
      }
      get moduleLoadList() {
        return [];
      }
      constrainedMemory() {
        return 0;
      }
      availableMemory() {
        return 0;
      }
      uptime() {
        return 0;
      }
      resourceUsage() {
        return {};
      }
      // --- noop methods ---
      ref() {
      }
      unref() {
      }
      // --- unimplemented methods ---
      umask() {
        throw createNotImplementedError("process.umask");
      }
      getBuiltinModule() {
        return void 0;
      }
      getActiveResourcesInfo() {
        throw createNotImplementedError("process.getActiveResourcesInfo");
      }
      exit() {
        throw createNotImplementedError("process.exit");
      }
      reallyExit() {
        throw createNotImplementedError("process.reallyExit");
      }
      kill() {
        throw createNotImplementedError("process.kill");
      }
      abort() {
        throw createNotImplementedError("process.abort");
      }
      dlopen() {
        throw createNotImplementedError("process.dlopen");
      }
      setSourceMapsEnabled() {
        throw createNotImplementedError("process.setSourceMapsEnabled");
      }
      loadEnvFile() {
        throw createNotImplementedError("process.loadEnvFile");
      }
      disconnect() {
        throw createNotImplementedError("process.disconnect");
      }
      cpuUsage() {
        throw createNotImplementedError("process.cpuUsage");
      }
      setUncaughtExceptionCaptureCallback() {
        throw createNotImplementedError("process.setUncaughtExceptionCaptureCallback");
      }
      hasUncaughtExceptionCaptureCallback() {
        throw createNotImplementedError("process.hasUncaughtExceptionCaptureCallback");
      }
      initgroups() {
        throw createNotImplementedError("process.initgroups");
      }
      openStdin() {
        throw createNotImplementedError("process.openStdin");
      }
      assert() {
        throw createNotImplementedError("process.assert");
      }
      binding() {
        throw createNotImplementedError("process.binding");
      }
      // --- attached interfaces ---
      permission = { has: /* @__PURE__ */ notImplemented("process.permission.has") };
      report = {
        directory: "",
        filename: "",
        signal: "SIGUSR2",
        compact: false,
        reportOnFatalError: false,
        reportOnSignal: false,
        reportOnUncaughtException: false,
        getReport: /* @__PURE__ */ notImplemented("process.report.getReport"),
        writeReport: /* @__PURE__ */ notImplemented("process.report.writeReport")
      };
      finalization = {
        register: /* @__PURE__ */ notImplemented("process.finalization.register"),
        unregister: /* @__PURE__ */ notImplemented("process.finalization.unregister"),
        registerBeforeExit: /* @__PURE__ */ notImplemented("process.finalization.registerBeforeExit")
      };
      memoryUsage = Object.assign(() => ({
        arrayBuffers: 0,
        rss: 0,
        external: 0,
        heapTotal: 0,
        heapUsed: 0
      }), { rss: /* @__PURE__ */ __name(() => 0, "rss") });
      // --- undefined props ---
      mainModule = void 0;
      domain = void 0;
      // optional
      send = void 0;
      exitCode = void 0;
      channel = void 0;
      getegid = void 0;
      geteuid = void 0;
      getgid = void 0;
      getgroups = void 0;
      getuid = void 0;
      setegid = void 0;
      seteuid = void 0;
      setgid = void 0;
      setgroups = void 0;
      setuid = void 0;
      // internals
      _events = void 0;
      _eventsCount = void 0;
      _exiting = void 0;
      _maxListeners = void 0;
      _debugEnd = void 0;
      _debugProcess = void 0;
      _fatalException = void 0;
      _getActiveHandles = void 0;
      _getActiveRequests = void 0;
      _kill = void 0;
      _preload_modules = void 0;
      _rawDebug = void 0;
      _startProfilerIdleNotifier = void 0;
      _stopProfilerIdleNotifier = void 0;
      _tickCallback = void 0;
      _disconnect = void 0;
      _handleQueue = void 0;
      _pendingMessage = void 0;
      _channel = void 0;
      _send = void 0;
      _linkedBinding = void 0;
    };
  }
});

// ../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess, getBuiltinModule, workerdProcess, unenvProcess, exit, features, platform, _channel, _debugEnd, _debugProcess, _disconnect, _events, _eventsCount, _exiting, _fatalException, _getActiveHandles, _getActiveRequests, _handleQueue, _kill, _linkedBinding, _maxListeners, _pendingMessage, _preload_modules, _rawDebug, _send, _startProfilerIdleNotifier, _stopProfilerIdleNotifier, _tickCallback, abort, addListener, allowedNodeEnvironmentFlags, arch, argv, argv0, assert2, availableMemory, binding, channel, chdir, config, connected, constrainedMemory, cpuUsage, cwd, debugPort, disconnect, dlopen, domain, emit, emitWarning, env, eventNames, execArgv, execPath, exitCode, finalization, getActiveResourcesInfo, getegid, geteuid, getgid, getgroups, getMaxListeners, getuid, hasUncaughtExceptionCaptureCallback, hrtime3, initgroups, kill, listenerCount, listeners, loadEnvFile, mainModule, memoryUsage, moduleLoadList, nextTick, off, on, once, openStdin, permission, pid, ppid, prependListener, prependOnceListener, rawListeners, reallyExit, ref, release, removeAllListeners, removeListener, report, resourceUsage, send, setegid, seteuid, setgid, setgroups, setMaxListeners, setSourceMapsEnabled, setuid, setUncaughtExceptionCaptureCallback, sourceMapsEnabled, stderr, stdin, stdout, throwDeprecation, title, traceDeprecation, umask, unref, uptime, version, versions, _process, process_default;
var init_process2 = __esm({
  "../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs"() {
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_hrtime();
    init_process();
    globalProcess = globalThis["process"];
    getBuiltinModule = globalProcess.getBuiltinModule;
    workerdProcess = getBuiltinModule("node:process");
    unenvProcess = new Process({
      env: globalProcess.env,
      hrtime,
      // `nextTick` is available from workerd process v1
      nextTick: workerdProcess.nextTick
    });
    ({ exit, features, platform } = workerdProcess);
    ({
      _channel,
      _debugEnd,
      _debugProcess,
      _disconnect,
      _events,
      _eventsCount,
      _exiting,
      _fatalException,
      _getActiveHandles,
      _getActiveRequests,
      _handleQueue,
      _kill,
      _linkedBinding,
      _maxListeners,
      _pendingMessage,
      _preload_modules,
      _rawDebug,
      _send,
      _startProfilerIdleNotifier,
      _stopProfilerIdleNotifier,
      _tickCallback,
      abort,
      addListener,
      allowedNodeEnvironmentFlags,
      arch,
      argv,
      argv0,
      assert: assert2,
      availableMemory,
      binding,
      channel,
      chdir,
      config,
      connected,
      constrainedMemory,
      cpuUsage,
      cwd,
      debugPort,
      disconnect,
      dlopen,
      domain,
      emit,
      emitWarning,
      env,
      eventNames,
      execArgv,
      execPath,
      exitCode,
      finalization,
      getActiveResourcesInfo,
      getegid,
      geteuid,
      getgid,
      getgroups,
      getMaxListeners,
      getuid,
      hasUncaughtExceptionCaptureCallback,
      hrtime: hrtime3,
      initgroups,
      kill,
      listenerCount,
      listeners,
      loadEnvFile,
      mainModule,
      memoryUsage,
      moduleLoadList,
      nextTick,
      off,
      on,
      once,
      openStdin,
      permission,
      pid,
      ppid,
      prependListener,
      prependOnceListener,
      rawListeners,
      reallyExit,
      ref,
      release,
      removeAllListeners,
      removeListener,
      report,
      resourceUsage,
      send,
      setegid,
      seteuid,
      setgid,
      setgroups,
      setMaxListeners,
      setSourceMapsEnabled,
      setuid,
      setUncaughtExceptionCaptureCallback,
      sourceMapsEnabled,
      stderr,
      stdin,
      stdout,
      throwDeprecation,
      title,
      traceDeprecation,
      umask,
      unref,
      uptime,
      version,
      versions
    } = unenvProcess);
    _process = {
      abort,
      addListener,
      allowedNodeEnvironmentFlags,
      hasUncaughtExceptionCaptureCallback,
      setUncaughtExceptionCaptureCallback,
      loadEnvFile,
      sourceMapsEnabled,
      arch,
      argv,
      argv0,
      chdir,
      config,
      connected,
      constrainedMemory,
      availableMemory,
      cpuUsage,
      cwd,
      debugPort,
      dlopen,
      disconnect,
      emit,
      emitWarning,
      env,
      eventNames,
      execArgv,
      execPath,
      exit,
      finalization,
      features,
      getBuiltinModule,
      getActiveResourcesInfo,
      getMaxListeners,
      hrtime: hrtime3,
      kill,
      listeners,
      listenerCount,
      memoryUsage,
      nextTick,
      on,
      off,
      once,
      pid,
      platform,
      ppid,
      prependListener,
      prependOnceListener,
      rawListeners,
      release,
      removeAllListeners,
      removeListener,
      report,
      resourceUsage,
      setMaxListeners,
      setSourceMapsEnabled,
      stderr,
      stdin,
      stdout,
      title,
      throwDeprecation,
      traceDeprecation,
      umask,
      uptime,
      version,
      versions,
      // @ts-expect-error old API
      domain,
      initgroups,
      moduleLoadList,
      reallyExit,
      openStdin,
      assert: assert2,
      binding,
      send,
      exitCode,
      channel,
      getegid,
      geteuid,
      getgid,
      getgroups,
      getuid,
      setegid,
      seteuid,
      setgid,
      setgroups,
      setuid,
      permission,
      mainModule,
      _events,
      _eventsCount,
      _exiting,
      _maxListeners,
      _debugEnd,
      _debugProcess,
      _fatalException,
      _getActiveHandles,
      _getActiveRequests,
      _kill,
      _preload_modules,
      _rawDebug,
      _startProfilerIdleNotifier,
      _stopProfilerIdleNotifier,
      _tickCallback,
      _disconnect,
      _handleQueue,
      _pendingMessage,
      _channel,
      _send,
      _linkedBinding
    };
    process_default = _process;
  }
});

// ../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
var init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process = __esm({
  "../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process"() {
    init_process2();
    globalThis.process = process_default;
  }
});

// api/mainsite/ai/transform.ts
function structuredLog(level, message, context2 = {}) {
  const logStr = JSON.stringify({
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    level: level.toUpperCase(),
    message,
    ...context2
  });
  if (level === "error") console.error(logStr);
  else if (level === "warn") console.warn(logStr);
  else console.info(logStr);
}
async function estimateTokenCount(text, apiKey) {
  try {
    const url = `https://generativelanguage.googleapis.com/${GEMINI_CONFIG.version}/models/${GEMINI_CONFIG.model}:countTokens?key=${apiKey}`;
    const payload = { contents: [{ parts: [{ text }] }] };
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      const data = await response.json();
      return data.totalTokens || 0;
    }
    return 0;
  } catch (error3) {
    structuredLog("warn", "Failed to count tokens", { error: error3.message });
    return 0;
  }
}
function validateInputTokens(tokenCount) {
  if (tokenCount > GEMINI_CONFIG.maxTokensInput) {
    return {
      shouldReject: true,
      status: 413,
      error: `Texto enviado \xE9 muito extenso (${tokenCount} tokens > limite de ${GEMINI_CONFIG.maxTokensInput}).`
    };
  }
  return { shouldReject: false };
}
function extractUsageMetadata(responseData) {
  if (!responseData?.usageMetadata) return { promptTokens: 0, outputTokens: 0, cachedTokens: 0 };
  return {
    promptTokens: responseData.usageMetadata.promptTokenCount || 0,
    outputTokens: responseData.usageMetadata.candidatesTokenCount || 0,
    cachedTokens: responseData.usageMetadata.cachedContentTokenCount || 0
  };
}
function extractTextFromParts(parts) {
  return (parts || []).filter((p) => p.text && !p.thought).map((p) => p.text).join("");
}
function logAiUsage(db, payload) {
  if (!db) return;
  db.prepare(`
    INSERT INTO ai_usage_logs (module, model, input_tokens, output_tokens, latency_ms, status, error_detail)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    payload.module,
    payload.model,
    payload.input_tokens,
    payload.output_tokens,
    payload.latency_ms,
    payload.status,
    payload.error_detail || null
  ).run().catch(() => {
  });
}
var GEMINI_CONFIG, onRequestPost;
var init_transform = __esm({
  "api/mainsite/ai/transform.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    GEMINI_CONFIG = {
      model: "gemini-pro-latest",
      version: "v1beta",
      maxTokensInput: 12e4,
      maxRetries: 2,
      retryDelayMs: 800,
      defaultThinkingConfig: { thinkingLevel: "HIGH" },
      endpoints: {
        transform: {
          temperature: 0.3,
          topP: 0.8,
          maxOutputTokens: 4096
        }
      }
    };
    __name(structuredLog, "structuredLog");
    __name(estimateTokenCount, "estimateTokenCount");
    __name(validateInputTokens, "validateInputTokens");
    __name(extractUsageMetadata, "extractUsageMetadata");
    __name(extractTextFromParts, "extractTextFromParts");
    onRequestPost = /* @__PURE__ */ __name(async (context2) => {
      if (!context2.env.GEMINI_API_KEY) {
        structuredLog("error", "GEMINI_API_KEY missing");
        return new Response(JSON.stringify({ error: "GEMINI_API_KEY n\xE3o configurada." }), { status: 500 });
      }
      const _telemetryStart = Date.now();
      structuredLog("info", "transform API call starting", { endpoint: "transform" });
      try {
        const body = await context2.request.json();
        const { action, text } = body;
        if (!text || !action) {
          return new Response(JSON.stringify({ error: "A\xE7\xE3o ou texto n\xE3o fornecido." }), { status: 400 });
        }
        let promptInfo = "";
        switch (action) {
          case "grammar":
            promptInfo = "Corrija a gram\xE1tica e a ortografia do texto a seguir. Retorne APENAS o texto corrigido.";
            break;
          case "summarize":
            promptInfo = "Resuma o texto a seguir de forma clara e concisa. Retorne APENAS o resumo direto.";
            break;
          case "expand":
            promptInfo = "Expanda o texto a seguir adicionando detalhes e contexto, mantendo o tom original. Retorne APENAS o texto expandido.";
            break;
          case "formal":
            promptInfo = "Reescreva o texto a seguir adotando um tom formal e profissional. Retorne APENAS o texto reescrito.";
            break;
          default:
            return new Response(JSON.stringify({ error: "A\xE7\xE3o de IA desconhecida." }), { status: 400 });
        }
        const fullPrompt = `${promptInfo}

Texto:
${text}`;
        const inputTokens = await estimateTokenCount(fullPrompt, context2.env.GEMINI_API_KEY);
        const validation = validateInputTokens(inputTokens);
        if (validation.shouldReject) {
          structuredLog("warn", "Input rejected due to token count", { tokens: inputTokens });
          return new Response(JSON.stringify({ error: validation.error }), { status: validation.status });
        }
        const safetySettings = [
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" }
        ];
        const generateUrl = `https://generativelanguage.googleapis.com/${GEMINI_CONFIG.version}/models/${GEMINI_CONFIG.model}:generateContent?key=${context2.env.GEMINI_API_KEY}`;
        const payload = {
          contents: [{ parts: [{ text: fullPrompt }] }],
          safetySettings,
          generationConfig: {
            temperature: GEMINI_CONFIG.endpoints.transform.temperature,
            topP: GEMINI_CONFIG.endpoints.transform.topP,
            maxOutputTokens: GEMINI_CONFIG.endpoints.transform.maxOutputTokens,
            // 4. MaxOutputTokens Configurado
            // 8. Thinking Model Support
            thinkingConfig: GEMINI_CONFIG.defaultThinkingConfig
          }
        };
        let lastStatus = 502;
        let finalResponse = null;
        for (let tentativa = 0; tentativa < GEMINI_CONFIG.maxRetries; tentativa++) {
          try {
            structuredLog("info", `Gemini request attempt ${tentativa + 1}`, {
              endpoint: "transform",
              attempt: tentativa + 1
            });
            const response = await fetch(generateUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload)
            });
            if (response.ok) {
              const data = await response.json();
              const usage = extractUsageMetadata(data);
              structuredLog("info", "Gemini request succeeded", {
                endpoint: "transform",
                attempt: tentativa + 1,
                status: response.status,
                usageMetadata: usage
              });
              logAiUsage(context2.env.BIGDATA_DB, {
                module: "mainsite",
                model: GEMINI_CONFIG.model,
                input_tokens: usage.promptTokens,
                output_tokens: usage.outputTokens,
                latency_ms: Date.now() - _telemetryStart,
                status: "ok"
              });
              finalResponse = data;
              break;
            }
            lastStatus = response.status;
            structuredLog("warn", `Gemini request failed, will retry`, {
              endpoint: "transform",
              attempt: tentativa + 1,
              status: response.status
            });
            if (tentativa === 0) {
              await new Promise((r) => setTimeout(r, GEMINI_CONFIG.retryDelayMs));
            }
          } catch (err) {
            structuredLog("error", "Gemini request error", {
              endpoint: "transform",
              attempt: tentativa + 1,
              error: err.message
            });
          }
        }
        if (!finalResponse) {
          throw new Error(`Gemini API failed permanently. Last status: ${lastStatus}`);
        }
        const parts = finalResponse.candidates?.[0]?.content?.parts;
        const generatedText = extractTextFromParts(parts);
        if (!generatedText) {
          throw new Error("Resposta vazia da IA ou bloqueada.");
        }
        return new Response(JSON.stringify({ text: generatedText.trim() }), {
          headers: { "Content-Type": "application/json; charset=utf-8" }
        });
      } catch (error3) {
        logAiUsage(context2.env.BIGDATA_DB, {
          module: "mainsite",
          model: GEMINI_CONFIG.model,
          input_tokens: 0,
          output_tokens: 0,
          latency_ms: Date.now() - _telemetryStart,
          status: "error",
          error_detail: error3 instanceof Error ? error3.message : "unknown"
        });
        structuredLog("error", "transform fatal error", { error: error3 instanceof Error ? error3.message : "Erro desconhecido" });
        return new Response(JSON.stringify({ error: error3 instanceof Error ? error3.message : "Erro desconhecido na gera\xE7\xE3o por IA." }), { status: 500 });
      }
    }, "onRequestPost");
    __name(logAiUsage, "logAiUsage");
  }
});

// api/mainsite/media/[filename].ts
var onRequestGet;
var init_filename = __esm({
  "api/mainsite/media/[filename].ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    onRequestGet = /* @__PURE__ */ __name(async (context2) => {
      const filename = context2.params.filename;
      if (!filename) {
        return new Response("Arquivo n\xE3o especificado.", { status: 400 });
      }
      try {
        const object = await context2.env.MEDIA_BUCKET.get(filename);
        if (!object) {
          return new Response("Arquivo n\xE3o encontrado.", { status: 404 });
        }
        const headers2 = new Headers();
        headers2.set("Content-Type", object.httpMetadata?.contentType || "application/octet-stream");
        headers2.set("ETag", object.etag);
        return new Response(object.body, { headers: headers2 });
      } catch {
        return new Response("Erro ao recuperar arquivo.", { status: 500 });
      }
    }, "onRequestGet");
  }
});

// api/_lib/admin-actor.ts
var DEFAULT_ADMIN_ACTOR, normalizeAdminActor, resolveAdminActorFromRequest;
var init_admin_actor = __esm({
  "api/_lib/admin-actor.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    DEFAULT_ADMIN_ACTOR = "admin-app";
    normalizeAdminActor = /* @__PURE__ */ __name((value) => {
      const actor = String(value ?? "").trim();
      if (!actor) {
        return null;
      }
      return actor.slice(0, 160);
    }, "normalizeAdminActor");
    resolveAdminActorFromRequest = /* @__PURE__ */ __name((request, body) => {
      const fromHeader = normalizeAdminActor(request.headers.get("X-Admin-Actor"));
      if (fromHeader) {
        return fromHeader;
      }
      const fromEmailHeader = normalizeAdminActor(request.headers.get("X-Admin-Email"));
      if (fromEmailHeader) {
        return fromEmailHeader;
      }
      const fromBody = normalizeAdminActor(body?.adminActor);
      if (fromBody) {
        return fromBody;
      }
      const fromBodyEmail = normalizeAdminActor(body?.adminEmail);
      if (fromBodyEmail) {
        return fromBodyEmail;
      }
      return DEFAULT_ADMIN_ACTOR;
    }, "resolveAdminActorFromRequest");
  }
});

// api/_lib/operational.ts
async function ensureOperationalTables(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS adminapp_module_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at INTEGER NOT NULL,
      module TEXT NOT NULL,
      source TEXT NOT NULL,
      fallback_used INTEGER NOT NULL DEFAULT 0,
      ok INTEGER NOT NULL DEFAULT 1,
      error_message TEXT,
      metadata_json TEXT
    )
  `).run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_adminapp_module_events_created_at ON adminapp_module_events(created_at DESC)").run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_adminapp_module_events_module ON adminapp_module_events(module, created_at DESC)").run();
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS adminapp_sync_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      module TEXT NOT NULL,
      status TEXT NOT NULL,
      started_at INTEGER NOT NULL,
      finished_at INTEGER,
      records_read INTEGER NOT NULL DEFAULT 0,
      records_upserted INTEGER NOT NULL DEFAULT 0,
      error_message TEXT,
      metadata_json TEXT
    )
  `).run();
  await db.prepare("CREATE INDEX IF NOT EXISTS idx_adminapp_sync_runs_module_started ON adminapp_sync_runs(module, started_at DESC)").run();
}
async function logModuleOperationalEvent(db, input) {
  await ensureOperationalTables(db);
  await db.prepare(`
    INSERT INTO adminapp_module_events
    (created_at, module, source, fallback_used, ok, error_message, metadata_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).bind(
    Date.now(),
    input.module,
    input.source,
    input.fallbackUsed ? 1 : 0,
    input.ok ? 1 : 0,
    input.errorMessage ?? null,
    input.metadata ? JSON.stringify(input.metadata) : null
  ).run();
}
async function startSyncRun(db, run) {
  await ensureOperationalTables(db);
  await db.prepare(`
    INSERT INTO adminapp_sync_runs
    (module, status, started_at, metadata_json)
    VALUES (?, ?, ?, ?)
  `).bind(run.module, run.status, run.startedAt, run.metadata ? JSON.stringify(run.metadata) : null).run();
  const row = await db.prepare("SELECT id FROM adminapp_sync_runs WHERE module = ? ORDER BY id DESC LIMIT 1").bind(run.module).first();
  return Number(row?.id ?? 0);
}
async function finishSyncRun(db, run) {
  await ensureOperationalTables(db);
  await db.prepare(`
    UPDATE adminapp_sync_runs
    SET
      status = ?,
      finished_at = ?,
      records_read = ?,
      records_upserted = ?,
      error_message = ?
    WHERE id = ?
  `).bind(
    run.status,
    run.finishedAt,
    run.recordsRead,
    run.recordsUpserted,
    run.errorMessage ?? null,
    run.id
  ).run();
}
var init_operational = __esm({
  "api/_lib/operational.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name(ensureOperationalTables, "ensureOperationalTables");
    __name(logModuleOperationalEvent, "logModuleOperationalEvent");
    __name(startSyncRun, "startSyncRun");
    __name(finishSyncRun, "finishSyncRun");
  }
});

// api/_lib/hub-config.ts
var HUB_CARDS_LIMITS, APPHUB_DEFAULT_CARDS, ADMINHUB_DEFAULT_CARDS, toHubHeaders, toTable, toDefaultCards, sanitizeCard, isValidHttpUrl, validateCards, mapRowToCard, ensureHubTables, loadCardsFromDb, saveCardsToDb, resolveHubConfig, parseCardsFromBody, logHubEvent;
var init_hub_config = __esm({
  "api/_lib/hub-config.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    HUB_CARDS_LIMITS = {
      maxCards: 100,
      nameMaxLength: 120,
      descriptionMaxLength: 600,
      urlMaxLength: 2048,
      iconMaxLength: 32,
      badgeMaxLength: 80
    };
    APPHUB_DEFAULT_CARDS = [
      {
        name: "Divaga\xE7\xF5es Filos\xF3ficas",
        description: "Publica\xE7\xF5es sobre temas cient\xEDfico-religio-filos\xF3ficos",
        url: "https://www.lcv.rio.br",
        icon: "\u{1F9E0}",
        badge: "Abrir Site"
      },
      {
        name: "Mapa Astral",
        description: "C\xE1lculo de mapas baseados no Zod\xEDaco Tropical e no Astron\xF4mico Realista.",
        url: "https://mapa-astral.lcv.app.br",
        icon: "\u2728",
        badge: "Abrir App"
      },
      {
        name: "Or\xE1culo Financeiro",
        description: "Consolida\xE7\xE3o e proje\xE7\xE3o de m\xE9tricas financeiras.",
        url: "https://oraculo-financeiro.lcv.app.br",
        icon: "\u{1F4B0}",
        badge: "Abrir App"
      },
      {
        name: "Calculadora Ita\xFA",
        description: "Simulador para opera\xE7\xF5es financeiras Ita\xFA.",
        url: "https://calculadora-itau.lcv.app.br/",
        icon: "\u{1F9EE}",
        badge: "Abrir App"
      }
    ];
    ADMINHUB_DEFAULT_CARDS = [
      {
        name: "MTA-STS ADMIN",
        description: "Ferramenta administrativa para gera\xE7\xE3o e gest\xE3o de identificadores e pol\xEDticas.",
        url: "https://mtasts-admin.lcv.app.br",
        icon: "\u{1F510}",
        badge: "Autenticar"
      },
      {
        name: "Leitor TLS-RPT",
        description: "Leitura e consolida\xE7\xE3o de relat\xF3rios TLS para an\xE1lise operacional.",
        url: "https://tls-rpt.lcv.app.br",
        icon: "\u{1F4C4}",
        badge: "Autenticar"
      },
      {
        name: "MainSite Admin",
        description: "Painel de gest\xE3o do site principal.",
        url: "https://admin-site.lcv.rio.br",
        icon: "\u{1F3E2}",
        badge: "Autenticar"
      },
      {
        name: "Astr\xF3logo Admin",
        description: "Painel administrativo do ecossistema Astr\xF3logo.",
        url: "https://admin-astrologo.lcv.app.br",
        icon: "\u{1F30C}",
        badge: "Autenticar"
      },
      {
        name: "Ita\xFA Calculadora Admin",
        description: "Painel administrativo da calculadora de c\xE2mbio com controle operacional.",
        url: "https://admin-itau.lcv.app.br",
        icon: "\u{1F3E6}",
        badge: "Autenticar"
      }
    ];
    toHubHeaders = /* @__PURE__ */ __name(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHubHeaders");
    toTable = /* @__PURE__ */ __name((module) => module === "apphub" ? "apphub_cards" : "adminhub_cards", "toTable");
    toDefaultCards = /* @__PURE__ */ __name((module) => module === "apphub" ? APPHUB_DEFAULT_CARDS : ADMINHUB_DEFAULT_CARDS, "toDefaultCards");
    sanitizeCard = /* @__PURE__ */ __name((raw) => {
      const name = String(raw.name ?? "").trim();
      const description = String(raw.description ?? "").trim();
      const url = String(raw.url ?? "").trim();
      const icon = String(raw.icon ?? "").trim();
      const badge = String(raw.badge ?? "").trim();
      if (!name || !description || !url) {
        return null;
      }
      return {
        name,
        description,
        url,
        icon,
        badge
      };
    }, "sanitizeCard");
    isValidHttpUrl = /* @__PURE__ */ __name((value) => {
      try {
        const parsed = new URL(value);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    }, "isValidHttpUrl");
    validateCards = /* @__PURE__ */ __name((cards) => {
      if (cards.length === 0) {
        throw new Error("Informe ao menos um card v\xE1lido (name, description e url s\xE3o obrigat\xF3rios).");
      }
      if (cards.length > HUB_CARDS_LIMITS.maxCards) {
        throw new Error(`Limite excedido: m\xE1ximo de ${HUB_CARDS_LIMITS.maxCards} cards por m\xF3dulo.`);
      }
      const seenNames = /* @__PURE__ */ new Set();
      const seenUrls = /* @__PURE__ */ new Set();
      for (const [index, card] of cards.entries()) {
        const position = index + 1;
        if (card.name.length > HUB_CARDS_LIMITS.nameMaxLength) {
          throw new Error(`Card #${position}: nome excede ${HUB_CARDS_LIMITS.nameMaxLength} caracteres.`);
        }
        if (card.description.length > HUB_CARDS_LIMITS.descriptionMaxLength) {
          throw new Error(`Card #${position}: descri\xE7\xE3o excede ${HUB_CARDS_LIMITS.descriptionMaxLength} caracteres.`);
        }
        if (card.url.length > HUB_CARDS_LIMITS.urlMaxLength) {
          throw new Error(`Card #${position}: URL excede ${HUB_CARDS_LIMITS.urlMaxLength} caracteres.`);
        }
        if (card.icon.length > HUB_CARDS_LIMITS.iconMaxLength) {
          throw new Error(`Card #${position}: \xEDcone excede ${HUB_CARDS_LIMITS.iconMaxLength} caracteres.`);
        }
        if (card.badge.length > HUB_CARDS_LIMITS.badgeMaxLength) {
          throw new Error(`Card #${position}: badge excede ${HUB_CARDS_LIMITS.badgeMaxLength} caracteres.`);
        }
        if (!isValidHttpUrl(card.url)) {
          throw new Error(`Card #${position}: URL inv\xE1lida. Use http:// ou https://.`);
        }
        const normalizedName = card.name.trim().toLowerCase();
        const normalizedUrl = card.url.trim().toLowerCase();
        if (seenNames.has(normalizedName)) {
          throw new Error(`Card #${position}: nome duplicado no payload.`);
        }
        if (seenUrls.has(normalizedUrl)) {
          throw new Error(`Card #${position}: URL duplicada no payload.`);
        }
        seenNames.add(normalizedName);
        seenUrls.add(normalizedUrl);
      }
    }, "validateCards");
    mapRowToCard = /* @__PURE__ */ __name((row) => sanitizeCard({
      name: row.name,
      description: row.description,
      url: row.url,
      icon: row.icon ?? "",
      badge: row.badge ?? ""
    }), "mapRowToCard");
    ensureHubTables = /* @__PURE__ */ __name(async (db) => {
      await db.prepare(`
    CREATE TABLE IF NOT EXISTS apphub_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      display_order INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      url TEXT NOT NULL,
      icon TEXT,
      badge TEXT,
      updated_at INTEGER NOT NULL,
      updated_by TEXT
    )
  `).run();
      await db.prepare("CREATE INDEX IF NOT EXISTS idx_apphub_cards_display_order ON apphub_cards(display_order ASC)").run();
      await db.prepare(`
    CREATE TABLE IF NOT EXISTS adminhub_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      display_order INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      url TEXT NOT NULL,
      icon TEXT,
      badge TEXT,
      updated_at INTEGER NOT NULL,
      updated_by TEXT
    )
  `).run();
      await db.prepare("CREATE INDEX IF NOT EXISTS idx_adminhub_cards_display_order ON adminhub_cards(display_order ASC)").run();
    }, "ensureHubTables");
    loadCardsFromDb = /* @__PURE__ */ __name(async (db, module) => {
      await ensureHubTables(db);
      const table3 = toTable(module);
      const rows = await db.prepare(`
    SELECT name, description, url, icon, badge, display_order
    FROM ${table3}
    ORDER BY display_order ASC, id ASC
  `).all();
      return (rows.results ?? []).map((row) => mapRowToCard(row)).filter((item) => item !== null);
    }, "loadCardsFromDb");
    saveCardsToDb = /* @__PURE__ */ __name(async (db, module, cards, adminActor) => {
      await ensureHubTables(db);
      const table3 = toTable(module);
      await db.prepare(`DELETE FROM ${table3}`).run();
      let inserted = 0;
      const updatedAt = Date.now();
      for (const [index, card] of cards.entries()) {
        await db.prepare(`
      INSERT INTO ${table3} (display_order, name, description, url, icon, badge, updated_at, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(index, card.name, card.description, card.url, card.icon, card.badge, updatedAt, adminActor ?? null).run();
        inserted += 1;
      }
      return inserted;
    }, "saveCardsToDb");
    resolveHubConfig = /* @__PURE__ */ __name(async (env2, module) => {
      const db = env2.BIGDATA_DB;
      const defaultCards = toDefaultCards(module);
      if (db) {
        const existingCards = await loadCardsFromDb(db, module);
        if (existingCards.length > 0) {
          return {
            source: "bigdata_db",
            cards: existingCards,
            warnings: []
          };
        }
        await saveCardsToDb(db, module, defaultCards, "bootstrap@admin-app");
        return {
          source: "bootstrap-default",
          cards: defaultCards,
          warnings: ["BIGDATA_DB sem registros; bootstrap local aplicado sem chamadas entre dom\xEDnios."]
        };
      }
      return {
        source: "bootstrap-default",
        cards: defaultCards,
        warnings: ["BIGDATA_DB indispon\xEDvel; retornando defaults locais sem chamadas a apps via URL p\xFAblica."]
      };
    }, "resolveHubConfig");
    parseCardsFromBody = /* @__PURE__ */ __name((body) => {
      const payload = body;
      const items = Array.isArray(payload?.cards) ? payload.cards : [];
      const cards = items.map((item) => sanitizeCard(item)).filter((item) => item !== null);
      validateCards(cards);
      return cards;
    }, "parseCardsFromBody");
    logHubEvent = /* @__PURE__ */ __name(async (db, input) => {
      if (!db) {
        return;
      }
      await logModuleOperationalEvent(db, {
        module: input.module,
        source: input.source,
        ok: input.ok,
        fallbackUsed: input.fallbackUsed,
        errorMessage: input.errorMessage,
        metadata: {
          action: input.action,
          ...input.metadata ?? {}
        }
      });
    }, "logHubEvent");
  }
});

// api/_lib/request-trace.ts
var toRequestId, createResponseTrace;
var init_request_trace = __esm({
  "api/_lib/request-trace.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    toRequestId = /* @__PURE__ */ __name((request) => {
      const byHeader = request.headers.get("X-Request-Id")?.trim();
      if (byHeader) {
        return byHeader.slice(0, 160);
      }
      const byCfRay = request.headers.get("CF-Ray")?.trim();
      if (byCfRay) {
        return `cf-${byCfRay.slice(0, 120)}`;
      }
      return crypto.randomUUID();
    }, "toRequestId");
    createResponseTrace = /* @__PURE__ */ __name((request) => ({
      request_id: toRequestId(request),
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }), "createResponseTrace");
  }
});

// api/_lib/auth.ts
function validatePutAuth(request, bearerTokenEnv) {
  if (bearerTokenEnv) {
    const authHeader = request.headers.get("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      if (token === bearerTokenEnv) {
        return { isAuthenticated: true, token, source: "bearer" };
      }
      return { isAuthenticated: false, source: "bearer", error: "Invalid Bearer token" };
    }
    const cfAccessEmail2 = request.headers.get("CF-Access-Authenticated-User-Email");
    if (cfAccessEmail2) {
      return { isAuthenticated: true, token: cfAccessEmail2, source: "cloudflare-access" };
    }
    return { isAuthenticated: false, source: "none", error: "No authentication provided." };
  }
  const cfAccessEmail = request.headers.get("CF-Access-Authenticated-User-Email");
  return {
    isAuthenticated: true,
    token: cfAccessEmail ?? "cloudflare-access-session",
    source: "cloudflare-access"
  };
}
function unauthorizedResponse(message, headers2) {
  return new Response(
    JSON.stringify({
      error: "Unauthorized",
      message,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        ...headers2 || {}
      }
    }
  );
}
var init_auth = __esm({
  "api/_lib/auth.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name(validatePutAuth, "validatePutAuth");
    __name(unauthorizedResponse, "unauthorizedResponse");
  }
});

// api/adminhub/config.ts
async function onRequestGet2(context2) {
  const trace3 = createResponseTrace(context2.request);
  try {
    const resolved = await resolveHubConfig(context2.env, "adminhub");
    await logHubEvent(context2.env.BIGDATA_DB, {
      module: "adminhub",
      action: "config-read",
      source: resolved.source,
      ok: true,
      fallbackUsed: resolved.source !== "bigdata_db",
      metadata: {
        totalCards: resolved.cards.length,
        warnings: resolved.warnings.length
      }
    });
    return new Response(JSON.stringify({
      ok: true,
      fonte: resolved.source,
      avisos: resolved.warnings,
      total: resolved.cards.length,
      cards: resolved.cards,
      ...trace3
    }), {
      headers: toHubHeaders()
    });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha ao carregar configura\xE7\xE3o do adminhub";
    await logHubEvent(context2.env.BIGDATA_DB, {
      module: "adminhub",
      action: "config-read",
      source: "bigdata_db",
      ok: false,
      fallbackUsed: true,
      errorMessage: message
    });
    return buildErrorResponse(message, trace3, 500);
  }
}
async function onRequestPut(context2) {
  const trace3 = createResponseTrace(context2.request);
  const authContext = validatePutAuth(context2.request, context2.env.ADMINHUB_BEARER_TOKEN);
  if (!authContext.isAuthenticated) {
    return unauthorizedResponse(authContext.error || "No authentication provided");
  }
  if (!context2.env.BIGDATA_DB) {
    return buildErrorResponse("BIGDATA_DB n\xE3o configurado no runtime.", trace3, 503);
  }
  try {
    const body = await context2.request.json();
    const adminActor = resolveAdminActorFromRequest(context2.request, body);
    const cards = parseCardsFromBody(body);
    const updated = await saveCardsToDb(context2.env.BIGDATA_DB, "adminhub", cards, adminActor);
    await logHubEvent(context2.env.BIGDATA_DB, {
      module: "adminhub",
      action: "config-save",
      source: "bigdata_db",
      ok: true,
      fallbackUsed: false,
      metadata: {
        totalCards: updated,
        adminActor
      }
    });
    return new Response(JSON.stringify({
      ok: true,
      total: updated,
      admin_actor: adminActor,
      ...trace3
    }), {
      headers: toHubHeaders()
    });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha ao salvar configura\xE7\xE3o do adminhub";
    await logHubEvent(context2.env.BIGDATA_DB, {
      module: "adminhub",
      action: "config-save",
      source: "bigdata_db",
      ok: false,
      fallbackUsed: false,
      errorMessage: message
    });
    return buildErrorResponse(message, trace3, 400);
  }
}
var buildErrorResponse;
var init_config = __esm({
  "api/adminhub/config.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_admin_actor();
    init_hub_config();
    init_request_trace();
    init_auth();
    buildErrorResponse = /* @__PURE__ */ __name((message, trace3, status = 500) => new Response(JSON.stringify({
      ok: false,
      error: message,
      ...trace3
    }), {
      status,
      headers: toHubHeaders()
    }), "buildErrorResponse");
    __name(onRequestGet2, "onRequestGet");
    __name(onRequestPut, "onRequestPut");
  }
});

// api/ai-status/gcp-monitoring.ts
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
async function getAccessToken(saKey) {
  let sa;
  try {
    sa = JSON.parse(saKey);
  } catch {
    const preview = saKey.substring(0, 40);
    throw new Error(
      `GCP_SA_KEY n\xE3o \xE9 JSON v\xE1lido. Preview: "${preview}...". Cole o conte\xFAdo completo do arquivo .json da Service Account no secret do Cloudflare.`
    );
  }
  if (!sa.client_email || !sa.private_key) {
    throw new Error("GCP_SA_KEY n\xE3o cont\xE9m client_email ou private_key. Verifique o JSON.");
  }
  const now = Math.floor(Date.now() / 1e3);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/monitoring.read https://www.googleapis.com/auth/cloud-platform.read-only",
    aud: sa.token_uri || "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  };
  const b64url = /* @__PURE__ */ __name((obj) => btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""), "b64url");
  const signingInput = `${b64url(header)}.${b64url(payload)}`;
  const pemBody = sa.private_key.replace(/-----BEGIN PRIVATE KEY-----/, "").replace(/-----END PRIVATE KEY-----/, "").replace(/\n/g, "");
  const keyBuffer = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyBuffer.buffer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );
  const b64Sig = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const jwt = `${signingInput}.${b64Sig}`;
  const tokenRes = await fetch(sa.token_uri || "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
  });
  if (!tokenRes.ok) {
    throw new Error(`Token exchange failed: ${tokenRes.status} ${await tokenRes.text()}`);
  }
  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}
var onRequestGet3;
var init_gcp_monitoring = __esm({
  "api/ai-status/gcp-monitoring.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name(json, "json");
    __name(getAccessToken, "getAccessToken");
    onRequestGet3 = /* @__PURE__ */ __name(async ({ env: env2 }) => {
      const saKey = env2?.GCP_SA_KEY;
      const projectId = env2?.GCP_PROJECT_ID;
      if (!saKey || !projectId) {
        return json({
          ok: false,
          configured: false,
          error: "GCP_SA_KEY e GCP_PROJECT_ID n\xE3o configurados.",
          setupGuide: {
            title: "Como configurar o GCP Monitoring (Tier C)",
            steps: [
              "1. Acesse https://console.cloud.google.com/iam-admin/serviceaccounts",
              '2. No projeto que cont\xE9m a API Key do Gemini, clique "Criar conta de servi\xE7o"',
              '3. Nome: "admin-app-monitoring" (ou similar)',
              '4. Conceda o papel (role): "Monitoring Viewer" (roles/monitoring.viewer)',
              '5. Opcional: adicione "Service Usage Consumer" (roles/serviceusage.serviceUsageConsumer) para dados de quota',
              '6. Na aba "Chaves", clique "Adicionar chave" \u2192 "Criar nova chave" \u2192 JSON',
              "7. Baixe o arquivo JSON \u2014 este \xE9 o GCP_SA_KEY",
              "8. No Cloudflare Dashboard \u2192 seu Pages project \u2192 Settings \u2192 Environment Variables:",
              "   - GCP_SA_KEY = (cole o conte\xFAdo completo do JSON)",
              "   - GCP_PROJECT_ID = (o ID do projeto GCP, vis\xEDvel no topo do Console)",
              "9. Redeploy o admin-app para ativar"
            ],
            requiredRoles: ["roles/monitoring.viewer"],
            optionalRoles: ["roles/serviceusage.serviceUsageConsumer", "roles/billing.viewer"],
            securityNote: "A service account ter\xE1 acesso SOMENTE LEITURA a m\xE9tricas. N\xE3o tem acesso a dados, billing ou escrita."
          }
        }, 200);
      }
      try {
        const accessToken = await getAccessToken(saKey);
        const endTime = (/* @__PURE__ */ new Date()).toISOString();
        const startTime = new Date(Date.now() - 24 * 60 * 60 * 1e3).toISOString();
        const metricDefs = [
          { metric: "serviceruntime.googleapis.com/api/request_count", resourceType: "consumed_api" },
          { metric: "serviceruntime.googleapis.com/api/request_latencies", resourceType: "consumed_api" },
          { metric: "serviceruntime.googleapis.com/quota/allocation/usage", resourceType: "consumer_quota" },
          { metric: "serviceruntime.googleapis.com/quota/limit", resourceType: "consumer_quota" }
        ];
        const results = {};
        const fetches = metricDefs.map(async ({ metric, resourceType }) => {
          const filter = encodeURIComponent(
            `metric.type="${metric}" AND resource.type="${resourceType}" AND resource.labels.service="generativelanguage.googleapis.com"`
          );
          const url = `https://monitoring.googleapis.com/v3/projects/${projectId}/timeSeries?filter=${filter}&interval.startTime=${startTime}&interval.endTime=${endTime}&aggregation.alignmentPeriod=3600s&aggregation.perSeriesAligner=ALIGN_SUM`;
          const res = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          if (!res.ok) {
            const errText = await res.text().catch(() => "");
            return { metric, error: `${res.status}: ${errText.slice(0, 300)}` };
          }
          const data = await res.json();
          if (data.error) return { metric, error: data.error.message };
          results[metric] = data.timeSeries || [];
          return { metric, ok: true, seriesCount: (data.timeSeries || []).length };
        });
        const metricResults = await Promise.all(fetches);
        return json({
          ok: true,
          configured: true,
          projectId,
          period: { start: startTime, end: endTime },
          metricResults,
          timeSeries: results
        });
      } catch (err) {
        return json({
          ok: false,
          configured: true,
          error: err instanceof Error ? err.message : "Erro ao consultar Cloud Monitoring."
        }, 500);
      }
    }, "onRequestGet");
  }
});

// api/ai-status/health.ts
function json2(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
var onRequestGet4;
var init_health = __esm({
  "api/ai-status/health.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name(json2, "json");
    onRequestGet4 = /* @__PURE__ */ __name(async ({ env: env2 }) => {
      const apiKey = env2?.GEMINI_API_KEY;
      if (!apiKey) return json2({ ok: false, error: "GEMINI_API_KEY n\xE3o configurada.", keyConfigured: false }, 503);
      try {
        const start = Date.now();
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}&pageSize=1`
        );
        const latencyMs = Date.now() - start;
        if (res.ok) {
          return json2({
            ok: true,
            keyConfigured: true,
            apiReachable: true,
            latencyMs,
            httpStatus: res.status,
            checkedAt: (/* @__PURE__ */ new Date()).toISOString()
          });
        }
        const errorBody = await res.text().catch(() => "");
        return json2({
          ok: false,
          keyConfigured: true,
          apiReachable: true,
          latencyMs,
          httpStatus: res.status,
          errorDetail: errorBody.slice(0, 500),
          checkedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      } catch (err) {
        return json2({
          ok: false,
          keyConfigured: true,
          apiReachable: false,
          latencyMs: null,
          httpStatus: null,
          error: err instanceof Error ? err.message : "Network error",
          checkedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
      }
    }, "onRequestGet");
  }
});

// api/ai-status/models.ts
function json3(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
var onRequestGet5;
var init_models = __esm({
  "api/ai-status/models.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name(json3, "json");
    onRequestGet5 = /* @__PURE__ */ __name(async ({ env: env2 }) => {
      const apiKey = env2?.GEMINI_API_KEY;
      if (!apiKey) return json3({ ok: false, error: "GEMINI_API_KEY n\xE3o configurada." }, 503);
      try {
        const start = Date.now();
        const allModels = /* @__PURE__ */ new Map();
        for (const apiVersion of ["v1", "v1beta"]) {
          let pageToken;
          do {
            const url = new URL(`https://generativelanguage.googleapis.com/${apiVersion}/models`);
            url.searchParams.set("key", apiKey);
            url.searchParams.set("pageSize", "100");
            if (pageToken) url.searchParams.set("pageToken", pageToken);
            const res = await fetch(url.toString());
            if (!res.ok) break;
            const data = await res.json();
            pageToken = data.nextPageToken;
            for (const m of data.models || []) {
              const id = m.name.replace("models/", "");
              const lower = id.toLowerCase();
              if (!lower.startsWith("gemini")) continue;
              if (!m.supportedGenerationMethods?.includes("generateContent")) continue;
              let family = "other";
              if (lower.includes("flash-lite")) family = "flash-lite";
              else if (lower.includes("flash")) family = "flash";
              else if (lower.includes("pro")) family = "pro";
              let tier = "stable";
              if (lower.includes("preview")) tier = "preview";
              else if (lower.includes("exp")) tier = "experimental";
              if (!allModels.has(id) || apiVersion === "v1beta") {
                allModels.set(id, {
                  id,
                  displayName: m.displayName || id,
                  description: m.description || "",
                  api: apiVersion,
                  inputTokenLimit: m.inputTokenLimit || 0,
                  outputTokenLimit: m.outputTokenLimit || 0,
                  thinking: m.thinking || false,
                  temperature: m.temperature ?? null,
                  maxTemperature: m.maxTemperature ?? null,
                  methods: m.supportedGenerationMethods || [],
                  family,
                  tier
                });
              }
            }
          } while (pageToken);
        }
        const latencyMs = Date.now() - start;
        const tierOrder = { stable: 0, preview: 1, experimental: 2 };
        const familyOrder = { pro: 0, flash: 1, "flash-lite": 2, other: 3 };
        const models = [...allModels.values()].sort((a, b) => {
          const td = (tierOrder[a.tier] ?? 9) - (tierOrder[b.tier] ?? 9);
          if (td !== 0) return td;
          const fd = (familyOrder[a.family] ?? 9) - (familyOrder[b.family] ?? 9);
          if (fd !== 0) return fd;
          return a.id.localeCompare(b.id);
        });
        return json3({ ok: true, models, total: models.length, latencyMs });
      } catch (err) {
        return json3({ ok: false, error: err instanceof Error ? err.message : "Erro ao listar modelos." }, 500);
      }
    }, "onRequestGet");
  }
});

// api/ai-status/usage.ts
function json4(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
async function ensureTable(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS ai_usage_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      module TEXT NOT NULL,
      model TEXT NOT NULL,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      latency_ms INTEGER DEFAULT 0,
      status TEXT DEFAULT 'ok',
      error_detail TEXT
    )
  `).run();
}
var onRequestGet6, onRequestPost2;
var init_usage = __esm({
  "api/ai-status/usage.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name(json4, "json");
    __name(ensureTable, "ensureTable");
    onRequestGet6 = /* @__PURE__ */ __name(async ({ env: env2 }) => {
      const db = env2?.BIGDATA_DB;
      if (!db) return json4({ ok: false, error: "BIGDATA_DB n\xE3o configurado." }, 503);
      try {
        await ensureTable(db);
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1e3).toISOString();
        const [summaryRes, dailyRes, byModuleRes, byModelRes] = await Promise.all([
          // Resumo total
          db.prepare(`
        SELECT 
          COUNT(*) as total_requests,
          COALESCE(SUM(input_tokens), 0) as total_input_tokens,
          COALESCE(SUM(output_tokens), 0) as total_output_tokens,
          COALESCE(SUM(CASE WHEN status != 'ok' THEN 1 ELSE 0 END), 0) as total_errors,
          COALESCE(AVG(latency_ms), 0) as avg_latency_ms
        FROM ai_usage_logs WHERE timestamp >= ?
      `).bind(since).first(),
          // Uso diário
          db.prepare(`
        SELECT 
          DATE(timestamp) as day,
          COUNT(*) as requests,
          COALESCE(SUM(input_tokens), 0) as input_tokens,
          COALESCE(SUM(output_tokens), 0) as output_tokens,
          COALESCE(SUM(CASE WHEN status != 'ok' THEN 1 ELSE 0 END), 0) as errors
        FROM ai_usage_logs WHERE timestamp >= ?
        GROUP BY DATE(timestamp) ORDER BY day ASC
      `).bind(since).all(),
          // Breakdown por módulo
          db.prepare(`
        SELECT 
          module,
          COUNT(*) as requests,
          COALESCE(SUM(input_tokens), 0) as input_tokens,
          COALESCE(SUM(output_tokens), 0) as output_tokens
        FROM ai_usage_logs WHERE timestamp >= ?
        GROUP BY module ORDER BY requests DESC
      `).bind(since).all(),
          // Breakdown por modelo
          db.prepare(`
        SELECT 
          model,
          COUNT(*) as requests,
          COALESCE(SUM(input_tokens), 0) as input_tokens,
          COALESCE(SUM(output_tokens), 0) as output_tokens
        FROM ai_usage_logs WHERE timestamp >= ?
        GROUP BY model ORDER BY requests DESC
      `).bind(since).all()
        ]);
        return json4({
          ok: true,
          period: { since, until: (/* @__PURE__ */ new Date()).toISOString() },
          summary: summaryRes || {
            total_requests: 0,
            total_input_tokens: 0,
            total_output_tokens: 0,
            total_errors: 0,
            avg_latency_ms: 0
          },
          daily: dailyRes?.results || [],
          byModule: byModuleRes?.results || [],
          byModel: byModelRes?.results || []
        });
      } catch (err) {
        return json4({ ok: false, error: err instanceof Error ? err.message : "Erro ao ler usage logs." }, 500);
      }
    }, "onRequestGet");
    onRequestPost2 = /* @__PURE__ */ __name(async ({ env: env2, request }) => {
      const db = env2?.BIGDATA_DB;
      if (!db) return json4({ ok: false, error: "BIGDATA_DB n\xE3o configurado." }, 503);
      try {
        await ensureTable(db);
        const body = await request.json();
        if (!body.module || !body.model) {
          return json4({ ok: false, error: "module e model s\xE3o obrigat\xF3rios." }, 400);
        }
        await db.prepare(`
      INSERT INTO ai_usage_logs (module, model, input_tokens, output_tokens, latency_ms, status, error_detail)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
          body.module,
          body.model,
          body.input_tokens || 0,
          body.output_tokens || 0,
          body.latency_ms || 0,
          body.status || "ok",
          body.error_detail || null
        ).run();
        return json4({ ok: true });
      } catch (err) {
        return json4({ ok: false, error: err instanceof Error ? err.message : "Erro ao registrar log." }, 500);
      }
    }, "onRequestPost");
  }
});

// api/apphub/config.ts
async function onRequestGet7(context2) {
  const trace3 = createResponseTrace(context2.request);
  try {
    const resolved = await resolveHubConfig(context2.env, "apphub");
    await logHubEvent(context2.env.BIGDATA_DB, {
      module: "apphub",
      action: "config-read",
      source: resolved.source,
      ok: true,
      fallbackUsed: resolved.source !== "bigdata_db",
      metadata: {
        totalCards: resolved.cards.length,
        warnings: resolved.warnings.length
      }
    });
    return new Response(JSON.stringify({
      ok: true,
      fonte: resolved.source,
      avisos: resolved.warnings,
      total: resolved.cards.length,
      cards: resolved.cards,
      ...trace3
    }), {
      headers: toHubHeaders()
    });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha ao carregar configura\xE7\xE3o do apphub";
    await logHubEvent(context2.env.BIGDATA_DB, {
      module: "apphub",
      action: "config-read",
      source: "bigdata_db",
      ok: false,
      fallbackUsed: true,
      errorMessage: message
    });
    return buildErrorResponse2(message, trace3, 500);
  }
}
async function onRequestPut2(context2) {
  const trace3 = createResponseTrace(context2.request);
  const authContext = validatePutAuth(context2.request, context2.env.APPHUB_BEARER_TOKEN);
  if (!authContext.isAuthenticated) {
    return unauthorizedResponse(authContext.error || "No authentication provided");
  }
  if (!context2.env.BIGDATA_DB) {
    return buildErrorResponse2("BIGDATA_DB n\xE3o configurado no runtime.", trace3, 503);
  }
  try {
    const body = await context2.request.json();
    const adminActor = resolveAdminActorFromRequest(context2.request, body);
    const cards = parseCardsFromBody(body);
    const updated = await saveCardsToDb(context2.env.BIGDATA_DB, "apphub", cards, adminActor);
    await logHubEvent(context2.env.BIGDATA_DB, {
      module: "apphub",
      action: "config-save",
      source: "bigdata_db",
      ok: true,
      fallbackUsed: false,
      metadata: {
        totalCards: updated,
        adminActor
      }
    });
    return new Response(JSON.stringify({
      ok: true,
      total: updated,
      admin_actor: adminActor,
      ...trace3
    }), {
      headers: toHubHeaders()
    });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha ao salvar configura\xE7\xE3o do apphub";
    await logHubEvent(context2.env.BIGDATA_DB, {
      module: "apphub",
      action: "config-save",
      source: "bigdata_db",
      ok: false,
      fallbackUsed: false,
      errorMessage: message
    });
    return buildErrorResponse2(message, trace3, 400);
  }
}
var buildErrorResponse2;
var init_config2 = __esm({
  "api/apphub/config.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_admin_actor();
    init_hub_config();
    init_request_trace();
    init_auth();
    buildErrorResponse2 = /* @__PURE__ */ __name((message, trace3, status = 500) => new Response(JSON.stringify({
      ok: false,
      error: message,
      ...trace3
    }), {
      status,
      headers: toHubHeaders()
    }), "buildErrorResponse");
    __name(onRequestGet7, "onRequestGet");
    __name(onRequestPut2, "onRequestPut");
  }
});

// api/_lib/astrologo-admin.ts
var DEFAULT_POLICIES, SUPPORTED_ROUTES, toDbRoute, toHeaders, toInt, ensureRateLimitTables, ensureDefaultPolicies, getRateLimitWindowStats, listPoliciesWithStats, upsertRateLimitPolicy, resetRateLimitPolicy;
var init_astrologo_admin = __esm({
  "api/_lib/astrologo-admin.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    DEFAULT_POLICIES = {
      calcular: {
        route: "calcular",
        label: "C\xE1lculo de Mapa",
        enabled: 1,
        max_requests: 10,
        window_minutes: 10
      },
      analisar: {
        route: "analisar",
        label: "An\xE1lise IA",
        enabled: 1,
        max_requests: 6,
        window_minutes: 15
      },
      "enviar-email": {
        route: "enviar-email",
        label: "Envio de E-mail",
        enabled: 1,
        max_requests: 4,
        window_minutes: 60
      },
      contato: {
        route: "contato",
        label: "Formul\xE1rio de Contato",
        enabled: 1,
        max_requests: 5,
        window_minutes: 30
      }
    };
    SUPPORTED_ROUTES = ["calcular", "analisar", "enviar-email", "contato"];
    toDbRoute = /* @__PURE__ */ __name((route) => route.startsWith("astrologo/") ? route : `astrologo/${route}`, "toDbRoute");
    toHeaders = /* @__PURE__ */ __name(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    toInt = /* @__PURE__ */ __name((value, fallback) => {
      const parsed = Number.parseInt(String(value), 10);
      return Number.isFinite(parsed) ? parsed : fallback;
    }, "toInt");
    ensureRateLimitTables = /* @__PURE__ */ __name(async (db) => {
      await db.prepare(`
    CREATE TABLE IF NOT EXISTS astrologo_rate_limit_policies (
      route TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 1,
      max_requests INTEGER NOT NULL,
      window_minutes INTEGER NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
      await db.prepare(`
    CREATE TABLE IF NOT EXISTS astrologo_api_rate_limits (
      key TEXT PRIMARY KEY,
      route TEXT NOT NULL,
      window_start INTEGER NOT NULL,
      request_count INTEGER NOT NULL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
    }, "ensureRateLimitTables");
    ensureDefaultPolicies = /* @__PURE__ */ __name(async (db) => {
      await ensureRateLimitTables(db);
      for (const route of SUPPORTED_ROUTES) {
        const policy = DEFAULT_POLICIES[route];
        await db.prepare(`
      INSERT OR IGNORE INTO astrologo_rate_limit_policies (route, enabled, max_requests, window_minutes)
      VALUES (?, ?, ?, ?)
    `).bind(toDbRoute(policy.route), policy.enabled, policy.max_requests, policy.window_minutes).run();
      }
    }, "ensureDefaultPolicies");
    getRateLimitWindowStats = /* @__PURE__ */ __name(async (db, route, windowMinutes) => {
      const now = Date.now();
      const cutoff = now - Math.max(1, toInt(windowMinutes, 10)) * 60 * 1e3;
      const row = await db.prepare(`
    SELECT
      COALESCE(SUM(request_count), 0) AS total,
      COUNT(DISTINCT key) AS keys
    FROM astrologo_api_rate_limits
    WHERE route = ? AND window_start >= ?
  `).bind(toDbRoute(route), cutoff).first();
      return {
        total_requests_window: toInt(row?.total, 0),
        distinct_keys_window: toInt(row?.keys, 0)
      };
    }, "getRateLimitWindowStats");
    listPoliciesWithStats = /* @__PURE__ */ __name(async (db) => {
      await ensureDefaultPolicies(db);
      const output = [];
      for (const route of SUPPORTED_ROUTES) {
        const fallback = DEFAULT_POLICIES[route];
        const row = await db.prepare(`
      SELECT route, enabled, max_requests, window_minutes, updated_at
      FROM astrologo_rate_limit_policies
      WHERE route = ?
      LIMIT 1
    `).bind(toDbRoute(route)).first();
        const policy = {
          route,
          label: fallback.label,
          enabled: toInt(row?.enabled, fallback.enabled) === 1,
          max_requests: Math.max(1, toInt(row?.max_requests, fallback.max_requests)),
          window_minutes: Math.max(1, toInt(row?.window_minutes, fallback.window_minutes)),
          updated_at: typeof row?.updated_at === "string" ? row.updated_at : null,
          defaults: {
            enabled: fallback.enabled === 1,
            max_requests: fallback.max_requests,
            window_minutes: fallback.window_minutes
          },
          stats: {
            total_requests_window: 0,
            distinct_keys_window: 0
          }
        };
        policy.stats = await getRateLimitWindowStats(db, route, policy.window_minutes);
        output.push(policy);
      }
      return output;
    }, "listPoliciesWithStats");
    upsertRateLimitPolicy = /* @__PURE__ */ __name(async (db, input) => {
      await ensureDefaultPolicies(db);
      await db.prepare(`
    INSERT INTO astrologo_rate_limit_policies (route, enabled, max_requests, window_minutes, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(route) DO UPDATE SET
      enabled = excluded.enabled,
      max_requests = excluded.max_requests,
      window_minutes = excluded.window_minutes,
      updated_at = CURRENT_TIMESTAMP
  `).bind(toDbRoute(input.route), input.enabled, input.maxRequests, input.windowMinutes).run();
    }, "upsertRateLimitPolicy");
    resetRateLimitPolicy = /* @__PURE__ */ __name(async (db, route) => {
      const fallback = DEFAULT_POLICIES[route];
      await upsertRateLimitPolicy(db, {
        route,
        enabled: fallback.enabled,
        maxRequests: fallback.max_requests,
        windowMinutes: fallback.window_minutes
      });
    }, "resetRateLimitPolicy");
  }
});

// api/astrologo/enviar-email.ts
async function onRequestPost3(context2) {
  const { request, env: env2 } = context2;
  const trace3 = createResponseTrace(request);
  try {
    const body = await request.json();
    const adminActor = resolveAdminActorFromRequest(request, body);
    const emailDestino = String(body.emailDestino ?? "").trim();
    const relatorioHtml = String(body.relatorioHtml ?? "");
    const relatorioTexto = String(body.relatorioTexto ?? "");
    const nomeConsulente = String(body.nomeConsulente ?? "").trim();
    if (!isValidEmail(emailDestino)) {
      return json5({ ok: false, error: "E-mail de destino inv\xE1lido.", ...trace3 }, 400);
    }
    if (!relatorioHtml && !relatorioTexto) {
      return json5({ ok: false, error: "Relat\xF3rio vazio.", ...trace3 }, 400);
    }
    if (!env2.RESEND_API_KEY) {
      return json5({ ok: false, error: "RESEND_API_KEY n\xE3o configurada no runtime.", ...trace3 }, 503);
    }
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env2.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Or\xE1culo Astrol\xF3gico <astrologo@lcv.app.br>",
        to: [emailDestino],
        subject: `\u{1F30C} Dossi\xEA Astrol\xF3gico e Esot\xE9rico de ${nomeConsulente || "consulente"}`,
        html: relatorioHtml,
        text: relatorioTexto
      })
    });
    const resendPayload = await resendResponse.json();
    if (!resendResponse.ok) {
      const message = String(resendPayload.message ?? resendPayload.error ?? "Falha ao enviar e-mail via Resend.");
      if (env2.BIGDATA_DB) {
        try {
          await logModuleOperationalEvent(env2.BIGDATA_DB, {
            module: "astrologo",
            source: "bigdata_db",
            fallbackUsed: false,
            ok: false,
            errorMessage: message,
            metadata: {
              action: "send-email",
              emailDestino,
              adminActor
            }
          });
        } catch {
        }
      }
      return json5({ ok: false, error: message, ...trace3 }, 502);
    }
    if (env2.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(env2.BIGDATA_DB, {
          module: "astrologo",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: "send-email",
            emailDestino,
            adminActor
          }
        });
      } catch {
      }
    }
    return json5({
      ok: true,
      message: "E-mail enviado com sucesso!",
      provider: "resend",
      id: resendPayload.id ?? null,
      admin_actor: adminActor,
      ...trace3
    });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha interna na comunica\xE7\xE3o do e-mail.";
    if (env2.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(env2.BIGDATA_DB, {
          module: "astrologo",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: "send-email"
          }
        });
      } catch {
      }
    }
    return json5({ ok: false, error: message, ...trace3 }, 500);
  }
}
var json5, isValidEmail;
var init_enviar_email = __esm({
  "api/astrologo/enviar-email.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_astrologo_admin();
    init_admin_actor();
    init_request_trace();
    json5 = /* @__PURE__ */ __name((data, status = 200) => new Response(JSON.stringify(data), {
      status,
      headers: toHeaders()
    }), "json");
    isValidEmail = /* @__PURE__ */ __name((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()), "isValidEmail");
    __name(onRequestPost3, "onRequestPost");
  }
});

// api/astrologo/excluir.ts
async function onRequestPost4(context2) {
  const trace3 = createResponseTrace(context2.request);
  const db = resolveDb(context2);
  const source = resolveOperationalSource();
  if (!db) {
    return json6({ ok: false, error: "Nenhum binding D1 dispon\xEDvel (BIGDATA_DB).", ...trace3 }, 503);
  }
  try {
    const body = await context2.request.json();
    const adminActor = resolveAdminActorFromRequest(context2.request, body);
    const id = String(body.id ?? "").trim();
    if (!id) {
      return json6({ ok: false, error: "ID inv\xE1lido.", ...trace3 }, 400);
    }
    await db.prepare("DELETE FROM astrologo_mapas WHERE id = ?").bind(id).run();
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "astrologo",
          source,
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: "delete-mapa",
            mapaId: id,
            adminActor
          }
        });
      } catch {
      }
    }
    return json6({ ok: true, id, admin_actor: adminActor, ...trace3 });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha ao excluir mapa do Astr\xF3logo";
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "astrologo",
          source,
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: { action: "delete-mapa" }
        });
      } catch {
      }
    }
    return json6({ ok: false, error: message, ...trace3 }, 500);
  }
}
var json6, resolveDb, resolveOperationalSource;
var init_excluir = __esm({
  "api/astrologo/excluir.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_astrologo_admin();
    init_admin_actor();
    init_request_trace();
    json6 = /* @__PURE__ */ __name((data, status = 200) => new Response(JSON.stringify(data), {
      status,
      headers: toHeaders()
    }), "json");
    resolveDb = /* @__PURE__ */ __name((context2) => context2.env.BIGDATA_DB, "resolveDb");
    resolveOperationalSource = /* @__PURE__ */ __name(() => "bigdata_db", "resolveOperationalSource");
    __name(onRequestPost4, "onRequestPost");
  }
});

// api/astrologo/ler.ts
async function onRequestPost5(context2) {
  const trace3 = createResponseTrace(context2.request);
  const db = resolveDb2(context2);
  const source = resolveOperationalSource2();
  if (!db) {
    return json7({ ok: false, error: "Nenhum binding D1 dispon\xEDvel (BIGDATA_DB).", ...trace3 }, 503);
  }
  try {
    const body = await context2.request.json();
    const adminActor = resolveAdminActorFromRequest(context2.request, body);
    const id = String(body.id ?? "").trim();
    if (!id) {
      return json7({ ok: false, error: "ID inv\xE1lido.", ...trace3 }, 400);
    }
    const mapa = await db.prepare(`
      SELECT
        id,
        nome,
        data_nascimento,
        hora_nascimento,
        local_nascimento,
        dados_astronomica,
        dados_tropical,
        dados_globais,
        analise_ia,
        created_at
      FROM astrologo_mapas
      WHERE id = ?
      LIMIT 1
    `).bind(id).first();
    if (!mapa) {
      return json7({ ok: false, error: "Mapa n\xE3o encontrado.", ...trace3 }, 404);
    }
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "astrologo",
          source,
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: "read-mapa",
            mapaId: id,
            adminActor
          }
        });
      } catch {
      }
    }
    return json7({
      ok: true,
      mapa,
      admin_actor: adminActor,
      ...trace3
    });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha ao ler mapa do Astr\xF3logo";
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "astrologo",
          source,
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: { action: "read-mapa" }
        });
      } catch {
      }
    }
    return json7({ ok: false, error: message, ...trace3 }, 500);
  }
}
var json7, resolveDb2, resolveOperationalSource2;
var init_ler = __esm({
  "api/astrologo/ler.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_astrologo_admin();
    init_admin_actor();
    init_request_trace();
    json7 = /* @__PURE__ */ __name((data, status = 200) => new Response(JSON.stringify(data), {
      status,
      headers: toHeaders()
    }), "json");
    resolveDb2 = /* @__PURE__ */ __name((context2) => context2.env.BIGDATA_DB, "resolveDb");
    resolveOperationalSource2 = /* @__PURE__ */ __name(() => "bigdata_db", "resolveOperationalSource");
    __name(onRequestPost5, "onRequestPost");
  }
});

// api/astrologo/listar.ts
async function onRequestGet8(context2) {
  const { request, env: env2 } = context2;
  const trace3 = createResponseTrace(request);
  const url = new URL(request.url);
  const nome = (url.searchParams.get("nome") ?? "").trim();
  const dataInicial = (url.searchParams.get("dataInicial") ?? "").trim();
  const dataFinal = (url.searchParams.get("dataFinal") ?? "").trim();
  const email = (url.searchParams.get("email") ?? "").trim();
  const avisos = [];
  if (email) {
    avisos.push("Filtro por e-mail ainda n\xE3o est\xE1 dispon\xEDvel nesta fase de integra\xE7\xE3o.");
  }
  if (env2.BIGDATA_DB) {
    try {
      const items = await queryBigdataItems(env2.BIGDATA_DB, { nome, dataInicial, dataFinal });
      try {
        await logModuleOperationalEvent(env2.BIGDATA_DB, {
          module: "astrologo",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: true,
          metadata: { total: items.length }
        });
      } catch {
      }
      return new Response(JSON.stringify({
        ok: true,
        ...trace3,
        total: items.length,
        fonte: "bigdata_db",
        filtros: { nome, dataInicial, dataFinal, email },
        avisos,
        items
      }), { headers: toResponseHeaders() });
    } catch (error3) {
      const message = error3 instanceof Error ? error3.message : "Falha ao consultar bigdata_db";
      avisos.push(`Fallback para legado ativado: ${message}`);
    }
  }
  return new Response(JSON.stringify({
    ok: false,
    ...trace3,
    error: "BIGDATA_DB indispon\xEDvel para leitura do m\xF3dulo Astr\xF3logo.",
    total: 0,
    filtros: { nome, dataInicial, dataFinal, email },
    avisos: [...avisos, "Fallback para admin legado desativado por Cloudflare Access."],
    items: []
  }), {
    status: 503,
    headers: toResponseHeaders()
  });
}
var toResponseHeaders, toItem, queryBigdataItems;
var init_listar = __esm({
  "api/astrologo/listar.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_request_trace();
    toResponseHeaders = /* @__PURE__ */ __name(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toResponseHeaders");
    toItem = /* @__PURE__ */ __name((mapa) => {
      const id = (mapa.id ?? "").trim();
      const nome = (mapa.nome ?? "").trim();
      const dataNascimento = (mapa.data_nascimento ?? "").trim();
      if (!id || !nome || !dataNascimento) {
        return null;
      }
      const hasAnaliseField = Object.hasOwn(mapa, "analise_ia");
      const status = hasAnaliseField ? mapa.analise_ia ? "analisado" : "novo" : "indisponivel";
      return {
        id,
        nome,
        dataNascimento,
        status
      };
    }, "toItem");
    queryBigdataItems = /* @__PURE__ */ __name(async (db, filtros) => {
      const { nome, dataInicial, dataFinal } = filtros;
      const clauses = [];
      const bindings = [];
      if (nome) {
        clauses.push("LOWER(nome) LIKE ?");
        bindings.push(`%${nome.toLowerCase()}%`);
      }
      if (dataInicial) {
        clauses.push("data_nascimento >= ?");
        bindings.push(dataInicial);
      }
      if (dataFinal) {
        clauses.push("data_nascimento <= ?");
        bindings.push(dataFinal);
      }
      const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(" AND ")}` : "";
      const query = `
    SELECT id, nome, data_nascimento, analise_ia
    FROM astrologo_mapas
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT 300
  `;
      const result = await db.prepare(query).bind(...bindings).all();
      const rows = Array.isArray(result.results) ? result.results : [];
      return rows.map((mapa) => toItem({
        id: mapa.id,
        nome: mapa.nome,
        data_nascimento: mapa.data_nascimento,
        analise_ia: mapa.analise_ia
      })).filter((item) => item !== null);
    }, "queryBigdataItems");
    __name(onRequestGet8, "onRequestGet");
  }
});

// api/astrologo/modelos.ts
function json8(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
var onRequestGet9;
var init_modelos = __esm({
  "api/astrologo/modelos.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name(json8, "json");
    onRequestGet9 = /* @__PURE__ */ __name(async ({ env: env2 }) => {
      const apiKey = env2?.GEMINI_API_KEY;
      if (!apiKey) return json8({ ok: false, error: "GEMINI_API_KEY n\xE3o configurada." }, 503);
      try {
        const [v1Res, v1betaRes] = await Promise.allSettled([
          fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`),
          fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
        ]);
        const allModels = /* @__PURE__ */ new Map();
        for (const [apiLabel, result] of [["v1", v1Res], ["v1beta", v1betaRes]]) {
          if (result.status !== "fulfilled" || !result.value.ok) continue;
          const data = await result.value.json();
          if (!data.models) continue;
          for (const m of data.models) {
            const id = m.name.replace("models/", "");
            const lower = id.toLowerCase();
            const isFlashOrPro = lower.includes("flash") || lower.includes("pro");
            const isGemini = lower.startsWith("gemini");
            if (!isGemini || !isFlashOrPro) continue;
            const supportsGenerate = m.supportedGenerationMethods?.includes("generateContent") ?? false;
            if (!supportsGenerate) continue;
            const hasVision = lower.includes("vision") || lower.includes("pro") || lower.includes("flash");
            if (!allModels.has(id)) {
              allModels.set(id, {
                id,
                displayName: m.displayName || id,
                api: apiLabel,
                vision: hasVision
              });
            }
          }
        }
        const models = [...allModels.values()].sort((a, b) => {
          const aPreview = a.id.includes("preview") || a.id.includes("exp") ? 1 : 0;
          const bPreview = b.id.includes("preview") || b.id.includes("exp") ? 1 : 0;
          if (aPreview !== bPreview) return aPreview - bPreview;
          const aPro = a.id.includes("pro") ? 0 : 1;
          const bPro = b.id.includes("pro") ? 0 : 1;
          return aPro - bPro || a.id.localeCompare(b.id);
        });
        return json8({ ok: true, models, total: models.length });
      } catch (err) {
        return json8({ ok: false, error: err instanceof Error ? err.message : "Erro ao listar modelos." }, 500);
      }
    }, "onRequestGet");
  }
});

// api/astrologo/rate-limit.ts
async function onRequestGet10(context2) {
  const trace3 = createResponseTrace(context2.request);
  const db = resolveRateLimitDb(context2);
  const source = resolveOperationalSource3(context2);
  if (!db) {
    return json9({ ok: false, error: "Nenhum binding D1 dispon\xEDvel (BIGDATA_DB).", ...trace3 }, 503);
  }
  try {
    const adminActor = resolveAdminActorFromRequest(context2.request);
    const policies = await listPoliciesWithStats(db);
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "astrologo",
          source,
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: "read-rate-limit",
            policies: policies.length,
            adminActor
          }
        });
      } catch {
      }
    }
    return json9({ ok: true, policies, admin_actor: adminActor, ...trace3 });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha ao carregar painel de rate limit do Astr\xF3logo";
    const fallbackPolicies = buildFallbackPolicies();
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "astrologo",
          source,
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: { action: "read-rate-limit" }
        });
      } catch {
      }
    }
    return json9({
      ok: true,
      warnings: [message, "Fallback de pol\xEDticas padr\xE3o aplicado para evitar indisponibilidade do painel."],
      policies: fallbackPolicies,
      ...trace3
    }, 200);
  }
}
async function onRequestPost6(context2) {
  const trace3 = createResponseTrace(context2.request);
  const db = resolveRateLimitDb(context2);
  const source = resolveOperationalSource3(context2);
  if (!db) {
    return json9({ ok: false, error: "Nenhum binding D1 dispon\xEDvel (ASTROLOGO_SOURCE_DB/BIGDATA_DB).", ...trace3 }, 503);
  }
  try {
    const body = await context2.request.json();
    const adminActor = resolveAdminActorFromRequest(context2.request, body);
    const route = normalizeRoute(body.route);
    if (!route) {
      return json9({ ok: false, error: "Rota de rate limit inv\xE1lida.", ...trace3 }, 400);
    }
    const action = String(body.action ?? "update").trim();
    if (action === "restore_default") {
      await resetRateLimitPolicy(db, route);
      const policies2 = await listPoliciesWithStats(db);
      if (context2.env.BIGDATA_DB) {
        try {
          await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
            module: "astrologo",
            source,
            fallbackUsed: false,
            ok: true,
            metadata: {
              action: "restore-rate-limit-default",
              route,
              adminActor
            }
          });
        } catch {
        }
      }
      return json9({ ok: true, action: "restore_default", policies: policies2, admin_actor: adminActor, ...trace3 });
    }
    const enabled = body.enabled ? 1 : 0;
    const maxRequests = toPositiveInt(body.max_requests, 10);
    const windowMinutes = toPositiveInt(body.window_minutes, 10);
    if (maxRequests > 500 || windowMinutes > 1440) {
      return json9({ ok: false, error: "Par\xE2metros fora da faixa permitida.", ...trace3 }, 400);
    }
    await upsertRateLimitPolicy(db, {
      route,
      enabled,
      maxRequests,
      windowMinutes
    });
    const policies = await listPoliciesWithStats(db);
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "astrologo",
          source,
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: "save-rate-limit",
            route,
            enabled: enabled === 1,
            maxRequests,
            windowMinutes,
            adminActor
          }
        });
      } catch {
      }
    }
    return json9({ ok: true, action: "update", policies, admin_actor: adminActor, ...trace3 });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha ao salvar painel de rate limit do Astr\xF3logo";
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "astrologo",
          source,
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: { action: "save-rate-limit" }
        });
      } catch {
      }
    }
    return json9({ ok: false, error: message, ...trace3 }, 500);
  }
}
var json9, normalizeRoute, toPositiveInt, buildFallbackPolicies, resolveRateLimitDb, resolveOperationalSource3;
var init_rate_limit = __esm({
  "api/astrologo/rate-limit.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_astrologo_admin();
    init_admin_actor();
    init_request_trace();
    json9 = /* @__PURE__ */ __name((data, status = 200) => new Response(JSON.stringify(data), {
      status,
      headers: toHeaders()
    }), "json");
    normalizeRoute = /* @__PURE__ */ __name((value) => {
      const route = String(value ?? "").trim();
      if (SUPPORTED_ROUTES.includes(route)) {
        return route;
      }
      return null;
    }, "normalizeRoute");
    toPositiveInt = /* @__PURE__ */ __name((value, fallback) => {
      const parsed = Number.parseInt(String(value), 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
      }
      return parsed;
    }, "toPositiveInt");
    buildFallbackPolicies = /* @__PURE__ */ __name(() => [
      {
        route: "calcular",
        label: "C\xE1lculo de Mapa",
        enabled: true,
        max_requests: 10,
        window_minutes: 10,
        updated_at: null,
        defaults: { enabled: true, max_requests: 10, window_minutes: 10 },
        stats: { total_requests_window: 0, distinct_keys_window: 0 }
      },
      {
        route: "analisar",
        label: "An\xE1lise IA",
        enabled: true,
        max_requests: 6,
        window_minutes: 15,
        updated_at: null,
        defaults: { enabled: true, max_requests: 6, window_minutes: 15 },
        stats: { total_requests_window: 0, distinct_keys_window: 0 }
      },
      {
        route: "enviar-email",
        label: "Envio de E-mail",
        enabled: true,
        max_requests: 4,
        window_minutes: 60,
        updated_at: null,
        defaults: { enabled: true, max_requests: 4, window_minutes: 60 },
        stats: { total_requests_window: 0, distinct_keys_window: 0 }
      }
    ], "buildFallbackPolicies");
    resolveRateLimitDb = /* @__PURE__ */ __name((context2) => context2.env.BIGDATA_DB, "resolveRateLimitDb");
    resolveOperationalSource3 = /* @__PURE__ */ __name(() => "bigdata_db", "resolveOperationalSource");
    __name(onRequestGet10, "onRequestGet");
    __name(onRequestPost6, "onRequestPost");
  }
});

// api/astrologo/sync.ts
async function onRequestPost7(context2) {
  const { request, env: env2 } = context2;
  if (!env2.BIGDATA_DB) {
    return new Response(JSON.stringify({
      ok: false,
      error: "BIGDATA_DB n\xE3o configurado no runtime."
    }), {
      status: 503,
      headers: toHeaders2()
    });
  }
  const url = new URL(request.url);
  const limit = parseLimit(url.searchParams.get("limit"));
  const startedAt = Date.now();
  const syncRunId = await startSyncRun(env2.BIGDATA_DB, {
    module: "astrologo",
    status: "running",
    startedAt,
    metadata: { limit }
  });
  try {
    const source = await env2.BIGDATA_DB.prepare(`
      SELECT id, nome, data_nascimento
      FROM astrologo_mapas
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(limit).all();
    const rows = (source.results ?? []).map((mapa) => toSyncRow(mapa)).filter((item) => item !== null);
    let upserted = 0;
    for (const row of rows) {
      await env2.BIGDATA_DB.prepare(`
        INSERT INTO astrologo_mapas (id, nome, data_nascimento, created_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          nome = excluded.nome,
          data_nascimento = excluded.data_nascimento
      `).bind(row.id, row.nome, row.dataNascimento).run();
      upserted += 1;
    }
    await finishSyncRun(env2.BIGDATA_DB, {
      id: syncRunId,
      status: "success",
      finishedAt: Date.now(),
      recordsRead: rows.length,
      recordsUpserted: upserted
    });
    await logModuleOperationalEvent(env2.BIGDATA_DB, {
      module: "astrologo",
      source: "bigdata_db",
      fallbackUsed: false,
      ok: true,
      metadata: {
        action: "sync",
        limit,
        recordsRead: rows.length,
        recordsUpserted: upserted
      }
    });
    return new Response(JSON.stringify({
      ok: true,
      syncRunId,
      recordsRead: rows.length,
      recordsUpserted: upserted,
      startedAt,
      finishedAt: Date.now()
    }), {
      headers: toHeaders2()
    });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha inesperada no sync do Astr\xF3logo";
    await finishSyncRun(env2.BIGDATA_DB, {
      id: syncRunId,
      status: "error",
      finishedAt: Date.now(),
      recordsRead: 0,
      recordsUpserted: 0,
      errorMessage: message
    });
    await logModuleOperationalEvent(env2.BIGDATA_DB, {
      module: "astrologo",
      source: "bigdata_db",
      fallbackUsed: false,
      ok: false,
      errorMessage: message,
      metadata: {
        action: "sync",
        limit
      }
    });
    return new Response(JSON.stringify({
      ok: false,
      error: message,
      syncRunId
    }), {
      status: 500,
      headers: toHeaders2()
    });
  }
}
var parseLimit, toHeaders2, toSyncRow;
var init_sync = __esm({
  "api/astrologo/sync.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    parseLimit = /* @__PURE__ */ __name((rawValue) => {
      const parsed = Number.parseInt(rawValue ?? "300", 10);
      if (!Number.isFinite(parsed)) {
        return 300;
      }
      return Math.min(1e3, Math.max(1, parsed));
    }, "parseLimit");
    toHeaders2 = /* @__PURE__ */ __name(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    toSyncRow = /* @__PURE__ */ __name((mapa) => {
      const id = String(mapa.id ?? "").trim();
      const nome = String(mapa.nome ?? "").trim();
      const dataNascimento = String(mapa.data_nascimento ?? "").trim();
      if (!id || !nome || !dataNascimento) {
        return null;
      }
      return {
        id,
        nome,
        dataNascimento
      };
    }, "toSyncRow");
    __name(onRequestPost7, "onRequestPost");
  }
});

// api/astrologo/userdata.ts
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
var onRequestGet11, onRequestDelete;
var init_userdata = __esm({
  "api/astrologo/userdata.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name(jsonResponse, "jsonResponse");
    onRequestGet11 = /* @__PURE__ */ __name(async ({ env: env2, request }) => {
      const db = env2?.BIGDATA_DB;
      if (!db || typeof db.prepare !== "function") {
        return jsonResponse({ ok: false, error: "BIGDATA_DB indispon\xEDvel." }, 503);
      }
      try {
        const url = new URL(request.url);
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
        const offset = Number(url.searchParams.get("offset") ?? 0);
        await db.prepare(`
      CREATE TABLE IF NOT EXISTS astrologo_user_data (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        dados_json TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `).run();
        const countRow = await db.prepare("SELECT COUNT(*) as total FROM astrologo_user_data").first();
        const total = countRow?.total ?? 0;
        const { results } = await db.prepare(
          `SELECT id, email, dados_json, created_at, updated_at
       FROM astrologo_user_data
       ORDER BY datetime(updated_at) DESC
       LIMIT ? OFFSET ?`
        ).bind(limit, offset).all();
        const data = (results ?? []).map((row) => ({
          id: row.id,
          email: row.email,
          dadosJson: row.dados_json,
          criadoEm: row.created_at,
          atualizadoEm: row.updated_at
        }));
        return jsonResponse({ ok: true, data, total, limit, offset });
      } catch (error3) {
        return jsonResponse({
          ok: false,
          error: error3 instanceof Error ? error3.message : "Erro ao listar dados de usu\xE1rios."
        }, 500);
      }
    }, "onRequestGet");
    onRequestDelete = /* @__PURE__ */ __name(async ({ env: env2, request }) => {
      const db = env2?.BIGDATA_DB;
      if (!db || typeof db.prepare !== "function") {
        return jsonResponse({ ok: false, error: "BIGDATA_DB indispon\xEDvel." }, 503);
      }
      try {
        const url = new URL(request.url);
        const id = url.searchParams.get("id")?.trim();
        if (!id) {
          return jsonResponse({ ok: false, error: "Par\xE2metro id \xE9 obrigat\xF3rio." }, 400);
        }
        const row = await db.prepare(
          "SELECT email, dados_json FROM astrologo_user_data WHERE id = ? LIMIT 1"
        ).bind(id).first();
        if (!row) {
          return jsonResponse({ ok: false, error: "Registro n\xE3o encontrado." }, 404);
        }
        const email = row.email;
        const deletedCounts = { userdata: 0, mapas: 0, tokens: 0 };
        let mapasIds = [];
        try {
          const dados = JSON.parse(row.dados_json);
          mapasIds = (dados.mapasSalvos ?? []).map((r) => r.id).filter((v) => typeof v === "string" && v.length > 0);
        } catch {
          console.warn(`[astrologo/userdata DELETE] dados_json inv\xE1lido para user ${id}`);
        }
        for (const mapId of mapasIds) {
          const result = await db.prepare(
            "DELETE FROM astrologo_mapas WHERE id = ?"
          ).bind(mapId).run();
          if (result?.meta?.changes && result.meta.changes > 0) deletedCounts.mapas++;
        }
        const tokenResult = await db.prepare(
          "DELETE FROM astrologo_auth_tokens WHERE email = ?"
        ).bind(email).run();
        deletedCounts.tokens = tokenResult?.meta?.changes ?? 0;
        try {
          await db.prepare(`ALTER TABLE astrologo_mapas ADD COLUMN email TEXT DEFAULT ''`).run();
        } catch {
        }
        await db.prepare("DELETE FROM astrologo_mapas WHERE email = ?").bind(email).run();
        await db.prepare("DELETE FROM astrologo_user_data WHERE id = ?").bind(id).run();
        deletedCounts.userdata = 1;
        console.log(`[astrologo/userdata DELETE] Cascata completa para ${email}:`, JSON.stringify(deletedCounts));
        return jsonResponse({
          ok: true,
          email,
          deleted: deletedCounts
        });
      } catch (error3) {
        console.error("[astrologo/userdata DELETE] Erro:", error3);
        return jsonResponse({
          ok: false,
          error: error3 instanceof Error ? error3.message : "Erro ao excluir registro."
        }, 500);
      }
    }, "onRequestDelete");
  }
});

// api/_lib/cloudflare-api.ts
var resolveToken, parseJsonOrThrow, toFirstError, cloudflareRequest, cloudflareRequestPayload, listCloudflareZones, extractDnsResult, quoteTxtContent, normalizeZoneId, normalizeRecordId, normalizeRecordType, normalizeRecordName, normalizeRecordInput, buildDnsRecordPayload, upsertCloudflareTxtRecord, getCloudflareDnsSnapshot, listCloudflareDnsRecords, createCloudflareDnsRecord, updateCloudflareDnsRecord, deleteCloudflareDnsRecord;
var init_cloudflare_api = __esm({
  "api/_lib/cloudflare-api.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    resolveToken = /* @__PURE__ */ __name((env2) => {
      const byDnsToken = env2.CLOUDFLARE_DNS?.trim();
      if (byDnsToken) {
        return byDnsToken;
      }
      const byApiToken = env2.CLOUDFLARE_API_TOKEN?.trim();
      if (byApiToken) {
        return byApiToken;
      }
      const byCfToken = env2.CF_API_TOKEN?.trim();
      if (byCfToken) {
        return byCfToken;
      }
      return "";
    }, "resolveToken");
    parseJsonOrThrow = /* @__PURE__ */ __name((rawText, fallback, response) => {
      const trimmed = rawText.trim();
      if (!trimmed) {
        throw new Error(`${fallback}: corpo vazio inesperado (HTTP ${response.status}).`);
      }
      const looksLikeHtml = trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html");
      if (looksLikeHtml) {
        throw new Error(`${fallback}: resposta HTML inesperada da API Cloudflare (HTTP ${response.status}).`);
      }
      try {
        return JSON.parse(trimmed);
      } catch {
        throw new Error(`${fallback}: resposta n\xE3o-JSON da API Cloudflare (HTTP ${response.status}).`);
      }
    }, "parseJsonOrThrow");
    toFirstError = /* @__PURE__ */ __name((payload) => {
      const firstError = Array.isArray(payload.errors) && payload.errors.length > 0 ? payload.errors[0] : null;
      return firstError?.message?.trim() || null;
    }, "toFirstError");
    cloudflareRequest = /* @__PURE__ */ __name(async (env2, path, fallback, init) => {
      const payload = await cloudflareRequestPayload(env2, path, fallback, init);
      return payload.result;
    }, "cloudflareRequest");
    cloudflareRequestPayload = /* @__PURE__ */ __name(async (env2, path, fallback, init) => {
      const token = resolveToken(env2);
      if (!token) {
        throw new Error("Token Cloudflare ausente no runtime (configure CF_API_TOKEN, CLOUDFLARE_DNS ou CLOUDFLARE_API_TOKEN).");
      }
      const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
        method: init?.method ?? "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...init?.headers ?? {}
        },
        body: init?.body
      });
      const rawText = await response.text();
      const payload = parseJsonOrThrow(rawText, fallback, response);
      if (!response.ok || payload.success !== true) {
        const message = toFirstError(payload);
        throw new Error(message ? `${fallback}: ${message}` : `${fallback}: HTTP ${response.status}`);
      }
      return payload;
    }, "cloudflareRequestPayload");
    listCloudflareZones = /* @__PURE__ */ __name(async (env2) => {
      const zones = await cloudflareRequest(
        env2,
        "/zones?status=active&per_page=500",
        "Falha ao carregar zonas da Cloudflare"
      );
      return (Array.isArray(zones) ? zones : []).map((zone) => ({
        id: String(zone.id ?? "").trim(),
        name: String(zone.name ?? "").trim().toLowerCase()
      })).filter((zone) => zone.id && zone.name).sort((a, b) => a.name.localeCompare(b.name));
    }, "listCloudflareZones");
    extractDnsResult = /* @__PURE__ */ __name(async (env2, path, fallback) => {
      const result = await cloudflareRequest(env2, path, fallback);
      return Array.isArray(result) ? result : [];
    }, "extractDnsResult");
    quoteTxtContent = /* @__PURE__ */ __name((content) => {
      const normalized = content.trim().replace(/^"|"$/g, "");
      return `"${normalized}"`;
    }, "quoteTxtContent");
    normalizeZoneId = /* @__PURE__ */ __name((zoneId) => {
      const normalized = zoneId.trim();
      if (!normalized) {
        throw new Error("Zone ID \xE9 obrigat\xF3rio.");
      }
      return normalized;
    }, "normalizeZoneId");
    normalizeRecordId = /* @__PURE__ */ __name((recordId) => {
      const normalized = recordId.trim();
      if (!normalized) {
        throw new Error("Record ID \xE9 obrigat\xF3rio.");
      }
      return normalized;
    }, "normalizeRecordId");
    normalizeRecordType = /* @__PURE__ */ __name((recordType) => {
      const normalized = recordType.trim().toUpperCase();
      if (!normalized) {
        throw new Error("Tipo de registro DNS \xE9 obrigat\xF3rio.");
      }
      return normalized;
    }, "normalizeRecordType");
    normalizeRecordName = /* @__PURE__ */ __name((recordName) => {
      const normalized = recordName.trim().toLowerCase();
      if (!normalized) {
        throw new Error("Nome do registro DNS \xE9 obrigat\xF3rio.");
      }
      return normalized;
    }, "normalizeRecordName");
    normalizeRecordInput = /* @__PURE__ */ __name((input) => {
      const type = normalizeRecordType(input.type);
      const name = normalizeRecordName(input.name);
      const content = String(input.content ?? "").trim();
      const ttl = Number(input.ttl ?? 1);
      const proxied = input.proxied == null ? null : Boolean(input.proxied);
      const priority = input.priority == null || Number.isNaN(Number(input.priority)) ? null : Number(input.priority);
      const comment = String(input.comment ?? "").trim();
      const tags = Array.isArray(input.tags) ? input.tags.map((tag) => String(tag).trim()).filter(Boolean) : [];
      const data = input.data && typeof input.data === "object" ? input.data : null;
      if (!content && !data) {
        throw new Error("Informe content ou data para o registro DNS.");
      }
      if (!Number.isFinite(ttl) || ttl !== 1 && (ttl < 60 || ttl > 86400)) {
        throw new Error("TTL inv\xE1lido. Use 1 (auto) ou um valor entre 60 e 86400 segundos.");
      }
      if (priority != null && (!Number.isInteger(priority) || priority < 0 || priority > 65535)) {
        throw new Error("Priority inv\xE1lido. Use um inteiro entre 0 e 65535.");
      }
      return {
        type,
        name,
        content,
        ttl,
        proxied,
        priority,
        comment,
        tags,
        data
      };
    }, "normalizeRecordInput");
    buildDnsRecordPayload = /* @__PURE__ */ __name((input) => {
      const normalized = normalizeRecordInput(input);
      const payload = {
        type: normalized.type,
        name: normalized.name,
        ttl: normalized.ttl
      };
      if (normalized.content) {
        payload.content = normalized.content;
      }
      if (normalized.proxied != null) {
        payload.proxied = normalized.proxied;
      }
      if (normalized.priority != null) {
        payload.priority = normalized.priority;
      }
      if (normalized.comment) {
        payload.comment = normalized.comment;
      }
      if (normalized.tags.length > 0) {
        payload.tags = normalized.tags;
      }
      if (normalized.data) {
        payload.data = normalized.data;
      }
      return payload;
    }, "buildDnsRecordPayload");
    upsertCloudflareTxtRecord = /* @__PURE__ */ __name(async (env2, zoneId, name, content) => {
      const normalizedZoneId = zoneId.trim();
      const normalizedName = name.trim().toLowerCase();
      const normalizedContent = content.trim();
      if (!normalizedZoneId || !normalizedName || !normalizedContent) {
        throw new Error("ZoneId, name e content s\xE3o obrigat\xF3rios para upsert TXT na Cloudflare.");
      }
      const existing = await extractDnsResult(
        env2,
        `/zones/${encodeURIComponent(normalizedZoneId)}/dns_records?type=TXT&name=${encodeURIComponent(normalizedName)}`,
        `Falha ao consultar TXT ${normalizedName}`
      );
      const existingRecordId = String(existing[0]?.id ?? "").trim();
      if (existingRecordId) {
        await cloudflareRequest(
          env2,
          `/zones/${encodeURIComponent(normalizedZoneId)}/dns_records/${encodeURIComponent(existingRecordId)}`,
          `Falha ao atualizar TXT ${normalizedName}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              content: quoteTxtContent(normalizedContent)
            })
          }
        );
        return {
          mode: "update",
          recordId: existingRecordId
        };
      }
      const created = await cloudflareRequest(
        env2,
        `/zones/${encodeURIComponent(normalizedZoneId)}/dns_records`,
        `Falha ao criar TXT ${normalizedName}`,
        {
          method: "POST",
          body: JSON.stringify({
            type: "TXT",
            name: normalizedName,
            content: quoteTxtContent(normalizedContent),
            ttl: 1
          })
        }
      );
      return {
        mode: "create",
        recordId: String(created?.id ?? "").trim()
      };
    }, "upsertCloudflareTxtRecord");
    getCloudflareDnsSnapshot = /* @__PURE__ */ __name(async (env2, domain2, zoneId) => {
      const normalizedDomain = domain2.trim().toLowerCase();
      const normalizedZoneId = zoneId.trim();
      if (!normalizedDomain || !normalizedZoneId) {
        throw new Error("Domain e zoneId s\xE3o obrigat\xF3rios para auditar DNS na Cloudflare.");
      }
      const [mxRecordsRaw, tlsRptRaw, mtastsRaw] = await Promise.all([
        extractDnsResult(
          env2,
          `/zones/${encodeURIComponent(normalizedZoneId)}/dns_records?type=MX`,
          `Falha ao consultar MX de ${normalizedDomain}`
        ),
        extractDnsResult(
          env2,
          `/zones/${encodeURIComponent(normalizedZoneId)}/dns_records?type=TXT&name=${encodeURIComponent(`_smtp._tls.${normalizedDomain}`)}`,
          `Falha ao consultar TLS-RPT de ${normalizedDomain}`
        ),
        extractDnsResult(
          env2,
          `/zones/${encodeURIComponent(normalizedZoneId)}/dns_records?type=TXT&name=${encodeURIComponent(`_mta-sts.${normalizedDomain}`)}`,
          `Falha ao consultar MTA-STS TXT de ${normalizedDomain}`
        )
      ]);
      const mxRecords = mxRecordsRaw.map((record) => String(record.content ?? "").trim().toLowerCase()).filter(Boolean).sort((a, b) => a.localeCompare(b));
      const tlsRptContent = String(tlsRptRaw[0]?.content ?? "").replace(/["\s]/g, "");
      const tlsRptMatch = tlsRptContent.match(/mailto:([^;]+)/i);
      const dnsTlsRptEmail = tlsRptMatch?.[1]?.trim().toLowerCase() || null;
      const mtastsContent = String(mtastsRaw[0]?.content ?? "").replace(/["\s]/g, "");
      const mtastsMatch = mtastsContent.match(/id=([a-zA-Z0-9_-]+)/);
      const dnsMtaStsId = mtastsMatch?.[1]?.trim() || null;
      return {
        mxRecords,
        dnsTlsRptEmail,
        dnsMtaStsId
      };
    }, "getCloudflareDnsSnapshot");
    listCloudflareDnsRecords = /* @__PURE__ */ __name(async (env2, zoneId, options) => {
      const normalizedZoneId = normalizeZoneId(zoneId);
      const page = Number.isFinite(Number(options?.page)) && Number(options?.page) > 0 ? Math.trunc(Number(options?.page)) : 1;
      const perPage = Number.isFinite(Number(options?.perPage)) && Number(options?.perPage) > 0 ? Math.min(Math.trunc(Number(options?.perPage)), 500) : 100;
      const type = String(options?.type ?? "").trim().toUpperCase();
      const search = String(options?.search ?? "").trim().toLowerCase();
      const query = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
        order: "type",
        direction: "asc"
      });
      if (type) {
        query.set("type", type);
      }
      if (search) {
        query.set("name", search);
      }
      const payload = await cloudflareRequestPayload(
        env2,
        `/zones/${encodeURIComponent(normalizedZoneId)}/dns_records?${query.toString()}`,
        "Falha ao listar registros DNS da zona"
      );
      const records = Array.isArray(payload.result) ? payload.result : [];
      const info3 = payload.result_info ?? {};
      return {
        records,
        pagination: {
          page: Number(info3.page ?? page),
          perPage: Number(info3.per_page ?? perPage),
          totalPages: Number(info3.total_pages ?? 1),
          totalCount: Number(info3.total_count ?? records.length),
          count: Number(info3.count ?? records.length)
        }
      };
    }, "listCloudflareDnsRecords");
    createCloudflareDnsRecord = /* @__PURE__ */ __name(async (env2, zoneId, input) => {
      const normalizedZoneId = normalizeZoneId(zoneId);
      const payload = buildDnsRecordPayload(input);
      const created = await cloudflareRequest(
        env2,
        `/zones/${encodeURIComponent(normalizedZoneId)}/dns_records`,
        `Falha ao criar registro DNS ${String(payload.type ?? "").toUpperCase()} ${String(payload.name ?? "")}`,
        {
          method: "POST",
          body: JSON.stringify(payload)
        }
      );
      return created;
    }, "createCloudflareDnsRecord");
    updateCloudflareDnsRecord = /* @__PURE__ */ __name(async (env2, zoneId, recordId, input) => {
      const normalizedZoneId = normalizeZoneId(zoneId);
      const normalizedRecordId = normalizeRecordId(recordId);
      const payload = buildDnsRecordPayload(input);
      const updated = await cloudflareRequest(
        env2,
        `/zones/${encodeURIComponent(normalizedZoneId)}/dns_records/${encodeURIComponent(normalizedRecordId)}`,
        `Falha ao atualizar registro DNS ${String(payload.type ?? "").toUpperCase()} ${String(payload.name ?? "")}`,
        {
          method: "PUT",
          body: JSON.stringify(payload)
        }
      );
      return updated;
    }, "updateCloudflareDnsRecord");
    deleteCloudflareDnsRecord = /* @__PURE__ */ __name(async (env2, zoneId, recordId) => {
      const normalizedZoneId = normalizeZoneId(zoneId);
      const normalizedRecordId = normalizeRecordId(recordId);
      await cloudflareRequest(
        env2,
        `/zones/${encodeURIComponent(normalizedZoneId)}/dns_records/${encodeURIComponent(normalizedRecordId)}`,
        "Falha ao remover registro DNS",
        {
          method: "DELETE"
        }
      );
    }, "deleteCloudflareDnsRecord");
  }
});

// api/cfdns/delete.ts
async function onRequestDelete2(context2) {
  const trace3 = createResponseTrace(context2.request);
  const url = new URL(context2.request.url);
  const zoneId = String(url.searchParams.get("zoneId") ?? "").trim();
  const recordId = String(url.searchParams.get("recordId") ?? "").trim();
  const adminActor = resolveAdminActorFromRequest(context2.request);
  if (!zoneId || !recordId) {
    return toError("Par\xE2metros zoneId e recordId s\xE3o obrigat\xF3rios.", trace3, 400);
  }
  try {
    await deleteCloudflareDnsRecord(context2.env, zoneId, recordId);
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "cfdns",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: "record-delete",
            provider: "cloudflare-api",
            adminActor,
            zoneId,
            recordId
          }
        });
      } catch {
      }
    }
    return new Response(JSON.stringify({
      ok: true,
      ...trace3,
      zoneId,
      recordId,
      deleted: true
    }), {
      headers: toHeaders3()
    });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha ao remover registro DNS.";
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "cfdns",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: "record-delete",
            provider: "cloudflare-api",
            zoneId,
            recordId
          }
        });
      } catch {
      }
    }
    return toError(message, trace3, 502);
  }
}
var toHeaders3, toError;
var init_delete = __esm({
  "api/cfdns/delete.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_admin_actor();
    init_request_trace();
    init_cloudflare_api();
    toHeaders3 = /* @__PURE__ */ __name(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    toError = /* @__PURE__ */ __name((message, trace3, status = 500) => new Response(JSON.stringify({
      ok: false,
      ...trace3,
      error: message
    }), {
      status,
      headers: toHeaders3()
    }), "toError");
    __name(onRequestDelete2, "onRequestDelete");
  }
});

// api/cfdns/records.ts
async function onRequestGet12(context2) {
  const trace3 = createResponseTrace(context2.request);
  const url = new URL(context2.request.url);
  const zoneId = String(url.searchParams.get("zoneId") ?? "").trim();
  const page = toPositiveInt2(url.searchParams.get("page"), 1);
  const perPage = toPositiveInt2(url.searchParams.get("perPage"), 100);
  const type = String(url.searchParams.get("type") ?? "").trim().toUpperCase();
  const search = String(url.searchParams.get("search") ?? "").trim().toLowerCase();
  if (!zoneId) {
    return toError2("Par\xE2metro zoneId \xE9 obrigat\xF3rio.", trace3, 400);
  }
  try {
    const payload = await listCloudflareDnsRecords(context2.env, zoneId, {
      page,
      perPage,
      type,
      search
    });
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "cfdns",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: "records-list",
            provider: "cloudflare-api",
            zoneId,
            page: payload.pagination.page,
            perPage: payload.pagination.perPage,
            count: payload.pagination.count
          }
        });
      } catch {
      }
    }
    return new Response(JSON.stringify({
      ok: true,
      ...trace3,
      zoneId,
      ...payload
    }), {
      headers: toHeaders4()
    });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha ao carregar registros DNS da zona.";
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "cfdns",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: "records-list",
            provider: "cloudflare-api",
            zoneId
          }
        });
      } catch {
      }
    }
    return toError2(message, trace3, 502);
  }
}
var toHeaders4, toError2, toPositiveInt2;
var init_records = __esm({
  "api/cfdns/records.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_request_trace();
    init_cloudflare_api();
    toHeaders4 = /* @__PURE__ */ __name(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    toError2 = /* @__PURE__ */ __name((message, trace3, status = 500) => new Response(JSON.stringify({
      ok: false,
      ...trace3,
      error: message
    }), {
      status,
      headers: toHeaders4()
    }), "toError");
    toPositiveInt2 = /* @__PURE__ */ __name((value, fallback) => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
      }
      return Math.trunc(parsed);
    }, "toPositiveInt");
    __name(onRequestGet12, "onRequestGet");
  }
});

// api/cfdns/upsert.ts
async function onRequestPost8(context2) {
  const trace3 = createResponseTrace(context2.request);
  try {
    const body = await context2.request.json();
    const zoneId = String(body.zoneId ?? "").trim();
    const recordId = String(body.recordId ?? "").trim();
    const record = normalizeRecord(body.record);
    const adminActor = resolveAdminActorFromRequest(context2.request, body);
    if (!zoneId) {
      return toError3("zoneId \xE9 obrigat\xF3rio.", trace3, 400);
    }
    if (!record.type || !record.name) {
      return toError3("Tipo e nome do registro s\xE3o obrigat\xF3rios.", trace3, 400);
    }
    const saved = recordId ? await updateCloudflareDnsRecord(context2.env, zoneId, recordId, record) : await createCloudflareDnsRecord(context2.env, zoneId, record);
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "cfdns",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: recordId ? "record-update" : "record-create",
            provider: "cloudflare-api",
            adminActor,
            zoneId,
            recordId: String(saved.id ?? recordId),
            type: record.type,
            name: record.name
          }
        });
      } catch {
      }
    }
    return new Response(JSON.stringify({
      ok: true,
      ...trace3,
      mode: recordId ? "update" : "create",
      zoneId,
      record: saved
    }), {
      headers: toHeaders5()
    });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha ao salvar registro DNS.";
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "cfdns",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: "record-upsert",
            provider: "cloudflare-api"
          }
        });
      } catch {
      }
    }
    return toError3(message, trace3, 502);
  }
}
var toHeaders5, toError3, normalizeRecord;
var init_upsert = __esm({
  "api/cfdns/upsert.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_admin_actor();
    init_request_trace();
    init_cloudflare_api();
    toHeaders5 = /* @__PURE__ */ __name(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    toError3 = /* @__PURE__ */ __name((message, trace3, status = 500) => new Response(JSON.stringify({
      ok: false,
      ...trace3,
      error: message
    }), {
      status,
      headers: toHeaders5()
    }), "toError");
    normalizeRecord = /* @__PURE__ */ __name((record) => ({
      type: String(record?.type ?? "").trim().toUpperCase(),
      name: String(record?.name ?? "").trim().toLowerCase(),
      content: String(record?.content ?? "").trim(),
      ttl: record?.ttl == null ? null : Number(record.ttl),
      proxied: typeof record?.proxied === "boolean" ? record.proxied : null,
      priority: record?.priority == null || String(record.priority).trim() === "" ? null : Number(record.priority),
      comment: String(record?.comment ?? "").trim(),
      tags: Array.isArray(record?.tags) ? record?.tags.map((tag) => String(tag).trim()).filter(Boolean) : null,
      data: record?.data && typeof record.data === "object" ? record.data : null
    }), "normalizeRecord");
    __name(onRequestPost8, "onRequestPost");
  }
});

// api/cfdns/zones.ts
async function onRequestGet13(context2) {
  const trace3 = createResponseTrace(context2.request);
  try {
    const zones = await listCloudflareZones(context2.env);
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "cfdns",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: "zones-list",
            provider: "cloudflare-api",
            totalZones: zones.length
          }
        });
      } catch {
      }
    }
    return new Response(JSON.stringify({
      ok: true,
      ...trace3,
      fonte: "cloudflare-api",
      zones
    }), {
      headers: toHeaders6()
    });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha ao carregar zonas DNS da Cloudflare.";
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "cfdns",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: "zones-list",
            provider: "cloudflare-api"
          }
        });
      } catch {
      }
    }
    return toError4(message, trace3, 502);
  }
}
var toHeaders6, toError4;
var init_zones = __esm({
  "api/cfdns/zones.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_request_trace();
    init_cloudflare_api();
    toHeaders6 = /* @__PURE__ */ __name(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    toError4 = /* @__PURE__ */ __name((message, trace3, status = 500) => new Response(JSON.stringify({
      ok: false,
      ...trace3,
      error: message
    }), {
      status,
      headers: toHeaders6()
    }), "toError");
    __name(onRequestGet13, "onRequestGet");
  }
});

// api/_lib/cfpw-api.ts
var resolveToken2, parseJsonOrThrow2, toFirstError2, cloudflareRequest2, validateCloudflareApiPath, parseJsonSafe, normalizeAccount, listCloudflareAccounts, resolveCloudflarePwAccount, listCloudflareWorkers, getCloudflareWorker, listCloudflareWorkerDeployments, deleteCloudflareWorker, listCloudflarePagesProjects, getCloudflarePagesProject, listCloudflarePagesDeployments, deleteCloudflarePagesProject, deleteCloudflarePagesDeployment, getCloudflareWorkerSchedules, updateCloudflareWorkerSchedules, getCloudflareWorkerUsageModel, updateCloudflareWorkerUsageModel, listCloudflareWorkerSecrets, addCloudflareWorkerSecret, deleteCloudflareWorkerSecret, listCloudflarePagesDomains, addCloudflarePagesDomain, deleteCloudflarePagesDomain, retryCloudflarePagesDeployment, rollbackCloudflarePagesDeployment, getCloudflarePagesDeploymentLogs, createCloudflareWorkerFromTemplate, createCloudflarePagesProject, updateCloudflarePagesProjectSettings, listCloudflareWorkerVersions, deployCloudflareWorkerVersion, listCloudflareWorkerRoutes, addCloudflareWorkerRoute, deleteCloudflareWorkerRoute, runCloudflareRawRequest;
var init_cfpw_api = __esm({
  "api/_lib/cfpw-api.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    resolveToken2 = /* @__PURE__ */ __name((env2) => {
      const byPwToken = env2.CLOUDFLARE_PW?.trim();
      if (byPwToken) {
        return byPwToken;
      }
      const byApiToken = env2.CLOUDFLARE_API_TOKEN?.trim();
      if (byApiToken) {
        return byApiToken;
      }
      const byCfToken = env2.CF_API_TOKEN?.trim();
      if (byCfToken) {
        return byCfToken;
      }
      return "";
    }, "resolveToken");
    parseJsonOrThrow2 = /* @__PURE__ */ __name((rawText, fallback, response) => {
      const trimmed = rawText.trim();
      if (!trimmed) {
        throw new Error(`${fallback}: corpo vazio inesperado (HTTP ${response.status}).`);
      }
      const looksLikeHtml = trimmed.startsWith("<!DOCTYPE") || trimmed.startsWith("<html");
      if (looksLikeHtml) {
        throw new Error(`${fallback}: resposta HTML inesperada da API Cloudflare (HTTP ${response.status}).`);
      }
      try {
        return JSON.parse(trimmed);
      } catch {
        throw new Error(`${fallback}: resposta n\xE3o-JSON da API Cloudflare (HTTP ${response.status}).`);
      }
    }, "parseJsonOrThrow");
    toFirstError2 = /* @__PURE__ */ __name((payload) => {
      const firstError = Array.isArray(payload.errors) && payload.errors.length > 0 ? payload.errors[0] : null;
      return firstError?.message?.trim() || null;
    }, "toFirstError");
    cloudflareRequest2 = /* @__PURE__ */ __name(async (env2, path, fallback, init) => {
      const token = resolveToken2(env2);
      if (!token) {
        throw new Error("Token Cloudflare ausente no runtime (configure CLOUDFLARE_PW, CLOUDFLARE_API_TOKEN ou CF_API_TOKEN).");
      }
      const hasContentTypeHeader = Boolean(
        init?.headers && new Headers(init.headers).has("Content-Type")
      );
      const isFormDataBody = typeof FormData !== "undefined" && init?.body instanceof FormData;
      const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
        method: init?.method ?? "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
          ...hasContentTypeHeader || isFormDataBody ? {} : { "Content-Type": "application/json" },
          ...init?.headers ?? {}
        },
        body: init?.body
      });
      const rawText = await response.text();
      const payload = parseJsonOrThrow2(rawText, fallback, response);
      if (!response.ok || payload.success !== true) {
        const message = toFirstError2(payload);
        throw new Error(message ? `${fallback}: ${message}` : `${fallback}: HTTP ${response.status}`);
      }
      return payload.result;
    }, "cloudflareRequest");
    validateCloudflareApiPath = /* @__PURE__ */ __name((path) => {
      const normalized = path.trim();
      if (!normalized.startsWith("/")) {
        throw new Error('O path precisa iniciar com "/" para acessar a API Cloudflare.');
      }
      if (normalized.includes("..")) {
        throw new Error('Path inv\xE1lido para opera\xE7\xE3o avan\xE7ada: uso de ".." n\xE3o \xE9 permitido.');
      }
      if (!normalized.startsWith("/accounts/") && !normalized.startsWith("/zones/")) {
        throw new Error("Path inv\xE1lido: use endpoints iniciando com /accounts/... ou /zones/...");
      }
      return normalized;
    }, "validateCloudflareApiPath");
    parseJsonSafe = /* @__PURE__ */ __name((value, fieldName) => {
      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }
      try {
        return JSON.parse(trimmed);
      } catch {
        throw new Error(`JSON inv\xE1lido no campo ${fieldName}.`);
      }
    }, "parseJsonSafe");
    normalizeAccount = /* @__PURE__ */ __name((account) => ({
      id: String(account.id ?? "").trim(),
      name: String(account.name ?? "").trim()
    }), "normalizeAccount");
    listCloudflareAccounts = /* @__PURE__ */ __name(async (env2) => {
      const accounts = await cloudflareRequest2(
        env2,
        "/accounts?page=1&per_page=50",
        "Falha ao carregar contas da Cloudflare"
      );
      return (Array.isArray(accounts) ? accounts : []).map(normalizeAccount).filter((account) => account.id);
    }, "listCloudflareAccounts");
    resolveCloudflarePwAccount = /* @__PURE__ */ __name(async (env2) => {
      const byEnv = String(env2.CF_ACCOUNT_ID ?? "").trim();
      if (byEnv) {
        return {
          accountId: byEnv,
          accountName: null,
          source: "CF_ACCOUNT_ID",
          accounts: []
        };
      }
      const accounts = await listCloudflareAccounts(env2);
      if (accounts.length === 0) {
        throw new Error("Nenhuma conta Cloudflare dispon\xEDvel para o token informado.");
      }
      return {
        accountId: accounts[0].id,
        accountName: accounts[0].name || null,
        source: "auto-discovery",
        accounts
      };
    }, "resolveCloudflarePwAccount");
    listCloudflareWorkers = /* @__PURE__ */ __name(async (env2, accountId) => {
      const normalizedAccountId = accountId.trim();
      if (!normalizedAccountId) {
        throw new Error("Account ID \xE9 obrigat\xF3rio para listar Workers.");
      }
      const workers = await cloudflareRequest2(
        env2,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts`,
        "Falha ao listar Workers"
      );
      return Array.isArray(workers) ? workers : [];
    }, "listCloudflareWorkers");
    getCloudflareWorker = /* @__PURE__ */ __name(async (env2, accountId, scriptName) => {
      const normalizedAccountId = accountId.trim();
      const normalizedScript = scriptName.trim();
      if (!normalizedAccountId || !normalizedScript) {
        throw new Error("Account ID e scriptName s\xE3o obrigat\xF3rios para ler Worker.");
      }
      const worker = await cloudflareRequest2(
        env2,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/settings`,
        `Falha ao ler Worker ${normalizedScript}`
      );
      return worker;
    }, "getCloudflareWorker");
    listCloudflareWorkerDeployments = /* @__PURE__ */ __name(async (env2, accountId, scriptName) => {
      const normalizedAccountId = accountId.trim();
      const normalizedScript = scriptName.trim();
      if (!normalizedAccountId || !normalizedScript) {
        throw new Error("Account ID e scriptName s\xE3o obrigat\xF3rios para listar deployments de Worker.");
      }
      const deployments = await cloudflareRequest2(
        env2,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/deployments`,
        `Falha ao listar deployments do Worker ${normalizedScript}`
      );
      return Array.isArray(deployments) ? deployments : [];
    }, "listCloudflareWorkerDeployments");
    deleteCloudflareWorker = /* @__PURE__ */ __name(async (env2, accountId, scriptName) => {
      const normalizedAccountId = accountId.trim();
      const normalizedScript = scriptName.trim();
      if (!normalizedAccountId || !normalizedScript) {
        throw new Error("Account ID e scriptName s\xE3o obrigat\xF3rios para remover Worker.");
      }
      await cloudflareRequest2(
        env2,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}`,
        `Falha ao remover Worker ${normalizedScript}`,
        {
          method: "DELETE"
        }
      );
    }, "deleteCloudflareWorker");
    listCloudflarePagesProjects = /* @__PURE__ */ __name(async (env2, accountId) => {
      const normalizedAccountId = accountId.trim();
      if (!normalizedAccountId) {
        throw new Error("Account ID \xE9 obrigat\xF3rio para listar Pages.");
      }
      const projects = await cloudflareRequest2(
        env2,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects`,
        "Falha ao listar projetos Pages"
      );
      return Array.isArray(projects) ? projects : [];
    }, "listCloudflarePagesProjects");
    getCloudflarePagesProject = /* @__PURE__ */ __name(async (env2, accountId, projectName) => {
      const normalizedAccountId = accountId.trim();
      const normalizedProject = projectName.trim();
      if (!normalizedAccountId || !normalizedProject) {
        throw new Error("Account ID e projectName s\xE3o obrigat\xF3rios para ler projeto Pages.");
      }
      const project = await cloudflareRequest2(
        env2,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}`,
        `Falha ao ler projeto Pages ${normalizedProject}`
      );
      return project;
    }, "getCloudflarePagesProject");
    listCloudflarePagesDeployments = /* @__PURE__ */ __name(async (env2, accountId, projectName) => {
      const normalizedAccountId = accountId.trim();
      const normalizedProject = projectName.trim();
      if (!normalizedAccountId || !normalizedProject) {
        throw new Error("Account ID e projectName s\xE3o obrigat\xF3rios para listar deployments de Pages.");
      }
      const deployments = await cloudflareRequest2(
        env2,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}/deployments`,
        `Falha ao listar deployments de Pages ${normalizedProject}`
      );
      return Array.isArray(deployments) ? deployments : [];
    }, "listCloudflarePagesDeployments");
    deleteCloudflarePagesProject = /* @__PURE__ */ __name(async (env2, accountId, projectName) => {
      const normalizedAccountId = accountId.trim();
      const normalizedProject = projectName.trim();
      if (!normalizedAccountId || !normalizedProject) {
        throw new Error("Account ID e projectName s\xE3o obrigat\xF3rios para remover projeto Pages.");
      }
      await cloudflareRequest2(
        env2,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}`,
        `Falha ao remover projeto Pages ${normalizedProject}`,
        {
          method: "DELETE"
        }
      );
    }, "deleteCloudflarePagesProject");
    deleteCloudflarePagesDeployment = /* @__PURE__ */ __name(async (env2, accountId, projectName, deploymentId, force = false) => {
      const normalizedAccountId = accountId.trim();
      const normalizedProject = projectName.trim();
      const normalizedDeploymentId = deploymentId.trim();
      if (!normalizedAccountId || !normalizedProject || !normalizedDeploymentId) {
        throw new Error("Account ID, projectName e deploymentId s\xE3o obrigat\xF3rios para remover deployment de Pages.");
      }
      const queryString = force ? "?force=true" : "";
      await cloudflareRequest2(
        env2,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}/deployments/${encodeURIComponent(normalizedDeploymentId)}${queryString}`,
        `Falha ao remover deployment ${normalizedDeploymentId} do projeto ${normalizedProject}`,
        {
          method: "DELETE"
        }
      );
    }, "deleteCloudflarePagesDeployment");
    getCloudflareWorkerSchedules = /* @__PURE__ */ __name(async (env2, accountId, scriptName) => {
      const normalizedAccountId = accountId.trim();
      const normalizedScript = scriptName.trim();
      if (!normalizedAccountId || !normalizedScript) {
        throw new Error("Account ID e scriptName s\xE3o obrigat\xF3rios para ler cron triggers do Worker.");
      }
      const schedules = await cloudflareRequest2(
        env2,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/schedules`,
        `Falha ao ler cron triggers do Worker ${normalizedScript}`
      );
      return Array.isArray(schedules) ? schedules : [];
    }, "getCloudflareWorkerSchedules");
    updateCloudflareWorkerSchedules = /* @__PURE__ */ __name(async (env2, accountId, scriptName, schedules) => {
      const normalizedAccountId = accountId.trim();
      const normalizedScript = scriptName.trim();
      if (!normalizedAccountId || !normalizedScript) {
        throw new Error("Account ID e scriptName s\xE3o obrigat\xF3rios para atualizar cron triggers do Worker.");
      }
      return cloudflareRequest2(
        env2,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/schedules`,
        `Falha ao atualizar cron triggers do Worker ${normalizedScript}`,
        {
          method: "PUT",
          body: JSON.stringify(schedules)
        }
      );
    }, "updateCloudflareWorkerSchedules");
    getCloudflareWorkerUsageModel = /* @__PURE__ */ __name(async (env2, accountId, scriptName) => {
      const normalizedAccountId = accountId.trim();
      const normalizedScript = scriptName.trim();
      if (!normalizedAccountId || !normalizedScript) {
        throw new Error("Account ID e scriptName s\xE3o obrigat\xF3rios para ler usage model do Worker.");
      }
      return cloudflareRequest2(
        env2,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/usage-model`,
        `Falha ao ler usage model do Worker ${normalizedScript}`
      );
    }, "getCloudflareWorkerUsageModel");
    updateCloudflareWorkerUsageModel = /* @__PURE__ */ __name(async (env2, accountId, scriptName, usageModel) => {
      const normalizedAccountId = accountId.trim();
      const normalizedScript = scriptName.trim();
      if (!normalizedAccountId || !normalizedScript) {
        throw new Error("Account ID e scriptName s\xE3o obrigat\xF3rios para atualizar usage model do Worker.");
      }
      return cloudflareRequest2(
        env2,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/usage-model`,
        `Falha ao atualizar usage model do Worker ${normalizedScript}`,
        {
          method: "PUT",
          body: JSON.stringify({ usage_model: usageModel.trim() })
        }
      );
    }, "updateCloudflareWorkerUsageModel");
    listCloudflareWorkerSecrets = /* @__PURE__ */ __name(async (env2, accountId, scriptName) => {
      const normalizedAccountId = accountId.trim();
      const normalizedScript = scriptName.trim();
      if (!normalizedAccountId || !normalizedScript) {
        throw new Error("Account ID e scriptName s\xE3o obrigat\xF3rios para listar secrets do Worker.");
      }
      const secrets = await cloudflareRequest2(
        env2,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/secrets`,
        `Falha ao listar secrets do Worker ${normalizedScript}`
      );
      return Array.isArray(secrets) ? secrets : [];
    }, "listCloudflareWorkerSecrets");
    addCloudflareWorkerSecret = /* @__PURE__ */ __name(async (env2, accountId, scriptName, name, text) => {
      const normalizedAccountId = accountId.trim();
      const normalizedScript = scriptName.trim();
      if (!normalizedAccountId || !normalizedScript) {
        throw new Error("Account ID e scriptName s\xE3o obrigat\xF3rios para adicionar secret do Worker.");
      }
      return cloudflareRequest2(
        env2,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/secrets`,
        `Falha ao adicionar secret no Worker ${normalizedScript}`,
        {
          method: "PUT",
          body: JSON.stringify({
            name: name.trim(),
            text,
            type: "secret_text"
          })
        }
      );
    }, "addCloudflareWorkerSecret");
    deleteCloudflareWorkerSecret = /* @__PURE__ */ __name(async (env2, accountId, scriptName, secretName) => {
      const normalizedAccountId = accountId.trim();
      const normalizedScript = scriptName.trim();
      const normalizedSecret = secretName.trim();
      if (!normalizedAccountId || !normalizedScript || !normalizedSecret) {
        throw new Error("Account ID, scriptName e secretName s\xE3o obrigat\xF3rios para remover secret do Worker.");
      }
      return cloudflareRequest2(
        env2,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/secrets/${encodeURIComponent(normalizedSecret)}`,
        `Falha ao remover secret ${normalizedSecret} do Worker ${normalizedScript}`,
        {
          method: "DELETE"
        }
      );
    }, "deleteCloudflareWorkerSecret");
    listCloudflarePagesDomains = /* @__PURE__ */ __name(async (env2, accountId, projectName) => {
      const normalizedAccountId = accountId.trim();
      const normalizedProject = projectName.trim();
      if (!normalizedAccountId || !normalizedProject) {
        throw new Error("Account ID e projectName s\xE3o obrigat\xF3rios para listar dom\xEDnios do Pages.");
      }
      const domains = await cloudflareRequest2(
        env2,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}/domains`,
        `Falha ao listar dom\xEDnios do projeto ${normalizedProject}`
      );
      return Array.isArray(domains) ? domains : [];
    }, "listCloudflarePagesDomains");
    addCloudflarePagesDomain = /* @__PURE__ */ __name(async (env2, accountId, projectName, domainName) => {
      const normalizedAccountId = accountId.trim();
      const normalizedProject = projectName.trim();
      const normalizedDomain = domainName.trim();
      if (!normalizedAccountId || !normalizedProject || !normalizedDomain) {
        throw new Error("Account ID, projectName e domainName s\xE3o obrigat\xF3rios para adicionar dom\xEDnio no Pages.");
      }
      return cloudflareRequest2(
        env2,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}/domains`,
        `Falha ao adicionar dom\xEDnio no projeto ${normalizedProject}`,
        {
          method: "POST",
          body: JSON.stringify({ name: normalizedDomain })
        }
      );
    }, "addCloudflarePagesDomain");
    deleteCloudflarePagesDomain = /* @__PURE__ */ __name(async (env2, accountId, projectName, domainName) => {
      const normalizedAccountId = accountId.trim();
      const normalizedProject = projectName.trim();
      const normalizedDomain = domainName.trim();
      if (!normalizedAccountId || !normalizedProject || !normalizedDomain) {
        throw new Error("Account ID, projectName e domainName s\xE3o obrigat\xF3rios para remover dom\xEDnio do Pages.");
      }
      return cloudflareRequest2(
        env2,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}/domains/${encodeURIComponent(normalizedDomain)}`,
        `Falha ao remover dom\xEDnio ${normalizedDomain} do projeto ${normalizedProject}`,
        {
          method: "DELETE"
        }
      );
    }, "deleteCloudflarePagesDomain");
    retryCloudflarePagesDeployment = /* @__PURE__ */ __name(async (env2, accountId, projectName, deploymentId) => {
      const normalizedAccountId = accountId.trim();
      const normalizedProject = projectName.trim();
      const normalizedDeploymentId = deploymentId.trim();
      if (!normalizedAccountId || !normalizedProject || !normalizedDeploymentId) {
        throw new Error("Account ID, projectName e deploymentId s\xE3o obrigat\xF3rios para retry de deployment.");
      }
      return cloudflareRequest2(
        env2,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}/deployments/${encodeURIComponent(normalizedDeploymentId)}/retry`,
        `Falha ao executar retry do deployment ${normalizedDeploymentId}`,
        {
          method: "POST"
        }
      );
    }, "retryCloudflarePagesDeployment");
    rollbackCloudflarePagesDeployment = /* @__PURE__ */ __name(async (env2, accountId, projectName, deploymentId) => {
      const normalizedAccountId = accountId.trim();
      const normalizedProject = projectName.trim();
      const normalizedDeploymentId = deploymentId.trim();
      if (!normalizedAccountId || !normalizedProject || !normalizedDeploymentId) {
        throw new Error("Account ID, projectName e deploymentId s\xE3o obrigat\xF3rios para rollback de deployment.");
      }
      return cloudflareRequest2(
        env2,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}/deployments/${encodeURIComponent(normalizedDeploymentId)}/rollback`,
        `Falha ao executar rollback do deployment ${normalizedDeploymentId}`,
        {
          method: "POST"
        }
      );
    }, "rollbackCloudflarePagesDeployment");
    getCloudflarePagesDeploymentLogs = /* @__PURE__ */ __name(async (env2, accountId, projectName, deploymentId) => {
      const normalizedAccountId = accountId.trim();
      const normalizedProject = projectName.trim();
      const normalizedDeploymentId = deploymentId.trim();
      if (!normalizedAccountId || !normalizedProject || !normalizedDeploymentId) {
        throw new Error("Account ID, projectName e deploymentId s\xE3o obrigat\xF3rios para leitura de logs do deployment.");
      }
      return cloudflareRequest2(
        env2,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}/deployments/${encodeURIComponent(normalizedDeploymentId)}/history/logs`,
        `Falha ao ler logs do deployment ${normalizedDeploymentId}`
      );
    }, "getCloudflarePagesDeploymentLogs");
    createCloudflareWorkerFromTemplate = /* @__PURE__ */ __name(async (env2, accountId, scriptName, templateCode, usageModel) => {
      const normalizedAccountId = accountId.trim();
      const normalizedScript = scriptName.trim();
      if (!normalizedAccountId || !normalizedScript) {
        throw new Error("Account ID e scriptName s\xE3o obrigat\xF3rios para criar Worker.");
      }
      const compatibilityDate = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
      const metadata = {
        main_module: "index.js",
        compatibility_date: compatibilityDate,
        usage_model: usageModel?.trim() || "standard"
      };
      const content = templateCode.trim() || `export default {
  async fetch(request) {
    return new Response('Worker ${normalizedScript} ativo', {
      status: 200,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  },
}
`;
      const form = new FormData();
      form.append("metadata", JSON.stringify(metadata));
      form.append("index.js", new Blob([content], { type: "application/javascript" }), "index.js");
      return cloudflareRequest2(
        env2,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}`,
        `Falha ao criar Worker ${normalizedScript}`,
        {
          method: "PUT",
          headers: {
            // fetch define boundary automaticamente para multipart/form-data
          },
          body: form
        }
      );
    }, "createCloudflareWorkerFromTemplate");
    createCloudflarePagesProject = /* @__PURE__ */ __name(async (env2, accountId, projectName, productionBranch) => {
      const normalizedAccountId = accountId.trim();
      const normalizedProject = projectName.trim();
      if (!normalizedAccountId || !normalizedProject) {
        throw new Error("Account ID e projectName s\xE3o obrigat\xF3rios para criar projeto Pages.");
      }
      const branch = productionBranch?.trim() || "main";
      return cloudflareRequest2(
        env2,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects`,
        `Falha ao criar projeto Pages ${normalizedProject}`,
        {
          method: "POST",
          body: JSON.stringify({
            name: normalizedProject,
            production_branch: branch
          })
        }
      );
    }, "createCloudflarePagesProject");
    updateCloudflarePagesProjectSettings = /* @__PURE__ */ __name(async (env2, accountId, projectName, settings) => {
      const normalizedAccountId = accountId.trim();
      const normalizedProject = projectName.trim();
      if (!normalizedAccountId || !normalizedProject) {
        throw new Error("Account ID e projectName s\xE3o obrigat\xF3rios para atualizar settings do Pages.");
      }
      return cloudflareRequest2(
        env2,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}`,
        `Falha ao atualizar settings do projeto ${normalizedProject}`,
        {
          method: "PATCH",
          body: JSON.stringify(settings)
        }
      );
    }, "updateCloudflarePagesProjectSettings");
    listCloudflareWorkerVersions = /* @__PURE__ */ __name(async (env2, accountId, scriptName) => {
      const normalizedAccountId = accountId.trim();
      const normalizedScript = scriptName.trim();
      if (!normalizedAccountId || !normalizedScript) {
        throw new Error("Account ID e scriptName s\xE3o obrigat\xF3rios para listar vers\xF5es do Worker.");
      }
      const versions2 = await cloudflareRequest2(
        env2,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/versions`,
        `Falha ao listar vers\xF5es do Worker ${normalizedScript}`
      );
      return Array.isArray(versions2) ? versions2 : [];
    }, "listCloudflareWorkerVersions");
    deployCloudflareWorkerVersion = /* @__PURE__ */ __name(async (env2, accountId, scriptName, versionId) => {
      const normalizedAccountId = accountId.trim();
      const normalizedScript = scriptName.trim();
      const normalizedVersion = versionId.trim();
      if (!normalizedAccountId || !normalizedScript || !normalizedVersion) {
        throw new Error("Account ID, scriptName e versionId s\xE3o obrigat\xF3rios para promover vers\xE3o do Worker.");
      }
      return cloudflareRequest2(
        env2,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/deployments`,
        `Falha ao promover vers\xE3o ${normalizedVersion} do Worker ${normalizedScript}`,
        {
          method: "POST",
          body: JSON.stringify({
            versions: [
              {
                version_id: normalizedVersion,
                percentage: 100
              }
            ]
          })
        }
      );
    }, "deployCloudflareWorkerVersion");
    listCloudflareWorkerRoutes = /* @__PURE__ */ __name(async (env2, zoneId) => {
      const normalizedZoneId = zoneId.trim();
      if (!normalizedZoneId) {
        throw new Error("zoneId \xE9 obrigat\xF3rio para listar rotas de Worker.");
      }
      const routes2 = await cloudflareRequest2(
        env2,
        `/zones/${encodeURIComponent(normalizedZoneId)}/workers/routes`,
        `Falha ao listar rotas de Worker da zona ${normalizedZoneId}`
      );
      return Array.isArray(routes2) ? routes2 : [];
    }, "listCloudflareWorkerRoutes");
    addCloudflareWorkerRoute = /* @__PURE__ */ __name(async (env2, zoneId, pattern, scriptName) => {
      const normalizedZoneId = zoneId.trim();
      const normalizedPattern = pattern.trim();
      const normalizedScript = scriptName.trim();
      if (!normalizedZoneId || !normalizedPattern || !normalizedScript) {
        throw new Error("zoneId, pattern e scriptName s\xE3o obrigat\xF3rios para adicionar rota de Worker.");
      }
      return cloudflareRequest2(
        env2,
        `/zones/${encodeURIComponent(normalizedZoneId)}/workers/routes`,
        `Falha ao adicionar rota ${normalizedPattern}`,
        {
          method: "POST",
          body: JSON.stringify({
            pattern: normalizedPattern,
            script: normalizedScript
          })
        }
      );
    }, "addCloudflareWorkerRoute");
    deleteCloudflareWorkerRoute = /* @__PURE__ */ __name(async (env2, zoneId, routeId) => {
      const normalizedZoneId = zoneId.trim();
      const normalizedRouteId = routeId.trim();
      if (!normalizedZoneId || !normalizedRouteId) {
        throw new Error("zoneId e routeId s\xE3o obrigat\xF3rios para remover rota de Worker.");
      }
      return cloudflareRequest2(
        env2,
        `/zones/${encodeURIComponent(normalizedZoneId)}/workers/routes/${encodeURIComponent(normalizedRouteId)}`,
        `Falha ao remover rota ${normalizedRouteId}`,
        {
          method: "DELETE"
        }
      );
    }, "deleteCloudflareWorkerRoute");
    runCloudflareRawRequest = /* @__PURE__ */ __name(async (env2, method, path, bodyJson) => {
      const normalizedPath = validateCloudflareApiPath(path);
      const normalizedMethod = method.trim().toUpperCase();
      if (!["GET", "POST", "PUT", "PATCH", "DELETE"].includes(normalizedMethod)) {
        throw new Error(`M\xE9todo n\xE3o suportado para opera\xE7\xE3o raw: ${normalizedMethod}`);
      }
      const parsedBody = parseJsonSafe(bodyJson ?? "", "rawBodyJson");
      const requestInit = {
        method: normalizedMethod
      };
      if (parsedBody != null && normalizedMethod !== "GET") {
        requestInit.body = JSON.stringify(parsedBody);
      }
      return cloudflareRequest2(
        env2,
        normalizedPath,
        `Falha na opera\xE7\xE3o raw ${normalizedMethod} ${normalizedPath}`,
        requestInit
      );
    }, "runCloudflareRawRequest");
  }
});

// api/cfpw/cleanup-deployments.ts
async function onRequestGet14(context2) {
  try {
    const { accountId } = await resolveCloudflarePwAccount(context2.env);
    const projects = await listCloudflarePagesProjects(context2.env, accountId);
    let totalDeployments = 0;
    let totalObsolete = 0;
    const scanResults = await Promise.all(
      projects.map(async (project) => {
        const projectName = String(project.name ?? "").trim();
        if (!projectName) {
          return {
            name: "(sem nome)",
            totalDeployments: 0,
            latestDeployment: null,
            obsoleteDeployments: []
          };
        }
        try {
          const [projectDetails, deployments] = await Promise.all([
            getCloudflarePagesProject(context2.env, accountId, projectName).catch(() => null),
            listCloudflarePagesDeployments(context2.env, accountId, projectName)
          ]);
          const sorted = [...deployments].sort((a, b) => {
            const dateA = new Date(a.created_on ?? "").getTime() || 0;
            const dateB = new Date(b.created_on ?? "").getTime() || 0;
            return dateB - dateA;
          });
          const scopedDeployments = sorted.filter((d) => isInCleanupScope(d));
          const canonicalDeploymentId = String(projectDetails?.canonical_deployment?.id ?? "").trim();
          const protectedIds = resolveMainActiveIds(canonicalDeploymentId, scopedDeployments);
          const activeForDisplayId = Array.from(protectedIds)[0] ?? "";
          const latestForDisplay = activeForDisplayId ? scopedDeployments.find((d) => String(d.id) === activeForDisplayId) ?? scopedDeployments[0] ?? null : scopedDeployments[0] ?? null;
          const obsolete = protectedIds.size > 0 ? scopedDeployments.filter((d) => !protectedIds.has(String(d.id ?? ""))) : [];
          totalDeployments += scopedDeployments.length;
          totalObsolete += obsolete.length;
          return {
            name: projectName,
            totalDeployments: scopedDeployments.length,
            latestDeployment: latestForDisplay ? {
              id: String(latestForDisplay.id ?? ""),
              created_on: String(latestForDisplay.created_on ?? ""),
              environment: String(latestForDisplay.environment ?? ""),
              url: String(latestForDisplay.url ?? "")
            } : null,
            obsoleteDeployments: obsolete.map((d) => ({
              id: String(d.id ?? ""),
              short_id: String(d.short_id ?? String(d.id ?? "").slice(0, 8)),
              created_on: String(d.created_on ?? ""),
              environment: String(d.environment ?? ""),
              url: String(d.url ?? "")
            }))
          };
        } catch {
          return {
            name: projectName,
            totalDeployments: 0,
            latestDeployment: null,
            obsoleteDeployments: []
          };
        }
      })
    );
    const response = {
      accountId,
      projects: scanResults,
      totalProjects: scanResults.length,
      totalDeployments,
      totalObsolete
    };
    return jsonResponse2(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido ao escanear infraestrutura.";
    return jsonResponse2({ error: message }, 500);
  }
}
async function onRequestPost9(context2) {
  try {
    const body = await context2.request.json();
    const projectName = String(body.projectName ?? "").trim();
    const deploymentId = String(body.deploymentId ?? "").trim();
    if (!projectName || !deploymentId) {
      return jsonResponse2({ error: "projectName e deploymentId s\xE3o obrigat\xF3rios." }, 400);
    }
    const { accountId } = await resolveCloudflarePwAccount(context2.env);
    let targetDeployment = null;
    try {
      const [project, deployments] = await Promise.all([
        getCloudflarePagesProject(context2.env, accountId, projectName),
        listCloudflarePagesDeployments(context2.env, accountId, projectName)
      ]);
      const target = deployments.find((d) => String(d.id ?? "").trim() === deploymentId);
      if (!target) {
        return jsonResponse2({
          error: `Deployment ${deploymentId} n\xE3o encontrado no projeto ${projectName}.`,
          ok: false
        }, 404);
      }
      targetDeployment = target;
      if (!isInCleanupScope(target)) {
        return jsonResponse2({
          error: `Deployment ${deploymentId} fora do escopo de expurgo (somente branches main/production/preview).`,
          ok: false
        }, 403);
      }
      const canonicalId = String(project?.canonical_deployment?.id ?? "").trim();
      const scopedDeployments = deployments.filter((d) => isInCleanupScope(d));
      const protectedActiveIds = resolveMainActiveIds(canonicalId, scopedDeployments);
      if (protectedActiveIds.size === 0) {
        return jsonResponse2({
          error: `N\xE3o foi poss\xEDvel identificar o deployment ativo do branch main para ${projectName}. Exclus\xE3o bloqueada por seguran\xE7a.`,
          ok: false
        }, 503);
      }
      if (protectedActiveIds.has(deploymentId)) {
        return jsonResponse2({
          error: `Deployment ${deploymentId} \xE9 o deployment ATIVO do projeto ${projectName}. Exclus\xE3o bloqueada.`,
          ok: false
        }, 403);
      }
    } catch (guardErr) {
      const guardMessage = guardErr instanceof Error ? guardErr.message : "N\xE3o foi poss\xEDvel validar o deployment ativo.";
      return jsonResponse2({
        error: `Valida\xE7\xE3o de seguran\xE7a falhou para ${projectName}. Exclus\xE3o bloqueada: ${guardMessage}`,
        ok: false
      }, 503);
    }
    const forceDelete = targetDeployment ? isPreviewDeployment(targetDeployment) : false;
    await deleteCloudflarePagesDeployment(context2.env, accountId, projectName, deploymentId, forceDelete);
    return jsonResponse2({
      ok: true,
      projectName,
      deploymentId,
      message: forceDelete ? `Deployment ${deploymentId} removido com sucesso (preview com confirma\xE7\xE3o program\xE1tica).` : `Deployment ${deploymentId} removido com sucesso.`
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido ao remover deployment.";
    return jsonResponse2({ error: message, ok: false }, 500);
  }
}
var jsonResponse2, isActiveStageStatus, TARGET_BRANCHES, getDeploymentBranch, isInCleanupScope, isPreviewDeployment, resolveMainActiveIds;
var init_cleanup_deployments = __esm({
  "api/cfpw/cleanup-deployments.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_cfpw_api();
    jsonResponse2 = /* @__PURE__ */ __name((body, status = 200) => new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" }
    }), "jsonResponse");
    isActiveStageStatus = /* @__PURE__ */ __name((status) => {
      const normalized = status.trim().toLowerCase();
      return normalized === "active";
    }, "isActiveStageStatus");
    TARGET_BRANCHES = /* @__PURE__ */ new Set(["production", "main", "preview"]);
    getDeploymentBranch = /* @__PURE__ */ __name((deployment) => {
      const byBranch = String(deployment.deployment_trigger?.metadata?.branch ?? "").trim().toLowerCase();
      if (byBranch) {
        return byBranch;
      }
      const byCommitRef = String(deployment.deployment_trigger?.metadata?.commit_ref ?? "").trim().toLowerCase();
      return byCommitRef;
    }, "getDeploymentBranch");
    isInCleanupScope = /* @__PURE__ */ __name((deployment) => {
      const environment = String(deployment.environment ?? "").trim().toLowerCase();
      if (environment === "preview") {
        return true;
      }
      const branch = getDeploymentBranch(deployment);
      return TARGET_BRANCHES.has(branch);
    }, "isInCleanupScope");
    isPreviewDeployment = /* @__PURE__ */ __name((deployment) => {
      const environment = String(deployment.environment ?? "").trim().toLowerCase();
      if (environment === "preview") {
        return true;
      }
      return getDeploymentBranch(deployment) === "preview";
    }, "isPreviewDeployment");
    resolveMainActiveIds = /* @__PURE__ */ __name((canonicalId, deployments) => {
      const inMain = deployments.filter((d) => getDeploymentBranch(d) === "main");
      const protectedIds = /* @__PURE__ */ new Set();
      if (canonicalId && inMain.some((d) => String(d.id ?? "").trim() === canonicalId)) {
        protectedIds.add(canonicalId);
        return protectedIds;
      }
      for (const deployment of inMain) {
        const id = String(deployment.id ?? "").trim();
        if (!id) continue;
        if (isActiveStageStatus(String(deployment.latest_stage?.status ?? ""))) {
          protectedIds.add(id);
        }
      }
      if (protectedIds.size > 0) {
        return protectedIds;
      }
      const sortedMain = [...inMain].sort((a, b) => {
        const dateA = new Date(a.created_on ?? "").getTime() || 0;
        const dateB = new Date(b.created_on ?? "").getTime() || 0;
        return dateB - dateA;
      });
      const fallbackMainId = String(sortedMain[0]?.id ?? "").trim();
      if (fallbackMainId) {
        protectedIds.add(fallbackMainId);
      }
      return protectedIds;
    }, "resolveMainActiveIds");
    __name(onRequestGet14, "onRequestGet");
    __name(onRequestPost9, "onRequestPost");
  }
});

// api/cfpw/delete-page.ts
async function onRequestPost10(context2) {
  const trace3 = createResponseTrace(context2.request);
  let payload;
  try {
    payload = await context2.request.json();
  } catch {
    return toError5("JSON inv\xE1lido no corpo da requisi\xE7\xE3o.", trace3, 400);
  }
  const projectName = toText(payload.projectName);
  const confirmation = toText(payload.confirmation);
  if (!projectName) {
    return toError5("Campo projectName \xE9 obrigat\xF3rio.", trace3, 400);
  }
  if (confirmation !== projectName) {
    return toError5(`Confirma\xE7\xE3o inv\xE1lida. Digite exatamente o nome do projeto (${projectName}).`, trace3, 400);
  }
  try {
    const accountInfo = await resolveCloudflarePwAccount(context2.env);
    await deleteCloudflarePagesProject(context2.env, accountInfo.accountId, projectName);
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "cfpw",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: "delete-page",
            provider: "cloudflare-api",
            accountId: accountInfo.accountId,
            projectName
          }
        });
      } catch {
      }
    }
    return new Response(JSON.stringify({
      ok: true,
      ...trace3,
      message: `Projeto Pages ${projectName} removido com sucesso.`
    }), {
      headers: toHeaders7()
    });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : `Falha ao remover projeto ${projectName}.`;
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "cfpw",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: "delete-page",
            provider: "cloudflare-api",
            projectName
          }
        });
      } catch {
      }
    }
    return toError5(message, trace3, 502);
  }
}
var toHeaders7, toError5, toText;
var init_delete_page = __esm({
  "api/cfpw/delete-page.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_request_trace();
    init_cfpw_api();
    toHeaders7 = /* @__PURE__ */ __name(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    toError5 = /* @__PURE__ */ __name((message, trace3, status = 500) => new Response(JSON.stringify({
      ok: false,
      ...trace3,
      error: message
    }), {
      status,
      headers: toHeaders7()
    }), "toError");
    toText = /* @__PURE__ */ __name((value) => String(value ?? "").trim(), "toText");
    __name(onRequestPost10, "onRequestPost");
  }
});

// api/cfpw/delete-worker.ts
async function onRequestPost11(context2) {
  const trace3 = createResponseTrace(context2.request);
  let payload;
  try {
    payload = await context2.request.json();
  } catch {
    return toError6("JSON inv\xE1lido no corpo da requisi\xE7\xE3o.", trace3, 400);
  }
  const scriptName = toText2(payload.scriptName);
  const confirmation = toText2(payload.confirmation);
  if (!scriptName) {
    return toError6("Campo scriptName \xE9 obrigat\xF3rio.", trace3, 400);
  }
  if (confirmation !== scriptName) {
    return toError6(`Confirma\xE7\xE3o inv\xE1lida. Digite exatamente o nome do Worker (${scriptName}).`, trace3, 400);
  }
  try {
    const accountInfo = await resolveCloudflarePwAccount(context2.env);
    await deleteCloudflareWorker(context2.env, accountInfo.accountId, scriptName);
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "cfpw",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: "delete-worker",
            provider: "cloudflare-api",
            accountId: accountInfo.accountId,
            scriptName
          }
        });
      } catch {
      }
    }
    return new Response(JSON.stringify({
      ok: true,
      ...trace3,
      message: `Worker ${scriptName} removido com sucesso.`
    }), {
      headers: toHeaders8()
    });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : `Falha ao remover Worker ${scriptName}.`;
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "cfpw",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: "delete-worker",
            provider: "cloudflare-api",
            scriptName
          }
        });
      } catch {
      }
    }
    return toError6(message, trace3, 502);
  }
}
var toHeaders8, toError6, toText2;
var init_delete_worker = __esm({
  "api/cfpw/delete-worker.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_request_trace();
    init_cfpw_api();
    toHeaders8 = /* @__PURE__ */ __name(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    toError6 = /* @__PURE__ */ __name((message, trace3, status = 500) => new Response(JSON.stringify({
      ok: false,
      ...trace3,
      error: message
    }), {
      status,
      headers: toHeaders8()
    }), "toError");
    toText2 = /* @__PURE__ */ __name((value) => String(value ?? "").trim(), "toText");
    __name(onRequestPost11, "onRequestPost");
  }
});

// api/cfpw/ops.ts
async function onRequestPost12(context2) {
  const trace3 = createResponseTrace(context2.request);
  let payload;
  try {
    payload = await context2.request.json();
  } catch {
    return toError7("JSON inv\xE1lido no corpo da requisi\xE7\xE3o.", trace3, 400);
  }
  const action = toText3(payload.action);
  if (!action) {
    return toError7("Campo action \xE9 obrigat\xF3rio.", trace3, 400);
  }
  const scriptName = toText3(payload.scriptName);
  const projectName = toText3(payload.projectName);
  const deploymentId = toText3(payload.deploymentId);
  const domainName = toText3(payload.domainName);
  const secretName = toText3(payload.secretName);
  const secretValue = String(payload.secretValue ?? "");
  const usageModel = toText3(payload.usageModel);
  const schedules = normalizeSchedules(payload.schedules);
  const templateCode = String(payload.templateCode ?? "");
  const projectBranch = toText3(payload.projectBranch);
  const pageSettingsJson = String(payload.pageSettingsJson ?? "");
  const versionId = toText3(payload.versionId);
  const zoneId = toText3(payload.zoneId);
  const routeId = toText3(payload.routeId);
  const routePattern = toText3(payload.routePattern);
  const rawMethod = toText3(payload.rawMethod);
  const rawPath = toText3(payload.rawPath);
  const rawBodyJson = String(payload.rawBodyJson ?? "");
  try {
    const accountInfo = await resolveCloudflarePwAccount(context2.env);
    let result = null;
    switch (action) {
      case "create-worker-from-template": {
        if (!scriptName) {
          return toError7("scriptName \xE9 obrigat\xF3rio para create-worker-from-template.", trace3, 400);
        }
        result = await createCloudflareWorkerFromTemplate(context2.env, accountInfo.accountId, scriptName, templateCode, usageModel);
        break;
      }
      case "get-worker-schedules": {
        if (!scriptName) {
          return toError7("scriptName \xE9 obrigat\xF3rio para get-worker-schedules.", trace3, 400);
        }
        result = await getCloudflareWorkerSchedules(context2.env, accountInfo.accountId, scriptName);
        break;
      }
      case "update-worker-schedules": {
        if (!scriptName) {
          return toError7("scriptName \xE9 obrigat\xF3rio para update-worker-schedules.", trace3, 400);
        }
        result = await updateCloudflareWorkerSchedules(context2.env, accountInfo.accountId, scriptName, schedules);
        break;
      }
      case "get-worker-usage-model": {
        if (!scriptName) {
          return toError7("scriptName \xE9 obrigat\xF3rio para get-worker-usage-model.", trace3, 400);
        }
        result = await getCloudflareWorkerUsageModel(context2.env, accountInfo.accountId, scriptName);
        break;
      }
      case "update-worker-usage-model": {
        if (!scriptName || !usageModel) {
          return toError7("scriptName e usageModel s\xE3o obrigat\xF3rios para update-worker-usage-model.", trace3, 400);
        }
        result = await updateCloudflareWorkerUsageModel(context2.env, accountInfo.accountId, scriptName, usageModel);
        break;
      }
      case "list-worker-secrets": {
        if (!scriptName) {
          return toError7("scriptName \xE9 obrigat\xF3rio para list-worker-secrets.", trace3, 400);
        }
        result = await listCloudflareWorkerSecrets(context2.env, accountInfo.accountId, scriptName);
        break;
      }
      case "add-worker-secret": {
        if (!scriptName || !secretName || !secretValue) {
          return toError7("scriptName, secretName e secretValue s\xE3o obrigat\xF3rios para add-worker-secret.", trace3, 400);
        }
        result = await addCloudflareWorkerSecret(context2.env, accountInfo.accountId, scriptName, secretName, secretValue);
        break;
      }
      case "delete-worker-secret": {
        if (!scriptName || !secretName) {
          return toError7("scriptName e secretName s\xE3o obrigat\xF3rios para delete-worker-secret.", trace3, 400);
        }
        result = await deleteCloudflareWorkerSecret(context2.env, accountInfo.accountId, scriptName, secretName);
        break;
      }
      case "create-page-project": {
        if (!projectName) {
          return toError7("projectName \xE9 obrigat\xF3rio para create-page-project.", trace3, 400);
        }
        result = await createCloudflarePagesProject(context2.env, accountInfo.accountId, projectName, projectBranch);
        break;
      }
      case "update-page-project-settings": {
        if (!projectName) {
          return toError7("projectName \xE9 obrigat\xF3rio para update-page-project-settings.", trace3, 400);
        }
        let parsedSettings = {};
        if (pageSettingsJson.trim()) {
          try {
            parsedSettings = JSON.parse(pageSettingsJson);
          } catch {
            return toError7("pageSettingsJson inv\xE1lido: informe JSON v\xE1lido para update-page-project-settings.", trace3, 400);
          }
        }
        result = await updateCloudflarePagesProjectSettings(context2.env, accountInfo.accountId, projectName, parsedSettings);
        break;
      }
      case "list-page-domains": {
        if (!projectName) {
          return toError7("projectName \xE9 obrigat\xF3rio para list-page-domains.", trace3, 400);
        }
        result = await listCloudflarePagesDomains(context2.env, accountInfo.accountId, projectName);
        break;
      }
      case "add-page-domain": {
        if (!projectName || !domainName) {
          return toError7("projectName e domainName s\xE3o obrigat\xF3rios para add-page-domain.", trace3, 400);
        }
        result = await addCloudflarePagesDomain(context2.env, accountInfo.accountId, projectName, domainName);
        break;
      }
      case "delete-page-domain": {
        if (!projectName || !domainName) {
          return toError7("projectName e domainName s\xE3o obrigat\xF3rios para delete-page-domain.", trace3, 400);
        }
        result = await deleteCloudflarePagesDomain(context2.env, accountInfo.accountId, projectName, domainName);
        break;
      }
      case "retry-page-deployment": {
        if (!projectName || !deploymentId) {
          return toError7("projectName e deploymentId s\xE3o obrigat\xF3rios para retry-page-deployment.", trace3, 400);
        }
        result = await retryCloudflarePagesDeployment(context2.env, accountInfo.accountId, projectName, deploymentId);
        break;
      }
      case "rollback-page-deployment": {
        if (!projectName || !deploymentId) {
          return toError7("projectName e deploymentId s\xE3o obrigat\xF3rios para rollback-page-deployment.", trace3, 400);
        }
        result = await rollbackCloudflarePagesDeployment(context2.env, accountInfo.accountId, projectName, deploymentId);
        break;
      }
      case "get-page-deployment-logs": {
        if (!projectName || !deploymentId) {
          return toError7("projectName e deploymentId s\xE3o obrigat\xF3rios para get-page-deployment-logs.", trace3, 400);
        }
        result = await getCloudflarePagesDeploymentLogs(context2.env, accountInfo.accountId, projectName, deploymentId);
        break;
      }
      case "list-worker-versions": {
        if (!scriptName) {
          return toError7("scriptName \xE9 obrigat\xF3rio para list-worker-versions.", trace3, 400);
        }
        result = await listCloudflareWorkerVersions(context2.env, accountInfo.accountId, scriptName);
        break;
      }
      case "deploy-worker-version": {
        if (!scriptName || !versionId) {
          return toError7("scriptName e versionId s\xE3o obrigat\xF3rios para deploy-worker-version.", trace3, 400);
        }
        result = await deployCloudflareWorkerVersion(context2.env, accountInfo.accountId, scriptName, versionId);
        break;
      }
      case "list-worker-routes": {
        if (!zoneId) {
          return toError7("zoneId \xE9 obrigat\xF3rio para list-worker-routes.", trace3, 400);
        }
        result = await listCloudflareWorkerRoutes(context2.env, zoneId);
        break;
      }
      case "add-worker-route": {
        if (!zoneId || !routePattern || !scriptName) {
          return toError7("zoneId, routePattern e scriptName s\xE3o obrigat\xF3rios para add-worker-route.", trace3, 400);
        }
        result = await addCloudflareWorkerRoute(context2.env, zoneId, routePattern, scriptName);
        break;
      }
      case "delete-worker-route": {
        if (!zoneId || !routeId) {
          return toError7("zoneId e routeId s\xE3o obrigat\xF3rios para delete-worker-route.", trace3, 400);
        }
        result = await deleteCloudflareWorkerRoute(context2.env, zoneId, routeId);
        break;
      }
      case "raw-cloudflare-request": {
        if (!rawMethod || !rawPath) {
          return toError7("rawMethod e rawPath s\xE3o obrigat\xF3rios para raw-cloudflare-request.", trace3, 400);
        }
        result = await runCloudflareRawRequest(context2.env, rawMethod, rawPath, rawBodyJson);
        break;
      }
      default:
        return toError7(`A\xE7\xE3o n\xE3o suportada: ${action}`, trace3, 400);
    }
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "cfpw",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: `ops:${action}`,
            provider: "cloudflare-api",
            accountId: accountInfo.accountId,
            scriptName: scriptName || null,
            projectName: projectName || null,
            deploymentId: deploymentId || null,
            domainName: domainName || null
          }
        });
      } catch {
      }
    }
    return new Response(JSON.stringify({
      ok: true,
      ...trace3,
      action,
      accountId: accountInfo.accountId,
      result
    }), {
      headers: toHeaders9()
    });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : `Falha ao executar a\xE7\xE3o ${action}.`;
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "cfpw",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: `ops:${action}`,
            provider: "cloudflare-api",
            scriptName: scriptName || null,
            projectName: projectName || null,
            deploymentId: deploymentId || null,
            domainName: domainName || null
          }
        });
      } catch {
      }
    }
    return toError7(message, trace3, 502);
  }
}
var toHeaders9, toError7, toText3, normalizeSchedules;
var init_ops = __esm({
  "api/cfpw/ops.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_request_trace();
    init_cfpw_api();
    toHeaders9 = /* @__PURE__ */ __name(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    toError7 = /* @__PURE__ */ __name((message, trace3, status = 500) => new Response(JSON.stringify({
      ok: false,
      ...trace3,
      error: message
    }), {
      status,
      headers: toHeaders9()
    }), "toError");
    toText3 = /* @__PURE__ */ __name((value) => String(value ?? "").trim(), "toText");
    normalizeSchedules = /* @__PURE__ */ __name((value) => {
      if (!Array.isArray(value)) {
        return [];
      }
      return value.map((item) => ({ cron: toText3(item?.cron) })).filter((item) => item.cron.length > 0);
    }, "normalizeSchedules");
    __name(onRequestPost12, "onRequestPost");
  }
});

// api/cfpw/overview.ts
async function onRequestGet15(context2) {
  const trace3 = createResponseTrace(context2.request);
  try {
    const accountInfo = await resolveCloudflarePwAccount(context2.env);
    const [workersRaw, pagesRaw] = await Promise.all([
      listCloudflareWorkers(context2.env, accountInfo.accountId),
      listCloudflarePagesProjects(context2.env, accountInfo.accountId)
    ]);
    const workers = workersRaw.map(mapWorker);
    const pages = pagesRaw.map(mapProject);
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "cfpw",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: "overview",
            provider: "cloudflare-api",
            accountId: accountInfo.accountId,
            workers: workers.length,
            pages: pages.length
          }
        });
      } catch {
      }
    }
    return new Response(JSON.stringify({
      ok: true,
      ...trace3,
      account: {
        accountId: accountInfo.accountId,
        accountName: accountInfo.accountName,
        source: accountInfo.source
      },
      accounts: accountInfo.accounts,
      summary: {
        totalWorkers: workers.length,
        totalPages: pages.length
      },
      workers,
      pages
    }), {
      headers: toHeaders10()
    });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha ao carregar overview de Cloudflare Pages & Workers.";
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "cfpw",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: "overview",
            provider: "cloudflare-api"
          }
        });
      } catch {
      }
    }
    return toError8(message, trace3, 502);
  }
}
var toHeaders10, toError8, mapWorker, mapProject;
var init_overview = __esm({
  "api/cfpw/overview.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_request_trace();
    init_cfpw_api();
    toHeaders10 = /* @__PURE__ */ __name(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    toError8 = /* @__PURE__ */ __name((message, trace3, status = 500) => new Response(JSON.stringify({
      ok: false,
      ...trace3,
      error: message
    }), {
      status,
      headers: toHeaders10()
    }), "toError");
    mapWorker = /* @__PURE__ */ __name((worker) => {
      const scriptName = String(worker.id ?? "").trim();
      return {
        scriptName,
        handlers: Array.isArray(worker.handlers) ? worker.handlers : [],
        createdAt: String(worker.created_on ?? "").trim() || null,
        updatedAt: String(worker.modified_on ?? "").trim() || null,
        tag: String(worker.tag ?? "").trim() || null
      };
    }, "mapWorker");
    mapProject = /* @__PURE__ */ __name((project) => {
      const projectName = String(project.name ?? "").trim();
      return {
        projectName,
        id: String(project.id ?? "").trim() || null,
        subdomain: String(project.subdomain ?? "").trim() || null,
        productionBranch: String(project.production_branch ?? "").trim() || null,
        createdAt: String(project.created_on ?? "").trim() || null,
        domains: Array.isArray(project.domains) ? project.domains : [],
        latestDeployment: project.latest_deployment ? {
          id: String(project.latest_deployment.id ?? "").trim() || null,
          environment: String(project.latest_deployment.environment ?? "").trim() || null,
          createdAt: String(project.latest_deployment.created_on ?? "").trim() || null,
          url: String(project.latest_deployment.url ?? "").trim() || null
        } : null
      };
    }, "mapProject");
    __name(onRequestGet15, "onRequestGet");
  }
});

// api/cfpw/page-details.ts
async function onRequestGet16(context2) {
  const trace3 = createResponseTrace(context2.request);
  const url = new URL(context2.request.url);
  const projectName = toProjectName(url.searchParams.get("projectName"));
  if (!projectName) {
    return toError9("Par\xE2metro projectName \xE9 obrigat\xF3rio.", trace3, 400);
  }
  try {
    const accountInfo = await resolveCloudflarePwAccount(context2.env);
    const [projectResult, deploymentsResult] = await Promise.allSettled([
      getCloudflarePagesProject(context2.env, accountInfo.accountId, projectName),
      listCloudflarePagesDeployments(context2.env, accountInfo.accountId, projectName)
    ]);
    const warnings = [];
    const project = projectResult.status === "fulfilled" ? projectResult.value : null;
    const deployments = deploymentsResult.status === "fulfilled" ? deploymentsResult.value : [];
    if (projectResult.status === "rejected") {
      const message = projectResult.reason instanceof Error ? projectResult.reason.message : "Falha ao ler detalhes do projeto Pages.";
      warnings.push({ code: "CFPW-PAGE-DETAILS-PARTIAL-PROJECT", message });
    }
    if (deploymentsResult.status === "rejected") {
      const message = deploymentsResult.reason instanceof Error ? deploymentsResult.reason.message : "Falha ao listar deployments do projeto Pages.";
      warnings.push({ code: "CFPW-PAGE-DETAILS-PARTIAL-DEPLOYMENTS", message });
    }
    if (!project && deployments.length === 0) {
      const fatal = warnings[0]?.message || `Falha ao carregar detalhes do Pages ${projectName}.`;
      throw new Error(fatal);
    }
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "cfpw",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: "page-details",
            provider: "cloudflare-api",
            accountId: accountInfo.accountId,
            projectName,
            deployments: deployments.length,
            partialWarnings: warnings.length
          }
        });
      } catch {
      }
    }
    return new Response(JSON.stringify({
      ok: true,
      ...trace3,
      accountId: accountInfo.accountId,
      projectName,
      project,
      deployments,
      warnings
    }), {
      headers: toHeaders11()
    });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : `Falha ao carregar detalhes do Pages ${projectName}.`;
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "cfpw",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: "page-details",
            provider: "cloudflare-api",
            projectName
          }
        });
      } catch {
      }
    }
    return toError9(message, trace3, 502);
  }
}
var toHeaders11, toError9, toProjectName;
var init_page_details = __esm({
  "api/cfpw/page-details.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_request_trace();
    init_cfpw_api();
    toHeaders11 = /* @__PURE__ */ __name(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    toError9 = /* @__PURE__ */ __name((message, trace3, status = 500) => new Response(JSON.stringify({
      ok: false,
      ...trace3,
      error: message
    }), {
      status,
      headers: toHeaders11()
    }), "toError");
    toProjectName = /* @__PURE__ */ __name((raw) => String(raw ?? "").trim(), "toProjectName");
    __name(onRequestGet16, "onRequestGet");
  }
});

// api/cfpw/worker-details.ts
async function onRequestGet17(context2) {
  const trace3 = createResponseTrace(context2.request);
  const url = new URL(context2.request.url);
  const scriptName = toScriptName(url.searchParams.get("scriptName"));
  if (!scriptName) {
    return toError10("Par\xE2metro scriptName \xE9 obrigat\xF3rio.", trace3, 400);
  }
  try {
    const accountInfo = await resolveCloudflarePwAccount(context2.env);
    const [workerResult, deploymentsResult] = await Promise.allSettled([
      getCloudflareWorker(context2.env, accountInfo.accountId, scriptName),
      listCloudflareWorkerDeployments(context2.env, accountInfo.accountId, scriptName)
    ]);
    const warnings = [];
    const worker = workerResult.status === "fulfilled" ? workerResult.value : null;
    const deployments = deploymentsResult.status === "fulfilled" ? deploymentsResult.value : [];
    if (workerResult.status === "rejected") {
      const message = workerResult.reason instanceof Error ? workerResult.reason.message : "Falha ao ler configura\xE7\xF5es do Worker.";
      warnings.push({ code: "CFPW-WORKER-DETAILS-PARTIAL-WORKER", message });
    }
    if (deploymentsResult.status === "rejected") {
      const message = deploymentsResult.reason instanceof Error ? deploymentsResult.reason.message : "Falha ao listar deployments do Worker.";
      warnings.push({ code: "CFPW-WORKER-DETAILS-PARTIAL-DEPLOYMENTS", message });
    }
    if (!worker && deployments.length === 0) {
      const fatal = warnings[0]?.message || `Falha ao carregar detalhes do Worker ${scriptName}.`;
      throw new Error(fatal);
    }
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "cfpw",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: "worker-details",
            provider: "cloudflare-api",
            accountId: accountInfo.accountId,
            scriptName,
            deployments: deployments.length,
            partialWarnings: warnings.length
          }
        });
      } catch {
      }
    }
    return new Response(JSON.stringify({
      ok: true,
      ...trace3,
      accountId: accountInfo.accountId,
      scriptName,
      worker,
      deployments,
      warnings
    }), {
      headers: toHeaders12()
    });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : `Falha ao carregar detalhes do Worker ${scriptName}.`;
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "cfpw",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: "worker-details",
            provider: "cloudflare-api",
            scriptName
          }
        });
      } catch {
      }
    }
    return toError10(message, trace3, 502);
  }
}
var toHeaders12, toError10, toScriptName;
var init_worker_details = __esm({
  "api/cfpw/worker-details.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_request_trace();
    init_cfpw_api();
    toHeaders12 = /* @__PURE__ */ __name(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    toError10 = /* @__PURE__ */ __name((message, trace3, status = 500) => new Response(JSON.stringify({
      ok: false,
      ...trace3,
      error: message
    }), {
      status,
      headers: toHeaders12()
    }), "toError");
    toScriptName = /* @__PURE__ */ __name((raw) => String(raw ?? "").trim(), "toScriptName");
    __name(onRequestGet17, "onRequestGet");
  }
});

// ../node_modules/@sumup/sdk/dist/index.js
function getRuntimeInfo() {
  if (cachedRuntimeInfo) return cachedRuntimeInfo;
  const isVercel = "u" > typeof process && "1" === process.env.VERCEL;
  const globalAny = globalThis;
  if (globalAny.Bun?.version) {
    cachedRuntimeInfo = {
      runtime: "bun",
      runtimeVersion: globalAny.Bun.version || UNKNOWN,
      os: globalAny.process?.platform || UNKNOWN,
      arch: normalizeArch(globalAny.process?.arch || "")
    };
    return cachedRuntimeInfo;
  }
  if (globalAny.Deno?.version?.deno) {
    cachedRuntimeInfo = {
      runtime: "deno",
      runtimeVersion: globalAny.Deno.version.deno || UNKNOWN,
      os: globalAny.Deno.build?.os || UNKNOWN,
      arch: normalizeArch(globalAny.Deno.build?.arch || "")
    };
    return cachedRuntimeInfo;
  }
  if (globalAny.process?.versions?.node) {
    cachedRuntimeInfo = {
      runtime: isVercel ? "vercel" : "node",
      runtimeVersion: globalAny.process.version || UNKNOWN,
      os: globalAny.process.platform || UNKNOWN,
      arch: normalizeArch(globalAny.process.arch || "")
    };
    return cachedRuntimeInfo;
  }
  if (globalAny.EdgeRuntime) {
    cachedRuntimeInfo = {
      runtime: isVercel ? "vercel-edge" : "edge",
      runtimeVersion: globalAny.process?.version || UNKNOWN,
      os: UNKNOWN,
      arch: `${globalAny.EdgeRuntime}`
    };
    return cachedRuntimeInfo;
  }
  if (globalAny.navigator) {
    const userAgent = globalAny.navigator.userAgent || "";
    if (userAgent.includes("Cloudflare-Workers")) {
      cachedRuntimeInfo = {
        runtime: "cloudflare-workers",
        runtimeVersion: userAgent,
        os: UNKNOWN,
        arch: UNKNOWN
      };
      return cachedRuntimeInfo;
    }
    const platform2 = globalAny.navigator.userAgentData?.platform || globalAny.navigator.platform || "";
    cachedRuntimeInfo = {
      runtime: "browser",
      runtimeVersion: UNKNOWN,
      os: platform2 || UNKNOWN,
      arch: UNKNOWN
    };
    return cachedRuntimeInfo;
  }
  cachedRuntimeInfo = {
    runtime: UNKNOWN,
    runtimeVersion: UNKNOWN,
    os: UNKNOWN,
    arch: UNKNOWN
  };
  return cachedRuntimeInfo;
}
function buildRuntimeHeaders() {
  const { runtime, runtimeVersion, os, arch: arch2 } = getRuntimeInfo();
  return {
    "X-Sumup-Api-Version": "1.0.0",
    "X-Sumup-Lang": "javascript",
    "X-Sumup-Package-Version": "0.1.2",
    "X-Sumup-Os": os,
    "X-Sumup-Arch": arch2,
    "X-Sumup-Runtime": runtime,
    "X-Sumup-Runtime-Version": runtimeVersion
  };
}
function mergeParams(a, b) {
  const { authorization: defaultAuthorization, headers: defaultHeaders, ...defaultParams } = a;
  const { authorization: overrideAuthorization, headers: overrideHeaders, ...overrideParams } = b;
  const headers2 = new Headers(defaultHeaders);
  for (const [key, value] of new Headers(overrideHeaders).entries()) headers2.set(key, value);
  const authorization = overrideAuthorization ?? defaultAuthorization;
  if (authorization) headers2.set("Authorization", authorization);
  return {
    ...defaultParams,
    ...overrideParams,
    headers: headers2
  };
}
function isRetryableStatus(status) {
  return 408 === status || 409 === status || 429 === status || status >= 500;
}
function isRetryableError(error3, signal) {
  if (signal?.aborted) return false;
  return error3 instanceof TypeError || isAbortError(error3);
}
function isAbortError(error3) {
  return error3 instanceof DOMException ? "AbortError" === error3.name : error3 instanceof Error && "AbortError" === error3.name;
}
function withTimeoutSignal(signal, timeout) {
  if (!signal && void 0 === timeout) return {
    cleanup: /* @__PURE__ */ __name(() => {
    }, "cleanup"),
    didTimeout: /* @__PURE__ */ __name(() => false, "didTimeout"),
    signal: void 0
  };
  const controller = new AbortController();
  let timedOut = false;
  const onAbort = /* @__PURE__ */ __name(() => {
    controller.abort(signal?.reason);
  }, "onAbort");
  if (signal) if (signal.aborted) onAbort();
  else signal.addEventListener("abort", onAbort, {
    once: true
  });
  const timeoutId = "number" == typeof timeout ? setTimeout(() => {
    timedOut = true;
    controller.abort(new SumUpError(`Request timed out after ${timeout}ms.`));
  }, timeout) : void 0;
  return {
    cleanup: /* @__PURE__ */ __name(() => {
      if (void 0 !== timeoutId) clearTimeout(timeoutId);
      signal?.removeEventListener("abort", onAbort);
    }, "cleanup"),
    didTimeout: /* @__PURE__ */ __name(() => timedOut, "didTimeout"),
    signal: controller.signal
  };
}
var _computedKey, APIResource, SumUpError, APIError, APIPromise, UNKNOWN, normalizeArch, cachedRuntimeInfo, HTTPClient, Checkouts, Customers, Members, Memberships, Merchants, Payouts, Readers, Receipts, Roles, Subaccounts, Transactions, SumUp, src, dist_default;
var init_dist = __esm({
  "../node_modules/@sumup/sdk/dist/index.js"() {
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    APIResource = class {
      static {
        __name(this, "APIResource");
      }
      _client;
      constructor(client) {
        this._client = client;
      }
    };
    SumUpError = class extends Error {
      static {
        __name(this, "SumUpError");
      }
    };
    APIError = class extends SumUpError {
      static {
        __name(this, "APIError");
      }
      status;
      error;
      response;
      constructor(status, error3, response) {
        const message = "string" == typeof error3 ? error3 : JSON.stringify(error3);
        super(`${status}: ${message}`);
        this.status = status;
        this.error = error3;
        this.response = response;
      }
    };
    _computedKey = Symbol.toStringTag;
    APIPromise = class {
      static {
        __name(this, "APIPromise");
      }
      resp;
      constructor(resp) {
        this.resp = resp;
      }
      async parse() {
        const res = await this.resp;
        if (204 === res.status || 205 === res.status) return;
        const contentLength = res.headers.get("content-length");
        if ("0" === contentLength) return;
        const contentType = res.headers.get("content-type");
        const isJSON = contentType?.includes("json");
        if (!isJSON) throw new SumUpError("Unexpected non-json response.");
        return await res.json();
      }
      async withResponse() {
        const [data, response] = await Promise.all([
          this.parse(),
          await this.resp
        ]);
        return {
          data,
          response
        };
      }
      then(onFulfilled, onRejected) {
        return this.parse().then(onFulfilled, onRejected);
      }
      catch(onRejected) {
        return this.parse().catch(onRejected);
      }
      finally(onFinally) {
        return this.parse().finally(onFinally);
      }
      [_computedKey] = "APIPromise";
    };
    UNKNOWN = "unknown";
    normalizeArch = /* @__PURE__ */ __name((arch2) => {
      const lower = arch2.toLowerCase();
      if ("x64" === lower || "x86_64" === lower || "amd64" === lower) return "x86_64";
      if ("ia32" === lower || "x86" === lower || "x32" === lower) return "x86";
      if ("aarch64" === lower || "arm64" === lower) return "arm64";
      if ("arm" === lower) return "arm";
      return lower || UNKNOWN;
    }, "normalizeArch");
    __name(getRuntimeInfo, "getRuntimeInfo");
    __name(buildRuntimeHeaders, "buildRuntimeHeaders");
    HTTPClient = class {
      static {
        __name(this, "HTTPClient");
      }
      host;
      apiKey;
      baseParams;
      constructor({ apiKey, host = "https://api.sumup.com", baseParams = {}, maxRetries = 0, timeout } = {}) {
        this.host = host;
        this.apiKey = apiKey;
        const headers2 = new Headers({
          Accept: "application/problem+json, application/json",
          "Content-Type": "application/json",
          "User-Agent": "sumup-ts/v0.1.2",
          ...buildRuntimeHeaders()
        });
        if (apiKey) headers2.append("Authorization", `Bearer ${apiKey}`);
        this.baseParams = mergeParams({
          headers: headers2,
          maxRetries,
          timeout
        }, baseParams);
      }
      get({ ...params }) {
        return this.request({
          method: "GET",
          ...params
        });
      }
      post({ ...params }) {
        return this.request({
          method: "POST",
          ...params
        });
      }
      put({ ...params }) {
        return this.request({
          method: "PUT",
          ...params
        });
      }
      patch({ ...params }) {
        return this.request({
          method: "PATCH",
          ...params
        });
      }
      delete({ ...params }) {
        return this.request({
          method: "DELETE",
          ...params
        });
      }
      request({ body, path, query, host: hostOverride, ...requestOptions }) {
        const host = hostOverride || this.host;
        const url = new URL(host + (host.endsWith("/") && path.startsWith("/") ? path.slice(1) : path));
        if ("object" == typeof query && query && !Array.isArray(query)) url.search = this.stringifyQuery(query);
        const mergedOptions = mergeParams(this.baseParams, requestOptions);
        const { maxRetries, timeout, ...fetchParams } = mergedOptions;
        const init = {
          ...fetchParams,
          body: JSON.stringify(body)
        };
        return new APIPromise(this.do(url, init, {
          maxRetries,
          signal: fetchParams.signal,
          timeout
        }));
      }
      async do(input, init, options) {
        const maxRetries = options.maxRetries ?? 0;
        for (let attempt = 0; ; attempt++) {
          const { cleanup, didTimeout, signal } = withTimeoutSignal(options.signal, options.timeout);
          try {
            const res = await fetch(input, {
              ...init,
              signal
            });
            if (!res.ok) {
              if (attempt < maxRetries && isRetryableStatus(res.status)) continue;
              const contentType = res.headers.get("content-type");
              const isJSON = contentType?.includes("json");
              throw new APIError(res.status, isJSON ? await res.json() : await res.text(), res);
            }
            return res;
          } catch (error3) {
            if (attempt < maxRetries && isRetryableError(error3, options.signal)) continue;
            if (didTimeout()) throw new SumUpError(`Request timed out after ${options.timeout}ms.`);
            throw error3;
          } finally {
            cleanup();
          }
        }
      }
      stringifyQuery(query) {
        return Object.entries(query).filter(([_, value]) => void 0 !== value).map(([key, value]) => {
          if ("string" == typeof value || "number" == typeof value || "boolean" == typeof value) return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
          if (null === value) return `${encodeURIComponent(key)}=`;
          if (Array.isArray(value)) return value.map((v) => `${encodeURIComponent(key)}=${encodeURIComponent(v)}`).join("&");
          throw new Error(`Cannot stringify type ${typeof value}; Expected string, number, boolean, or null.`);
        }).join("&");
      }
    };
    __name(mergeParams, "mergeParams");
    __name(isRetryableStatus, "isRetryableStatus");
    __name(isRetryableError, "isRetryableError");
    __name(isAbortError, "isAbortError");
    __name(withTimeoutSignal, "withTimeoutSignal");
    Checkouts = class extends APIResource {
      static {
        __name(this, "Checkouts");
      }
      listAvailablePaymentMethods(merchantCode, query, options) {
        return this._client.get({
          path: `/v0.1/merchants/${merchantCode}/payment-methods`,
          query,
          ...options
        });
      }
      list(query, options) {
        return this._client.get({
          path: "/v0.1/checkouts",
          query,
          ...options
        });
      }
      create(body, options) {
        return this._client.post({
          path: "/v0.1/checkouts",
          body,
          ...options
        });
      }
      get(id, options) {
        return this._client.get({
          path: `/v0.1/checkouts/${id}`,
          ...options
        });
      }
      process(id, body, options) {
        return this._client.put({
          path: `/v0.1/checkouts/${id}`,
          body,
          ...options
        });
      }
      deactivate(id, options) {
        return this._client.delete({
          path: `/v0.1/checkouts/${id}`,
          ...options
        });
      }
    };
    Customers = class extends APIResource {
      static {
        __name(this, "Customers");
      }
      create(body, options) {
        return this._client.post({
          path: "/v0.1/customers",
          body,
          ...options
        });
      }
      get(customerId, options) {
        return this._client.get({
          path: `/v0.1/customers/${customerId}`,
          ...options
        });
      }
      update(customerId, body, options) {
        return this._client.put({
          path: `/v0.1/customers/${customerId}`,
          body,
          ...options
        });
      }
      listPaymentInstruments(customerId, options) {
        return this._client.get({
          path: `/v0.1/customers/${customerId}/payment-instruments`,
          ...options
        });
      }
      deactivatePaymentInstrument(customerId, token, options) {
        return this._client.delete({
          path: `/v0.1/customers/${customerId}/payment-instruments/${token}`,
          ...options
        });
      }
    };
    Members = class extends APIResource {
      static {
        __name(this, "Members");
      }
      list(merchantCode, query, options) {
        return this._client.get({
          path: `/v0.1/merchants/${merchantCode}/members`,
          query,
          ...options
        });
      }
      create(merchantCode, body, options) {
        return this._client.post({
          path: `/v0.1/merchants/${merchantCode}/members`,
          body,
          ...options
        });
      }
      get(merchantCode, memberId, options) {
        return this._client.get({
          path: `/v0.1/merchants/${merchantCode}/members/${memberId}`,
          ...options
        });
      }
      update(merchantCode, memberId, body, options) {
        return this._client.put({
          path: `/v0.1/merchants/${merchantCode}/members/${memberId}`,
          body,
          ...options
        });
      }
      delete(merchantCode, memberId, options) {
        return this._client.delete({
          path: `/v0.1/merchants/${merchantCode}/members/${memberId}`,
          ...options
        });
      }
    };
    Memberships = class extends APIResource {
      static {
        __name(this, "Memberships");
      }
      list(query, options) {
        return this._client.get({
          path: "/v0.1/memberships",
          query,
          ...options
        });
      }
    };
    Merchants = class extends APIResource {
      static {
        __name(this, "Merchants");
      }
      get(merchantCode, query, options) {
        return this._client.get({
          path: `/v1/merchants/${merchantCode}`,
          query,
          ...options
        });
      }
      listPersons(merchantCode, query, options) {
        return this._client.get({
          path: `/v1/merchants/${merchantCode}/persons`,
          query,
          ...options
        });
      }
      getPerson(merchantCode, personId, query, options) {
        return this._client.get({
          path: `/v1/merchants/${merchantCode}/persons/${personId}`,
          query,
          ...options
        });
      }
    };
    Payouts = class extends APIResource {
      static {
        __name(this, "Payouts");
      }
      list(merchantCode, query, options) {
        return this._client.get({
          path: `/v1.0/merchants/${merchantCode}/payouts`,
          query,
          ...options
        });
      }
      listDeprecated(query, options) {
        return this._client.get({
          path: "/v0.1/me/financials/payouts",
          query,
          ...options
        });
      }
    };
    Readers = class extends APIResource {
      static {
        __name(this, "Readers");
      }
      list(merchantCode, options) {
        return this._client.get({
          path: `/v0.1/merchants/${merchantCode}/readers`,
          ...options
        });
      }
      create(merchantCode, body, options) {
        return this._client.post({
          path: `/v0.1/merchants/${merchantCode}/readers`,
          body,
          ...options
        });
      }
      get(merchantCode, id, options) {
        return this._client.get({
          path: `/v0.1/merchants/${merchantCode}/readers/${id}`,
          ...options
        });
      }
      delete(merchantCode, id, options) {
        return this._client.delete({
          path: `/v0.1/merchants/${merchantCode}/readers/${id}`,
          ...options
        });
      }
      update(merchantCode, id, body, options) {
        return this._client.patch({
          path: `/v0.1/merchants/${merchantCode}/readers/${id}`,
          body,
          ...options
        });
      }
      createCheckout(merchantCode, readerId, body, options) {
        return this._client.post({
          path: `/v0.1/merchants/${merchantCode}/readers/${readerId}/checkout`,
          body,
          ...options
        });
      }
      getStatus(merchantCode, readerId, options) {
        return this._client.get({
          path: `/v0.1/merchants/${merchantCode}/readers/${readerId}/status`,
          ...options
        });
      }
      terminateCheckout(merchantCode, readerId, body, options) {
        return this._client.post({
          path: `/v0.1/merchants/${merchantCode}/readers/${readerId}/terminate`,
          body,
          ...options
        });
      }
    };
    Receipts = class extends APIResource {
      static {
        __name(this, "Receipts");
      }
      get(id, query, options) {
        return this._client.get({
          path: `/v1.1/receipts/${id}`,
          query,
          ...options
        });
      }
    };
    Roles = class extends APIResource {
      static {
        __name(this, "Roles");
      }
      list(merchantCode, options) {
        return this._client.get({
          path: `/v0.1/merchants/${merchantCode}/roles`,
          ...options
        });
      }
      create(merchantCode, body, options) {
        return this._client.post({
          path: `/v0.1/merchants/${merchantCode}/roles`,
          body,
          ...options
        });
      }
      get(merchantCode, roleId, options) {
        return this._client.get({
          path: `/v0.1/merchants/${merchantCode}/roles/${roleId}`,
          ...options
        });
      }
      delete(merchantCode, roleId, options) {
        return this._client.delete({
          path: `/v0.1/merchants/${merchantCode}/roles/${roleId}`,
          ...options
        });
      }
      update(merchantCode, roleId, body, options) {
        return this._client.patch({
          path: `/v0.1/merchants/${merchantCode}/roles/${roleId}`,
          body,
          ...options
        });
      }
    };
    Subaccounts = class extends APIResource {
      static {
        __name(this, "Subaccounts");
      }
      listSubAccounts(query, options) {
        return this._client.get({
          path: "/v0.1/me/accounts",
          query,
          ...options
        });
      }
      createSubAccount(body, options) {
        return this._client.post({
          path: "/v0.1/me/accounts",
          body,
          ...options
        });
      }
      compatGetOperator(operatorId, options) {
        return this._client.get({
          path: `/v0.1/me/accounts/${operatorId}`,
          ...options
        });
      }
      updateSubAccount(operatorId, body, options) {
        return this._client.put({
          path: `/v0.1/me/accounts/${operatorId}`,
          body,
          ...options
        });
      }
    };
    Transactions = class extends APIResource {
      static {
        __name(this, "Transactions");
      }
      refund(txnId, body, options) {
        return this._client.post({
          path: `/v0.1/me/refund/${txnId}`,
          body,
          ...options
        });
      }
      get(merchantCode, query, options) {
        return this._client.get({
          path: `/v2.1/merchants/${merchantCode}/transactions`,
          query,
          ...options
        });
      }
      getDeprecated(query, options) {
        return this._client.get({
          path: "/v0.1/me/transactions",
          query,
          ...options
        });
      }
      list(merchantCode, query, options) {
        return this._client.get({
          path: `/v2.1/merchants/${merchantCode}/transactions/history`,
          query,
          ...options
        });
      }
      listDeprecated(query, options) {
        return this._client.get({
          path: "/v0.1/me/transactions/history",
          query,
          ...options
        });
      }
    };
    SumUp = class extends HTTPClient {
      static {
        __name(this, "SumUp");
      }
      checkouts = new Checkouts(this);
      customers = new Customers(this);
      members = new Members(this);
      memberships = new Memberships(this);
      merchants = new Merchants(this);
      payouts = new Payouts(this);
      readers = new Readers(this);
      receipts = new Receipts(this);
      roles = new Roles(this);
      subaccounts = new Subaccounts(this);
      transactions = new Transactions(this);
    };
    src = SumUp;
    dist_default = src;
  }
});

// api/financeiro/insights.ts
var FINANCIAL_CUTOFF_BRT, FINANCIAL_CUTOFF_DATE, FINANCIAL_CUTOFF_UTC, FINANCIAL_CUTOFF_ISO, getStartIsoWithCutoff, isOnOrAfterCutoff, onRequestGet18;
var init_insights = __esm({
  "api/financeiro/insights.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_dist();
    FINANCIAL_CUTOFF_BRT = "2026-03-01T00:00:00-03:00";
    FINANCIAL_CUTOFF_DATE = "2026-03-01";
    FINANCIAL_CUTOFF_UTC = new Date(FINANCIAL_CUTOFF_BRT);
    FINANCIAL_CUTOFF_ISO = FINANCIAL_CUTOFF_UTC.toISOString();
    getStartIsoWithCutoff = /* @__PURE__ */ __name((rawDate) => {
      if (!rawDate) return FINANCIAL_CUTOFF_ISO;
      const parsed = new Date(rawDate);
      if (Number.isNaN(parsed.getTime())) return FINANCIAL_CUTOFF_ISO;
      return parsed.getTime() < FINANCIAL_CUTOFF_UTC.getTime() ? FINANCIAL_CUTOFF_ISO : parsed.toISOString();
    }, "getStartIsoWithCutoff");
    isOnOrAfterCutoff = /* @__PURE__ */ __name((value) => {
      if (!value) return false;
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return false;
      return parsed.getTime() >= FINANCIAL_CUTOFF_UTC.getTime();
    }, "isOnOrAfterCutoff");
    onRequestGet18 = /* @__PURE__ */ __name(async (context2) => {
      const url = new URL(context2.request.url);
      const provider = url.searchParams.get("provider") || "";
      const type = url.searchParams.get("type") || "";
      if (provider === "sumup") {
        const token = context2.env.SUMUP_API_KEY_PRIVATE;
        const merchantCode = context2.env.SUMUP_MERCHANT_CODE;
        if (!token || !merchantCode) return Response.json({ error: "SUMUP_API_KEY_PRIVATE ou SUMUP_MERCHANT_CODE ausentes." }, { status: 503 });
        const client = new dist_default({ apiKey: token });
        if (type === "payment-methods") {
          try {
            const amountRaw = Number(url.searchParams.get("amount"));
            const amount = Number.isFinite(amountRaw) && amountRaw > 0 ? amountRaw : 10;
            const currency = (url.searchParams.get("currency") || "BRL").toUpperCase();
            const data = await client.checkouts.listAvailablePaymentMethods(merchantCode, { amount, currency });
            const methods = Array.isArray(data?.available_payment_methods) ? data.available_payment_methods.map((m) => m.id).filter(Boolean) : [];
            return Response.json({ success: true, amount, currency, methods });
          } catch (err) {
            return Response.json({ error: err instanceof Error ? err.message : "Falha ao listar m\xE9todos SumUp." }, { status: 500 });
          }
        }
        if (type === "transactions-summary") {
          try {
            const limitRaw = Number(url.searchParams.get("limit"));
            const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 50;
            const changesSince = getStartIsoWithCutoff(url.searchParams.get("changes_since") || url.searchParams.get("start_date"));
            const txData = await client.transactions.list(merchantCode, {
              order: "descending",
              limit,
              changes_since: changesSince
            });
            const rawItems = Array.isArray(txData?.items) ? txData.items : [];
            const items = rawItems.filter((tx) => isOnOrAfterCutoff(tx?.timestamp));
            const byStatus = {};
            const byType = {};
            let totalAmount = 0;
            for (const tx of items) {
              const status = (tx?.status || "UNKNOWN").toUpperCase();
              const txType = (tx?.type || "UNKNOWN").toUpperCase();
              byStatus[status] = (byStatus[status] || 0) + 1;
              byType[txType] = (byType[txType] || 0) + 1;
              totalAmount += Number(tx?.amount || 0);
            }
            return Response.json({
              success: true,
              scanned: items.length,
              limit,
              totalAmount,
              byStatus,
              byType,
              hasMore: Array.isArray(txData?.links) && txData.links.length > 0
            });
          } catch (err) {
            return Response.json({ error: err instanceof Error ? err.message : "Falha no resumo SumUp." }, { status: 500 });
          }
        }
        if (type === "transactions-advanced") {
          try {
            const limitRaw = Number(url.searchParams.get("limit"));
            const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 50;
            const changesSince = getStartIsoWithCutoff(url.searchParams.get("changes_since") || url.searchParams.get("start_date"));
            const txData = await client.transactions.list(merchantCode, {
              order: "descending",
              limit,
              changes_since: changesSince
            });
            const rawItems = Array.isArray(txData?.items) ? txData.items : [];
            const normalized = rawItems.filter((tx) => isOnOrAfterCutoff(tx?.timestamp)).map((tx) => ({
              id: tx?.id || tx?.transaction_id || null,
              transactionCode: tx?.transaction_code || null,
              amount: Number(tx?.amount || 0),
              currency: tx?.currency || "BRL",
              status: tx?.status || "UNKNOWN",
              type: tx?.type || "UNKNOWN",
              paymentType: tx?.payment_type || "UNKNOWN",
              entryMode: tx?.entry_mode || null,
              cardType: tx?.card_type || null,
              timestamp: tx?.timestamp || null,
              user: tx?.user || null,
              payerEmail: typeof tx?.user === "string" && tx.user.includes("@") ? tx.user : null,
              refundedAmount: Number(tx?.refunded_amount || 0),
              authCode: tx?.auth_code || null,
              internalId: tx?.internal_id || null,
              installments: tx?.installments_count || null
            }));
            return Response.json({ success: true, total: normalized.length, items: normalized });
          } catch (err) {
            return Response.json({ error: err instanceof Error ? err.message : "Falha em transa\xE7\xF5es avan\xE7adas SumUp." }, { status: 500 });
          }
        }
        if (type === "payouts-summary") {
          try {
            const now = /* @__PURE__ */ new Date();
            const requestedStart = url.searchParams.get("start_date") || FINANCIAL_CUTOFF_DATE;
            const startDate = requestedStart < FINANCIAL_CUTOFF_DATE ? FINANCIAL_CUTOFF_DATE : requestedStart;
            const endDate = url.searchParams.get("end_date") || now.toISOString().slice(0, 10);
            const payouts = await client.payouts.list(merchantCode, {
              start_date: startDate,
              end_date: endDate,
              order: "desc",
              limit: 100
            });
            const list = Array.isArray(payouts) ? payouts : [];
            let totalAmount = 0, totalFee = 0;
            const byStatus = {};
            for (const p of list) {
              totalAmount += Number(p?.amount || 0);
              totalFee += Number(p?.fee || 0);
              const status = (p?.status || "UNKNOWN").toUpperCase();
              byStatus[status] = (byStatus[status] || 0) + 1;
            }
            return Response.json({ success: true, startDate, endDate, count: list.length, totalAmount, totalFee, byStatus });
          } catch (err) {
            return Response.json({ error: err instanceof Error ? err.message : "Falha em payouts SumUp." }, { status: 500 });
          }
        }
      }
      if (provider === "mp") {
        const token = context2.env.MP_ACCESS_TOKEN;
        if (!token) return Response.json({ error: "MP_ACCESS_TOKEN ausente." }, { status: 503 });
        const mpHeaders = { Authorization: `Bearer ${token}` };
        const readMpError = /* @__PURE__ */ __name(async (res, fallback) => {
          try {
            const body = await res.text();
            const parsed = JSON.parse(body);
            return parsed.message || parsed.error || `MP API ${res.status}: ${body.slice(0, 200)}`;
          } catch {
            return `MP API ${res.status}: ${fallback}`;
          }
        }, "readMpError");
        if (type === "payment-methods") {
          try {
            const res = await fetch("https://api.mercadopago.com/v1/payment_methods", { headers: mpHeaders });
            if (!res.ok) {
              const errMsg = await readMpError(res, res.statusText);
              return Response.json({ error: errMsg }, { status: res.status });
            }
            const methodsRaw = await res.json();
            const methods = [...new Set(methodsRaw.map((m) => m?.id).filter(Boolean))];
            const types = [...new Set(methodsRaw.map((m) => m?.payment_type_id).filter(Boolean))];
            return Response.json({ success: true, scanned: methodsRaw.length, methods, types });
          } catch (err) {
            return Response.json({ error: err instanceof Error ? err.message : "Falha ao listar m\xE9todos MP." }, { status: 500 });
          }
        }
        if (type === "transactions-summary") {
          try {
            const limitRaw = Number(url.searchParams.get("limit"));
            const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 50;
            const begin_date = getStartIsoWithCutoff(url.searchParams.get("begin_date") || url.searchParams.get("start_date"));
            const end_date = url.searchParams.get("end_date") ? new Date(url.searchParams.get("end_date")).toISOString() : (/* @__PURE__ */ new Date()).toISOString();
            const searchUrl = new URL("https://api.mercadopago.com/v1/payments/search");
            searchUrl.searchParams.set("sort", "date_created");
            searchUrl.searchParams.set("criteria", "desc");
            searchUrl.searchParams.set("range", "date_created");
            searchUrl.searchParams.set("begin_date", begin_date);
            searchUrl.searchParams.set("end_date", end_date);
            searchUrl.searchParams.set("limit", String(limit));
            searchUrl.searchParams.set("offset", "0");
            const res = await fetch(searchUrl.toString(), { headers: mpHeaders });
            if (!res.ok) {
              const errMsg = await readMpError(res, res.statusText);
              return Response.json({ error: errMsg }, { status: res.status });
            }
            const payload = await res.json();
            const items = Array.isArray(payload?.results) ? payload.results : [];
            const byStatus = {};
            const byType = {};
            let totalAmount = 0, totalNetAmount = 0;
            for (const tx of items) {
              const status = String(tx?.status || "unknown").toUpperCase();
              const txType = String(tx?.payment_type_id || "unknown").toUpperCase();
              byStatus[status] = (byStatus[status] || 0) + 1;
              byType[txType] = (byType[txType] || 0) + 1;
              totalAmount += Number(tx?.transaction_amount || 0);
              totalNetAmount += Number(tx?.transaction_details?.net_received_amount || 0);
            }
            return Response.json({
              success: true,
              scanned: items.length,
              limit,
              totalAmount,
              totalNetAmount,
              byStatus,
              byType,
              paging: payload?.paging || { total: 0, limit, offset: 0 }
            });
          } catch (err) {
            return Response.json({ error: err instanceof Error ? err.message : "Falha no resumo MP." }, { status: 500 });
          }
        }
        if (type === "transactions-advanced") {
          try {
            const limitRaw = Number(url.searchParams.get("limit"));
            const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 50;
            const offsetRaw = Number(url.searchParams.get("offset"));
            const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? offsetRaw : 0;
            const begin_date = getStartIsoWithCutoff(url.searchParams.get("begin_date") || url.searchParams.get("start_date"));
            const end_date = url.searchParams.get("end_date") ? new Date(url.searchParams.get("end_date")).toISOString() : (/* @__PURE__ */ new Date()).toISOString();
            const statuses = url.searchParams.get("statuses") || "";
            const types = url.searchParams.get("types") || "";
            const searchUrl = new URL("https://api.mercadopago.com/v1/payments/search");
            searchUrl.searchParams.set("sort", "date_created");
            searchUrl.searchParams.set("criteria", "desc");
            searchUrl.searchParams.set("range", "date_created");
            searchUrl.searchParams.set("begin_date", begin_date);
            searchUrl.searchParams.set("end_date", end_date);
            searchUrl.searchParams.set("limit", String(limit));
            searchUrl.searchParams.set("offset", String(offset));
            if (statuses) searchUrl.searchParams.set("status", statuses);
            if (types) searchUrl.searchParams.set("payment_type_id", types);
            const res = await fetch(searchUrl.toString(), { headers: mpHeaders });
            if (!res.ok) {
              const errMsg = await readMpError(res, res.statusText);
              return Response.json({ error: errMsg }, { status: res.status });
            }
            const payload = await res.json();
            const results = Array.isArray(payload?.results) ? payload.results : [];
            const items = results.map((tx) => ({
              id: tx?.id || null,
              transactionCode: tx?.id ? String(tx.id) : null,
              amount: Number(tx?.transaction_amount || 0),
              currency: tx?.currency_id || "BRL",
              status: tx?.status || "unknown",
              statusDetail: tx?.status_detail || null,
              type: tx?.payment_type_id || "unknown",
              paymentType: tx?.payment_method_id || "unknown",
              entryMode: null,
              cardType: tx?.card?.last_four_digits ? `****${tx.card.last_four_digits}` : null,
              timestamp: tx?.date_created || null,
              user: tx?.payer?.email || null,
              payerEmail: tx?.payer?.email || null,
              refundedAmount: Number(tx?.transaction_amount_refunded || 0),
              authCode: tx?.authorization_code || null,
              installments: tx?.installments || null,
              externalRef: tx?.external_reference || null,
              netReceivedAmount: Number(tx?.transaction_details?.net_received_amount || 0),
              feeAmount: tx?.fee_details?.[0]?.amount != null ? Number(tx.fee_details[0].amount) : null,
              dateApproved: tx?.date_approved || null
            }));
            const paging = payload?.paging || { total: 0, limit, offset: 0 };
            const currentOffset = Number(paging.offset || 0);
            const currentLimit = Number(paging.limit || limit);
            const total = Number(paging.total || 0);
            return Response.json({
              success: true,
              total: items.length,
              items,
              paging: {
                total,
                limit: currentLimit,
                offset: currentOffset,
                hasNext: currentOffset + currentLimit < total,
                hasPrev: currentOffset > 0,
                nextOffset: currentOffset + currentLimit,
                prevOffset: Math.max(0, currentOffset - currentLimit)
              }
            });
          } catch (err) {
            return Response.json({ error: err instanceof Error ? err.message : "Falha em transa\xE7\xF5es avan\xE7adas MP." }, { status: 500 });
          }
        }
      }
      return Response.json({ error: "Par\xE2metros inv\xE1lidos: provider e type s\xE3o obrigat\xF3rios." }, { status: 400 });
    }, "onRequestGet");
  }
});

// api/financeiro/mp-balance.ts
var FINANCIAL_CUTOFF, onRequestGet19;
var init_mp_balance = __esm({
  "api/financeiro/mp-balance.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    FINANCIAL_CUTOFF = "2026-03-01";
    onRequestGet19 = /* @__PURE__ */ __name(async (context2) => {
      const token = context2.env.MP_ACCESS_TOKEN;
      if (!token) return Response.json({ available_balance: 0, unavailable_balance: 0 });
      const url = new URL(context2.request.url);
      const rawStart = url.searchParams.get("start_date") || FINANCIAL_CUTOFF;
      const startDate = rawStart < FINANCIAL_CUTOFF ? FINANCIAL_CUTOFF : rawStart;
      try {
        const approvedRes = await fetch(
          `https://api.mercadopago.com/v1/payments/search?status=approved&begin_date=${startDate}T00:00:00-03:00&limit=100&sort=date_created&criteria=desc`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const approvedData = await approvedRes.json();
        const pendingRes = await fetch(
          `https://api.mercadopago.com/v1/payments/search?status=pending&begin_date=${startDate}T00:00:00-03:00&limit=100&sort=date_created&criteria=desc`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const pendingData = await pendingRes.json();
        const inProcessRes = await fetch(
          `https://api.mercadopago.com/v1/payments/search?status=in_process&begin_date=${startDate}T00:00:00-03:00&limit=100&sort=date_created&criteria=desc`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const inProcessData = await inProcessRes.json();
        const sumAmounts = /* @__PURE__ */ __name((results) => (results || []).reduce((sum, tx) => sum + Number(tx?.transaction_amount || 0), 0), "sumAmounts");
        return Response.json({
          available_balance: sumAmounts(approvedData?.results),
          unavailable_balance: sumAmounts(pendingData?.results) + sumAmounts(inProcessData?.results)
        });
      } catch {
        return Response.json({ available_balance: 0, unavailable_balance: 0 });
      }
    }, "onRequestGet");
  }
});

// ../node_modules/mercadopago/dist/mercadoPagoConfig.js
var require_mercadoPagoConfig = __commonJS({
  "../node_modules/mercadopago/dist/mercadoPagoConfig.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.MercadoPagoConfig = void 0;
    var MercadoPagoConfig3 = class {
      static {
        __name(this, "MercadoPagoConfig");
      }
      constructor(config2) {
        this.accessToken = config2.accessToken;
        this.options = config2.options;
      }
    };
    exports.MercadoPagoConfig = MercadoPagoConfig3;
  }
});

// ../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/unenv/dist/runtime/npm/node-fetch.mjs
var node_fetch_exports = {};
__export(node_fetch_exports, {
  AbortController: () => AbortController2,
  AbortError: () => AbortError,
  FetchError: () => FetchError,
  Headers: () => Headers2,
  Request: () => Request2,
  Response: () => Response2,
  default: () => node_fetch_default,
  fetch: () => fetch2,
  isRedirect: () => isRedirect
});
var fetch2, Headers2, Request2, Response2, AbortController2, FetchError, AbortError, redirectStatus, isRedirect, node_fetch_default;
var init_node_fetch = __esm({
  "../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/unenv/dist/runtime/npm/node-fetch.mjs"() {
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    fetch2 = /* @__PURE__ */ __name((...args) => globalThis.fetch(...args), "fetch");
    Headers2 = globalThis.Headers;
    Request2 = globalThis.Request;
    Response2 = globalThis.Response;
    AbortController2 = globalThis.AbortController;
    FetchError = Error;
    AbortError = Error;
    redirectStatus = /* @__PURE__ */ new Set([
      301,
      302,
      303,
      307,
      308
    ]);
    isRedirect = /* @__PURE__ */ __name((code) => redirectStatus.has(code), "isRedirect");
    fetch2.Promise = globalThis.Promise;
    fetch2.isRedirect = isRedirect;
    node_fetch_default = fetch2;
  }
});

// required-unenv-alias:node-fetch
var require_node_fetch = __commonJS({
  "required-unenv-alias:node-fetch"(exports, module) {
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_node_fetch();
    module.exports = Object.entries(node_fetch_exports).filter(([k]) => k !== "default").reduce(
      (cjs, [k, value]) => Object.defineProperty(cjs, k, { value, enumerable: true }),
      "default" in node_fetch_exports ? node_fetch_default : {}
    );
  }
});

// ../node_modules/mercadopago/dist/utils/config/index.js
var require_config = __commonJS({
  "../node_modules/mercadopago/dist/utils/config/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AppConfig = void 0;
    var AppConfig = class {
      static {
        __name(this, "AppConfig");
      }
      static getNodeVersion() {
        return process.version;
      }
      static getNodeArchitecture() {
        return process.arch;
      }
      static getNodePlatform() {
        return process.platform;
      }
      static getTrackingId() {
        return "platform:" + this.getNodeVersion().substring(0, this.getNodeVersion().indexOf(".")) + "|" + this.getNodeVersion() + ",type:SDK" + this.SDK_VERSION + ",so;";
      }
      static getUserAgent() {
        return "MercadoPago Node.js SDK v" + this.SDK_VERSION + " (node " + this.getNodeVersion() + "-" + this.getNodeArchitecture() + "-" + this.getNodePlatform() + ")";
      }
    };
    exports.AppConfig = AppConfig;
    AppConfig.DEFAULT_TIMEOUT = 1e4;
    AppConfig.DEFAULT_RETRIES = 2;
    AppConfig.BASE_DELAY_MS = 1e3;
    AppConfig.BASE_URL = "https://api.mercadopago.com";
    AppConfig.PRODUCT_ID = "bc32b6ntrpp001u8nhkg";
    AppConfig.SDK_VERSION = "2.12.0";
    AppConfig.Headers = {
      AUTHORIZATION: "Authorization",
      CONTENT_TYPE: "Content-Type",
      USER_AGENT: "User-Agent",
      IDEMPOTENCY_KEY: "X-Idempotency-Key",
      PRODUCT_ID: "X-Product-Id",
      TRACKING_ID: "X-Tracking-Id",
      CORPORATION_ID: "X-Corporation-Id",
      INTEGRATOR_ID: "X-Integrator-Id",
      PLATFORM_ID: "X-Platform-Id",
      MELI_SESSION_ID: "X-Meli-Session-Id",
      EXPAND_RESPONDE_NODES: "X-Expand-Responde-Nodes",
      CARD_VALIDATION: "X-Card-Validation",
      TEST_TOKEN: "X-Test-Token"
    };
  }
});

// ../node_modules/uuid/dist/commonjs-browser/rng.js
var require_rng = __commonJS({
  "../node_modules/uuid/dist/commonjs-browser/rng.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = rng;
    var getRandomValues;
    var rnds8 = new Uint8Array(16);
    function rng() {
      if (!getRandomValues) {
        getRandomValues = typeof crypto !== "undefined" && crypto.getRandomValues && crypto.getRandomValues.bind(crypto);
        if (!getRandomValues) {
          throw new Error("crypto.getRandomValues() not supported. See https://github.com/uuidjs/uuid#getrandomvalues-not-supported");
        }
      }
      return getRandomValues(rnds8);
    }
    __name(rng, "rng");
  }
});

// ../node_modules/uuid/dist/commonjs-browser/regex.js
var require_regex = __commonJS({
  "../node_modules/uuid/dist/commonjs-browser/regex.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _default = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;
    exports.default = _default;
  }
});

// ../node_modules/uuid/dist/commonjs-browser/validate.js
var require_validate = __commonJS({
  "../node_modules/uuid/dist/commonjs-browser/validate.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _regex = _interopRequireDefault(require_regex());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    __name(_interopRequireDefault, "_interopRequireDefault");
    function validate(uuid) {
      return typeof uuid === "string" && _regex.default.test(uuid);
    }
    __name(validate, "validate");
    var _default = validate;
    exports.default = _default;
  }
});

// ../node_modules/uuid/dist/commonjs-browser/stringify.js
var require_stringify = __commonJS({
  "../node_modules/uuid/dist/commonjs-browser/stringify.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    exports.unsafeStringify = unsafeStringify;
    var _validate = _interopRequireDefault(require_validate());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    __name(_interopRequireDefault, "_interopRequireDefault");
    var byteToHex = [];
    for (let i = 0; i < 256; ++i) {
      byteToHex.push((i + 256).toString(16).slice(1));
    }
    function unsafeStringify(arr, offset = 0) {
      return byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]];
    }
    __name(unsafeStringify, "unsafeStringify");
    function stringify(arr, offset = 0) {
      const uuid = unsafeStringify(arr, offset);
      if (!(0, _validate.default)(uuid)) {
        throw TypeError("Stringified UUID is invalid");
      }
      return uuid;
    }
    __name(stringify, "stringify");
    var _default = stringify;
    exports.default = _default;
  }
});

// ../node_modules/uuid/dist/commonjs-browser/v1.js
var require_v1 = __commonJS({
  "../node_modules/uuid/dist/commonjs-browser/v1.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _rng = _interopRequireDefault(require_rng());
    var _stringify = require_stringify();
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    __name(_interopRequireDefault, "_interopRequireDefault");
    var _nodeId;
    var _clockseq;
    var _lastMSecs = 0;
    var _lastNSecs = 0;
    function v1(options, buf, offset) {
      let i = buf && offset || 0;
      const b = buf || new Array(16);
      options = options || {};
      let node = options.node || _nodeId;
      let clockseq = options.clockseq !== void 0 ? options.clockseq : _clockseq;
      if (node == null || clockseq == null) {
        const seedBytes = options.random || (options.rng || _rng.default)();
        if (node == null) {
          node = _nodeId = [seedBytes[0] | 1, seedBytes[1], seedBytes[2], seedBytes[3], seedBytes[4], seedBytes[5]];
        }
        if (clockseq == null) {
          clockseq = _clockseq = (seedBytes[6] << 8 | seedBytes[7]) & 16383;
        }
      }
      let msecs = options.msecs !== void 0 ? options.msecs : Date.now();
      let nsecs = options.nsecs !== void 0 ? options.nsecs : _lastNSecs + 1;
      const dt = msecs - _lastMSecs + (nsecs - _lastNSecs) / 1e4;
      if (dt < 0 && options.clockseq === void 0) {
        clockseq = clockseq + 1 & 16383;
      }
      if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === void 0) {
        nsecs = 0;
      }
      if (nsecs >= 1e4) {
        throw new Error("uuid.v1(): Can't create more than 10M uuids/sec");
      }
      _lastMSecs = msecs;
      _lastNSecs = nsecs;
      _clockseq = clockseq;
      msecs += 122192928e5;
      const tl = ((msecs & 268435455) * 1e4 + nsecs) % 4294967296;
      b[i++] = tl >>> 24 & 255;
      b[i++] = tl >>> 16 & 255;
      b[i++] = tl >>> 8 & 255;
      b[i++] = tl & 255;
      const tmh = msecs / 4294967296 * 1e4 & 268435455;
      b[i++] = tmh >>> 8 & 255;
      b[i++] = tmh & 255;
      b[i++] = tmh >>> 24 & 15 | 16;
      b[i++] = tmh >>> 16 & 255;
      b[i++] = clockseq >>> 8 | 128;
      b[i++] = clockseq & 255;
      for (let n = 0; n < 6; ++n) {
        b[i + n] = node[n];
      }
      return buf || (0, _stringify.unsafeStringify)(b);
    }
    __name(v1, "v1");
    var _default = v1;
    exports.default = _default;
  }
});

// ../node_modules/uuid/dist/commonjs-browser/parse.js
var require_parse = __commonJS({
  "../node_modules/uuid/dist/commonjs-browser/parse.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _validate = _interopRequireDefault(require_validate());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    __name(_interopRequireDefault, "_interopRequireDefault");
    function parse2(uuid) {
      if (!(0, _validate.default)(uuid)) {
        throw TypeError("Invalid UUID");
      }
      let v;
      const arr = new Uint8Array(16);
      arr[0] = (v = parseInt(uuid.slice(0, 8), 16)) >>> 24;
      arr[1] = v >>> 16 & 255;
      arr[2] = v >>> 8 & 255;
      arr[3] = v & 255;
      arr[4] = (v = parseInt(uuid.slice(9, 13), 16)) >>> 8;
      arr[5] = v & 255;
      arr[6] = (v = parseInt(uuid.slice(14, 18), 16)) >>> 8;
      arr[7] = v & 255;
      arr[8] = (v = parseInt(uuid.slice(19, 23), 16)) >>> 8;
      arr[9] = v & 255;
      arr[10] = (v = parseInt(uuid.slice(24, 36), 16)) / 1099511627776 & 255;
      arr[11] = v / 4294967296 & 255;
      arr[12] = v >>> 24 & 255;
      arr[13] = v >>> 16 & 255;
      arr[14] = v >>> 8 & 255;
      arr[15] = v & 255;
      return arr;
    }
    __name(parse2, "parse");
    var _default = parse2;
    exports.default = _default;
  }
});

// ../node_modules/uuid/dist/commonjs-browser/v35.js
var require_v35 = __commonJS({
  "../node_modules/uuid/dist/commonjs-browser/v35.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.URL = exports.DNS = void 0;
    exports.default = v35;
    var _stringify = require_stringify();
    var _parse = _interopRequireDefault(require_parse());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    __name(_interopRequireDefault, "_interopRequireDefault");
    function stringToBytes(str) {
      str = unescape(encodeURIComponent(str));
      const bytes = [];
      for (let i = 0; i < str.length; ++i) {
        bytes.push(str.charCodeAt(i));
      }
      return bytes;
    }
    __name(stringToBytes, "stringToBytes");
    var DNS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
    exports.DNS = DNS;
    var URL2 = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";
    exports.URL = URL2;
    function v35(name, version2, hashfunc) {
      function generateUUID(value, namespace, buf, offset) {
        var _namespace;
        if (typeof value === "string") {
          value = stringToBytes(value);
        }
        if (typeof namespace === "string") {
          namespace = (0, _parse.default)(namespace);
        }
        if (((_namespace = namespace) === null || _namespace === void 0 ? void 0 : _namespace.length) !== 16) {
          throw TypeError("Namespace must be array-like (16 iterable integer values, 0-255)");
        }
        let bytes = new Uint8Array(16 + value.length);
        bytes.set(namespace);
        bytes.set(value, namespace.length);
        bytes = hashfunc(bytes);
        bytes[6] = bytes[6] & 15 | version2;
        bytes[8] = bytes[8] & 63 | 128;
        if (buf) {
          offset = offset || 0;
          for (let i = 0; i < 16; ++i) {
            buf[offset + i] = bytes[i];
          }
          return buf;
        }
        return (0, _stringify.unsafeStringify)(bytes);
      }
      __name(generateUUID, "generateUUID");
      try {
        generateUUID.name = name;
      } catch (err) {
      }
      generateUUID.DNS = DNS;
      generateUUID.URL = URL2;
      return generateUUID;
    }
    __name(v35, "v35");
  }
});

// ../node_modules/uuid/dist/commonjs-browser/md5.js
var require_md5 = __commonJS({
  "../node_modules/uuid/dist/commonjs-browser/md5.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    function md5(bytes) {
      if (typeof bytes === "string") {
        const msg = unescape(encodeURIComponent(bytes));
        bytes = new Uint8Array(msg.length);
        for (let i = 0; i < msg.length; ++i) {
          bytes[i] = msg.charCodeAt(i);
        }
      }
      return md5ToHexEncodedArray(wordsToMd5(bytesToWords(bytes), bytes.length * 8));
    }
    __name(md5, "md5");
    function md5ToHexEncodedArray(input) {
      const output = [];
      const length32 = input.length * 32;
      const hexTab = "0123456789abcdef";
      for (let i = 0; i < length32; i += 8) {
        const x = input[i >> 5] >>> i % 32 & 255;
        const hex = parseInt(hexTab.charAt(x >>> 4 & 15) + hexTab.charAt(x & 15), 16);
        output.push(hex);
      }
      return output;
    }
    __name(md5ToHexEncodedArray, "md5ToHexEncodedArray");
    function getOutputLength(inputLength8) {
      return (inputLength8 + 64 >>> 9 << 4) + 14 + 1;
    }
    __name(getOutputLength, "getOutputLength");
    function wordsToMd5(x, len) {
      x[len >> 5] |= 128 << len % 32;
      x[getOutputLength(len) - 1] = len;
      let a = 1732584193;
      let b = -271733879;
      let c = -1732584194;
      let d = 271733878;
      for (let i = 0; i < x.length; i += 16) {
        const olda = a;
        const oldb = b;
        const oldc = c;
        const oldd = d;
        a = md5ff(a, b, c, d, x[i], 7, -680876936);
        d = md5ff(d, a, b, c, x[i + 1], 12, -389564586);
        c = md5ff(c, d, a, b, x[i + 2], 17, 606105819);
        b = md5ff(b, c, d, a, x[i + 3], 22, -1044525330);
        a = md5ff(a, b, c, d, x[i + 4], 7, -176418897);
        d = md5ff(d, a, b, c, x[i + 5], 12, 1200080426);
        c = md5ff(c, d, a, b, x[i + 6], 17, -1473231341);
        b = md5ff(b, c, d, a, x[i + 7], 22, -45705983);
        a = md5ff(a, b, c, d, x[i + 8], 7, 1770035416);
        d = md5ff(d, a, b, c, x[i + 9], 12, -1958414417);
        c = md5ff(c, d, a, b, x[i + 10], 17, -42063);
        b = md5ff(b, c, d, a, x[i + 11], 22, -1990404162);
        a = md5ff(a, b, c, d, x[i + 12], 7, 1804603682);
        d = md5ff(d, a, b, c, x[i + 13], 12, -40341101);
        c = md5ff(c, d, a, b, x[i + 14], 17, -1502002290);
        b = md5ff(b, c, d, a, x[i + 15], 22, 1236535329);
        a = md5gg(a, b, c, d, x[i + 1], 5, -165796510);
        d = md5gg(d, a, b, c, x[i + 6], 9, -1069501632);
        c = md5gg(c, d, a, b, x[i + 11], 14, 643717713);
        b = md5gg(b, c, d, a, x[i], 20, -373897302);
        a = md5gg(a, b, c, d, x[i + 5], 5, -701558691);
        d = md5gg(d, a, b, c, x[i + 10], 9, 38016083);
        c = md5gg(c, d, a, b, x[i + 15], 14, -660478335);
        b = md5gg(b, c, d, a, x[i + 4], 20, -405537848);
        a = md5gg(a, b, c, d, x[i + 9], 5, 568446438);
        d = md5gg(d, a, b, c, x[i + 14], 9, -1019803690);
        c = md5gg(c, d, a, b, x[i + 3], 14, -187363961);
        b = md5gg(b, c, d, a, x[i + 8], 20, 1163531501);
        a = md5gg(a, b, c, d, x[i + 13], 5, -1444681467);
        d = md5gg(d, a, b, c, x[i + 2], 9, -51403784);
        c = md5gg(c, d, a, b, x[i + 7], 14, 1735328473);
        b = md5gg(b, c, d, a, x[i + 12], 20, -1926607734);
        a = md5hh(a, b, c, d, x[i + 5], 4, -378558);
        d = md5hh(d, a, b, c, x[i + 8], 11, -2022574463);
        c = md5hh(c, d, a, b, x[i + 11], 16, 1839030562);
        b = md5hh(b, c, d, a, x[i + 14], 23, -35309556);
        a = md5hh(a, b, c, d, x[i + 1], 4, -1530992060);
        d = md5hh(d, a, b, c, x[i + 4], 11, 1272893353);
        c = md5hh(c, d, a, b, x[i + 7], 16, -155497632);
        b = md5hh(b, c, d, a, x[i + 10], 23, -1094730640);
        a = md5hh(a, b, c, d, x[i + 13], 4, 681279174);
        d = md5hh(d, a, b, c, x[i], 11, -358537222);
        c = md5hh(c, d, a, b, x[i + 3], 16, -722521979);
        b = md5hh(b, c, d, a, x[i + 6], 23, 76029189);
        a = md5hh(a, b, c, d, x[i + 9], 4, -640364487);
        d = md5hh(d, a, b, c, x[i + 12], 11, -421815835);
        c = md5hh(c, d, a, b, x[i + 15], 16, 530742520);
        b = md5hh(b, c, d, a, x[i + 2], 23, -995338651);
        a = md5ii(a, b, c, d, x[i], 6, -198630844);
        d = md5ii(d, a, b, c, x[i + 7], 10, 1126891415);
        c = md5ii(c, d, a, b, x[i + 14], 15, -1416354905);
        b = md5ii(b, c, d, a, x[i + 5], 21, -57434055);
        a = md5ii(a, b, c, d, x[i + 12], 6, 1700485571);
        d = md5ii(d, a, b, c, x[i + 3], 10, -1894986606);
        c = md5ii(c, d, a, b, x[i + 10], 15, -1051523);
        b = md5ii(b, c, d, a, x[i + 1], 21, -2054922799);
        a = md5ii(a, b, c, d, x[i + 8], 6, 1873313359);
        d = md5ii(d, a, b, c, x[i + 15], 10, -30611744);
        c = md5ii(c, d, a, b, x[i + 6], 15, -1560198380);
        b = md5ii(b, c, d, a, x[i + 13], 21, 1309151649);
        a = md5ii(a, b, c, d, x[i + 4], 6, -145523070);
        d = md5ii(d, a, b, c, x[i + 11], 10, -1120210379);
        c = md5ii(c, d, a, b, x[i + 2], 15, 718787259);
        b = md5ii(b, c, d, a, x[i + 9], 21, -343485551);
        a = safeAdd(a, olda);
        b = safeAdd(b, oldb);
        c = safeAdd(c, oldc);
        d = safeAdd(d, oldd);
      }
      return [a, b, c, d];
    }
    __name(wordsToMd5, "wordsToMd5");
    function bytesToWords(input) {
      if (input.length === 0) {
        return [];
      }
      const length8 = input.length * 8;
      const output = new Uint32Array(getOutputLength(length8));
      for (let i = 0; i < length8; i += 8) {
        output[i >> 5] |= (input[i / 8] & 255) << i % 32;
      }
      return output;
    }
    __name(bytesToWords, "bytesToWords");
    function safeAdd(x, y) {
      const lsw = (x & 65535) + (y & 65535);
      const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
      return msw << 16 | lsw & 65535;
    }
    __name(safeAdd, "safeAdd");
    function bitRotateLeft(num, cnt) {
      return num << cnt | num >>> 32 - cnt;
    }
    __name(bitRotateLeft, "bitRotateLeft");
    function md5cmn(q, a, b, x, s, t) {
      return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
    }
    __name(md5cmn, "md5cmn");
    function md5ff(a, b, c, d, x, s, t) {
      return md5cmn(b & c | ~b & d, a, b, x, s, t);
    }
    __name(md5ff, "md5ff");
    function md5gg(a, b, c, d, x, s, t) {
      return md5cmn(b & d | c & ~d, a, b, x, s, t);
    }
    __name(md5gg, "md5gg");
    function md5hh(a, b, c, d, x, s, t) {
      return md5cmn(b ^ c ^ d, a, b, x, s, t);
    }
    __name(md5hh, "md5hh");
    function md5ii(a, b, c, d, x, s, t) {
      return md5cmn(c ^ (b | ~d), a, b, x, s, t);
    }
    __name(md5ii, "md5ii");
    var _default = md5;
    exports.default = _default;
  }
});

// ../node_modules/uuid/dist/commonjs-browser/v3.js
var require_v3 = __commonJS({
  "../node_modules/uuid/dist/commonjs-browser/v3.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _v = _interopRequireDefault(require_v35());
    var _md = _interopRequireDefault(require_md5());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    __name(_interopRequireDefault, "_interopRequireDefault");
    var v3 = (0, _v.default)("v3", 48, _md.default);
    var _default = v3;
    exports.default = _default;
  }
});

// ../node_modules/uuid/dist/commonjs-browser/native.js
var require_native = __commonJS({
  "../node_modules/uuid/dist/commonjs-browser/native.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var randomUUID = typeof crypto !== "undefined" && crypto.randomUUID && crypto.randomUUID.bind(crypto);
    var _default = {
      randomUUID
    };
    exports.default = _default;
  }
});

// ../node_modules/uuid/dist/commonjs-browser/v4.js
var require_v4 = __commonJS({
  "../node_modules/uuid/dist/commonjs-browser/v4.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _native = _interopRequireDefault(require_native());
    var _rng = _interopRequireDefault(require_rng());
    var _stringify = require_stringify();
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    __name(_interopRequireDefault, "_interopRequireDefault");
    function v4(options, buf, offset) {
      if (_native.default.randomUUID && !buf && !options) {
        return _native.default.randomUUID();
      }
      options = options || {};
      const rnds = options.random || (options.rng || _rng.default)();
      rnds[6] = rnds[6] & 15 | 64;
      rnds[8] = rnds[8] & 63 | 128;
      if (buf) {
        offset = offset || 0;
        for (let i = 0; i < 16; ++i) {
          buf[offset + i] = rnds[i];
        }
        return buf;
      }
      return (0, _stringify.unsafeStringify)(rnds);
    }
    __name(v4, "v4");
    var _default = v4;
    exports.default = _default;
  }
});

// ../node_modules/uuid/dist/commonjs-browser/sha1.js
var require_sha1 = __commonJS({
  "../node_modules/uuid/dist/commonjs-browser/sha1.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    function f(s, x, y, z) {
      switch (s) {
        case 0:
          return x & y ^ ~x & z;
        case 1:
          return x ^ y ^ z;
        case 2:
          return x & y ^ x & z ^ y & z;
        case 3:
          return x ^ y ^ z;
      }
    }
    __name(f, "f");
    function ROTL(x, n) {
      return x << n | x >>> 32 - n;
    }
    __name(ROTL, "ROTL");
    function sha1(bytes) {
      const K = [1518500249, 1859775393, 2400959708, 3395469782];
      const H = [1732584193, 4023233417, 2562383102, 271733878, 3285377520];
      if (typeof bytes === "string") {
        const msg = unescape(encodeURIComponent(bytes));
        bytes = [];
        for (let i = 0; i < msg.length; ++i) {
          bytes.push(msg.charCodeAt(i));
        }
      } else if (!Array.isArray(bytes)) {
        bytes = Array.prototype.slice.call(bytes);
      }
      bytes.push(128);
      const l = bytes.length / 4 + 2;
      const N = Math.ceil(l / 16);
      const M = new Array(N);
      for (let i = 0; i < N; ++i) {
        const arr = new Uint32Array(16);
        for (let j = 0; j < 16; ++j) {
          arr[j] = bytes[i * 64 + j * 4] << 24 | bytes[i * 64 + j * 4 + 1] << 16 | bytes[i * 64 + j * 4 + 2] << 8 | bytes[i * 64 + j * 4 + 3];
        }
        M[i] = arr;
      }
      M[N - 1][14] = (bytes.length - 1) * 8 / Math.pow(2, 32);
      M[N - 1][14] = Math.floor(M[N - 1][14]);
      M[N - 1][15] = (bytes.length - 1) * 8 & 4294967295;
      for (let i = 0; i < N; ++i) {
        const W = new Uint32Array(80);
        for (let t = 0; t < 16; ++t) {
          W[t] = M[i][t];
        }
        for (let t = 16; t < 80; ++t) {
          W[t] = ROTL(W[t - 3] ^ W[t - 8] ^ W[t - 14] ^ W[t - 16], 1);
        }
        let a = H[0];
        let b = H[1];
        let c = H[2];
        let d = H[3];
        let e = H[4];
        for (let t = 0; t < 80; ++t) {
          const s = Math.floor(t / 20);
          const T = ROTL(a, 5) + f(s, b, c, d) + e + K[s] + W[t] >>> 0;
          e = d;
          d = c;
          c = ROTL(b, 30) >>> 0;
          b = a;
          a = T;
        }
        H[0] = H[0] + a >>> 0;
        H[1] = H[1] + b >>> 0;
        H[2] = H[2] + c >>> 0;
        H[3] = H[3] + d >>> 0;
        H[4] = H[4] + e >>> 0;
      }
      return [H[0] >> 24 & 255, H[0] >> 16 & 255, H[0] >> 8 & 255, H[0] & 255, H[1] >> 24 & 255, H[1] >> 16 & 255, H[1] >> 8 & 255, H[1] & 255, H[2] >> 24 & 255, H[2] >> 16 & 255, H[2] >> 8 & 255, H[2] & 255, H[3] >> 24 & 255, H[3] >> 16 & 255, H[3] >> 8 & 255, H[3] & 255, H[4] >> 24 & 255, H[4] >> 16 & 255, H[4] >> 8 & 255, H[4] & 255];
    }
    __name(sha1, "sha1");
    var _default = sha1;
    exports.default = _default;
  }
});

// ../node_modules/uuid/dist/commonjs-browser/v5.js
var require_v5 = __commonJS({
  "../node_modules/uuid/dist/commonjs-browser/v5.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _v = _interopRequireDefault(require_v35());
    var _sha = _interopRequireDefault(require_sha1());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    __name(_interopRequireDefault, "_interopRequireDefault");
    var v5 = (0, _v.default)("v5", 80, _sha.default);
    var _default = v5;
    exports.default = _default;
  }
});

// ../node_modules/uuid/dist/commonjs-browser/nil.js
var require_nil = __commonJS({
  "../node_modules/uuid/dist/commonjs-browser/nil.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _default = "00000000-0000-0000-0000-000000000000";
    exports.default = _default;
  }
});

// ../node_modules/uuid/dist/commonjs-browser/version.js
var require_version = __commonJS({
  "../node_modules/uuid/dist/commonjs-browser/version.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _validate = _interopRequireDefault(require_validate());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    __name(_interopRequireDefault, "_interopRequireDefault");
    function version2(uuid) {
      if (!(0, _validate.default)(uuid)) {
        throw TypeError("Invalid UUID");
      }
      return parseInt(uuid.slice(14, 15), 16);
    }
    __name(version2, "version");
    var _default = version2;
    exports.default = _default;
  }
});

// ../node_modules/uuid/dist/commonjs-browser/index.js
var require_commonjs_browser = __commonJS({
  "../node_modules/uuid/dist/commonjs-browser/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    Object.defineProperty(exports, "NIL", {
      enumerable: true,
      get: /* @__PURE__ */ __name(function get() {
        return _nil.default;
      }, "get")
    });
    Object.defineProperty(exports, "parse", {
      enumerable: true,
      get: /* @__PURE__ */ __name(function get() {
        return _parse.default;
      }, "get")
    });
    Object.defineProperty(exports, "stringify", {
      enumerable: true,
      get: /* @__PURE__ */ __name(function get() {
        return _stringify.default;
      }, "get")
    });
    Object.defineProperty(exports, "v1", {
      enumerable: true,
      get: /* @__PURE__ */ __name(function get() {
        return _v.default;
      }, "get")
    });
    Object.defineProperty(exports, "v3", {
      enumerable: true,
      get: /* @__PURE__ */ __name(function get() {
        return _v2.default;
      }, "get")
    });
    Object.defineProperty(exports, "v4", {
      enumerable: true,
      get: /* @__PURE__ */ __name(function get() {
        return _v3.default;
      }, "get")
    });
    Object.defineProperty(exports, "v5", {
      enumerable: true,
      get: /* @__PURE__ */ __name(function get() {
        return _v4.default;
      }, "get")
    });
    Object.defineProperty(exports, "validate", {
      enumerable: true,
      get: /* @__PURE__ */ __name(function get() {
        return _validate.default;
      }, "get")
    });
    Object.defineProperty(exports, "version", {
      enumerable: true,
      get: /* @__PURE__ */ __name(function get() {
        return _version.default;
      }, "get")
    });
    var _v = _interopRequireDefault(require_v1());
    var _v2 = _interopRequireDefault(require_v3());
    var _v3 = _interopRequireDefault(require_v4());
    var _v4 = _interopRequireDefault(require_v5());
    var _nil = _interopRequireDefault(require_nil());
    var _version = _interopRequireDefault(require_version());
    var _validate = _interopRequireDefault(require_validate());
    var _stringify = _interopRequireDefault(require_stringify());
    var _parse = _interopRequireDefault(require_parse());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    __name(_interopRequireDefault, "_interopRequireDefault");
  }
});

// ../node_modules/mercadopago/dist/utils/restClient/index.js
var require_restClient = __commonJS({
  "../node_modules/mercadopago/dist/utils/restClient/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var __rest = exports && exports.__rest || function(s, e) {
      var t = {};
      for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
      if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
          if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
            t[p[i]] = s[p[i]];
        }
      return t;
    };
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.RestClient = void 0;
    var node_fetch_1 = __importDefault(require_node_fetch());
    var config_1 = require_config();
    var uuid_1 = require_commonjs_browser();
    var NO_CONTENT = 204;
    var RestClient = class _RestClient {
      static {
        __name(this, "RestClient");
      }
      static generateIdempotencyKey() {
        return (0, uuid_1.v4)();
      }
      static appendQueryParamsToUrl(url, queryParams) {
        if (!queryParams)
          return url;
        const searchParams = new URLSearchParams();
        for (const key in queryParams) {
          if (Object.prototype.hasOwnProperty.call(queryParams, key) && typeof queryParams[key] !== "undefined") {
            searchParams.append(key, queryParams[key].toString());
          }
        }
        return url.includes("?") ? `${url}&${searchParams.toString()}` : `${url}?${searchParams.toString()}`;
      }
      static async retryWithExponentialBackoff(fn, retries) {
        let attempt = 1;
        const execute = /* @__PURE__ */ __name(async () => {
          try {
            return await fn();
          } catch (error3) {
            if (attempt >= retries || error3.status < 500) {
              throw error3;
            }
            const delayMs = config_1.AppConfig.BASE_DELAY_MS * 2 ** attempt;
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            attempt++;
            return execute();
          }
        }, "execute");
        return execute();
      }
      static async fetch(endpoint, config2) {
        const _a = config2 || {}, { timeout = config_1.AppConfig.DEFAULT_TIMEOUT, idempotencyKey = _RestClient.generateIdempotencyKey(), queryParams, method = "GET", retries = config_1.AppConfig.DEFAULT_RETRIES, corporationId, integratorId, platformId, meliSessionId, expandResponseNodes, cardValidation, testToken } = _a, customConfig = __rest(_a, ["timeout", "idempotencyKey", "queryParams", "method", "retries", "corporationId", "integratorId", "platformId", "meliSessionId", "expandResponseNodes", "cardValidation", "testToken"]);
        const url = _RestClient.appendQueryParamsToUrl(`${config_1.AppConfig.BASE_URL}${endpoint}`, queryParams);
        customConfig.headers = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, customConfig.headers), { [config_1.AppConfig.Headers.CONTENT_TYPE]: "application/json", [config_1.AppConfig.Headers.PRODUCT_ID]: config_1.AppConfig.PRODUCT_ID, [config_1.AppConfig.Headers.TRACKING_ID]: config_1.AppConfig.getTrackingId(), [config_1.AppConfig.Headers.USER_AGENT]: config_1.AppConfig.getUserAgent() }), corporationId ? { [config_1.AppConfig.Headers.CORPORATION_ID]: corporationId } : {}), integratorId ? { [config_1.AppConfig.Headers.INTEGRATOR_ID]: integratorId } : {}), platformId ? { [config_1.AppConfig.Headers.PLATFORM_ID]: platformId } : {}), meliSessionId ? { [config_1.AppConfig.Headers.MELI_SESSION_ID]: meliSessionId } : {}), expandResponseNodes ? { [config_1.AppConfig.Headers.EXPAND_RESPONDE_NODES]: expandResponseNodes } : {}), cardValidation ? { [config_1.AppConfig.Headers.CARD_VALIDATION]: cardValidation } : {}), testToken ? { [config_1.AppConfig.Headers.TEST_TOKEN]: testToken.toString() } : {});
        if (method && method !== "GET") {
          customConfig.headers = Object.assign(Object.assign({}, customConfig.headers), { [config_1.AppConfig.Headers.IDEMPOTENCY_KEY]: idempotencyKey });
        }
        let response;
        const fetchFn = /* @__PURE__ */ __name(async () => {
          response = await (0, node_fetch_1.default)(url, Object.assign(Object.assign({}, customConfig), {
            method,
            timeout
          }));
          if (response.ok) {
            if (response.status === NO_CONTENT) {
              return {
                api_response: {
                  status: response.status,
                  headers: response.headers.raw()
                }
              };
            }
            const data = await response.json();
            const api_response = {
              status: response.status,
              headers: response.headers.raw()
            };
            data.api_response = api_response;
            return data;
          } else {
            throw await response.json();
          }
        }, "fetchFn");
        return await _RestClient.retryWithExponentialBackoff(fetchFn, retries);
      }
    };
    exports.RestClient = RestClient;
  }
});

// ../node_modules/mercadopago/dist/clients/cardToken/create/index.js
var require_create = __commonJS({
  "../node_modules/mercadopago/dist/clients/cardToken/create/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = create;
    var restClient_1 = require_restClient();
    function create({ body, config: config2 }) {
      return restClient_1.RestClient.fetch("/v1/card_tokens", Object.assign({ headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      }, body: JSON.stringify(body), method: "POST" }, config2.options));
    }
    __name(create, "create");
  }
});

// ../node_modules/mercadopago/dist/clients/cardToken/index.js
var require_cardToken = __commonJS({
  "../node_modules/mercadopago/dist/clients/cardToken/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CardToken = void 0;
    var create_1 = __importDefault(require_create());
    var CardToken = class {
      static {
        __name(this, "CardToken");
      }
      constructor(mercadoPagoConfig) {
        this.config = mercadoPagoConfig;
      }
      /**
      * Mercado Pago Create.
      *
      * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/examples/cardtoken/create.ts Usage Example  }.
      */
      create({ body, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, create_1.default)({ body, config: this.config });
      }
    };
    exports.CardToken = CardToken;
  }
});

// ../node_modules/mercadopago/dist/clients/customerCard/get/index.js
var require_get = __commonJS({
  "../node_modules/mercadopago/dist/clients/customerCard/get/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = get;
    var restClient_1 = require_restClient();
    function get({ customerId, cardId, config: config2 }) {
      return restClient_1.RestClient.fetch(`/v1/customers/${customerId}/cards/${cardId}`, Object.assign({ headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      } }, config2.options));
    }
    __name(get, "get");
  }
});

// ../node_modules/mercadopago/dist/clients/customerCard/create/index.js
var require_create2 = __commonJS({
  "../node_modules/mercadopago/dist/clients/customerCard/create/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = create;
    var restClient_1 = require_restClient();
    function create({ customerId, body, config: config2 }) {
      return restClient_1.RestClient.fetch(`/v1/customers/${customerId}/cards`, Object.assign({ headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      }, body: JSON.stringify(body), method: "POST" }, config2.options));
    }
    __name(create, "create");
  }
});

// ../node_modules/mercadopago/dist/clients/customerCard/remove/index.js
var require_remove = __commonJS({
  "../node_modules/mercadopago/dist/clients/customerCard/remove/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = remove;
    var restClient_1 = require_restClient();
    function remove({ customerId, cardId, config: config2 }) {
      return restClient_1.RestClient.fetch(`/v1/customers/${customerId}/cards/${cardId}`, Object.assign({ headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      }, method: "DELETE" }, config2.options));
    }
    __name(remove, "remove");
  }
});

// ../node_modules/mercadopago/dist/clients/customerCard/update/index.js
var require_update = __commonJS({
  "../node_modules/mercadopago/dist/clients/customerCard/update/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = update;
    var restClient_1 = require_restClient();
    function update({ customerId, cardId, body, config: config2 }) {
      return restClient_1.RestClient.fetch(`/v1/customers/${customerId}/cards/${cardId}`, Object.assign({ headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      }, body: JSON.stringify(body), method: "PUT" }, config2.options));
    }
    __name(update, "update");
  }
});

// ../node_modules/mercadopago/dist/clients/customerCard/list/index.js
var require_list = __commonJS({
  "../node_modules/mercadopago/dist/clients/customerCard/list/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = list;
    var restClient_1 = require_restClient();
    function list({ customerId, config: config2 }) {
      return restClient_1.RestClient.fetch(`/v1/customers/${customerId}/cards`, Object.assign({ headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      } }, config2.options));
    }
    __name(list, "list");
  }
});

// ../node_modules/mercadopago/dist/clients/customerCard/index.js
var require_customerCard = __commonJS({
  "../node_modules/mercadopago/dist/clients/customerCard/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.CustomerCard = void 0;
    var get_1 = __importDefault(require_get());
    var create_1 = __importDefault(require_create2());
    var remove_1 = __importDefault(require_remove());
    var update_1 = __importDefault(require_update());
    var list_1 = __importDefault(require_list());
    var CustomerCard = class {
      static {
        __name(this, "CustomerCard");
      }
      constructor(mercadoPagoConfig) {
        this.config = mercadoPagoConfig;
      }
      /**
       * Mercado Pago Customer card create.
       *
       * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/customer/create.ts Usage Example  }.
       */
      create({ customerId, body, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, create_1.default)({ customerId, body, config: this.config });
      }
      /**
       * Mercado Pago customer card get.
       *
       * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/customer/get.ts Usage Example  }.
      */
      get({ customerId, cardId, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, get_1.default)({ customerId, cardId, config: this.config });
      }
      /**
       * Mercado Pago customer card remove.
       *
       * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/customer/remove.ts Usage Example  }.
       */
      remove({ customerId, cardId, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, remove_1.default)({ customerId, cardId, config: this.config });
      }
      /**
       * Mercado Pago customer card update.
       *
       * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/customer/update.ts Usage Example  }.
       */
      update({ customerId, cardId, body, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, update_1.default)({ customerId, cardId, body, config: this.config });
      }
      /**
       * Mercado Pago customer card list.
       *
       * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/customer/list.ts Usage Example  }.
       */
      list({ customerId, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, list_1.default)({ customerId, config: this.config });
      }
    };
    exports.CustomerCard = CustomerCard;
  }
});

// ../node_modules/mercadopago/dist/clients/customer/get/index.js
var require_get2 = __commonJS({
  "../node_modules/mercadopago/dist/clients/customer/get/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = get;
    var restClient_1 = require_restClient();
    function get({ customerId, config: config2 }) {
      return restClient_1.RestClient.fetch(`/v1/customers/${customerId}`, Object.assign({ headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      } }, config2.options));
    }
    __name(get, "get");
  }
});

// ../node_modules/mercadopago/dist/clients/customer/create/index.js
var require_create3 = __commonJS({
  "../node_modules/mercadopago/dist/clients/customer/create/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = create;
    var restClient_1 = require_restClient();
    function create({ body, config: config2 }) {
      return restClient_1.RestClient.fetch("/v1/customers", Object.assign({ headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      }, body: JSON.stringify(body), method: "POST" }, config2.options));
    }
    __name(create, "create");
  }
});

// ../node_modules/mercadopago/dist/clients/customer/remove/index.js
var require_remove2 = __commonJS({
  "../node_modules/mercadopago/dist/clients/customer/remove/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = remove;
    var restClient_1 = require_restClient();
    function remove({ customerId, config: config2 }) {
      return restClient_1.RestClient.fetch(`/v1/customers/${customerId}`, Object.assign({ headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      }, method: "DELETE" }, config2.options));
    }
    __name(remove, "remove");
  }
});

// ../node_modules/mercadopago/dist/clients/customer/update/index.js
var require_update2 = __commonJS({
  "../node_modules/mercadopago/dist/clients/customer/update/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = update;
    var restClient_1 = require_restClient();
    function update({ customerId, body, config: config2 }) {
      return restClient_1.RestClient.fetch(`/v1/customers/${customerId}`, Object.assign({ headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      }, body: JSON.stringify(body), method: "PUT" }, config2.options));
    }
    __name(update, "update");
  }
});

// ../node_modules/mercadopago/dist/clients/customer/search/index.js
var require_search = __commonJS({
  "../node_modules/mercadopago/dist/clients/customer/search/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = search;
    var restClient_1 = require_restClient();
    function search({ options, config: config2 }) {
      return restClient_1.RestClient.fetch("/v1/customers/search", Object.assign({ headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      }, queryParams: Object.assign({}, options) }, config2.options));
    }
    __name(search, "search");
  }
});

// ../node_modules/mercadopago/dist/clients/customer/index.js
var require_customer = __commonJS({
  "../node_modules/mercadopago/dist/clients/customer/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Customer = void 0;
    var get_1 = __importDefault(require_get2());
    var create_1 = __importDefault(require_create3());
    var remove_1 = __importDefault(require_remove2());
    var update_1 = __importDefault(require_update2());
    var search_1 = __importDefault(require_search());
    var customerCard_1 = require_customerCard();
    var Customer = class {
      static {
        __name(this, "Customer");
      }
      constructor(mercadoPagoConfig) {
        this.config = mercadoPagoConfig;
        this.customerCard = new customerCard_1.CustomerCard(mercadoPagoConfig);
      }
      /**
       * Mercado Pago Customer create.
       *
       * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/customer/create.ts Usage Example  }.
       */
      create({ body, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, create_1.default)({ body, config: this.config });
      }
      /**
       * Mercado Pago customer get.
       *
       * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/customer/get.ts Usage Example  }.
       */
      get({ customerId, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, get_1.default)({ customerId, config: this.config });
      }
      /**
       * Mercado Pago customer remove.
       *
       * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/customer/remove.ts Usage Example  }.
       */
      remove({ customerId, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, remove_1.default)({ customerId, config: this.config });
      }
      /**
       * Mercado Pago customer update.
       *
       * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/customer/update.ts Usage Example  }.
       */
      update({ customerId, body, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, update_1.default)({ customerId, body, config: this.config });
      }
      /**
       * Mercado Pago customer search.
       *
       * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/customer/search.ts Usage Example  }.
       */
      search(CustomerSearchOptions = {}) {
        const { options, requestOptions } = CustomerSearchOptions;
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, search_1.default)({ options, config: this.config });
      }
      /**
       * Mercado Pago create card for customer.
       *
       * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/customer/createCard.ts Usage Example  }.
       */
      createCard({ customerId, body, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return this.customerCard.create({ customerId, body });
      }
      /**
       * Mercado Pago  get customer's card.
       *
       * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/customer/getCard.ts Usage Example  }.
       */
      getCard({ customerId, cardId, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return this.customerCard.get({ customerId, cardId });
      }
      /**
       * Mercado Pago remove customer's card .
       *
       * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/customer/removeCard.ts Usage Example  }.
       */
      removeCard({ customerId, cardId, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return this.customerCard.remove({ customerId, cardId });
      }
      /**
       * Mercado Pago  list customer's cards .
       *
       * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/customer/listCards.ts Usage Example  }.
       */
      listCards({ customerId, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return this.customerCard.list({ customerId });
      }
    };
    exports.Customer = Customer;
  }
});

// ../node_modules/mercadopago/dist/clients/invoice/get/index.js
var require_get3 = __commonJS({
  "../node_modules/mercadopago/dist/clients/invoice/get/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = get;
    var restClient_1 = require_restClient();
    function get({ id, config: config2 }) {
      return restClient_1.RestClient.fetch(`/authorized_payments/${id}`, Object.assign({ method: "GET", headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      } }, config2.options));
    }
    __name(get, "get");
  }
});

// ../node_modules/mercadopago/dist/clients/invoice/search/index.js
var require_search2 = __commonJS({
  "../node_modules/mercadopago/dist/clients/invoice/search/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = search;
    var restClient_1 = require_restClient();
    function search({ options, config: config2 }) {
      return restClient_1.RestClient.fetch("/authorized_payments/search", Object.assign({ headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      }, queryParams: Object.assign({}, options) }, config2.options));
    }
    __name(search, "search");
  }
});

// ../node_modules/mercadopago/dist/clients/invoice/index.js
var require_invoice = __commonJS({
  "../node_modules/mercadopago/dist/clients/invoice/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Invoice = void 0;
    var get_1 = __importDefault(require_get3());
    var search_1 = __importDefault(require_search2());
    var Invoice = class {
      static {
        __name(this, "Invoice");
      }
      constructor(mercadoPagoConfig) {
        this.config = mercadoPagoConfig;
      }
      /**
      * Mercado Pago Get.
      *
      * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/invoice/get.ts Usage Example  }.
      */
      get({ id, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, get_1.default)({ id, config: this.config });
      }
      /**
      * Mercado Pago Search.
      *
      * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/invoice/search.ts Usage Example  }.
      */
      search(ivoicesSearchOptions = {}) {
        const { options, requestOptions } = ivoicesSearchOptions;
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, search_1.default)({ options, config: this.config });
      }
    };
    exports.Invoice = Invoice;
  }
});

// ../node_modules/mercadopago/dist/clients/identificationType/list/index.js
var require_list2 = __commonJS({
  "../node_modules/mercadopago/dist/clients/identificationType/list/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = list;
    var restClient_1 = require_restClient();
    function list({ config: config2 }) {
      return restClient_1.RestClient.fetch("/v1/identification_types", Object.assign({ headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      } }, config2.options));
    }
    __name(list, "list");
  }
});

// ../node_modules/mercadopago/dist/clients/identificationType/index.js
var require_identificationType = __commonJS({
  "../node_modules/mercadopago/dist/clients/identificationType/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.IdentificationType = void 0;
    var list_1 = __importDefault(require_list2());
    var IdentificationType = class {
      static {
        __name(this, "IdentificationType");
      }
      constructor(mercadoPagoConfig) {
        this.config = mercadoPagoConfig;
      }
      /**
      * Mercado Pago Identification Types get.
      *
      * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/examples/identificationtype/list.ts Usage Example  }.
      */
      list(identificationTypeListOptions = {}) {
        const { requestOptions } = identificationTypeListOptions;
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, list_1.default)({ config: this.config });
      }
    };
    exports.IdentificationType = IdentificationType;
  }
});

// ../node_modules/mercadopago/dist/clients/paymentRefund/get/index.js
var require_get4 = __commonJS({
  "../node_modules/mercadopago/dist/clients/paymentRefund/get/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = get;
    var restClient_1 = require_restClient();
    function get({ payment_id, refund_id, config: config2 }) {
      return restClient_1.RestClient.fetch(`/v1/payments/${payment_id}/refunds/${refund_id}`, Object.assign({ headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      } }, config2.options));
    }
    __name(get, "get");
  }
});

// ../node_modules/mercadopago/dist/clients/paymentRefund/create/index.js
var require_create4 = __commonJS({
  "../node_modules/mercadopago/dist/clients/paymentRefund/create/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = create;
    var restClient_1 = require_restClient();
    function create({ payment_id, body, config: config2 }) {
      return restClient_1.RestClient.fetch(`/v1/payments/${payment_id}/refunds`, Object.assign({ method: "POST", headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      }, body: JSON.stringify(body) }, config2.options));
    }
    __name(create, "create");
  }
});

// ../node_modules/mercadopago/dist/clients/paymentRefund/list/index.js
var require_list3 = __commonJS({
  "../node_modules/mercadopago/dist/clients/paymentRefund/list/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = list;
    var restClient_1 = require_restClient();
    function list({ payment_id, config: config2 }) {
      return restClient_1.RestClient.fetch(`/v1/payments/${payment_id}/refunds/`, Object.assign({ headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      } }, config2.options));
    }
    __name(list, "list");
  }
});

// ../node_modules/mercadopago/dist/clients/paymentRefund/total/index.js
var require_total = __commonJS({
  "../node_modules/mercadopago/dist/clients/paymentRefund/total/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = total;
    var restClient_1 = require_restClient();
    function total({ payment_id, config: config2 }) {
      return restClient_1.RestClient.fetch(`/v1/payments/${payment_id}/refunds`, Object.assign({ method: "POST", headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      }, body: JSON.stringify({}) }, config2.options));
    }
    __name(total, "total");
  }
});

// ../node_modules/mercadopago/dist/clients/paymentRefund/index.js
var require_paymentRefund = __commonJS({
  "../node_modules/mercadopago/dist/clients/paymentRefund/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PaymentRefund = void 0;
    var get_1 = __importDefault(require_get4());
    var create_1 = __importDefault(require_create4());
    var list_1 = __importDefault(require_list3());
    var total_1 = __importDefault(require_total());
    var PaymentRefund2 = class {
      static {
        __name(this, "PaymentRefund");
      }
      constructor(mercadoPagoConfig) {
        this.config = mercadoPagoConfig;
      }
      /**
      * Mercado Pago Get Refund.
      *
      * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/paymentRefund/get.ts Usage Example  }.
      */
      get({ payment_id, refund_id, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, get_1.default)({ payment_id, refund_id, config: this.config });
      }
      /**
      * Mercado Pago Create Refund.
      *
      * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/paymentRefund/create.ts Usage Example  }.
      */
      create({ payment_id, body, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, create_1.default)({ payment_id, body, config: this.config });
      }
      /**
      * Mercado Pago Create Refund.
      *
      * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/paymentRefund/create.ts Usage Example  }.
      */
      total({ payment_id, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, total_1.default)({ payment_id, config: this.config });
      }
      /**
      * Mercado Pago Get Refund List.
      *
      * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/paymentRefund/list.ts Usage Example  }.
      */
      list({ payment_id, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, list_1.default)({ payment_id, config: this.config });
      }
    };
    exports.PaymentRefund = PaymentRefund2;
  }
});

// ../node_modules/mercadopago/dist/clients/paymentMethod/get/index.js
var require_get5 = __commonJS({
  "../node_modules/mercadopago/dist/clients/paymentMethod/get/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = get;
    var restClient_1 = require_restClient();
    function get({ config: config2 }) {
      return restClient_1.RestClient.fetch("/v1/payment_methods", Object.assign({ headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      } }, config2.options));
    }
    __name(get, "get");
  }
});

// ../node_modules/mercadopago/dist/clients/paymentMethod/index.js
var require_paymentMethod = __commonJS({
  "../node_modules/mercadopago/dist/clients/paymentMethod/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PaymentMethod = void 0;
    var get_1 = __importDefault(require_get5());
    var PaymentMethod = class {
      static {
        __name(this, "PaymentMethod");
      }
      constructor(mercadoPagoConfig) {
        this.config = mercadoPagoConfig;
      }
      /**
      * Mercado Pago Search.
      *
      * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/examples/paymentmethod/get.ts Usage Example  }.
      */
      get(paymentMethodsGetOptions = {}) {
        const { requestOptions } = paymentMethodsGetOptions;
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, get_1.default)({ config: this.config });
      }
    };
    exports.PaymentMethod = PaymentMethod;
  }
});

// ../node_modules/mercadopago/dist/clients/payment/capture/index.js
var require_capture = __commonJS({
  "../node_modules/mercadopago/dist/clients/payment/capture/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = capture;
    var restClient_1 = require_restClient();
    function capture({ id, transaction_amount, config: config2 }) {
      const captureBody = {
        capture: true,
        transaction_amount
      };
      return restClient_1.RestClient.fetch(`/v1/payments/${id}`, Object.assign({ method: "PUT", headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      }, body: JSON.stringify(captureBody) }, config2.options));
    }
    __name(capture, "capture");
  }
});

// ../node_modules/mercadopago/dist/clients/payment/search/index.js
var require_search3 = __commonJS({
  "../node_modules/mercadopago/dist/clients/payment/search/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = search;
    var restClient_1 = require_restClient();
    function search({ options, config: config2 }) {
      return restClient_1.RestClient.fetch("/v1/payments/search", Object.assign({ headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      }, queryParams: Object.assign({}, options) }, config2.options));
    }
    __name(search, "search");
  }
});

// ../node_modules/mercadopago/dist/clients/payment/cancel/index.js
var require_cancel = __commonJS({
  "../node_modules/mercadopago/dist/clients/payment/cancel/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = cancel;
    var restClient_1 = require_restClient();
    function cancel({ id, config: config2 }) {
      const cancelBody = {
        status: "cancelled"
      };
      return restClient_1.RestClient.fetch(`/v1/payments/${id}`, Object.assign({ method: "PUT", headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      }, body: JSON.stringify(cancelBody) }, config2.options));
    }
    __name(cancel, "cancel");
  }
});

// ../node_modules/mercadopago/dist/clients/payment/create/index.js
var require_create5 = __commonJS({
  "../node_modules/mercadopago/dist/clients/payment/create/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = create;
    var restClient_1 = require_restClient();
    function create({ body, config: config2 }) {
      return restClient_1.RestClient.fetch("/v1/payments", Object.assign({ method: "POST", headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      }, body: JSON.stringify(body) }, config2.options));
    }
    __name(create, "create");
  }
});

// ../node_modules/mercadopago/dist/clients/payment/get/index.js
var require_get6 = __commonJS({
  "../node_modules/mercadopago/dist/clients/payment/get/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = get;
    var restClient_1 = require_restClient();
    function get({ id, config: config2 }) {
      return restClient_1.RestClient.fetch(`/v1/payments/${id}`, Object.assign({ headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      } }, config2.options));
    }
    __name(get, "get");
  }
});

// ../node_modules/mercadopago/dist/clients/payment/index.js
var require_payment = __commonJS({
  "../node_modules/mercadopago/dist/clients/payment/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Payment = void 0;
    var capture_1 = __importDefault(require_capture());
    var search_1 = __importDefault(require_search3());
    var cancel_1 = __importDefault(require_cancel());
    var create_1 = __importDefault(require_create5());
    var get_1 = __importDefault(require_get6());
    var Payment2 = class {
      static {
        __name(this, "Payment");
      }
      constructor(mercadoPagoConfig) {
        this.config = mercadoPagoConfig;
      }
      /**
      * Mercado Pago Search.
      *
      * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/payment/search.ts Usage Example  }.
      */
      search(paymentSearchOptions = {}) {
        const { options, requestOptions } = paymentSearchOptions;
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, search_1.default)({ options, config: this.config });
      }
      /**
      * Mercado Pago Cancel.
      *
      * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/payment/cancel.ts Usage Example  }.
      */
      cancel({ id, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, cancel_1.default)({ id, config: this.config });
      }
      /**
      * Mercado Pago Capture.
      *
      * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/payment/capture.ts Usage Example  }.
      */
      capture({ id, transaction_amount, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, capture_1.default)({ id, transaction_amount, config: this.config });
      }
      /**
      * Mercado Pago Create.
      *
      * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/payment/create.ts Usage Example  }.
      */
      create({ body, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, create_1.default)({ body, config: this.config });
      }
      /**
      * Mercado Pago Get.
      *
      * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/payment/get.ts Usage Example  }.
      */
      get({ id, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, get_1.default)({ id, config: this.config });
      }
    };
    exports.Payment = Payment2;
  }
});

// ../node_modules/mercadopago/dist/clients/preApproval/create/index.js
var require_create6 = __commonJS({
  "../node_modules/mercadopago/dist/clients/preApproval/create/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = create;
    var restClient_1 = require_restClient();
    function create({ body, config: config2 }) {
      return restClient_1.RestClient.fetch("/preapproval/", Object.assign({ method: "POST", headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      }, body: JSON.stringify(body) }, config2.options));
    }
    __name(create, "create");
  }
});

// ../node_modules/mercadopago/dist/clients/preApproval/get/index.js
var require_get7 = __commonJS({
  "../node_modules/mercadopago/dist/clients/preApproval/get/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = get;
    var restClient_1 = require_restClient();
    function get({ id, config: config2 }) {
      return restClient_1.RestClient.fetch(`/preapproval/${id}`, Object.assign({ method: "GET", headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      } }, config2.options));
    }
    __name(get, "get");
  }
});

// ../node_modules/mercadopago/dist/clients/preApproval/search/index.js
var require_search4 = __commonJS({
  "../node_modules/mercadopago/dist/clients/preApproval/search/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = search;
    var restClient_1 = require_restClient();
    function search({ options, config: config2 }) {
      return restClient_1.RestClient.fetch("/preapproval/search", Object.assign({ headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      }, queryParams: Object.assign({}, options) }, config2.options));
    }
    __name(search, "search");
  }
});

// ../node_modules/mercadopago/dist/clients/preApproval/update/index.js
var require_update3 = __commonJS({
  "../node_modules/mercadopago/dist/clients/preApproval/update/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = update;
    var restClient_1 = require_restClient();
    function update({ id, body, config: config2 }) {
      return restClient_1.RestClient.fetch(`/preapproval/${id}`, Object.assign({ method: "PUT", headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      }, body: JSON.stringify(body) }, config2.options));
    }
    __name(update, "update");
  }
});

// ../node_modules/mercadopago/dist/clients/preApproval/index.js
var require_preApproval = __commonJS({
  "../node_modules/mercadopago/dist/clients/preApproval/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PreApproval = void 0;
    var create_1 = __importDefault(require_create6());
    var get_1 = __importDefault(require_get7());
    var search_1 = __importDefault(require_search4());
    var update_1 = __importDefault(require_update3());
    var PreApproval = class {
      static {
        __name(this, "PreApproval");
      }
      constructor(mercadoPagoConfig) {
        this.config = mercadoPagoConfig;
      }
      /**
      * Mercado Pago Create.
      *
      * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/preApproval/create.ts Usage Example  }.
      */
      create({ body, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, create_1.default)({ body, config: this.config });
      }
      /**
      * Mercado Pago Get.
      *
      * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/preApproval/get.ts Usage Example  }.
      */
      get({ id, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, get_1.default)({ id, config: this.config });
      }
      /**
      * Mercado Pago Search.
      *
      * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/preApproval/search.ts Usage Example  }.
      */
      search(preApprovalSearchData = {}) {
        const { options, requestOptions } = preApprovalSearchData;
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, search_1.default)({ options, config: this.config });
      }
      /**
      * Mercado Pago Update.
      *
      * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/preApproval/update.ts Usage Example  }.
      */
      update({ id, body, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, update_1.default)({ id, body, config: this.config });
      }
    };
    exports.PreApproval = PreApproval;
  }
});

// ../node_modules/mercadopago/dist/clients/preApprovalPlan/get/index.js
var require_get8 = __commonJS({
  "../node_modules/mercadopago/dist/clients/preApprovalPlan/get/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = get;
    var restClient_1 = require_restClient();
    function get({ id, config: config2 }) {
      return restClient_1.RestClient.fetch(`/preapproval_plan/${id}`, Object.assign({ headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      } }, config2.options));
    }
    __name(get, "get");
  }
});

// ../node_modules/mercadopago/dist/clients/preApprovalPlan/create/index.js
var require_create7 = __commonJS({
  "../node_modules/mercadopago/dist/clients/preApprovalPlan/create/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = create;
    var restClient_1 = require_restClient();
    function create({ body, config: config2 }) {
      return restClient_1.RestClient.fetch("/preapproval_plan/", Object.assign({ method: "POST", headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      }, body: JSON.stringify(body) }, config2.options));
    }
    __name(create, "create");
  }
});

// ../node_modules/mercadopago/dist/clients/preApprovalPlan/update/index.js
var require_update4 = __commonJS({
  "../node_modules/mercadopago/dist/clients/preApprovalPlan/update/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = update;
    var restClient_1 = require_restClient();
    function update({ id, updatePreApprovalPlanRequest, config: config2 }) {
      return restClient_1.RestClient.fetch(`/preapproval_plan/${id}`, Object.assign({ method: "PUT", headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      }, body: JSON.stringify(updatePreApprovalPlanRequest) }, config2.options));
    }
    __name(update, "update");
  }
});

// ../node_modules/mercadopago/dist/clients/preApprovalPlan/search/index.js
var require_search5 = __commonJS({
  "../node_modules/mercadopago/dist/clients/preApprovalPlan/search/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = search;
    var restClient_1 = require_restClient();
    function search({ options, config: config2 }) {
      return restClient_1.RestClient.fetch("/preapproval_plan/search", Object.assign({ headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      }, queryParams: Object.assign({}, options) }, config2.options));
    }
    __name(search, "search");
  }
});

// ../node_modules/mercadopago/dist/clients/preApprovalPlan/index.js
var require_preApprovalPlan = __commonJS({
  "../node_modules/mercadopago/dist/clients/preApprovalPlan/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.PreApprovalPlan = void 0;
    var get_1 = __importDefault(require_get8());
    var create_1 = __importDefault(require_create7());
    var update_1 = __importDefault(require_update4());
    var search_1 = __importDefault(require_search5());
    var PreApprovalPlan = class {
      static {
        __name(this, "PreApprovalPlan");
      }
      constructor(mercadoPagoConfig) {
        this.config = mercadoPagoConfig;
      }
      /**
      * Mercado Pago Create.
      *
      * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/preapprovalplan/create.ts Usage Example  }.
      */
      create({ body, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, create_1.default)({ body, config: this.config });
      }
      /**
      * Mercado Pago Get.
      *
      * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/preapprovalplan/get.ts Usage Example  }.
      */
      get({ preApprovalPlanId, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, get_1.default)({ id: preApprovalPlanId, config: this.config });
      }
      /**
      * Mercado Pago Update.
      *
      * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/preapprovalplan/update.ts Usage Example  }.
      */
      update({ id, updatePreApprovalPlanRequest, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, update_1.default)({ id, updatePreApprovalPlanRequest, config: this.config });
      }
      /**
      * Mercado Pago Search.
      *
      * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/preapprovalplan/search.ts Usage Example  }.
      */
      search(preApprovalPlanSearchData = {}) {
        const { options, requestOptions } = preApprovalPlanSearchData;
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, search_1.default)({ options, config: this.config });
      }
    };
    exports.PreApprovalPlan = PreApprovalPlan;
  }
});

// ../node_modules/mercadopago/dist/clients/point/cancelPaymentIntent/index.js
var require_cancelPaymentIntent = __commonJS({
  "../node_modules/mercadopago/dist/clients/point/cancelPaymentIntent/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = cancelPaymentIntent;
    var restClient_1 = require_restClient();
    function cancelPaymentIntent({ device_id, payment_intent_id, config: config2 }) {
      return restClient_1.RestClient.fetch(`/point/integration-api/devices/${device_id}/payment-intents/${payment_intent_id}`, Object.assign({ method: "DELETE", headers: {
        Authorization: `Bearer ${config2.accessToken}`
      } }, config2.options));
    }
    __name(cancelPaymentIntent, "cancelPaymentIntent");
  }
});

// ../node_modules/mercadopago/dist/clients/point/changeDeviceOperatingMode/index.js
var require_changeDeviceOperatingMode = __commonJS({
  "../node_modules/mercadopago/dist/clients/point/changeDeviceOperatingMode/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = changeDeviceOperatingMode;
    var restClient_1 = require_restClient();
    function changeDeviceOperatingMode({ device_id, request, config: config2 }) {
      return restClient_1.RestClient.fetch(`/point/integration-api/devices/${device_id}`, Object.assign({ method: "PATCH", headers: {
        Authorization: `Bearer ${config2.accessToken}`
      }, body: JSON.stringify(request) }, config2.options));
    }
    __name(changeDeviceOperatingMode, "changeDeviceOperatingMode");
  }
});

// ../node_modules/mercadopago/dist/clients/point/createPaymentIntent/index.js
var require_createPaymentIntent = __commonJS({
  "../node_modules/mercadopago/dist/clients/point/createPaymentIntent/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = createPaymentIntent;
    var restClient_1 = require_restClient();
    function createPaymentIntent({ device_id, request, config: config2 }) {
      return restClient_1.RestClient.fetch(`/point/integration-api/devices/${device_id}/payment-intents`, Object.assign({ method: "POST", headers: {
        Authorization: `Bearer ${config2.accessToken}`
      }, body: JSON.stringify(request) }, config2.options));
    }
    __name(createPaymentIntent, "createPaymentIntent");
  }
});

// ../node_modules/mercadopago/dist/clients/point/getDevices/index.js
var require_getDevices = __commonJS({
  "../node_modules/mercadopago/dist/clients/point/getDevices/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = getDevices;
    var restClient_1 = require_restClient();
    function getDevices({ options, config: config2 }) {
      return restClient_1.RestClient.fetch("/point/integration-api/devices", Object.assign({ method: "GET", headers: {
        Authorization: `Bearer ${config2.accessToken}`
      }, queryParams: Object.assign({}, options) }, config2.options));
    }
    __name(getDevices, "getDevices");
  }
});

// ../node_modules/mercadopago/dist/clients/point/getPaymentIntentList/index.js
var require_getPaymentIntentList = __commonJS({
  "../node_modules/mercadopago/dist/clients/point/getPaymentIntentList/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = getPaymentIntentList;
    var restClient_1 = require_restClient();
    function getPaymentIntentList({ options, config: config2 }) {
      return restClient_1.RestClient.fetch("/point/integration-api/payment-intents/events", Object.assign({ method: "GET", headers: {
        Authorization: `Bearer ${config2.accessToken}`
      }, queryParams: Object.assign({}, options) }, config2.options));
    }
    __name(getPaymentIntentList, "getPaymentIntentList");
  }
});

// ../node_modules/mercadopago/dist/clients/point/getPaymentIntentStatus/index.js
var require_getPaymentIntentStatus = __commonJS({
  "../node_modules/mercadopago/dist/clients/point/getPaymentIntentStatus/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = getPaymentIntentStatus;
    var restClient_1 = require_restClient();
    function getPaymentIntentStatus({ payment_intent_id, config: config2 }) {
      return restClient_1.RestClient.fetch(`/point/integration-api/payment-intents/${payment_intent_id}/events`, Object.assign({ method: "GET", headers: {
        Authorization: `Bearer ${config2.accessToken}`
      } }, config2.options));
    }
    __name(getPaymentIntentStatus, "getPaymentIntentStatus");
  }
});

// ../node_modules/mercadopago/dist/clients/point/searchPaymentIntent/index.js
var require_searchPaymentIntent = __commonJS({
  "../node_modules/mercadopago/dist/clients/point/searchPaymentIntent/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = searchPaymentIntent;
    var restClient_1 = require_restClient();
    function searchPaymentIntent({ payment_intent_id, config: config2 }) {
      return restClient_1.RestClient.fetch(`/point/integration-api/payment-intents/${payment_intent_id}`, Object.assign({ method: "GET", headers: {
        Authorization: `Bearer ${config2.accessToken}`
      } }, config2.options));
    }
    __name(searchPaymentIntent, "searchPaymentIntent");
  }
});

// ../node_modules/mercadopago/dist/clients/point/index.js
var require_point = __commonJS({
  "../node_modules/mercadopago/dist/clients/point/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Point = void 0;
    var cancelPaymentIntent_1 = __importDefault(require_cancelPaymentIntent());
    var changeDeviceOperatingMode_1 = __importDefault(require_changeDeviceOperatingMode());
    var createPaymentIntent_1 = __importDefault(require_createPaymentIntent());
    var getDevices_1 = __importDefault(require_getDevices());
    var getPaymentIntentList_1 = __importDefault(require_getPaymentIntentList());
    var getPaymentIntentStatus_1 = __importDefault(require_getPaymentIntentStatus());
    var searchPaymentIntent_1 = __importDefault(require_searchPaymentIntent());
    var Point = class {
      static {
        __name(this, "Point");
      }
      constructor(mercadoPagoConfig) {
        this.config = mercadoPagoConfig;
      }
      /**
      * Mercado Pago Create Payment Intent.
      *
      * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/point/createPaymentIntent.ts Usage Example }.
      */
      createPaymentIntent({ device_id, request, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, createPaymentIntent_1.default)({ device_id, request, config: this.config });
      }
      /**
      * Mercado Pago Search Payment Intent.
      *
      * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/point/searchPaymentIntent.ts Usage Example }.
      */
      searchPaymentIntent({ payment_intent_id, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, searchPaymentIntent_1.default)({ payment_intent_id, config: this.config });
      }
      /**
      * Mercado Pago Cancel Payment Intent.
      *
      * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/point/cancelPaymentIntent.ts Usage Example }.
      */
      cancelPaymentIntent({ device_id, payment_intent_id, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, cancelPaymentIntent_1.default)({ device_id, payment_intent_id, config: this.config });
      }
      /**
      * Mercado Pago Get Payment Intent List.
      *
      * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/point/getPaymentIntentList.ts Usage Example }.
      */
      getPaymentIntentList(pointGetPaymentIntentListOptions = {}) {
        const { body, requestOptions } = pointGetPaymentIntentListOptions;
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, getPaymentIntentList_1.default)({ options: body === null || body === void 0 ? void 0 : body.options, config: this.config });
      }
      /**
      * Mercado Pago Get Payment Intent Status.
      *
      * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/point/getPaymentIntentStatus.ts Usage Example }.
      */
      getPaymentIntentStatus({ payment_intent_id, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, getPaymentIntentStatus_1.default)({ payment_intent_id, config: this.config });
      }
      /**
      * Mercado Pago Get Devices.
      *
      * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/point/getDevices.ts Usage Example }.
      */
      getDevices({ request, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, getDevices_1.default)({ options: request === null || request === void 0 ? void 0 : request.options, config: this.config });
      }
      /**
      * Mercado Pago Change Device Operating Mode.
      *
      * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/point/changeDeviceOperatingMode.ts Usage Example }.
      */
      changeDeviceOperatingMode({ device_id, request, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, changeDeviceOperatingMode_1.default)({ device_id, request, config: this.config });
      }
    };
    exports.Point = Point;
  }
});

// ../node_modules/mercadopago/dist/clients/preference/get/index.js
var require_get9 = __commonJS({
  "../node_modules/mercadopago/dist/clients/preference/get/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = get;
    var restClient_1 = require_restClient();
    function get({ id, config: config2 }) {
      return restClient_1.RestClient.fetch(`/checkout/preferences/${id}`, Object.assign({ headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      } }, config2.options));
    }
    __name(get, "get");
  }
});

// ../node_modules/mercadopago/dist/clients/preference/create/index.js
var require_create8 = __commonJS({
  "../node_modules/mercadopago/dist/clients/preference/create/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = create;
    var restClient_1 = require_restClient();
    function create({ body, config: config2 }) {
      return restClient_1.RestClient.fetch("/checkout/preferences/", Object.assign({ method: "POST", headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      }, body: JSON.stringify(body) }, config2.options));
    }
    __name(create, "create");
  }
});

// ../node_modules/mercadopago/dist/clients/preference/update/index.js
var require_update5 = __commonJS({
  "../node_modules/mercadopago/dist/clients/preference/update/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = update;
    var restClient_1 = require_restClient();
    function update({ id, updatePreferenceRequest, config: config2 }) {
      return restClient_1.RestClient.fetch(`/checkout/preferences/${id}`, Object.assign({ method: "PUT", headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      }, body: JSON.stringify(updatePreferenceRequest) }, config2.options));
    }
    __name(update, "update");
  }
});

// ../node_modules/mercadopago/dist/clients/preference/search/index.js
var require_search6 = __commonJS({
  "../node_modules/mercadopago/dist/clients/preference/search/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = search;
    var restClient_1 = require_restClient();
    function search({ options, config: config2 }) {
      return restClient_1.RestClient.fetch("/checkout/preferences/search", Object.assign({ headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      }, queryParams: Object.assign({}, options) }, config2.options));
    }
    __name(search, "search");
  }
});

// ../node_modules/mercadopago/dist/clients/preference/index.js
var require_preference = __commonJS({
  "../node_modules/mercadopago/dist/clients/preference/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Preference = void 0;
    var get_1 = __importDefault(require_get9());
    var create_1 = __importDefault(require_create8());
    var update_1 = __importDefault(require_update5());
    var search_1 = __importDefault(require_search6());
    var Preference = class {
      static {
        __name(this, "Preference");
      }
      constructor(mercadoPagoConfig) {
        this.config = mercadoPagoConfig;
      }
      /**
      * Mercado Pago Get.
      *
      * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/preference/get.ts Usage Example  }.
      */
      get({ preferenceId, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, get_1.default)({ id: preferenceId, config: this.config });
      }
      /**
      * Mercado Pago Create.
      *
      * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/preference/create.ts Usage Example  }.
      */
      create({ body, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, create_1.default)({ body, config: this.config });
      }
      /**
      * Mercado Pago Update.
      *
      * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/preference/update.ts Usage Example  }.
      */
      update({ id, updatePreferenceRequest, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, update_1.default)({ id, updatePreferenceRequest, config: this.config });
      }
      /**
      * Mercado Pago Search.
      *
      * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/preference/search.ts Usage Example  }.
      */
      search(preferenceSearchData = {}) {
        const { options, requestOptions } = preferenceSearchData;
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, search_1.default)({ options, config: this.config });
      }
    };
    exports.Preference = Preference;
  }
});

// ../node_modules/mercadopago/dist/clients/oAuth/create/index.js
var require_create9 = __commonJS({
  "../node_modules/mercadopago/dist/clients/oAuth/create/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = create;
    var restClient_1 = require_restClient();
    function create({ body, config: config2 }) {
      const defaultRequest = Object.assign(Object.assign({}, body), { "grant_type": "authorization_code" });
      return restClient_1.RestClient.fetch("/oauth/token", Object.assign({ method: "POST", headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      }, body: JSON.stringify(defaultRequest) }, config2.options));
    }
    __name(create, "create");
  }
});

// ../node_modules/mercadopago/dist/clients/oAuth/refresh/index.js
var require_refresh = __commonJS({
  "../node_modules/mercadopago/dist/clients/oAuth/refresh/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = refresh;
    var restClient_1 = require_restClient();
    function refresh({ body, config: config2 }) {
      const defaultRequest = Object.assign(Object.assign({}, body), { "grant_type": "refresh_token" });
      return restClient_1.RestClient.fetch("/oauth/token", Object.assign({ method: "POST", headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      }, body: JSON.stringify(defaultRequest) }, config2.options));
    }
    __name(refresh, "refresh");
  }
});

// ../node_modules/mercadopago/dist/clients/oAuth/getAuthorizationURL/index.js
var require_getAuthorizationURL = __commonJS({
  "../node_modules/mercadopago/dist/clients/oAuth/getAuthorizationURL/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = getAuthorizationURL;
    var restClient_1 = require_restClient();
    function getAuthorizationURL({ options }) {
      const defaultOptions = Object.assign(Object.assign({}, options), { response_type: "code", platform_id: "mp" });
      const AUTH_HOST = "https://auth.mercadopago.com/authorization";
      return restClient_1.RestClient.appendQueryParamsToUrl(AUTH_HOST, defaultOptions);
    }
    __name(getAuthorizationURL, "getAuthorizationURL");
  }
});

// ../node_modules/mercadopago/dist/clients/oAuth/index.js
var require_oAuth = __commonJS({
  "../node_modules/mercadopago/dist/clients/oAuth/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.OAuth = void 0;
    var create_1 = __importDefault(require_create9());
    var refresh_1 = __importDefault(require_refresh());
    var getAuthorizationURL_1 = __importDefault(require_getAuthorizationURL());
    var OAuth = class {
      static {
        __name(this, "OAuth");
      }
      constructor(mercadoPagoConfig) {
        this.config = mercadoPagoConfig;
      }
      /**
       * Mercado Pago OAuth Create.
       *
       * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/oauth/create.ts Usage Example  }.
       */
      create({ body, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, create_1.default)({ body, config: this.config });
      }
      /**
       * Mercado Pago OAuth Refresh.
       *
       * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/oauth/refresh.ts Usage Example  }.
       */
      refresh({ body, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, refresh_1.default)({ body, config: this.config });
      }
      /**
       * Mercado Pago OAuth getAuthorizationURL.
       *
       * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/oauth/getAuthorizationURL.ts Usage Example  }.
       */
      getAuthorizationURL({ options }) {
        return (0, getAuthorizationURL_1.default)({ options });
      }
    };
    exports.OAuth = OAuth;
  }
});

// ../node_modules/mercadopago/dist/clients/merchantOrder/create/index.js
var require_create10 = __commonJS({
  "../node_modules/mercadopago/dist/clients/merchantOrder/create/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = create;
    var restClient_1 = require_restClient();
    function create({ body, config: config2 }) {
      return restClient_1.RestClient.fetch("/merchant_orders", Object.assign({ headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      }, body: JSON.stringify(body), method: "POST" }, config2.options));
    }
    __name(create, "create");
  }
});

// ../node_modules/mercadopago/dist/clients/merchantOrder/get/index.js
var require_get10 = __commonJS({
  "../node_modules/mercadopago/dist/clients/merchantOrder/get/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = get;
    var restClient_1 = require_restClient();
    function get({ merchantOrderId, config: config2 }) {
      return restClient_1.RestClient.fetch(`/merchant_orders/${merchantOrderId}`, Object.assign({ headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      } }, config2.options));
    }
    __name(get, "get");
  }
});

// ../node_modules/mercadopago/dist/clients/merchantOrder/update/index.js
var require_update6 = __commonJS({
  "../node_modules/mercadopago/dist/clients/merchantOrder/update/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = update;
    var restClient_1 = require_restClient();
    function update({ merchantOrderId, body, config: config2 }) {
      return restClient_1.RestClient.fetch(`/merchant_orders/${merchantOrderId}`, Object.assign({ headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      }, body: JSON.stringify(body), method: "PUT" }, config2.options));
    }
    __name(update, "update");
  }
});

// ../node_modules/mercadopago/dist/clients/merchantOrder/search/index.js
var require_search7 = __commonJS({
  "../node_modules/mercadopago/dist/clients/merchantOrder/search/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = search;
    var restClient_1 = require_restClient();
    function search({ options, config: config2 }) {
      return restClient_1.RestClient.fetch("/merchant_orders/search", Object.assign({ headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      }, queryParams: Object.assign({}, options) }, config2.options));
    }
    __name(search, "search");
  }
});

// ../node_modules/mercadopago/dist/clients/merchantOrder/index.js
var require_merchantOrder = __commonJS({
  "../node_modules/mercadopago/dist/clients/merchantOrder/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.MerchantOrder = void 0;
    var create_1 = __importDefault(require_create10());
    var get_1 = __importDefault(require_get10());
    var update_1 = __importDefault(require_update6());
    var search_1 = __importDefault(require_search7());
    var MerchantOrder = class {
      static {
        __name(this, "MerchantOrder");
      }
      constructor(mercadoPagoConfig) {
        this.config = mercadoPagoConfig;
      }
      /**
       * Mercado Pago Merchant Order create.
       *
       * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/merchantOrder/create.ts Usage Example  }.
       */
      create({ body, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, create_1.default)({ body, config: this.config });
      }
      /**
       * Mercado Pago Merchant Order get.
       *
       * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/merchantOrder/get.ts Usage Example  }.
       */
      get({ merchantOrderId, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, get_1.default)({ merchantOrderId, config: this.config });
      }
      /**
       * Mercado Pago Merchant Order update.
       *
       * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/merchantOrder/update.ts Usage Example  }.
       */
      update({ merchantOrderId, body, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, update_1.default)({ merchantOrderId, body, config: this.config });
      }
      /**
       * Mercado Pago Merchant Order search.
       *
       * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/merchantOrder/search.ts Usage Example  }.
       */
      search(merchantOrderSearchOptions = {}) {
        const { options, requestOptions } = merchantOrderSearchOptions;
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, search_1.default)({ options, config: this.config });
      }
    };
    exports.MerchantOrder = MerchantOrder;
  }
});

// ../node_modules/mercadopago/dist/clients/user/get/index.js
var require_get11 = __commonJS({
  "../node_modules/mercadopago/dist/clients/user/get/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = get;
    var restClient_1 = require_restClient();
    function get({ config: config2 }) {
      return restClient_1.RestClient.fetch("/users/me", Object.assign({ headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      } }, config2.options));
    }
    __name(get, "get");
  }
});

// ../node_modules/mercadopago/dist/clients/user/index.js
var require_user = __commonJS({
  "../node_modules/mercadopago/dist/clients/user/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.User = void 0;
    var get_1 = __importDefault(require_get11());
    var User = class {
      static {
        __name(this, "User");
      }
      constructor(mercadoPagoConfig) {
        this.config = mercadoPagoConfig;
      }
      /**
      * Mercado Pago User.
      *
      * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/examples/user/get/get.ts Usage Example  }.
      */
      get(userGetData = {}) {
        const { requestOptions } = userGetData;
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, get_1.default)({ config: this.config });
      }
    };
    exports.User = User;
  }
});

// ../node_modules/mercadopago/dist/clients/order/create/index.js
var require_create11 = __commonJS({
  "../node_modules/mercadopago/dist/clients/order/create/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = create;
    var restClient_1 = require_restClient();
    function create({ body, config: config2 }) {
      return restClient_1.RestClient.fetch("/v1/orders", Object.assign({ method: "POST", headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      }, body: JSON.stringify(body) }, config2.options));
    }
    __name(create, "create");
  }
});

// ../node_modules/mercadopago/dist/clients/order/get/index.js
var require_get12 = __commonJS({
  "../node_modules/mercadopago/dist/clients/order/get/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = get;
    var restClient_1 = require_restClient();
    function get({ id, config: config2 }) {
      return restClient_1.RestClient.fetch(`/v1/orders/${id}`, Object.assign({ method: "GET", headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      } }, config2.options));
    }
    __name(get, "get");
  }
});

// ../node_modules/mercadopago/dist/clients/order/process/index.js
var require_process = __commonJS({
  "../node_modules/mercadopago/dist/clients/order/process/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = process2;
    var restClient_1 = require_restClient();
    function process2({ id, config: config2 }) {
      return restClient_1.RestClient.fetch(`/v1/orders/${id}/process`, Object.assign({ method: "POST", headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      } }, config2.options));
    }
    __name(process2, "process");
  }
});

// ../node_modules/mercadopago/dist/clients/order/capture/index.js
var require_capture2 = __commonJS({
  "../node_modules/mercadopago/dist/clients/order/capture/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = capture;
    var restClient_1 = require_restClient();
    function capture({ id, config: config2 }) {
      return restClient_1.RestClient.fetch(`/v1/orders/${id}/capture`, Object.assign({ method: "POST", headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      } }, config2.options));
    }
    __name(capture, "capture");
  }
});

// ../node_modules/mercadopago/dist/clients/order/cancel/index.js
var require_cancel2 = __commonJS({
  "../node_modules/mercadopago/dist/clients/order/cancel/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = cancel;
    var restClient_1 = require_restClient();
    function cancel({ id, config: config2 }) {
      return restClient_1.RestClient.fetch(`/v1/orders/${id}/cancel`, Object.assign({ method: "POST", headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      } }, config2.options));
    }
    __name(cancel, "cancel");
  }
});

// ../node_modules/mercadopago/dist/clients/order/refund/index.js
var require_refund = __commonJS({
  "../node_modules/mercadopago/dist/clients/order/refund/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = refund;
    var restClient_1 = require_restClient();
    function refund({ id, body, config: config2 }) {
      return restClient_1.RestClient.fetch(`/v1/orders/${id}/refund`, Object.assign({ method: "POST", headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      }, body: JSON.stringify(body) }, config2.options));
    }
    __name(refund, "refund");
  }
});

// ../node_modules/mercadopago/dist/clients/order/transaction/create/index.js
var require_create12 = __commonJS({
  "../node_modules/mercadopago/dist/clients/order/transaction/create/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = createTransaction;
    var restClient_1 = require_restClient();
    function createTransaction({ id, body, config: config2 }) {
      return restClient_1.RestClient.fetch(`/v1/orders/${id}/transactions`, Object.assign({ method: "POST", headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      }, body: JSON.stringify(body) }, config2.options));
    }
    __name(createTransaction, "createTransaction");
  }
});

// ../node_modules/mercadopago/dist/clients/order/transaction/update/index.js
var require_update7 = __commonJS({
  "../node_modules/mercadopago/dist/clients/order/transaction/update/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = updateTransaction;
    var restClient_1 = require_restClient();
    function updateTransaction({ id, transactionId, body, config: config2 }) {
      return restClient_1.RestClient.fetch(`/v1/orders/${id}/transactions/${transactionId}`, Object.assign({ method: "PUT", headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      }, body: JSON.stringify(body) }, config2.options));
    }
    __name(updateTransaction, "updateTransaction");
  }
});

// ../node_modules/mercadopago/dist/clients/order/transaction/delete/index.js
var require_delete = __commonJS({
  "../node_modules/mercadopago/dist/clients/order/transaction/delete/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = deleteTransaction;
    var restClient_1 = require_restClient();
    function deleteTransaction({ id, transactionId, config: config2 }) {
      return restClient_1.RestClient.fetch(`/v1/orders/${id}/transactions/${transactionId}`, Object.assign({ method: "DELETE", headers: {
        "Authorization": `Bearer ${config2.accessToken}`
      } }, config2.options));
    }
    __name(deleteTransaction, "deleteTransaction");
  }
});

// ../node_modules/mercadopago/dist/clients/order/index.js
var require_order = __commonJS({
  "../node_modules/mercadopago/dist/clients/order/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Order = void 0;
    var create_1 = __importDefault(require_create11());
    var get_1 = __importDefault(require_get12());
    var process_1 = __importDefault(require_process());
    var capture_1 = __importDefault(require_capture2());
    var cancel_1 = __importDefault(require_cancel2());
    var refund_1 = __importDefault(require_refund());
    var create_2 = __importDefault(require_create12());
    var update_1 = __importDefault(require_update7());
    var delete_1 = __importDefault(require_delete());
    var Order = class {
      static {
        __name(this, "Order");
      }
      constructor(mercadoPagoConfig) {
        this.config = mercadoPagoConfig;
      }
      /**
       * Create Order.
       *
       * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/order/create.ts Usage Example }.
       */
      create({ body, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, create_1.default)({ body, config: this.config });
      }
      /**
       * Get Order.
       *
       * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/order/get.ts Usage Example }.
       */
      get({ id, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, get_1.default)({ id, config: this.config });
      }
      /**
       * Process Order.
       *
       * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/order/process.ts Usage Example }.
       */
      process({ id, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, process_1.default)({ id, config: this.config });
      }
      /**
       * Capture Order.
       *
       * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/order/capture.ts Usage Example }.
       */
      capture({ id, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, capture_1.default)({ id, config: this.config });
      }
      /**
       * Cancel Order.
       *
       * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/order/cancel.ts Usage Example }.
       */
      cancel({ id, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, cancel_1.default)({ id, config: this.config });
      }
      /**
       * Refund Order (total or partial).
       *
       * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/order/refundTotal.ts Usage Example }.
       * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/order/refundPartial.ts Usage Example }.
       */
      refund({ id, body, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, refund_1.default)({ id, body, config: this.config });
      }
      /**
       * Create Order transaction.
       *
       * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/order/transaction/create.ts Usage Example }.
       */
      createTransaction({ id, body, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, create_2.default)({ id, body, config: this.config });
      }
      /**
       * Update Order transaction.
       *
       * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/order/transaction/update.ts Usage Example }.
       */
      updateTransaction({ id, transactionId, body, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, update_1.default)({ id, transactionId, body, config: this.config });
      }
      /**
       * Delete Order transaction.
       *
       * @see {@link https://github.com/mercadopago/sdk-nodejs/blob/master/src/examples/order/transaction/delete.ts Usage Example }.
       */
      deleteTransaction({ id, transactionId, requestOptions }) {
        this.config.options = Object.assign(Object.assign({}, this.config.options), requestOptions);
        return (0, delete_1.default)({ id, transactionId, config: this.config });
      }
    };
    exports.Order = Order;
  }
});

// ../node_modules/mercadopago/dist/index.js
var require_dist = __commonJS({
  "../node_modules/mercadopago/dist/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Order = exports.User = exports.MerchantOrder = exports.OAuth = exports.Preference = exports.Point = exports.PreApprovalPlan = exports.PreApproval = exports.Payment = exports.PaymentMethod = exports.PaymentRefund = exports.IdentificationType = exports.Invoice = exports.Customer = exports.CustomerCard = exports.CardToken = exports.MercadoPagoConfig = void 0;
    var mercadoPagoConfig_1 = require_mercadoPagoConfig();
    Object.defineProperty(exports, "MercadoPagoConfig", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return mercadoPagoConfig_1.MercadoPagoConfig;
    }, "get") });
    exports.default = mercadoPagoConfig_1.MercadoPagoConfig;
    var cardToken_1 = require_cardToken();
    Object.defineProperty(exports, "CardToken", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return cardToken_1.CardToken;
    }, "get") });
    var customerCard_1 = require_customerCard();
    Object.defineProperty(exports, "CustomerCard", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return customerCard_1.CustomerCard;
    }, "get") });
    var customer_1 = require_customer();
    Object.defineProperty(exports, "Customer", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return customer_1.Customer;
    }, "get") });
    var invoice_1 = require_invoice();
    Object.defineProperty(exports, "Invoice", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return invoice_1.Invoice;
    }, "get") });
    var identificationType_1 = require_identificationType();
    Object.defineProperty(exports, "IdentificationType", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return identificationType_1.IdentificationType;
    }, "get") });
    var paymentRefund_1 = require_paymentRefund();
    Object.defineProperty(exports, "PaymentRefund", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return paymentRefund_1.PaymentRefund;
    }, "get") });
    var paymentMethod_1 = require_paymentMethod();
    Object.defineProperty(exports, "PaymentMethod", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return paymentMethod_1.PaymentMethod;
    }, "get") });
    var payment_1 = require_payment();
    Object.defineProperty(exports, "Payment", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return payment_1.Payment;
    }, "get") });
    var preApproval_1 = require_preApproval();
    Object.defineProperty(exports, "PreApproval", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return preApproval_1.PreApproval;
    }, "get") });
    var preApprovalPlan_1 = require_preApprovalPlan();
    Object.defineProperty(exports, "PreApprovalPlan", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return preApprovalPlan_1.PreApprovalPlan;
    }, "get") });
    var point_1 = require_point();
    Object.defineProperty(exports, "Point", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return point_1.Point;
    }, "get") });
    var preference_1 = require_preference();
    Object.defineProperty(exports, "Preference", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return preference_1.Preference;
    }, "get") });
    var oAuth_1 = require_oAuth();
    Object.defineProperty(exports, "OAuth", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return oAuth_1.OAuth;
    }, "get") });
    var merchantOrder_1 = require_merchantOrder();
    Object.defineProperty(exports, "MerchantOrder", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return merchantOrder_1.MerchantOrder;
    }, "get") });
    var user_1 = require_user();
    Object.defineProperty(exports, "User", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return user_1.User;
    }, "get") });
    var order_1 = require_order();
    Object.defineProperty(exports, "Order", { enumerable: true, get: /* @__PURE__ */ __name(function() {
      return order_1.Order;
    }, "get") });
  }
});

// api/financeiro/mp-cancel.ts
var import_mercadopago, onRequestPost13;
var init_mp_cancel = __esm({
  "api/financeiro/mp-cancel.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    import_mercadopago = __toESM(require_dist(), 1);
    onRequestPost13 = /* @__PURE__ */ __name(async (context2) => {
      const url = new URL(context2.request.url);
      const id = url.searchParams.get("id");
      if (!id) return Response.json({ error: "ID do pagamento ausente." }, { status: 400 });
      const token = context2.env.MP_ACCESS_TOKEN;
      if (!token) return Response.json({ error: "MP_ACCESS_TOKEN ausente." }, { status: 503 });
      try {
        const client = new import_mercadopago.MercadoPagoConfig({ accessToken: token });
        const paymentApi = new import_mercadopago.Payment(client);
        await paymentApi.cancel({ id });
        return Response.json({ success: true });
      } catch (err) {
        return Response.json({ error: err instanceof Error ? err.message : "Falha ao cancelar." }, { status: 500 });
      }
    }, "onRequestPost");
  }
});

// api/financeiro/mp-refund.ts
var import_mercadopago2, onRequestPost14;
var init_mp_refund = __esm({
  "api/financeiro/mp-refund.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    import_mercadopago2 = __toESM(require_dist(), 1);
    onRequestPost14 = /* @__PURE__ */ __name(async (context2) => {
      const url = new URL(context2.request.url);
      const id = url.searchParams.get("id");
      if (!id) return Response.json({ error: "ID do pagamento ausente." }, { status: 400 });
      const token = context2.env.MP_ACCESS_TOKEN;
      if (!token) return Response.json({ error: "MP_ACCESS_TOKEN ausente." }, { status: 503 });
      try {
        const client = new import_mercadopago2.MercadoPagoConfig({ accessToken: token });
        const refundApi = new import_mercadopago2.PaymentRefund(client);
        const refundBody = { payment_id: id };
        try {
          const body = await context2.request.json();
          if (body.amount) refundBody.body = { amount: Number(body.amount) };
        } catch {
        }
        await refundApi.create(refundBody);
        const newStatus = refundBody.body?.amount ? "partially_refunded" : "refunded";
        return Response.json({ success: true, status: newStatus });
      } catch (err) {
        return Response.json({ error: err instanceof Error ? err.message : "Falha no estorno." }, { status: 500 });
      }
    }, "onRequestPost");
  }
});

// api/financeiro/sumup-balance.ts
var FINANCIAL_CUTOFF2, onRequestGet20;
var init_sumup_balance = __esm({
  "api/financeiro/sumup-balance.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_dist();
    FINANCIAL_CUTOFF2 = "2026-03-01";
    onRequestGet20 = /* @__PURE__ */ __name(async (context2) => {
      const token = context2.env.SUMUP_API_KEY_PRIVATE;
      const merchantCode = context2.env.SUMUP_MERCHANT_CODE;
      if (!token || !merchantCode) return Response.json({ available_balance: 0, unavailable_balance: 0 });
      const url = new URL(context2.request.url);
      const rawStart = url.searchParams.get("start_date") || FINANCIAL_CUTOFF2;
      const startDate = rawStart < FINANCIAL_CUTOFF2 ? FINANCIAL_CUTOFF2 : rawStart;
      try {
        const client = new dist_default({ apiKey: token });
        const txData = await client.transactions.list({
          merchantCode,
          changes_since: `${startDate}T00:00:00-03:00`,
          limit: 100
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        });
        const items = Array.isArray(txData?.items) ? txData.items : [];
        let available = 0;
        let unavailable = 0;
        for (const tx of items) {
          const status = String(tx?.status || "").toUpperCase();
          const amount = Number(tx?.amount || 0);
          if (["SUCCESSFUL", "PAID", "APPROVED"].includes(status)) {
            available += amount;
          } else if (["PENDING", "IN_PROCESS", "PROCESSING"].includes(status)) {
            unavailable += amount;
          }
        }
        return Response.json({ available_balance: available, unavailable_balance: unavailable });
      } catch {
        return Response.json({ available_balance: 0, unavailable_balance: 0 });
      }
    }, "onRequestGet");
  }
});

// api/financeiro/sumup-cancel.ts
var onRequestPost15;
var init_sumup_cancel = __esm({
  "api/financeiro/sumup-cancel.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_dist();
    onRequestPost15 = /* @__PURE__ */ __name(async (context2) => {
      const url = new URL(context2.request.url);
      const id = url.searchParams.get("id");
      if (!id) return Response.json({ success: false, error: "ID do pagamento ausente." }, { status: 400 });
      const token = context2.env.SUMUP_API_KEY_PRIVATE;
      if (!token) return Response.json({ success: false, error: "SUMUP_API_KEY_PRIVATE ausente." }, { status: 503 });
      try {
        const client = new dist_default({ apiKey: token });
        try {
          await client.checkouts.deactivate(id);
        } catch (apiErr) {
          let errMsg = apiErr instanceof Error ? apiErr.message : "Falha ao cancelar.";
          try {
            if (errMsg.includes("{")) {
              const jsonStr = errMsg.substring(errMsg.indexOf("{"));
              const parsed = JSON.parse(jsonStr);
              if (parsed?.message) errMsg = parsed.message;
              if (parsed?.detail) errMsg = parsed.detail;
              if (parsed?.error_code === "NOT FOUND") errMsg = "Checkout nao encontrado.";
              if (parsed?.error_code === "CONFLICT") errMsg = "Este checkout nao pode ser cancelado no estado atual.";
            }
          } catch {
          }
          const isConflict = errMsg.includes("cancelado no estado atual") || apiErr instanceof Error && apiErr.message.includes("409");
          if (isConflict) {
            try {
              const checkRes = await fetch(`https://api.sumup.com/v0.1/checkouts/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              if (checkRes.ok) {
                const checkoutData = await checkRes.json();
                const txStatus = checkoutData.transactions?.[0]?.status;
                const rawStatus = String(txStatus || checkoutData.status || "UNKNOWN").toUpperCase();
                const realStatus = rawStatus === "PAID" ? "SUCCESSFUL" : rawStatus;
                if (checkoutData.status === "PAID" || realStatus === "SUCCESSFUL") {
                  return Response.json(
                    {
                      success: false,
                      error: "A transacao foi confirmada/paga na SumUp. Atualize o painel e utilize Estornar Transacao (Refund) ao inves de cancelar."
                    },
                    { status: 400 }
                  );
                }
              }
            } catch {
            }
          } else {
            return Response.json({ success: false, error: `Cancelamento recusado pela SumUp: ${errMsg}` }, { status: 400 });
          }
        }
        return Response.json({ success: true });
      } catch (err) {
        return Response.json(
          { success: false, error: err instanceof Error ? err.message : "Falha estrutural ao cancelar." },
          { status: 500 }
        );
      }
    }, "onRequestPost");
  }
});

// api/financeiro/sumup-refund.ts
var onRequestPost16;
var init_sumup_refund = __esm({
  "api/financeiro/sumup-refund.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_dist();
    onRequestPost16 = /* @__PURE__ */ __name(async (context2) => {
      const url = new URL(context2.request.url);
      const id = url.searchParams.get("id");
      if (!id) return Response.json({ success: false, error: "ID do pagamento ausente." }, { status: 400 });
      const token = context2.env.SUMUP_API_KEY_PRIVATE;
      if (!token) return Response.json({ success: false, error: "SUMUP_API_KEY_PRIVATE ausente." }, { status: 503 });
      try {
        let amount = null;
        try {
          const body = await context2.request.json();
          if (body?.amount) amount = Number(body.amount);
        } catch {
        }
        const client = new dist_default({ apiKey: token });
        let txnId = id;
        let originalAmount = 0;
        try {
          const checkout = await client.checkouts.get(id);
          const extracted = checkout?.transactions?.[0]?.id;
          if (extracted) txnId = extracted;
          originalAmount = Number(checkout?.amount || checkout?.transactions?.[0]?.amount || 0);
        } catch {
        }
        try {
          const refundPayload = amount ? { amount } : void 0;
          await client.transactions.refund(txnId, refundPayload);
        } catch (apiErr) {
          let errMsg = apiErr instanceof Error ? apiErr.message : "Falha no estorno.";
          try {
            if (errMsg.includes("{")) {
              const jsonStr = errMsg.substring(errMsg.indexOf("{"));
              const parsed = JSON.parse(jsonStr);
              if (parsed?.message) errMsg = parsed.message;
              if (parsed?.detail) errMsg = parsed.detail;
              if (parsed?.error_code === "NOT FOUND") errMsg = "Transacao nao encontrada ou aguardando compensacao.";
              if (parsed?.error_code === "CONFLICT") errMsg = "A transacao nao pode ser estornada no estado atual.";
            }
          } catch {
          }
          return Response.json({ success: false, error: `Estorno recusado pela SumUp: ${errMsg}` }, { status: 400 });
        }
        let newStatus = "REFUNDED";
        if (amount && originalAmount > 0 && amount < originalAmount) {
          newStatus = "PARTIALLY_REFUNDED";
        }
        return Response.json({ success: true, status: newStatus });
      } catch (err) {
        return Response.json(
          { success: false, error: err instanceof Error ? err.message : "Falha estrutural ao estornar." },
          { status: 500 }
        );
      }
    }, "onRequestPost");
  }
});

// api/itau/modelos.ts
function json10(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
var onRequestGet21;
var init_modelos2 = __esm({
  "api/itau/modelos.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name(json10, "json");
    onRequestGet21 = /* @__PURE__ */ __name(async ({ env: env2 }) => {
      const apiKey = env2?.GEMINI_API_KEY;
      if (!apiKey) return json10({ ok: false, error: "GEMINI_API_KEY n\xE3o configurada." }, 503);
      try {
        const [v1Res, v1betaRes] = await Promise.allSettled([
          fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`),
          fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
        ]);
        const allModels = /* @__PURE__ */ new Map();
        for (const [apiLabel, result] of [["v1", v1Res], ["v1beta", v1betaRes]]) {
          if (result.status !== "fulfilled" || !result.value.ok) continue;
          const data = await result.value.json();
          if (!data.models) continue;
          for (const m of data.models) {
            const id = m.name.replace("models/", "");
            const lower = id.toLowerCase();
            const isFlashOrPro = lower.includes("flash") || lower.includes("pro");
            const isGemini = lower.startsWith("gemini");
            if (!isGemini || !isFlashOrPro) continue;
            const supportsGenerate = m.supportedGenerationMethods?.includes("generateContent") ?? false;
            if (!supportsGenerate) continue;
            const hasVision = lower.includes("vision") || lower.includes("pro") || lower.includes("flash");
            if (!allModels.has(id)) {
              allModels.set(id, {
                id,
                displayName: m.displayName || id,
                api: apiLabel,
                vision: hasVision
              });
            }
          }
        }
        const models = [...allModels.values()].sort((a, b) => {
          const aPreview = a.id.includes("preview") || a.id.includes("exp") ? 1 : 0;
          const bPreview = b.id.includes("preview") || b.id.includes("exp") ? 1 : 0;
          if (aPreview !== bPreview) return aPreview - bPreview;
          const aPro = a.id.includes("pro") ? 0 : 1;
          const bPro = b.id.includes("pro") ? 0 : 1;
          return aPro - bPro || a.id.localeCompare(b.id);
        });
        return json10({ ok: true, models, total: models.length });
      } catch (err) {
        return json10({ ok: false, error: err instanceof Error ? err.message : "Erro ao listar modelos." }, 500);
      }
    }, "onRequestGet");
  }
});

// api/itau/overview.ts
async function onRequestGet22(context2) {
  const { request, env: env2 } = context2;
  const trace3 = createResponseTrace(request);
  const url = new URL(request.url);
  const moeda = normalizeMoeda(url.searchParams.get("moeda") ?? "");
  const dias = parseDias(url.searchParams.get("dias"));
  const filtros = { moeda, dias };
  const avisos = [];
  if (env2.BIGDATA_DB) {
    try {
      const payload = await queryBigdataOverview(env2.BIGDATA_DB, filtros);
      try {
        await logModuleOperationalEvent(env2.BIGDATA_DB, {
          module: "itau",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: true,
          metadata: {
            totalObservacoes: payload.resumo.totalObservacoes,
            observacoesJanela: payload.resumo.observacoesJanela
          }
        });
      } catch {
      }
      return new Response(JSON.stringify({
        ...payload,
        ...trace3
      }), {
        headers: toResponseHeaders2()
      });
    } catch (error3) {
      const message = error3 instanceof Error ? error3.message : "Falha ao consultar bigdata_db";
      avisos.push(`Leitura em modo D1 indispon\xEDvel: ${message}`);
    }
  }
  return new Response(JSON.stringify({
    ok: false,
    ...trace3,
    error: "BIGDATA_DB indispon\xEDvel para leitura do m\xF3dulo Ita\xFA.",
    filtros,
    avisos: [...avisos, "Fallback para admin legado desativado por Cloudflare Access."],
    resumo: {
      totalObservacoes: 0,
      observacoesJanela: 0,
      mapeJanelaPercent: null,
      telemetriaTotal: 0,
      telemetriaErros: 0,
      telemetriaCacheHits: 0,
      telemetriaAvgDurationMs: null,
      isPlantao: null
    },
    ultimasObservacoes: []
  }), {
    status: 503,
    headers: toResponseHeaders2()
  });
}
var toResponseHeaders2, normalizeMoeda, parseDias, queryBigdataOverview;
var init_overview2 = __esm({
  "api/itau/overview.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_request_trace();
    toResponseHeaders2 = /* @__PURE__ */ __name(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toResponseHeaders");
    normalizeMoeda = /* @__PURE__ */ __name((rawValue) => rawValue.trim().toUpperCase(), "normalizeMoeda");
    parseDias = /* @__PURE__ */ __name((rawValue) => {
      const parsed = Number.parseInt(rawValue ?? "7", 10);
      if (!Number.isFinite(parsed)) {
        return 7;
      }
      return Math.min(90, Math.max(1, parsed));
    }, "parseDias");
    queryBigdataOverview = /* @__PURE__ */ __name(async (db, filtros) => {
      const { moeda, dias } = filtros;
      const cutoff = Date.now() - dias * 24 * 60 * 60 * 1e3;
      const hasMoedaFilter = moeda.length > 0;
      const totalRow = hasMoedaFilter ? await db.prepare("SELECT COUNT(1) AS total FROM itau_backtest_spot_vs_ptax WHERE moeda = ?").bind(moeda).first() : await db.prepare("SELECT COUNT(1) AS total FROM itau_backtest_spot_vs_ptax").first();
      const janelaRow = hasMoedaFilter ? await db.prepare("SELECT COUNT(1) AS total_janela, AVG(erro_percentual) AS mape_janela FROM itau_backtest_spot_vs_ptax WHERE created_at >= ? AND moeda = ?").bind(cutoff, moeda).first() : await db.prepare("SELECT COUNT(1) AS total_janela, AVG(erro_percentual) AS mape_janela FROM itau_backtest_spot_vs_ptax WHERE created_at >= ?").bind(cutoff).first();
      const ultimasRows = hasMoedaFilter ? await db.prepare("SELECT created_at, moeda, erro_percentual FROM itau_backtest_spot_vs_ptax WHERE moeda = ? ORDER BY created_at DESC LIMIT 10").bind(moeda).all() : await db.prepare("SELECT created_at, moeda, erro_percentual FROM itau_backtest_spot_vs_ptax ORDER BY created_at DESC LIMIT 10").all();
      const telemetriaRow = hasMoedaFilter ? await db.prepare(`
      SELECT
        COUNT(1) AS total,
        SUM(CASE WHEN from_cache = 1 THEN 1 ELSE 0 END) AS cache_hits,
        AVG(duration_ms) AS avg_duration,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS errors
      FROM itau_oraculo_observabilidade
      WHERE moeda = ?
    `).bind(moeda).first() : await db.prepare(`
      SELECT
        COUNT(1) AS total,
        SUM(CASE WHEN from_cache = 1 THEN 1 ELSE 0 END) AS cache_hits,
        AVG(duration_ms) AS avg_duration,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS errors
      FROM itau_oraculo_observabilidade
    `).first();
      const mappedUltimas = (ultimasRows.results ?? []).filter((item) => Number.isFinite(Number(item.created_at)) && typeof item.moeda === "string" && Number.isFinite(Number(item.erro_percentual))).map((item) => ({
        createdAt: Number(item.created_at),
        moeda: String(item.moeda),
        erroPercentual: Number(item.erro_percentual)
      }));
      return {
        ok: true,
        fonte: "bigdata_db",
        filtros,
        avisos: [],
        resumo: {
          totalObservacoes: Number(totalRow?.total ?? 0),
          observacoesJanela: Number(janelaRow?.total_janela ?? 0),
          mapeJanelaPercent: Number.isFinite(Number(janelaRow?.mape_janela)) ? Number((Number(janelaRow?.mape_janela) * 100).toFixed(4)) : null,
          telemetriaTotal: Number(telemetriaRow?.total ?? 0),
          telemetriaErros: Number(telemetriaRow?.errors ?? 0),
          telemetriaCacheHits: Number(telemetriaRow?.cache_hits ?? 0),
          telemetriaAvgDurationMs: Number.isFinite(Number(telemetriaRow?.avg_duration)) ? Math.round(Number(telemetriaRow?.avg_duration)) : null,
          isPlantao: null
        },
        ultimasObservacoes: mappedUltimas
      };
    }, "queryBigdataOverview");
    __name(onRequestGet22, "onRequestGet");
  }
});

// api/_lib/itau-admin.ts
var DEFAULT_PARAMS, DEFAULT_POLICIES2, SUPPORTED_ROUTES2, toHeaders13, toInt2, toRate, validateRate, ensureParametrosTables, readLatestParams, ensureRateLimitTables2, ensureDefaultPolicies2, getRateLimitWindowStats2, listPoliciesWithStats2, upsertRateLimitPolicy2, resetRateLimitPolicy2;
var init_itau_admin = __esm({
  "api/_lib/itau-admin.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    DEFAULT_PARAMS = {
      iof_cartao: 0.035,
      iof_global: 0.035,
      spread_cartao: 0.055,
      spread_global_aberto: 78e-4,
      spread_global_fechado: 0.0118,
      fator_calibragem_global: 0.99934,
      backtest_mape_boa_percent: 1,
      backtest_mape_atencao_percent: 2
    };
    DEFAULT_POLICIES2 = {
      oraculo_ia: {
        route_key: "oraculo_ia",
        label: "S\xEDntese da IA",
        enabled: 1,
        max_requests: 2,
        window_minutes: 10
      },
      enviar_email: {
        route_key: "enviar_email",
        label: "Envio de E-mail",
        enabled: 1,
        max_requests: 2,
        window_minutes: 10
      },
      contato: {
        route_key: "contato",
        label: "Formul\xE1rio de Contato",
        enabled: 1,
        max_requests: 5,
        window_minutes: 30
      }
    };
    SUPPORTED_ROUTES2 = ["oraculo_ia", "enviar_email", "contato"];
    toHeaders13 = /* @__PURE__ */ __name(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    toInt2 = /* @__PURE__ */ __name((value, fallback) => {
      const parsed = Number.parseInt(String(value), 10);
      return Number.isFinite(parsed) ? parsed : fallback;
    }, "toInt");
    toRate = /* @__PURE__ */ __name((percentValue) => {
      const value = Number(percentValue);
      if (!Number.isFinite(value)) {
        return null;
      }
      return value / 100;
    }, "toRate");
    validateRate = /* @__PURE__ */ __name((name, rate) => {
      if (!Number.isFinite(Number(rate))) {
        return `${name} inv\xE1lido.`;
      }
      if (Number(rate) < 0 || Number(rate) > 1) {
        return `${name} deve estar entre 0% e 100%.`;
      }
      return null;
    }, "validateRate");
    ensureParametrosTables = /* @__PURE__ */ __name(async (db) => {
      await db.prepare(
        "CREATE TABLE IF NOT EXISTS itau_parametros_customizados (id INTEGER PRIMARY KEY AUTOINCREMENT, chave TEXT NOT NULL, valor TEXT NOT NULL)"
      ).run();
      await db.prepare(`
    CREATE TABLE IF NOT EXISTS itau_parametros_auditoria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at INTEGER NOT NULL,
      admin_email TEXT NOT NULL,
      chave TEXT NOT NULL,
      valor_anterior TEXT,
      valor_novo TEXT NOT NULL,
      origem TEXT NOT NULL
    )
  `).run();
    }, "ensureParametrosTables");
    readLatestParams = /* @__PURE__ */ __name(async (db) => {
      await ensureParametrosTables(db);
      const rows = await db.prepare("SELECT chave, valor FROM itau_parametros_customizados ORDER BY id DESC").all();
      const result = { ...DEFAULT_PARAMS };
      for (const row of rows.results ?? []) {
        const key = String(row.chave ?? "").trim();
        if (!(key in result)) {
          continue;
        }
        const parsed = Number.parseFloat(String(row.valor ?? ""));
        if (Number.isFinite(parsed)) {
          result[key] = parsed;
        }
      }
      return result;
    }, "readLatestParams");
    ensureRateLimitTables2 = /* @__PURE__ */ __name(async (db) => {
      await db.prepare(`
    CREATE TABLE IF NOT EXISTS itau_rate_limit_policies (
      route_key TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL,
      max_requests INTEGER NOT NULL,
      window_minutes INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      updated_by TEXT
    )
  `).run();
      await db.prepare(`
    CREATE TABLE IF NOT EXISTS itau_rate_limit_hits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      route_key TEXT NOT NULL,
      ip TEXT NOT NULL,
      created_at INTEGER NOT NULL
    )
  `).run();
    }, "ensureRateLimitTables");
    ensureDefaultPolicies2 = /* @__PURE__ */ __name(async (db) => {
      await ensureRateLimitTables2(db);
      for (const routeKey of SUPPORTED_ROUTES2) {
        const policy = DEFAULT_POLICIES2[routeKey];
        await db.prepare(`
      INSERT OR IGNORE INTO itau_rate_limit_policies (route_key, enabled, max_requests, window_minutes, updated_at, updated_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(policy.route_key, policy.enabled, policy.max_requests, policy.window_minutes, Date.now(), "system-default").run();
      }
    }, "ensureDefaultPolicies");
    getRateLimitWindowStats2 = /* @__PURE__ */ __name(async (db, routeKey, windowMinutes) => {
      const now = Date.now();
      const cutoff = now - Math.max(1, toInt2(windowMinutes, 10)) * 60 * 1e3;
      const row = await db.prepare(`
    SELECT COUNT(1) AS total, COUNT(DISTINCT ip) AS ips
    FROM itau_rate_limit_hits
    WHERE route_key = ? AND created_at >= ?
  `).bind(routeKey, cutoff).first();
      return {
        total_requests_window: toInt2(row?.total, 0),
        distinct_ips_window: toInt2(row?.ips, 0)
      };
    }, "getRateLimitWindowStats");
    listPoliciesWithStats2 = /* @__PURE__ */ __name(async (db) => {
      await ensureDefaultPolicies2(db);
      const output = [];
      for (const routeKey of SUPPORTED_ROUTES2) {
        const fallback = DEFAULT_POLICIES2[routeKey];
        const row = await db.prepare(`
      SELECT route_key, enabled, max_requests, window_minutes, updated_at, updated_by
      FROM itau_rate_limit_policies
      WHERE route_key = ?
      LIMIT 1
    `).bind(routeKey).first();
        const policy = {
          route_key: routeKey,
          label: fallback.label,
          enabled: toInt2(row?.enabled, fallback.enabled) === 1,
          max_requests: Math.max(1, toInt2(row?.max_requests, fallback.max_requests)),
          window_minutes: Math.max(1, toInt2(row?.window_minutes, fallback.window_minutes)),
          updated_at: toInt2(row?.updated_at, Date.now()),
          updated_by: typeof row?.updated_by === "string" && row.updated_by.trim() ? row.updated_by.trim() : null,
          defaults: {
            enabled: fallback.enabled === 1,
            max_requests: fallback.max_requests,
            window_minutes: fallback.window_minutes
          },
          stats: {
            total_requests_window: 0,
            distinct_ips_window: 0
          }
        };
        policy.stats = await getRateLimitWindowStats2(db, routeKey, policy.window_minutes);
        output.push(policy);
      }
      return output;
    }, "listPoliciesWithStats");
    upsertRateLimitPolicy2 = /* @__PURE__ */ __name(async (db, input) => {
      await ensureDefaultPolicies2(db);
      await db.prepare(`
    INSERT INTO itau_rate_limit_policies (route_key, enabled, max_requests, window_minutes, updated_at, updated_by)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(route_key) DO UPDATE SET
      enabled = excluded.enabled,
      max_requests = excluded.max_requests,
      window_minutes = excluded.window_minutes,
      updated_at = excluded.updated_at,
      updated_by = excluded.updated_by
  `).bind(input.routeKey, input.enabled, input.maxRequests, input.windowMinutes, Date.now(), input.updatedBy).run();
    }, "upsertRateLimitPolicy");
    resetRateLimitPolicy2 = /* @__PURE__ */ __name(async (db, routeKey, updatedBy) => {
      const fallback = DEFAULT_POLICIES2[routeKey];
      await upsertRateLimitPolicy2(db, {
        routeKey,
        enabled: fallback.enabled,
        maxRequests: fallback.max_requests,
        windowMinutes: fallback.window_minutes,
        updatedBy
      });
    }, "resetRateLimitPolicy");
  }
});

// api/itau/parametros.ts
async function onRequestGet23(context2) {
  const { env: env2 } = context2;
  const trace3 = createResponseTrace(context2.request);
  const adminActor = resolveAdminActorFromRequest(context2.request);
  const db = resolveParametrosDb(context2);
  const source = resolveOperationalSource4(context2);
  if (!db) {
    return json11({ ok: false, error: "Nenhum binding D1 dispon\xEDvel (BIGDATA_DB).", ...trace3 }, 503);
  }
  try {
    const parametros = await readLatestParams(db);
    if (env2.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(env2.BIGDATA_DB, {
          module: "itau",
          source,
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: "read-parametros",
            adminActor,
            totalCampos: Object.keys(parametros).length,
            rotasRateLimitSuportadas: SUPPORTED_ROUTES2
          }
        });
      } catch {
      }
    }
    return json11({
      ok: true,
      admin_email: adminActor,
      admin_actor: adminActor,
      ...trace3,
      parametros_vigentes: parametros,
      parametros_form: {
        iof_cartao_percent: Number((parametros.iof_cartao * 100).toFixed(4)),
        iof_global_percent: Number((parametros.iof_global * 100).toFixed(4)),
        spread_cartao_percent: Number((parametros.spread_cartao * 100).toFixed(4)),
        spread_global_aberto_percent: Number((parametros.spread_global_aberto * 100).toFixed(4)),
        spread_global_fechado_percent: Number((parametros.spread_global_fechado * 100).toFixed(4)),
        fator_calibragem_global: parametros.fator_calibragem_global,
        backtest_mape_boa_percent: parametros.backtest_mape_boa_percent,
        backtest_mape_atencao_percent: parametros.backtest_mape_atencao_percent
      }
    });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha ao carregar par\xE2metros do Ita\xFA";
    if (env2.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(env2.BIGDATA_DB, {
          module: "itau",
          source,
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: { action: "read-parametros" }
        });
      } catch {
      }
    }
    return json11({ ok: false, error: message, ...trace3 }, 500);
  }
}
async function onRequestPost17(context2) {
  const { env: env2 } = context2;
  const trace3 = createResponseTrace(context2.request);
  const db = resolveParametrosDb(context2);
  const source = resolveOperationalSource4(context2);
  if (!db) {
    return json11({ ok: false, error: "Nenhum binding D1 dispon\xEDvel (BIGDATA_DB).", ...trace3 }, 503);
  }
  try {
    const body = await context2.request.json();
    const adminActor = resolveAdminActorFromRequest(context2.request, body);
    const iofCartao = toRate(body.iof_cartao_percent);
    const iofGlobal = toRate(body.iof_global_percent);
    const spreadCartao = toRate(body.spread_cartao_percent);
    const spreadAberto = toRate(body.spread_global_aberto_percent);
    const spreadFechado = toRate(body.spread_global_fechado_percent);
    const calibragem = Number(body.fator_calibragem_global);
    const mapeBoa = Number(body.backtest_mape_boa_percent);
    const mapeAtencao = Number(body.backtest_mape_atencao_percent);
    const validations = [
      validateRate("IOF Cart\xE3o", iofCartao),
      validateRate("IOF Global", iofGlobal),
      validateRate("Spread Cart\xE3o", spreadCartao),
      validateRate("Spread Global Aberto", spreadAberto),
      validateRate("Spread Global Fechado", spreadFechado),
      !Number.isFinite(calibragem) || calibragem <= 0 ? "Fator de calibragem deve ser maior que 0." : null,
      !Number.isFinite(mapeBoa) || mapeBoa < 0 || mapeBoa > 100 ? "MAPE Boa inv\xE1lido." : null,
      !Number.isFinite(mapeAtencao) || mapeAtencao < 0 || mapeAtencao > 100 ? "MAPE Aten\xE7\xE3o inv\xE1lido." : null,
      Number.isFinite(mapeBoa) && Number.isFinite(mapeAtencao) && mapeAtencao <= mapeBoa ? "MAPE Aten\xE7\xE3o deve ser maior que MAPE Boa." : null
    ].filter(Boolean);
    if (validations.length) {
      return json11({ ok: false, error: validations[0], ...trace3 }, 400);
    }
    const values = {
      iof_cartao: Number(iofCartao),
      iof_global: Number(iofGlobal),
      spread_cartao: Number(spreadCartao),
      spread_global_aberto: Number(spreadAberto),
      spread_global_fechado: Number(spreadFechado),
      fator_calibragem_global: calibragem,
      backtest_mape_boa_percent: mapeBoa,
      backtest_mape_atencao_percent: mapeAtencao
    };
    const atuais = await readLatestParams(db);
    const mudancas = Object.entries(values).filter(([chave, valorNovo]) => !Number.isFinite(atuais[chave]) || Number(atuais[chave]) !== Number(valorNovo)).map(([chave, valorNovo]) => ({
      chave,
      valorAnterior: Number.isFinite(atuais[chave]) ? atuais[chave] : null,
      valorNovo
    }));
    for (const [chave, valor] of Object.entries(values)) {
      await db.prepare("INSERT INTO itau_parametros_customizados (chave, valor) VALUES (?, ?)").bind(chave, String(valor)).run();
    }
    for (const mudanca of mudancas) {
      await db.prepare(`
        INSERT INTO itau_parametros_auditoria (created_at, admin_email, chave, valor_anterior, valor_novo, origem)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        Date.now(),
        adminActor,
        mudanca.chave,
        mudanca.valorAnterior == null ? null : String(mudanca.valorAnterior),
        String(mudanca.valorNovo),
        "admin-app"
      ).run();
    }
    if (env2.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(env2.BIGDATA_DB, {
          module: "itau",
          source,
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: "save-parametros",
            adminActor,
            mudancas: mudancas.length,
            chaves: mudancas.map((item) => item.chave)
          }
        });
      } catch {
      }
    }
    return json11({
      ok: true,
      admin_email: adminActor,
      admin_actor: adminActor,
      ...trace3,
      saved_at: (/* @__PURE__ */ new Date()).toISOString(),
      parametros_salvos: values,
      mudancas_registradas: mudancas.length
    });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha ao salvar par\xE2metros do Ita\xFA";
    if (env2.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(env2.BIGDATA_DB, {
          module: "itau",
          source,
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: { action: "save-parametros" }
        });
      } catch {
      }
    }
    return json11({ ok: false, error: message, ...trace3 }, 500);
  }
}
var json11, resolveParametrosDb, resolveOperationalSource4;
var init_parametros = __esm({
  "api/itau/parametros.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_itau_admin();
    init_admin_actor();
    init_request_trace();
    json11 = /* @__PURE__ */ __name((data, status = 200) => new Response(JSON.stringify(data), {
      status,
      headers: toHeaders13()
    }), "json");
    resolveParametrosDb = /* @__PURE__ */ __name((context2) => context2.env.BIGDATA_DB, "resolveParametrosDb");
    resolveOperationalSource4 = /* @__PURE__ */ __name(() => "bigdata_db", "resolveOperationalSource");
    __name(onRequestGet23, "onRequestGet");
    __name(onRequestPost17, "onRequestPost");
  }
});

// api/itau/rate-limit.ts
async function onRequestGet24(context2) {
  const trace3 = createResponseTrace(context2.request);
  const adminActor = resolveAdminActorFromRequest(context2.request);
  const db = resolveRateLimitDb2(context2);
  const source = resolveOperationalSource5(context2);
  if (!db) {
    return json12({ ok: false, error: "Nenhum binding D1 dispon\xEDvel (BIGDATA_DB).", ...trace3 }, 503);
  }
  try {
    const policies = await listPoliciesWithStats2(db);
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "itau",
          source,
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: "read-rate-limit",
            adminActor,
            policies: policies.length
          }
        });
      } catch {
      }
    }
    return json12({
      ok: true,
      admin_email: adminActor,
      admin_actor: adminActor,
      ...trace3,
      policies
    });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha ao carregar painel de rate limit do Ita\xFA";
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "itau",
          source,
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: { action: "read-rate-limit" }
        });
      } catch {
      }
    }
    return json12({ ok: false, error: message, ...trace3 }, 500);
  }
}
async function onRequestPost18(context2) {
  const trace3 = createResponseTrace(context2.request);
  const db = resolveRateLimitDb2(context2);
  const source = resolveOperationalSource5(context2);
  if (!db) {
    return json12({ ok: false, error: "Nenhum binding D1 dispon\xEDvel (BIGDATA_DB).", ...trace3 }, 503);
  }
  try {
    const body = await context2.request.json();
    const adminActor = resolveAdminActorFromRequest(context2.request, body);
    const routeKey = normalizeRoute2(body.route_key);
    if (!routeKey) {
      return json12({ ok: false, error: "Rota de rate limit inv\xE1lida.", ...trace3 }, 400);
    }
    const action = String(body.action ?? "update").trim();
    if (action === "restore_default") {
      await resetRateLimitPolicy2(db, routeKey, adminActor);
      const policies2 = await listPoliciesWithStats2(db);
      if (context2.env.BIGDATA_DB) {
        try {
          await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
            module: "itau",
            source,
            fallbackUsed: false,
            ok: true,
            metadata: {
              action: "restore-rate-limit-default",
              routeKey,
              adminActor
            }
          });
        } catch {
        }
      }
      return json12({ ok: true, action: "restore_default", policies: policies2, admin_actor: adminActor, ...trace3 });
    }
    const enabled = body.enabled ? 1 : 0;
    const maxRequests = toPositiveInt3(body.max_requests, 2);
    const windowMinutes = toPositiveInt3(body.window_minutes, 10);
    if (maxRequests > 5e3 || windowMinutes > 1440) {
      return json12({ ok: false, error: "Par\xE2metros fora da faixa permitida.", ...trace3 }, 400);
    }
    await upsertRateLimitPolicy2(db, {
      routeKey,
      enabled,
      maxRequests,
      windowMinutes,
      updatedBy: adminActor
    });
    const policies = await listPoliciesWithStats2(db);
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "itau",
          source,
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: "save-rate-limit",
            routeKey,
            enabled: enabled === 1,
            maxRequests,
            windowMinutes,
            adminActor
          }
        });
      } catch {
      }
    }
    return json12({ ok: true, action: "update", policies, admin_actor: adminActor, ...trace3 });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha ao salvar painel de rate limit do Ita\xFA";
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "itau",
          source,
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: { action: "save-rate-limit" }
        });
      } catch {
      }
    }
    return json12({ ok: false, error: message, ...trace3 }, 500);
  }
}
var json12, normalizeRoute2, toPositiveInt3, resolveRateLimitDb2, resolveOperationalSource5;
var init_rate_limit2 = __esm({
  "api/itau/rate-limit.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_itau_admin();
    init_admin_actor();
    init_request_trace();
    json12 = /* @__PURE__ */ __name((data, status = 200) => new Response(JSON.stringify(data), {
      status,
      headers: toHeaders13()
    }), "json");
    normalizeRoute2 = /* @__PURE__ */ __name((value) => {
      const route = String(value ?? "").trim();
      if (SUPPORTED_ROUTES2.includes(route)) {
        return route;
      }
      return null;
    }, "normalizeRoute");
    toPositiveInt3 = /* @__PURE__ */ __name((value, fallback) => {
      const parsed = Number.parseInt(String(value), 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
      }
      return parsed;
    }, "toPositiveInt");
    resolveRateLimitDb2 = /* @__PURE__ */ __name((context2) => context2.env.BIGDATA_DB, "resolveRateLimitDb");
    resolveOperationalSource5 = /* @__PURE__ */ __name(() => "bigdata_db", "resolveOperationalSource");
    __name(onRequestGet24, "onRequestGet");
    __name(onRequestPost18, "onRequestPost");
  }
});

// api/itau/sync.ts
async function onRequestPost19(context2) {
  const { request, env: env2 } = context2;
  if (!env2.BIGDATA_DB) {
    return new Response(JSON.stringify({
      ok: false,
      error: "BIGDATA_DB n\xE3o configurado no runtime."
    }), {
      status: 503,
      headers: toHeaders14()
    });
  }
  const url = new URL(request.url);
  const limit = parseLimit2(url.searchParams.get("limit"));
  const startedAt = Date.now();
  const syncRunId = await startSyncRun(env2.BIGDATA_DB, {
    module: "itau",
    status: "running",
    startedAt,
    metadata: { limit }
  });
  try {
    const [observSource, rateLimitSource] = await Promise.all([
      env2.BIGDATA_DB.prepare(`
        SELECT created_at, status, from_cache, force_refresh, duration_ms, moeda, valor_original, preview, error_message
        FROM itau_oraculo_observabilidade
        ORDER BY created_at DESC
        LIMIT ?
      `).bind(limit).all(),
      env2.BIGDATA_DB.prepare(`
        SELECT route_key, enabled, max_requests, window_minutes, updated_at, updated_by
        FROM itau_rate_limit_policies
      `).all()
    ]);
    const observabilidadeRows = parseObservabilidadeRows(observSource.results ?? [], limit);
    const rateLimitRows = parseRateLimitPolicies(rateLimitSource.results ?? []);
    let observabilidadeInserted = 0;
    let rateLimitUpserted = 0;
    for (const row of observabilidadeRows) {
      const alreadyExists = await existsObservabilidade(env2.BIGDATA_DB, row);
      if (alreadyExists) {
        continue;
      }
      await env2.BIGDATA_DB.prepare(`
        INSERT INTO itau_oraculo_observabilidade (
          created_at,
          status,
          from_cache,
          force_refresh,
          duration_ms,
          moeda,
          valor_original,
          preview,
          error_message,
          app_version
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        row.createdAt,
        row.status,
        row.fromCache,
        row.forceRefresh,
        row.durationMs,
        row.moeda,
        row.valorOriginal,
        row.preview,
        row.errorMessage,
        row.appVersion
      ).run();
      observabilidadeInserted += 1;
    }
    for (const row of rateLimitRows) {
      await env2.BIGDATA_DB.prepare(`
        INSERT INTO itau_rate_limit_policies (
          route_key,
          enabled,
          max_requests,
          window_minutes,
          updated_at,
          updated_by
        )
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(route_key) DO UPDATE SET
          enabled = excluded.enabled,
          max_requests = excluded.max_requests,
          window_minutes = excluded.window_minutes,
          updated_at = excluded.updated_at,
          updated_by = excluded.updated_by
      `).bind(
        row.routeKey,
        row.enabled,
        row.maxRequests,
        row.windowMinutes,
        row.updatedAt,
        row.updatedBy
      ).run();
      rateLimitUpserted += 1;
    }
    const recordsRead = observabilidadeRows.length + rateLimitRows.length;
    const recordsUpserted = observabilidadeInserted + rateLimitUpserted;
    await finishSyncRun(env2.BIGDATA_DB, {
      id: syncRunId,
      status: "success",
      finishedAt: Date.now(),
      recordsRead,
      recordsUpserted
    });
    await logModuleOperationalEvent(env2.BIGDATA_DB, {
      module: "itau",
      source: "bigdata_db",
      fallbackUsed: false,
      ok: true,
      metadata: {
        action: "sync",
        limit,
        observabilidadeLidas: observabilidadeRows.length,
        observabilidadeInseridas: observabilidadeInserted,
        rateLimitLidas: rateLimitRows.length,
        rateLimitUpserted
      }
    });
    return new Response(JSON.stringify({
      ok: true,
      syncRunId,
      recordsRead,
      recordsUpserted,
      observabilidade: {
        lidas: observabilidadeRows.length,
        inseridas: observabilidadeInserted
      },
      rateLimit: {
        lidas: rateLimitRows.length,
        upserted: rateLimitUpserted
      },
      startedAt,
      finishedAt: Date.now()
    }), {
      headers: toHeaders14()
    });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha inesperada no sync do Ita\xFA";
    await finishSyncRun(env2.BIGDATA_DB, {
      id: syncRunId,
      status: "error",
      finishedAt: Date.now(),
      recordsRead: 0,
      recordsUpserted: 0,
      errorMessage: message
    });
    await logModuleOperationalEvent(env2.BIGDATA_DB, {
      module: "itau",
      source: "bigdata_db",
      fallbackUsed: false,
      ok: false,
      errorMessage: message,
      metadata: {
        action: "sync",
        limit
      }
    });
    return new Response(JSON.stringify({
      ok: false,
      error: message,
      syncRunId
    }), {
      status: 500,
      headers: toHeaders14()
    });
  }
}
var parseLimit2, toHeaders14, parseObservabilidadeRows, parseRateLimitPolicies, existsObservabilidade;
var init_sync2 = __esm({
  "api/itau/sync.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    parseLimit2 = /* @__PURE__ */ __name((rawValue) => {
      const parsed = Number.parseInt(rawValue ?? "300", 10);
      if (!Number.isFinite(parsed)) {
        return 300;
      }
      return Math.min(1e3, Math.max(1, parsed));
    }, "parseLimit");
    toHeaders14 = /* @__PURE__ */ __name(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    parseObservabilidadeRows = /* @__PURE__ */ __name((sourceRows, limit) => {
      const source = Array.isArray(sourceRows) ? sourceRows : [];
      const rows = [];
      for (const item of source.slice(0, limit)) {
        const createdAt = Number(item.created_at);
        const status = String(item.status ?? "").trim();
        if (!Number.isFinite(createdAt) || !status) {
          continue;
        }
        rows.push({
          createdAt,
          status,
          fromCache: Number(item.from_cache) === 1 || item.from_cache === true ? 1 : 0,
          forceRefresh: Number(item.force_refresh) === 1 || item.force_refresh === true ? 1 : 0,
          durationMs: Number.isFinite(Number(item.duration_ms)) ? Number(item.duration_ms) : null,
          moeda: typeof item.moeda === "string" && item.moeda.trim().length > 0 ? item.moeda.trim().toUpperCase() : null,
          valorOriginal: Number.isFinite(Number(item.valor_original)) ? Number(item.valor_original) : null,
          preview: typeof item.preview === "string" && item.preview.trim().length > 0 ? item.preview.trim() : null,
          errorMessage: typeof item.error_message === "string" && item.error_message.trim().length > 0 ? item.error_message.trim() : null,
          appVersion: "legacy-sync"
        });
      }
      return rows;
    }, "parseObservabilidadeRows");
    parseRateLimitPolicies = /* @__PURE__ */ __name((sourceRows) => {
      const source = Array.isArray(sourceRows) ? sourceRows : [];
      const now = Date.now();
      return source.map((item) => {
        const routeKey = String(item.route_key ?? "").trim();
        const maxRequests = Number(item.max_requests);
        const windowMinutes = Number(item.window_minutes);
        const updatedAt = Number(item.updated_at);
        if (!routeKey || !Number.isFinite(maxRequests) || !Number.isFinite(windowMinutes)) {
          return null;
        }
        return {
          routeKey,
          enabled: Number(item.enabled) === 1 || item.enabled === true ? 1 : 0,
          maxRequests: Math.max(1, Math.trunc(maxRequests)),
          windowMinutes: Math.max(1, Math.trunc(windowMinutes)),
          updatedAt: Number.isFinite(updatedAt) ? Math.trunc(updatedAt) : now,
          updatedBy: typeof item.updated_by === "string" && item.updated_by.trim().length > 0 ? item.updated_by.trim() : null
        };
      }).filter((item) => item !== null);
    }, "parseRateLimitPolicies");
    existsObservabilidade = /* @__PURE__ */ __name(async (db, row) => {
      const existing = await db.prepare(`
    SELECT id
    FROM itau_oraculo_observabilidade
    WHERE
      created_at = ?
      AND status = ?
      AND IFNULL(moeda, '') = IFNULL(?, '')
      AND IFNULL(preview, '') = IFNULL(?, '')
      AND IFNULL(error_message, '') = IFNULL(?, '')
    LIMIT 1
  `).bind(row.createdAt, row.status, row.moeda, row.preview, row.errorMessage).first();
      return Number.isFinite(Number(existing?.id));
    }, "existsObservabilidade");
    __name(onRequestPost19, "onRequestPost");
  }
});

// api/_lib/mainsite-admin.ts
var toHeaders15;
var init_mainsite_admin = __esm({
  "api/_lib/mainsite-admin.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    toHeaders15 = /* @__PURE__ */ __name(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
  }
});

// api/mainsite/fees.ts
async function onRequestGet25(context2) {
  const trace3 = createResponseTrace(context2.request);
  try {
    const db = context2.env.BIGDATA_DB;
    if (!db) throw new Error("BIGDATA_DB n\xE3o configurado.");
    const row = await db.prepare("SELECT payload FROM mainsite_settings WHERE id = ? LIMIT 1").bind(FEES_KEY).first();
    let fees = DEFAULT_FEES;
    if (row?.payload) {
      try {
        const parsed = JSON.parse(row.payload);
        fees = {
          sumupRate: typeof parsed.sumupRate === "number" ? parsed.sumupRate : DEFAULT_FEES.sumupRate,
          sumupFixed: typeof parsed.sumupFixed === "number" ? parsed.sumupFixed : DEFAULT_FEES.sumupFixed,
          mpRate: typeof parsed.mpRate === "number" ? parsed.mpRate : DEFAULT_FEES.mpRate,
          mpFixed: typeof parsed.mpFixed === "number" ? parsed.mpFixed : DEFAULT_FEES.mpFixed
        };
      } catch {
      }
    }
    return new Response(JSON.stringify({ ok: true, fees, ...trace3 }), { headers: toHeaders15() });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha ao ler configura\xE7\xE3o de taxas.";
    return new Response(JSON.stringify({ ok: false, error: message, ...trace3 }), { status: 500, headers: toHeaders15() });
  }
}
async function onRequestPost20(context2) {
  const trace3 = createResponseTrace(context2.request);
  try {
    const db = context2.env.BIGDATA_DB;
    if (!db) throw new Error("BIGDATA_DB n\xE3o configurado.");
    const body = await context2.request.json();
    const fees = {
      sumupRate: typeof body.sumupRate === "number" && body.sumupRate >= 0 && body.sumupRate < 1 ? body.sumupRate : DEFAULT_FEES.sumupRate,
      sumupFixed: typeof body.sumupFixed === "number" && body.sumupFixed >= 0 ? body.sumupFixed : DEFAULT_FEES.sumupFixed,
      mpRate: typeof body.mpRate === "number" && body.mpRate >= 0 && body.mpRate < 1 ? body.mpRate : DEFAULT_FEES.mpRate,
      mpFixed: typeof body.mpFixed === "number" && body.mpFixed >= 0 ? body.mpFixed : DEFAULT_FEES.mpFixed
    };
    await db.prepare(`
      INSERT INTO mainsite_settings (id, payload, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(id) DO UPDATE SET
        payload = excluded.payload,
        updated_at = CURRENT_TIMESTAMP
    `).bind(FEES_KEY, JSON.stringify(fees)).run();
    try {
      await logModuleOperationalEvent(db, {
        module: "mainsite",
        source: "bigdata_db",
        fallbackUsed: false,
        ok: true,
        metadata: {
          action: "save-fee-config",
          fees
        }
      });
    } catch {
    }
    return new Response(JSON.stringify({ ok: true, fees, ...trace3 }), { headers: toHeaders15() });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha ao salvar configura\xE7\xE3o de taxas.";
    return new Response(JSON.stringify({ ok: false, error: message, ...trace3 }), { status: 500, headers: toHeaders15() });
  }
}
var DEFAULT_FEES, FEES_KEY;
var init_fees = __esm({
  "api/mainsite/fees.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_mainsite_admin();
    init_request_trace();
    DEFAULT_FEES = {
      sumupRate: 0.0267,
      sumupFixed: 0,
      mpRate: 0.0499,
      mpFixed: 0.4
    };
    FEES_KEY = "mainsite/fees";
    __name(onRequestGet25, "onRequestGet");
    __name(onRequestPost20, "onRequestPost");
  }
});

// api/mainsite/migrate-media-urls.ts
var EXTERNAL_MEDIA_PATTERN, INTERNAL_MEDIA_PREFIX, onRequestPost21;
var init_migrate_media_urls = __esm({
  "api/mainsite/migrate-media-urls.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    EXTERNAL_MEDIA_PATTERN = /https:\/\/mainsite-app\.lcv\.rio\.br\/api\/uploads\//g;
    INTERNAL_MEDIA_PREFIX = "/api/mainsite/media/";
    onRequestPost21 = /* @__PURE__ */ __name(async (context2) => {
      const db = context2.env.BIGDATA_DB;
      if (!db) {
        return Response.json({ ok: false, error: "BIGDATA_DB n\xE3o configurado." }, { status: 503 });
      }
      try {
        const { results } = await db.prepare(
          "SELECT id, content FROM mainsite_posts WHERE content LIKE '%mainsite-app.lcv.rio.br/api/uploads/%'"
        ).all();
        const posts = results ?? [];
        if (posts.length === 0) {
          return Response.json({
            ok: true,
            message: "Nenhum post cont\xE9m URLs externas de m\xEDdia. Nada a migrar.",
            postsAffected: 0
          });
        }
        const migrated = [];
        for (const post of posts) {
          const matches = post.content.match(EXTERNAL_MEDIA_PATTERN);
          const replacements = matches ? matches.length : 0;
          if (replacements === 0) continue;
          const newContent = post.content.replace(EXTERNAL_MEDIA_PATTERN, INTERNAL_MEDIA_PREFIX);
          await db.prepare(
            "UPDATE mainsite_posts SET content = ? WHERE id = ?"
          ).bind(newContent, post.id).run();
          migrated.push({ id: post.id, replacements });
        }
        return Response.json({
          ok: true,
          postsAffected: migrated.length,
          totalReplacements: migrated.reduce((sum, m) => sum + m.replacements, 0),
          details: migrated
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro desconhecido na migra\xE7\xE3o.";
        return Response.json({ ok: false, error: message }, { status: 500 });
      }
    }, "onRequestPost");
  }
});

// api/mainsite/modelos.ts
function json13(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
var onRequestGet26;
var init_modelos3 = __esm({
  "api/mainsite/modelos.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name(json13, "json");
    onRequestGet26 = /* @__PURE__ */ __name(async ({ env: env2 }) => {
      const apiKey = env2?.GEMINI_API_KEY;
      if (!apiKey) return json13({ ok: false, error: "GEMINI_API_KEY n\xE3o configurada." }, 503);
      try {
        const [v1Res, v1betaRes] = await Promise.allSettled([
          fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`),
          fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
        ]);
        const allModels = /* @__PURE__ */ new Map();
        for (const [apiLabel, result] of [["v1", v1Res], ["v1beta", v1betaRes]]) {
          if (result.status !== "fulfilled" || !result.value.ok) continue;
          const data = await result.value.json();
          if (!data.models) continue;
          for (const m of data.models) {
            const id = m.name.replace("models/", "");
            const lower = id.toLowerCase();
            const isFlashOrPro = lower.includes("flash") || lower.includes("pro");
            const isGemini = lower.startsWith("gemini");
            if (!isGemini || !isFlashOrPro) continue;
            const supportsGenerate = m.supportedGenerationMethods?.includes("generateContent") ?? false;
            if (!supportsGenerate) continue;
            const hasVision = lower.includes("vision") || lower.includes("pro") || lower.includes("flash");
            if (!allModels.has(id)) {
              allModels.set(id, {
                id,
                displayName: m.displayName || id,
                api: apiLabel,
                vision: hasVision
              });
            }
          }
        }
        const models = [...allModels.values()].sort((a, b) => {
          const aPreview = a.id.includes("preview") || a.id.includes("exp") ? 1 : 0;
          const bPreview = b.id.includes("preview") || b.id.includes("exp") ? 1 : 0;
          if (aPreview !== bPreview) return aPreview - bPreview;
          const aPro = a.id.includes("pro") ? 0 : 1;
          const bPro = b.id.includes("pro") ? 0 : 1;
          return aPro - bPro || a.id.localeCompare(b.id);
        });
        return json13({ ok: true, models, total: models.length });
      } catch (err) {
        return json13({ ok: false, error: err instanceof Error ? err.message : "Erro ao listar modelos." }, 500);
      }
    }, "onRequestGet");
  }
});

// api/mainsite/overview.ts
async function onRequestGet27(context2) {
  const { request, env: env2 } = context2;
  const trace3 = createResponseTrace(request);
  const url = new URL(request.url);
  const limit = parseLimit3(url.searchParams.get("limit"));
  if (!env2.BIGDATA_DB) {
    return new Response(JSON.stringify({
      ok: false,
      ...trace3,
      error: "BIGDATA_DB n\xE3o configurado no runtime do admin-app.",
      filtros: { limit },
      avisos: ["Leitura de overview do MainSite depende do BIGDATA_DB interno."],
      resumo: {
        totalPosts: 0,
        totalPinned: 0,
        totalFinancialLogs: null,
        totalApprovedFinancialLogs: null
      },
      ultimosPosts: []
    }), {
      status: 503,
      headers: toResponseHeaders3()
    });
  }
  try {
    const payload = await queryBigdata(env2.BIGDATA_DB, limit);
    try {
      await logModuleOperationalEvent(env2.BIGDATA_DB, {
        module: "mainsite",
        source: "bigdata_db",
        fallbackUsed: false,
        ok: true,
        metadata: {
          totalPosts: payload.resumo.totalPosts,
          totalPinned: payload.resumo.totalPinned
        }
      });
    } catch {
    }
    return new Response(JSON.stringify({
      ...payload,
      ...trace3
    }), {
      headers: toResponseHeaders3()
    });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Erro desconhecido no m\xF3dulo MainSite";
    try {
      await logModuleOperationalEvent(env2.BIGDATA_DB, {
        module: "mainsite",
        source: "bigdata_db",
        fallbackUsed: false,
        ok: false,
        errorMessage: message
      });
    } catch {
    }
    return new Response(JSON.stringify({
      ok: false,
      ...trace3,
      error: message,
      filtros: { limit },
      avisos: [],
      resumo: {
        totalPosts: 0,
        totalPinned: 0,
        totalFinancialLogs: null,
        totalApprovedFinancialLogs: null
      },
      ultimosPosts: []
    }), {
      status: 500,
      headers: toResponseHeaders3()
    });
  }
}
var toResponseHeaders3, parseLimit3, mapPost, queryBigdata;
var init_overview3 = __esm({
  "api/mainsite/overview.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_request_trace();
    toResponseHeaders3 = /* @__PURE__ */ __name(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toResponseHeaders");
    parseLimit3 = /* @__PURE__ */ __name((rawValue) => {
      const parsed = Number.parseInt(rawValue ?? "20", 10);
      if (!Number.isFinite(parsed)) {
        return 20;
      }
      return Math.min(50, Math.max(1, parsed));
    }, "parseLimit");
    mapPost = /* @__PURE__ */ __name((post) => {
      const id = Number(post.id);
      const title2 = String(post.title ?? "").trim();
      const createdAt = String(post.created_at ?? "").trim();
      const isPinned = Number(post.is_pinned ?? 0) === 1;
      if (!Number.isFinite(id) || !title2 || !createdAt) {
        return null;
      }
      return {
        id,
        title: title2,
        createdAt,
        isPinned
      };
    }, "mapPost");
    queryBigdata = /* @__PURE__ */ __name(async (db, limit) => {
      const [totalPostsRow, totalPinnedRow, latestRows] = await Promise.all([
        db.prepare("SELECT COUNT(1) AS total FROM mainsite_posts").first(),
        db.prepare("SELECT COUNT(1) AS total FROM mainsite_posts WHERE is_pinned = 1").first(),
        db.prepare("SELECT id, title, created_at, is_pinned FROM mainsite_posts ORDER BY is_pinned DESC, display_order ASC, created_at DESC LIMIT ?").bind(limit).all()
      ]);
      const ultimosPosts = (latestRows.results ?? []).map((row) => mapPost(row)).filter((item) => item !== null);
      return {
        ok: true,
        fonte: "bigdata_db",
        filtros: { limit },
        avisos: [],
        resumo: {
          totalPosts: Number(totalPostsRow?.total ?? 0),
          totalPinned: Number(totalPinnedRow?.total ?? 0),
          totalFinancialLogs: null,
          totalApprovedFinancialLogs: null
        },
        ultimosPosts
      };
    }, "queryBigdata");
    __name(onRequestGet27, "onRequestGet");
  }
});

// api/mainsite/post-summaries.ts
function stripHtml(html) {
  return html.replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ").trim();
}
async function hashContent(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function extractTextFromParts2(parts) {
  return (parts || []).filter((p) => p.text && !p.thought).map((p) => p.text).join("");
}
function extractJsonFromText(rawText) {
  let str = rawText.trim();
  const fenceMatch = str.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fenceMatch) str = fenceMatch[1].trim();
  if (!str.startsWith("{")) {
    const objMatch = str.match(/\{[\s\S]*\}/);
    if (objMatch) str = objMatch[0];
  }
  return str;
}
async function generateShareSummary(title2, htmlContent, apiKey, model) {
  const resolvedModel = model || DEFAULT_GEMINI_MODEL;
  const cleanContent = stripHtml(htmlContent).substring(0, 3e3);
  const prompt = `Voc\xEA \xE9 um editor especializado em SEO e compartilhamento social.
Dado o t\xEDtulo e o conte\xFAdo de um artigo/post, gere DOIS resumos em portugu\xEAs brasileiro:

1. **summary_og** (m\xE1x. 160 caracteres): descri\xE7\xE3o curta, factual e envolvente para Open Graph (og:description). Deve ser atrativa para clique em WhatsApp, Facebook, Twitter.
2. **summary_ld** (m\xE1x. 300 caracteres): descri\xE7\xE3o mais completa para Schema.org/JSON-LD. Deve capturar o tema central e contexto do artigo.

REGRAS:
- Mantenha tom neutro/informativo, sem clickbait exagerado.
- N\xE3o inclua o t\xEDtulo no resumo \u2014 ele j\xE1 aparece separadamente.
- Retorne APENAS JSON v\xE1lido no formato: {"summary_og": "...", "summary_ld": "..."}
- Sem markdown, sem explica\xE7\xF5es, sem texto adicional.

T\xCDTULO: ${title2}
CONTE\xDADO: ${cleanContent}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${resolvedModel}:generateContent?key=${apiKey}`;
  const MAX_RETRIES = 2;
  const RETRY_DELAY = 800;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        safetySettings: SUMMARY_SAFETY_SETTINGS,
        generationConfig: {
          temperature: 0.3,
          topP: 0.8,
          maxOutputTokens: 1024,
          responseMimeType: "application/json",
          // v1beta: Thinking Model Support
          ...attempt === 0 ? { thinkingConfig: { thinkingLevel: "LOW" } } : {}
        }
      };
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errBody = await res.text().catch(() => "(no body)");
        if (attempt === 0 && (res.status === 400 || res.status === 404)) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY));
          continue;
        }
        return { error: `Gemini API ${res.status} (attempt ${attempt + 1}): ${errBody.substring(0, 200)}` };
      }
      const data = await res.json();
      const candidates = data.candidates;
      const rawText = extractTextFromParts2(candidates?.[0]?.content?.parts);
      if (!rawText) {
        const preview = JSON.stringify(data).substring(0, 300);
        return { error: `Gemini sem texto \xFAtil (attempt ${attempt + 1}). Modelo: ${resolvedModel}. Resposta: ${preview}` };
      }
      const jsonStr = extractJsonFromText(rawText);
      const parsed = JSON.parse(jsonStr);
      if (!parsed.summary_og) {
        return { error: `JSON sem summary_og. Raw: ${rawText.substring(0, 150)}` };
      }
      return {
        summary_og: parsed.summary_og.substring(0, 200),
        summary_ld: (parsed.summary_ld || parsed.summary_og).substring(0, 300)
      };
    } catch (err) {
      if (attempt === 0) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY));
        continue;
      }
      return { error: `Exception (attempt ${attempt + 1}): ${err instanceof Error ? err.message : String(err)}` };
    }
  }
  return { error: "Gemini API falhou ap\xF3s todas as tentativas." };
}
async function ensureTable2(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS mainsite_post_ai_summaries (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id      INTEGER NOT NULL UNIQUE,
      summary_og   TEXT NOT NULL,
      summary_ld   TEXT,
      content_hash TEXT NOT NULL,
      model        TEXT DEFAULT '',
      is_manual    INTEGER DEFAULT 0,
      created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at   DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
  const migrations = [
    `ALTER TABLE mainsite_post_ai_summaries ADD COLUMN is_manual INTEGER DEFAULT 0`,
    `ALTER TABLE mainsite_post_ai_summaries ADD COLUMN content_hash TEXT DEFAULT ''`,
    `ALTER TABLE mainsite_post_ai_summaries ADD COLUMN model TEXT DEFAULT ''`
  ];
  for (const sql of migrations) {
    try {
      await db.prepare(sql).run();
    } catch {
    }
  }
}
async function onRequestGet28(context2) {
  const trace3 = createResponseTrace(context2.request);
  try {
    const db = context2.env.BIGDATA_DB;
    if (!db) return json14({ ok: false, error: "BIGDATA_DB n\xE3o configurado.", ...trace3 }, 500);
    await ensureTable2(db);
    const { results } = await db.prepare(`
      SELECT s.*, p.title AS post_title
      FROM mainsite_post_ai_summaries s
      LEFT JOIN mainsite_posts p ON p.id = s.post_id
      ORDER BY s.updated_at DESC
    `).all();
    const { results: allPosts } = await db.prepare(
      "SELECT id, title FROM mainsite_posts ORDER BY id ASC"
    ).all();
    const summaryPostIds = new Set((results || []).map((s) => s.post_id));
    const postsWithout = (allPosts || []).filter((p) => !summaryPostIds.has(p.id));
    return json14({
      ok: true,
      summaries: results || [],
      postsWithoutSummary: postsWithout,
      totalPosts: (allPosts || []).length,
      ...trace3
    });
  } catch (error3) {
    return json14({ ok: false, error: error3 instanceof Error ? error3.message : "Erro ao listar resumos.", ...trace3 }, 500);
  }
}
async function onRequestPost22(context2) {
  const trace3 = createResponseTrace(context2.request);
  try {
    const db = context2.env.BIGDATA_DB;
    if (!db) return json14({ ok: false, error: "BIGDATA_DB n\xE3o configurado.", ...trace3 }, 500);
    await ensureTable2(db);
    const body = await context2.request.json();
    const apiKey = context2.env.GEMINI_API_KEY;
    if (body.action === "generate-all") {
      if (!apiKey) return json14({ ok: false, error: "GEMINI_API_KEY n\xE3o configurada.", ...trace3 }, 503);
      const mode = body.mode || "missing";
      const { results: allPosts } = await db.prepare(
        "SELECT id, title, content FROM mainsite_posts ORDER BY id ASC"
      ).all();
      if (!allPosts || allPosts.length === 0) {
        return json14({ ok: true, generated: 0, skipped: 0, failed: 0, total: 0, details: [], ...trace3 });
      }
      const { results: existingSummaries } = await db.prepare(
        "SELECT post_id, content_hash, is_manual FROM mainsite_post_ai_summaries"
      ).all();
      const summaryMap = /* @__PURE__ */ new Map();
      for (const s of existingSummaries || []) {
        summaryMap.set(s.post_id, { content_hash: s.content_hash, is_manual: s.is_manual });
      }
      let generated = 0;
      let skipped = 0;
      let failed = 0;
      const details = [];
      for (const post of allPosts) {
        const cleanContent = stripHtml(post.content);
        const newHash = await hashContent(cleanContent);
        const existing = summaryMap.get(post.id);
        if (existing?.is_manual === 1) {
          skipped++;
          details.push({ postId: post.id, title: post.title, status: "skipped_manual" });
          continue;
        }
        if (mode === "missing" && existing && existing.content_hash === newHash) {
          skipped++;
          details.push({ postId: post.id, title: post.title, status: "skipped_unchanged" });
          continue;
        }
        if (cleanContent.length < 50) {
          skipped++;
          details.push({ postId: post.id, title: post.title, status: "skipped_too_short" });
          continue;
        }
        try {
          const result = await generateShareSummary(post.title, post.content, apiKey, body.model);
          if ("error" in result) {
            failed++;
            details.push({ postId: post.id, title: post.title, status: result.error });
            continue;
          }
          const usedModel = body.model || DEFAULT_GEMINI_MODEL;
          await db.prepare(`
            INSERT INTO mainsite_post_ai_summaries (post_id, summary_og, summary_ld, content_hash, is_manual, model, updated_at)
            VALUES (?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(post_id) DO UPDATE SET
              summary_og = excluded.summary_og,
              summary_ld = excluded.summary_ld,
              content_hash = excluded.content_hash,
              is_manual = 0,
              model = excluded.model,
              updated_at = CURRENT_TIMESTAMP
          `).bind(post.id, result.summary_og, result.summary_ld, newHash, usedModel).run();
          generated++;
          details.push({ postId: post.id, title: post.title, status: "generated" });
        } catch (err) {
          failed++;
          details.push({ postId: post.id, title: post.title, status: `error: ${err instanceof Error ? err.message : "unknown"}` });
        }
      }
      try {
        await logModuleOperationalEvent(db, {
          module: "mainsite",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: true,
          metadata: { action: "generate-all-summaries", generated, skipped, failed }
        });
      } catch {
      }
      return json14({ ok: true, generated, skipped, failed, total: allPosts.length, details, ...trace3 });
    }
    if (body.action === "regenerate") {
      if (!apiKey) return json14({ ok: false, error: "GEMINI_API_KEY n\xE3o configurada.", ...trace3 }, 503);
      if (!body.postId) return json14({ ok: false, error: "postId \xE9 obrigat\xF3rio.", ...trace3 }, 400);
      const post = await db.prepare(
        "SELECT id, title, content FROM mainsite_posts WHERE id = ?"
      ).bind(body.postId).first();
      if (!post) return json14({ ok: false, error: "Post n\xE3o encontrado.", ...trace3 }, 404);
      const result = await generateShareSummary(post.title, post.content, apiKey, body.model);
      if ("error" in result) return json14({ ok: false, error: result.error, ...trace3 }, 502);
      const contentHash = await hashContent(stripHtml(post.content));
      const usedModel = body.model || DEFAULT_GEMINI_MODEL;
      await db.prepare(`
        INSERT INTO mainsite_post_ai_summaries (post_id, summary_og, summary_ld, content_hash, is_manual, model, updated_at)
        VALUES (?, ?, ?, ?, 0, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(post_id) DO UPDATE SET
          summary_og = excluded.summary_og,
          summary_ld = excluded.summary_ld,
          content_hash = excluded.content_hash,
          is_manual = 0,
          model = excluded.model,
          updated_at = CURRENT_TIMESTAMP
      `).bind(body.postId, result.summary_og, result.summary_ld, contentHash, usedModel).run();
      return json14({ ok: true, ...result, ...trace3 });
    }
    if (body.action === "edit") {
      if (!body.postId) return json14({ ok: false, error: "postId \xE9 obrigat\xF3rio.", ...trace3 }, 400);
      if (!body.summary_og?.trim()) return json14({ ok: false, error: "summary_og \xE9 obrigat\xF3rio.", ...trace3 }, 400);
      const post = await db.prepare(
        "SELECT content FROM mainsite_posts WHERE id = ?"
      ).bind(body.postId).first();
      if (!post) return json14({ ok: false, error: "Post n\xE3o encontrado.", ...trace3 }, 404);
      const contentHash = await hashContent(stripHtml(post.content));
      await db.prepare(`
        INSERT INTO mainsite_post_ai_summaries (post_id, summary_og, summary_ld, content_hash, is_manual, updated_at)
        VALUES (?, ?, ?, ?, 1, CURRENT_TIMESTAMP)
        ON CONFLICT(post_id) DO UPDATE SET
          summary_og = excluded.summary_og,
          summary_ld = excluded.summary_ld,
          content_hash = excluded.content_hash,
          is_manual = 1,
          updated_at = CURRENT_TIMESTAMP
      `).bind(
        body.postId,
        body.summary_og.trim().substring(0, 200),
        (body.summary_ld || body.summary_og).trim().substring(0, 300),
        contentHash
      ).run();
      return json14({ ok: true, ...trace3 });
    }
    return json14({ ok: false, error: `A\xE7\xE3o desconhecida: ${body.action}`, ...trace3 }, 400);
  } catch (error3) {
    return json14({ ok: false, error: error3 instanceof Error ? error3.message : "Erro no endpoint de resumos.", ...trace3 }, 500);
  }
}
var DEFAULT_GEMINI_MODEL, SUMMARY_SAFETY_SETTINGS, json14;
var init_post_summaries = __esm({
  "api/mainsite/post-summaries.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_mainsite_admin();
    init_operational();
    init_request_trace();
    __name(stripHtml, "stripHtml");
    __name(hashContent, "hashContent");
    DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
    SUMMARY_SAFETY_SETTINGS = [
      { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_ONLY_HIGH" },
      { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_ONLY_HIGH" }
    ];
    __name(extractTextFromParts2, "extractTextFromParts");
    __name(extractJsonFromText, "extractJsonFromText");
    __name(generateShareSummary, "generateShareSummary");
    __name(ensureTable2, "ensureTable");
    json14 = /* @__PURE__ */ __name((data, status = 200) => new Response(JSON.stringify(data), { status, headers: toHeaders15() }), "json");
    __name(onRequestGet28, "onRequestGet");
    __name(onRequestPost22, "onRequestPost");
  }
});

// api/mainsite/posts.ts
async function onRequestGet29(context2) {
  const { request } = context2;
  const trace3 = createResponseTrace(request);
  const url = new URL(request.url);
  const id = parseId(url.searchParams.get("id"));
  try {
    const db = requireDb(context2.env);
    if (id) {
      await ensureAuthorColumn(db);
      const row = await db.prepare(`
        SELECT id, title, content, author, created_at, updated_at, is_pinned
        FROM mainsite_posts
        WHERE id = ?
        LIMIT 1
      `).bind(id).first();
      const post = row ? mapPostRow(row) : null;
      if (!post) {
        return buildErrorResponse3("Post n\xE3o encontrado para o ID informado.", trace3, 404);
      }
      return new Response(JSON.stringify({ ok: true, post, ...trace3 }), {
        headers: toHeaders15()
      });
    }
    await ensureAuthorColumn(db);
    const rows = await db.prepare(`
      SELECT id, title, content, author, created_at, updated_at, is_pinned
      FROM mainsite_posts
      ORDER BY is_pinned DESC, display_order ASC, created_at DESC
    `).all();
    const posts = (rows.results ?? []).map((row) => mapPostRow(row)).filter((item) => item !== null);
    return new Response(JSON.stringify({ ok: true, posts, ...trace3 }), {
      headers: toHeaders15()
    });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha ao consultar posts do MainSite";
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "mainsite",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: id ? "post-detail" : "posts-list"
          }
        });
      } catch {
      }
    }
    return buildErrorResponse3(message, trace3, 500);
  }
}
async function onRequestPost23(context2) {
  const trace3 = createResponseTrace(context2.request);
  try {
    const db = requireDb(context2.env);
    await ensureAuthorColumn(db);
    const body = await context2.request.json();
    const adminActor = resolveAdminActorFromRequest(context2.request, body);
    const title2 = parseText(body.title);
    const content = parseText(body.content);
    const author = parseText(body.author) || DEFAULT_AUTHOR;
    if (!title2 || !content) {
      return buildErrorResponse3("T\xEDtulo e conte\xFAdo s\xE3o obrigat\xF3rios para criar um post.", trace3, 400);
    }
    await db.prepare(`
      INSERT INTO mainsite_posts (title, content, author, is_pinned, display_order, created_at, updated_at)
      VALUES (?, ?, ?, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(title2, content, author).run();
    const created = await db.prepare(`
      SELECT id, title, content, author, created_at, is_pinned
      FROM mainsite_posts
      ORDER BY id DESC
      LIMIT 1
    `).first();
    const createdPost = created ? mapPostRow(created) : null;
    try {
      await logModuleOperationalEvent(db, {
        module: "mainsite",
        source: "bigdata_db",
        fallbackUsed: false,
        ok: true,
        metadata: {
          action: "create-post",
          adminActor,
          createdId: createdPost?.id ?? null,
          titleLength: title2.length
        }
      });
    } catch {
    }
    return new Response(JSON.stringify({
      ok: true,
      post: createdPost,
      admin_actor: adminActor,
      ...trace3
    }), {
      status: 201,
      headers: toHeaders15()
    });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha ao criar post do MainSite";
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "mainsite",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: "create-post"
          }
        });
      } catch {
      }
    }
    return buildErrorResponse3(message, trace3);
  }
}
async function onRequestPut3(context2) {
  const trace3 = createResponseTrace(context2.request);
  try {
    const db = requireDb(context2.env);
    await ensureAuthorColumn(db);
    const body = await context2.request.json();
    const adminActor = resolveAdminActorFromRequest(context2.request, body);
    const id = parseId(body.id);
    const title2 = parseText(body.title);
    const content = parseText(body.content);
    const author = parseText(body.author) || DEFAULT_AUTHOR;
    if (!id || !title2 || !content) {
      return buildErrorResponse3("ID, t\xEDtulo e conte\xFAdo s\xE3o obrigat\xF3rios para atualizar um post.", trace3, 400);
    }
    await db.prepare("UPDATE mainsite_posts SET title = ?, content = ?, author = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(title2, content, author, id).run();
    const row = await db.prepare(`
      SELECT id, title, content, author, created_at, is_pinned
      FROM mainsite_posts
      WHERE id = ?
      LIMIT 1
    `).bind(id).first();
    const updatedPost = row ? mapPostRow(row) : null;
    if (!updatedPost) {
      return buildErrorResponse3("Post n\xE3o encontrado para atualiza\xE7\xE3o.", trace3, 404);
    }
    try {
      await logModuleOperationalEvent(db, {
        module: "mainsite",
        source: "bigdata_db",
        fallbackUsed: false,
        ok: true,
        metadata: {
          action: "update-post",
          adminActor,
          id
        }
      });
    } catch {
    }
    return new Response(JSON.stringify({
      ok: true,
      post: updatedPost,
      admin_actor: adminActor,
      ...trace3
    }), {
      headers: toHeaders15()
    });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha ao atualizar post do MainSite";
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "mainsite",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: "update-post"
          }
        });
      } catch {
      }
    }
    return buildErrorResponse3(message, trace3);
  }
}
async function onRequestDelete3(context2) {
  const trace3 = createResponseTrace(context2.request);
  try {
    const db = requireDb(context2.env);
    const body = await context2.request.json();
    const adminActor = resolveAdminActorFromRequest(context2.request, body);
    const id = parseId(body.id);
    if (!id) {
      return buildErrorResponse3("ID v\xE1lido \xE9 obrigat\xF3rio para excluir um post.", trace3, 400);
    }
    await db.prepare("DELETE FROM mainsite_posts WHERE id = ?").bind(id).run();
    try {
      await logModuleOperationalEvent(db, {
        module: "mainsite",
        source: "bigdata_db",
        fallbackUsed: false,
        ok: true,
        metadata: {
          action: "delete-post",
          adminActor,
          id
        }
      });
    } catch {
    }
    return new Response(JSON.stringify({
      ok: true,
      deletedId: id,
      admin_actor: adminActor,
      ...trace3
    }), {
      headers: toHeaders15()
    });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha ao excluir post do MainSite";
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "mainsite",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: "delete-post"
          }
        });
      } catch {
      }
    }
    return buildErrorResponse3(message, trace3);
  }
}
var parseId, parseText, DEFAULT_AUTHOR, mapPostRow, buildErrorResponse3, requireDb, ensureAuthorColumn;
var init_posts = __esm({
  "api/mainsite/posts.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_mainsite_admin();
    init_admin_actor();
    init_request_trace();
    parseId = /* @__PURE__ */ __name((rawValue) => {
      const parsed = Number(rawValue);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return null;
      }
      return parsed;
    }, "parseId");
    parseText = /* @__PURE__ */ __name((rawValue) => String(rawValue ?? "").trim(), "parseText");
    DEFAULT_AUTHOR = "Leonardo Cardozo Vargas";
    mapPostRow = /* @__PURE__ */ __name((row) => {
      const id = Number(row.id);
      const title2 = String(row.title ?? "").trim();
      const content = String(row.content ?? "").trim();
      const author = String(row.author ?? "").trim() || DEFAULT_AUTHOR;
      const createdAt = String(row.created_at ?? "").trim();
      const updatedAt = row.updated_at ? String(row.updated_at).trim() : null;
      if (!Number.isFinite(id) || !title2 || !content || !createdAt) {
        return null;
      }
      return {
        id,
        title: title2,
        content,
        author,
        created_at: createdAt,
        updated_at: updatedAt,
        is_pinned: Number(row.is_pinned ?? 0) === 1 ? 1 : 0
      };
    }, "mapPostRow");
    buildErrorResponse3 = /* @__PURE__ */ __name((message, trace3, status = 500) => new Response(JSON.stringify({
      ok: false,
      error: message,
      ...trace3
    }), {
      status,
      headers: toHeaders15()
    }), "buildErrorResponse");
    requireDb = /* @__PURE__ */ __name((env2) => {
      if (!env2.BIGDATA_DB) {
        throw new Error("BIGDATA_DB n\xE3o configurado no runtime do admin-app.");
      }
      return env2.BIGDATA_DB;
    }, "requireDb");
    ensureAuthorColumn = /* @__PURE__ */ __name(async (db) => {
      try {
        const info3 = await db.prepare("PRAGMA table_info(mainsite_posts)").all();
        const cols = (info3.results ?? []).map((r) => r.name);
        if (!cols.includes("author")) {
          await db.prepare("ALTER TABLE mainsite_posts ADD COLUMN author TEXT DEFAULT ''").run();
        }
      } catch {
      }
    }, "ensureAuthorColumn");
    __name(onRequestGet29, "onRequestGet");
    __name(onRequestPost23, "onRequestPost");
    __name(onRequestPut3, "onRequestPut");
    __name(onRequestDelete3, "onRequestDelete");
  }
});

// api/mainsite/posts-pin.ts
async function onRequestPost24(context2) {
  const trace3 = createResponseTrace(context2.request);
  try {
    const db = requireDb2(context2.env);
    const body = await context2.request.json();
    const adminActor = resolveAdminActorFromRequest(context2.request, body);
    const id = parseId2(body.id);
    if (!id) {
      return buildErrorResponse4("ID v\xE1lido \xE9 obrigat\xF3rio para alternar fixa\xE7\xE3o do post.", trace3, 400);
    }
    const current = await db.prepare("SELECT is_pinned FROM mainsite_posts WHERE id = ? LIMIT 1").bind(id).first();
    if (!current) {
      return buildErrorResponse4("Post n\xE3o encontrado para alternar fixa\xE7\xE3o.", trace3, 404);
    }
    const nextPinned = Number(current.is_pinned ?? 0) === 1 ? 0 : 1;
    await db.prepare("UPDATE mainsite_posts SET is_pinned = ? WHERE id = ?").bind(nextPinned, id).run();
    try {
      await logModuleOperationalEvent(db, {
        module: "mainsite",
        source: "bigdata_db",
        fallbackUsed: false,
        ok: true,
        metadata: {
          action: "pin-post",
          adminActor,
          id,
          isPinned: nextPinned === 1
        }
      });
    } catch {
    }
    return new Response(JSON.stringify({
      ok: true,
      id,
      isPinned: nextPinned === 1,
      admin_actor: adminActor,
      ...trace3
    }), {
      headers: toHeaders15()
    });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha ao alternar fixa\xE7\xE3o do post do MainSite";
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "mainsite",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: "pin-post"
          }
        });
      } catch {
      }
    }
    return buildErrorResponse4(message, trace3);
  }
}
var parseId2, buildErrorResponse4, requireDb2;
var init_posts_pin = __esm({
  "api/mainsite/posts-pin.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_mainsite_admin();
    init_admin_actor();
    init_request_trace();
    parseId2 = /* @__PURE__ */ __name((rawValue) => {
      const parsed = Number(rawValue);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return null;
      }
      return parsed;
    }, "parseId");
    buildErrorResponse4 = /* @__PURE__ */ __name((message, trace3, status = 500) => new Response(JSON.stringify({
      ok: false,
      error: message,
      ...trace3
    }), {
      status,
      headers: toHeaders15()
    }), "buildErrorResponse");
    requireDb2 = /* @__PURE__ */ __name((env2) => {
      if (!env2.BIGDATA_DB) {
        throw new Error("BIGDATA_DB n\xE3o configurado no runtime do admin-app.");
      }
      return env2.BIGDATA_DB;
    }, "requireDb");
    __name(onRequestPost24, "onRequestPost");
  }
});

// api/mainsite/posts-reorder.ts
async function onRequestPost25(context2) {
  const trace3 = createResponseTrace(context2.request);
  try {
    const db = context2.env.BIGDATA_DB;
    if (!db) {
      return buildErrorResponse5("BIGDATA_DB n\xE3o configurado no runtime.", trace3, 503);
    }
    const body = await context2.request.json();
    const adminActor = resolveAdminActorFromRequest(context2.request, body);
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return buildErrorResponse5("Lista de itens para reordena\xE7\xE3o \xE9 obrigat\xF3ria.", trace3, 400);
    }
    const items = body.items.filter((item) => {
      if (typeof item !== "object" || item === null) return false;
      const obj = item;
      return Number.isInteger(obj.id) && Number.isInteger(obj.display_order);
    });
    if (items.length === 0) {
      return buildErrorResponse5("Nenhum item v\xE1lido para reordena\xE7\xE3o.", trace3, 400);
    }
    for (const item of items) {
      await db.prepare("UPDATE mainsite_posts SET display_order = ? WHERE id = ?").bind(item.display_order, item.id).run();
    }
    try {
      await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
        module: "mainsite",
        source: "bigdata_db",
        fallbackUsed: false,
        ok: true,
        metadata: {
          action: "reorder-posts",
          adminActor,
          itemCount: items.length
        }
      });
    } catch {
    }
    return new Response(JSON.stringify({
      ok: true,
      reordered: items.length,
      admin_actor: adminActor,
      ...trace3
    }), {
      headers: toHeaders15()
    });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha ao reordenar posts do MainSite";
    return buildErrorResponse5(message, trace3);
  }
}
var buildErrorResponse5;
var init_posts_reorder = __esm({
  "api/mainsite/posts-reorder.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_mainsite_admin();
    init_admin_actor();
    init_request_trace();
    buildErrorResponse5 = /* @__PURE__ */ __name((message, trace3, status = 500) => new Response(JSON.stringify({
      ok: false,
      error: message,
      ...trace3
    }), {
      status,
      headers: toHeaders15()
    }), "buildErrorResponse");
    __name(onRequestPost25, "onRequestPost");
  }
});

// api/mainsite/rate-limit.ts
async function onRequestGet30(context2) {
  const trace3 = createResponseTrace(context2.request);
  try {
    const adminActor = resolveAdminActorFromRequest(context2.request);
    const policies = toClientPolicies(await loadLegacyRateLimit(context2));
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "mainsite",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: "read-rate-limit",
            adminActor,
            policies: policies.length
          }
        });
      } catch {
      }
    }
    return json15({ ok: true, policies, admin_actor: adminActor, ...trace3 });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha ao carregar painel de rate limit do MainSite";
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "mainsite",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: { action: "read-rate-limit" }
        });
      } catch {
      }
    }
    return json15({ ok: false, error: message, ...trace3 }, 502);
  }
}
async function onRequestPost26(context2) {
  const trace3 = createResponseTrace(context2.request);
  try {
    const body = await context2.request.json();
    const adminActor = resolveAdminActorFromRequest(context2.request, body);
    const route = normalizeRoute3(body.route);
    if (!route) {
      return json15({ ok: false, error: "Rota de rate limit inv\xE1lida.", ...trace3 }, 400);
    }
    const action = String(body.action ?? "update").trim();
    const currentConfig = await loadLegacyRateLimit(context2);
    const nextConfig = {
      ...currentConfig
    };
    if (action === "restore_default") {
      const defaults = POLICY_META[route].defaults;
      nextConfig[route] = {
        enabled: defaults.enabled,
        maxRequests: defaults.max_requests,
        windowMinutes: defaults.window_minutes
      };
    } else {
      const maxRequests = parsePositiveInt(body.max_requests);
      const windowMinutes = parsePositiveInt(body.window_minutes);
      if (maxRequests === null || windowMinutes === null) {
        return json15({ ok: false, error: "Par\xE2metros de rate limit inv\xE1lidos.", ...trace3 }, 400);
      }
      if (maxRequests > POLICY_LIMITS.maxRequests || windowMinutes > POLICY_LIMITS.windowMinutes) {
        return json15({ ok: false, error: "Par\xE2metros fora da faixa permitida.", ...trace3 }, 400);
      }
      nextConfig[route] = {
        enabled: toBoolean(body.enabled),
        maxRequests,
        windowMinutes
      };
    }
    await saveLegacyRateLimit(context2, nextConfig);
    const policies = toClientPolicies(await loadLegacyRateLimit(context2));
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "mainsite",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: action === "restore_default" ? "restore-rate-limit-default" : "save-rate-limit",
            route,
            adminActor
          }
        });
      } catch {
      }
    }
    return json15({ ok: true, action, policies, admin_actor: adminActor, ...trace3 });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha ao salvar painel de rate limit do MainSite";
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "mainsite",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: { action: "save-rate-limit" }
        });
      } catch {
      }
    }
    return json15({ ok: false, error: message, ...trace3 }, 500);
  }
}
var POLICY_LIMITS, POLICY_META, ROUTES, json15, toBoolean, parsePositiveInt, normalizeBucket, normalizeConfig, toClientPolicies, loadLegacyRateLimit, saveLegacyRateLimit, normalizeRoute3;
var init_rate_limit3 = __esm({
  "api/mainsite/rate-limit.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_mainsite_admin();
    init_admin_actor();
    init_request_trace();
    POLICY_LIMITS = {
      maxRequests: 500,
      windowMinutes: 1440
    };
    POLICY_META = {
      chatbot: {
        label: "Chatbot p\xFAblico",
        defaults: {
          enabled: false,
          max_requests: 5,
          window_minutes: 1
        }
      },
      email: {
        label: "Formul\xE1rios de e-mail/contato",
        defaults: {
          enabled: false,
          max_requests: 3,
          window_minutes: 15
        }
      },
      contato: {
        label: "Formul\xE1rio de Contato",
        defaults: {
          enabled: true,
          max_requests: 5,
          window_minutes: 30
        }
      }
    };
    ROUTES = Object.keys(POLICY_META);
    json15 = /* @__PURE__ */ __name((data, status = 200) => new Response(JSON.stringify(data), {
      status,
      headers: toHeaders15()
    }), "json");
    toBoolean = /* @__PURE__ */ __name((value) => value === true || value === 1 || value === "1" || value === "true", "toBoolean");
    parsePositiveInt = /* @__PURE__ */ __name((value) => {
      const parsed = Number.parseInt(String(value), 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
      }
      return parsed;
    }, "parsePositiveInt");
    normalizeBucket = /* @__PURE__ */ __name((raw, route) => {
      const defaults = POLICY_META[route].defaults;
      const maxRequestsRaw = parsePositiveInt(raw?.maxRequests);
      const windowMinutesRaw = parsePositiveInt(raw?.windowMinutes);
      return {
        enabled: toBoolean(raw?.enabled),
        maxRequests: Math.min(POLICY_LIMITS.maxRequests, maxRequestsRaw ?? defaults.max_requests),
        windowMinutes: Math.min(POLICY_LIMITS.windowMinutes, windowMinutesRaw ?? defaults.window_minutes)
      };
    }, "normalizeBucket");
    normalizeConfig = /* @__PURE__ */ __name((raw) => ({
      chatbot: normalizeBucket(raw?.chatbot, "chatbot"),
      email: normalizeBucket(raw?.email, "email"),
      contato: normalizeBucket(raw?.contato, "contato")
    }), "normalizeConfig");
    toClientPolicies = /* @__PURE__ */ __name((config2) => ROUTES.map((route) => {
      const policy = config2[route];
      const meta = POLICY_META[route];
      return {
        route,
        label: meta.label,
        enabled: policy.enabled,
        max_requests: policy.maxRequests,
        window_minutes: policy.windowMinutes,
        updated_at: null,
        defaults: {
          enabled: meta.defaults.enabled,
          max_requests: meta.defaults.max_requests,
          window_minutes: meta.defaults.window_minutes
        },
        stats: {
          total_requests_window: 0,
          distinct_keys_window: 0
        }
      };
    }), "toClientPolicies");
    loadLegacyRateLimit = /* @__PURE__ */ __name(async (context2) => {
      const db = context2.env.BIGDATA_DB;
      if (!db) {
        return normalizeConfig(null);
      }
      const row = await db.prepare("SELECT payload FROM mainsite_settings WHERE id = ? LIMIT 1").bind("mainsite/ratelimit").first();
      if (!row?.payload) {
        return normalizeConfig(null);
      }
      try {
        const payload = JSON.parse(row.payload);
        return normalizeConfig(payload);
      } catch {
        return normalizeConfig(null);
      }
    }, "loadLegacyRateLimit");
    saveLegacyRateLimit = /* @__PURE__ */ __name(async (context2, config2) => {
      const db = context2.env.BIGDATA_DB;
      if (!db) {
        throw new Error("BIGDATA_DB n\xE3o configurado no runtime do admin-app.");
      }
      const payload = JSON.stringify({
        chatbot: {
          enabled: config2.chatbot.enabled,
          maxRequests: config2.chatbot.maxRequests,
          windowMinutes: config2.chatbot.windowMinutes
        },
        email: {
          enabled: config2.email.enabled,
          maxRequests: config2.email.maxRequests,
          windowMinutes: config2.email.windowMinutes
        },
        contato: {
          enabled: config2.contato.enabled,
          maxRequests: config2.contato.maxRequests,
          windowMinutes: config2.contato.windowMinutes
        }
      });
      await db.prepare(`
    INSERT INTO mainsite_settings (id, payload, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      payload = excluded.payload,
      updated_at = CURRENT_TIMESTAMP
  `).bind("mainsite/ratelimit", payload).run();
    }, "saveLegacyRateLimit");
    normalizeRoute3 = /* @__PURE__ */ __name((value) => {
      const route = String(value ?? "").trim();
      if (route === "chatbot" || route === "email" || route === "contato") {
        return route;
      }
      return null;
    }, "normalizeRoute");
    __name(onRequestGet30, "onRequestGet");
    __name(onRequestPost26, "onRequestPost");
  }
});

// api/mainsite/settings.ts
async function onRequestGet31(context2) {
  const trace3 = createResponseTrace(context2.request);
  try {
    const db = requireDb3(context2.env);
    const settings = await readPublicSettings(db);
    return new Response(JSON.stringify({
      ok: true,
      settings,
      ...trace3
    }), {
      headers: toHeaders15()
    });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha ao consultar settings p\xFAblicos do MainSite";
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "mainsite",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: "read-public-settings"
          }
        });
      } catch {
      }
    }
    return buildErrorResponse6(message, trace3, 500);
  }
}
async function onRequestPut4(context2) {
  const trace3 = createResponseTrace(context2.request);
  try {
    const db = requireDb3(context2.env);
    const body = await context2.request.json();
    const adminActor = resolveAdminActorFromRequest(context2.request, body);
    if (!isRecord(body.appearance) || !isRecord(body.rotation) || !isRecord(body.disclaimers)) {
      return buildErrorResponse6("Appearance, rotation e disclaimers precisam ser objetos JSON v\xE1lidos.", trace3, 400);
    }
    const settings = {
      appearance: body.appearance,
      rotation: body.rotation,
      disclaimers: body.disclaimers
    };
    await Promise.all([
      upsertSetting(db, "mainsite/appearance", settings.appearance),
      upsertSetting(db, "mainsite/rotation", settings.rotation),
      upsertSetting(db, "mainsite/disclaimers", settings.disclaimers)
    ]);
    try {
      await logModuleOperationalEvent(db, {
        module: "mainsite",
        source: "bigdata_db",
        fallbackUsed: false,
        ok: true,
        metadata: {
          action: "save-public-settings",
          adminActor,
          settingsUpserted: 3
        }
      });
    } catch {
    }
    return new Response(JSON.stringify({
      ok: true,
      settingsUpserted: 3,
      admin_actor: adminActor,
      ...trace3
    }), {
      headers: toHeaders15()
    });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha ao salvar settings p\xFAblicos do MainSite";
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "mainsite",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: "save-public-settings"
          }
        });
      } catch {
      }
    }
    return buildErrorResponse6(message, trace3);
  }
}
var isRecord, buildErrorResponse6, requireDb3, safeParseObject, readPublicSettings, upsertSetting;
var init_settings = __esm({
  "api/mainsite/settings.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_mainsite_admin();
    init_admin_actor();
    init_request_trace();
    isRecord = /* @__PURE__ */ __name((value) => typeof value === "object" && value !== null && !Array.isArray(value), "isRecord");
    buildErrorResponse6 = /* @__PURE__ */ __name((message, trace3, status = 500) => new Response(JSON.stringify({
      ok: false,
      error: message,
      ...trace3
    }), {
      status,
      headers: toHeaders15()
    }), "buildErrorResponse");
    requireDb3 = /* @__PURE__ */ __name((env2) => {
      if (!env2.BIGDATA_DB) {
        throw new Error("BIGDATA_DB n\xE3o configurado no runtime do admin-app.");
      }
      return env2.BIGDATA_DB;
    }, "requireDb");
    safeParseObject = /* @__PURE__ */ __name((rawPayload, fallback) => {
      if (!rawPayload?.trim()) {
        return fallback;
      }
      try {
        const parsed = JSON.parse(rawPayload);
        return isRecord(parsed) ? parsed : fallback;
      } catch {
        return fallback;
      }
    }, "safeParseObject");
    readPublicSettings = /* @__PURE__ */ __name(async (db) => {
      const [appearanceRow, rotationRow, disclaimersRow] = await Promise.all([
        db.prepare("SELECT payload FROM mainsite_settings WHERE id = ? LIMIT 1").bind("mainsite/appearance").first(),
        db.prepare("SELECT payload FROM mainsite_settings WHERE id = ? LIMIT 1").bind("mainsite/rotation").first(),
        db.prepare("SELECT payload FROM mainsite_settings WHERE id = ? LIMIT 1").bind("mainsite/disclaimers").first()
      ]);
      return {
        appearance: safeParseObject(appearanceRow?.payload, {}),
        rotation: safeParseObject(rotationRow?.payload, {}),
        disclaimers: safeParseObject(disclaimersRow?.payload, {})
      };
    }, "readPublicSettings");
    upsertSetting = /* @__PURE__ */ __name(async (db, id, payload) => {
      await db.prepare(`
    INSERT INTO mainsite_settings (id, payload, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      payload = excluded.payload,
      updated_at = CURRENT_TIMESTAMP
  `).bind(id, JSON.stringify(payload)).run();
    }, "upsertSetting");
    __name(onRequestGet31, "onRequestGet");
    __name(onRequestPut4, "onRequestPut");
  }
});

// api/mainsite/sync.ts
async function onRequestPost27(context2) {
  const { env: env2 } = context2;
  if (!env2.BIGDATA_DB) {
    return new Response(JSON.stringify({
      ok: false,
      error: "BIGDATA_DB n\xE3o configurado no runtime."
    }), {
      status: 503,
      headers: toHeaders16()
    });
  }
  const startedAt = Date.now();
  const syncRunId = await startSyncRun(env2.BIGDATA_DB, {
    module: "mainsite",
    status: "running",
    startedAt,
    metadata: {}
  });
  try {
    const [postsCountRow, settingsRowsRaw] = await Promise.all([
      env2.BIGDATA_DB.prepare("SELECT COUNT(1) AS total FROM mainsite_posts").first(),
      env2.BIGDATA_DB.prepare("SELECT id, payload FROM mainsite_settings").all()
    ]);
    const settingsRows = settingsRowsRaw.results ?? [];
    const settingsMap = new Map(settingsRows.map((row) => [String(row.id ?? ""), row]));
    let settingsInserted = 0;
    let settingsFixed = 0;
    for (const entry of DEFAULT_SETTINGS) {
      const current = settingsMap.get(entry.id);
      if (!current) {
        await env2.BIGDATA_DB.prepare(`
          INSERT INTO mainsite_settings (id, payload, updated_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
        `).bind(entry.id, JSON.stringify(entry.payload)).run();
        settingsInserted += 1;
        continue;
      }
      if (!isValidJson(current.payload)) {
        await env2.BIGDATA_DB.prepare(`
          UPDATE mainsite_settings
          SET payload = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(JSON.stringify(entry.payload), entry.id).run();
        settingsFixed += 1;
      }
    }
    const recordsRead = Number(postsCountRow?.total ?? 0) + settingsRows.length;
    const recordsUpserted = settingsInserted + settingsFixed;
    await finishSyncRun(env2.BIGDATA_DB, {
      id: syncRunId,
      status: "success",
      finishedAt: Date.now(),
      recordsRead,
      recordsUpserted
    });
    await logModuleOperationalEvent(env2.BIGDATA_DB, {
      module: "mainsite",
      source: "bigdata_db",
      fallbackUsed: false,
      ok: true,
      metadata: {
        action: "sync",
        pulledFrom: "bigdata_db",
        postsLidos: Number(postsCountRow?.total ?? 0),
        financeirosLidos: 0,
        settingsLidos: settingsRows.length,
        settingsInseridos: settingsInserted,
        settingsCorrigidos: settingsFixed
      }
    });
    return new Response(JSON.stringify({
      ok: true,
      syncRunId,
      recordsRead,
      recordsUpserted,
      posts: {
        lidos: Number(postsCountRow?.total ?? 0)
      },
      financialLogs: {
        lidos: 0
      },
      settings: {
        lidos: settingsRows.length,
        inseridos: settingsInserted,
        corrigidos: settingsFixed
      },
      startedAt,
      finishedAt: Date.now()
    }), {
      headers: toHeaders16()
    });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha inesperada no sync do MainSite";
    await finishSyncRun(env2.BIGDATA_DB, {
      id: syncRunId,
      status: "error",
      finishedAt: Date.now(),
      recordsRead: 0,
      recordsUpserted: 0,
      errorMessage: message
    });
    await logModuleOperationalEvent(env2.BIGDATA_DB, {
      module: "mainsite",
      source: "bigdata_db",
      fallbackUsed: false,
      ok: false,
      errorMessage: message,
      metadata: {
        action: "sync",
        pulledFrom: "bigdata_db"
      }
    });
    return new Response(JSON.stringify({
      ok: false,
      error: message,
      syncRunId
    }), {
      status: 500,
      headers: toHeaders16()
    });
  }
}
var toHeaders16, DEFAULT_SETTINGS, isValidJson;
var init_sync3 = __esm({
  "api/mainsite/sync.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    toHeaders16 = /* @__PURE__ */ __name(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    DEFAULT_SETTINGS = [
      {
        id: "mainsite/appearance",
        payload: {
          allowAutoMode: true,
          light: { bgColor: "#ffffff", bgImage: "", fontColor: "#333333", titleColor: "#111111" },
          dark: { bgColor: "#131314", bgImage: "", fontColor: "#E3E3E3", titleColor: "#8AB4F8" },
          shared: { fontSize: "1.15rem", titleFontSize: "1.8rem", fontFamily: "sans-serif" }
        }
      },
      {
        id: "mainsite/rotation",
        payload: { enabled: false, interval: 60, last_rotated_at: 0 }
      },
      {
        id: "mainsite/ratelimit",
        payload: {
          chatbot: { enabled: false, maxRequests: 5, windowMinutes: 1 },
          email: { enabled: false, maxRequests: 3, windowMinutes: 15 }
        }
      },
      {
        id: "mainsite/disclaimers",
        payload: {
          enabled: true,
          items: [{ id: "default", title: "Aviso", text: "Texto de exemplo.", buttonText: "Concordo" }]
        }
      }
    ];
    isValidJson = /* @__PURE__ */ __name((raw) => {
      if (!raw?.trim()) {
        return false;
      }
      try {
        JSON.parse(raw);
        return true;
      } catch {
        return false;
      }
    }, "isValidJson");
    __name(onRequestPost27, "onRequestPost");
  }
});

// api/mainsite/upload.ts
var onRequestPost28;
var init_upload = __esm({
  "api/mainsite/upload.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    onRequestPost28 = /* @__PURE__ */ __name(async (context2) => {
      try {
        const formData = await context2.request.formData();
        const file = formData.get("file");
        if (!file) {
          return Response.json({ error: "Nenhum arquivo submetido." }, { status: 400 });
        }
        const extension = file.name.split(".").pop() || "bin";
        const uniqueName = `${crypto.randomUUID()}.${extension}`;
        await context2.env.MEDIA_BUCKET.put(uniqueName, await file.arrayBuffer(), {
          httpMetadata: { contentType: file.type }
        });
        const publicUrl = `/api/mainsite/media/${uniqueName}`;
        return Response.json({ success: true, url: publicUrl }, { status: 201 });
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro desconhecido no upload.";
        return Response.json({ error: message }, { status: 500 });
      }
    }, "onRequestPost");
  }
});

// api/mtasts/orchestrate.ts
async function onRequestPost29(context2) {
  const trace3 = createResponseTrace(context2.request);
  if (!context2.env.BIGDATA_DB) {
    return toError11("BIGDATA_DB n\xE3o configurado no runtime.", trace3, 503);
  }
  try {
    const body = await context2.request.json();
    const adminActor = resolveAdminActorFromRequest(context2.request, body);
    const domain2 = normalizeDomain(body.domain);
    const zoneId = String(body.zoneId ?? "").trim();
    const policyText = normalizePolicyText(body.policyText);
    const tlsrptEmail = normalizeTlsRptEmail(body.tlsrptEmail);
    if (!domain2 || !zoneId || !policyText) {
      return toError11("Domain, zoneId e policyText s\xE3o obrigat\xF3rios para orquestrar o MTA-STS.", trace3, 400);
    }
    const id = generateMtastsId();
    const [mtaStsDnsResult, tlsRptDnsResult] = await Promise.all([
      upsertCloudflareTxtRecord(
        context2.env,
        zoneId,
        `_mta-sts.${domain2}`,
        `v=STSv1; id=${id}`
      ),
      tlsrptEmail ? upsertCloudflareTxtRecord(
        context2.env,
        zoneId,
        `_smtp._tls.${domain2}`,
        `v=TLSRPTv1; rua=mailto:${tlsrptEmail}`
      ) : Promise.resolve(null)
    ]);
    await context2.env.BIGDATA_DB.prepare(`
      INSERT INTO mtasts_mta_sts_policies (domain, policy_text, tlsrpt_email, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(domain) DO UPDATE SET
        policy_text = excluded.policy_text,
        tlsrpt_email = COALESCE(excluded.tlsrpt_email, mtasts_mta_sts_policies.tlsrpt_email),
        updated_at = CURRENT_TIMESTAMP
    `).bind(domain2, policyText, tlsrptEmail).run();
    await context2.env.BIGDATA_DB.prepare(`
      INSERT INTO mtasts_history (gerado_em, domain, data_criacao)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(gerado_em) DO UPDATE SET
        domain = excluded.domain
    `).bind(id, domain2).run();
    try {
      await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
        module: "mtasts",
        source: "bigdata_db",
        fallbackUsed: false,
        ok: true,
        metadata: {
          action: "orchestrate",
          provider: "cloudflare-api",
          domain: domain2,
          zoneId,
          id,
          tlsrptEmail,
          adminActor,
          dnsMtaStsMode: mtaStsDnsResult.mode,
          dnsTlsRptMode: tlsRptDnsResult?.mode ?? null
        }
      });
    } catch {
    }
    return new Response(JSON.stringify({
      ok: true,
      domain: domain2,
      zoneId,
      id,
      dnsUpdated: true,
      policySaved: true,
      historySaved: true,
      provider: "cloudflare-api",
      admin_actor: adminActor,
      ...trace3
    }), {
      headers: toHeaders17()
    });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha inesperada na orquestra\xE7\xE3o MTA-STS";
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "mtasts",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: "orchestrate",
            provider: "cloudflare-api"
          }
        });
      } catch {
      }
    }
    return toError11(message, trace3);
  }
}
var toHeaders17, normalizeDomain, generateMtastsId, toError11, normalizePolicyText, normalizeTlsRptEmail;
var init_orchestrate = __esm({
  "api/mtasts/orchestrate.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_admin_actor();
    init_request_trace();
    init_cloudflare_api();
    toHeaders17 = /* @__PURE__ */ __name(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    normalizeDomain = /* @__PURE__ */ __name((value) => String(value ?? "").trim().toLowerCase(), "normalizeDomain");
    generateMtastsId = /* @__PURE__ */ __name(() => {
      const now = /* @__PURE__ */ new Date();
      const prefix = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
      const random = crypto.getRandomValues(new Uint32Array(4));
      const suffix = Array.from(random).map((chunk) => String(chunk).padStart(10, "0").slice(-4)).join("");
      return `${prefix}${suffix}`;
    }, "generateMtastsId");
    toError11 = /* @__PURE__ */ __name((message, trace3, status = 500) => new Response(JSON.stringify({
      ok: false,
      error: message,
      ...trace3
    }), {
      status,
      headers: toHeaders17()
    }), "toError");
    normalizePolicyText = /* @__PURE__ */ __name((value) => String(value ?? "").trim(), "normalizePolicyText");
    normalizeTlsRptEmail = /* @__PURE__ */ __name((value) => {
      const email = String(value ?? "").trim().toLowerCase();
      if (!email) {
        return null;
      }
      return email;
    }, "normalizeTlsRptEmail");
    __name(onRequestPost29, "onRequestPost");
  }
});

// api/mtasts/overview.ts
async function onRequestGet32(context2) {
  const { request, env: env2 } = context2;
  const trace3 = createResponseTrace(request);
  const url = new URL(request.url);
  const domain2 = normalizeDomain2(url.searchParams.get("domain"));
  const limit = parseLimit4(url.searchParams.get("limit"));
  const avisos = [];
  if (env2.BIGDATA_DB) {
    try {
      const historyRows = domain2 ? await env2.BIGDATA_DB.prepare("SELECT gerado_em, domain, data_criacao FROM mtasts_history WHERE domain = ? ORDER BY id DESC LIMIT ?").bind(domain2, limit).all() : await env2.BIGDATA_DB.prepare("SELECT gerado_em, domain, data_criacao FROM mtasts_history ORDER BY id DESC LIMIT ?").bind(limit).all();
      const policyRows = domain2 ? await env2.BIGDATA_DB.prepare("SELECT domain, policy_text, tlsrpt_email, updated_at FROM mtasts_mta_sts_policies WHERE domain = ? ORDER BY updated_at DESC LIMIT 10").bind(domain2).all() : await env2.BIGDATA_DB.prepare("SELECT domain, policy_text, tlsrpt_email, updated_at FROM mtasts_mta_sts_policies ORDER BY updated_at DESC").all();
      const history = (historyRows.results ?? []).map((row) => mapHistoryRow(row)).filter((item) => item !== null);
      const policies = (policyRows.results ?? []).map((row) => mapPolicyRow(row)).filter((item) => item !== null);
      const payload = {
        ok: true,
        fonte: "bigdata_db",
        filtros: { domain: domain2, limit },
        avisos,
        resumo: {
          totalHistorico: history.length,
          totalPolicies: policies.length
        },
        historico: history,
        policies
      };
      try {
        await logModuleOperationalEvent(env2.BIGDATA_DB, {
          module: "mtasts",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: true,
          metadata: {
            totalHistorico: payload.resumo.totalHistorico,
            totalPolicies: payload.resumo.totalPolicies
          }
        });
      } catch {
      }
      return new Response(JSON.stringify({
        ...payload,
        ...trace3
      }), {
        headers: toResponseHeaders4()
      });
    } catch (error3) {
      const message2 = error3 instanceof Error ? error3.message : "Falha ao consultar bigdata_db";
      avisos.push(`Leitura em modo D1 indispon\xEDvel: ${message2}`);
    }
  }
  const message = "BIGDATA_DB indispon\xEDvel para leitura de overview do MTA-STS.";
  return new Response(JSON.stringify({
    ok: false,
    ...trace3,
    error: message,
    filtros: { domain: domain2, limit },
    avisos: [...avisos, "Fallback para admin legado desativado por Cloudflare Access."],
    resumo: {
      totalHistorico: 0,
      totalPolicies: 0
    },
    historico: [],
    policies: []
  }), {
    status: 503,
    headers: toResponseHeaders4()
  });
}
var toResponseHeaders4, parseLimit4, normalizeDomain2, mapHistoryRow, mapPolicyRow;
var init_overview4 = __esm({
  "api/mtasts/overview.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_request_trace();
    toResponseHeaders4 = /* @__PURE__ */ __name(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toResponseHeaders");
    parseLimit4 = /* @__PURE__ */ __name((rawValue) => {
      const parsed = Number.parseInt(rawValue ?? "30", 10);
      if (!Number.isFinite(parsed)) {
        return 30;
      }
      return Math.min(100, Math.max(1, parsed));
    }, "parseLimit");
    normalizeDomain2 = /* @__PURE__ */ __name((rawValue) => String(rawValue ?? "").trim().toLowerCase(), "normalizeDomain");
    mapHistoryRow = /* @__PURE__ */ __name((row) => {
      const geradoEm = String(row.gerado_em ?? "").trim();
      if (!geradoEm) {
        return null;
      }
      return {
        geradoEm,
        domain: row.domain == null ? null : String(row.domain).trim().toLowerCase()
      };
    }, "mapHistoryRow");
    mapPolicyRow = /* @__PURE__ */ __name((row) => {
      const domain2 = String(row.domain ?? "").trim().toLowerCase();
      const policyText = String(row.policy_text ?? "").trim();
      if (!domain2 || !policyText) {
        return null;
      }
      return {
        domain: domain2,
        policyText,
        tlsrptEmail: row.tlsrpt_email == null ? null : String(row.tlsrpt_email).trim().toLowerCase(),
        updatedAt: row.updated_at == null ? null : String(row.updated_at)
      };
    }, "mapPolicyRow");
    __name(onRequestGet32, "onRequestGet");
  }
});

// api/mtasts/policy.ts
async function onRequestGet33(context2) {
  const trace3 = createResponseTrace(context2.request);
  const url = new URL(context2.request.url);
  const domain2 = normalizeDomain3(url.searchParams.get("domain"));
  const zoneId = String(url.searchParams.get("zoneId") ?? "").trim();
  if (!domain2 || !zoneId) {
    return toError12("Par\xE2metros domain e zoneId s\xE3o obrigat\xF3rios.", trace3, 400);
  }
  try {
    const dnsSnapshot = await getCloudflareDnsSnapshot(context2.env, domain2, zoneId);
    let savedPolicy = null;
    let savedEmail = null;
    let lastGeneratedId = null;
    if (context2.env.BIGDATA_DB) {
      const policyRow = await context2.env.BIGDATA_DB.prepare(`
        SELECT policy_text, tlsrpt_email
        FROM mtasts_mta_sts_policies
        WHERE domain = ?
        LIMIT 1
      `).bind(domain2).first();
      const historyRow = await context2.env.BIGDATA_DB.prepare(`
        SELECT gerado_em
        FROM mtasts_history
        WHERE domain = ?
        ORDER BY id DESC
        LIMIT 1
      `).bind(domain2).first();
      savedPolicy = typeof policyRow?.policy_text === "string" ? policyRow.policy_text : null;
      savedEmail = typeof policyRow?.tlsrpt_email === "string" ? policyRow.tlsrpt_email.trim().toLowerCase() : null;
      lastGeneratedId = typeof historyRow?.gerado_em === "string" ? historyRow.gerado_em.trim() : null;
    }
    const mapped = {
      savedPolicy,
      savedEmail,
      dnsTlsRptEmail: dnsSnapshot.dnsTlsRptEmail,
      dnsMtaStsId: dnsSnapshot.dnsMtaStsId,
      lastGeneratedId,
      mxRecords: dnsSnapshot.mxRecords
    };
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "mtasts",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: "policy-read",
            provider: "cloudflare-api",
            domain: domain2,
            hasSavedPolicy: Boolean(mapped.savedPolicy)
          }
        });
      } catch {
      }
    }
    return new Response(JSON.stringify({
      ok: true,
      ...trace3,
      domain: domain2,
      zoneId,
      policy: mapped
    }), {
      headers: toHeaders18()
    });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha ao carregar policy do dom\xEDnio";
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "mtasts",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: "policy-read",
            provider: "cloudflare-api",
            domain: domain2
          }
        });
      } catch {
      }
    }
    return toError12(message, trace3, 502);
  }
}
var normalizeDomain3, toHeaders18, toError12;
var init_policy = __esm({
  "api/mtasts/policy.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_request_trace();
    init_cloudflare_api();
    normalizeDomain3 = /* @__PURE__ */ __name((rawValue) => String(rawValue ?? "").trim().toLowerCase(), "normalizeDomain");
    toHeaders18 = /* @__PURE__ */ __name(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    toError12 = /* @__PURE__ */ __name((message, trace3, status = 500) => new Response(JSON.stringify({
      ok: false,
      ...trace3,
      error: message
    }), {
      status,
      headers: toHeaders18()
    }), "toError");
    __name(onRequestGet33, "onRequestGet");
  }
});

// api/mtasts/sync.ts
async function onRequestPost30(context2) {
  const { env: env2 } = context2;
  if (!env2.BIGDATA_DB) {
    return new Response(JSON.stringify({
      ok: false,
      error: "BIGDATA_DB n\xE3o configurado no runtime."
    }), {
      status: 503,
      headers: toHeaders19()
    });
  }
  const startedAt = Date.now();
  const syncRunId = await startSyncRun(env2.BIGDATA_DB, {
    module: "mtasts",
    status: "running",
    startedAt,
    metadata: {}
  });
  try {
    const [zones, historyRowsRaw, policyRowsRaw] = await Promise.all([
      listCloudflareZones(env2),
      env2.BIGDATA_DB.prepare("SELECT gerado_em, domain FROM mtasts_history ORDER BY id DESC").all(),
      env2.BIGDATA_DB.prepare("SELECT domain, policy_text, tlsrpt_email FROM mtasts_mta_sts_policies").all()
    ]);
    const historyRows = (historyRowsRaw.results ?? []).map((row) => ({
      geradoEm: String(row.gerado_em ?? "").trim(),
      domain: row.domain == null ? null : String(row.domain).trim().toLowerCase()
    })).filter((row) => row.geradoEm);
    const policyByDomain = new Map(
      (policyRowsRaw.results ?? []).map((row) => ({
        domain: String(row.domain ?? "").trim().toLowerCase(),
        policyText: String(row.policy_text ?? "").trim(),
        tlsrptEmail: row.tlsrpt_email == null ? null : String(row.tlsrpt_email).trim().toLowerCase()
      })).filter((row) => row.domain && row.policyText).map((row) => [row.domain, row])
    );
    const dnsSnapshots = await Promise.all(
      zones.map(async (zone) => ({
        zone,
        dns: await getCloudflareDnsSnapshot(env2, zone.name, zone.id)
      }))
    );
    let historyUpserted = 0;
    let policiesUpserted = 0;
    for (const row of historyRows) {
      await env2.BIGDATA_DB.prepare(`
        INSERT INTO mtasts_history (gerado_em, domain, data_criacao)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(gerado_em) DO UPDATE SET
          domain = excluded.domain
      `).bind(row.geradoEm, row.domain).run();
      historyUpserted += 1;
    }
    for (const item of dnsSnapshots) {
      const domain2 = item.zone.name;
      const existing = policyByDomain.get(domain2);
      const policyText = existing?.policyText;
      if (!policyText) {
        continue;
      }
      await env2.BIGDATA_DB.prepare(`
        INSERT INTO mtasts_mta_sts_policies (domain, policy_text, tlsrpt_email, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(domain) DO UPDATE SET
          policy_text = excluded.policy_text,
          tlsrpt_email = excluded.tlsrpt_email,
          updated_at = CURRENT_TIMESTAMP
      `).bind(domain2, policyText, item.dns.dnsTlsRptEmail ?? existing.tlsrptEmail).run();
      policiesUpserted += 1;
    }
    const recordsRead = historyRows.length + dnsSnapshots.length;
    const recordsUpserted = historyUpserted + policiesUpserted;
    await finishSyncRun(env2.BIGDATA_DB, {
      id: syncRunId,
      status: "success",
      finishedAt: Date.now(),
      recordsRead,
      recordsUpserted
    });
    await logModuleOperationalEvent(env2.BIGDATA_DB, {
      module: "mtasts",
      source: "bigdata_db",
      fallbackUsed: false,
      ok: true,
      metadata: {
        action: "sync",
        pulledFrom: "cloudflare-api+d1",
        provider: "cloudflare-api",
        historyLido: historyRows.length,
        historyUpserted,
        policiesLidas: dnsSnapshots.length,
        policiesUpserted,
        zonesAuditadas: zones.length
      }
    });
    return new Response(JSON.stringify({
      ok: true,
      syncRunId,
      recordsRead,
      recordsUpserted,
      history: {
        lidos: historyRows.length,
        upserted: historyUpserted
      },
      policies: {
        lidas: dnsSnapshots.length,
        upserted: policiesUpserted
      },
      zonesAuditadas: zones.length,
      startedAt,
      finishedAt: Date.now()
    }), {
      headers: toHeaders19()
    });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha inesperada no sync do MTA-STS";
    await finishSyncRun(env2.BIGDATA_DB, {
      id: syncRunId,
      status: "error",
      finishedAt: Date.now(),
      recordsRead: 0,
      recordsUpserted: 0,
      errorMessage: message
    });
    await logModuleOperationalEvent(env2.BIGDATA_DB, {
      module: "mtasts",
      source: "bigdata_db",
      fallbackUsed: false,
      ok: false,
      errorMessage: message,
      metadata: {
        action: "sync",
        pulledFrom: "cloudflare-api+d1",
        provider: "cloudflare-api"
      }
    });
    return new Response(JSON.stringify({
      ok: false,
      error: message,
      syncRunId
    }), {
      status: 500,
      headers: toHeaders19()
    });
  }
}
var toHeaders19;
var init_sync4 = __esm({
  "api/mtasts/sync.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_cloudflare_api();
    toHeaders19 = /* @__PURE__ */ __name(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    __name(onRequestPost30, "onRequestPost");
  }
});

// api/mtasts/zones.ts
async function onRequestGet34(context2) {
  const trace3 = createResponseTrace(context2.request);
  try {
    const payload = await listCloudflareZones(context2.env);
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "mtasts",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: "zones-list",
            provider: "cloudflare-api",
            totalZones: payload.length
          }
        });
      } catch {
      }
    }
    return new Response(JSON.stringify({
      ok: true,
      ...trace3,
      fonte: "cloudflare-api",
      zones: payload
    }), {
      headers: toHeaders20()
    });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha ao carregar zonas do MTA-STS";
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "mtasts",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: "zones-list",
            provider: "cloudflare-api"
          }
        });
      } catch {
      }
    }
    return toError13(message, trace3, 502);
  }
}
var toHeaders20, toError13;
var init_zones2 = __esm({
  "api/mtasts/zones.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_request_trace();
    init_cloudflare_api();
    toHeaders20 = /* @__PURE__ */ __name(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    toError13 = /* @__PURE__ */ __name((message, trace3, status = 500) => new Response(JSON.stringify({
      ok: false,
      ...trace3,
      error: message
    }), {
      status,
      headers: toHeaders20()
    }), "toError");
    __name(onRequestGet34, "onRequestGet");
  }
});

// api/news/discover.ts
function normalize(text) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}
function searchCurated(query) {
  const q = normalize(query);
  if (!q || q.length < 2) return [];
  const scored = [];
  for (const entry of DIRECTORY) {
    let score = 0;
    const nName = normalize(entry.name);
    const nCat = normalize(entry.category);
    const nUrl = normalize(entry.url);
    const nTags = entry.tags.map(normalize);
    if (nName.startsWith(q)) score += 100;
    else if (nName.includes(q)) score += 60;
    if (nCat.startsWith(q)) score += 80;
    else if (nCat.includes(q)) score += 40;
    if (nUrl.includes(q)) score += 50;
    for (const tag of nTags) {
      if (tag.startsWith(q)) {
        score += 70;
        break;
      }
      if (tag.includes(q)) {
        score += 30;
        break;
      }
    }
    const qWords = q.split(" ");
    if (qWords.length > 1) {
      const allMatch = qWords.every(
        (w) => nName.includes(w) || nCat.includes(w) || nTags.some((t) => t.includes(w))
      );
      if (allMatch) score += 55;
    }
    if (score > 0) scored.push({ entry, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 8).map((s) => ({
    id: s.entry.id,
    name: s.entry.name,
    url: s.entry.url,
    category: s.entry.category,
    source: "curated"
  }));
}
function buildGoogleNewsSuggestion(query) {
  const q = query.trim();
  if (!q || q.length < 2) return null;
  if (/^https?:\/\//i.test(q)) return null;
  const encoded = encodeURIComponent(q);
  return {
    id: `gnews-${encoded}`,
    name: `Google News: "${q}"`,
    url: `https://news.google.com/rss/search?q=${encoded}&hl=pt-BR&gl=BR&ceid=BR:pt-419`,
    category: "Google News",
    source: "google-news"
  };
}
async function discoverWithGemini(query, apiKey, db) {
  const _telStart = Date.now();
  try {
    const prompt = `Voc\xEA \xE9 um especialista em feeds RSS de not\xEDcias.
O usu\xE1rio est\xE1 buscando fontes de not\xEDcias para o termo: "${query}"

Retorne um array JSON com no m\xE1ximo 5 fontes RSS REAIS e ativas, cada uma com:
- "name": nome do ve\xEDculo/portal
- "url": URL REAL do feed RSS (n\xE3o invente URLs \u2014 use apenas feeds que voc\xEA sabe que existem)
- "category": categoria da fonte (ex: Brasil, Tecnologia, Economia, Esportes, Mundo, Ci\xEAncia, Entretenimento)

REGRAS:
- Retorne APENAS o array JSON, sem texto adicional.
- S\xF3 inclua feeds que realmente existem e s\xE3o acess\xEDveis.
- Priorize fontes brasileiras quando o termo for em portugu\xEAs.
- Se n\xE3o conhecer feeds para o termo, retorne um array vazio [].`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5e3);
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1024,
            responseMimeType: "application/json"
          }
        })
      }
    );
    clearTimeout(timeout);
    if (!response.ok) {
      console.warn(`[discover] Gemini API returned HTTP ${response.status}`);
      return [];
    }
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return [];
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed)) return [];
    const results = parsed.filter((item) => item.name && item.url && item.category).slice(0, 5).map((item, index) => ({
      id: `gemini-${index}-${slugify(item.name)}`,
      name: item.name,
      url: item.url,
      category: item.category,
      source: "gemini-ai"
    }));
    if (db) {
      db.prepare(`
        INSERT INTO ai_usage_logs (module, model, input_tokens, output_tokens, latency_ms, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        "news-discover",
        "gemini-2.5-flash-lite",
        0,
        0,
        Date.now() - _telStart,
        "ok"
      ).run().catch(() => {
      });
    }
    return results;
  } catch (error3) {
    console.warn("[discover] Gemini discovery failed:", error3);
    return [];
  }
}
async function autoDetectRss(url) {
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) return [];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5e3);
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "LCV-AdminApp-RSSDiscovery/1.0",
        "Accept": "text/html, application/xhtml+xml"
      }
    });
    clearTimeout(timeout);
    if (!response.ok) return [];
    const contentType = response.headers.get("Content-Type") || "";
    if (contentType.includes("xml") || contentType.includes("rss") || contentType.includes("atom")) {
      const hostname = parsed.hostname.replace("www.", "");
      return [{
        id: `detected-${slugify(hostname)}`,
        name: hostname,
        url,
        category: "Detectado",
        source: "auto-detect"
      }];
    }
    if (!contentType.includes("html")) return [];
    const html = await response.text();
    const results = [];
    const linkRegex = /<link[^>]+rel=["']alternate["'][^>]*>/gi;
    let match2;
    while ((match2 = linkRegex.exec(html)) !== null && results.length < 5) {
      const tag = match2[0];
      const typeMatch = tag.match(/type=["']([^"']+)["']/);
      const hrefMatch = tag.match(/href=["']([^"']+)["']/);
      const titleMatch = tag.match(/title=["']([^"']+)["']/);
      if (!typeMatch || !hrefMatch) continue;
      const type = typeMatch[1].toLowerCase();
      if (!type.includes("rss") && !type.includes("atom") && !type.includes("xml")) continue;
      let feedUrl = hrefMatch[1];
      if (feedUrl.startsWith("/")) {
        feedUrl = `${parsed.protocol}//${parsed.host}${feedUrl}`;
      } else if (!feedUrl.startsWith("http")) {
        feedUrl = `${parsed.protocol}//${parsed.host}/${feedUrl}`;
      }
      const title2 = titleMatch ? titleMatch[1] : parsed.hostname.replace("www.", "");
      results.push({
        id: `detected-${slugify(title2)}-${results.length}`,
        name: cleanHtmlEntities(title2),
        url: feedUrl,
        category: "Detectado",
        source: "auto-detect"
      });
    }
    return results;
  } catch (error3) {
    console.warn("[discover] Auto-detect failed:", error3);
    return [];
  }
}
function slugify(name) {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
function cleanHtmlEntities(text) {
  return text.replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}
var DIRECTORY, onRequestGet35;
var init_discover = __esm({
  "api/news/discover.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    DIRECTORY = [
      // Brasil — Geral
      { id: "g1", name: "G1", url: "https://g1.globo.com/rss/g1/", category: "Brasil", tags: ["globo", "brasil", "not\xEDcias", "geral"] },
      { id: "folha", name: "Folha de S.Paulo", url: "https://feeds.folha.uol.com.br/emcimadahora/rss091.xml", category: "Brasil", tags: ["folha", "s\xE3o paulo", "jornal", "brasil"] },
      { id: "uol", name: "UOL Not\xEDcias", url: "https://rss.uol.com.br/feed/noticias.xml", category: "Brasil", tags: ["uol", "not\xEDcias", "brasil"] },
      { id: "estadao", name: "Estad\xE3o", url: "https://www.estadao.com.br/arc/outboundfeeds/rss/", category: "Brasil", tags: ["estad\xE3o", "estado", "s\xE3o paulo", "jornal"] },
      { id: "cnn-brasil", name: "CNN Brasil", url: "https://www.cnnbrasil.com.br/feed/", category: "Brasil", tags: ["cnn", "brasil", "not\xEDcias", "tv"] },
      { id: "r7", name: "R7", url: "https://noticias.r7.com/feed.xml", category: "Brasil", tags: ["r7", "record", "not\xEDcias", "geral"] },
      { id: "band", name: "Band News", url: "https://www.band.uol.com.br/rss/noticias.xml", category: "Brasil", tags: ["band", "bandeirantes", "not\xEDcias"] },
      { id: "agencia-brasil", name: "Ag\xEAncia Brasil", url: "https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml", category: "Brasil", tags: ["ebc", "governo", "ag\xEAncia", "oficial"] },
      { id: "terra", name: "Terra", url: "https://www.terra.com.br/rss/", category: "Brasil", tags: ["terra", "portal", "not\xEDcias"] },
      { id: "metropoles", name: "Metr\xF3poles", url: "https://www.metropoles.com/feed", category: "Brasil", tags: ["metr\xF3poles", "bras\xEDlia", "not\xEDcias", "pol\xEDtica"] },
      { id: "poder360", name: "Poder360", url: "https://www.poder360.com.br/feed/", category: "Brasil", tags: ["poder360", "pol\xEDtica", "bras\xEDlia", "governo"] },
      { id: "correio-braziliense", name: "Correio Braziliense", url: "https://www.correiobraziliense.com.br/arc/outboundfeeds/rss/", category: "Brasil", tags: ["correio", "braziliense", "bras\xEDlia", "df"] },
      { id: "ig", name: "iG", url: "https://ultimosegundo.ig.com.br/rss.xml", category: "Brasil", tags: ["ig", "\xFAltimo segundo", "not\xEDcias"] },
      { id: "carta-capital", name: "CartaCapital", url: "https://www.cartacapital.com.br/feed/", category: "Brasil", tags: ["carta capital", "opini\xE3o", "pol\xEDtica", "an\xE1lise"] },
      { id: "nexo", name: "Nexo Jornal", url: "https://www.nexojornal.com.br/feed/", category: "Brasil", tags: ["nexo", "jornal", "an\xE1lise", "explica\xE7\xE3o"] },
      { id: "intercept", name: "The Intercept Brasil", url: "https://theintercept.com/brasil/feed/", category: "Brasil", tags: ["intercept", "investiga\xE7\xE3o", "jornalismo"] },
      { id: "bbc-brasil", name: "BBC Brasil", url: "https://www.bbc.com/portuguese/index.xml", category: "Brasil", tags: ["bbc", "internacional", "mundo", "londres", "brasil"] },
      { id: "dw-brasil", name: "DW Brasil", url: "https://rss.dw.com/rdf/rss-br", category: "Brasil", tags: ["dw", "alemanha", "brasil", "portuguese"] },
      { id: "huffpost-br", name: "HuffPost Brasil", url: "https://www.huffpostbrasil.com/feeds/index.xml", category: "Brasil", tags: ["huffpost", "huffington", "brasil"] },
      // Política
      { id: "g1-politica", name: "G1 Pol\xEDtica", url: "https://g1.globo.com/rss/g1/politica/", category: "Pol\xEDtica", tags: ["globo", "pol\xEDtica", "governo", "congresso"] },
      { id: "folha-poder", name: "Folha Poder", url: "https://feeds.folha.uol.com.br/poder/rss091.xml", category: "Pol\xEDtica", tags: ["folha", "pol\xEDtica", "poder", "governo"] },
      { id: "congresso-foco", name: "Congresso em Foco", url: "https://congressoemfoco.uol.com.br/feed/", category: "Pol\xEDtica", tags: ["congresso", "senado", "c\xE2mara", "deputados"] },
      { id: "jota", name: "JOTA", url: "https://www.jota.info/feed/", category: "Pol\xEDtica", tags: ["jota", "jur\xEDdico", "stf", "legisla\xE7\xE3o", "direito"] },
      // Economia
      { id: "g1-economia", name: "G1 Economia", url: "https://g1.globo.com/rss/g1/economia/", category: "Economia", tags: ["globo", "economia", "mercado", "finan\xE7as"] },
      { id: "folha-mercado", name: "Folha Mercado", url: "https://feeds.folha.uol.com.br/mercado/rss091.xml", category: "Economia", tags: ["folha", "mercado", "economia", "bolsa"] },
      { id: "valor-economico", name: "Valor Econ\xF4mico", url: "https://pox.globo.com/rss/valor/", category: "Economia", tags: ["valor", "econ\xF4mico", "finan\xE7as", "mercado", "bolsa"] },
      { id: "infomoney", name: "InfoMoney", url: "https://www.infomoney.com.br/feed/", category: "Economia", tags: ["infomoney", "investimentos", "bolsa", "finan\xE7as", "a\xE7\xF5es"] },
      { id: "exame", name: "Exame", url: "https://exame.com/feed/", category: "Economia", tags: ["exame", "neg\xF3cios", "economia", "empresas"] },
      { id: "investing", name: "Investing.com BR", url: "https://br.investing.com/rss/news.rss", category: "Economia", tags: ["investing", "c\xE2mbio", "a\xE7\xF5es", "bolsa", "mercado"] },
      { id: "bloomberg", name: "Bloomberg", url: "https://feeds.bloomberg.com/markets/news.rss", category: "Economia", tags: ["bloomberg", "markets", "finance", "stocks"] },
      { id: "cnbc", name: "CNBC", url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114", category: "Economia", tags: ["cnbc", "finance", "markets", "economy"] },
      { id: "bloomberg-linea", name: "Bloomberg L\xEDnea Brasil", url: "https://www.bloomberglinea.com.br/feed/", category: "Economia", tags: ["bloomberg", "l\xEDnea", "brasil", "economia", "latam"] },
      { id: "money-times", name: "Money Times", url: "https://www.moneytimes.com.br/feed/", category: "Economia", tags: ["money", "times", "investimentos", "mercado"] },
      { id: "seu-dinheiro", name: "Seu Dinheiro", url: "https://www.seudinheiro.com/feed/", category: "Economia", tags: ["dinheiro", "finan\xE7as pessoais", "investimentos"] },
      { id: "sunoresearch", name: "Suno Research", url: "https://www.suno.com.br/noticias/feed/", category: "Economia", tags: ["suno", "research", "dividendos", "fiis", "a\xE7\xF5es"] },
      { id: "forbes-br", name: "Forbes Brasil", url: "https://forbes.com.br/feed/", category: "Economia", tags: ["forbes", "bilion\xE1rios", "neg\xF3cios", "empreendedorismo"] },
      { id: "ft", name: "Financial Times", url: "https://www.ft.com/?format=rss", category: "Economia", tags: ["ft", "financial times", "finance", "world"] },
      { id: "wsj", name: "Wall Street Journal", url: "https://feeds.a.dj.com/rss/RSSWorldNews.xml", category: "Economia", tags: ["wsj", "wall street", "finance", "markets"] },
      { id: "economist", name: "The Economist", url: "https://www.economist.com/latest/rss.xml", category: "Economia", tags: ["economist", "economics", "finance", "world"] },
      { id: "marketwatch", name: "MarketWatch", url: "https://feeds.marketwatch.com/marketwatch/topstories/", category: "Economia", tags: ["marketwatch", "stocks", "markets", "finance"] },
      // Tecnologia
      { id: "g1-tecnologia", name: "G1 Tecnologia", url: "https://g1.globo.com/rss/g1/tecnologia/", category: "Tecnologia", tags: ["globo", "tecnologia", "tech", "gadgets"] },
      { id: "folha-tec", name: "Folha Tec", url: "https://feeds.folha.uol.com.br/tec/rss091.xml", category: "Tecnologia", tags: ["folha", "tecnologia", "tech"] },
      { id: "tecmundo", name: "TecMundo", url: "https://rss.tecmundo.com.br/feed", category: "Tecnologia", tags: ["tecmundo", "tecnologia", "gadgets", "games"] },
      { id: "olhar-digital", name: "Olhar Digital", url: "https://olhardigital.com.br/feed/", category: "Tecnologia", tags: ["olhar digital", "tecnologia", "inova\xE7\xE3o"] },
      { id: "canaltech", name: "Canaltech", url: "https://canaltech.com.br/rss/", category: "Tecnologia", tags: ["canaltech", "tecnologia", "software", "hardware"] },
      { id: "techcrunch", name: "TechCrunch", url: "https://techcrunch.com/feed/", category: "Tecnologia", tags: ["techcrunch", "startups", "tech", "silicon valley"] },
      { id: "theverge", name: "The Verge", url: "https://www.theverge.com/rss/index.xml", category: "Tecnologia", tags: ["verge", "tech", "gadgets", "reviews"] },
      { id: "arstechnica", name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index", category: "Tecnologia", tags: ["ars", "technica", "technology", "science"] },
      { id: "wired", name: "Wired", url: "https://www.wired.com/feed/rss", category: "Tecnologia", tags: ["wired", "tech", "innovation", "future"] },
      { id: "hackernews", name: "Hacker News", url: "https://hnrss.org/frontpage", category: "Tecnologia", tags: ["hacker news", "hn", "ycombinator", "programming", "dev"] },
      { id: "tecnoblog", name: "Tecnoblog", url: "https://tecnoblog.net/feed/", category: "Tecnologia", tags: ["tecnoblog", "brasil", "tecnologia", "gadgets"] },
      { id: "engadget", name: "Engadget", url: "https://www.engadget.com/rss.xml", category: "Tecnologia", tags: ["engadget", "gadgets", "reviews", "tech"] },
      { id: "mashable", name: "Mashable", url: "https://mashable.com/feeds/rss/all", category: "Tecnologia", tags: ["mashable", "social media", "tech", "culture"] },
      { id: "zdnet", name: "ZDNet", url: "https://www.zdnet.com/news/rss.xml", category: "Tecnologia", tags: ["zdnet", "enterprise", "tech", "software"] },
      { id: "thenextweb", name: "The Next Web", url: "https://thenextweb.com/feed/", category: "Tecnologia", tags: ["tnw", "tech", "startups", "europe"] },
      { id: "gizmodo", name: "Gizmodo", url: "https://gizmodo.com/feed", category: "Tecnologia", tags: ["gizmodo", "gadgets", "science", "design"] },
      { id: "mit-tech-review", name: "MIT Technology Review", url: "https://www.technologyreview.com/feed/", category: "Tecnologia", tags: ["mit", "technology review", "ai", "innovation", "research"] },
      { id: "venturebeat", name: "VentureBeat", url: "https://venturebeat.com/feed/", category: "Tecnologia", tags: ["venturebeat", "ai", "startups", "enterprise"] },
      { id: "techradar", name: "TechRadar", url: "https://www.techradar.com/rss", category: "Tecnologia", tags: ["techradar", "reviews", "gadgets", "phones"] },
      { id: "showmetech", name: "Showmetech", url: "https://www.showmetech.com.br/feed/", category: "Tecnologia", tags: ["showmetech", "brasil", "reviews", "smartphones"] },
      { id: "mundo-conectado", name: "Mundo Conectado", url: "https://mundoconectado.com.br/feed", category: "Tecnologia", tags: ["mundo conectado", "brasil", "reviews", "tech"] },
      { id: "tudo-celular", name: "Tudo Celular", url: "https://www.tudocelular.com/feed/", category: "Tecnologia", tags: ["tudo celular", "smartphones", "celular", "android", "iphone"] },
      { id: "openai-blog", name: "OpenAI Blog", url: "https://openai.com/blog/rss/", category: "Tecnologia", tags: ["openai", "chatgpt", "ai", "intelig\xEAncia artificial", "gpt"] },
      { id: "google-ai-blog", name: "Google AI Blog", url: "https://blog.google/technology/ai/rss/", category: "Tecnologia", tags: ["google", "ai", "gemini", "deepmind", "machine learning"] },
      { id: "dev-to", name: "DEV Community", url: "https://dev.to/feed/", category: "Tecnologia", tags: ["dev", "programming", "desenvolvimento", "code", "web"] },
      { id: "css-tricks", name: "CSS-Tricks", url: "https://css-tricks.com/feed/", category: "Tecnologia", tags: ["css", "frontend", "web", "design", "html", "javascript"] },
      { id: "smashing", name: "Smashing Magazine", url: "https://www.smashingmagazine.com/feed/", category: "Tecnologia", tags: ["smashing", "web design", "ux", "frontend"] },
      // Mundo
      { id: "g1-mundo", name: "G1 Mundo", url: "https://g1.globo.com/rss/g1/mundo/", category: "Mundo", tags: ["globo", "mundo", "internacional"] },
      { id: "folha-mundo", name: "Folha Mundo", url: "https://feeds.folha.uol.com.br/mundo/rss091.xml", category: "Mundo", tags: ["folha", "mundo", "internacional"] },
      { id: "bbc-news", name: "BBC News", url: "https://feeds.bbci.co.uk/news/rss.xml", category: "Mundo", tags: ["bbc", "world", "english", "news"] },
      { id: "reuters", name: "Reuters", url: "https://www.reutersagency.com/feed/", category: "Mundo", tags: ["reuters", "world", "ag\xEAncia", "internacional"] },
      { id: "aljazeera", name: "Al Jazeera", url: "https://www.aljazeera.com/xml/rss/all.xml", category: "Mundo", tags: ["aljazeera", "middle east", "mundo", "internacional"] },
      { id: "france24", name: "France 24", url: "https://www.france24.com/en/rss", category: "Mundo", tags: ["france", "europa", "france24", "internacional"] },
      { id: "nyt", name: "The New York Times", url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml", category: "Mundo", tags: ["nyt", "new york", "times", "eua", "estados unidos"] },
      { id: "guardian", name: "The Guardian", url: "https://www.theguardian.com/world/rss", category: "Mundo", tags: ["guardian", "uk", "england", "world"] },
      { id: "cnn", name: "CNN International", url: "http://rss.cnn.com/rss/edition.rss", category: "Mundo", tags: ["cnn", "eua", "world", "international"] },
      { id: "ap-news", name: "Associated Press", url: "https://apnews.com/index.rss", category: "Mundo", tags: ["ap", "associated press", "world", "ag\xEAncia"] },
      { id: "nyt-world", name: "NYT World", url: "https://rss.nytimes.com/services/xml/rss/nyt/World.xml", category: "Mundo", tags: ["nyt", "world", "international", "global"] },
      { id: "bbc-world", name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml", category: "Mundo", tags: ["bbc", "world", "international"] },
      { id: "guardian-us", name: "The Guardian US", url: "https://www.theguardian.com/us-news/rss", category: "Mundo", tags: ["guardian", "us", "eua", "america"] },
      { id: "el-pais", name: "El Pa\xEDs", url: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada", category: "Mundo", tags: ["el pa\xEDs", "espanha", "spain", "espa\xF1ol"] },
      { id: "le-monde", name: "Le Monde", url: "https://www.lemonde.fr/rss/une.xml", category: "Mundo", tags: ["le monde", "france", "fran\xE7ais"] },
      { id: "spiegel", name: "Der Spiegel", url: "https://www.spiegel.de/international/index.rss", category: "Mundo", tags: ["spiegel", "germany", "europe", "international"] },
      { id: "japan-times", name: "The Japan Times", url: "https://www.japantimes.co.jp/feed/", category: "Mundo", tags: ["japan", "asia", "tokyo", "japanese"] },
      { id: "scmp", name: "South China Morning Post", url: "https://www.scmp.com/rss/91/feed", category: "Mundo", tags: ["scmp", "china", "hong kong", "asia"] },
      // Esportes
      { id: "ge", name: "ge (Globo Esporte)", url: "https://ge.globo.com/rss/ge/", category: "Esportes", tags: ["ge", "globo esporte", "futebol", "esportes"] },
      { id: "folha-esporte", name: "Folha Esporte", url: "https://feeds.folha.uol.com.br/esporte/rss091.xml", category: "Esportes", tags: ["folha", "esporte", "futebol"] },
      { id: "lance", name: "Lance!", url: "https://www.lance.com.br/feed/", category: "Esportes", tags: ["lance", "futebol", "esporte"] },
      { id: "uol-esporte", name: "UOL Esporte", url: "https://rss.uol.com.br/feed/esporte.xml", category: "Esportes", tags: ["uol", "esporte", "futebol"] },
      { id: "espn-br", name: "ESPN Brasil", url: "https://www.espn.com.br/espn/rss/noticias", category: "Esportes", tags: ["espn", "esportes", "futebol", "nba", "nfl"] },
      { id: "tnt-sports", name: "TNT Sports", url: "https://www.tntsports.com.br/feed/", category: "Esportes", tags: ["tnt", "sports", "champions league", "futebol"] },
      { id: "terceiro-tempo", name: "Terceiro Tempo", url: "https://terceirotempo.uol.com.br/feed/", category: "Esportes", tags: ["terceiro tempo", "futebol", "hist\xF3ria"] },
      { id: "bbc-sport", name: "BBC Sport", url: "https://feeds.bbci.co.uk/sport/rss.xml", category: "Esportes", tags: ["bbc", "sport", "football", "soccer", "premier league"] },
      { id: "espn", name: "ESPN", url: "https://www.espn.com/espn/rss/news", category: "Esportes", tags: ["espn", "sports", "nba", "nfl", "mlb"] },
      { id: "skysports", name: "Sky Sports", url: "https://www.skysports.com/rss/12040", category: "Esportes", tags: ["sky", "sports", "premier league", "football"] },
      { id: "ge-futebol", name: "ge Futebol", url: "https://ge.globo.com/rss/ge/futebol/", category: "Esportes", tags: ["ge", "futebol", "brasileir\xE3o", "copa"] },
      { id: "ge-f1", name: "ge F\xF3rmula 1", url: "https://ge.globo.com/rss/ge/motor/formula-1/", category: "Esportes", tags: ["ge", "formula 1", "f1", "automobilismo", "corrida"] },
      { id: "surfe-globo", name: "ge Surfe", url: "https://ge.globo.com/rss/ge/surfe/", category: "Esportes", tags: ["surfe", "surf", "wsl", "ondas"] },
      // Ciência
      { id: "g1-ciencia", name: "G1 Ci\xEAncia e Sa\xFAde", url: "https://g1.globo.com/rss/g1/ciencia-e-saude/", category: "Ci\xEAncia", tags: ["globo", "ci\xEAncia", "sa\xFAde", "pesquisa"] },
      { id: "nature", name: "Nature", url: "https://www.nature.com/nature.rss", category: "Ci\xEAncia", tags: ["nature", "science", "research", "papers"] },
      { id: "sciencedaily", name: "ScienceDaily", url: "https://www.sciencedaily.com/rss/all.xml", category: "Ci\xEAncia", tags: ["science", "daily", "research", "discovery"] },
      { id: "nasa", name: "NASA", url: "https://www.nasa.gov/rss/dyn/breaking_news.rss", category: "Ci\xEAncia", tags: ["nasa", "space", "espa\xE7o", "astronomia"] },
      { id: "superinteressante", name: "Superinteressante", url: "https://super.abril.com.br/feed/", category: "Ci\xEAncia", tags: ["super", "interessante", "ci\xEAncia", "curiosidades"] },
      { id: "science-mag", name: "Science Magazine", url: "https://www.science.org/rss/news_current.xml", category: "Ci\xEAncia", tags: ["science", "magazine", "research", "papers"] },
      { id: "new-scientist", name: "New Scientist", url: "https://www.newscientist.com/feed/home/", category: "Ci\xEAncia", tags: ["new scientist", "science", "discovery"] },
      { id: "space-com", name: "Space.com", url: "https://www.space.com/feeds/all", category: "Ci\xEAncia", tags: ["space", "astronomy", "espa\xE7o", "universe"] },
      { id: "phys-org", name: "Phys.org", url: "https://phys.org/rss-feed/", category: "Ci\xEAncia", tags: ["physics", "technology", "science", "research"] },
      { id: "nat-geo", name: "National Geographic", url: "https://www.nationalgeographic.com/feed/", category: "Ci\xEAncia", tags: ["nat geo", "national geographic", "natureza", "animais"] },
      { id: "galileu", name: "Galileu", url: "https://revistagalileu.globo.com/feed/", category: "Ci\xEAncia", tags: ["galileu", "ci\xEAncia", "tecnologia", "brasil"] },
      { id: "science-alert", name: "ScienceAlert", url: "https://www.sciencealert.com/feed", category: "Ci\xEAncia", tags: ["sciencealert", "science", "discovery", "space"] },
      { id: "eso", name: "ESO (Observat\xF3rio Europeu)", url: "https://www.eso.org/public/news/feed/", category: "Ci\xEAncia", tags: ["eso", "astronomy", "telescope", "europe"] },
      // Entretenimento
      { id: "omelete", name: "Omelete", url: "https://www.omelete.com.br/rss", category: "Entretenimento", tags: ["omelete", "cinema", "s\xE9ries", "filmes", "games", "hq"] },
      { id: "adoro-cinema", name: "AdoroCinema", url: "https://www.adorocinema.com/rss/", category: "Entretenimento", tags: ["cinema", "filmes", "s\xE9ries", "cr\xEDticas"] },
      { id: "ign-br", name: "IGN Brasil", url: "https://br.ign.com/feed.xml", category: "Entretenimento", tags: ["ign", "games", "jogos", "reviews", "gaming"] },
      { id: "eurogamer", name: "Eurogamer", url: "https://www.eurogamer.net/feed", category: "Entretenimento", tags: ["eurogamer", "games", "reviews", "pc", "console"] },
      { id: "kotaku", name: "Kotaku", url: "https://kotaku.com/rss", category: "Entretenimento", tags: ["kotaku", "games", "gaming", "culture"] },
      { id: "polygon", name: "Polygon", url: "https://www.polygon.com/rss/index.xml", category: "Entretenimento", tags: ["polygon", "games", "entertainment", "reviews"] },
      { id: "gamespot", name: "GameSpot", url: "https://www.gamespot.com/feeds/mashup/", category: "Entretenimento", tags: ["gamespot", "games", "reviews", "trailers"] },
      { id: "cinema-blend", name: "CinemaBlend", url: "https://www.cinemablend.com/rss/topic/news/all", category: "Entretenimento", tags: ["cinema", "movies", "tv", "streaming"] },
      { id: "variety", name: "Variety", url: "https://variety.com/feed/", category: "Entretenimento", tags: ["variety", "hollywood", "cinema", "tv", "streaming"] },
      { id: "deadline", name: "Deadline", url: "https://deadline.com/feed/", category: "Entretenimento", tags: ["deadline", "hollywood", "film", "tv"] },
      { id: "screen-rant", name: "Screen Rant", url: "https://screenrant.com/feed/", category: "Entretenimento", tags: ["screen rant", "movies", "tv", "comics", "marvel"] },
      { id: "musicradar", name: "MusicRadar", url: "https://www.musicradar.com/rss", category: "Entretenimento", tags: ["music", "guitars", "instruments", "production"] },
      { id: "pitchfork", name: "Pitchfork", url: "https://pitchfork.com/feed/feed-news/rss", category: "Entretenimento", tags: ["pitchfork", "music", "reviews", "albums", "indie"] },
      { id: "veja", name: "Veja", url: "https://veja.abril.com.br/feed/", category: "Entretenimento", tags: ["veja", "revista", "cultura", "brasil"] },
      { id: "pop-sugar", name: "PopSugar", url: "https://www.popsugar.com/feed", category: "Entretenimento", tags: ["popsugar", "celebrity", "culture", "lifestyle"] },
      // Saúde
      { id: "folha-saude", name: "Folha Equil\xEDbrio e Sa\xFAde", url: "https://feeds.folha.uol.com.br/equilibrioesaude/rss091.xml", category: "Sa\xFAde", tags: ["folha", "sa\xFAde", "equil\xEDbrio", "medicina"] },
      { id: "medical-news", name: "Medical News Today", url: "https://www.medicalnewstoday.com/newsfeeds/rss", category: "Sa\xFAde", tags: ["medical", "health", "medicine", "research"] },
      { id: "webmd", name: "WebMD", url: "https://rssfeeds.webmd.com/rss/rss.aspx?RSSSource=RSS_PUBLIC", category: "Sa\xFAde", tags: ["webmd", "health", "medicine", "wellness"] },
      { id: "viva-bem", name: "VivaBem (UOL)", url: "https://rss.uol.com.br/feed/vivabem.xml", category: "Sa\xFAde", tags: ["vivabem", "uol", "sa\xFAde", "bem-estar", "fitness"] },
      // Educação
      { id: "g1-educacao", name: "G1 Educa\xE7\xE3o", url: "https://g1.globo.com/rss/g1/educacao/", category: "Educa\xE7\xE3o", tags: ["globo", "educa\xE7\xE3o", "enem", "vestibular", "escola"] },
      { id: "folha-educacao", name: "Folha Educa\xE7\xE3o", url: "https://feeds.folha.uol.com.br/educacao/rss091.xml", category: "Educa\xE7\xE3o", tags: ["folha", "educa\xE7\xE3o", "ensino", "universidade"] },
      { id: "quero-bolsa", name: "Quero Bolsa", url: "https://querobolsa.com.br/revista/feed", category: "Educa\xE7\xE3o", tags: ["quero bolsa", "faculdade", "bolsa", "estudos"] },
      // Meio Ambiente
      { id: "oeco", name: "O Eco", url: "https://oeco.org.br/feed/", category: "Meio Ambiente", tags: ["o eco", "meio ambiente", "ecologia", "sustentabilidade"] },
      { id: "um-so-planeta", name: "Um S\xF3 Planeta", url: "https://umsoplaneta.globo.com/feed/", category: "Meio Ambiente", tags: ["planeta", "globo", "sustentabilidade", "clima"] },
      { id: "mongabay", name: "Mongabay", url: "https://news.mongabay.com/feed/", category: "Meio Ambiente", tags: ["mongabay", "rainforest", "biodiversity", "environment"] },
      { id: "treehugger", name: "Treehugger", url: "https://www.treehugger.com/feeds/all", category: "Meio Ambiente", tags: ["treehugger", "sustainability", "green", "environment"] },
      // Negócios
      { id: "startse", name: "StartSe", url: "https://www.startse.com/feed/", category: "Neg\xF3cios", tags: ["startse", "startups", "empreendedorismo", "inova\xE7\xE3o"] },
      { id: "pequenas-empresas", name: "PEGN", url: "https://revistapegn.globo.com/feed/", category: "Neg\xF3cios", tags: ["pegn", "pequenas empresas", "neg\xF3cios", "empreendedorismo"] },
      { id: "epoca-negocios", name: "\xC9poca Neg\xF3cios", url: "https://epocanegocios.globo.com/feed/", category: "Neg\xF3cios", tags: ["\xE9poca", "neg\xF3cios", "empresas", "gest\xE3o"] },
      { id: "harvard-br", name: "HBR Brasil", url: "https://hbrbr.com.br/feed/", category: "Neg\xF3cios", tags: ["harvard", "business review", "gest\xE3o", "lideran\xE7a"] },
      { id: "fast-company", name: "Fast Company", url: "https://www.fastcompany.com/latest/rss", category: "Neg\xF3cios", tags: ["fast company", "innovation", "design", "business"] },
      { id: "inc", name: "Inc.", url: "https://www.inc.com/rss/", category: "Neg\xF3cios", tags: ["inc", "startups", "entrepreneurship", "business"] },
      // Segurança
      { id: "krebs", name: "Krebs on Security", url: "https://krebsonsecurity.com/feed/", category: "Seguran\xE7a", tags: ["krebs", "security", "cybersecurity", "hacking"] },
      { id: "threatpost", name: "Threatpost", url: "https://threatpost.com/feed/", category: "Seguran\xE7a", tags: ["threatpost", "security", "vulnerabilities", "malware"] },
      { id: "bleeping", name: "BleepingComputer", url: "https://www.bleepingcomputer.com/feed/", category: "Seguran\xE7a", tags: ["bleeping", "security", "ransomware", "malware"] },
      { id: "hacker-news-sec", name: "The Hacker News", url: "https://feeds.feedburner.com/TheHackersNews", category: "Seguran\xE7a", tags: ["hacker news", "cybersecurity", "infosec", "data breach"] },
      { id: "dark-reading", name: "Dark Reading", url: "https://www.darkreading.com/rss.xml", category: "Seguran\xE7a", tags: ["dark reading", "cybersecurity", "enterprise", "threats"] },
      // Design
      { id: "designboom", name: "Designboom", url: "https://www.designboom.com/feed/", category: "Design", tags: ["designboom", "architecture", "art", "design"] },
      { id: "dezeen", name: "Dezeen", url: "https://www.dezeen.com/feed/", category: "Design", tags: ["dezeen", "architecture", "design", "interiors"] },
      { id: "archdaily-br", name: "ArchDaily Brasil", url: "https://www.archdaily.com.br/br/feed", category: "Design", tags: ["archdaily", "arquitetura", "design", "brasil"] },
      { id: "behance", name: "Behance", url: "https://www.behance.net/feeds/projects", category: "Design", tags: ["behance", "portfolio", "creative", "graphic design"] },
      // Linux / Open Source
      { id: "omgubuntu", name: "OMG! Ubuntu!", url: "https://www.omgubuntu.co.uk/feed", category: "Tecnologia", tags: ["ubuntu", "linux", "open source", "desktop"] },
      { id: "phoronix", name: "Phoronix", url: "https://www.phoronix.com/rss.php", category: "Tecnologia", tags: ["phoronix", "linux", "benchmark", "hardware", "open source"] },
      { id: "itsfoss", name: "It's FOSS", url: "https://itsfoss.com/feed/", category: "Tecnologia", tags: ["foss", "linux", "open source", "ubuntu", "tutorials"] },
      { id: "diolinux", name: "Diolinux", url: "https://diolinux.com.br/feed", category: "Tecnologia", tags: ["diolinux", "linux", "open source", "brasil"] }
    ];
    __name(normalize, "normalize");
    __name(searchCurated, "searchCurated");
    __name(buildGoogleNewsSuggestion, "buildGoogleNewsSuggestion");
    __name(discoverWithGemini, "discoverWithGemini");
    __name(autoDetectRss, "autoDetectRss");
    __name(slugify, "slugify");
    __name(cleanHtmlEntities, "cleanHtmlEntities");
    onRequestGet35 = /* @__PURE__ */ __name(async (context2) => {
      const url = new URL(context2.request.url);
      const query = (url.searchParams.get("q") || "").trim();
      const field = url.searchParams.get("field") || "name";
      if (!query || query.length < 2) {
        return new Response(JSON.stringify({ ok: true, suggestions: [] }), {
          headers: { "Content-Type": "application/json; charset=utf-8" }
        });
      }
      const suggestions = [];
      const seenUrls = /* @__PURE__ */ new Set();
      const addUnique = /* @__PURE__ */ __name((items) => {
        for (const item of items) {
          if (!seenUrls.has(item.url)) {
            seenUrls.add(item.url);
            suggestions.push(item);
          }
        }
      }, "addUnique");
      addUnique(searchCurated(query));
      const isUrl = /^https?:\/\//i.test(query);
      if (field === "url" && isUrl) {
        const detected = await autoDetectRss(query);
        addUnique(detected);
      } else {
        const gnews = buildGoogleNewsSuggestion(query);
        if (gnews) addUnique([gnews]);
      }
      const apiKey = context2.env.GEMINI_API_KEY;
      if (apiKey && query.length >= 3) {
        try {
          const geminiResults = await Promise.race([
            discoverWithGemini(query, apiKey, context2.env.BIGDATA_DB),
            new Promise((resolve) => setTimeout(() => resolve([]), 6e3))
          ]);
          addUnique(geminiResults);
        } catch {
        }
      }
      return new Response(JSON.stringify({
        ok: true,
        suggestions: suggestions.slice(0, 12),
        query,
        field,
        layers: {
          curated: true,
          googleNews: !isUrl,
          geminiAi: Boolean(apiKey),
          autoDetect: field === "url" && isUrl
        }
      }), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=300"
        }
      });
    }, "onRequestGet");
  }
});

// api/news/feed.ts
function detectCharset(contentType, rawBytes) {
  if (contentType) {
    const match2 = contentType.match(/charset=([^\s;]+)/i);
    if (match2) return match2[1].toLowerCase().replace(/['"]/g, "");
  }
  const peek = new TextDecoder("ascii", { fatal: false }).decode(rawBytes.slice(0, 200));
  const xmlMatch = peek.match(/encoding=["']([^"']+)["']/i);
  if (xmlMatch) return xmlMatch[1].toLowerCase();
  return "utf-8";
}
function normalizeCharset(charset) {
  const map = {
    "iso-8859-1": "windows-1252",
    "latin1": "windows-1252",
    "latin-1": "windows-1252",
    "iso_8859-1": "windows-1252",
    "iso8859-1": "windows-1252"
  };
  return map[charset] ?? charset;
}
function parseRSSFeed(xmlText, sourceName, sourceId, maxItems) {
  const items = [];
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let match2;
  while ((match2 = itemRegex.exec(xmlText)) !== null && items.length < maxItems) {
    const block = match2[1];
    const title2 = extractTag(block, "title");
    const link = extractTag(block, "link");
    const pubDate = extractTag(block, "pubDate") || extractTag(block, "dc:date");
    if (!title2 || !link) continue;
    const timestamp = pubDate ? new Date(pubDate).getTime() : 0;
    let thumbnail = null;
    const mediaMatch = block.match(/<media:content[^>]+url=["']([^"']+)["']/);
    if (mediaMatch) thumbnail = mediaMatch[1];
    if (!thumbnail) {
      const mediaThumbMatch = block.match(/<media:thumbnail[^>]+url=["']([^"']+)["']/);
      if (mediaThumbMatch) thumbnail = mediaThumbMatch[1];
    }
    if (!thumbnail) {
      const enclosureMatch = block.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]+type=["']image\//);
      if (enclosureMatch) thumbnail = enclosureMatch[1];
    }
    if (!thumbnail) {
      const descImgMatch = block.match(/<img[^>]+src=["']([^"']+)["']/);
      if (descImgMatch) thumbnail = descImgMatch[1];
    }
    items.push({
      title: cleanHtml(title2),
      link,
      source: sourceName,
      pubDate: pubDate || (/* @__PURE__ */ new Date()).toISOString(),
      timestamp: isNaN(timestamp) ? 0 : timestamp,
      thumbnail
    });
  }
  return items;
}
function extractTag(block, tag) {
  const cdataRegex = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, "i");
  const cdataMatch = block.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();
  const simpleRegex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const simpleMatch = block.match(simpleRegex);
  if (simpleMatch) return simpleMatch[1].trim();
  return "";
}
function cleanHtml(text) {
  let sanitized = text.replace(/&quot;/gi, '"').replace(/&#39;/gi, "'").replace(/&nbsp;/gi, " ");
  let previous;
  do {
    previous = sanitized;
    sanitized = sanitized.replace(/<[^>]*>/g, "");
  } while (sanitized !== previous);
  return sanitized.replace(/[<>]/g, "").trim();
}
async function fetchFeed(source, maxItems) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5e3);
    const response = await fetch(source.url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "LCV-AdminApp-NewsPanel/2.0",
        "Accept": "application/rss+xml, application/xml, text/xml, */*"
      }
    });
    clearTimeout(timeout);
    if (!response.ok) {
      console.warn(`[news] Feed ${source.name} retornou HTTP ${response.status}`);
      return [];
    }
    const contentType = response.headers.get("Content-Type");
    const buffer = await response.arrayBuffer();
    const charset = normalizeCharset(detectCharset(contentType, buffer));
    let xml;
    try {
      xml = new TextDecoder(charset, { fatal: false }).decode(buffer);
    } catch {
      xml = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
    }
    return parseRSSFeed(xml, source.name, source.id, maxItems);
  } catch (error3) {
    console.warn(`[news] Erro ao buscar feed ${source.name}:`, error3);
    return [];
  }
}
var RSS_SOURCES, DEFAULT_MAX_ITEMS, CACHE_TTL_SECONDS, onRequestGet36;
var init_feed = __esm({
  "api/news/feed.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    RSS_SOURCES = [
      { id: "g1", name: "G1", url: "https://g1.globo.com/rss/g1/", category: "brasil" },
      { id: "folha", name: "Folha", url: "https://feeds.folha.uol.com.br/emcimadahora/rss091.xml", category: "brasil" },
      { id: "bbc", name: "BBC Brasil", url: "https://www.bbc.com/portuguese/index.xml", category: "mundo" },
      { id: "techcrunch", name: "TechCrunch", url: "https://techcrunch.com/feed/", category: "tech" }
    ];
    DEFAULT_MAX_ITEMS = 30;
    CACHE_TTL_SECONDS = 600;
    __name(detectCharset, "detectCharset");
    __name(normalizeCharset, "normalizeCharset");
    __name(parseRSSFeed, "parseRSSFeed");
    __name(extractTag, "extractTag");
    __name(cleanHtml, "cleanHtml");
    __name(fetchFeed, "fetchFeed");
    onRequestGet36 = /* @__PURE__ */ __name(async (context2) => {
      const url = new URL(context2.request.url);
      const sourcesParam = url.searchParams.get("sources");
      const customSourcesParam = url.searchParams.get("custom_sources");
      const maxParam = parseInt(url.searchParams.get("max") ?? "", 10);
      const maxItems = maxParam > 0 && maxParam <= 50 ? maxParam : DEFAULT_MAX_ITEMS;
      let activeSources = [];
      if (customSourcesParam) {
        try {
          const parsed = JSON.parse(decodeURIComponent(customSourcesParam));
          if (Array.isArray(parsed)) {
            activeSources = parsed.filter((s) => s.id && s.name && s.url);
          }
        } catch {
        }
      }
      if (activeSources.length === 0) {
        activeSources = sourcesParam ? RSS_SOURCES.filter((s) => sourcesParam.toLowerCase().split(",").includes(s.id)) : RSS_SOURCES;
      }
      const cacheKey = new Request(url.toString(), context2.request);
      const cache = caches.default;
      const cachedResponse = await cache.match(cacheKey);
      if (cachedResponse) {
        return cachedResponse;
      }
      const feedResults = await Promise.allSettled(
        activeSources.map((source) => fetchFeed(source, maxItems))
      );
      const allItems = [];
      for (const result of feedResults) {
        if (result.status === "fulfilled") {
          allItems.push(...result.value);
        }
      }
      allItems.sort((a, b) => b.timestamp - a.timestamp);
      const items = allItems.slice(0, maxItems);
      const body = JSON.stringify({
        ok: true,
        items,
        total: items.length,
        sources: activeSources.map((s) => ({ id: s.id, name: s.name, category: s.category })),
        available_sources: RSS_SOURCES.map((s) => ({ id: s.id, name: s.name, category: s.category })),
        cached: false,
        fetched_at: (/* @__PURE__ */ new Date()).toISOString()
      });
      const response = new Response(body, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}`,
          "Access-Control-Allow-Origin": "*"
        }
      });
      context2.waitUntil(cache.put(cacheKey, response.clone()));
      return response;
    }, "onRequestGet");
  }
});

// api/oraculo/cron.ts
function json16(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
function resolveToken3(env2) {
  return env2.CF_API_TOKEN?.trim() || env2.CLOUDFLARE_API_TOKEN?.trim() || "";
}
var onRequestGet37, onRequestPut5;
var init_cron = __esm({
  "api/oraculo/cron.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name(json16, "json");
    __name(resolveToken3, "resolveToken");
    onRequestGet37 = /* @__PURE__ */ __name(async ({ env: env2 }) => {
      console.log("[oraculo/cron] GET \u2014 Lendo schedule atual do worker cron-taxa-ipca");
      const token = resolveToken3(env2);
      const accountId = env2.CF_ACCOUNT_ID?.trim();
      if (!token || !accountId) {
        console.error("[oraculo/cron] GET \u2014 CF_API_TOKEN ou CF_ACCOUNT_ID ausente");
        return json16({ ok: false, error: "CF_API_TOKEN ou CF_ACCOUNT_ID ausente." }, 503);
      }
      try {
        const res = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/cron-taxa-ipca/schedules`,
          { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
        );
        const data = await res.json();
        if (!res.ok || !data.success) {
          const msg = data.errors?.[0]?.message || `HTTP ${res.status}`;
          return json16({ ok: false, error: `Falha ao ler cron: ${msg}` }, 502);
        }
        const schedules = data.result?.schedules ?? [];
        console.log(`[oraculo/cron] GET \u2014 Schedule atual: ${JSON.stringify(schedules)}`);
        return json16({ ok: true, schedules });
      } catch (err) {
        console.error(`[oraculo/cron] GET \u2014 Erro: ${err instanceof Error ? err.message : err}`);
        return json16({ ok: false, error: err instanceof Error ? err.message : "Erro interno." }, 500);
      }
    }, "onRequestGet");
    onRequestPut5 = /* @__PURE__ */ __name(async ({ env: env2, request }) => {
      const token = resolveToken3(env2);
      const accountId = env2.CF_ACCOUNT_ID?.trim();
      if (!token || !accountId) {
        return json16({ ok: false, error: "CF_API_TOKEN ou CF_ACCOUNT_ID ausente." }, 503);
      }
      let body;
      try {
        body = await request.json();
      } catch {
        return json16({ ok: false, error: 'Body inv\xE1lido (esperado JSON com campo "cron").' }, 400);
      }
      const cronExpr = body.cron?.trim();
      if (!cronExpr) {
        return json16({ ok: false, error: 'Campo "cron" \xE9 obrigat\xF3rio.' }, 400);
      }
      const parts = cronExpr.split(/\s+/);
      if (parts.length !== 5) {
        return json16({ ok: false, error: `Express\xE3o cron inv\xE1lida: esperado 5 segmentos, recebido ${parts.length}.` }, 400);
      }
      try {
        console.log(`[oraculo/cron] Atualizando cron do worker cron-taxa-ipca para: ${cronExpr}`);
        const res = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/cron-taxa-ipca/schedules`,
          {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
              Accept: "application/json"
            },
            body: JSON.stringify([{ cron: cronExpr }])
          }
        );
        const data = await res.json();
        if (!res.ok || !data.success) {
          const msg = data.errors?.[0]?.message || `HTTP ${res.status}`;
          console.error(`[oraculo/cron] Falha ao atualizar cron: ${msg}`);
          return json16({ ok: false, error: `Falha ao atualizar cron: ${msg}` }, 502);
        }
        const schedules = data.result?.schedules ?? [];
        console.log(`[oraculo/cron] Cron atualizado com sucesso: ${JSON.stringify(schedules)}`);
        return json16({ ok: true, schedules, message: `Cron atualizado para: ${cronExpr}` });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro interno.";
        console.error(`[oraculo/cron] Erro: ${msg}`);
        return json16({ ok: false, error: msg }, 500);
      }
    }, "onRequestPut");
  }
});

// api/oraculo/excluir.ts
var onRequestPost31;
var init_excluir2 = __esm({
  "api/oraculo/excluir.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    onRequestPost31 = /* @__PURE__ */ __name(async ({ env: env2, request }) => {
      const adminActor = request.headers.get("X-Admin-Actor");
      if (!adminActor) {
        return new Response(JSON.stringify({ ok: false, error: "Requer cabe\xE7alho X-Admin-Actor." }), {
          status: 401,
          headers: { "Content-Type": "application/json" }
        });
      }
      let body;
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ ok: false, error: "Payload JSON inv\xE1lido." }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      const { id, tipo } = body;
      if (!id || !tipo || !["lci-lca", "tesouro-ipca"].includes(tipo)) {
        return new Response(JSON.stringify({ ok: false, error: "ID e tipo v\xE1lidos s\xE3o obrigat\xF3rios." }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
      const db = env2?.BIGDATA_DB;
      if (!db || typeof db.prepare !== "function") {
        return new Response(JSON.stringify({ ok: false, error: "Database indispon\xEDvel." }), {
          status: 503,
          headers: { "Content-Type": "application/json" }
        });
      }
      try {
        const table3 = tipo === "lci-lca" ? "oraculo_lci_cdb_registros" : "oraculo_tesouro_ipca_lotes";
        const result = await db.prepare(`DELETE FROM ${table3} WHERE id = ?`).bind(id).run();
        if (result.meta?.changes === 0) {
          return new Response(JSON.stringify({ ok: false, error: "Registro n\xE3o encontrado." }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
          });
        }
        const jsonField = tipo === "lci-lca" ? "lciRegistros" : "tesouroRegistros";
        try {
          const { results } = await db.prepare(
            "SELECT id, dados_json FROM oraculo_user_data"
          ).all();
          for (const row of results ?? []) {
            try {
              const dados = JSON.parse(row.dados_json);
              const arr = dados[jsonField];
              if (!arr || !Array.isArray(arr)) continue;
              const filtered = arr.filter((r) => r.id !== id);
              if (filtered.length < arr.length) {
                dados[jsonField] = filtered;
                await db.prepare(
                  "UPDATE oraculo_user_data SET dados_json = ?, updated_at = datetime('now') WHERE id = ?"
                ).bind(JSON.stringify(dados), row.id).run();
              }
            } catch {
            }
          }
        } catch {
          console.warn("[oraculo/excluir] Cascata para oraculo_user_data falhou silenciosamente");
        }
        return new Response(JSON.stringify({ ok: true, request_id: crypto.randomUUID() }), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        });
      } catch {
        return new Response(JSON.stringify({ ok: false, error: "Falha ao excluir registro." }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }, "onRequestPost");
  }
});

// api/oraculo/listar.ts
var onRequestGet38;
var init_listar2 = __esm({
  "api/oraculo/listar.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    onRequestGet38 = /* @__PURE__ */ __name(async ({ env: env2, request }) => {
      const url = new URL(request.url);
      const tipo = url.searchParams.get("tipo") ?? "tesouro-ipca";
      const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);
      const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);
      const db = env2?.BIGDATA_DB;
      if (!db || typeof db.prepare !== "function") {
        return new Response(JSON.stringify({ ok: false, error: "Database binding (BIGDATA_DB) indispon\xEDvel." }), {
          status: 503,
          headers: { "Content-Type": "application/json" }
        });
      }
      try {
        if (tipo === "lci-lca") {
          const stmt = db.prepare("SELECT * FROM oraculo_lci_cdb_registros ORDER BY created_at DESC LIMIT ? OFFSET ?");
          const countStmt = db.prepare("SELECT COUNT(*) as c FROM oraculo_lci_cdb_registros");
          const [res, countRes] = await db.batch([
            stmt.bind(limit, offset),
            countStmt
          ]);
          const total = Number(countRes.results?.[0]?.c ?? 0);
          const items = (res.results ?? []).map((row) => {
            const prazoDias = Number(row.prazo_dias ?? 0);
            const aliquotaIr = prazoDias <= 180 ? 22.5 : prazoDias <= 360 ? 20 : prazoDias <= 720 ? 17.5 : 15;
            return {
              id: row.id,
              criadoEm: row.created_at,
              prazoDias,
              taxaLciLca: row.taxa_cdi,
              aporte: row.aporte,
              aliquotaIr,
              cdbEquivalente: row.rendimento_bruto
            };
          });
          return new Response(JSON.stringify({ ok: true, total, items }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        } else {
          const stmt = db.prepare("SELECT * FROM oraculo_tesouro_ipca_lotes ORDER BY data_compra DESC LIMIT ? OFFSET ?");
          const countStmt = db.prepare("SELECT COUNT(*) as c FROM oraculo_tesouro_ipca_lotes");
          const [res, countRes] = await db.batch([
            stmt.bind(limit, offset),
            countStmt
          ]);
          const total = Number(countRes.results?.[0]?.c ?? 0);
          const items = (res.results ?? []).map((row) => ({
            id: row.id,
            criadoEm: row.created_at,
            dataCompra: row.data_compra,
            valorInvestido: row.valor_investido,
            taxaContratada: row.taxa_contratada
          }));
          return new Response(JSON.stringify({ ok: true, total, items }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          });
        }
      } catch {
        return new Response(JSON.stringify({ ok: false, error: "Falha na consulta ao banco de dados." }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }, "onRequestGet");
  }
});

// api/oraculo/modelos.ts
function json17(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
var onRequestGet39;
var init_modelos4 = __esm({
  "api/oraculo/modelos.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name(json17, "json");
    onRequestGet39 = /* @__PURE__ */ __name(async ({ env: env2 }) => {
      const apiKey = env2?.GEMINI_API_KEY;
      if (!apiKey) return json17({ ok: false, error: "GEMINI_API_KEY n\xE3o configurada." }, 503);
      try {
        const [v1Res, v1betaRes] = await Promise.allSettled([
          fetch(`https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`),
          fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`)
        ]);
        const allModels = /* @__PURE__ */ new Map();
        for (const [apiLabel, result] of [["v1", v1Res], ["v1beta", v1betaRes]]) {
          if (result.status !== "fulfilled" || !result.value.ok) continue;
          const data = await result.value.json();
          if (!data.models) continue;
          for (const m of data.models) {
            const id = m.name.replace("models/", "");
            const lower = id.toLowerCase();
            const isFlashOrPro = lower.includes("flash") || lower.includes("pro");
            const isGemini = lower.startsWith("gemini");
            if (!isGemini || !isFlashOrPro) continue;
            const supportsGenerate = m.supportedGenerationMethods?.includes("generateContent") ?? false;
            if (!supportsGenerate) continue;
            const hasVision = lower.includes("vision") || lower.includes("pro") || lower.includes("flash");
            if (!allModels.has(id)) {
              allModels.set(id, {
                id,
                displayName: m.displayName || id,
                api: apiLabel,
                vision: hasVision
              });
            }
          }
        }
        const models = [...allModels.values()].sort((a, b) => {
          const aPreview = a.id.includes("preview") || a.id.includes("exp") ? 1 : 0;
          const bPreview = b.id.includes("preview") || b.id.includes("exp") ? 1 : 0;
          if (aPreview !== bPreview) return aPreview - bPreview;
          const aPro = a.id.includes("pro") ? 0 : 1;
          const bPro = b.id.includes("pro") ? 0 : 1;
          return aPro - bPro || a.id.localeCompare(b.id);
        });
        return json17({ ok: true, models, total: models.length });
      } catch (err) {
        return json17({ ok: false, error: err instanceof Error ? err.message : "Erro ao listar modelos." }, 500);
      }
    }, "onRequestGet");
  }
});

// api/_lib/oraculo-admin.ts
var DEFAULT_POLICIES3, SUPPORTED_ROUTES3, toDbRoute2, toHeaders21, toInt3, ensureRateLimitTables3, ensureDefaultPolicies3, getRateLimitWindowStats3, listPoliciesWithStats3, upsertRateLimitPolicy3, resetRateLimitPolicy3;
var init_oraculo_admin = __esm({
  "api/_lib/oraculo-admin.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    DEFAULT_POLICIES3 = {
      "analisar-ia": {
        route: "analisar-ia",
        label: "An\xE1lise IA (Gemini)",
        enabled: 1,
        max_requests: 6,
        window_minutes: 15
      },
      "enviar-email": {
        route: "enviar-email",
        label: "Envio de E-mail",
        enabled: 1,
        max_requests: 4,
        window_minutes: 60
      },
      "contato": {
        route: "contato",
        label: "Formul\xE1rio de Contato",
        enabled: 1,
        max_requests: 5,
        window_minutes: 30
      },
      "tesouro-ipca-vision": {
        route: "tesouro-ipca-vision",
        label: "OCR Vision (Gemini)",
        enabled: 1,
        max_requests: 8,
        window_minutes: 15
      }
    };
    SUPPORTED_ROUTES3 = ["analisar-ia", "enviar-email", "contato", "tesouro-ipca-vision"];
    toDbRoute2 = /* @__PURE__ */ __name((route) => route.startsWith("oraculo/") ? route : `oraculo/${route}`, "toDbRoute");
    toHeaders21 = /* @__PURE__ */ __name(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    toInt3 = /* @__PURE__ */ __name((value, fallback) => {
      const parsed = Number.parseInt(String(value), 10);
      return Number.isFinite(parsed) ? parsed : fallback;
    }, "toInt");
    ensureRateLimitTables3 = /* @__PURE__ */ __name(async (db) => {
      await db.prepare(`
    CREATE TABLE IF NOT EXISTS oraculo_rate_limit_policies (
      route TEXT PRIMARY KEY,
      enabled INTEGER NOT NULL DEFAULT 1,
      max_requests INTEGER NOT NULL,
      window_minutes INTEGER NOT NULL,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
      await db.prepare(`
    CREATE TABLE IF NOT EXISTS oraculo_api_rate_limits (
      key TEXT PRIMARY KEY,
      route TEXT NOT NULL,
      window_start INTEGER NOT NULL,
      request_count INTEGER NOT NULL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `).run();
    }, "ensureRateLimitTables");
    ensureDefaultPolicies3 = /* @__PURE__ */ __name(async (db) => {
      await ensureRateLimitTables3(db);
      for (const route of SUPPORTED_ROUTES3) {
        const policy = DEFAULT_POLICIES3[route];
        await db.prepare(`
      INSERT OR IGNORE INTO oraculo_rate_limit_policies (route, enabled, max_requests, window_minutes)
      VALUES (?, ?, ?, ?)
    `).bind(toDbRoute2(policy.route), policy.enabled, policy.max_requests, policy.window_minutes).run();
      }
    }, "ensureDefaultPolicies");
    getRateLimitWindowStats3 = /* @__PURE__ */ __name(async (db, route, windowMinutes) => {
      const now = Date.now();
      const cutoff = now - Math.max(1, toInt3(windowMinutes, 10)) * 60 * 1e3;
      const row = await db.prepare(`
    SELECT
      COALESCE(SUM(request_count), 0) AS total,
      COUNT(DISTINCT key) AS keys
    FROM oraculo_api_rate_limits
    WHERE route = ? AND window_start >= ?
  `).bind(toDbRoute2(route), cutoff).first();
      return {
        total_requests_window: toInt3(row?.total, 0),
        distinct_keys_window: toInt3(row?.keys, 0)
      };
    }, "getRateLimitWindowStats");
    listPoliciesWithStats3 = /* @__PURE__ */ __name(async (db) => {
      await ensureDefaultPolicies3(db);
      const output = [];
      for (const route of SUPPORTED_ROUTES3) {
        const fallback = DEFAULT_POLICIES3[route];
        const row = await db.prepare(`
      SELECT route, enabled, max_requests, window_minutes, updated_at
      FROM oraculo_rate_limit_policies
      WHERE route = ?
      LIMIT 1
    `).bind(toDbRoute2(route)).first();
        const policy = {
          route,
          label: fallback.label,
          enabled: toInt3(row?.enabled, fallback.enabled) === 1,
          max_requests: Math.max(1, toInt3(row?.max_requests, fallback.max_requests)),
          window_minutes: Math.max(1, toInt3(row?.window_minutes, fallback.window_minutes)),
          updated_at: typeof row?.updated_at === "string" ? row.updated_at : null,
          defaults: {
            enabled: fallback.enabled === 1,
            max_requests: fallback.max_requests,
            window_minutes: fallback.window_minutes
          },
          stats: {
            total_requests_window: 0,
            distinct_keys_window: 0
          }
        };
        policy.stats = await getRateLimitWindowStats3(db, route, policy.window_minutes);
        output.push(policy);
      }
      return output;
    }, "listPoliciesWithStats");
    upsertRateLimitPolicy3 = /* @__PURE__ */ __name(async (db, input) => {
      await ensureDefaultPolicies3(db);
      await db.prepare(`
    INSERT INTO oraculo_rate_limit_policies (route, enabled, max_requests, window_minutes, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(route) DO UPDATE SET
      enabled = excluded.enabled,
      max_requests = excluded.max_requests,
      window_minutes = excluded.window_minutes,
      updated_at = CURRENT_TIMESTAMP
  `).bind(toDbRoute2(input.route), input.enabled, input.maxRequests, input.windowMinutes).run();
    }, "upsertRateLimitPolicy");
    resetRateLimitPolicy3 = /* @__PURE__ */ __name(async (db, route) => {
      const fallback = DEFAULT_POLICIES3[route];
      await upsertRateLimitPolicy3(db, {
        route,
        enabled: fallback.enabled,
        maxRequests: fallback.max_requests,
        windowMinutes: fallback.window_minutes
      });
    }, "resetRateLimitPolicy");
  }
});

// api/oraculo/rate-limit.ts
async function onRequestGet40(context2) {
  const trace3 = createResponseTrace(context2.request);
  const db = resolveRateLimitDb3(context2);
  const source = resolveOperationalSource6();
  if (!db) {
    return json18({ ok: false, error: "Nenhum binding D1 dispon\xEDvel (BIGDATA_DB).", ...trace3 }, 503);
  }
  try {
    const adminActor = resolveAdminActorFromRequest(context2.request);
    const policies = await listPoliciesWithStats3(db);
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "oraculo",
          source,
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: "read-rate-limit",
            policies: policies.length,
            adminActor
          }
        });
      } catch {
      }
    }
    return json18({ ok: true, policies, admin_actor: adminActor, ...trace3 });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha ao carregar painel de rate limit do Or\xE1culo";
    const fallbackPolicies = buildFallbackPolicies2();
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "oraculo",
          source,
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: { action: "read-rate-limit" }
        });
      } catch {
      }
    }
    return json18({
      ok: true,
      warnings: [message, "Fallback de pol\xEDticas padr\xE3o aplicado para evitar indisponibilidade do painel."],
      policies: fallbackPolicies,
      ...trace3
    }, 200);
  }
}
async function onRequestPost32(context2) {
  const trace3 = createResponseTrace(context2.request);
  const db = resolveRateLimitDb3(context2);
  const source = resolveOperationalSource6();
  if (!db) {
    return json18({ ok: false, error: "Nenhum binding D1 dispon\xEDvel (BIGDATA_DB).", ...trace3 }, 503);
  }
  try {
    const body = await context2.request.json();
    const adminActor = resolveAdminActorFromRequest(context2.request, body);
    const route = normalizeRoute4(body.route);
    if (!route) {
      return json18({ ok: false, error: "Rota de rate limit inv\xE1lida.", ...trace3 }, 400);
    }
    const action = String(body.action ?? "update").trim();
    if (action === "restore_default") {
      await resetRateLimitPolicy3(db, route);
      const policies2 = await listPoliciesWithStats3(db);
      if (context2.env.BIGDATA_DB) {
        try {
          await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
            module: "oraculo",
            source,
            fallbackUsed: false,
            ok: true,
            metadata: {
              action: "restore-rate-limit-default",
              route,
              adminActor
            }
          });
        } catch {
        }
      }
      return json18({ ok: true, action: "restore_default", policies: policies2, admin_actor: adminActor, ...trace3 });
    }
    const enabled = body.enabled ? 1 : 0;
    const maxRequests = toPositiveInt4(body.max_requests, 10);
    const windowMinutes = toPositiveInt4(body.window_minutes, 10);
    if (maxRequests > 500 || windowMinutes > 1440) {
      return json18({ ok: false, error: "Par\xE2metros fora da faixa permitida.", ...trace3 }, 400);
    }
    await upsertRateLimitPolicy3(db, {
      route,
      enabled,
      maxRequests,
      windowMinutes
    });
    const policies = await listPoliciesWithStats3(db);
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "oraculo",
          source,
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: "save-rate-limit",
            route,
            enabled: enabled === 1,
            maxRequests,
            windowMinutes,
            adminActor
          }
        });
      } catch {
      }
    }
    return json18({ ok: true, action: "update", policies, admin_actor: adminActor, ...trace3 });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Falha ao salvar painel de rate limit do Or\xE1culo";
    if (context2.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context2.env.BIGDATA_DB, {
          module: "oraculo",
          source,
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: { action: "save-rate-limit" }
        });
      } catch {
      }
    }
    return json18({ ok: false, error: message, ...trace3 }, 500);
  }
}
var json18, normalizeRoute4, toPositiveInt4, buildFallbackPolicies2, resolveRateLimitDb3, resolveOperationalSource6;
var init_rate_limit4 = __esm({
  "api/oraculo/rate-limit.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_oraculo_admin();
    init_admin_actor();
    init_request_trace();
    json18 = /* @__PURE__ */ __name((data, status = 200) => new Response(JSON.stringify(data), {
      status,
      headers: toHeaders21()
    }), "json");
    normalizeRoute4 = /* @__PURE__ */ __name((value) => {
      const route = String(value ?? "").trim();
      if (SUPPORTED_ROUTES3.includes(route)) {
        return route;
      }
      return null;
    }, "normalizeRoute");
    toPositiveInt4 = /* @__PURE__ */ __name((value, fallback) => {
      const parsed = Number.parseInt(String(value), 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
      }
      return parsed;
    }, "toPositiveInt");
    buildFallbackPolicies2 = /* @__PURE__ */ __name(() => [
      {
        route: "analisar-ia",
        label: "An\xE1lise IA (Gemini)",
        enabled: true,
        max_requests: 6,
        window_minutes: 15,
        updated_at: null,
        defaults: { enabled: true, max_requests: 6, window_minutes: 15 },
        stats: { total_requests_window: 0, distinct_keys_window: 0 }
      },
      {
        route: "enviar-email",
        label: "Envio de E-mail",
        enabled: true,
        max_requests: 4,
        window_minutes: 60,
        updated_at: null,
        defaults: { enabled: true, max_requests: 4, window_minutes: 60 },
        stats: { total_requests_window: 0, distinct_keys_window: 0 }
      },
      {
        route: "contato",
        label: "Formul\xE1rio de Contato",
        enabled: true,
        max_requests: 5,
        window_minutes: 30,
        updated_at: null,
        defaults: { enabled: true, max_requests: 5, window_minutes: 30 },
        stats: { total_requests_window: 0, distinct_keys_window: 0 }
      },
      {
        route: "tesouro-ipca-vision",
        label: "OCR Vision (Gemini)",
        enabled: true,
        max_requests: 8,
        window_minutes: 15,
        updated_at: null,
        defaults: { enabled: true, max_requests: 8, window_minutes: 15 },
        stats: { total_requests_window: 0, distinct_keys_window: 0 }
      }
    ], "buildFallbackPolicies");
    resolveRateLimitDb3 = /* @__PURE__ */ __name((context2) => context2.env.BIGDATA_DB, "resolveRateLimitDb");
    resolveOperationalSource6 = /* @__PURE__ */ __name(() => "bigdata_db", "resolveOperationalSource");
    __name(onRequestGet40, "onRequestGet");
    __name(onRequestPost32, "onRequestPost");
  }
});

// api/oraculo/taxacache.ts
function json19(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
function parseCSV(csvText) {
  const clean = csvText.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = clean.trim().split("\n");
  if (lines.length < 2) return { titulos: [], totalLines: lines.length, sampleRow: lines[0] ?? "" };
  const sampleRow = lines[lines.length - 1];
  function dateKey(dataBR) {
    const [d, m, y] = dataBR.split("/");
    return `${y}${m}${d}`;
  }
  __name(dateKey, "dateKey");
  let latestDateKey = "";
  let latestDateBR = "";
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(";");
    if (cols.length < 5) continue;
    const dataBase = cols[2]?.trim() ?? "";
    if (!dataBase || !dataBase.includes("/")) continue;
    const dk = dateKey(dataBase);
    if (dk > latestDateKey) {
      latestDateKey = dk;
      latestDateBR = dataBase;
    }
  }
  if (!latestDateBR) return { titulos: [], totalLines: lines.length, sampleRow };
  const results = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(";");
    if (cols.length < 5) continue;
    const tipoTitulo = cols[0].trim();
    const dataVencimento = cols[1]?.trim() ?? "";
    const dataBase = cols[2]?.trim() ?? "";
    const taxaCompra = parseFloat((cols[3] ?? "0").replace(",", "."));
    const taxaVenda = parseFloat((cols[4] ?? "0").replace(",", "."));
    const puCompra = parseFloat((cols[5] ?? "0").replace(",", "."));
    if (dataBase !== latestDateBR) continue;
    const tipoLower = tipoTitulo.toLowerCase();
    const isIpca = tipoLower.includes("ipca") || tipoLower.includes("ntn-b");
    if (!isIpca) continue;
    results.push({
      tipo: tipoTitulo,
      vencimento: dataVencimento,
      dataBase,
      taxaCompra: isNaN(taxaCompra) ? 0 : taxaCompra,
      taxaVenda: isNaN(taxaVenda) ? 0 : taxaVenda,
      pu: isNaN(puCompra) ? 0 : puCompra
    });
  }
  return { titulos: results, totalLines: lines.length, sampleRow };
}
var onRequestGet41;
var init_taxacache = __esm({
  "api/oraculo/taxacache.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name(json19, "json");
    __name(parseCSV, "parseCSV");
    onRequestGet41 = /* @__PURE__ */ __name(async ({ env: env2, request }) => {
      const db = env2?.BIGDATA_DB;
      if (!db || typeof db.prepare !== "function")
        return json19({ ok: false, error: "BIGDATA_DB indispon\xEDvel." }, 503);
      const url = new URL(request.url);
      const force = url.searchParams.get("force") === "true";
      try {
        const hoje = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
        const cacheRow = await db.prepare(
          "SELECT data_referencia, taxa_indicativa, vencimentos_json, atualizado_em FROM oraculo_taxa_ipca_cache WHERE id = ? LIMIT 1"
        ).bind("latest").first();
        if (!force && cacheRow && cacheRow.atualizado_em?.startsWith(hoje)) {
          return json19({
            ok: true,
            fonte: "cache",
            dataReferencia: cacheRow.data_referencia,
            taxaMediaIndicativa: cacheRow.taxa_indicativa,
            atualizadoEm: cacheRow.atualizado_em,
            titulos: JSON.parse(cacheRow.vencimentos_json)
          });
        }
        const csvUrl = "https://www.tesourotransparente.gov.br/ckan/dataset/df56aa42-484a-4a59-8184-7676580c81e3/resource/796d2059-14e9-44e3-80c9-2d9e30b405c1/download/precotaxatesourodireto.csv";
        const csvRes = await fetch(csvUrl);
        if (!csvRes.ok) {
          if (cacheRow) {
            return json19({
              ok: true,
              fonte: "cache-stale",
              dataReferencia: cacheRow.data_referencia,
              taxaMediaIndicativa: cacheRow.taxa_indicativa,
              atualizadoEm: cacheRow.atualizado_em,
              titulos: JSON.parse(cacheRow.vencimentos_json)
            });
          }
          return json19({ ok: false, error: `CSV indispon\xEDvel (HTTP ${csvRes.status}).` }, 502);
        }
        const csvText = await csvRes.text();
        const { titulos, totalLines, sampleRow } = parseCSV(csvText);
        if (titulos.length === 0) {
          if (cacheRow) {
            return json19({
              ok: true,
              fonte: "cache-stale",
              dataReferencia: cacheRow.data_referencia,
              taxaMediaIndicativa: cacheRow.taxa_indicativa,
              atualizadoEm: cacheRow.atualizado_em,
              titulos: JSON.parse(cacheRow.vencimentos_json)
            });
          }
          return json19({
            ok: false,
            error: "Nenhum t\xEDtulo IPCA+ encontrado no CSV.",
            debug: { totalLines, sampleRow: sampleRow.substring(0, 200), csvBytes: csvText.length }
          }, 200);
        }
        const taxasValidas = titulos.filter((t) => t.taxaCompra > 0);
        const taxaMedia = taxasValidas.length > 0 ? Math.round(taxasValidas.reduce((s, t) => s + t.taxaCompra, 0) / taxasValidas.length * 100) / 100 : 0;
        const dataRef = titulos[0].dataBase;
        const vencJson = JSON.stringify(titulos);
        const agora = (/* @__PURE__ */ new Date()).toISOString();
        await db.prepare(
          `INSERT INTO oraculo_taxa_ipca_cache (id, data_referencia, taxa_indicativa, vencimentos_json, atualizado_em)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET data_referencia = ?, taxa_indicativa = ?, vencimentos_json = ?, atualizado_em = ?`
        ).bind("latest", dataRef, taxaMedia, vencJson, agora, dataRef, taxaMedia, vencJson, agora).run();
        return json19({
          ok: true,
          fonte: "tesouro-transparente",
          dataReferencia: dataRef,
          taxaMediaIndicativa: taxaMedia,
          atualizadoEm: agora,
          titulos
        });
      } catch (err) {
        return json19({ ok: false, error: err instanceof Error ? err.message : "Erro interno." }, 500);
      }
    }, "onRequestGet");
  }
});

// api/oraculo/userdata.ts
function jsonResponse3(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
var onRequestGet42, onRequestDelete4;
var init_userdata2 = __esm({
  "api/oraculo/userdata.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name(jsonResponse3, "jsonResponse");
    onRequestGet42 = /* @__PURE__ */ __name(async ({ env: env2, request }) => {
      const db = env2?.BIGDATA_DB;
      if (!db || typeof db.prepare !== "function") {
        return jsonResponse3({ ok: false, error: "BIGDATA_DB indispon\xEDvel." }, 503);
      }
      try {
        const url = new URL(request.url);
        const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);
        const offset = Number(url.searchParams.get("offset") ?? 0);
        await db.prepare(`
      CREATE TABLE IF NOT EXISTS oraculo_user_data (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        dados_json TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now'))
      )
    `).run();
        const countRow = await db.prepare("SELECT COUNT(*) as total FROM oraculo_user_data").first();
        const total = countRow?.total ?? 0;
        const { results } = await db.prepare(
          `SELECT id, email, dados_json, created_at, updated_at
       FROM oraculo_user_data
       ORDER BY datetime(updated_at) DESC
       LIMIT ? OFFSET ?`
        ).bind(limit, offset).all();
        const data = (results ?? []).map((row) => ({
          id: row.id,
          email: row.email,
          dadosJson: row.dados_json,
          criadoEm: row.created_at,
          atualizadoEm: row.updated_at
        }));
        return jsonResponse3({ ok: true, data, total, limit, offset });
      } catch (error3) {
        return jsonResponse3({
          ok: false,
          error: error3 instanceof Error ? error3.message : "Erro ao listar dados de usu\xE1rios."
        }, 500);
      }
    }, "onRequestGet");
    onRequestDelete4 = /* @__PURE__ */ __name(async ({ env: env2, request }) => {
      const db = env2?.BIGDATA_DB;
      if (!db || typeof db.prepare !== "function") {
        return jsonResponse3({ ok: false, error: "BIGDATA_DB indispon\xEDvel." }, 503);
      }
      try {
        const url = new URL(request.url);
        const id = url.searchParams.get("id")?.trim();
        if (!id) {
          return jsonResponse3({ ok: false, error: "Par\xE2metro id \xE9 obrigat\xF3rio." }, 400);
        }
        const row = await db.prepare(
          "SELECT email, dados_json FROM oraculo_user_data WHERE id = ? LIMIT 1"
        ).bind(id).first();
        if (!row) {
          return jsonResponse3({ ok: false, error: "Registro n\xE3o encontrado." }, 404);
        }
        const email = row.email;
        const deletedCounts = { userdata: 0, lotes: 0, registros: 0, tokens: 0 };
        let tesouroIds = [];
        let lciIds = [];
        try {
          const dados = JSON.parse(row.dados_json);
          tesouroIds = (dados.tesouroRegistros ?? []).map((r) => r.id).filter((v) => typeof v === "string" && v.length > 0);
          lciIds = (dados.lciRegistros ?? []).map((r) => r.id).filter((v) => typeof v === "string" && v.length > 0);
        } catch {
          console.warn(`[oraculo/userdata DELETE] dados_json inv\xE1lido para user ${id}, prosseguindo sem cascata de IDs`);
        }
        for (const lotId of tesouroIds) {
          const result = await db.prepare(
            "DELETE FROM oraculo_tesouro_ipca_lotes WHERE id = ?"
          ).bind(lotId).run();
          if (result?.meta?.changes && result.meta.changes > 0) deletedCounts.lotes++;
        }
        for (const regId of lciIds) {
          const result = await db.prepare(
            "DELETE FROM oraculo_lci_cdb_registros WHERE id = ?"
          ).bind(regId).run();
          if (result?.meta?.changes && result.meta.changes > 0) deletedCounts.registros++;
        }
        const tokenResult = await db.prepare(
          "DELETE FROM oraculo_auth_tokens WHERE email = ?"
        ).bind(email).run();
        deletedCounts.tokens = tokenResult?.meta?.changes ?? 0;
        try {
          await db.prepare(`ALTER TABLE oraculo_tesouro_ipca_lotes ADD COLUMN email TEXT DEFAULT ''`).run();
        } catch {
        }
        try {
          await db.prepare(`ALTER TABLE oraculo_lci_cdb_registros ADD COLUMN email TEXT DEFAULT ''`).run();
        } catch {
        }
        await db.prepare("DELETE FROM oraculo_tesouro_ipca_lotes WHERE email = ?").bind(email).run();
        await db.prepare("DELETE FROM oraculo_lci_cdb_registros WHERE email = ?").bind(email).run();
        await db.prepare("DELETE FROM oraculo_user_data WHERE id = ?").bind(id).run();
        deletedCounts.userdata = 1;
        console.log(`[oraculo/userdata DELETE] Cascata completa para ${email}:`, JSON.stringify(deletedCounts));
        return jsonResponse3({
          ok: true,
          email,
          deleted: deletedCounts
        });
      } catch (error3) {
        console.error("[oraculo/userdata DELETE] Erro:", error3);
        return jsonResponse3({
          ok: false,
          error: error3 instanceof Error ? error3.message : "Erro ao excluir registro."
        }, 500);
      }
    }, "onRequestDelete");
  }
});

// api/overview/operational.ts
async function onRequestGet43(context2) {
  const { env: env2 } = context2;
  const trace3 = createResponseTrace(context2.request);
  if (!env2.BIGDATA_DB) {
    return new Response(JSON.stringify({
      ok: true,
      ...trace3,
      source: "no-bigdata-binding",
      modules: [],
      sync: [],
      generatedAt: Date.now()
    }), { headers: toResponseHeaders5() });
  }
  try {
    await ensureOperationalTables(env2.BIGDATA_DB);
    const since = Date.now() - 24 * 60 * 60 * 1e3;
    const eventsAgg = await env2.BIGDATA_DB.prepare(`
      SELECT
        module,
        COUNT(1) AS total_events,
        SUM(CASE WHEN fallback_used = 1 THEN 1 ELSE 0 END) AS fallback_events,
        SUM(CASE WHEN ok = 0 THEN 1 ELSE 0 END) AS error_events,
        (SELECT source FROM adminapp_module_events e2 WHERE e2.module = e1.module ORDER BY e2.created_at DESC LIMIT 1) AS last_source,
        (SELECT ok FROM adminapp_module_events e3 WHERE e3.module = e1.module ORDER BY e3.created_at DESC LIMIT 1) AS last_ok
      FROM adminapp_module_events e1
      WHERE created_at >= ?
      GROUP BY module
      ORDER BY module ASC
    `).bind(since).all();
    const syncAgg = await env2.BIGDATA_DB.prepare(`
      SELECT
        module,
        COUNT(1) AS total_runs,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS success_runs,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS error_runs,
        (SELECT status FROM adminapp_sync_runs s2 WHERE s2.module = s1.module ORDER BY s2.started_at DESC LIMIT 1) AS last_status,
        (SELECT finished_at FROM adminapp_sync_runs s3 WHERE s3.module = s1.module ORDER BY s3.started_at DESC LIMIT 1) AS last_finished_at
      FROM adminapp_sync_runs s1
      GROUP BY module
      ORDER BY module ASC
    `).all();
    const modules = (eventsAgg.results ?? []).map((row) => ({
      module: String(row.module ?? "unknown"),
      totalEvents24h: Number(row.total_events ?? 0),
      fallbackEvents24h: Number(row.fallback_events ?? 0),
      errorEvents24h: Number(row.error_events ?? 0),
      lastSource: String(row.last_source ?? "unknown"),
      lastOk: Number(row.last_ok ?? 0) === 1
    }));
    const sync = (syncAgg.results ?? []).map((row) => ({
      module: String(row.module ?? "unknown"),
      totalRuns: Number(row.total_runs ?? 0),
      successRuns: Number(row.success_runs ?? 0),
      errorRuns: Number(row.error_runs ?? 0),
      lastStatus: String(row.last_status ?? "none"),
      lastFinishedAt: Number.isFinite(Number(row.last_finished_at)) ? Number(row.last_finished_at) : null
    }));
    return new Response(JSON.stringify({
      ok: true,
      ...trace3,
      source: "bigdata_db",
      generatedAt: Date.now(),
      modules,
      sync
    }), { headers: toResponseHeaders5() });
  } catch (error3) {
    const message = error3 instanceof Error ? error3.message : "Erro operacional desconhecido";
    return new Response(JSON.stringify({
      ok: false,
      ...trace3,
      error: message,
      modules: [],
      sync: [],
      generatedAt: Date.now()
    }), {
      status: 500,
      headers: toResponseHeaders5()
    });
  }
}
var toResponseHeaders5;
var init_operational2 = __esm({
  "api/overview/operational.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_request_trace();
    toResponseHeaders5 = /* @__PURE__ */ __name(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toResponseHeaders");
    __name(onRequestGet43, "onRequestGet");
  }
});

// api/telemetry/delete.ts
async function onRequestDelete5(context2) {
  const { env: env2 } = context2;
  const trace3 = createResponseTrace(context2.request);
  const db = env2.BIGDATA_DB;
  if (!db) {
    return new Response(JSON.stringify({ ok: false, error: "Binding BIGDATA_DB indispon\xEDvel.", ...trace3 }), { status: 503, headers: { "Content-Type": "application/json" } });
  }
  const url = new URL(context2.request.url);
  const table3 = url.searchParams.get("table");
  const id = url.searchParams.get("id");
  if (!table3 || !id) {
    return new Response(JSON.stringify({ ok: false, error: "Par\xE2metros obrigat\xF3rios: table, id.", ...trace3 }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  if (!ALLOWED_TABLES.includes(table3)) {
    return new Response(JSON.stringify({ ok: false, error: `Tabela "${table3}" n\xE3o permitida.`, ...trace3 }), { status: 403, headers: { "Content-Type": "application/json" } });
  }
  try {
    await db.prepare(`DELETE FROM ${table3} WHERE id = ?`).bind(Number(id)).run();
    return new Response(JSON.stringify({ ok: true, ...trace3, deleted: { table: table3, id: Number(id) } }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao excluir registro.";
    return new Response(JSON.stringify({ ok: false, error: message, ...trace3 }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
var ALLOWED_TABLES;
var init_delete2 = __esm({
  "api/telemetry/delete.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_request_trace();
    ALLOWED_TABLES = [
      "mainsite_contact_logs",
      "mainsite_shares",
      "mainsite_chat_logs",
      "mainsite_chat_context_audit",
      "adminapp_module_events",
      "adminapp_sync_runs"
    ];
    __name(onRequestDelete5, "onRequestDelete");
  }
});

// api/telemetry/telemetry.ts
async function onRequestGet44(context2) {
  const { env: env2 } = context2;
  const trace3 = createResponseTrace(context2.request);
  const db = env2.BIGDATA_DB;
  if (!db) {
    return new Response(JSON.stringify({ ok: false, error: "Binding BIGDATA_DB indispon\xEDvel.", ...trace3 }), { status: 503, headers: headers() });
  }
  try {
    await ensureOperationalTables(db);
    const since24h = Date.now() - 24 * 60 * 60 * 1e3;
    const eventsAgg = await db.prepare(`
      SELECT module,
        COUNT(1) AS total_events,
        SUM(CASE WHEN fallback_used = 1 THEN 1 ELSE 0 END) AS fallback_events,
        SUM(CASE WHEN ok = 0 THEN 1 ELSE 0 END) AS error_events,
        (SELECT source FROM adminapp_module_events e2 WHERE e2.module = e1.module ORDER BY e2.created_at DESC LIMIT 1) AS last_source,
        (SELECT ok FROM adminapp_module_events e3 WHERE e3.module = e1.module ORDER BY e3.created_at DESC LIMIT 1) AS last_ok
      FROM adminapp_module_events e1
      WHERE created_at >= ?
      GROUP BY module ORDER BY module ASC
    `).bind(since24h).all();
    const eventLog = await db.prepare(`
      SELECT id, created_at, module, source, fallback_used, ok, error_message, metadata_json
      FROM adminapp_module_events ORDER BY created_at DESC LIMIT 100
    `).all();
    const syncAgg = await db.prepare(`
      SELECT module,
        COUNT(1) AS total_runs,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) AS success_runs,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) AS error_runs,
        (SELECT status FROM adminapp_sync_runs s2 WHERE s2.module = s1.module ORDER BY s2.started_at DESC LIMIT 1) AS last_status,
        (SELECT finished_at FROM adminapp_sync_runs s3 WHERE s3.module = s1.module ORDER BY s3.started_at DESC LIMIT 1) AS last_finished_at
      FROM adminapp_sync_runs s1
      GROUP BY module ORDER BY module ASC
    `).all();
    const safeQuery = /* @__PURE__ */ __name(async (query) => {
      try {
        return (await db.prepare(query).all()).results ?? [];
      } catch {
        return [];
      }
    }, "safeQuery");
    const contacts = await safeQuery("SELECT * FROM mainsite_contact_logs ORDER BY created_at DESC LIMIT 200");
    const shares = await safeQuery("SELECT * FROM mainsite_shares ORDER BY created_at DESC LIMIT 200");
    const chatLogs = await safeQuery("SELECT * FROM mainsite_chat_logs ORDER BY created_at DESC LIMIT 200");
    const chatAudit = await safeQuery("SELECT * FROM mainsite_chat_context_audit ORDER BY created_at DESC LIMIT 200");
    return new Response(JSON.stringify({
      ok: true,
      ...trace3,
      source: "bigdata_db",
      generatedAt: Date.now(),
      modules: eventsAgg.results ?? [],
      eventLog: eventLog.results ?? [],
      sync: syncAgg.results ?? [],
      contacts,
      shares,
      chatLogs,
      chatAudit
    }), { headers: headers() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro de telemetria desconhecido.";
    return new Response(JSON.stringify({ ok: false, error: message, ...trace3 }), { status: 500, headers: headers() });
  }
}
var headers;
var init_telemetry = __esm({
  "api/telemetry/telemetry.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_request_trace();
    headers = /* @__PURE__ */ __name(() => ({ "Content-Type": "application/json", "Cache-Control": "no-store" }), "headers");
    __name(onRequestGet44, "onRequestGet");
  }
});

// api/tlsrpt/[[path]].ts
var onRequest;
var init_path = __esm({
  "api/tlsrpt/[[path]].ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    onRequest = /* @__PURE__ */ __name(async (context2) => {
      const url = new URL(context2.request.url);
      const backendPath = url.pathname.replace("/api/tlsrpt", "") || "/";
      const backendUrl = new URL(backendPath + url.search, "http://worker.localhost");
      const serviceRequest = new Request(backendUrl.toString(), context2.request);
      try {
        const response = await context2.env.TLSRPT_MOTOR.fetch(serviceRequest);
        return response;
      } catch (error3) {
        const message = error3 instanceof Error ? error3.message : String(error3);
        return new Response(JSON.stringify({ error: "Erro no proxy interno: " + message }), {
          status: 502,
          headers: { "Content-Type": "application/json" }
        });
      }
    }, "onRequest");
  }
});

// api/config-store.ts
async function ensureTable3(db) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      module_key TEXT PRIMARY KEY,
      config_json TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `).run();
}
async function onRequestGet45(ctx) {
  const db = ctx.env.BIGDATA_DB;
  if (!db) return Response.json({ ok: false, error: "BIGDATA_DB n\xE3o configurada." }, { status: 500 });
  await ensureTable3(db);
  const url = new URL(ctx.request.url);
  const moduleKey = url.searchParams.get("module");
  if (!moduleKey) {
    return Response.json({ ok: false, error: 'Par\xE2metro "module" \xE9 obrigat\xF3rio.' }, { status: 400 });
  }
  try {
    const row = await db.prepare(`SELECT config_json FROM ${TABLE} WHERE module_key = ?`).bind(moduleKey).first();
    const config2 = row ? JSON.parse(row.config_json) : null;
    return Response.json({ ok: true, config: config2 });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
async function onRequestPost33(ctx) {
  const db = ctx.env.BIGDATA_DB;
  if (!db) return Response.json({ ok: false, error: "BIGDATA_DB n\xE3o configurada." }, { status: 500 });
  await ensureTable3(db);
  let body;
  try {
    body = await ctx.request.json();
  } catch {
    return Response.json({ ok: false, error: "Body JSON inv\xE1lido." }, { status: 400 });
  }
  const { module: moduleKey, config: config2 } = body;
  if (!moduleKey || !config2) {
    return Response.json({ ok: false, error: 'Campos "module" e "config" s\xE3o obrigat\xF3rios.' }, { status: 400 });
  }
  try {
    const json20 = JSON.stringify(config2);
    await db.prepare(`
      INSERT INTO ${TABLE} (module_key, config_json, updated_at)
      VALUES (?, ?, datetime('now'))
      ON CONFLICT(module_key) DO UPDATE SET
        config_json = excluded.config_json,
        updated_at = excluded.updated_at
    `).bind(moduleKey, json20).run();
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
var TABLE;
var init_config_store = __esm({
  "api/config-store.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    TABLE = "admin_module_configs";
    __name(ensureTable3, "ensureTable");
    __name(onRequestGet45, "onRequestGet");
    __name(onRequestPost33, "onRequestPost");
  }
});

// api/health.ts
async function onRequestGet46() {
  return new Response(JSON.stringify({
    ok: true,
    app: "admin-app",
    version: "APP v01.31.02",
    phase: "fase-1-shell",
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  }), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });
}
var init_health2 = __esm({
  "api/health.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name(onRequestGet46, "onRequestGet");
  }
});

// api/_lib/http-common.ts
function createJsonHeaders(additional, secure = true) {
  const base = secure ? SECURE_HEADERS : STANDARD_JSON_HEADERS;
  return {
    ...base,
    ...additional || {}
  };
}
function jsonResponse4(body, status = 200, additional) {
  return new Response(JSON.stringify(body), {
    status,
    headers: createJsonHeaders(additional)
  });
}
function errorResponse(message, status = 400, details) {
  const body = {
    error: message
  };
  if (details) {
    body.details = details;
  }
  return jsonResponse4(body, status);
}
function successResponse(data, status = 200) {
  return jsonResponse4(
    {
      success: true,
      data
    },
    status
  );
}
var STANDARD_JSON_HEADERS, SECURE_HEADERS, CACHEABLE_HEADERS;
var init_http_common = __esm({
  "api/_lib/http-common.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    STANDARD_JSON_HEADERS = {
      "Content-Type": "application/json; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Cache-Control": "no-store, max-age=0, must-revalidate"
    };
    SECURE_HEADERS = {
      ...STANDARD_JSON_HEADERS,
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "X-Permitted-Cross-Domain-Policies": "none"
    };
    CACHEABLE_HEADERS = {
      ...STANDARD_JSON_HEADERS,
      "Cache-Control": "public, max-age=3600, s-maxage=86400"
      // Note: ETag is set dynamically per response - not included as a static header
    };
    __name(createJsonHeaders, "createJsonHeaders");
    __name(jsonResponse4, "jsonResponse");
    __name(errorResponse, "errorResponse");
    __name(successResponse, "successResponse");
  }
});

// api/config.ts
function validateConfig(config2) {
  if (!config2 || typeof config2 !== "object") {
    return { valid: false, error: "Configuration must be an object" };
  }
  const cfg = config2;
  if (cfg.theme && typeof cfg.theme === "object") {
    const theme = cfg.theme;
    if (theme.colors && typeof theme.colors === "object") {
      const colors = theme.colors;
      if (colors.primary && typeof colors.primary === "string" && !colors.primary.match(/^#[0-9a-f]{6}$/i)) {
        return { valid: false, error: "Invalid primary color format" };
      }
    }
  }
  if (cfg.rateLimits && typeof cfg.rateLimits === "object") {
    for (const [route, policy] of Object.entries(cfg.rateLimits)) {
      if (policy && typeof policy === "object") {
        const p = policy;
        if (typeof p.max_requests === "number" && (p.max_requests < 1 || p.max_requests > 500)) {
          return { valid: false, error: `Invalid max_requests for ${route}` };
        }
        if (typeof p.window_minutes === "number" && (p.window_minutes < 1 || p.window_minutes > 1440)) {
          return { valid: false, error: `Invalid window_minutes for ${route}` };
        }
      }
    }
  }
  return { valid: true };
}
async function handleGet() {
  try {
    return jsonResponse4(DEFAULT_CONFIG, 200);
  } catch (error3) {
    console.error("Failed to retrieve config:", error3);
    return errorResponse("Failed to retrieve configuration", 500);
  }
}
async function handlePost(request) {
  try {
    const body = await request.json();
    const validation = validateConfig(body);
    if (!validation.valid) {
      return errorResponse(validation.error || "Invalid configuration", 400);
    }
    const sanitized = JSON.parse(JSON.stringify(body));
    console.log("Configuration updated:", sanitized);
    return successResponse(
      {
        message: "Configuration saved successfully",
        config: sanitized
      },
      200
    );
  } catch (error3) {
    console.error("Failed to save config:", error3);
    return errorResponse("Failed to save configuration", 500);
  }
}
async function handleDelete(_request, _env) {
  try {
    console.log("Configuration reset to defaults");
    return successResponse(
      {
        message: "Configuration reset to defaults",
        config: DEFAULT_CONFIG
      },
      200
    );
  } catch (error3) {
    console.error("Failed to reset config:", error3);
    return errorResponse("Failed to reset configuration", 500);
  }
}
async function onRequest2(context2) {
  const { request, env: env2 } = context2;
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }
  try {
    switch (request.method) {
      case "GET":
        return await handleGet();
      case "POST":
        return await handlePost(request);
      case "DELETE":
        return await handleDelete(request, env2);
      default:
        return errorResponse(`Method ${request.method} not allowed`, 405);
    }
  } catch (error3) {
    console.error("Config endpoint error:", error3);
    return errorResponse("Internal server error", 500);
  }
}
var DEFAULT_CONFIG;
var init_config3 = __esm({
  "api/config.ts"() {
    "use strict";
    init_functionsRoutes_0_600015277897325();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_http_common();
    DEFAULT_CONFIG = {
      theme: {
        colors: {
          primary: "#3b82f6",
          secondary: "#a855f7",
          success: "#10b981",
          error: "#ef4444",
          warning: "#f59e0b",
          info: "#06b6d4"
        },
        typography: {
          fontSize: "base",
          fontWeight: "normal",
          lineHeightMultiplier: 1.5
        },
        spacing: {
          gap: "base",
          padding: "base",
          borderRadius: "base"
        }
      },
      rateLimits: {
        astrologo_calcular: { enabled: true, max_requests: 20, window_minutes: 60 },
        astrologo_analisar: { enabled: true, max_requests: 10, window_minutes: 60 },
        astrologo_email: { enabled: true, max_requests: 5, window_minutes: 60 },
        itau_calcular: { enabled: true, max_requests: 30, window_minutes: 60 },
        itau_taxa: { enabled: true, max_requests: 50, window_minutes: 60 },
        itau_email: { enabled: true, max_requests: 5, window_minutes: 60 },
        mainsite_chatbot: { enabled: true, max_requests: 20, window_minutes: 60 },
        mainsite_email: { enabled: true, max_requests: 10, window_minutes: 60 },
        mtasts_generate: { enabled: true, max_requests: 50, window_minutes: 60 },
        mtasts_update: { enabled: true, max_requests: 30, window_minutes: 60 }
      },
      accessibility: {
        highContrast: false,
        reducedMotion: false
      }
    };
    __name(validateConfig, "validateConfig");
    __name(handleGet, "handleGet");
    __name(handlePost, "handlePost");
    __name(handleDelete, "handleDelete");
    __name(onRequest2, "onRequest");
  }
});

// ../.wrangler/tmp/pages-FQDZPA/functionsRoutes-0.600015277897325.mjs
var routes;
var init_functionsRoutes_0_600015277897325 = __esm({
  "../.wrangler/tmp/pages-FQDZPA/functionsRoutes-0.600015277897325.mjs"() {
    "use strict";
    init_transform();
    init_filename();
    init_config();
    init_config();
    init_gcp_monitoring();
    init_health();
    init_models();
    init_usage();
    init_usage();
    init_config2();
    init_config2();
    init_enviar_email();
    init_excluir();
    init_ler();
    init_listar();
    init_modelos();
    init_rate_limit();
    init_rate_limit();
    init_sync();
    init_userdata();
    init_userdata();
    init_delete();
    init_records();
    init_upsert();
    init_zones();
    init_cleanup_deployments();
    init_cleanup_deployments();
    init_delete_page();
    init_delete_worker();
    init_ops();
    init_overview();
    init_page_details();
    init_worker_details();
    init_insights();
    init_mp_balance();
    init_mp_cancel();
    init_mp_refund();
    init_sumup_balance();
    init_sumup_cancel();
    init_sumup_refund();
    init_modelos2();
    init_overview2();
    init_parametros();
    init_parametros();
    init_rate_limit2();
    init_rate_limit2();
    init_sync2();
    init_fees();
    init_fees();
    init_migrate_media_urls();
    init_modelos3();
    init_overview3();
    init_post_summaries();
    init_post_summaries();
    init_posts();
    init_posts();
    init_posts();
    init_posts();
    init_posts_pin();
    init_posts_reorder();
    init_rate_limit3();
    init_rate_limit3();
    init_settings();
    init_settings();
    init_sync3();
    init_upload();
    init_orchestrate();
    init_overview4();
    init_policy();
    init_sync4();
    init_zones2();
    init_discover();
    init_feed();
    init_cron();
    init_cron();
    init_excluir2();
    init_listar2();
    init_modelos4();
    init_rate_limit4();
    init_rate_limit4();
    init_taxacache();
    init_userdata2();
    init_userdata2();
    init_operational2();
    init_delete2();
    init_telemetry();
    init_path();
    init_config_store();
    init_config_store();
    init_health2();
    init_config3();
    routes = [
      {
        routePath: "/api/mainsite/ai/transform",
        mountPath: "/api/mainsite/ai",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost]
      },
      {
        routePath: "/api/mainsite/media/:filename",
        mountPath: "/api/mainsite/media",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet]
      },
      {
        routePath: "/api/adminhub/config",
        mountPath: "/api/adminhub",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet2]
      },
      {
        routePath: "/api/adminhub/config",
        mountPath: "/api/adminhub",
        method: "PUT",
        middlewares: [],
        modules: [onRequestPut]
      },
      {
        routePath: "/api/ai-status/gcp-monitoring",
        mountPath: "/api/ai-status",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet3]
      },
      {
        routePath: "/api/ai-status/health",
        mountPath: "/api/ai-status",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet4]
      },
      {
        routePath: "/api/ai-status/models",
        mountPath: "/api/ai-status",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet5]
      },
      {
        routePath: "/api/ai-status/usage",
        mountPath: "/api/ai-status",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet6]
      },
      {
        routePath: "/api/ai-status/usage",
        mountPath: "/api/ai-status",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost2]
      },
      {
        routePath: "/api/apphub/config",
        mountPath: "/api/apphub",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet7]
      },
      {
        routePath: "/api/apphub/config",
        mountPath: "/api/apphub",
        method: "PUT",
        middlewares: [],
        modules: [onRequestPut2]
      },
      {
        routePath: "/api/astrologo/enviar-email",
        mountPath: "/api/astrologo",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost3]
      },
      {
        routePath: "/api/astrologo/excluir",
        mountPath: "/api/astrologo",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost4]
      },
      {
        routePath: "/api/astrologo/ler",
        mountPath: "/api/astrologo",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost5]
      },
      {
        routePath: "/api/astrologo/listar",
        mountPath: "/api/astrologo",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet8]
      },
      {
        routePath: "/api/astrologo/modelos",
        mountPath: "/api/astrologo",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet9]
      },
      {
        routePath: "/api/astrologo/rate-limit",
        mountPath: "/api/astrologo",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet10]
      },
      {
        routePath: "/api/astrologo/rate-limit",
        mountPath: "/api/astrologo",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost6]
      },
      {
        routePath: "/api/astrologo/sync",
        mountPath: "/api/astrologo",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost7]
      },
      {
        routePath: "/api/astrologo/userdata",
        mountPath: "/api/astrologo",
        method: "DELETE",
        middlewares: [],
        modules: [onRequestDelete]
      },
      {
        routePath: "/api/astrologo/userdata",
        mountPath: "/api/astrologo",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet11]
      },
      {
        routePath: "/api/cfdns/delete",
        mountPath: "/api/cfdns",
        method: "DELETE",
        middlewares: [],
        modules: [onRequestDelete2]
      },
      {
        routePath: "/api/cfdns/records",
        mountPath: "/api/cfdns",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet12]
      },
      {
        routePath: "/api/cfdns/upsert",
        mountPath: "/api/cfdns",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost8]
      },
      {
        routePath: "/api/cfdns/zones",
        mountPath: "/api/cfdns",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet13]
      },
      {
        routePath: "/api/cfpw/cleanup-deployments",
        mountPath: "/api/cfpw",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet14]
      },
      {
        routePath: "/api/cfpw/cleanup-deployments",
        mountPath: "/api/cfpw",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost9]
      },
      {
        routePath: "/api/cfpw/delete-page",
        mountPath: "/api/cfpw",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost10]
      },
      {
        routePath: "/api/cfpw/delete-worker",
        mountPath: "/api/cfpw",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost11]
      },
      {
        routePath: "/api/cfpw/ops",
        mountPath: "/api/cfpw",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost12]
      },
      {
        routePath: "/api/cfpw/overview",
        mountPath: "/api/cfpw",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet15]
      },
      {
        routePath: "/api/cfpw/page-details",
        mountPath: "/api/cfpw",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet16]
      },
      {
        routePath: "/api/cfpw/worker-details",
        mountPath: "/api/cfpw",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet17]
      },
      {
        routePath: "/api/financeiro/insights",
        mountPath: "/api/financeiro",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet18]
      },
      {
        routePath: "/api/financeiro/mp-balance",
        mountPath: "/api/financeiro",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet19]
      },
      {
        routePath: "/api/financeiro/mp-cancel",
        mountPath: "/api/financeiro",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost13]
      },
      {
        routePath: "/api/financeiro/mp-refund",
        mountPath: "/api/financeiro",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost14]
      },
      {
        routePath: "/api/financeiro/sumup-balance",
        mountPath: "/api/financeiro",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet20]
      },
      {
        routePath: "/api/financeiro/sumup-cancel",
        mountPath: "/api/financeiro",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost15]
      },
      {
        routePath: "/api/financeiro/sumup-refund",
        mountPath: "/api/financeiro",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost16]
      },
      {
        routePath: "/api/itau/modelos",
        mountPath: "/api/itau",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet21]
      },
      {
        routePath: "/api/itau/overview",
        mountPath: "/api/itau",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet22]
      },
      {
        routePath: "/api/itau/parametros",
        mountPath: "/api/itau",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet23]
      },
      {
        routePath: "/api/itau/parametros",
        mountPath: "/api/itau",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost17]
      },
      {
        routePath: "/api/itau/rate-limit",
        mountPath: "/api/itau",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet24]
      },
      {
        routePath: "/api/itau/rate-limit",
        mountPath: "/api/itau",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost18]
      },
      {
        routePath: "/api/itau/sync",
        mountPath: "/api/itau",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost19]
      },
      {
        routePath: "/api/mainsite/fees",
        mountPath: "/api/mainsite",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet25]
      },
      {
        routePath: "/api/mainsite/fees",
        mountPath: "/api/mainsite",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost20]
      },
      {
        routePath: "/api/mainsite/migrate-media-urls",
        mountPath: "/api/mainsite",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost21]
      },
      {
        routePath: "/api/mainsite/modelos",
        mountPath: "/api/mainsite",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet26]
      },
      {
        routePath: "/api/mainsite/overview",
        mountPath: "/api/mainsite",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet27]
      },
      {
        routePath: "/api/mainsite/post-summaries",
        mountPath: "/api/mainsite",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet28]
      },
      {
        routePath: "/api/mainsite/post-summaries",
        mountPath: "/api/mainsite",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost22]
      },
      {
        routePath: "/api/mainsite/posts",
        mountPath: "/api/mainsite",
        method: "DELETE",
        middlewares: [],
        modules: [onRequestDelete3]
      },
      {
        routePath: "/api/mainsite/posts",
        mountPath: "/api/mainsite",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet29]
      },
      {
        routePath: "/api/mainsite/posts",
        mountPath: "/api/mainsite",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost23]
      },
      {
        routePath: "/api/mainsite/posts",
        mountPath: "/api/mainsite",
        method: "PUT",
        middlewares: [],
        modules: [onRequestPut3]
      },
      {
        routePath: "/api/mainsite/posts-pin",
        mountPath: "/api/mainsite",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost24]
      },
      {
        routePath: "/api/mainsite/posts-reorder",
        mountPath: "/api/mainsite",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost25]
      },
      {
        routePath: "/api/mainsite/rate-limit",
        mountPath: "/api/mainsite",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet30]
      },
      {
        routePath: "/api/mainsite/rate-limit",
        mountPath: "/api/mainsite",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost26]
      },
      {
        routePath: "/api/mainsite/settings",
        mountPath: "/api/mainsite",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet31]
      },
      {
        routePath: "/api/mainsite/settings",
        mountPath: "/api/mainsite",
        method: "PUT",
        middlewares: [],
        modules: [onRequestPut4]
      },
      {
        routePath: "/api/mainsite/sync",
        mountPath: "/api/mainsite",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost27]
      },
      {
        routePath: "/api/mainsite/upload",
        mountPath: "/api/mainsite",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost28]
      },
      {
        routePath: "/api/mtasts/orchestrate",
        mountPath: "/api/mtasts",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost29]
      },
      {
        routePath: "/api/mtasts/overview",
        mountPath: "/api/mtasts",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet32]
      },
      {
        routePath: "/api/mtasts/policy",
        mountPath: "/api/mtasts",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet33]
      },
      {
        routePath: "/api/mtasts/sync",
        mountPath: "/api/mtasts",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost30]
      },
      {
        routePath: "/api/mtasts/zones",
        mountPath: "/api/mtasts",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet34]
      },
      {
        routePath: "/api/news/discover",
        mountPath: "/api/news",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet35]
      },
      {
        routePath: "/api/news/feed",
        mountPath: "/api/news",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet36]
      },
      {
        routePath: "/api/oraculo/cron",
        mountPath: "/api/oraculo",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet37]
      },
      {
        routePath: "/api/oraculo/cron",
        mountPath: "/api/oraculo",
        method: "PUT",
        middlewares: [],
        modules: [onRequestPut5]
      },
      {
        routePath: "/api/oraculo/excluir",
        mountPath: "/api/oraculo",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost31]
      },
      {
        routePath: "/api/oraculo/listar",
        mountPath: "/api/oraculo",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet38]
      },
      {
        routePath: "/api/oraculo/modelos",
        mountPath: "/api/oraculo",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet39]
      },
      {
        routePath: "/api/oraculo/rate-limit",
        mountPath: "/api/oraculo",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet40]
      },
      {
        routePath: "/api/oraculo/rate-limit",
        mountPath: "/api/oraculo",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost32]
      },
      {
        routePath: "/api/oraculo/taxacache",
        mountPath: "/api/oraculo",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet41]
      },
      {
        routePath: "/api/oraculo/userdata",
        mountPath: "/api/oraculo",
        method: "DELETE",
        middlewares: [],
        modules: [onRequestDelete4]
      },
      {
        routePath: "/api/oraculo/userdata",
        mountPath: "/api/oraculo",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet42]
      },
      {
        routePath: "/api/overview/operational",
        mountPath: "/api/overview",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet43]
      },
      {
        routePath: "/api/telemetry/delete",
        mountPath: "/api/telemetry",
        method: "DELETE",
        middlewares: [],
        modules: [onRequestDelete5]
      },
      {
        routePath: "/api/telemetry/telemetry",
        mountPath: "/api/telemetry",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet44]
      },
      {
        routePath: "/api/tlsrpt/:path*",
        mountPath: "/api/tlsrpt",
        method: "",
        middlewares: [],
        modules: [onRequest]
      },
      {
        routePath: "/api/config-store",
        mountPath: "/api",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet45]
      },
      {
        routePath: "/api/config-store",
        mountPath: "/api",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost33]
      },
      {
        routePath: "/api/health",
        mountPath: "/api",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet46]
      },
      {
        routePath: "/api/config",
        mountPath: "/api",
        method: "",
        middlewares: [],
        modules: [onRequest2]
      }
    ];
  }
});

// ../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/wrangler/templates/pages-template-worker.ts
init_functionsRoutes_0_600015277897325();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();

// ../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/path-to-regexp/dist.es2015/index.js
init_functionsRoutes_0_600015277897325();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count3 = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count3--;
          if (count3 === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count3++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count3)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../../../AppData/Local/npm-cache/_npx/d77349f55c2be1c0/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env2, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context2 = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env: env2,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context2);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env2["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error3) {
      if (isFailOpen) {
        const response = await env2["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error3;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
export {
  pages_template_worker_default as default
};
