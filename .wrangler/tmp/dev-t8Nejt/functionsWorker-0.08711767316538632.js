var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// node_modules/unenv/dist/runtime/_internal/utils.mjs
// @__NO_SIDE_EFFECTS__
function createNotImplementedError(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented(name) {
  const fn = /* @__PURE__ */ __name(() => {
    throw /* @__PURE__ */ createNotImplementedError(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass, "notImplementedClass");

// node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs
var _timeOrigin = globalThis.performance?.timeOrigin ?? Date.now();
var _performanceNow = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin;
var nodeTiming = {
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
var PerformanceEntry = class {
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
var PerformanceMark = class PerformanceMark2 extends PerformanceEntry {
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
var PerformanceMeasure = class extends PerformanceEntry {
  static {
    __name(this, "PerformanceMeasure");
  }
  entryType = "measure";
};
var PerformanceResourceTiming = class extends PerformanceEntry {
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
var PerformanceObserverEntryList = class {
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
var Performance = class {
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
var PerformanceObserver = class {
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
var performance = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance();

// node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs
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

// node_modules/unenv/dist/runtime/node/console.mjs
import { Writable } from "node:stream";

// node_modules/unenv/dist/runtime/mock/noop.mjs
var noop_default = Object.assign(() => {
}, { __unenv__: true });

// node_modules/unenv/dist/runtime/node/console.mjs
var _console = globalThis.console;
var _ignoreErrors = true;
var _stderr = new Writable();
var _stdout = new Writable();
var log = _console?.log ?? noop_default;
var info = _console?.info ?? log;
var trace = _console?.trace ?? info;
var debug = _console?.debug ?? log;
var table = _console?.table ?? log;
var error = _console?.error ?? log;
var warn = _console?.warn ?? error;
var createTask = _console?.createTask ?? /* @__PURE__ */ notImplemented("console.createTask");
var clear = _console?.clear ?? noop_default;
var count = _console?.count ?? noop_default;
var countReset = _console?.countReset ?? noop_default;
var dir = _console?.dir ?? noop_default;
var dirxml = _console?.dirxml ?? noop_default;
var group = _console?.group ?? noop_default;
var groupEnd = _console?.groupEnd ?? noop_default;
var groupCollapsed = _console?.groupCollapsed ?? noop_default;
var profile = _console?.profile ?? noop_default;
var profileEnd = _console?.profileEnd ?? noop_default;
var time = _console?.time ?? noop_default;
var timeEnd = _console?.timeEnd ?? noop_default;
var timeLog = _console?.timeLog ?? noop_default;
var timeStamp = _console?.timeStamp ?? noop_default;
var Console = _console?.Console ?? /* @__PURE__ */ notImplementedClass("console.Console");
var _times = /* @__PURE__ */ new Map();
var _stdoutErrorHandler = noop_default;
var _stderrErrorHandler = noop_default;

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs
var workerdConsole = globalThis["console"];
var {
  assert,
  clear: clear2,
  // @ts-expect-error undocumented public API
  context,
  count: count2,
  countReset: countReset2,
  // @ts-expect-error undocumented public API
  createTask: createTask2,
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
} = workerdConsole;
Object.assign(workerdConsole, {
  Console,
  _ignoreErrors,
  _stderr,
  _stderrErrorHandler,
  _stdout,
  _stdoutErrorHandler,
  _times
});
var console_default = workerdConsole;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console
globalThis.console = console_default;

// node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs
var hrtime = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name(function hrtime2(startTime) {
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

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
import { EventEmitter } from "node:events";

// node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs
var ReadStream = class {
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

// node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs
var WriteStream = class {
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
  clearLine(dir4, callback) {
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
  getColorDepth(env3) {
    return 1;
  }
  hasColors(count4, env3) {
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

// node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs
var NODE_VERSION = "22.14.0";

// node_modules/unenv/dist/runtime/node/internal/process/process.mjs
var Process = class _Process extends EventEmitter {
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
  chdir(cwd3) {
    this.#cwd = cwd3;
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

// node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs
var globalProcess = globalThis["process"];
var getBuiltinModule = globalProcess.getBuiltinModule;
var workerdProcess = getBuiltinModule("node:process");
var unenvProcess = new Process({
  env: globalProcess.env,
  hrtime,
  // `nextTick` is available from workerd process v1
  nextTick: workerdProcess.nextTick
});
var { exit, features, platform } = workerdProcess;
var {
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
} = unenvProcess;
var _process = {
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
var process_default = _process;

// node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process
globalThis.process = process_default;

// .wrangler/tmp/pages-SfNyHM/functionsWorker-0.08711767316538632.mjs
import { Writable as Writable2 } from "node:stream";
import { EventEmitter as EventEmitter2 } from "node:events";
var __create = Object.create;
var __defProp2 = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name2 = /* @__PURE__ */ __name((target, value) => __defProp2(target, "name", { value, configurable: true }), "__name");
var __esm = /* @__PURE__ */ __name((fn, res) => /* @__PURE__ */ __name(function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
}, "__init"), "__esm");
var __commonJS = /* @__PURE__ */ __name((cb, mod) => /* @__PURE__ */ __name(function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
}, "__require"), "__commonJS");
var __export = /* @__PURE__ */ __name((target, all) => {
  for (var name in all)
    __defProp2(target, name, { get: all[name], enumerable: true });
}, "__export");
var __copyProps = /* @__PURE__ */ __name((to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp2(to, key, { get: /* @__PURE__ */ __name(() => from[key], "get"), enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
}, "__copyProps");
var __toESM = /* @__PURE__ */ __name((mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp2(target, "default", { value: mod, enumerable: true }) : target,
  mod
)), "__toESM");
// @__NO_SIDE_EFFECTS__
function createNotImplementedError2(name) {
  return new Error(`[unenv] ${name} is not implemented yet!`);
}
__name(createNotImplementedError2, "createNotImplementedError");
// @__NO_SIDE_EFFECTS__
function notImplemented2(name) {
  const fn = /* @__PURE__ */ __name2(() => {
    throw /* @__PURE__ */ createNotImplementedError2(name);
  }, "fn");
  return Object.assign(fn, { __unenv__: true });
}
__name(notImplemented2, "notImplemented");
// @__NO_SIDE_EFFECTS__
function notImplementedClass2(name) {
  return class {
    __unenv__ = true;
    constructor() {
      throw new Error(`[unenv] ${name} is not implemented yet!`);
    }
  };
}
__name(notImplementedClass2, "notImplementedClass");
var init_utils = __esm({
  "../node_modules/unenv/dist/runtime/_internal/utils.mjs"() {
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name2(createNotImplementedError2, "createNotImplementedError");
    __name2(notImplemented2, "notImplemented");
    __name2(notImplementedClass2, "notImplementedClass");
  }
});
var _timeOrigin2;
var _performanceNow2;
var nodeTiming2;
var PerformanceEntry2;
var PerformanceMark3;
var PerformanceMeasure2;
var PerformanceResourceTiming2;
var PerformanceObserverEntryList2;
var Performance2;
var PerformanceObserver2;
var performance2;
var init_performance = __esm({
  "../node_modules/unenv/dist/runtime/node/internal/perf_hooks/performance.mjs"() {
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_utils();
    _timeOrigin2 = globalThis.performance?.timeOrigin ?? Date.now();
    _performanceNow2 = globalThis.performance?.now ? globalThis.performance.now.bind(globalThis.performance) : () => Date.now() - _timeOrigin2;
    nodeTiming2 = {
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
    PerformanceEntry2 = class {
      static {
        __name(this, "PerformanceEntry");
      }
      static {
        __name2(this, "PerformanceEntry");
      }
      __unenv__ = true;
      detail;
      entryType = "event";
      name;
      startTime;
      constructor(name, options) {
        this.name = name;
        this.startTime = options?.startTime || _performanceNow2();
        this.detail = options?.detail;
      }
      get duration() {
        return _performanceNow2() - this.startTime;
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
    PerformanceMark3 = class PerformanceMark2 extends PerformanceEntry2 {
      static {
        __name(this, "PerformanceMark2");
      }
      static {
        __name2(this, "PerformanceMark");
      }
      entryType = "mark";
      constructor() {
        super(...arguments);
      }
      get duration() {
        return 0;
      }
    };
    PerformanceMeasure2 = class extends PerformanceEntry2 {
      static {
        __name(this, "PerformanceMeasure");
      }
      static {
        __name2(this, "PerformanceMeasure");
      }
      entryType = "measure";
    };
    PerformanceResourceTiming2 = class extends PerformanceEntry2 {
      static {
        __name(this, "PerformanceResourceTiming");
      }
      static {
        __name2(this, "PerformanceResourceTiming");
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
    PerformanceObserverEntryList2 = class {
      static {
        __name(this, "PerformanceObserverEntryList");
      }
      static {
        __name2(this, "PerformanceObserverEntryList");
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
    Performance2 = class {
      static {
        __name(this, "Performance");
      }
      static {
        __name2(this, "Performance");
      }
      __unenv__ = true;
      timeOrigin = _timeOrigin2;
      eventCounts = /* @__PURE__ */ new Map();
      _entries = [];
      _resourceTimingBufferSize = 0;
      navigation = void 0;
      timing = void 0;
      timerify(_fn, _options) {
        throw /* @__PURE__ */ createNotImplementedError2("Performance.timerify");
      }
      get nodeTiming() {
        return nodeTiming2;
      }
      eventLoopUtilization() {
        return {};
      }
      markResourceTiming() {
        return new PerformanceResourceTiming2("");
      }
      onresourcetimingbufferfull = null;
      now() {
        if (this.timeOrigin === _timeOrigin2) {
          return _performanceNow2();
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
        const entry = new PerformanceMark3(name, options);
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
        const entry = new PerformanceMeasure2(measureName, {
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
        throw /* @__PURE__ */ createNotImplementedError2("Performance.addEventListener");
      }
      removeEventListener(type, listener, options) {
        throw /* @__PURE__ */ createNotImplementedError2("Performance.removeEventListener");
      }
      dispatchEvent(event) {
        throw /* @__PURE__ */ createNotImplementedError2("Performance.dispatchEvent");
      }
      toJSON() {
        return this;
      }
    };
    PerformanceObserver2 = class {
      static {
        __name(this, "PerformanceObserver");
      }
      static {
        __name2(this, "PerformanceObserver");
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
        throw /* @__PURE__ */ createNotImplementedError2("PerformanceObserver.disconnect");
      }
      observe(options) {
        throw /* @__PURE__ */ createNotImplementedError2("PerformanceObserver.observe");
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
    performance2 = globalThis.performance && "addEventListener" in globalThis.performance ? globalThis.performance : new Performance2();
  }
});
var init_perf_hooks = __esm({
  "../node_modules/unenv/dist/runtime/node/perf_hooks.mjs"() {
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_performance();
  }
});
var init_performance2 = __esm({
  "../node_modules/@cloudflare/unenv-preset/dist/runtime/polyfill/performance.mjs"() {
    init_perf_hooks();
    if (!("__unenv__" in performance2)) {
      const proto = Performance2.prototype;
      for (const key of Object.getOwnPropertyNames(proto)) {
        if (key !== "constructor" && !(key in performance2)) {
          const desc = Object.getOwnPropertyDescriptor(proto, key);
          if (desc) {
            Object.defineProperty(performance2, key, desc);
          }
        }
      }
    }
    globalThis.performance = performance2;
    globalThis.Performance = Performance2;
    globalThis.PerformanceEntry = PerformanceEntry2;
    globalThis.PerformanceMark = PerformanceMark3;
    globalThis.PerformanceMeasure = PerformanceMeasure2;
    globalThis.PerformanceObserver = PerformanceObserver2;
    globalThis.PerformanceObserverEntryList = PerformanceObserverEntryList2;
    globalThis.PerformanceResourceTiming = PerformanceResourceTiming2;
  }
});
var noop_default2;
var init_noop = __esm({
  "../node_modules/unenv/dist/runtime/mock/noop.mjs"() {
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    noop_default2 = Object.assign(() => {
    }, { __unenv__: true });
  }
});
var _console2;
var _ignoreErrors2;
var _stderr2;
var _stdout2;
var log3;
var info3;
var trace3;
var debug3;
var table3;
var error3;
var warn3;
var createTask3;
var clear3;
var count3;
var countReset3;
var dir3;
var dirxml3;
var group3;
var groupEnd3;
var groupCollapsed3;
var profile3;
var profileEnd3;
var time3;
var timeEnd3;
var timeLog3;
var timeStamp3;
var Console2;
var _times2;
var _stdoutErrorHandler2;
var _stderrErrorHandler2;
var init_console = __esm({
  "../node_modules/unenv/dist/runtime/node/console.mjs"() {
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_noop();
    init_utils();
    _console2 = globalThis.console;
    _ignoreErrors2 = true;
    _stderr2 = new Writable2();
    _stdout2 = new Writable2();
    log3 = _console2?.log ?? noop_default2;
    info3 = _console2?.info ?? log3;
    trace3 = _console2?.trace ?? info3;
    debug3 = _console2?.debug ?? log3;
    table3 = _console2?.table ?? log3;
    error3 = _console2?.error ?? log3;
    warn3 = _console2?.warn ?? error3;
    createTask3 = _console2?.createTask ?? /* @__PURE__ */ notImplemented2("console.createTask");
    clear3 = _console2?.clear ?? noop_default2;
    count3 = _console2?.count ?? noop_default2;
    countReset3 = _console2?.countReset ?? noop_default2;
    dir3 = _console2?.dir ?? noop_default2;
    dirxml3 = _console2?.dirxml ?? noop_default2;
    group3 = _console2?.group ?? noop_default2;
    groupEnd3 = _console2?.groupEnd ?? noop_default2;
    groupCollapsed3 = _console2?.groupCollapsed ?? noop_default2;
    profile3 = _console2?.profile ?? noop_default2;
    profileEnd3 = _console2?.profileEnd ?? noop_default2;
    time3 = _console2?.time ?? noop_default2;
    timeEnd3 = _console2?.timeEnd ?? noop_default2;
    timeLog3 = _console2?.timeLog ?? noop_default2;
    timeStamp3 = _console2?.timeStamp ?? noop_default2;
    Console2 = _console2?.Console ?? /* @__PURE__ */ notImplementedClass2("console.Console");
    _times2 = /* @__PURE__ */ new Map();
    _stdoutErrorHandler2 = noop_default2;
    _stderrErrorHandler2 = noop_default2;
  }
});
var workerdConsole2;
var assert3;
var clear22;
var context2;
var count22;
var countReset22;
var createTask22;
var debug22;
var dir22;
var dirxml22;
var error22;
var group22;
var groupCollapsed22;
var groupEnd22;
var info22;
var log22;
var profile22;
var profileEnd22;
var table22;
var time22;
var timeEnd22;
var timeLog22;
var timeStamp22;
var trace22;
var warn22;
var console_default2;
var init_console2 = __esm({
  "../node_modules/@cloudflare/unenv-preset/dist/runtime/node/console.mjs"() {
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_console();
    workerdConsole2 = globalThis["console"];
    ({
      assert: assert3,
      clear: clear22,
      context: (
        // @ts-expect-error undocumented public API
        context2
      ),
      count: count22,
      countReset: countReset22,
      createTask: (
        // @ts-expect-error undocumented public API
        createTask22
      ),
      debug: debug22,
      dir: dir22,
      dirxml: dirxml22,
      error: error22,
      group: group22,
      groupCollapsed: groupCollapsed22,
      groupEnd: groupEnd22,
      info: info22,
      log: log22,
      profile: profile22,
      profileEnd: profileEnd22,
      table: table22,
      time: time22,
      timeEnd: timeEnd22,
      timeLog: timeLog22,
      timeStamp: timeStamp22,
      trace: trace22,
      warn: warn22
    } = workerdConsole2);
    Object.assign(workerdConsole2, {
      Console: Console2,
      _ignoreErrors: _ignoreErrors2,
      _stderr: _stderr2,
      _stderrErrorHandler: _stderrErrorHandler2,
      _stdout: _stdout2,
      _stdoutErrorHandler: _stdoutErrorHandler2,
      _times: _times2
    });
    console_default2 = workerdConsole2;
  }
});
var init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console = __esm({
  "../node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-console"() {
    init_console2();
    globalThis.console = console_default2;
  }
});
var hrtime4;
var init_hrtime = __esm({
  "../node_modules/unenv/dist/runtime/node/internal/process/hrtime.mjs"() {
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    hrtime4 = /* @__PURE__ */ Object.assign(/* @__PURE__ */ __name2(/* @__PURE__ */ __name(function hrtime22(startTime) {
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
    }, "hrtime2"), "hrtime"), { bigint: /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function bigint2() {
      return BigInt(Date.now() * 1e6);
    }, "bigint"), "bigint") });
  }
});
var ReadStream2;
var init_read_stream = __esm({
  "../node_modules/unenv/dist/runtime/node/internal/tty/read-stream.mjs"() {
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    ReadStream2 = class {
      static {
        __name(this, "ReadStream");
      }
      static {
        __name2(this, "ReadStream");
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
var WriteStream2;
var init_write_stream = __esm({
  "../node_modules/unenv/dist/runtime/node/internal/tty/write-stream.mjs"() {
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    WriteStream2 = class {
      static {
        __name(this, "WriteStream");
      }
      static {
        __name2(this, "WriteStream");
      }
      fd;
      columns = 80;
      rows = 24;
      isTTY = false;
      constructor(fd) {
        this.fd = fd;
      }
      clearLine(dir32, callback) {
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
      getColorDepth(env22) {
        return 1;
      }
      hasColors(count32, env22) {
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
var init_tty = __esm({
  "../node_modules/unenv/dist/runtime/node/tty.mjs"() {
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_read_stream();
    init_write_stream();
  }
});
var NODE_VERSION2;
var init_node_version = __esm({
  "../node_modules/unenv/dist/runtime/node/internal/process/node-version.mjs"() {
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    NODE_VERSION2 = "22.14.0";
  }
});
var Process2;
var init_process = __esm({
  "../node_modules/unenv/dist/runtime/node/internal/process/process.mjs"() {
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_tty();
    init_utils();
    init_node_version();
    Process2 = class _Process extends EventEmitter2 {
      static {
        __name(this, "_Process");
      }
      static {
        __name2(this, "Process");
      }
      env;
      hrtime;
      nextTick;
      constructor(impl) {
        super();
        this.env = impl.env;
        this.hrtime = impl.hrtime;
        this.nextTick = impl.nextTick;
        for (const prop of [...Object.getOwnPropertyNames(_Process.prototype), ...Object.getOwnPropertyNames(EventEmitter2.prototype)]) {
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
        return this.#stdin ??= new ReadStream2(0);
      }
      get stdout() {
        return this.#stdout ??= new WriteStream2(1);
      }
      get stderr() {
        return this.#stderr ??= new WriteStream2(2);
      }
      // --- cwd ---
      #cwd = "/";
      chdir(cwd22) {
        this.#cwd = cwd22;
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
        return `v${NODE_VERSION2}`;
      }
      get versions() {
        return { node: NODE_VERSION2 };
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
        throw /* @__PURE__ */ createNotImplementedError2("process.umask");
      }
      getBuiltinModule() {
        return void 0;
      }
      getActiveResourcesInfo() {
        throw /* @__PURE__ */ createNotImplementedError2("process.getActiveResourcesInfo");
      }
      exit() {
        throw /* @__PURE__ */ createNotImplementedError2("process.exit");
      }
      reallyExit() {
        throw /* @__PURE__ */ createNotImplementedError2("process.reallyExit");
      }
      kill() {
        throw /* @__PURE__ */ createNotImplementedError2("process.kill");
      }
      abort() {
        throw /* @__PURE__ */ createNotImplementedError2("process.abort");
      }
      dlopen() {
        throw /* @__PURE__ */ createNotImplementedError2("process.dlopen");
      }
      setSourceMapsEnabled() {
        throw /* @__PURE__ */ createNotImplementedError2("process.setSourceMapsEnabled");
      }
      loadEnvFile() {
        throw /* @__PURE__ */ createNotImplementedError2("process.loadEnvFile");
      }
      disconnect() {
        throw /* @__PURE__ */ createNotImplementedError2("process.disconnect");
      }
      cpuUsage() {
        throw /* @__PURE__ */ createNotImplementedError2("process.cpuUsage");
      }
      setUncaughtExceptionCaptureCallback() {
        throw /* @__PURE__ */ createNotImplementedError2("process.setUncaughtExceptionCaptureCallback");
      }
      hasUncaughtExceptionCaptureCallback() {
        throw /* @__PURE__ */ createNotImplementedError2("process.hasUncaughtExceptionCaptureCallback");
      }
      initgroups() {
        throw /* @__PURE__ */ createNotImplementedError2("process.initgroups");
      }
      openStdin() {
        throw /* @__PURE__ */ createNotImplementedError2("process.openStdin");
      }
      assert() {
        throw /* @__PURE__ */ createNotImplementedError2("process.assert");
      }
      binding() {
        throw /* @__PURE__ */ createNotImplementedError2("process.binding");
      }
      // --- attached interfaces ---
      permission = { has: /* @__PURE__ */ notImplemented2("process.permission.has") };
      report = {
        directory: "",
        filename: "",
        signal: "SIGUSR2",
        compact: false,
        reportOnFatalError: false,
        reportOnSignal: false,
        reportOnUncaughtException: false,
        getReport: /* @__PURE__ */ notImplemented2("process.report.getReport"),
        writeReport: /* @__PURE__ */ notImplemented2("process.report.writeReport")
      };
      finalization = {
        register: /* @__PURE__ */ notImplemented2("process.finalization.register"),
        unregister: /* @__PURE__ */ notImplemented2("process.finalization.unregister"),
        registerBeforeExit: /* @__PURE__ */ notImplemented2("process.finalization.registerBeforeExit")
      };
      memoryUsage = Object.assign(() => ({
        arrayBuffers: 0,
        rss: 0,
        external: 0,
        heapTotal: 0,
        heapUsed: 0
      }), { rss: /* @__PURE__ */ __name2(() => 0, "rss") });
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
var globalProcess2;
var getBuiltinModule2;
var workerdProcess2;
var unenvProcess2;
var exit2;
var features2;
var platform2;
var _channel2;
var _debugEnd2;
var _debugProcess2;
var _disconnect2;
var _events2;
var _eventsCount2;
var _exiting2;
var _fatalException2;
var _getActiveHandles2;
var _getActiveRequests2;
var _handleQueue2;
var _kill2;
var _linkedBinding2;
var _maxListeners2;
var _pendingMessage2;
var _preload_modules2;
var _rawDebug2;
var _send2;
var _startProfilerIdleNotifier2;
var _stopProfilerIdleNotifier2;
var _tickCallback2;
var abort2;
var addListener2;
var allowedNodeEnvironmentFlags2;
var arch2;
var argv2;
var argv02;
var assert22;
var availableMemory2;
var binding2;
var channel2;
var chdir2;
var config2;
var connected2;
var constrainedMemory2;
var cpuUsage2;
var cwd2;
var debugPort2;
var disconnect2;
var dlopen2;
var domain2;
var emit2;
var emitWarning2;
var env2;
var eventNames2;
var execArgv2;
var execPath2;
var exitCode2;
var finalization2;
var getActiveResourcesInfo2;
var getegid2;
var geteuid2;
var getgid2;
var getgroups2;
var getMaxListeners2;
var getuid2;
var hasUncaughtExceptionCaptureCallback2;
var hrtime32;
var initgroups2;
var kill2;
var listenerCount2;
var listeners2;
var loadEnvFile2;
var mainModule2;
var memoryUsage2;
var moduleLoadList2;
var nextTick2;
var off2;
var on2;
var once2;
var openStdin2;
var permission2;
var pid2;
var ppid2;
var prependListener2;
var prependOnceListener2;
var rawListeners2;
var reallyExit2;
var ref2;
var release2;
var removeAllListeners2;
var removeListener2;
var report2;
var resourceUsage2;
var send2;
var setegid2;
var seteuid2;
var setgid2;
var setgroups2;
var setMaxListeners2;
var setSourceMapsEnabled2;
var setuid2;
var setUncaughtExceptionCaptureCallback2;
var sourceMapsEnabled2;
var stderr2;
var stdin2;
var stdout2;
var throwDeprecation2;
var title2;
var traceDeprecation2;
var umask2;
var unref2;
var uptime2;
var version2;
var versions2;
var _process2;
var process_default2;
var init_process2 = __esm({
  "../node_modules/@cloudflare/unenv-preset/dist/runtime/node/process.mjs"() {
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_hrtime();
    init_process();
    globalProcess2 = globalThis["process"];
    getBuiltinModule2 = globalProcess2.getBuiltinModule;
    workerdProcess2 = getBuiltinModule2("node:process");
    unenvProcess2 = new Process2({
      env: globalProcess2.env,
      hrtime: hrtime4,
      // `nextTick` is available from workerd process v1
      nextTick: workerdProcess2.nextTick
    });
    ({ exit: exit2, features: features2, platform: platform2 } = workerdProcess2);
    ({
      _channel: _channel2,
      _debugEnd: _debugEnd2,
      _debugProcess: _debugProcess2,
      _disconnect: _disconnect2,
      _events: _events2,
      _eventsCount: _eventsCount2,
      _exiting: _exiting2,
      _fatalException: _fatalException2,
      _getActiveHandles: _getActiveHandles2,
      _getActiveRequests: _getActiveRequests2,
      _handleQueue: _handleQueue2,
      _kill: _kill2,
      _linkedBinding: _linkedBinding2,
      _maxListeners: _maxListeners2,
      _pendingMessage: _pendingMessage2,
      _preload_modules: _preload_modules2,
      _rawDebug: _rawDebug2,
      _send: _send2,
      _startProfilerIdleNotifier: _startProfilerIdleNotifier2,
      _stopProfilerIdleNotifier: _stopProfilerIdleNotifier2,
      _tickCallback: _tickCallback2,
      abort: abort2,
      addListener: addListener2,
      allowedNodeEnvironmentFlags: allowedNodeEnvironmentFlags2,
      arch: arch2,
      argv: argv2,
      argv0: argv02,
      assert: assert22,
      availableMemory: availableMemory2,
      binding: binding2,
      channel: channel2,
      chdir: chdir2,
      config: config2,
      connected: connected2,
      constrainedMemory: constrainedMemory2,
      cpuUsage: cpuUsage2,
      cwd: cwd2,
      debugPort: debugPort2,
      disconnect: disconnect2,
      dlopen: dlopen2,
      domain: domain2,
      emit: emit2,
      emitWarning: emitWarning2,
      env: env2,
      eventNames: eventNames2,
      execArgv: execArgv2,
      execPath: execPath2,
      exitCode: exitCode2,
      finalization: finalization2,
      getActiveResourcesInfo: getActiveResourcesInfo2,
      getegid: getegid2,
      geteuid: geteuid2,
      getgid: getgid2,
      getgroups: getgroups2,
      getMaxListeners: getMaxListeners2,
      getuid: getuid2,
      hasUncaughtExceptionCaptureCallback: hasUncaughtExceptionCaptureCallback2,
      hrtime: hrtime32,
      initgroups: initgroups2,
      kill: kill2,
      listenerCount: listenerCount2,
      listeners: listeners2,
      loadEnvFile: loadEnvFile2,
      mainModule: mainModule2,
      memoryUsage: memoryUsage2,
      moduleLoadList: moduleLoadList2,
      nextTick: nextTick2,
      off: off2,
      on: on2,
      once: once2,
      openStdin: openStdin2,
      permission: permission2,
      pid: pid2,
      ppid: ppid2,
      prependListener: prependListener2,
      prependOnceListener: prependOnceListener2,
      rawListeners: rawListeners2,
      reallyExit: reallyExit2,
      ref: ref2,
      release: release2,
      removeAllListeners: removeAllListeners2,
      removeListener: removeListener2,
      report: report2,
      resourceUsage: resourceUsage2,
      send: send2,
      setegid: setegid2,
      seteuid: seteuid2,
      setgid: setgid2,
      setgroups: setgroups2,
      setMaxListeners: setMaxListeners2,
      setSourceMapsEnabled: setSourceMapsEnabled2,
      setuid: setuid2,
      setUncaughtExceptionCaptureCallback: setUncaughtExceptionCaptureCallback2,
      sourceMapsEnabled: sourceMapsEnabled2,
      stderr: stderr2,
      stdin: stdin2,
      stdout: stdout2,
      throwDeprecation: throwDeprecation2,
      title: title2,
      traceDeprecation: traceDeprecation2,
      umask: umask2,
      unref: unref2,
      uptime: uptime2,
      version: version2,
      versions: versions2
    } = unenvProcess2);
    _process2 = {
      abort: abort2,
      addListener: addListener2,
      allowedNodeEnvironmentFlags: allowedNodeEnvironmentFlags2,
      hasUncaughtExceptionCaptureCallback: hasUncaughtExceptionCaptureCallback2,
      setUncaughtExceptionCaptureCallback: setUncaughtExceptionCaptureCallback2,
      loadEnvFile: loadEnvFile2,
      sourceMapsEnabled: sourceMapsEnabled2,
      arch: arch2,
      argv: argv2,
      argv0: argv02,
      chdir: chdir2,
      config: config2,
      connected: connected2,
      constrainedMemory: constrainedMemory2,
      availableMemory: availableMemory2,
      cpuUsage: cpuUsage2,
      cwd: cwd2,
      debugPort: debugPort2,
      dlopen: dlopen2,
      disconnect: disconnect2,
      emit: emit2,
      emitWarning: emitWarning2,
      env: env2,
      eventNames: eventNames2,
      execArgv: execArgv2,
      execPath: execPath2,
      exit: exit2,
      finalization: finalization2,
      features: features2,
      getBuiltinModule: getBuiltinModule2,
      getActiveResourcesInfo: getActiveResourcesInfo2,
      getMaxListeners: getMaxListeners2,
      hrtime: hrtime32,
      kill: kill2,
      listeners: listeners2,
      listenerCount: listenerCount2,
      memoryUsage: memoryUsage2,
      nextTick: nextTick2,
      on: on2,
      off: off2,
      once: once2,
      pid: pid2,
      platform: platform2,
      ppid: ppid2,
      prependListener: prependListener2,
      prependOnceListener: prependOnceListener2,
      rawListeners: rawListeners2,
      release: release2,
      removeAllListeners: removeAllListeners2,
      removeListener: removeListener2,
      report: report2,
      resourceUsage: resourceUsage2,
      setMaxListeners: setMaxListeners2,
      setSourceMapsEnabled: setSourceMapsEnabled2,
      stderr: stderr2,
      stdin: stdin2,
      stdout: stdout2,
      title: title2,
      throwDeprecation: throwDeprecation2,
      traceDeprecation: traceDeprecation2,
      umask: umask2,
      uptime: uptime2,
      version: version2,
      versions: versions2,
      // @ts-expect-error old API
      domain: domain2,
      initgroups: initgroups2,
      moduleLoadList: moduleLoadList2,
      reallyExit: reallyExit2,
      openStdin: openStdin2,
      assert: assert22,
      binding: binding2,
      send: send2,
      exitCode: exitCode2,
      channel: channel2,
      getegid: getegid2,
      geteuid: geteuid2,
      getgid: getgid2,
      getgroups: getgroups2,
      getuid: getuid2,
      setegid: setegid2,
      seteuid: seteuid2,
      setgid: setgid2,
      setgroups: setgroups2,
      setuid: setuid2,
      permission: permission2,
      mainModule: mainModule2,
      _events: _events2,
      _eventsCount: _eventsCount2,
      _exiting: _exiting2,
      _maxListeners: _maxListeners2,
      _debugEnd: _debugEnd2,
      _debugProcess: _debugProcess2,
      _fatalException: _fatalException2,
      _getActiveHandles: _getActiveHandles2,
      _getActiveRequests: _getActiveRequests2,
      _kill: _kill2,
      _preload_modules: _preload_modules2,
      _rawDebug: _rawDebug2,
      _startProfilerIdleNotifier: _startProfilerIdleNotifier2,
      _stopProfilerIdleNotifier: _stopProfilerIdleNotifier2,
      _tickCallback: _tickCallback2,
      _disconnect: _disconnect2,
      _handleQueue: _handleQueue2,
      _pendingMessage: _pendingMessage2,
      _channel: _channel2,
      _send: _send2,
      _linkedBinding: _linkedBinding2
    };
    process_default2 = _process2;
  }
});
var init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process = __esm({
  "../node_modules/wrangler/_virtual_unenv_global_polyfill-@cloudflare-unenv-preset-node-process"() {
    init_process2();
    globalThis.process = process_default2;
  }
});
function structuredLog(level, message, context22 = {}) {
  const logStr = JSON.stringify({
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    level: level.toUpperCase(),
    message,
    ...context22
  });
  if (level === "error") console.error(logStr);
  else if (level === "warn") console.warn(logStr);
  else console.info(logStr);
}
__name(structuredLog, "structuredLog");
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
  } catch (error32) {
    structuredLog("warn", "Failed to count tokens", { error: error32.message });
    return 0;
  }
}
__name(estimateTokenCount, "estimateTokenCount");
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
__name(validateInputTokens, "validateInputTokens");
function extractUsageMetadata(responseData) {
  if (!responseData?.usageMetadata) return { promptTokens: 0, outputTokens: 0, cachedTokens: 0 };
  return {
    promptTokens: responseData.usageMetadata.promptTokenCount || 0,
    outputTokens: responseData.usageMetadata.candidatesTokenCount || 0,
    cachedTokens: responseData.usageMetadata.cachedContentTokenCount || 0
  };
}
__name(extractUsageMetadata, "extractUsageMetadata");
function extractTextFromParts(parts) {
  return (parts || []).filter((p) => p.text && !p.thought).map((p) => p.text).join("");
}
__name(extractTextFromParts, "extractTextFromParts");
var GEMINI_CONFIG;
var onRequestPost;
var init_transform = __esm({
  "api/mainsite/ai/transform.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
    __name2(structuredLog, "structuredLog");
    __name2(estimateTokenCount, "estimateTokenCount");
    __name2(validateInputTokens, "validateInputTokens");
    __name2(extractUsageMetadata, "extractUsageMetadata");
    __name2(extractTextFromParts, "extractTextFromParts");
    onRequestPost = /* @__PURE__ */ __name2(async (context22) => {
      if (!context22.env.GEMINI_API_KEY) {
        structuredLog("error", "GEMINI_API_KEY missing");
        return new Response(JSON.stringify({ error: "GEMINI_API_KEY n\xE3o configurada." }), { status: 500 });
      }
      structuredLog("info", "transform API call starting", { endpoint: "transform" });
      try {
        const body = await context22.request.json();
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
        const inputTokens = await estimateTokenCount(fullPrompt, context22.env.GEMINI_API_KEY);
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
        const generateUrl = `https://generativelanguage.googleapis.com/${GEMINI_CONFIG.version}/models/${GEMINI_CONFIG.model}:generateContent?key=${context22.env.GEMINI_API_KEY}`;
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
      } catch (error32) {
        structuredLog("error", "transform fatal error", { error: error32 instanceof Error ? error32.message : "Erro desconhecido" });
        return new Response(JSON.stringify({ error: error32 instanceof Error ? error32.message : "Erro desconhecido na gera\xE7\xE3o por IA." }), { status: 500 });
      }
    }, "onRequestPost");
  }
});
var onRequestGet;
var init_filename = __esm({
  "api/mainsite/media/[filename].ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    onRequestGet = /* @__PURE__ */ __name2(async (context22) => {
      const filename = context22.params.filename;
      if (!filename) {
        return new Response("Arquivo n\xE3o especificado.", { status: 400 });
      }
      try {
        const object = await context22.env.MEDIA_BUCKET.get(filename);
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
var DEFAULT_ADMIN_ACTOR;
var normalizeAdminActor;
var resolveAdminActorFromRequest;
var init_admin_actor = __esm({
  "api/_lib/admin-actor.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    DEFAULT_ADMIN_ACTOR = "admin-app";
    normalizeAdminActor = /* @__PURE__ */ __name2((value) => {
      const actor = String(value ?? "").trim();
      if (!actor) {
        return null;
      }
      return actor.slice(0, 160);
    }, "normalizeAdminActor");
    resolveAdminActorFromRequest = /* @__PURE__ */ __name2((request, body) => {
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
__name(ensureOperationalTables, "ensureOperationalTables");
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
__name(logModuleOperationalEvent, "logModuleOperationalEvent");
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
__name(startSyncRun, "startSyncRun");
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
__name(finishSyncRun, "finishSyncRun");
var init_operational = __esm({
  "api/_lib/operational.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name2(ensureOperationalTables, "ensureOperationalTables");
    __name2(logModuleOperationalEvent, "logModuleOperationalEvent");
    __name2(startSyncRun, "startSyncRun");
    __name2(finishSyncRun, "finishSyncRun");
  }
});
var HUB_CARDS_LIMITS;
var APPHUB_DEFAULT_CARDS;
var ADMINHUB_DEFAULT_CARDS;
var toHubHeaders;
var toTable;
var toDefaultCards;
var sanitizeCard;
var isValidHttpUrl;
var validateCards;
var mapRowToCard;
var ensureHubTables;
var loadCardsFromDb;
var saveCardsToDb;
var resolveHubConfig;
var parseCardsFromBody;
var logHubEvent;
var init_hub_config = __esm({
  "api/_lib/hub-config.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
    toHubHeaders = /* @__PURE__ */ __name2(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHubHeaders");
    toTable = /* @__PURE__ */ __name2((module) => module === "apphub" ? "apphub_cards" : "adminhub_cards", "toTable");
    toDefaultCards = /* @__PURE__ */ __name2((module) => module === "apphub" ? APPHUB_DEFAULT_CARDS : ADMINHUB_DEFAULT_CARDS, "toDefaultCards");
    sanitizeCard = /* @__PURE__ */ __name2((raw) => {
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
    isValidHttpUrl = /* @__PURE__ */ __name2((value) => {
      try {
        const parsed = new URL(value);
        return parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch {
        return false;
      }
    }, "isValidHttpUrl");
    validateCards = /* @__PURE__ */ __name2((cards) => {
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
    mapRowToCard = /* @__PURE__ */ __name2((row) => sanitizeCard({
      name: row.name,
      description: row.description,
      url: row.url,
      icon: row.icon ?? "",
      badge: row.badge ?? ""
    }), "mapRowToCard");
    ensureHubTables = /* @__PURE__ */ __name2(async (db) => {
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
    loadCardsFromDb = /* @__PURE__ */ __name2(async (db, module) => {
      await ensureHubTables(db);
      const table32 = toTable(module);
      const rows = await db.prepare(`
    SELECT name, description, url, icon, badge, display_order
    FROM ${table32}
    ORDER BY display_order ASC, id ASC
  `).all();
      return (rows.results ?? []).map((row) => mapRowToCard(row)).filter((item) => item !== null);
    }, "loadCardsFromDb");
    saveCardsToDb = /* @__PURE__ */ __name2(async (db, module, cards, adminActor) => {
      await ensureHubTables(db);
      const table32 = toTable(module);
      await db.prepare(`DELETE FROM ${table32}`).run();
      let inserted = 0;
      const updatedAt = Date.now();
      for (const [index, card] of cards.entries()) {
        await db.prepare(`
      INSERT INTO ${table32} (display_order, name, description, url, icon, badge, updated_at, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(index, card.name, card.description, card.url, card.icon, card.badge, updatedAt, adminActor ?? null).run();
        inserted += 1;
      }
      return inserted;
    }, "saveCardsToDb");
    resolveHubConfig = /* @__PURE__ */ __name2(async (env22, module) => {
      const db = env22.BIGDATA_DB;
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
    parseCardsFromBody = /* @__PURE__ */ __name2((body) => {
      const payload = body;
      const items = Array.isArray(payload?.cards) ? payload.cards : [];
      const cards = items.map((item) => sanitizeCard(item)).filter((item) => item !== null);
      validateCards(cards);
      return cards;
    }, "parseCardsFromBody");
    logHubEvent = /* @__PURE__ */ __name2(async (db, input) => {
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
var toRequestId;
var createResponseTrace;
var init_request_trace = __esm({
  "api/_lib/request-trace.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    toRequestId = /* @__PURE__ */ __name2((request) => {
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
    createResponseTrace = /* @__PURE__ */ __name2((request) => ({
      request_id: toRequestId(request),
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }), "createResponseTrace");
  }
});
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
__name(validatePutAuth, "validatePutAuth");
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
__name(unauthorizedResponse, "unauthorizedResponse");
var init_auth = __esm({
  "api/_lib/auth.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name2(validatePutAuth, "validatePutAuth");
    __name2(unauthorizedResponse, "unauthorizedResponse");
  }
});
async function onRequestGet2(context22) {
  const trace32 = createResponseTrace(context22.request);
  try {
    const resolved = await resolveHubConfig(context22.env, "adminhub");
    await logHubEvent(context22.env.BIGDATA_DB, {
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
      ...trace32
    }), {
      headers: toHubHeaders()
    });
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Falha ao carregar configura\xE7\xE3o do adminhub";
    await logHubEvent(context22.env.BIGDATA_DB, {
      module: "adminhub",
      action: "config-read",
      source: "bigdata_db",
      ok: false,
      fallbackUsed: true,
      errorMessage: message
    });
    return buildErrorResponse(message, trace32, 500);
  }
}
__name(onRequestGet2, "onRequestGet2");
async function onRequestPut(context22) {
  const trace32 = createResponseTrace(context22.request);
  const authContext = validatePutAuth(context22.request, context22.env.ADMINHUB_BEARER_TOKEN);
  if (!authContext.isAuthenticated) {
    return unauthorizedResponse(authContext.error || "No authentication provided");
  }
  if (!context22.env.BIGDATA_DB) {
    return buildErrorResponse("BIGDATA_DB n\xE3o configurado no runtime.", trace32, 503);
  }
  try {
    const body = await context22.request.json();
    const adminActor = resolveAdminActorFromRequest(context22.request, body);
    const cards = parseCardsFromBody(body);
    const updated = await saveCardsToDb(context22.env.BIGDATA_DB, "adminhub", cards, adminActor);
    await logHubEvent(context22.env.BIGDATA_DB, {
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
      ...trace32
    }), {
      headers: toHubHeaders()
    });
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Falha ao salvar configura\xE7\xE3o do adminhub";
    await logHubEvent(context22.env.BIGDATA_DB, {
      module: "adminhub",
      action: "config-save",
      source: "bigdata_db",
      ok: false,
      fallbackUsed: false,
      errorMessage: message
    });
    return buildErrorResponse(message, trace32, 400);
  }
}
__name(onRequestPut, "onRequestPut");
var buildErrorResponse;
var init_config = __esm({
  "api/adminhub/config.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_admin_actor();
    init_hub_config();
    init_request_trace();
    init_auth();
    buildErrorResponse = /* @__PURE__ */ __name2((message, trace32, status = 500) => new Response(JSON.stringify({
      ok: false,
      error: message,
      ...trace32
    }), {
      status,
      headers: toHubHeaders()
    }), "buildErrorResponse");
    __name2(onRequestGet2, "onRequestGet");
    __name2(onRequestPut, "onRequestPut");
  }
});
async function onRequestGet3(context22) {
  const trace32 = createResponseTrace(context22.request);
  try {
    const resolved = await resolveHubConfig(context22.env, "apphub");
    await logHubEvent(context22.env.BIGDATA_DB, {
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
      ...trace32
    }), {
      headers: toHubHeaders()
    });
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Falha ao carregar configura\xE7\xE3o do apphub";
    await logHubEvent(context22.env.BIGDATA_DB, {
      module: "apphub",
      action: "config-read",
      source: "bigdata_db",
      ok: false,
      fallbackUsed: true,
      errorMessage: message
    });
    return buildErrorResponse2(message, trace32, 500);
  }
}
__name(onRequestGet3, "onRequestGet3");
async function onRequestPut2(context22) {
  const trace32 = createResponseTrace(context22.request);
  const authContext = validatePutAuth(context22.request, context22.env.APPHUB_BEARER_TOKEN);
  if (!authContext.isAuthenticated) {
    return unauthorizedResponse(authContext.error || "No authentication provided");
  }
  if (!context22.env.BIGDATA_DB) {
    return buildErrorResponse2("BIGDATA_DB n\xE3o configurado no runtime.", trace32, 503);
  }
  try {
    const body = await context22.request.json();
    const adminActor = resolveAdminActorFromRequest(context22.request, body);
    const cards = parseCardsFromBody(body);
    const updated = await saveCardsToDb(context22.env.BIGDATA_DB, "apphub", cards, adminActor);
    await logHubEvent(context22.env.BIGDATA_DB, {
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
      ...trace32
    }), {
      headers: toHubHeaders()
    });
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Falha ao salvar configura\xE7\xE3o do apphub";
    await logHubEvent(context22.env.BIGDATA_DB, {
      module: "apphub",
      action: "config-save",
      source: "bigdata_db",
      ok: false,
      fallbackUsed: false,
      errorMessage: message
    });
    return buildErrorResponse2(message, trace32, 400);
  }
}
__name(onRequestPut2, "onRequestPut2");
var buildErrorResponse2;
var init_config2 = __esm({
  "api/apphub/config.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_admin_actor();
    init_hub_config();
    init_request_trace();
    init_auth();
    buildErrorResponse2 = /* @__PURE__ */ __name2((message, trace32, status = 500) => new Response(JSON.stringify({
      ok: false,
      error: message,
      ...trace32
    }), {
      status,
      headers: toHubHeaders()
    }), "buildErrorResponse");
    __name2(onRequestGet3, "onRequestGet");
    __name2(onRequestPut2, "onRequestPut");
  }
});
var DEFAULT_POLICIES;
var SUPPORTED_ROUTES;
var toDbRoute;
var toHeaders;
var toInt;
var ensureRateLimitTables;
var ensureDefaultPolicies;
var getRateLimitWindowStats;
var listPoliciesWithStats;
var upsertRateLimitPolicy;
var resetRateLimitPolicy;
var init_astrologo_admin = __esm({
  "api/_lib/astrologo-admin.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
      }
    };
    SUPPORTED_ROUTES = ["calcular", "analisar", "enviar-email"];
    toDbRoute = /* @__PURE__ */ __name2((route) => route.startsWith("astrologo/") ? route : `astrologo/${route}`, "toDbRoute");
    toHeaders = /* @__PURE__ */ __name2(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    toInt = /* @__PURE__ */ __name2((value, fallback) => {
      const parsed = Number.parseInt(String(value), 10);
      return Number.isFinite(parsed) ? parsed : fallback;
    }, "toInt");
    ensureRateLimitTables = /* @__PURE__ */ __name2(async (db) => {
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
    ensureDefaultPolicies = /* @__PURE__ */ __name2(async (db) => {
      await ensureRateLimitTables(db);
      for (const route of SUPPORTED_ROUTES) {
        const policy = DEFAULT_POLICIES[route];
        await db.prepare(`
      INSERT OR IGNORE INTO astrologo_rate_limit_policies (route, enabled, max_requests, window_minutes)
      VALUES (?, ?, ?, ?)
    `).bind(toDbRoute(policy.route), policy.enabled, policy.max_requests, policy.window_minutes).run();
      }
    }, "ensureDefaultPolicies");
    getRateLimitWindowStats = /* @__PURE__ */ __name2(async (db, route, windowMinutes) => {
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
    listPoliciesWithStats = /* @__PURE__ */ __name2(async (db) => {
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
    upsertRateLimitPolicy = /* @__PURE__ */ __name2(async (db, input) => {
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
    resetRateLimitPolicy = /* @__PURE__ */ __name2(async (db, route) => {
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
async function onRequestPost2(context22) {
  const { request, env: env22 } = context22;
  const trace32 = createResponseTrace(request);
  try {
    const body = await request.json();
    const adminActor = resolveAdminActorFromRequest(request, body);
    const emailDestino = String(body.emailDestino ?? "").trim();
    const relatorioHtml = String(body.relatorioHtml ?? "");
    const relatorioTexto = String(body.relatorioTexto ?? "");
    const nomeConsulente = String(body.nomeConsulente ?? "").trim();
    if (!isValidEmail(emailDestino)) {
      return json({ ok: false, error: "E-mail de destino inv\xE1lido.", ...trace32 }, 400);
    }
    if (!relatorioHtml && !relatorioTexto) {
      return json({ ok: false, error: "Relat\xF3rio vazio.", ...trace32 }, 400);
    }
    if (!env22.RESEND_API_KEY) {
      return json({ ok: false, error: "RESEND_API_KEY n\xE3o configurada no runtime.", ...trace32 }, 503);
    }
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env22.RESEND_API_KEY}`,
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
      if (env22.BIGDATA_DB) {
        try {
          await logModuleOperationalEvent(env22.BIGDATA_DB, {
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
      return json({ ok: false, error: message, ...trace32 }, 502);
    }
    if (env22.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(env22.BIGDATA_DB, {
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
    return json({
      ok: true,
      message: "E-mail enviado com sucesso!",
      provider: "resend",
      id: resendPayload.id ?? null,
      admin_actor: adminActor,
      ...trace32
    });
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Falha interna na comunica\xE7\xE3o do e-mail.";
    if (env22.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(env22.BIGDATA_DB, {
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
    return json({ ok: false, error: message, ...trace32 }, 500);
  }
}
__name(onRequestPost2, "onRequestPost2");
var json;
var isValidEmail;
var init_enviar_email = __esm({
  "api/astrologo/enviar-email.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_astrologo_admin();
    init_admin_actor();
    init_request_trace();
    json = /* @__PURE__ */ __name2((data, status = 200) => new Response(JSON.stringify(data), {
      status,
      headers: toHeaders()
    }), "json");
    isValidEmail = /* @__PURE__ */ __name2((value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()), "isValidEmail");
    __name2(onRequestPost2, "onRequestPost");
  }
});
async function onRequestPost3(context22) {
  const trace32 = createResponseTrace(context22.request);
  const db = resolveDb(context22);
  const source = resolveOperationalSource();
  if (!db) {
    return json2({ ok: false, error: "Nenhum binding D1 dispon\xEDvel (BIGDATA_DB).", ...trace32 }, 503);
  }
  try {
    const body = await context22.request.json();
    const adminActor = resolveAdminActorFromRequest(context22.request, body);
    const id = String(body.id ?? "").trim();
    if (!id) {
      return json2({ ok: false, error: "ID inv\xE1lido.", ...trace32 }, 400);
    }
    await db.prepare("DELETE FROM astrologo_mapas WHERE id = ?").bind(id).run();
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return json2({ ok: true, id, admin_actor: adminActor, ...trace32 });
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Falha ao excluir mapa do Astr\xF3logo";
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return json2({ ok: false, error: message, ...trace32 }, 500);
  }
}
__name(onRequestPost3, "onRequestPost3");
var json2;
var resolveDb;
var resolveOperationalSource;
var init_excluir = __esm({
  "api/astrologo/excluir.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_astrologo_admin();
    init_admin_actor();
    init_request_trace();
    json2 = /* @__PURE__ */ __name2((data, status = 200) => new Response(JSON.stringify(data), {
      status,
      headers: toHeaders()
    }), "json");
    resolveDb = /* @__PURE__ */ __name2((context22) => context22.env.BIGDATA_DB, "resolveDb");
    resolveOperationalSource = /* @__PURE__ */ __name2(() => "bigdata_db", "resolveOperationalSource");
    __name2(onRequestPost3, "onRequestPost");
  }
});
async function onRequestPost4(context22) {
  const trace32 = createResponseTrace(context22.request);
  const db = resolveDb2(context22);
  const source = resolveOperationalSource2();
  if (!db) {
    return json3({ ok: false, error: "Nenhum binding D1 dispon\xEDvel (BIGDATA_DB).", ...trace32 }, 503);
  }
  try {
    const body = await context22.request.json();
    const adminActor = resolveAdminActorFromRequest(context22.request, body);
    const id = String(body.id ?? "").trim();
    if (!id) {
      return json3({ ok: false, error: "ID inv\xE1lido.", ...trace32 }, 400);
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
      return json3({ ok: false, error: "Mapa n\xE3o encontrado.", ...trace32 }, 404);
    }
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return json3({
      ok: true,
      mapa,
      admin_actor: adminActor,
      ...trace32
    });
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Falha ao ler mapa do Astr\xF3logo";
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return json3({ ok: false, error: message, ...trace32 }, 500);
  }
}
__name(onRequestPost4, "onRequestPost4");
var json3;
var resolveDb2;
var resolveOperationalSource2;
var init_ler = __esm({
  "api/astrologo/ler.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_astrologo_admin();
    init_admin_actor();
    init_request_trace();
    json3 = /* @__PURE__ */ __name2((data, status = 200) => new Response(JSON.stringify(data), {
      status,
      headers: toHeaders()
    }), "json");
    resolveDb2 = /* @__PURE__ */ __name2((context22) => context22.env.BIGDATA_DB, "resolveDb");
    resolveOperationalSource2 = /* @__PURE__ */ __name2(() => "bigdata_db", "resolveOperationalSource");
    __name2(onRequestPost4, "onRequestPost");
  }
});
async function onRequestGet4(context22) {
  const { request, env: env22 } = context22;
  const trace32 = createResponseTrace(request);
  const url = new URL(request.url);
  const nome = (url.searchParams.get("nome") ?? "").trim();
  const dataInicial = (url.searchParams.get("dataInicial") ?? "").trim();
  const dataFinal = (url.searchParams.get("dataFinal") ?? "").trim();
  const email = (url.searchParams.get("email") ?? "").trim();
  const avisos = [];
  if (email) {
    avisos.push("Filtro por e-mail ainda n\xE3o est\xE1 dispon\xEDvel nesta fase de integra\xE7\xE3o.");
  }
  if (env22.BIGDATA_DB) {
    try {
      const items = await queryBigdataItems(env22.BIGDATA_DB, { nome, dataInicial, dataFinal });
      try {
        await logModuleOperationalEvent(env22.BIGDATA_DB, {
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
        ...trace32,
        total: items.length,
        fonte: "bigdata_db",
        filtros: { nome, dataInicial, dataFinal, email },
        avisos,
        items
      }), { headers: toResponseHeaders() });
    } catch (error32) {
      const message = error32 instanceof Error ? error32.message : "Falha ao consultar bigdata_db";
      avisos.push(`Fallback para legado ativado: ${message}`);
    }
  }
  return new Response(JSON.stringify({
    ok: false,
    ...trace32,
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
__name(onRequestGet4, "onRequestGet4");
var toResponseHeaders;
var toItem;
var queryBigdataItems;
var init_listar = __esm({
  "api/astrologo/listar.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_request_trace();
    toResponseHeaders = /* @__PURE__ */ __name2(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toResponseHeaders");
    toItem = /* @__PURE__ */ __name2((mapa) => {
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
    queryBigdataItems = /* @__PURE__ */ __name2(async (db, filtros) => {
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
    __name2(onRequestGet4, "onRequestGet");
  }
});
function json4(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(json4, "json4");
var onRequestGet5;
var init_modelos = __esm({
  "api/astrologo/modelos.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name2(json4, "json");
    onRequestGet5 = /* @__PURE__ */ __name2(async ({ env: env22 }) => {
      const apiKey = env22?.GEMINI_API_KEY;
      if (!apiKey) return json4({ ok: false, error: "GEMINI_API_KEY n\xE3o configurada." }, 503);
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
        return json4({ ok: true, models, total: models.length });
      } catch (err) {
        return json4({ ok: false, error: err instanceof Error ? err.message : "Erro ao listar modelos." }, 500);
      }
    }, "onRequestGet");
  }
});
async function onRequestGet6(context22) {
  const trace32 = createResponseTrace(context22.request);
  const db = resolveRateLimitDb(context22);
  const source = resolveOperationalSource3(context22);
  if (!db) {
    return json5({ ok: false, error: "Nenhum binding D1 dispon\xEDvel (BIGDATA_DB).", ...trace32 }, 503);
  }
  try {
    const adminActor = resolveAdminActorFromRequest(context22.request);
    const policies = await listPoliciesWithStats(db);
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return json5({ ok: true, policies, admin_actor: adminActor, ...trace32 });
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Falha ao carregar painel de rate limit do Astr\xF3logo";
    const fallbackPolicies = buildFallbackPolicies();
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return json5({
      ok: true,
      warnings: [message, "Fallback de pol\xEDticas padr\xE3o aplicado para evitar indisponibilidade do painel."],
      policies: fallbackPolicies,
      ...trace32
    }, 200);
  }
}
__name(onRequestGet6, "onRequestGet6");
async function onRequestPost5(context22) {
  const trace32 = createResponseTrace(context22.request);
  const db = resolveRateLimitDb(context22);
  const source = resolveOperationalSource3(context22);
  if (!db) {
    return json5({ ok: false, error: "Nenhum binding D1 dispon\xEDvel (ASTROLOGO_SOURCE_DB/BIGDATA_DB).", ...trace32 }, 503);
  }
  try {
    const body = await context22.request.json();
    const adminActor = resolveAdminActorFromRequest(context22.request, body);
    const route = normalizeRoute(body.route);
    if (!route) {
      return json5({ ok: false, error: "Rota de rate limit inv\xE1lida.", ...trace32 }, 400);
    }
    const action = String(body.action ?? "update").trim();
    if (action === "restore_default") {
      await resetRateLimitPolicy(db, route);
      const policies2 = await listPoliciesWithStats(db);
      if (context22.env.BIGDATA_DB) {
        try {
          await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
      return json5({ ok: true, action: "restore_default", policies: policies2, admin_actor: adminActor, ...trace32 });
    }
    const enabled = body.enabled ? 1 : 0;
    const maxRequests = toPositiveInt(body.max_requests, 10);
    const windowMinutes = toPositiveInt(body.window_minutes, 10);
    if (maxRequests > 500 || windowMinutes > 1440) {
      return json5({ ok: false, error: "Par\xE2metros fora da faixa permitida.", ...trace32 }, 400);
    }
    await upsertRateLimitPolicy(db, {
      route,
      enabled,
      maxRequests,
      windowMinutes
    });
    const policies = await listPoliciesWithStats(db);
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return json5({ ok: true, action: "update", policies, admin_actor: adminActor, ...trace32 });
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Falha ao salvar painel de rate limit do Astr\xF3logo";
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return json5({ ok: false, error: message, ...trace32 }, 500);
  }
}
__name(onRequestPost5, "onRequestPost5");
var json5;
var normalizeRoute;
var toPositiveInt;
var buildFallbackPolicies;
var resolveRateLimitDb;
var resolveOperationalSource3;
var init_rate_limit = __esm({
  "api/astrologo/rate-limit.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_astrologo_admin();
    init_admin_actor();
    init_request_trace();
    json5 = /* @__PURE__ */ __name2((data, status = 200) => new Response(JSON.stringify(data), {
      status,
      headers: toHeaders()
    }), "json");
    normalizeRoute = /* @__PURE__ */ __name2((value) => {
      const route = String(value ?? "").trim();
      if (SUPPORTED_ROUTES.includes(route)) {
        return route;
      }
      return null;
    }, "normalizeRoute");
    toPositiveInt = /* @__PURE__ */ __name2((value, fallback) => {
      const parsed = Number.parseInt(String(value), 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
      }
      return parsed;
    }, "toPositiveInt");
    buildFallbackPolicies = /* @__PURE__ */ __name2(() => [
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
    resolveRateLimitDb = /* @__PURE__ */ __name2((context22) => context22.env.BIGDATA_DB, "resolveRateLimitDb");
    resolveOperationalSource3 = /* @__PURE__ */ __name2(() => "bigdata_db", "resolveOperationalSource");
    __name2(onRequestGet6, "onRequestGet");
    __name2(onRequestPost5, "onRequestPost");
  }
});
async function onRequestPost6(context22) {
  const { request, env: env22 } = context22;
  if (!env22.BIGDATA_DB) {
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
  const syncRunId = await startSyncRun(env22.BIGDATA_DB, {
    module: "astrologo",
    status: "running",
    startedAt,
    metadata: { limit }
  });
  try {
    const source = await env22.BIGDATA_DB.prepare(`
      SELECT id, nome, data_nascimento
      FROM astrologo_mapas
      ORDER BY created_at DESC
      LIMIT ?
    `).bind(limit).all();
    const rows = (source.results ?? []).map((mapa) => toSyncRow(mapa)).filter((item) => item !== null);
    let upserted = 0;
    for (const row of rows) {
      await env22.BIGDATA_DB.prepare(`
        INSERT INTO astrologo_mapas (id, nome, data_nascimento, created_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(id) DO UPDATE SET
          nome = excluded.nome,
          data_nascimento = excluded.data_nascimento
      `).bind(row.id, row.nome, row.dataNascimento).run();
      upserted += 1;
    }
    await finishSyncRun(env22.BIGDATA_DB, {
      id: syncRunId,
      status: "success",
      finishedAt: Date.now(),
      recordsRead: rows.length,
      recordsUpserted: upserted
    });
    await logModuleOperationalEvent(env22.BIGDATA_DB, {
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
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Falha inesperada no sync do Astr\xF3logo";
    await finishSyncRun(env22.BIGDATA_DB, {
      id: syncRunId,
      status: "error",
      finishedAt: Date.now(),
      recordsRead: 0,
      recordsUpserted: 0,
      errorMessage: message
    });
    await logModuleOperationalEvent(env22.BIGDATA_DB, {
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
__name(onRequestPost6, "onRequestPost6");
var parseLimit;
var toHeaders2;
var toSyncRow;
var init_sync = __esm({
  "api/astrologo/sync.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    parseLimit = /* @__PURE__ */ __name2((rawValue) => {
      const parsed = Number.parseInt(rawValue ?? "300", 10);
      if (!Number.isFinite(parsed)) {
        return 300;
      }
      return Math.min(1e3, Math.max(1, parsed));
    }, "parseLimit");
    toHeaders2 = /* @__PURE__ */ __name2(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    toSyncRow = /* @__PURE__ */ __name2((mapa) => {
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
    __name2(onRequestPost6, "onRequestPost");
  }
});
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(jsonResponse, "jsonResponse");
var onRequestGet7;
var onRequestDelete;
var init_userdata = __esm({
  "api/astrologo/userdata.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name2(jsonResponse, "jsonResponse");
    onRequestGet7 = /* @__PURE__ */ __name2(async ({ env: env22, request }) => {
      const db = env22?.BIGDATA_DB;
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
      } catch (error32) {
        return jsonResponse({
          ok: false,
          error: error32 instanceof Error ? error32.message : "Erro ao listar dados de usu\xE1rios."
        }, 500);
      }
    }, "onRequestGet");
    onRequestDelete = /* @__PURE__ */ __name2(async ({ env: env22, request }) => {
      const db = env22?.BIGDATA_DB;
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
      } catch (error32) {
        console.error("[astrologo/userdata DELETE] Erro:", error32);
        return jsonResponse({
          ok: false,
          error: error32 instanceof Error ? error32.message : "Erro ao excluir registro."
        }, 500);
      }
    }, "onRequestDelete");
  }
});
var resolveToken;
var parseJsonOrThrow;
var toFirstError;
var cloudflareRequest;
var cloudflareRequestPayload;
var listCloudflareZones;
var extractDnsResult;
var quoteTxtContent;
var normalizeZoneId;
var normalizeRecordId;
var normalizeRecordType;
var normalizeRecordName;
var normalizeRecordInput;
var buildDnsRecordPayload;
var upsertCloudflareTxtRecord;
var getCloudflareDnsSnapshot;
var listCloudflareDnsRecords;
var createCloudflareDnsRecord;
var updateCloudflareDnsRecord;
var deleteCloudflareDnsRecord;
var init_cloudflare_api = __esm({
  "api/_lib/cloudflare-api.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    resolveToken = /* @__PURE__ */ __name2((env22) => {
      const byDnsToken = env22.CLOUDFLARE_DNS?.trim();
      if (byDnsToken) {
        return byDnsToken;
      }
      const byApiToken = env22.CLOUDFLARE_API_TOKEN?.trim();
      if (byApiToken) {
        return byApiToken;
      }
      const byCfToken = env22.CF_API_TOKEN?.trim();
      if (byCfToken) {
        return byCfToken;
      }
      return "";
    }, "resolveToken");
    parseJsonOrThrow = /* @__PURE__ */ __name2((rawText, fallback, response) => {
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
    toFirstError = /* @__PURE__ */ __name2((payload) => {
      const firstError = Array.isArray(payload.errors) && payload.errors.length > 0 ? payload.errors[0] : null;
      return firstError?.message?.trim() || null;
    }, "toFirstError");
    cloudflareRequest = /* @__PURE__ */ __name2(async (env22, path, fallback, init) => {
      const payload = await cloudflareRequestPayload(env22, path, fallback, init);
      return payload.result;
    }, "cloudflareRequest");
    cloudflareRequestPayload = /* @__PURE__ */ __name2(async (env22, path, fallback, init) => {
      const token = resolveToken(env22);
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
    listCloudflareZones = /* @__PURE__ */ __name2(async (env22) => {
      const zones = await cloudflareRequest(
        env22,
        "/zones?status=active&per_page=500",
        "Falha ao carregar zonas da Cloudflare"
      );
      return (Array.isArray(zones) ? zones : []).map((zone) => ({
        id: String(zone.id ?? "").trim(),
        name: String(zone.name ?? "").trim().toLowerCase()
      })).filter((zone) => zone.id && zone.name).sort((a, b) => a.name.localeCompare(b.name));
    }, "listCloudflareZones");
    extractDnsResult = /* @__PURE__ */ __name2(async (env22, path, fallback) => {
      const result = await cloudflareRequest(env22, path, fallback);
      return Array.isArray(result) ? result : [];
    }, "extractDnsResult");
    quoteTxtContent = /* @__PURE__ */ __name2((content) => {
      const normalized = content.trim().replace(/^"|"$/g, "");
      return `"${normalized}"`;
    }, "quoteTxtContent");
    normalizeZoneId = /* @__PURE__ */ __name2((zoneId) => {
      const normalized = zoneId.trim();
      if (!normalized) {
        throw new Error("Zone ID \xE9 obrigat\xF3rio.");
      }
      return normalized;
    }, "normalizeZoneId");
    normalizeRecordId = /* @__PURE__ */ __name2((recordId) => {
      const normalized = recordId.trim();
      if (!normalized) {
        throw new Error("Record ID \xE9 obrigat\xF3rio.");
      }
      return normalized;
    }, "normalizeRecordId");
    normalizeRecordType = /* @__PURE__ */ __name2((recordType) => {
      const normalized = recordType.trim().toUpperCase();
      if (!normalized) {
        throw new Error("Tipo de registro DNS \xE9 obrigat\xF3rio.");
      }
      return normalized;
    }, "normalizeRecordType");
    normalizeRecordName = /* @__PURE__ */ __name2((recordName) => {
      const normalized = recordName.trim().toLowerCase();
      if (!normalized) {
        throw new Error("Nome do registro DNS \xE9 obrigat\xF3rio.");
      }
      return normalized;
    }, "normalizeRecordName");
    normalizeRecordInput = /* @__PURE__ */ __name2((input) => {
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
    buildDnsRecordPayload = /* @__PURE__ */ __name2((input) => {
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
    upsertCloudflareTxtRecord = /* @__PURE__ */ __name2(async (env22, zoneId, name, content) => {
      const normalizedZoneId = zoneId.trim();
      const normalizedName = name.trim().toLowerCase();
      const normalizedContent = content.trim();
      if (!normalizedZoneId || !normalizedName || !normalizedContent) {
        throw new Error("ZoneId, name e content s\xE3o obrigat\xF3rios para upsert TXT na Cloudflare.");
      }
      const existing = await extractDnsResult(
        env22,
        `/zones/${encodeURIComponent(normalizedZoneId)}/dns_records?type=TXT&name=${encodeURIComponent(normalizedName)}`,
        `Falha ao consultar TXT ${normalizedName}`
      );
      const existingRecordId = String(existing[0]?.id ?? "").trim();
      if (existingRecordId) {
        await cloudflareRequest(
          env22,
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
        env22,
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
    getCloudflareDnsSnapshot = /* @__PURE__ */ __name2(async (env22, domain22, zoneId) => {
      const normalizedDomain = domain22.trim().toLowerCase();
      const normalizedZoneId = zoneId.trim();
      if (!normalizedDomain || !normalizedZoneId) {
        throw new Error("Domain e zoneId s\xE3o obrigat\xF3rios para auditar DNS na Cloudflare.");
      }
      const [mxRecordsRaw, tlsRptRaw, mtastsRaw] = await Promise.all([
        extractDnsResult(
          env22,
          `/zones/${encodeURIComponent(normalizedZoneId)}/dns_records?type=MX`,
          `Falha ao consultar MX de ${normalizedDomain}`
        ),
        extractDnsResult(
          env22,
          `/zones/${encodeURIComponent(normalizedZoneId)}/dns_records?type=TXT&name=${encodeURIComponent(`_smtp._tls.${normalizedDomain}`)}`,
          `Falha ao consultar TLS-RPT de ${normalizedDomain}`
        ),
        extractDnsResult(
          env22,
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
    listCloudflareDnsRecords = /* @__PURE__ */ __name2(async (env22, zoneId, options) => {
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
        env22,
        `/zones/${encodeURIComponent(normalizedZoneId)}/dns_records?${query.toString()}`,
        "Falha ao listar registros DNS da zona"
      );
      const records = Array.isArray(payload.result) ? payload.result : [];
      const info32 = payload.result_info ?? {};
      return {
        records,
        pagination: {
          page: Number(info32.page ?? page),
          perPage: Number(info32.per_page ?? perPage),
          totalPages: Number(info32.total_pages ?? 1),
          totalCount: Number(info32.total_count ?? records.length),
          count: Number(info32.count ?? records.length)
        }
      };
    }, "listCloudflareDnsRecords");
    createCloudflareDnsRecord = /* @__PURE__ */ __name2(async (env22, zoneId, input) => {
      const normalizedZoneId = normalizeZoneId(zoneId);
      const payload = buildDnsRecordPayload(input);
      const created = await cloudflareRequest(
        env22,
        `/zones/${encodeURIComponent(normalizedZoneId)}/dns_records`,
        `Falha ao criar registro DNS ${String(payload.type ?? "").toUpperCase()} ${String(payload.name ?? "")}`,
        {
          method: "POST",
          body: JSON.stringify(payload)
        }
      );
      return created;
    }, "createCloudflareDnsRecord");
    updateCloudflareDnsRecord = /* @__PURE__ */ __name2(async (env22, zoneId, recordId, input) => {
      const normalizedZoneId = normalizeZoneId(zoneId);
      const normalizedRecordId = normalizeRecordId(recordId);
      const payload = buildDnsRecordPayload(input);
      const updated = await cloudflareRequest(
        env22,
        `/zones/${encodeURIComponent(normalizedZoneId)}/dns_records/${encodeURIComponent(normalizedRecordId)}`,
        `Falha ao atualizar registro DNS ${String(payload.type ?? "").toUpperCase()} ${String(payload.name ?? "")}`,
        {
          method: "PUT",
          body: JSON.stringify(payload)
        }
      );
      return updated;
    }, "updateCloudflareDnsRecord");
    deleteCloudflareDnsRecord = /* @__PURE__ */ __name2(async (env22, zoneId, recordId) => {
      const normalizedZoneId = normalizeZoneId(zoneId);
      const normalizedRecordId = normalizeRecordId(recordId);
      await cloudflareRequest(
        env22,
        `/zones/${encodeURIComponent(normalizedZoneId)}/dns_records/${encodeURIComponent(normalizedRecordId)}`,
        "Falha ao remover registro DNS",
        {
          method: "DELETE"
        }
      );
    }, "deleteCloudflareDnsRecord");
  }
});
async function onRequestDelete2(context22) {
  const trace32 = createResponseTrace(context22.request);
  const url = new URL(context22.request.url);
  const zoneId = String(url.searchParams.get("zoneId") ?? "").trim();
  const recordId = String(url.searchParams.get("recordId") ?? "").trim();
  const adminActor = resolveAdminActorFromRequest(context22.request);
  if (!zoneId || !recordId) {
    return toError("Par\xE2metros zoneId e recordId s\xE3o obrigat\xF3rios.", trace32, 400);
  }
  try {
    await deleteCloudflareDnsRecord(context22.env, zoneId, recordId);
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
      ...trace32,
      zoneId,
      recordId,
      deleted: true
    }), {
      headers: toHeaders3()
    });
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Falha ao remover registro DNS.";
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return toError(message, trace32, 502);
  }
}
__name(onRequestDelete2, "onRequestDelete2");
var toHeaders3;
var toError;
var init_delete = __esm({
  "api/cfdns/delete.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_admin_actor();
    init_request_trace();
    init_cloudflare_api();
    toHeaders3 = /* @__PURE__ */ __name2(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    toError = /* @__PURE__ */ __name2((message, trace32, status = 500) => new Response(JSON.stringify({
      ok: false,
      ...trace32,
      error: message
    }), {
      status,
      headers: toHeaders3()
    }), "toError");
    __name2(onRequestDelete2, "onRequestDelete");
  }
});
async function onRequestGet8(context22) {
  const trace32 = createResponseTrace(context22.request);
  const url = new URL(context22.request.url);
  const zoneId = String(url.searchParams.get("zoneId") ?? "").trim();
  const page = toPositiveInt2(url.searchParams.get("page"), 1);
  const perPage = toPositiveInt2(url.searchParams.get("perPage"), 100);
  const type = String(url.searchParams.get("type") ?? "").trim().toUpperCase();
  const search = String(url.searchParams.get("search") ?? "").trim().toLowerCase();
  if (!zoneId) {
    return toError2("Par\xE2metro zoneId \xE9 obrigat\xF3rio.", trace32, 400);
  }
  try {
    const payload = await listCloudflareDnsRecords(context22.env, zoneId, {
      page,
      perPage,
      type,
      search
    });
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
      ...trace32,
      zoneId,
      ...payload
    }), {
      headers: toHeaders4()
    });
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Falha ao carregar registros DNS da zona.";
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return toError2(message, trace32, 502);
  }
}
__name(onRequestGet8, "onRequestGet8");
var toHeaders4;
var toError2;
var toPositiveInt2;
var init_records = __esm({
  "api/cfdns/records.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_request_trace();
    init_cloudflare_api();
    toHeaders4 = /* @__PURE__ */ __name2(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    toError2 = /* @__PURE__ */ __name2((message, trace32, status = 500) => new Response(JSON.stringify({
      ok: false,
      ...trace32,
      error: message
    }), {
      status,
      headers: toHeaders4()
    }), "toError");
    toPositiveInt2 = /* @__PURE__ */ __name2((value, fallback) => {
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
      }
      return Math.trunc(parsed);
    }, "toPositiveInt");
    __name2(onRequestGet8, "onRequestGet");
  }
});
async function onRequestPost7(context22) {
  const trace32 = createResponseTrace(context22.request);
  try {
    const body = await context22.request.json();
    const zoneId = String(body.zoneId ?? "").trim();
    const recordId = String(body.recordId ?? "").trim();
    const record = normalizeRecord(body.record);
    const adminActor = resolveAdminActorFromRequest(context22.request, body);
    if (!zoneId) {
      return toError3("zoneId \xE9 obrigat\xF3rio.", trace32, 400);
    }
    if (!record.type || !record.name) {
      return toError3("Tipo e nome do registro s\xE3o obrigat\xF3rios.", trace32, 400);
    }
    const saved = recordId ? await updateCloudflareDnsRecord(context22.env, zoneId, recordId, record) : await createCloudflareDnsRecord(context22.env, zoneId, record);
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
      ...trace32,
      mode: recordId ? "update" : "create",
      zoneId,
      record: saved
    }), {
      headers: toHeaders5()
    });
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Falha ao salvar registro DNS.";
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return toError3(message, trace32, 502);
  }
}
__name(onRequestPost7, "onRequestPost7");
var toHeaders5;
var toError3;
var normalizeRecord;
var init_upsert = __esm({
  "api/cfdns/upsert.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_admin_actor();
    init_request_trace();
    init_cloudflare_api();
    toHeaders5 = /* @__PURE__ */ __name2(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    toError3 = /* @__PURE__ */ __name2((message, trace32, status = 500) => new Response(JSON.stringify({
      ok: false,
      ...trace32,
      error: message
    }), {
      status,
      headers: toHeaders5()
    }), "toError");
    normalizeRecord = /* @__PURE__ */ __name2((record) => ({
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
    __name2(onRequestPost7, "onRequestPost");
  }
});
async function onRequestGet9(context22) {
  const trace32 = createResponseTrace(context22.request);
  try {
    const zones = await listCloudflareZones(context22.env);
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
      ...trace32,
      fonte: "cloudflare-api",
      zones
    }), {
      headers: toHeaders6()
    });
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Falha ao carregar zonas DNS da Cloudflare.";
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return toError4(message, trace32, 502);
  }
}
__name(onRequestGet9, "onRequestGet9");
var toHeaders6;
var toError4;
var init_zones = __esm({
  "api/cfdns/zones.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_request_trace();
    init_cloudflare_api();
    toHeaders6 = /* @__PURE__ */ __name2(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    toError4 = /* @__PURE__ */ __name2((message, trace32, status = 500) => new Response(JSON.stringify({
      ok: false,
      ...trace32,
      error: message
    }), {
      status,
      headers: toHeaders6()
    }), "toError");
    __name2(onRequestGet9, "onRequestGet");
  }
});
var resolveToken2;
var parseJsonOrThrow2;
var toFirstError2;
var cloudflareRequest2;
var validateCloudflareApiPath;
var parseJsonSafe;
var normalizeAccount;
var listCloudflareAccounts;
var resolveCloudflarePwAccount;
var listCloudflareWorkers;
var getCloudflareWorker;
var listCloudflareWorkerDeployments;
var deleteCloudflareWorker;
var listCloudflarePagesProjects;
var getCloudflarePagesProject;
var listCloudflarePagesDeployments;
var deleteCloudflarePagesProject;
var deleteCloudflarePagesDeployment;
var getCloudflareWorkerSchedules;
var updateCloudflareWorkerSchedules;
var getCloudflareWorkerUsageModel;
var updateCloudflareWorkerUsageModel;
var listCloudflareWorkerSecrets;
var addCloudflareWorkerSecret;
var deleteCloudflareWorkerSecret;
var listCloudflarePagesDomains;
var addCloudflarePagesDomain;
var deleteCloudflarePagesDomain;
var retryCloudflarePagesDeployment;
var rollbackCloudflarePagesDeployment;
var getCloudflarePagesDeploymentLogs;
var createCloudflareWorkerFromTemplate;
var createCloudflarePagesProject;
var updateCloudflarePagesProjectSettings;
var listCloudflareWorkerVersions;
var deployCloudflareWorkerVersion;
var listCloudflareWorkerRoutes;
var addCloudflareWorkerRoute;
var deleteCloudflareWorkerRoute;
var runCloudflareRawRequest;
var init_cfpw_api = __esm({
  "api/_lib/cfpw-api.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    resolveToken2 = /* @__PURE__ */ __name2((env22) => {
      const byPwToken = env22.CLOUDFLARE_PW?.trim();
      if (byPwToken) {
        return byPwToken;
      }
      const byApiToken = env22.CLOUDFLARE_API_TOKEN?.trim();
      if (byApiToken) {
        return byApiToken;
      }
      const byCfToken = env22.CF_API_TOKEN?.trim();
      if (byCfToken) {
        return byCfToken;
      }
      return "";
    }, "resolveToken");
    parseJsonOrThrow2 = /* @__PURE__ */ __name2((rawText, fallback, response) => {
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
    toFirstError2 = /* @__PURE__ */ __name2((payload) => {
      const firstError = Array.isArray(payload.errors) && payload.errors.length > 0 ? payload.errors[0] : null;
      return firstError?.message?.trim() || null;
    }, "toFirstError");
    cloudflareRequest2 = /* @__PURE__ */ __name2(async (env22, path, fallback, init) => {
      const token = resolveToken2(env22);
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
    validateCloudflareApiPath = /* @__PURE__ */ __name2((path) => {
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
    parseJsonSafe = /* @__PURE__ */ __name2((value, fieldName) => {
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
    normalizeAccount = /* @__PURE__ */ __name2((account) => ({
      id: String(account.id ?? "").trim(),
      name: String(account.name ?? "").trim()
    }), "normalizeAccount");
    listCloudflareAccounts = /* @__PURE__ */ __name2(async (env22) => {
      const accounts = await cloudflareRequest2(
        env22,
        "/accounts?page=1&per_page=50",
        "Falha ao carregar contas da Cloudflare"
      );
      return (Array.isArray(accounts) ? accounts : []).map(normalizeAccount).filter((account) => account.id);
    }, "listCloudflareAccounts");
    resolveCloudflarePwAccount = /* @__PURE__ */ __name2(async (env22) => {
      const byEnv = String(env22.CF_ACCOUNT_ID ?? "").trim();
      if (byEnv) {
        return {
          accountId: byEnv,
          accountName: null,
          source: "CF_ACCOUNT_ID",
          accounts: []
        };
      }
      const accounts = await listCloudflareAccounts(env22);
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
    listCloudflareWorkers = /* @__PURE__ */ __name2(async (env22, accountId) => {
      const normalizedAccountId = accountId.trim();
      if (!normalizedAccountId) {
        throw new Error("Account ID \xE9 obrigat\xF3rio para listar Workers.");
      }
      const workers = await cloudflareRequest2(
        env22,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts`,
        "Falha ao listar Workers"
      );
      return Array.isArray(workers) ? workers : [];
    }, "listCloudflareWorkers");
    getCloudflareWorker = /* @__PURE__ */ __name2(async (env22, accountId, scriptName) => {
      const normalizedAccountId = accountId.trim();
      const normalizedScript = scriptName.trim();
      if (!normalizedAccountId || !normalizedScript) {
        throw new Error("Account ID e scriptName s\xE3o obrigat\xF3rios para ler Worker.");
      }
      const worker = await cloudflareRequest2(
        env22,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/settings`,
        `Falha ao ler Worker ${normalizedScript}`
      );
      return worker;
    }, "getCloudflareWorker");
    listCloudflareWorkerDeployments = /* @__PURE__ */ __name2(async (env22, accountId, scriptName) => {
      const normalizedAccountId = accountId.trim();
      const normalizedScript = scriptName.trim();
      if (!normalizedAccountId || !normalizedScript) {
        throw new Error("Account ID e scriptName s\xE3o obrigat\xF3rios para listar deployments de Worker.");
      }
      const deployments = await cloudflareRequest2(
        env22,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/deployments`,
        `Falha ao listar deployments do Worker ${normalizedScript}`
      );
      return Array.isArray(deployments) ? deployments : [];
    }, "listCloudflareWorkerDeployments");
    deleteCloudflareWorker = /* @__PURE__ */ __name2(async (env22, accountId, scriptName) => {
      const normalizedAccountId = accountId.trim();
      const normalizedScript = scriptName.trim();
      if (!normalizedAccountId || !normalizedScript) {
        throw new Error("Account ID e scriptName s\xE3o obrigat\xF3rios para remover Worker.");
      }
      await cloudflareRequest2(
        env22,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}`,
        `Falha ao remover Worker ${normalizedScript}`,
        {
          method: "DELETE"
        }
      );
    }, "deleteCloudflareWorker");
    listCloudflarePagesProjects = /* @__PURE__ */ __name2(async (env22, accountId) => {
      const normalizedAccountId = accountId.trim();
      if (!normalizedAccountId) {
        throw new Error("Account ID \xE9 obrigat\xF3rio para listar Pages.");
      }
      const projects = await cloudflareRequest2(
        env22,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects`,
        "Falha ao listar projetos Pages"
      );
      return Array.isArray(projects) ? projects : [];
    }, "listCloudflarePagesProjects");
    getCloudflarePagesProject = /* @__PURE__ */ __name2(async (env22, accountId, projectName) => {
      const normalizedAccountId = accountId.trim();
      const normalizedProject = projectName.trim();
      if (!normalizedAccountId || !normalizedProject) {
        throw new Error("Account ID e projectName s\xE3o obrigat\xF3rios para ler projeto Pages.");
      }
      const project = await cloudflareRequest2(
        env22,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}`,
        `Falha ao ler projeto Pages ${normalizedProject}`
      );
      return project;
    }, "getCloudflarePagesProject");
    listCloudflarePagesDeployments = /* @__PURE__ */ __name2(async (env22, accountId, projectName) => {
      const normalizedAccountId = accountId.trim();
      const normalizedProject = projectName.trim();
      if (!normalizedAccountId || !normalizedProject) {
        throw new Error("Account ID e projectName s\xE3o obrigat\xF3rios para listar deployments de Pages.");
      }
      const deployments = await cloudflareRequest2(
        env22,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}/deployments`,
        `Falha ao listar deployments de Pages ${normalizedProject}`
      );
      return Array.isArray(deployments) ? deployments : [];
    }, "listCloudflarePagesDeployments");
    deleteCloudflarePagesProject = /* @__PURE__ */ __name2(async (env22, accountId, projectName) => {
      const normalizedAccountId = accountId.trim();
      const normalizedProject = projectName.trim();
      if (!normalizedAccountId || !normalizedProject) {
        throw new Error("Account ID e projectName s\xE3o obrigat\xF3rios para remover projeto Pages.");
      }
      await cloudflareRequest2(
        env22,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}`,
        `Falha ao remover projeto Pages ${normalizedProject}`,
        {
          method: "DELETE"
        }
      );
    }, "deleteCloudflarePagesProject");
    deleteCloudflarePagesDeployment = /* @__PURE__ */ __name2(async (env22, accountId, projectName, deploymentId, force = false) => {
      const normalizedAccountId = accountId.trim();
      const normalizedProject = projectName.trim();
      const normalizedDeploymentId = deploymentId.trim();
      if (!normalizedAccountId || !normalizedProject || !normalizedDeploymentId) {
        throw new Error("Account ID, projectName e deploymentId s\xE3o obrigat\xF3rios para remover deployment de Pages.");
      }
      const queryString = force ? "?force=true" : "";
      await cloudflareRequest2(
        env22,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}/deployments/${encodeURIComponent(normalizedDeploymentId)}${queryString}`,
        `Falha ao remover deployment ${normalizedDeploymentId} do projeto ${normalizedProject}`,
        {
          method: "DELETE"
        }
      );
    }, "deleteCloudflarePagesDeployment");
    getCloudflareWorkerSchedules = /* @__PURE__ */ __name2(async (env22, accountId, scriptName) => {
      const normalizedAccountId = accountId.trim();
      const normalizedScript = scriptName.trim();
      if (!normalizedAccountId || !normalizedScript) {
        throw new Error("Account ID e scriptName s\xE3o obrigat\xF3rios para ler cron triggers do Worker.");
      }
      const schedules = await cloudflareRequest2(
        env22,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/schedules`,
        `Falha ao ler cron triggers do Worker ${normalizedScript}`
      );
      return Array.isArray(schedules) ? schedules : [];
    }, "getCloudflareWorkerSchedules");
    updateCloudflareWorkerSchedules = /* @__PURE__ */ __name2(async (env22, accountId, scriptName, schedules) => {
      const normalizedAccountId = accountId.trim();
      const normalizedScript = scriptName.trim();
      if (!normalizedAccountId || !normalizedScript) {
        throw new Error("Account ID e scriptName s\xE3o obrigat\xF3rios para atualizar cron triggers do Worker.");
      }
      return cloudflareRequest2(
        env22,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/schedules`,
        `Falha ao atualizar cron triggers do Worker ${normalizedScript}`,
        {
          method: "PUT",
          body: JSON.stringify(schedules)
        }
      );
    }, "updateCloudflareWorkerSchedules");
    getCloudflareWorkerUsageModel = /* @__PURE__ */ __name2(async (env22, accountId, scriptName) => {
      const normalizedAccountId = accountId.trim();
      const normalizedScript = scriptName.trim();
      if (!normalizedAccountId || !normalizedScript) {
        throw new Error("Account ID e scriptName s\xE3o obrigat\xF3rios para ler usage model do Worker.");
      }
      return cloudflareRequest2(
        env22,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/usage-model`,
        `Falha ao ler usage model do Worker ${normalizedScript}`
      );
    }, "getCloudflareWorkerUsageModel");
    updateCloudflareWorkerUsageModel = /* @__PURE__ */ __name2(async (env22, accountId, scriptName, usageModel) => {
      const normalizedAccountId = accountId.trim();
      const normalizedScript = scriptName.trim();
      if (!normalizedAccountId || !normalizedScript) {
        throw new Error("Account ID e scriptName s\xE3o obrigat\xF3rios para atualizar usage model do Worker.");
      }
      return cloudflareRequest2(
        env22,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/usage-model`,
        `Falha ao atualizar usage model do Worker ${normalizedScript}`,
        {
          method: "PUT",
          body: JSON.stringify({ usage_model: usageModel.trim() })
        }
      );
    }, "updateCloudflareWorkerUsageModel");
    listCloudflareWorkerSecrets = /* @__PURE__ */ __name2(async (env22, accountId, scriptName) => {
      const normalizedAccountId = accountId.trim();
      const normalizedScript = scriptName.trim();
      if (!normalizedAccountId || !normalizedScript) {
        throw new Error("Account ID e scriptName s\xE3o obrigat\xF3rios para listar secrets do Worker.");
      }
      const secrets = await cloudflareRequest2(
        env22,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/secrets`,
        `Falha ao listar secrets do Worker ${normalizedScript}`
      );
      return Array.isArray(secrets) ? secrets : [];
    }, "listCloudflareWorkerSecrets");
    addCloudflareWorkerSecret = /* @__PURE__ */ __name2(async (env22, accountId, scriptName, name, text) => {
      const normalizedAccountId = accountId.trim();
      const normalizedScript = scriptName.trim();
      if (!normalizedAccountId || !normalizedScript) {
        throw new Error("Account ID e scriptName s\xE3o obrigat\xF3rios para adicionar secret do Worker.");
      }
      return cloudflareRequest2(
        env22,
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
    deleteCloudflareWorkerSecret = /* @__PURE__ */ __name2(async (env22, accountId, scriptName, secretName) => {
      const normalizedAccountId = accountId.trim();
      const normalizedScript = scriptName.trim();
      const normalizedSecret = secretName.trim();
      if (!normalizedAccountId || !normalizedScript || !normalizedSecret) {
        throw new Error("Account ID, scriptName e secretName s\xE3o obrigat\xF3rios para remover secret do Worker.");
      }
      return cloudflareRequest2(
        env22,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/secrets/${encodeURIComponent(normalizedSecret)}`,
        `Falha ao remover secret ${normalizedSecret} do Worker ${normalizedScript}`,
        {
          method: "DELETE"
        }
      );
    }, "deleteCloudflareWorkerSecret");
    listCloudflarePagesDomains = /* @__PURE__ */ __name2(async (env22, accountId, projectName) => {
      const normalizedAccountId = accountId.trim();
      const normalizedProject = projectName.trim();
      if (!normalizedAccountId || !normalizedProject) {
        throw new Error("Account ID e projectName s\xE3o obrigat\xF3rios para listar dom\xEDnios do Pages.");
      }
      const domains = await cloudflareRequest2(
        env22,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}/domains`,
        `Falha ao listar dom\xEDnios do projeto ${normalizedProject}`
      );
      return Array.isArray(domains) ? domains : [];
    }, "listCloudflarePagesDomains");
    addCloudflarePagesDomain = /* @__PURE__ */ __name2(async (env22, accountId, projectName, domainName) => {
      const normalizedAccountId = accountId.trim();
      const normalizedProject = projectName.trim();
      const normalizedDomain = domainName.trim();
      if (!normalizedAccountId || !normalizedProject || !normalizedDomain) {
        throw new Error("Account ID, projectName e domainName s\xE3o obrigat\xF3rios para adicionar dom\xEDnio no Pages.");
      }
      return cloudflareRequest2(
        env22,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}/domains`,
        `Falha ao adicionar dom\xEDnio no projeto ${normalizedProject}`,
        {
          method: "POST",
          body: JSON.stringify({ name: normalizedDomain })
        }
      );
    }, "addCloudflarePagesDomain");
    deleteCloudflarePagesDomain = /* @__PURE__ */ __name2(async (env22, accountId, projectName, domainName) => {
      const normalizedAccountId = accountId.trim();
      const normalizedProject = projectName.trim();
      const normalizedDomain = domainName.trim();
      if (!normalizedAccountId || !normalizedProject || !normalizedDomain) {
        throw new Error("Account ID, projectName e domainName s\xE3o obrigat\xF3rios para remover dom\xEDnio do Pages.");
      }
      return cloudflareRequest2(
        env22,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}/domains/${encodeURIComponent(normalizedDomain)}`,
        `Falha ao remover dom\xEDnio ${normalizedDomain} do projeto ${normalizedProject}`,
        {
          method: "DELETE"
        }
      );
    }, "deleteCloudflarePagesDomain");
    retryCloudflarePagesDeployment = /* @__PURE__ */ __name2(async (env22, accountId, projectName, deploymentId) => {
      const normalizedAccountId = accountId.trim();
      const normalizedProject = projectName.trim();
      const normalizedDeploymentId = deploymentId.trim();
      if (!normalizedAccountId || !normalizedProject || !normalizedDeploymentId) {
        throw new Error("Account ID, projectName e deploymentId s\xE3o obrigat\xF3rios para retry de deployment.");
      }
      return cloudflareRequest2(
        env22,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}/deployments/${encodeURIComponent(normalizedDeploymentId)}/retry`,
        `Falha ao executar retry do deployment ${normalizedDeploymentId}`,
        {
          method: "POST"
        }
      );
    }, "retryCloudflarePagesDeployment");
    rollbackCloudflarePagesDeployment = /* @__PURE__ */ __name2(async (env22, accountId, projectName, deploymentId) => {
      const normalizedAccountId = accountId.trim();
      const normalizedProject = projectName.trim();
      const normalizedDeploymentId = deploymentId.trim();
      if (!normalizedAccountId || !normalizedProject || !normalizedDeploymentId) {
        throw new Error("Account ID, projectName e deploymentId s\xE3o obrigat\xF3rios para rollback de deployment.");
      }
      return cloudflareRequest2(
        env22,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}/deployments/${encodeURIComponent(normalizedDeploymentId)}/rollback`,
        `Falha ao executar rollback do deployment ${normalizedDeploymentId}`,
        {
          method: "POST"
        }
      );
    }, "rollbackCloudflarePagesDeployment");
    getCloudflarePagesDeploymentLogs = /* @__PURE__ */ __name2(async (env22, accountId, projectName, deploymentId) => {
      const normalizedAccountId = accountId.trim();
      const normalizedProject = projectName.trim();
      const normalizedDeploymentId = deploymentId.trim();
      if (!normalizedAccountId || !normalizedProject || !normalizedDeploymentId) {
        throw new Error("Account ID, projectName e deploymentId s\xE3o obrigat\xF3rios para leitura de logs do deployment.");
      }
      return cloudflareRequest2(
        env22,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}/deployments/${encodeURIComponent(normalizedDeploymentId)}/history/logs`,
        `Falha ao ler logs do deployment ${normalizedDeploymentId}`
      );
    }, "getCloudflarePagesDeploymentLogs");
    createCloudflareWorkerFromTemplate = /* @__PURE__ */ __name2(async (env22, accountId, scriptName, templateCode, usageModel) => {
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
        env22,
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
    createCloudflarePagesProject = /* @__PURE__ */ __name2(async (env22, accountId, projectName, productionBranch) => {
      const normalizedAccountId = accountId.trim();
      const normalizedProject = projectName.trim();
      if (!normalizedAccountId || !normalizedProject) {
        throw new Error("Account ID e projectName s\xE3o obrigat\xF3rios para criar projeto Pages.");
      }
      const branch = productionBranch?.trim() || "main";
      return cloudflareRequest2(
        env22,
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
    updateCloudflarePagesProjectSettings = /* @__PURE__ */ __name2(async (env22, accountId, projectName, settings) => {
      const normalizedAccountId = accountId.trim();
      const normalizedProject = projectName.trim();
      if (!normalizedAccountId || !normalizedProject) {
        throw new Error("Account ID e projectName s\xE3o obrigat\xF3rios para atualizar settings do Pages.");
      }
      return cloudflareRequest2(
        env22,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/pages/projects/${encodeURIComponent(normalizedProject)}`,
        `Falha ao atualizar settings do projeto ${normalizedProject}`,
        {
          method: "PATCH",
          body: JSON.stringify(settings)
        }
      );
    }, "updateCloudflarePagesProjectSettings");
    listCloudflareWorkerVersions = /* @__PURE__ */ __name2(async (env22, accountId, scriptName) => {
      const normalizedAccountId = accountId.trim();
      const normalizedScript = scriptName.trim();
      if (!normalizedAccountId || !normalizedScript) {
        throw new Error("Account ID e scriptName s\xE3o obrigat\xF3rios para listar vers\xF5es do Worker.");
      }
      const versions22 = await cloudflareRequest2(
        env22,
        `/accounts/${encodeURIComponent(normalizedAccountId)}/workers/scripts/${encodeURIComponent(normalizedScript)}/versions`,
        `Falha ao listar vers\xF5es do Worker ${normalizedScript}`
      );
      return Array.isArray(versions22) ? versions22 : [];
    }, "listCloudflareWorkerVersions");
    deployCloudflareWorkerVersion = /* @__PURE__ */ __name2(async (env22, accountId, scriptName, versionId) => {
      const normalizedAccountId = accountId.trim();
      const normalizedScript = scriptName.trim();
      const normalizedVersion = versionId.trim();
      if (!normalizedAccountId || !normalizedScript || !normalizedVersion) {
        throw new Error("Account ID, scriptName e versionId s\xE3o obrigat\xF3rios para promover vers\xE3o do Worker.");
      }
      return cloudflareRequest2(
        env22,
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
    listCloudflareWorkerRoutes = /* @__PURE__ */ __name2(async (env22, zoneId) => {
      const normalizedZoneId = zoneId.trim();
      if (!normalizedZoneId) {
        throw new Error("zoneId \xE9 obrigat\xF3rio para listar rotas de Worker.");
      }
      const routes2 = await cloudflareRequest2(
        env22,
        `/zones/${encodeURIComponent(normalizedZoneId)}/workers/routes`,
        `Falha ao listar rotas de Worker da zona ${normalizedZoneId}`
      );
      return Array.isArray(routes2) ? routes2 : [];
    }, "listCloudflareWorkerRoutes");
    addCloudflareWorkerRoute = /* @__PURE__ */ __name2(async (env22, zoneId, pattern, scriptName) => {
      const normalizedZoneId = zoneId.trim();
      const normalizedPattern = pattern.trim();
      const normalizedScript = scriptName.trim();
      if (!normalizedZoneId || !normalizedPattern || !normalizedScript) {
        throw new Error("zoneId, pattern e scriptName s\xE3o obrigat\xF3rios para adicionar rota de Worker.");
      }
      return cloudflareRequest2(
        env22,
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
    deleteCloudflareWorkerRoute = /* @__PURE__ */ __name2(async (env22, zoneId, routeId) => {
      const normalizedZoneId = zoneId.trim();
      const normalizedRouteId = routeId.trim();
      if (!normalizedZoneId || !normalizedRouteId) {
        throw new Error("zoneId e routeId s\xE3o obrigat\xF3rios para remover rota de Worker.");
      }
      return cloudflareRequest2(
        env22,
        `/zones/${encodeURIComponent(normalizedZoneId)}/workers/routes/${encodeURIComponent(normalizedRouteId)}`,
        `Falha ao remover rota ${normalizedRouteId}`,
        {
          method: "DELETE"
        }
      );
    }, "deleteCloudflareWorkerRoute");
    runCloudflareRawRequest = /* @__PURE__ */ __name2(async (env22, method, path, bodyJson) => {
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
        env22,
        normalizedPath,
        `Falha na opera\xE7\xE3o raw ${normalizedMethod} ${normalizedPath}`,
        requestInit
      );
    }, "runCloudflareRawRequest");
  }
});
async function onRequestGet10(context22) {
  try {
    const { accountId } = await resolveCloudflarePwAccount(context22.env);
    const projects = await listCloudflarePagesProjects(context22.env, accountId);
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
          const deployments = await listCloudflarePagesDeployments(context22.env, accountId, projectName);
          const sorted = [...deployments].sort((a, b) => {
            const dateA = new Date(a.created_on ?? "").getTime() || 0;
            const dateB = new Date(b.created_on ?? "").getTime() || 0;
            return dateB - dateA;
          });
          const latest = sorted[0] ?? null;
          const obsolete = sorted.slice(1);
          totalDeployments += sorted.length;
          totalObsolete += obsolete.length;
          return {
            name: projectName,
            totalDeployments: sorted.length,
            latestDeployment: latest ? {
              id: String(latest.id ?? ""),
              created_on: String(latest.created_on ?? ""),
              environment: String(latest.environment ?? ""),
              url: String(latest.url ?? "")
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
__name(onRequestGet10, "onRequestGet10");
async function onRequestPost8(context22) {
  try {
    const body = await context22.request.json();
    const projectName = String(body.projectName ?? "").trim();
    const deploymentId = String(body.deploymentId ?? "").trim();
    if (!projectName || !deploymentId) {
      return jsonResponse2({ error: "projectName e deploymentId s\xE3o obrigat\xF3rios." }, 400);
    }
    const { accountId } = await resolveCloudflarePwAccount(context22.env);
    await deleteCloudflarePagesDeployment(context22.env, accountId, projectName, deploymentId);
    return jsonResponse2({
      ok: true,
      projectName,
      deploymentId,
      message: `Deployment ${deploymentId} removido com sucesso.`
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro desconhecido ao remover deployment.";
    return jsonResponse2({ error: message, ok: false }, 500);
  }
}
__name(onRequestPost8, "onRequestPost8");
var jsonResponse2;
var init_cleanup_deployments = __esm({
  "api/cfpw/cleanup-deployments.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_cfpw_api();
    jsonResponse2 = /* @__PURE__ */ __name2((body, status = 200) => new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" }
    }), "jsonResponse");
    __name2(onRequestGet10, "onRequestGet");
    __name2(onRequestPost8, "onRequestPost");
  }
});
async function onRequestPost9(context22) {
  const trace32 = createResponseTrace(context22.request);
  let payload;
  try {
    payload = await context22.request.json();
  } catch {
    return toError5("JSON inv\xE1lido no corpo da requisi\xE7\xE3o.", trace32, 400);
  }
  const projectName = toText(payload.projectName);
  const confirmation = toText(payload.confirmation);
  if (!projectName) {
    return toError5("Campo projectName \xE9 obrigat\xF3rio.", trace32, 400);
  }
  if (confirmation !== projectName) {
    return toError5(`Confirma\xE7\xE3o inv\xE1lida. Digite exatamente o nome do projeto (${projectName}).`, trace32, 400);
  }
  try {
    const accountInfo = await resolveCloudflarePwAccount(context22.env);
    await deleteCloudflarePagesProject(context22.env, accountInfo.accountId, projectName);
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
      ...trace32,
      message: `Projeto Pages ${projectName} removido com sucesso.`
    }), {
      headers: toHeaders7()
    });
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : `Falha ao remover projeto ${projectName}.`;
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return toError5(message, trace32, 502);
  }
}
__name(onRequestPost9, "onRequestPost9");
var toHeaders7;
var toError5;
var toText;
var init_delete_page = __esm({
  "api/cfpw/delete-page.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_request_trace();
    init_cfpw_api();
    toHeaders7 = /* @__PURE__ */ __name2(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    toError5 = /* @__PURE__ */ __name2((message, trace32, status = 500) => new Response(JSON.stringify({
      ok: false,
      ...trace32,
      error: message
    }), {
      status,
      headers: toHeaders7()
    }), "toError");
    toText = /* @__PURE__ */ __name2((value) => String(value ?? "").trim(), "toText");
    __name2(onRequestPost9, "onRequestPost");
  }
});
async function onRequestPost10(context22) {
  const trace32 = createResponseTrace(context22.request);
  let payload;
  try {
    payload = await context22.request.json();
  } catch {
    return toError6("JSON inv\xE1lido no corpo da requisi\xE7\xE3o.", trace32, 400);
  }
  const scriptName = toText2(payload.scriptName);
  const confirmation = toText2(payload.confirmation);
  if (!scriptName) {
    return toError6("Campo scriptName \xE9 obrigat\xF3rio.", trace32, 400);
  }
  if (confirmation !== scriptName) {
    return toError6(`Confirma\xE7\xE3o inv\xE1lida. Digite exatamente o nome do Worker (${scriptName}).`, trace32, 400);
  }
  try {
    const accountInfo = await resolveCloudflarePwAccount(context22.env);
    await deleteCloudflareWorker(context22.env, accountInfo.accountId, scriptName);
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
      ...trace32,
      message: `Worker ${scriptName} removido com sucesso.`
    }), {
      headers: toHeaders8()
    });
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : `Falha ao remover Worker ${scriptName}.`;
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return toError6(message, trace32, 502);
  }
}
__name(onRequestPost10, "onRequestPost10");
var toHeaders8;
var toError6;
var toText2;
var init_delete_worker = __esm({
  "api/cfpw/delete-worker.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_request_trace();
    init_cfpw_api();
    toHeaders8 = /* @__PURE__ */ __name2(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    toError6 = /* @__PURE__ */ __name2((message, trace32, status = 500) => new Response(JSON.stringify({
      ok: false,
      ...trace32,
      error: message
    }), {
      status,
      headers: toHeaders8()
    }), "toError");
    toText2 = /* @__PURE__ */ __name2((value) => String(value ?? "").trim(), "toText");
    __name2(onRequestPost10, "onRequestPost");
  }
});
async function onRequestPost11(context22) {
  const trace32 = createResponseTrace(context22.request);
  let payload;
  try {
    payload = await context22.request.json();
  } catch {
    return toError7("JSON inv\xE1lido no corpo da requisi\xE7\xE3o.", trace32, 400);
  }
  const action = toText3(payload.action);
  if (!action) {
    return toError7("Campo action \xE9 obrigat\xF3rio.", trace32, 400);
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
    const accountInfo = await resolveCloudflarePwAccount(context22.env);
    let result = null;
    switch (action) {
      case "create-worker-from-template": {
        if (!scriptName) {
          return toError7("scriptName \xE9 obrigat\xF3rio para create-worker-from-template.", trace32, 400);
        }
        result = await createCloudflareWorkerFromTemplate(context22.env, accountInfo.accountId, scriptName, templateCode, usageModel);
        break;
      }
      case "get-worker-schedules": {
        if (!scriptName) {
          return toError7("scriptName \xE9 obrigat\xF3rio para get-worker-schedules.", trace32, 400);
        }
        result = await getCloudflareWorkerSchedules(context22.env, accountInfo.accountId, scriptName);
        break;
      }
      case "update-worker-schedules": {
        if (!scriptName) {
          return toError7("scriptName \xE9 obrigat\xF3rio para update-worker-schedules.", trace32, 400);
        }
        result = await updateCloudflareWorkerSchedules(context22.env, accountInfo.accountId, scriptName, schedules);
        break;
      }
      case "get-worker-usage-model": {
        if (!scriptName) {
          return toError7("scriptName \xE9 obrigat\xF3rio para get-worker-usage-model.", trace32, 400);
        }
        result = await getCloudflareWorkerUsageModel(context22.env, accountInfo.accountId, scriptName);
        break;
      }
      case "update-worker-usage-model": {
        if (!scriptName || !usageModel) {
          return toError7("scriptName e usageModel s\xE3o obrigat\xF3rios para update-worker-usage-model.", trace32, 400);
        }
        result = await updateCloudflareWorkerUsageModel(context22.env, accountInfo.accountId, scriptName, usageModel);
        break;
      }
      case "list-worker-secrets": {
        if (!scriptName) {
          return toError7("scriptName \xE9 obrigat\xF3rio para list-worker-secrets.", trace32, 400);
        }
        result = await listCloudflareWorkerSecrets(context22.env, accountInfo.accountId, scriptName);
        break;
      }
      case "add-worker-secret": {
        if (!scriptName || !secretName || !secretValue) {
          return toError7("scriptName, secretName e secretValue s\xE3o obrigat\xF3rios para add-worker-secret.", trace32, 400);
        }
        result = await addCloudflareWorkerSecret(context22.env, accountInfo.accountId, scriptName, secretName, secretValue);
        break;
      }
      case "delete-worker-secret": {
        if (!scriptName || !secretName) {
          return toError7("scriptName e secretName s\xE3o obrigat\xF3rios para delete-worker-secret.", trace32, 400);
        }
        result = await deleteCloudflareWorkerSecret(context22.env, accountInfo.accountId, scriptName, secretName);
        break;
      }
      case "create-page-project": {
        if (!projectName) {
          return toError7("projectName \xE9 obrigat\xF3rio para create-page-project.", trace32, 400);
        }
        result = await createCloudflarePagesProject(context22.env, accountInfo.accountId, projectName, projectBranch);
        break;
      }
      case "update-page-project-settings": {
        if (!projectName) {
          return toError7("projectName \xE9 obrigat\xF3rio para update-page-project-settings.", trace32, 400);
        }
        let parsedSettings = {};
        if (pageSettingsJson.trim()) {
          try {
            parsedSettings = JSON.parse(pageSettingsJson);
          } catch {
            return toError7("pageSettingsJson inv\xE1lido: informe JSON v\xE1lido para update-page-project-settings.", trace32, 400);
          }
        }
        result = await updateCloudflarePagesProjectSettings(context22.env, accountInfo.accountId, projectName, parsedSettings);
        break;
      }
      case "list-page-domains": {
        if (!projectName) {
          return toError7("projectName \xE9 obrigat\xF3rio para list-page-domains.", trace32, 400);
        }
        result = await listCloudflarePagesDomains(context22.env, accountInfo.accountId, projectName);
        break;
      }
      case "add-page-domain": {
        if (!projectName || !domainName) {
          return toError7("projectName e domainName s\xE3o obrigat\xF3rios para add-page-domain.", trace32, 400);
        }
        result = await addCloudflarePagesDomain(context22.env, accountInfo.accountId, projectName, domainName);
        break;
      }
      case "delete-page-domain": {
        if (!projectName || !domainName) {
          return toError7("projectName e domainName s\xE3o obrigat\xF3rios para delete-page-domain.", trace32, 400);
        }
        result = await deleteCloudflarePagesDomain(context22.env, accountInfo.accountId, projectName, domainName);
        break;
      }
      case "retry-page-deployment": {
        if (!projectName || !deploymentId) {
          return toError7("projectName e deploymentId s\xE3o obrigat\xF3rios para retry-page-deployment.", trace32, 400);
        }
        result = await retryCloudflarePagesDeployment(context22.env, accountInfo.accountId, projectName, deploymentId);
        break;
      }
      case "rollback-page-deployment": {
        if (!projectName || !deploymentId) {
          return toError7("projectName e deploymentId s\xE3o obrigat\xF3rios para rollback-page-deployment.", trace32, 400);
        }
        result = await rollbackCloudflarePagesDeployment(context22.env, accountInfo.accountId, projectName, deploymentId);
        break;
      }
      case "get-page-deployment-logs": {
        if (!projectName || !deploymentId) {
          return toError7("projectName e deploymentId s\xE3o obrigat\xF3rios para get-page-deployment-logs.", trace32, 400);
        }
        result = await getCloudflarePagesDeploymentLogs(context22.env, accountInfo.accountId, projectName, deploymentId);
        break;
      }
      case "list-worker-versions": {
        if (!scriptName) {
          return toError7("scriptName \xE9 obrigat\xF3rio para list-worker-versions.", trace32, 400);
        }
        result = await listCloudflareWorkerVersions(context22.env, accountInfo.accountId, scriptName);
        break;
      }
      case "deploy-worker-version": {
        if (!scriptName || !versionId) {
          return toError7("scriptName e versionId s\xE3o obrigat\xF3rios para deploy-worker-version.", trace32, 400);
        }
        result = await deployCloudflareWorkerVersion(context22.env, accountInfo.accountId, scriptName, versionId);
        break;
      }
      case "list-worker-routes": {
        if (!zoneId) {
          return toError7("zoneId \xE9 obrigat\xF3rio para list-worker-routes.", trace32, 400);
        }
        result = await listCloudflareWorkerRoutes(context22.env, zoneId);
        break;
      }
      case "add-worker-route": {
        if (!zoneId || !routePattern || !scriptName) {
          return toError7("zoneId, routePattern e scriptName s\xE3o obrigat\xF3rios para add-worker-route.", trace32, 400);
        }
        result = await addCloudflareWorkerRoute(context22.env, zoneId, routePattern, scriptName);
        break;
      }
      case "delete-worker-route": {
        if (!zoneId || !routeId) {
          return toError7("zoneId e routeId s\xE3o obrigat\xF3rios para delete-worker-route.", trace32, 400);
        }
        result = await deleteCloudflareWorkerRoute(context22.env, zoneId, routeId);
        break;
      }
      case "raw-cloudflare-request": {
        if (!rawMethod || !rawPath) {
          return toError7("rawMethod e rawPath s\xE3o obrigat\xF3rios para raw-cloudflare-request.", trace32, 400);
        }
        result = await runCloudflareRawRequest(context22.env, rawMethod, rawPath, rawBodyJson);
        break;
      }
      default:
        return toError7(`A\xE7\xE3o n\xE3o suportada: ${action}`, trace32, 400);
    }
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
      ...trace32,
      action,
      accountId: accountInfo.accountId,
      result
    }), {
      headers: toHeaders9()
    });
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : `Falha ao executar a\xE7\xE3o ${action}.`;
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return toError7(message, trace32, 502);
  }
}
__name(onRequestPost11, "onRequestPost11");
var toHeaders9;
var toError7;
var toText3;
var normalizeSchedules;
var init_ops = __esm({
  "api/cfpw/ops.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_request_trace();
    init_cfpw_api();
    toHeaders9 = /* @__PURE__ */ __name2(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    toError7 = /* @__PURE__ */ __name2((message, trace32, status = 500) => new Response(JSON.stringify({
      ok: false,
      ...trace32,
      error: message
    }), {
      status,
      headers: toHeaders9()
    }), "toError");
    toText3 = /* @__PURE__ */ __name2((value) => String(value ?? "").trim(), "toText");
    normalizeSchedules = /* @__PURE__ */ __name2((value) => {
      if (!Array.isArray(value)) {
        return [];
      }
      return value.map((item) => ({ cron: toText3(item?.cron) })).filter((item) => item.cron.length > 0);
    }, "normalizeSchedules");
    __name2(onRequestPost11, "onRequestPost");
  }
});
async function onRequestGet11(context22) {
  const trace32 = createResponseTrace(context22.request);
  try {
    const accountInfo = await resolveCloudflarePwAccount(context22.env);
    const [workersRaw, pagesRaw] = await Promise.all([
      listCloudflareWorkers(context22.env, accountInfo.accountId),
      listCloudflarePagesProjects(context22.env, accountInfo.accountId)
    ]);
    const workers = workersRaw.map(mapWorker);
    const pages = pagesRaw.map(mapProject);
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
      ...trace32,
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
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Falha ao carregar overview de Cloudflare Pages & Workers.";
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return toError8(message, trace32, 502);
  }
}
__name(onRequestGet11, "onRequestGet11");
var toHeaders10;
var toError8;
var mapWorker;
var mapProject;
var init_overview = __esm({
  "api/cfpw/overview.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_request_trace();
    init_cfpw_api();
    toHeaders10 = /* @__PURE__ */ __name2(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    toError8 = /* @__PURE__ */ __name2((message, trace32, status = 500) => new Response(JSON.stringify({
      ok: false,
      ...trace32,
      error: message
    }), {
      status,
      headers: toHeaders10()
    }), "toError");
    mapWorker = /* @__PURE__ */ __name2((worker) => {
      const scriptName = String(worker.id ?? "").trim();
      return {
        scriptName,
        handlers: Array.isArray(worker.handlers) ? worker.handlers : [],
        createdAt: String(worker.created_on ?? "").trim() || null,
        updatedAt: String(worker.modified_on ?? "").trim() || null,
        tag: String(worker.tag ?? "").trim() || null
      };
    }, "mapWorker");
    mapProject = /* @__PURE__ */ __name2((project) => {
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
    __name2(onRequestGet11, "onRequestGet");
  }
});
async function onRequestGet12(context22) {
  const trace32 = createResponseTrace(context22.request);
  const url = new URL(context22.request.url);
  const projectName = toProjectName(url.searchParams.get("projectName"));
  if (!projectName) {
    return toError9("Par\xE2metro projectName \xE9 obrigat\xF3rio.", trace32, 400);
  }
  try {
    const accountInfo = await resolveCloudflarePwAccount(context22.env);
    const [projectResult, deploymentsResult] = await Promise.allSettled([
      getCloudflarePagesProject(context22.env, accountInfo.accountId, projectName),
      listCloudflarePagesDeployments(context22.env, accountInfo.accountId, projectName)
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
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
      ...trace32,
      accountId: accountInfo.accountId,
      projectName,
      project,
      deployments,
      warnings
    }), {
      headers: toHeaders11()
    });
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : `Falha ao carregar detalhes do Pages ${projectName}.`;
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return toError9(message, trace32, 502);
  }
}
__name(onRequestGet12, "onRequestGet12");
var toHeaders11;
var toError9;
var toProjectName;
var init_page_details = __esm({
  "api/cfpw/page-details.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_request_trace();
    init_cfpw_api();
    toHeaders11 = /* @__PURE__ */ __name2(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    toError9 = /* @__PURE__ */ __name2((message, trace32, status = 500) => new Response(JSON.stringify({
      ok: false,
      ...trace32,
      error: message
    }), {
      status,
      headers: toHeaders11()
    }), "toError");
    toProjectName = /* @__PURE__ */ __name2((raw) => String(raw ?? "").trim(), "toProjectName");
    __name2(onRequestGet12, "onRequestGet");
  }
});
async function onRequestGet13(context22) {
  const trace32 = createResponseTrace(context22.request);
  const url = new URL(context22.request.url);
  const scriptName = toScriptName(url.searchParams.get("scriptName"));
  if (!scriptName) {
    return toError10("Par\xE2metro scriptName \xE9 obrigat\xF3rio.", trace32, 400);
  }
  try {
    const accountInfo = await resolveCloudflarePwAccount(context22.env);
    const [workerResult, deploymentsResult] = await Promise.allSettled([
      getCloudflareWorker(context22.env, accountInfo.accountId, scriptName),
      listCloudflareWorkerDeployments(context22.env, accountInfo.accountId, scriptName)
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
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
      ...trace32,
      accountId: accountInfo.accountId,
      scriptName,
      worker,
      deployments,
      warnings
    }), {
      headers: toHeaders12()
    });
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : `Falha ao carregar detalhes do Worker ${scriptName}.`;
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return toError10(message, trace32, 502);
  }
}
__name(onRequestGet13, "onRequestGet13");
var toHeaders12;
var toError10;
var toScriptName;
var init_worker_details = __esm({
  "api/cfpw/worker-details.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_request_trace();
    init_cfpw_api();
    toHeaders12 = /* @__PURE__ */ __name2(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    toError10 = /* @__PURE__ */ __name2((message, trace32, status = 500) => new Response(JSON.stringify({
      ok: false,
      ...trace32,
      error: message
    }), {
      status,
      headers: toHeaders12()
    }), "toError");
    toScriptName = /* @__PURE__ */ __name2((raw) => String(raw ?? "").trim(), "toScriptName");
    __name2(onRequestGet13, "onRequestGet");
  }
});
var onRequestDelete3;
var init_delete2 = __esm({
  "api/financeiro/delete.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    onRequestDelete3 = /* @__PURE__ */ __name2(async (context22) => {
      const db = context22.env.BIGDATA_DB;
      const url = new URL(context22.request.url);
      const id = url.searchParams.get("id");
      if (!id || !Number.isFinite(Number(id))) {
        return Response.json({ ok: false, error: "ID inv\xE1lido." }, { status: 400 });
      }
      try {
        const result = await db.prepare(
          "DELETE FROM mainsite_financial_logs WHERE id = ?"
        ).bind(Number(id)).run();
        if (!result.success) {
          return Response.json({ ok: false, error: "Falha ao excluir registro." }, { status: 500 });
        }
        return Response.json({ ok: true, deleted: Number(id) });
      } catch (err) {
        return Response.json(
          { ok: false, error: err instanceof Error ? err.message : "Erro interno ao excluir registro financeiro." },
          { status: 500 }
        );
      }
    }, "onRequestDelete");
  }
});
var normalizeSumupStatus;
var resolveSumupStatusFromSources;
var onRequestGet14;
var init_financeiro = __esm({
  "api/financeiro/financeiro.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    normalizeSumupStatus = /* @__PURE__ */ __name2((status) => {
      const s = String(status || "").trim().toUpperCase();
      if (!s) return "UNKNOWN";
      const map = {
        PAID: "SUCCESSFUL",
        APPROVED: "SUCCESSFUL",
        SUCCESSFUL: "SUCCESSFUL",
        PENDING: "PENDING",
        IN_PROCESS: "PENDING",
        PROCESSING: "PENDING",
        FAILED: "FAILED",
        FAILURE: "FAILED",
        EXPIRED: "EXPIRED",
        REFUNDED: "REFUNDED",
        PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
        CANCELED: "CANCELLED",
        CANCEL: "CANCELLED",
        CANCELLED: "CANCELLED",
        CHARGEBACK: "CHARGE_BACK",
        CHARGE_BACK: "CHARGE_BACK"
      };
      return map[s] || s;
    }, "normalizeSumupStatus");
    resolveSumupStatusFromSources = /* @__PURE__ */ __name2((rowStatus, rawPayload) => {
      let payloadStatus = null;
      try {
        const payload2 = rawPayload ? JSON.parse(rawPayload) : null;
        payloadStatus = payload2?.transactions?.[0]?.status || payload2?.transaction?.status || payload2?.status || null;
      } catch {
        payloadStatus = null;
      }
      const row = normalizeSumupStatus(rowStatus || "UNKNOWN");
      const payload = normalizeSumupStatus(payloadStatus || "UNKNOWN");
      const terminalPriority = ["PARTIALLY_REFUNDED", "REFUNDED", "CANCELLED", "CHARGE_BACK", "FAILED", "EXPIRED"];
      for (const st of terminalPriority) {
        if (row === st || payload === st) return st;
      }
      if (row === "SUCCESSFUL" || payload === "SUCCESSFUL") return "SUCCESSFUL";
      if (row === "PENDING" || payload === "PENDING") return "PENDING";
      return row !== "UNKNOWN" ? row : payload;
    }, "resolveSumupStatusFromSources");
    onRequestGet14 = /* @__PURE__ */ __name2(async (context22) => {
      const db = context22.env.BIGDATA_DB;
      const url = new URL(context22.request.url);
      const status = url.searchParams.get("status") || "";
      const method = url.searchParams.get("method") || "";
      const startDate = url.searchParams.get("start_date") || "";
      const limit = Math.min(500, Math.max(1, Number(url.searchParams.get("limit")) || 100));
      try {
        const conditions = [];
        const params = [];
        if (status) {
          conditions.push("LOWER(status) = LOWER(?)");
          params.push(status);
        }
        if (method) {
          conditions.push("LOWER(method) = LOWER(?)");
          params.push(method);
        }
        if (startDate) {
          conditions.push("created_at >= ?");
          params.push(startDate);
        }
        const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
        const [logsResult, totalRow, approvedRow, sumRow, distinctStatuses, distinctMethods] = await Promise.all([
          db.prepare(
            `SELECT id, payment_id, status, amount, method, payer_email, raw_payload, created_at
         FROM mainsite_financial_logs ${whereClause}
         ORDER BY created_at DESC LIMIT ?`
          ).bind(...params, limit).all(),
          db.prepare(
            `SELECT COUNT(1) AS total FROM mainsite_financial_logs ${whereClause}`
          ).bind(...params).first(),
          db.prepare(
            `SELECT COUNT(1) AS total FROM mainsite_financial_logs
         WHERE LOWER(status) IN ('approved', 'successful', 'paid')
         ${conditions.length > 0 ? `AND ${conditions.join(" AND ")}` : ""}`
          ).bind(...params).first(),
          db.prepare(
            `SELECT COALESCE(SUM(amount), 0) AS total_amount FROM mainsite_financial_logs ${whereClause}`
          ).bind(...params).first(),
          db.prepare(
            "SELECT DISTINCT LOWER(status) AS status FROM mainsite_financial_logs WHERE status IS NOT NULL ORDER BY status"
          ).all(),
          db.prepare(
            "SELECT DISTINCT LOWER(method) AS method FROM mainsite_financial_logs WHERE method IS NOT NULL ORDER BY method"
          ).all()
        ]);
        const normalizedLogs = (logsResult.results ?? []).map((log32) => {
          if (String(log32.method || "").trim().toLowerCase() !== "sumup_card") return log32;
          return {
            ...log32,
            status: resolveSumupStatusFromSources(log32.status, log32.raw_payload)
          };
        });
        return Response.json({
          ok: true,
          logs: normalizedLogs,
          totals: {
            count: Number(totalRow?.total ?? 0),
            approved: Number(approvedRow?.total ?? 0),
            totalAmount: Number(sumRow?.total_amount ?? 0)
          },
          filters: {
            statuses: (distinctStatuses.results ?? []).map((r) => r.status),
            methods: (distinctMethods.results ?? []).map((r) => r.method)
          }
        });
      } catch (err) {
        return Response.json(
          { ok: false, error: err instanceof Error ? err.message : "Erro interno ao consultar logs financeiros." },
          { status: 500 }
        );
      }
    }, "onRequestGet");
  }
});
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
    const platform22 = globalAny.navigator.userAgentData?.platform || globalAny.navigator.platform || "";
    cachedRuntimeInfo = {
      runtime: "browser",
      runtimeVersion: UNKNOWN,
      os: platform22 || UNKNOWN,
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
__name(getRuntimeInfo, "getRuntimeInfo");
function buildRuntimeHeaders() {
  const { runtime, runtimeVersion, os, arch: arch22 } = getRuntimeInfo();
  return {
    "X-Sumup-Api-Version": "1.0.0",
    "X-Sumup-Lang": "javascript",
    "X-Sumup-Package-Version": "0.1.2",
    "X-Sumup-Os": os,
    "X-Sumup-Arch": arch22,
    "X-Sumup-Runtime": runtime,
    "X-Sumup-Runtime-Version": runtimeVersion
  };
}
__name(buildRuntimeHeaders, "buildRuntimeHeaders");
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
__name(mergeParams, "mergeParams");
function isRetryableStatus(status) {
  return 408 === status || 409 === status || 429 === status || status >= 500;
}
__name(isRetryableStatus, "isRetryableStatus");
function isRetryableError(error32, signal) {
  if (signal?.aborted) return false;
  return error32 instanceof TypeError || isAbortError(error32);
}
__name(isRetryableError, "isRetryableError");
function isAbortError(error32) {
  return error32 instanceof DOMException ? "AbortError" === error32.name : error32 instanceof Error && "AbortError" === error32.name;
}
__name(isAbortError, "isAbortError");
function withTimeoutSignal(signal, timeout) {
  if (!signal && void 0 === timeout) return {
    cleanup: /* @__PURE__ */ __name2(() => {
    }, "cleanup"),
    didTimeout: /* @__PURE__ */ __name2(() => false, "didTimeout"),
    signal: void 0
  };
  const controller = new AbortController();
  let timedOut = false;
  const onAbort = /* @__PURE__ */ __name2(() => {
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
    cleanup: /* @__PURE__ */ __name2(() => {
      if (void 0 !== timeoutId) clearTimeout(timeoutId);
      signal?.removeEventListener("abort", onAbort);
    }, "cleanup"),
    didTimeout: /* @__PURE__ */ __name2(() => timedOut, "didTimeout"),
    signal: controller.signal
  };
}
__name(withTimeoutSignal, "withTimeoutSignal");
var _computedKey;
var APIResource;
var SumUpError;
var APIError;
var APIPromise;
var UNKNOWN;
var normalizeArch;
var cachedRuntimeInfo;
var HTTPClient;
var Checkouts;
var Customers;
var Members;
var Memberships;
var Merchants;
var Payouts;
var Readers;
var Receipts;
var Roles;
var Subaccounts;
var Transactions;
var SumUp;
var src;
var dist_default;
var init_dist = __esm({
  "../node_modules/@sumup/sdk/dist/index.js"() {
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    APIResource = class {
      static {
        __name(this, "APIResource");
      }
      static {
        __name2(this, "APIResource");
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
      static {
        __name2(this, "SumUpError");
      }
    };
    APIError = class extends SumUpError {
      static {
        __name(this, "APIError");
      }
      static {
        __name2(this, "APIError");
      }
      status;
      error;
      response;
      constructor(status, error32, response) {
        const message = "string" == typeof error32 ? error32 : JSON.stringify(error32);
        super(`${status}: ${message}`);
        this.status = status;
        this.error = error32;
        this.response = response;
      }
    };
    _computedKey = Symbol.toStringTag;
    APIPromise = class {
      static {
        __name(this, "APIPromise");
      }
      static {
        __name2(this, "APIPromise");
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
    normalizeArch = /* @__PURE__ */ __name2((arch22) => {
      const lower = arch22.toLowerCase();
      if ("x64" === lower || "x86_64" === lower || "amd64" === lower) return "x86_64";
      if ("ia32" === lower || "x86" === lower || "x32" === lower) return "x86";
      if ("aarch64" === lower || "arm64" === lower) return "arm64";
      if ("arm" === lower) return "arm";
      return lower || UNKNOWN;
    }, "normalizeArch");
    __name2(getRuntimeInfo, "getRuntimeInfo");
    __name2(buildRuntimeHeaders, "buildRuntimeHeaders");
    HTTPClient = class {
      static {
        __name(this, "HTTPClient");
      }
      static {
        __name2(this, "HTTPClient");
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
          } catch (error32) {
            if (attempt < maxRetries && isRetryableError(error32, options.signal)) continue;
            if (didTimeout()) throw new SumUpError(`Request timed out after ${options.timeout}ms.`);
            throw error32;
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
    __name2(mergeParams, "mergeParams");
    __name2(isRetryableStatus, "isRetryableStatus");
    __name2(isRetryableError, "isRetryableError");
    __name2(isAbortError, "isAbortError");
    __name2(withTimeoutSignal, "withTimeoutSignal");
    Checkouts = class extends APIResource {
      static {
        __name(this, "Checkouts");
      }
      static {
        __name2(this, "Checkouts");
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
      static {
        __name2(this, "Customers");
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
      static {
        __name2(this, "Members");
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
      static {
        __name2(this, "Memberships");
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
      static {
        __name2(this, "Merchants");
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
      static {
        __name2(this, "Payouts");
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
      static {
        __name2(this, "Readers");
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
      static {
        __name2(this, "Receipts");
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
      static {
        __name2(this, "Roles");
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
      static {
        __name2(this, "Subaccounts");
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
      static {
        __name2(this, "Transactions");
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
      static {
        __name2(this, "SumUp");
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
var FINANCIAL_CUTOFF_BRT;
var FINANCIAL_CUTOFF_DATE;
var FINANCIAL_CUTOFF_UTC;
var FINANCIAL_CUTOFF_ISO;
var getStartIsoWithCutoff;
var isOnOrAfterCutoff;
var onRequestGet15;
var init_insights = __esm({
  "api/financeiro/insights.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_dist();
    FINANCIAL_CUTOFF_BRT = "2026-03-01T00:00:00-03:00";
    FINANCIAL_CUTOFF_DATE = "2026-03-01";
    FINANCIAL_CUTOFF_UTC = new Date(FINANCIAL_CUTOFF_BRT);
    FINANCIAL_CUTOFF_ISO = FINANCIAL_CUTOFF_UTC.toISOString();
    getStartIsoWithCutoff = /* @__PURE__ */ __name2((rawDate) => {
      if (!rawDate) return FINANCIAL_CUTOFF_ISO;
      const parsed = new Date(rawDate);
      if (Number.isNaN(parsed.getTime())) return FINANCIAL_CUTOFF_ISO;
      return parsed.getTime() < FINANCIAL_CUTOFF_UTC.getTime() ? FINANCIAL_CUTOFF_ISO : parsed.toISOString();
    }, "getStartIsoWithCutoff");
    isOnOrAfterCutoff = /* @__PURE__ */ __name2((value) => {
      if (!value) return false;
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return false;
      return parsed.getTime() >= FINANCIAL_CUTOFF_UTC.getTime();
    }, "isOnOrAfterCutoff");
    onRequestGet15 = /* @__PURE__ */ __name2(async (context22) => {
      const url = new URL(context22.request.url);
      const provider = url.searchParams.get("provider") || "";
      const type = url.searchParams.get("type") || "";
      if (provider === "sumup") {
        const token = context22.env.SUMUP_API_KEY_PRIVATE;
        const merchantCode = context22.env.SUMUP_MERCHANT_CODE;
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
              cardType: tx?.card_type || null,
              timestamp: tx?.timestamp || null,
              user: tx?.user || null,
              refundedAmount: Number(tx?.refunded_amount || 0)
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
        const token = context22.env.MP_ACCESS_TOKEN;
        if (!token) return Response.json({ error: "MP_ACCESS_TOKEN ausente." }, { status: 503 });
        const mpHeaders = { Authorization: `Bearer ${token}` };
        const readMpError = /* @__PURE__ */ __name2(async (res, fallback) => {
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
              type: tx?.payment_type_id || "unknown",
              paymentType: tx?.payment_method_id || "unknown",
              cardType: tx?.card?.last_four_digits ? `****${tx.card.last_four_digits}` : null,
              timestamp: tx?.date_created || null,
              user: tx?.payer?.email || null,
              refundedAmount: Number(tx?.transaction_amount_refunded || 0)
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
var FINANCIAL_CUTOFF_DB_UTC;
var getStartDbWithCutoff;
var onRequestGet16;
var init_mp_balance = __esm({
  "api/financeiro/mp-balance.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    FINANCIAL_CUTOFF_DB_UTC = "2026-03-01 03:00:00";
    getStartDbWithCutoff = /* @__PURE__ */ __name2((rawDate) => {
      if (!rawDate) return FINANCIAL_CUTOFF_DB_UTC;
      return rawDate < "2026-03-01" ? FINANCIAL_CUTOFF_DB_UTC : rawDate;
    }, "getStartDbWithCutoff");
    onRequestGet16 = /* @__PURE__ */ __name2(async (context22) => {
      const db = context22.env.BIGDATA_DB;
      const url = new URL(context22.request.url);
      const startDb = getStartDbWithCutoff(url.searchParams.get("start_date"));
      try {
        const [available, unavailable] = await Promise.all([
          db.prepare(
            "SELECT COALESCE(SUM(amount), 0) as total FROM mainsite_financial_logs WHERE (method IS NULL OR method != 'sumup_card') AND datetime(created_at) >= datetime(?) AND lower(status) = 'approved'"
          ).bind(startDb).first(),
          db.prepare(
            "SELECT COALESCE(SUM(amount), 0) as total FROM mainsite_financial_logs WHERE (method IS NULL OR method != 'sumup_card') AND datetime(created_at) >= datetime(?) AND lower(status) IN ('pending', 'in_process')"
          ).bind(startDb).first()
        ]);
        return Response.json({
          available_balance: Number(available?.total ?? 0),
          unavailable_balance: Number(unavailable?.total ?? 0)
        });
      } catch {
        return Response.json({ available_balance: 0, unavailable_balance: 0 });
      }
    }, "onRequestGet");
  }
});
var require_mercadoPagoConfig = __commonJS({
  "../node_modules/mercadopago/dist/mercadoPagoConfig.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.MercadoPagoConfig = void 0;
    var MercadoPagoConfig4 = class {
      static {
        __name(this, "MercadoPagoConfig4");
      }
      static {
        __name2(this, "MercadoPagoConfig");
      }
      constructor(config22) {
        this.accessToken = config22.accessToken;
        this.options = config22.options;
      }
    };
    exports.MercadoPagoConfig = MercadoPagoConfig4;
  }
});
var node_fetch_exports = {};
__export(node_fetch_exports, {
  AbortController: /* @__PURE__ */ __name(() => AbortController2, "AbortController"),
  AbortError: /* @__PURE__ */ __name(() => AbortError, "AbortError"),
  FetchError: /* @__PURE__ */ __name(() => FetchError, "FetchError"),
  Headers: /* @__PURE__ */ __name(() => Headers2, "Headers"),
  Request: /* @__PURE__ */ __name(() => Request2, "Request"),
  Response: /* @__PURE__ */ __name(() => Response2, "Response"),
  default: /* @__PURE__ */ __name(() => node_fetch_default, "default"),
  fetch: /* @__PURE__ */ __name(() => fetch2, "fetch"),
  isRedirect: /* @__PURE__ */ __name(() => isRedirect, "isRedirect")
});
var fetch2;
var Headers2;
var Request2;
var Response2;
var AbortController2;
var FetchError;
var AbortError;
var redirectStatus;
var isRedirect;
var node_fetch_default;
var init_node_fetch = __esm({
  "../node_modules/unenv/dist/runtime/npm/node-fetch.mjs"() {
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    fetch2 = /* @__PURE__ */ __name2((...args) => globalThis.fetch(...args), "fetch");
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
    isRedirect = /* @__PURE__ */ __name2((code) => redirectStatus.has(code), "isRedirect");
    fetch2.Promise = globalThis.Promise;
    fetch2.isRedirect = isRedirect;
    node_fetch_default = fetch2;
  }
});
var require_node_fetch = __commonJS({
  "required-unenv-alias:node-fetch"(exports, module) {
    init_functionsRoutes_0_2367719624264596();
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
var require_config = __commonJS({
  "../node_modules/mercadopago/dist/utils/config/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.AppConfig = void 0;
    var AppConfig = class {
      static {
        __name(this, "AppConfig");
      }
      static {
        __name2(this, "AppConfig");
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
var require_rng = __commonJS({
  "../node_modules/uuid/dist/commonjs-browser/rng.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
    __name2(rng, "rng");
  }
});
var require_regex = __commonJS({
  "../node_modules/uuid/dist/commonjs-browser/regex.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
var require_validate = __commonJS({
  "../node_modules/uuid/dist/commonjs-browser/validate.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
    __name2(_interopRequireDefault, "_interopRequireDefault");
    function validate(uuid) {
      return typeof uuid === "string" && _regex.default.test(uuid);
    }
    __name(validate, "validate");
    __name2(validate, "validate");
    var _default = validate;
    exports.default = _default;
  }
});
var require_stringify = __commonJS({
  "../node_modules/uuid/dist/commonjs-browser/stringify.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
    __name2(_interopRequireDefault, "_interopRequireDefault");
    var byteToHex = [];
    for (let i = 0; i < 256; ++i) {
      byteToHex.push((i + 256).toString(16).slice(1));
    }
    function unsafeStringify(arr, offset = 0) {
      return byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]];
    }
    __name(unsafeStringify, "unsafeStringify");
    __name2(unsafeStringify, "unsafeStringify");
    function stringify(arr, offset = 0) {
      const uuid = unsafeStringify(arr, offset);
      if (!(0, _validate.default)(uuid)) {
        throw TypeError("Stringified UUID is invalid");
      }
      return uuid;
    }
    __name(stringify, "stringify");
    __name2(stringify, "stringify");
    var _default = stringify;
    exports.default = _default;
  }
});
var require_v1 = __commonJS({
  "../node_modules/uuid/dist/commonjs-browser/v1.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
    __name2(_interopRequireDefault, "_interopRequireDefault");
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
    __name2(v1, "v1");
    var _default = v1;
    exports.default = _default;
  }
});
var require_parse = __commonJS({
  "../node_modules/uuid/dist/commonjs-browser/parse.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
    __name2(_interopRequireDefault, "_interopRequireDefault");
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
    __name(parse2, "parse2");
    __name2(parse2, "parse");
    var _default = parse2;
    exports.default = _default;
  }
});
var require_v35 = __commonJS({
  "../node_modules/uuid/dist/commonjs-browser/v35.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
    __name2(_interopRequireDefault, "_interopRequireDefault");
    function stringToBytes(str) {
      str = unescape(encodeURIComponent(str));
      const bytes = [];
      for (let i = 0; i < str.length; ++i) {
        bytes.push(str.charCodeAt(i));
      }
      return bytes;
    }
    __name(stringToBytes, "stringToBytes");
    __name2(stringToBytes, "stringToBytes");
    var DNS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
    exports.DNS = DNS;
    var URL2 = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";
    exports.URL = URL2;
    function v35(name, version22, hashfunc) {
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
        bytes[6] = bytes[6] & 15 | version22;
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
      __name2(generateUUID, "generateUUID");
      try {
        generateUUID.name = name;
      } catch (err) {
      }
      generateUUID.DNS = DNS;
      generateUUID.URL = URL2;
      return generateUUID;
    }
    __name(v35, "v35");
    __name2(v35, "v35");
  }
});
var require_md5 = __commonJS({
  "../node_modules/uuid/dist/commonjs-browser/md5.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
    __name2(md5, "md5");
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
    __name2(md5ToHexEncodedArray, "md5ToHexEncodedArray");
    function getOutputLength(inputLength8) {
      return (inputLength8 + 64 >>> 9 << 4) + 14 + 1;
    }
    __name(getOutputLength, "getOutputLength");
    __name2(getOutputLength, "getOutputLength");
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
    __name2(wordsToMd5, "wordsToMd5");
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
    __name2(bytesToWords, "bytesToWords");
    function safeAdd(x, y) {
      const lsw = (x & 65535) + (y & 65535);
      const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
      return msw << 16 | lsw & 65535;
    }
    __name(safeAdd, "safeAdd");
    __name2(safeAdd, "safeAdd");
    function bitRotateLeft(num, cnt) {
      return num << cnt | num >>> 32 - cnt;
    }
    __name(bitRotateLeft, "bitRotateLeft");
    __name2(bitRotateLeft, "bitRotateLeft");
    function md5cmn(q, a, b, x, s, t) {
      return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
    }
    __name(md5cmn, "md5cmn");
    __name2(md5cmn, "md5cmn");
    function md5ff(a, b, c, d, x, s, t) {
      return md5cmn(b & c | ~b & d, a, b, x, s, t);
    }
    __name(md5ff, "md5ff");
    __name2(md5ff, "md5ff");
    function md5gg(a, b, c, d, x, s, t) {
      return md5cmn(b & d | c & ~d, a, b, x, s, t);
    }
    __name(md5gg, "md5gg");
    __name2(md5gg, "md5gg");
    function md5hh(a, b, c, d, x, s, t) {
      return md5cmn(b ^ c ^ d, a, b, x, s, t);
    }
    __name(md5hh, "md5hh");
    __name2(md5hh, "md5hh");
    function md5ii(a, b, c, d, x, s, t) {
      return md5cmn(c ^ (b | ~d), a, b, x, s, t);
    }
    __name(md5ii, "md5ii");
    __name2(md5ii, "md5ii");
    var _default = md5;
    exports.default = _default;
  }
});
var require_v3 = __commonJS({
  "../node_modules/uuid/dist/commonjs-browser/v3.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
    __name2(_interopRequireDefault, "_interopRequireDefault");
    var v3 = (0, _v.default)("v3", 48, _md.default);
    var _default = v3;
    exports.default = _default;
  }
});
var require_native = __commonJS({
  "../node_modules/uuid/dist/commonjs-browser/native.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
var require_v4 = __commonJS({
  "../node_modules/uuid/dist/commonjs-browser/v4.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
    __name2(_interopRequireDefault, "_interopRequireDefault");
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
    __name2(v4, "v4");
    var _default = v4;
    exports.default = _default;
  }
});
var require_sha1 = __commonJS({
  "../node_modules/uuid/dist/commonjs-browser/sha1.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
    __name2(f, "f");
    function ROTL(x, n) {
      return x << n | x >>> 32 - n;
    }
    __name(ROTL, "ROTL");
    __name2(ROTL, "ROTL");
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
    __name2(sha1, "sha1");
    var _default = sha1;
    exports.default = _default;
  }
});
var require_v5 = __commonJS({
  "../node_modules/uuid/dist/commonjs-browser/v5.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
    __name2(_interopRequireDefault, "_interopRequireDefault");
    var v5 = (0, _v.default)("v5", 80, _sha.default);
    var _default = v5;
    exports.default = _default;
  }
});
var require_nil = __commonJS({
  "../node_modules/uuid/dist/commonjs-browser/nil.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
var require_version = __commonJS({
  "../node_modules/uuid/dist/commonjs-browser/version.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
    __name2(_interopRequireDefault, "_interopRequireDefault");
    function version22(uuid) {
      if (!(0, _validate.default)(uuid)) {
        throw TypeError("Invalid UUID");
      }
      return parseInt(uuid.slice(14, 15), 16);
    }
    __name(version22, "version2");
    __name2(version22, "version");
    var _default = version22;
    exports.default = _default;
  }
});
var require_commonjs_browser = __commonJS({
  "../node_modules/uuid/dist/commonjs-browser/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    Object.defineProperty(exports, "NIL", {
      enumerable: true,
      get: /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function get() {
        return _nil.default;
      }, "get"), "get")
    });
    Object.defineProperty(exports, "parse", {
      enumerable: true,
      get: /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function get() {
        return _parse.default;
      }, "get"), "get")
    });
    Object.defineProperty(exports, "stringify", {
      enumerable: true,
      get: /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function get() {
        return _stringify.default;
      }, "get"), "get")
    });
    Object.defineProperty(exports, "v1", {
      enumerable: true,
      get: /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function get() {
        return _v.default;
      }, "get"), "get")
    });
    Object.defineProperty(exports, "v3", {
      enumerable: true,
      get: /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function get() {
        return _v2.default;
      }, "get"), "get")
    });
    Object.defineProperty(exports, "v4", {
      enumerable: true,
      get: /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function get() {
        return _v3.default;
      }, "get"), "get")
    });
    Object.defineProperty(exports, "v5", {
      enumerable: true,
      get: /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function get() {
        return _v4.default;
      }, "get"), "get")
    });
    Object.defineProperty(exports, "validate", {
      enumerable: true,
      get: /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function get() {
        return _validate.default;
      }, "get"), "get")
    });
    Object.defineProperty(exports, "version", {
      enumerable: true,
      get: /* @__PURE__ */ __name2(/* @__PURE__ */ __name(function get() {
        return _version.default;
      }, "get"), "get")
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
    __name2(_interopRequireDefault, "_interopRequireDefault");
  }
});
var require_restClient = __commonJS({
  "../node_modules/mercadopago/dist/utils/restClient/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
        __name(this, "_RestClient");
      }
      static {
        __name2(this, "RestClient");
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
        const execute = /* @__PURE__ */ __name2(async () => {
          try {
            return await fn();
          } catch (error32) {
            if (attempt >= retries || error32.status < 500) {
              throw error32;
            }
            const delayMs = config_1.AppConfig.BASE_DELAY_MS * 2 ** attempt;
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            attempt++;
            return execute();
          }
        }, "execute");
        return execute();
      }
      static async fetch(endpoint, config22) {
        const _a = config22 || {}, { timeout = config_1.AppConfig.DEFAULT_TIMEOUT, idempotencyKey = _RestClient.generateIdempotencyKey(), queryParams, method = "GET", retries = config_1.AppConfig.DEFAULT_RETRIES, corporationId, integratorId, platformId, meliSessionId, expandResponseNodes, cardValidation, testToken } = _a, customConfig = __rest(_a, ["timeout", "idempotencyKey", "queryParams", "method", "retries", "corporationId", "integratorId", "platformId", "meliSessionId", "expandResponseNodes", "cardValidation", "testToken"]);
        const url = _RestClient.appendQueryParamsToUrl(`${config_1.AppConfig.BASE_URL}${endpoint}`, queryParams);
        customConfig.headers = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, customConfig.headers), { [config_1.AppConfig.Headers.CONTENT_TYPE]: "application/json", [config_1.AppConfig.Headers.PRODUCT_ID]: config_1.AppConfig.PRODUCT_ID, [config_1.AppConfig.Headers.TRACKING_ID]: config_1.AppConfig.getTrackingId(), [config_1.AppConfig.Headers.USER_AGENT]: config_1.AppConfig.getUserAgent() }), corporationId ? { [config_1.AppConfig.Headers.CORPORATION_ID]: corporationId } : {}), integratorId ? { [config_1.AppConfig.Headers.INTEGRATOR_ID]: integratorId } : {}), platformId ? { [config_1.AppConfig.Headers.PLATFORM_ID]: platformId } : {}), meliSessionId ? { [config_1.AppConfig.Headers.MELI_SESSION_ID]: meliSessionId } : {}), expandResponseNodes ? { [config_1.AppConfig.Headers.EXPAND_RESPONDE_NODES]: expandResponseNodes } : {}), cardValidation ? { [config_1.AppConfig.Headers.CARD_VALIDATION]: cardValidation } : {}), testToken ? { [config_1.AppConfig.Headers.TEST_TOKEN]: testToken.toString() } : {});
        if (method && method !== "GET") {
          customConfig.headers = Object.assign(Object.assign({}, customConfig.headers), { [config_1.AppConfig.Headers.IDEMPOTENCY_KEY]: idempotencyKey });
        }
        let response;
        const fetchFn = /* @__PURE__ */ __name2(async () => {
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
var require_create = __commonJS({
  "../node_modules/mercadopago/dist/clients/cardToken/create/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = create;
    var restClient_1 = require_restClient();
    function create({ body, config: config22 }) {
      return restClient_1.RestClient.fetch("/v1/card_tokens", Object.assign({ headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      }, body: JSON.stringify(body), method: "POST" }, config22.options));
    }
    __name(create, "create");
    __name2(create, "create");
  }
});
var require_cardToken = __commonJS({
  "../node_modules/mercadopago/dist/clients/cardToken/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
      static {
        __name2(this, "CardToken");
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
var require_get = __commonJS({
  "../node_modules/mercadopago/dist/clients/customerCard/get/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = get;
    var restClient_1 = require_restClient();
    function get({ customerId, cardId, config: config22 }) {
      return restClient_1.RestClient.fetch(`/v1/customers/${customerId}/cards/${cardId}`, Object.assign({ headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      } }, config22.options));
    }
    __name(get, "get");
    __name2(get, "get");
  }
});
var require_create2 = __commonJS({
  "../node_modules/mercadopago/dist/clients/customerCard/create/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = create;
    var restClient_1 = require_restClient();
    function create({ customerId, body, config: config22 }) {
      return restClient_1.RestClient.fetch(`/v1/customers/${customerId}/cards`, Object.assign({ headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      }, body: JSON.stringify(body), method: "POST" }, config22.options));
    }
    __name(create, "create");
    __name2(create, "create");
  }
});
var require_remove = __commonJS({
  "../node_modules/mercadopago/dist/clients/customerCard/remove/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = remove;
    var restClient_1 = require_restClient();
    function remove({ customerId, cardId, config: config22 }) {
      return restClient_1.RestClient.fetch(`/v1/customers/${customerId}/cards/${cardId}`, Object.assign({ headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      }, method: "DELETE" }, config22.options));
    }
    __name(remove, "remove");
    __name2(remove, "remove");
  }
});
var require_update = __commonJS({
  "../node_modules/mercadopago/dist/clients/customerCard/update/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = update;
    var restClient_1 = require_restClient();
    function update({ customerId, cardId, body, config: config22 }) {
      return restClient_1.RestClient.fetch(`/v1/customers/${customerId}/cards/${cardId}`, Object.assign({ headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      }, body: JSON.stringify(body), method: "PUT" }, config22.options));
    }
    __name(update, "update");
    __name2(update, "update");
  }
});
var require_list = __commonJS({
  "../node_modules/mercadopago/dist/clients/customerCard/list/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = list;
    var restClient_1 = require_restClient();
    function list({ customerId, config: config22 }) {
      return restClient_1.RestClient.fetch(`/v1/customers/${customerId}/cards`, Object.assign({ headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      } }, config22.options));
    }
    __name(list, "list");
    __name2(list, "list");
  }
});
var require_customerCard = __commonJS({
  "../node_modules/mercadopago/dist/clients/customerCard/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
      static {
        __name2(this, "CustomerCard");
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
var require_get2 = __commonJS({
  "../node_modules/mercadopago/dist/clients/customer/get/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = get;
    var restClient_1 = require_restClient();
    function get({ customerId, config: config22 }) {
      return restClient_1.RestClient.fetch(`/v1/customers/${customerId}`, Object.assign({ headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      } }, config22.options));
    }
    __name(get, "get");
    __name2(get, "get");
  }
});
var require_create3 = __commonJS({
  "../node_modules/mercadopago/dist/clients/customer/create/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = create;
    var restClient_1 = require_restClient();
    function create({ body, config: config22 }) {
      return restClient_1.RestClient.fetch("/v1/customers", Object.assign({ headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      }, body: JSON.stringify(body), method: "POST" }, config22.options));
    }
    __name(create, "create");
    __name2(create, "create");
  }
});
var require_remove2 = __commonJS({
  "../node_modules/mercadopago/dist/clients/customer/remove/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = remove;
    var restClient_1 = require_restClient();
    function remove({ customerId, config: config22 }) {
      return restClient_1.RestClient.fetch(`/v1/customers/${customerId}`, Object.assign({ headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      }, method: "DELETE" }, config22.options));
    }
    __name(remove, "remove");
    __name2(remove, "remove");
  }
});
var require_update2 = __commonJS({
  "../node_modules/mercadopago/dist/clients/customer/update/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = update;
    var restClient_1 = require_restClient();
    function update({ customerId, body, config: config22 }) {
      return restClient_1.RestClient.fetch(`/v1/customers/${customerId}`, Object.assign({ headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      }, body: JSON.stringify(body), method: "PUT" }, config22.options));
    }
    __name(update, "update");
    __name2(update, "update");
  }
});
var require_search = __commonJS({
  "../node_modules/mercadopago/dist/clients/customer/search/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = search;
    var restClient_1 = require_restClient();
    function search({ options, config: config22 }) {
      return restClient_1.RestClient.fetch("/v1/customers/search", Object.assign({ headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      }, queryParams: Object.assign({}, options) }, config22.options));
    }
    __name(search, "search");
    __name2(search, "search");
  }
});
var require_customer = __commonJS({
  "../node_modules/mercadopago/dist/clients/customer/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
      static {
        __name2(this, "Customer");
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
var require_get3 = __commonJS({
  "../node_modules/mercadopago/dist/clients/invoice/get/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = get;
    var restClient_1 = require_restClient();
    function get({ id, config: config22 }) {
      return restClient_1.RestClient.fetch(`/authorized_payments/${id}`, Object.assign({ method: "GET", headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      } }, config22.options));
    }
    __name(get, "get");
    __name2(get, "get");
  }
});
var require_search2 = __commonJS({
  "../node_modules/mercadopago/dist/clients/invoice/search/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = search;
    var restClient_1 = require_restClient();
    function search({ options, config: config22 }) {
      return restClient_1.RestClient.fetch("/authorized_payments/search", Object.assign({ headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      }, queryParams: Object.assign({}, options) }, config22.options));
    }
    __name(search, "search");
    __name2(search, "search");
  }
});
var require_invoice = __commonJS({
  "../node_modules/mercadopago/dist/clients/invoice/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
      static {
        __name2(this, "Invoice");
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
var require_list2 = __commonJS({
  "../node_modules/mercadopago/dist/clients/identificationType/list/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = list;
    var restClient_1 = require_restClient();
    function list({ config: config22 }) {
      return restClient_1.RestClient.fetch("/v1/identification_types", Object.assign({ headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      } }, config22.options));
    }
    __name(list, "list");
    __name2(list, "list");
  }
});
var require_identificationType = __commonJS({
  "../node_modules/mercadopago/dist/clients/identificationType/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
      static {
        __name2(this, "IdentificationType");
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
var require_get4 = __commonJS({
  "../node_modules/mercadopago/dist/clients/paymentRefund/get/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = get;
    var restClient_1 = require_restClient();
    function get({ payment_id, refund_id, config: config22 }) {
      return restClient_1.RestClient.fetch(`/v1/payments/${payment_id}/refunds/${refund_id}`, Object.assign({ headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      } }, config22.options));
    }
    __name(get, "get");
    __name2(get, "get");
  }
});
var require_create4 = __commonJS({
  "../node_modules/mercadopago/dist/clients/paymentRefund/create/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = create;
    var restClient_1 = require_restClient();
    function create({ payment_id, body, config: config22 }) {
      return restClient_1.RestClient.fetch(`/v1/payments/${payment_id}/refunds`, Object.assign({ method: "POST", headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      }, body: JSON.stringify(body) }, config22.options));
    }
    __name(create, "create");
    __name2(create, "create");
  }
});
var require_list3 = __commonJS({
  "../node_modules/mercadopago/dist/clients/paymentRefund/list/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = list;
    var restClient_1 = require_restClient();
    function list({ payment_id, config: config22 }) {
      return restClient_1.RestClient.fetch(`/v1/payments/${payment_id}/refunds/`, Object.assign({ headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      } }, config22.options));
    }
    __name(list, "list");
    __name2(list, "list");
  }
});
var require_total = __commonJS({
  "../node_modules/mercadopago/dist/clients/paymentRefund/total/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = total;
    var restClient_1 = require_restClient();
    function total({ payment_id, config: config22 }) {
      return restClient_1.RestClient.fetch(`/v1/payments/${payment_id}/refunds`, Object.assign({ method: "POST", headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      }, body: JSON.stringify({}) }, config22.options));
    }
    __name(total, "total");
    __name2(total, "total");
  }
});
var require_paymentRefund = __commonJS({
  "../node_modules/mercadopago/dist/clients/paymentRefund/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
        __name(this, "PaymentRefund2");
      }
      static {
        __name2(this, "PaymentRefund");
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
var require_get5 = __commonJS({
  "../node_modules/mercadopago/dist/clients/paymentMethod/get/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = get;
    var restClient_1 = require_restClient();
    function get({ config: config22 }) {
      return restClient_1.RestClient.fetch("/v1/payment_methods", Object.assign({ headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      } }, config22.options));
    }
    __name(get, "get");
    __name2(get, "get");
  }
});
var require_paymentMethod = __commonJS({
  "../node_modules/mercadopago/dist/clients/paymentMethod/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
      static {
        __name2(this, "PaymentMethod");
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
var require_capture = __commonJS({
  "../node_modules/mercadopago/dist/clients/payment/capture/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = capture;
    var restClient_1 = require_restClient();
    function capture({ id, transaction_amount, config: config22 }) {
      const captureBody = {
        capture: true,
        transaction_amount
      };
      return restClient_1.RestClient.fetch(`/v1/payments/${id}`, Object.assign({ method: "PUT", headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      }, body: JSON.stringify(captureBody) }, config22.options));
    }
    __name(capture, "capture");
    __name2(capture, "capture");
  }
});
var require_search3 = __commonJS({
  "../node_modules/mercadopago/dist/clients/payment/search/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = search;
    var restClient_1 = require_restClient();
    function search({ options, config: config22 }) {
      return restClient_1.RestClient.fetch("/v1/payments/search", Object.assign({ headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      }, queryParams: Object.assign({}, options) }, config22.options));
    }
    __name(search, "search");
    __name2(search, "search");
  }
});
var require_cancel = __commonJS({
  "../node_modules/mercadopago/dist/clients/payment/cancel/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = cancel;
    var restClient_1 = require_restClient();
    function cancel({ id, config: config22 }) {
      const cancelBody = {
        status: "cancelled"
      };
      return restClient_1.RestClient.fetch(`/v1/payments/${id}`, Object.assign({ method: "PUT", headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      }, body: JSON.stringify(cancelBody) }, config22.options));
    }
    __name(cancel, "cancel");
    __name2(cancel, "cancel");
  }
});
var require_create5 = __commonJS({
  "../node_modules/mercadopago/dist/clients/payment/create/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = create;
    var restClient_1 = require_restClient();
    function create({ body, config: config22 }) {
      return restClient_1.RestClient.fetch("/v1/payments", Object.assign({ method: "POST", headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      }, body: JSON.stringify(body) }, config22.options));
    }
    __name(create, "create");
    __name2(create, "create");
  }
});
var require_get6 = __commonJS({
  "../node_modules/mercadopago/dist/clients/payment/get/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = get;
    var restClient_1 = require_restClient();
    function get({ id, config: config22 }) {
      return restClient_1.RestClient.fetch(`/v1/payments/${id}`, Object.assign({ headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      } }, config22.options));
    }
    __name(get, "get");
    __name2(get, "get");
  }
});
var require_payment = __commonJS({
  "../node_modules/mercadopago/dist/clients/payment/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
    var Payment3 = class {
      static {
        __name(this, "Payment3");
      }
      static {
        __name2(this, "Payment");
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
    exports.Payment = Payment3;
  }
});
var require_create6 = __commonJS({
  "../node_modules/mercadopago/dist/clients/preApproval/create/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = create;
    var restClient_1 = require_restClient();
    function create({ body, config: config22 }) {
      return restClient_1.RestClient.fetch("/preapproval/", Object.assign({ method: "POST", headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      }, body: JSON.stringify(body) }, config22.options));
    }
    __name(create, "create");
    __name2(create, "create");
  }
});
var require_get7 = __commonJS({
  "../node_modules/mercadopago/dist/clients/preApproval/get/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = get;
    var restClient_1 = require_restClient();
    function get({ id, config: config22 }) {
      return restClient_1.RestClient.fetch(`/preapproval/${id}`, Object.assign({ method: "GET", headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      } }, config22.options));
    }
    __name(get, "get");
    __name2(get, "get");
  }
});
var require_search4 = __commonJS({
  "../node_modules/mercadopago/dist/clients/preApproval/search/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = search;
    var restClient_1 = require_restClient();
    function search({ options, config: config22 }) {
      return restClient_1.RestClient.fetch("/preapproval/search", Object.assign({ headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      }, queryParams: Object.assign({}, options) }, config22.options));
    }
    __name(search, "search");
    __name2(search, "search");
  }
});
var require_update3 = __commonJS({
  "../node_modules/mercadopago/dist/clients/preApproval/update/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = update;
    var restClient_1 = require_restClient();
    function update({ id, body, config: config22 }) {
      return restClient_1.RestClient.fetch(`/preapproval/${id}`, Object.assign({ method: "PUT", headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      }, body: JSON.stringify(body) }, config22.options));
    }
    __name(update, "update");
    __name2(update, "update");
  }
});
var require_preApproval = __commonJS({
  "../node_modules/mercadopago/dist/clients/preApproval/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
      static {
        __name2(this, "PreApproval");
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
var require_get8 = __commonJS({
  "../node_modules/mercadopago/dist/clients/preApprovalPlan/get/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = get;
    var restClient_1 = require_restClient();
    function get({ id, config: config22 }) {
      return restClient_1.RestClient.fetch(`/preapproval_plan/${id}`, Object.assign({ headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      } }, config22.options));
    }
    __name(get, "get");
    __name2(get, "get");
  }
});
var require_create7 = __commonJS({
  "../node_modules/mercadopago/dist/clients/preApprovalPlan/create/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = create;
    var restClient_1 = require_restClient();
    function create({ body, config: config22 }) {
      return restClient_1.RestClient.fetch("/preapproval_plan/", Object.assign({ method: "POST", headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      }, body: JSON.stringify(body) }, config22.options));
    }
    __name(create, "create");
    __name2(create, "create");
  }
});
var require_update4 = __commonJS({
  "../node_modules/mercadopago/dist/clients/preApprovalPlan/update/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = update;
    var restClient_1 = require_restClient();
    function update({ id, updatePreApprovalPlanRequest, config: config22 }) {
      return restClient_1.RestClient.fetch(`/preapproval_plan/${id}`, Object.assign({ method: "PUT", headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      }, body: JSON.stringify(updatePreApprovalPlanRequest) }, config22.options));
    }
    __name(update, "update");
    __name2(update, "update");
  }
});
var require_search5 = __commonJS({
  "../node_modules/mercadopago/dist/clients/preApprovalPlan/search/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = search;
    var restClient_1 = require_restClient();
    function search({ options, config: config22 }) {
      return restClient_1.RestClient.fetch("/preapproval_plan/search", Object.assign({ headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      }, queryParams: Object.assign({}, options) }, config22.options));
    }
    __name(search, "search");
    __name2(search, "search");
  }
});
var require_preApprovalPlan = __commonJS({
  "../node_modules/mercadopago/dist/clients/preApprovalPlan/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
      static {
        __name2(this, "PreApprovalPlan");
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
var require_cancelPaymentIntent = __commonJS({
  "../node_modules/mercadopago/dist/clients/point/cancelPaymentIntent/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = cancelPaymentIntent;
    var restClient_1 = require_restClient();
    function cancelPaymentIntent({ device_id, payment_intent_id, config: config22 }) {
      return restClient_1.RestClient.fetch(`/point/integration-api/devices/${device_id}/payment-intents/${payment_intent_id}`, Object.assign({ method: "DELETE", headers: {
        Authorization: `Bearer ${config22.accessToken}`
      } }, config22.options));
    }
    __name(cancelPaymentIntent, "cancelPaymentIntent");
    __name2(cancelPaymentIntent, "cancelPaymentIntent");
  }
});
var require_changeDeviceOperatingMode = __commonJS({
  "../node_modules/mercadopago/dist/clients/point/changeDeviceOperatingMode/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = changeDeviceOperatingMode;
    var restClient_1 = require_restClient();
    function changeDeviceOperatingMode({ device_id, request, config: config22 }) {
      return restClient_1.RestClient.fetch(`/point/integration-api/devices/${device_id}`, Object.assign({ method: "PATCH", headers: {
        Authorization: `Bearer ${config22.accessToken}`
      }, body: JSON.stringify(request) }, config22.options));
    }
    __name(changeDeviceOperatingMode, "changeDeviceOperatingMode");
    __name2(changeDeviceOperatingMode, "changeDeviceOperatingMode");
  }
});
var require_createPaymentIntent = __commonJS({
  "../node_modules/mercadopago/dist/clients/point/createPaymentIntent/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = createPaymentIntent;
    var restClient_1 = require_restClient();
    function createPaymentIntent({ device_id, request, config: config22 }) {
      return restClient_1.RestClient.fetch(`/point/integration-api/devices/${device_id}/payment-intents`, Object.assign({ method: "POST", headers: {
        Authorization: `Bearer ${config22.accessToken}`
      }, body: JSON.stringify(request) }, config22.options));
    }
    __name(createPaymentIntent, "createPaymentIntent");
    __name2(createPaymentIntent, "createPaymentIntent");
  }
});
var require_getDevices = __commonJS({
  "../node_modules/mercadopago/dist/clients/point/getDevices/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = getDevices;
    var restClient_1 = require_restClient();
    function getDevices({ options, config: config22 }) {
      return restClient_1.RestClient.fetch("/point/integration-api/devices", Object.assign({ method: "GET", headers: {
        Authorization: `Bearer ${config22.accessToken}`
      }, queryParams: Object.assign({}, options) }, config22.options));
    }
    __name(getDevices, "getDevices");
    __name2(getDevices, "getDevices");
  }
});
var require_getPaymentIntentList = __commonJS({
  "../node_modules/mercadopago/dist/clients/point/getPaymentIntentList/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = getPaymentIntentList;
    var restClient_1 = require_restClient();
    function getPaymentIntentList({ options, config: config22 }) {
      return restClient_1.RestClient.fetch("/point/integration-api/payment-intents/events", Object.assign({ method: "GET", headers: {
        Authorization: `Bearer ${config22.accessToken}`
      }, queryParams: Object.assign({}, options) }, config22.options));
    }
    __name(getPaymentIntentList, "getPaymentIntentList");
    __name2(getPaymentIntentList, "getPaymentIntentList");
  }
});
var require_getPaymentIntentStatus = __commonJS({
  "../node_modules/mercadopago/dist/clients/point/getPaymentIntentStatus/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = getPaymentIntentStatus;
    var restClient_1 = require_restClient();
    function getPaymentIntentStatus({ payment_intent_id, config: config22 }) {
      return restClient_1.RestClient.fetch(`/point/integration-api/payment-intents/${payment_intent_id}/events`, Object.assign({ method: "GET", headers: {
        Authorization: `Bearer ${config22.accessToken}`
      } }, config22.options));
    }
    __name(getPaymentIntentStatus, "getPaymentIntentStatus");
    __name2(getPaymentIntentStatus, "getPaymentIntentStatus");
  }
});
var require_searchPaymentIntent = __commonJS({
  "../node_modules/mercadopago/dist/clients/point/searchPaymentIntent/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = searchPaymentIntent;
    var restClient_1 = require_restClient();
    function searchPaymentIntent({ payment_intent_id, config: config22 }) {
      return restClient_1.RestClient.fetch(`/point/integration-api/payment-intents/${payment_intent_id}`, Object.assign({ method: "GET", headers: {
        Authorization: `Bearer ${config22.accessToken}`
      } }, config22.options));
    }
    __name(searchPaymentIntent, "searchPaymentIntent");
    __name2(searchPaymentIntent, "searchPaymentIntent");
  }
});
var require_point = __commonJS({
  "../node_modules/mercadopago/dist/clients/point/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
      static {
        __name2(this, "Point");
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
var require_get9 = __commonJS({
  "../node_modules/mercadopago/dist/clients/preference/get/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = get;
    var restClient_1 = require_restClient();
    function get({ id, config: config22 }) {
      return restClient_1.RestClient.fetch(`/checkout/preferences/${id}`, Object.assign({ headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      } }, config22.options));
    }
    __name(get, "get");
    __name2(get, "get");
  }
});
var require_create8 = __commonJS({
  "../node_modules/mercadopago/dist/clients/preference/create/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = create;
    var restClient_1 = require_restClient();
    function create({ body, config: config22 }) {
      return restClient_1.RestClient.fetch("/checkout/preferences/", Object.assign({ method: "POST", headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      }, body: JSON.stringify(body) }, config22.options));
    }
    __name(create, "create");
    __name2(create, "create");
  }
});
var require_update5 = __commonJS({
  "../node_modules/mercadopago/dist/clients/preference/update/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = update;
    var restClient_1 = require_restClient();
    function update({ id, updatePreferenceRequest, config: config22 }) {
      return restClient_1.RestClient.fetch(`/checkout/preferences/${id}`, Object.assign({ method: "PUT", headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      }, body: JSON.stringify(updatePreferenceRequest) }, config22.options));
    }
    __name(update, "update");
    __name2(update, "update");
  }
});
var require_search6 = __commonJS({
  "../node_modules/mercadopago/dist/clients/preference/search/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = search;
    var restClient_1 = require_restClient();
    function search({ options, config: config22 }) {
      return restClient_1.RestClient.fetch("/checkout/preferences/search", Object.assign({ headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      }, queryParams: Object.assign({}, options) }, config22.options));
    }
    __name(search, "search");
    __name2(search, "search");
  }
});
var require_preference = __commonJS({
  "../node_modules/mercadopago/dist/clients/preference/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
      static {
        __name2(this, "Preference");
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
var require_create9 = __commonJS({
  "../node_modules/mercadopago/dist/clients/oAuth/create/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = create;
    var restClient_1 = require_restClient();
    function create({ body, config: config22 }) {
      const defaultRequest = Object.assign(Object.assign({}, body), { "grant_type": "authorization_code" });
      return restClient_1.RestClient.fetch("/oauth/token", Object.assign({ method: "POST", headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      }, body: JSON.stringify(defaultRequest) }, config22.options));
    }
    __name(create, "create");
    __name2(create, "create");
  }
});
var require_refresh = __commonJS({
  "../node_modules/mercadopago/dist/clients/oAuth/refresh/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = refresh;
    var restClient_1 = require_restClient();
    function refresh({ body, config: config22 }) {
      const defaultRequest = Object.assign(Object.assign({}, body), { "grant_type": "refresh_token" });
      return restClient_1.RestClient.fetch("/oauth/token", Object.assign({ method: "POST", headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      }, body: JSON.stringify(defaultRequest) }, config22.options));
    }
    __name(refresh, "refresh");
    __name2(refresh, "refresh");
  }
});
var require_getAuthorizationURL = __commonJS({
  "../node_modules/mercadopago/dist/clients/oAuth/getAuthorizationURL/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
    __name2(getAuthorizationURL, "getAuthorizationURL");
  }
});
var require_oAuth = __commonJS({
  "../node_modules/mercadopago/dist/clients/oAuth/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
      static {
        __name2(this, "OAuth");
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
var require_create10 = __commonJS({
  "../node_modules/mercadopago/dist/clients/merchantOrder/create/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = create;
    var restClient_1 = require_restClient();
    function create({ body, config: config22 }) {
      return restClient_1.RestClient.fetch("/merchant_orders", Object.assign({ headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      }, body: JSON.stringify(body), method: "POST" }, config22.options));
    }
    __name(create, "create");
    __name2(create, "create");
  }
});
var require_get10 = __commonJS({
  "../node_modules/mercadopago/dist/clients/merchantOrder/get/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = get;
    var restClient_1 = require_restClient();
    function get({ merchantOrderId, config: config22 }) {
      return restClient_1.RestClient.fetch(`/merchant_orders/${merchantOrderId}`, Object.assign({ headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      } }, config22.options));
    }
    __name(get, "get");
    __name2(get, "get");
  }
});
var require_update6 = __commonJS({
  "../node_modules/mercadopago/dist/clients/merchantOrder/update/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = update;
    var restClient_1 = require_restClient();
    function update({ merchantOrderId, body, config: config22 }) {
      return restClient_1.RestClient.fetch(`/merchant_orders/${merchantOrderId}`, Object.assign({ headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      }, body: JSON.stringify(body), method: "PUT" }, config22.options));
    }
    __name(update, "update");
    __name2(update, "update");
  }
});
var require_search7 = __commonJS({
  "../node_modules/mercadopago/dist/clients/merchantOrder/search/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = search;
    var restClient_1 = require_restClient();
    function search({ options, config: config22 }) {
      return restClient_1.RestClient.fetch("/merchant_orders/search", Object.assign({ headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      }, queryParams: Object.assign({}, options) }, config22.options));
    }
    __name(search, "search");
    __name2(search, "search");
  }
});
var require_merchantOrder = __commonJS({
  "../node_modules/mercadopago/dist/clients/merchantOrder/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
      static {
        __name2(this, "MerchantOrder");
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
var require_get11 = __commonJS({
  "../node_modules/mercadopago/dist/clients/user/get/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = get;
    var restClient_1 = require_restClient();
    function get({ config: config22 }) {
      return restClient_1.RestClient.fetch("/users/me", Object.assign({ headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      } }, config22.options));
    }
    __name(get, "get");
    __name2(get, "get");
  }
});
var require_user = __commonJS({
  "../node_modules/mercadopago/dist/clients/user/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
      static {
        __name2(this, "User");
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
var require_create11 = __commonJS({
  "../node_modules/mercadopago/dist/clients/order/create/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = create;
    var restClient_1 = require_restClient();
    function create({ body, config: config22 }) {
      return restClient_1.RestClient.fetch("/v1/orders", Object.assign({ method: "POST", headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      }, body: JSON.stringify(body) }, config22.options));
    }
    __name(create, "create");
    __name2(create, "create");
  }
});
var require_get12 = __commonJS({
  "../node_modules/mercadopago/dist/clients/order/get/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = get;
    var restClient_1 = require_restClient();
    function get({ id, config: config22 }) {
      return restClient_1.RestClient.fetch(`/v1/orders/${id}`, Object.assign({ method: "GET", headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      } }, config22.options));
    }
    __name(get, "get");
    __name2(get, "get");
  }
});
var require_process = __commonJS({
  "../node_modules/mercadopago/dist/clients/order/process/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = process2;
    var restClient_1 = require_restClient();
    function process2({ id, config: config22 }) {
      return restClient_1.RestClient.fetch(`/v1/orders/${id}/process`, Object.assign({ method: "POST", headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      } }, config22.options));
    }
    __name(process2, "process2");
    __name2(process2, "process");
  }
});
var require_capture2 = __commonJS({
  "../node_modules/mercadopago/dist/clients/order/capture/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = capture;
    var restClient_1 = require_restClient();
    function capture({ id, config: config22 }) {
      return restClient_1.RestClient.fetch(`/v1/orders/${id}/capture`, Object.assign({ method: "POST", headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      } }, config22.options));
    }
    __name(capture, "capture");
    __name2(capture, "capture");
  }
});
var require_cancel2 = __commonJS({
  "../node_modules/mercadopago/dist/clients/order/cancel/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = cancel;
    var restClient_1 = require_restClient();
    function cancel({ id, config: config22 }) {
      return restClient_1.RestClient.fetch(`/v1/orders/${id}/cancel`, Object.assign({ method: "POST", headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      } }, config22.options));
    }
    __name(cancel, "cancel");
    __name2(cancel, "cancel");
  }
});
var require_refund = __commonJS({
  "../node_modules/mercadopago/dist/clients/order/refund/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = refund;
    var restClient_1 = require_restClient();
    function refund({ id, body, config: config22 }) {
      return restClient_1.RestClient.fetch(`/v1/orders/${id}/refund`, Object.assign({ method: "POST", headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      }, body: JSON.stringify(body) }, config22.options));
    }
    __name(refund, "refund");
    __name2(refund, "refund");
  }
});
var require_create12 = __commonJS({
  "../node_modules/mercadopago/dist/clients/order/transaction/create/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = createTransaction;
    var restClient_1 = require_restClient();
    function createTransaction({ id, body, config: config22 }) {
      return restClient_1.RestClient.fetch(`/v1/orders/${id}/transactions`, Object.assign({ method: "POST", headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      }, body: JSON.stringify(body) }, config22.options));
    }
    __name(createTransaction, "createTransaction");
    __name2(createTransaction, "createTransaction");
  }
});
var require_update7 = __commonJS({
  "../node_modules/mercadopago/dist/clients/order/transaction/update/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = updateTransaction;
    var restClient_1 = require_restClient();
    function updateTransaction({ id, transactionId, body, config: config22 }) {
      return restClient_1.RestClient.fetch(`/v1/orders/${id}/transactions/${transactionId}`, Object.assign({ method: "PUT", headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      }, body: JSON.stringify(body) }, config22.options));
    }
    __name(updateTransaction, "updateTransaction");
    __name2(updateTransaction, "updateTransaction");
  }
});
var require_delete = __commonJS({
  "../node_modules/mercadopago/dist/clients/order/transaction/delete/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.default = deleteTransaction;
    var restClient_1 = require_restClient();
    function deleteTransaction({ id, transactionId, config: config22 }) {
      return restClient_1.RestClient.fetch(`/v1/orders/${id}/transactions/${transactionId}`, Object.assign({ method: "DELETE", headers: {
        "Authorization": `Bearer ${config22.accessToken}`
      } }, config22.options));
    }
    __name(deleteTransaction, "deleteTransaction");
    __name2(deleteTransaction, "deleteTransaction");
  }
});
var require_order = __commonJS({
  "../node_modules/mercadopago/dist/clients/order/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
      static {
        __name2(this, "Order");
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
var require_dist = __commonJS({
  "../node_modules/mercadopago/dist/index.js"(exports) {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Order = exports.User = exports.MerchantOrder = exports.OAuth = exports.Preference = exports.Point = exports.PreApprovalPlan = exports.PreApproval = exports.Payment = exports.PaymentMethod = exports.PaymentRefund = exports.IdentificationType = exports.Invoice = exports.Customer = exports.CustomerCard = exports.CardToken = exports.MercadoPagoConfig = void 0;
    var mercadoPagoConfig_1 = require_mercadoPagoConfig();
    Object.defineProperty(exports, "MercadoPagoConfig", { enumerable: true, get: /* @__PURE__ */ __name2(function() {
      return mercadoPagoConfig_1.MercadoPagoConfig;
    }, "get") });
    exports.default = mercadoPagoConfig_1.MercadoPagoConfig;
    var cardToken_1 = require_cardToken();
    Object.defineProperty(exports, "CardToken", { enumerable: true, get: /* @__PURE__ */ __name2(function() {
      return cardToken_1.CardToken;
    }, "get") });
    var customerCard_1 = require_customerCard();
    Object.defineProperty(exports, "CustomerCard", { enumerable: true, get: /* @__PURE__ */ __name2(function() {
      return customerCard_1.CustomerCard;
    }, "get") });
    var customer_1 = require_customer();
    Object.defineProperty(exports, "Customer", { enumerable: true, get: /* @__PURE__ */ __name2(function() {
      return customer_1.Customer;
    }, "get") });
    var invoice_1 = require_invoice();
    Object.defineProperty(exports, "Invoice", { enumerable: true, get: /* @__PURE__ */ __name2(function() {
      return invoice_1.Invoice;
    }, "get") });
    var identificationType_1 = require_identificationType();
    Object.defineProperty(exports, "IdentificationType", { enumerable: true, get: /* @__PURE__ */ __name2(function() {
      return identificationType_1.IdentificationType;
    }, "get") });
    var paymentRefund_1 = require_paymentRefund();
    Object.defineProperty(exports, "PaymentRefund", { enumerable: true, get: /* @__PURE__ */ __name2(function() {
      return paymentRefund_1.PaymentRefund;
    }, "get") });
    var paymentMethod_1 = require_paymentMethod();
    Object.defineProperty(exports, "PaymentMethod", { enumerable: true, get: /* @__PURE__ */ __name2(function() {
      return paymentMethod_1.PaymentMethod;
    }, "get") });
    var payment_1 = require_payment();
    Object.defineProperty(exports, "Payment", { enumerable: true, get: /* @__PURE__ */ __name2(function() {
      return payment_1.Payment;
    }, "get") });
    var preApproval_1 = require_preApproval();
    Object.defineProperty(exports, "PreApproval", { enumerable: true, get: /* @__PURE__ */ __name2(function() {
      return preApproval_1.PreApproval;
    }, "get") });
    var preApprovalPlan_1 = require_preApprovalPlan();
    Object.defineProperty(exports, "PreApprovalPlan", { enumerable: true, get: /* @__PURE__ */ __name2(function() {
      return preApprovalPlan_1.PreApprovalPlan;
    }, "get") });
    var point_1 = require_point();
    Object.defineProperty(exports, "Point", { enumerable: true, get: /* @__PURE__ */ __name2(function() {
      return point_1.Point;
    }, "get") });
    var preference_1 = require_preference();
    Object.defineProperty(exports, "Preference", { enumerable: true, get: /* @__PURE__ */ __name2(function() {
      return preference_1.Preference;
    }, "get") });
    var oAuth_1 = require_oAuth();
    Object.defineProperty(exports, "OAuth", { enumerable: true, get: /* @__PURE__ */ __name2(function() {
      return oAuth_1.OAuth;
    }, "get") });
    var merchantOrder_1 = require_merchantOrder();
    Object.defineProperty(exports, "MerchantOrder", { enumerable: true, get: /* @__PURE__ */ __name2(function() {
      return merchantOrder_1.MerchantOrder;
    }, "get") });
    var user_1 = require_user();
    Object.defineProperty(exports, "User", { enumerable: true, get: /* @__PURE__ */ __name2(function() {
      return user_1.User;
    }, "get") });
    var order_1 = require_order();
    Object.defineProperty(exports, "Order", { enumerable: true, get: /* @__PURE__ */ __name2(function() {
      return order_1.Order;
    }, "get") });
  }
});
var import_mercadopago;
var onRequestPost12;
var init_mp_cancel = __esm({
  "api/financeiro/mp-cancel.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    import_mercadopago = __toESM(require_dist(), 1);
    onRequestPost12 = /* @__PURE__ */ __name2(async (context22) => {
      const db = context22.env.BIGDATA_DB;
      const url = new URL(context22.request.url);
      const id = url.searchParams.get("id");
      if (!id) return Response.json({ error: "ID do pagamento ausente." }, { status: 400 });
      const token = context22.env.MP_ACCESS_TOKEN;
      if (!token) return Response.json({ error: "MP_ACCESS_TOKEN ausente." }, { status: 503 });
      try {
        const client = new import_mercadopago.MercadoPagoConfig({ accessToken: token });
        const paymentApi = new import_mercadopago.Payment(client);
        await paymentApi.cancel({ id });
        await db.prepare(
          "UPDATE mainsite_financial_logs SET status = 'cancelled' WHERE payment_id = ?"
        ).bind(id).run();
        return Response.json({ success: true });
      } catch (err) {
        return Response.json({ error: err instanceof Error ? err.message : "Falha ao cancelar." }, { status: 500 });
      }
    }, "onRequestPost");
  }
});
var import_mercadopago2;
var onRequestPost13;
var init_mp_refund = __esm({
  "api/financeiro/mp-refund.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    import_mercadopago2 = __toESM(require_dist(), 1);
    onRequestPost13 = /* @__PURE__ */ __name2(async (context22) => {
      const db = context22.env.BIGDATA_DB;
      const url = new URL(context22.request.url);
      const id = url.searchParams.get("id");
      if (!id) return Response.json({ error: "ID do pagamento ausente." }, { status: 400 });
      const token = context22.env.MP_ACCESS_TOKEN;
      if (!token) return Response.json({ error: "MP_ACCESS_TOKEN ausente." }, { status: 503 });
      try {
        const client = new import_mercadopago2.MercadoPagoConfig({ accessToken: token });
        const refundApi = new import_mercadopago2.PaymentRefund(client);
        const refundBody = { payment_id: id };
        try {
          const body = await context22.request.json();
          if (body.amount) refundBody.body = { amount: Number(body.amount) };
        } catch {
        }
        await refundApi.create(refundBody);
        const newStatus = refundBody.body?.amount ? "partially_refunded" : "refunded";
        await db.prepare(
          "UPDATE mainsite_financial_logs SET status = ? WHERE payment_id = ?"
        ).bind(newStatus, id).run();
        return Response.json({ success: true, status: newStatus });
      } catch (err) {
        return Response.json({ error: err instanceof Error ? err.message : "Falha no estorno." }, { status: 500 });
      }
    }, "onRequestPost");
  }
});
var import_mercadopago3;
var FINANCIAL_CUTOFF_BRT2;
var FINANCIAL_CUTOFF_UTC2;
var FINANCIAL_CUTOFF_ISO2;
var FINANCIAL_CUTOFF_DB_UTC2;
var onRequestPost14;
var init_mp_sync = __esm({
  "api/financeiro/mp-sync.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    import_mercadopago3 = __toESM(require_dist(), 1);
    FINANCIAL_CUTOFF_BRT2 = "2026-03-01T00:00:00-03:00";
    FINANCIAL_CUTOFF_UTC2 = new Date(FINANCIAL_CUTOFF_BRT2);
    FINANCIAL_CUTOFF_ISO2 = FINANCIAL_CUTOFF_UTC2.toISOString();
    FINANCIAL_CUTOFF_DB_UTC2 = FINANCIAL_CUTOFF_ISO2.slice(0, 19).replace("T", " ");
    onRequestPost14 = /* @__PURE__ */ __name2(async (context22) => {
      const db = context22.env.BIGDATA_DB;
      const token = context22.env.MP_ACCESS_TOKEN;
      if (!token) return Response.json({ error: "MP_ACCESS_TOKEN ausente." }, { status: 503 });
      try {
        const client = new import_mercadopago3.MercadoPagoConfig({ accessToken: token });
        const paymentApi = new import_mercadopago3.Payment(client);
        const { results: localLogs = [] } = await db.prepare(
          "SELECT payment_id FROM mainsite_financial_logs WHERE payment_id IS NOT NULL AND (method IS NULL OR method != 'sumup_card') AND datetime(created_at) >= datetime(?) ORDER BY created_at DESC LIMIT 100"
        ).bind(FINANCIAL_CUTOFF_DB_UTC2).all();
        let inserted = 0, updated = 0, tracked = 0;
        for (const log32 of localLogs) {
          const paymentId = String(log32.payment_id || "").trim();
          if (!paymentId) continue;
          try {
            const paymentData = await paymentApi.get({ id: paymentId });
            const status = (paymentData.status || "unknown").toLowerCase();
            const amount = Number(paymentData.transaction_amount || 0);
            const payer = paymentData.payer || {};
            const email = payer.email || "N/A";
            const method = paymentData.payment_method_id || "N/A";
            const raw = JSON.stringify(paymentData);
            await db.prepare(
              "UPDATE mainsite_financial_logs SET status = ?, amount = ?, method = ?, payer_email = ?, raw_payload = ? WHERE payment_id = ? AND (method IS NULL OR method != 'sumup_card')"
            ).bind(status, amount, method, email, raw, paymentId).run();
            tracked++;
            updated++;
          } catch {
          }
        }
        let scanned = localLogs.length;
        try {
          const payload = await paymentApi.search({
            options: {
              sort: "date_created",
              criteria: "desc",
              range: "date_created",
              begin_date: FINANCIAL_CUTOFF_ISO2,
              end_date: (/* @__PURE__ */ new Date()).toISOString(),
              limit: 100
            }
          });
          const payments = Array.isArray(payload.results) ? payload.results : [];
          scanned = payments.length;
          for (const paymentData of payments) {
            const paymentId = String(paymentData.id || "").trim();
            if (!paymentId) continue;
            const externalRef = String(paymentData.external_reference || "").trim();
            const description = String(paymentData.description || "").toLowerCase();
            const looksLikeSiteDonation = externalRef.startsWith("DON-") || description.includes("divaga\xE7\xF5es filos\xF3ficas") || description.includes("divagacoes filosoficas");
            if (!looksLikeSiteDonation) continue;
            const existing = await db.prepare(
              "SELECT id FROM mainsite_financial_logs WHERE payment_id = ? AND (method IS NULL OR method != 'sumup_card') LIMIT 1"
            ).bind(paymentId).first();
            if (existing) continue;
            const status = String(paymentData.status || "unknown").toLowerCase();
            const amount = Number(paymentData.transaction_amount || 0);
            const payer = paymentData.payer || {};
            const email = payer.email || "N/A";
            const method = paymentData.payment_method_id || "N/A";
            const raw = JSON.stringify(paymentData);
            await db.prepare(
              "INSERT INTO mainsite_financial_logs (payment_id, status, amount, method, payer_email, raw_payload) VALUES (?, ?, ?, ?, ?, ?)"
            ).bind(paymentId, status, amount, method, email, raw).run();
            inserted++;
          }
        } catch {
        }
        return Response.json({ success: true, inserted, updated, total: tracked + inserted, scanned });
      } catch (err) {
        return Response.json({ error: err instanceof Error ? err.message : "Falha ao sincronizar MP." }, { status: 500 });
      }
    }, "onRequestPost");
  }
});
var normalizeSumupStatus2;
var resolveSumupStatusFromSources2;
var normalizeMPStatus;
var onRequestPost15;
var init_reindex_gateways = __esm({
  "api/financeiro/reindex-gateways.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    normalizeSumupStatus2 = /* @__PURE__ */ __name2((status) => {
      const s = String(status || "").trim().toUpperCase();
      if (!s) return "UNKNOWN";
      const map = {
        PAID: "SUCCESSFUL",
        APPROVED: "SUCCESSFUL",
        SUCCESSFUL: "SUCCESSFUL",
        PENDING: "PENDING",
        IN_PROCESS: "PENDING",
        PROCESSING: "PENDING",
        FAILED: "FAILED",
        FAILURE: "FAILED",
        EXPIRED: "EXPIRED",
        REFUNDED: "REFUNDED",
        PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
        CANCELED: "CANCELLED",
        CANCEL: "CANCELLED",
        CANCELLED: "CANCELLED",
        CHARGEBACK: "CHARGE_BACK",
        CHARGE_BACK: "CHARGE_BACK"
      };
      return map[s] || s;
    }, "normalizeSumupStatus");
    resolveSumupStatusFromSources2 = /* @__PURE__ */ __name2((rowStatus, payloadStatus) => {
      const row = normalizeSumupStatus2(rowStatus || "UNKNOWN");
      const payload = normalizeSumupStatus2(payloadStatus || "UNKNOWN");
      const terminalPriority = ["PARTIALLY_REFUNDED", "REFUNDED", "CANCELLED", "CHARGE_BACK", "FAILED", "EXPIRED"];
      for (const status of terminalPriority) {
        if (row === status || payload === status) return status;
      }
      if (row === "SUCCESSFUL" || payload === "SUCCESSFUL") return "SUCCESSFUL";
      if (row === "PENDING" || payload === "PENDING") return "PENDING";
      return row !== "UNKNOWN" ? row : payload;
    }, "resolveSumupStatusFromSources");
    normalizeMPStatus = /* @__PURE__ */ __name2((status, statusDetail) => {
      const s = String(status || "").trim().toLowerCase();
      if (!s) return "unknown";
      const map = {
        approved: "approved",
        authorized: "approved",
        pending: "pending",
        in_process: "in_process",
        rejected: "rejected",
        refunded: "refunded",
        cancelled: "cancelled",
        canceled: "cancelled",
        charged_back: "charged_back",
        chargedback: "charged_back"
      };
      const canonical = map[s] || s;
      if (canonical === "approved" && statusDetail === "partially_refunded") return "approved";
      return canonical;
    }, "normalizeMPStatus");
    onRequestPost15 = /* @__PURE__ */ __name2(async (context22) => {
      const db = context22.env.BIGDATA_DB;
      try {
        let scanned = 0, updated = 0, offset = 0;
        const pageSize = 500;
        offset = 0;
        while (true) {
          const { results } = await db.prepare(
            "SELECT id, status, raw_payload FROM mainsite_financial_logs WHERE method = 'sumup_card' ORDER BY id ASC LIMIT ? OFFSET ?"
          ).bind(pageSize, offset).all();
          const rows = results ?? [];
          if (!rows.length) break;
          for (const row of rows) {
            scanned++;
            let payloadStatus = null;
            try {
              const payload = row.raw_payload ? JSON.parse(row.raw_payload) : null;
              payloadStatus = payload?.transactions?.[0]?.status || payload?.transaction?.status || payload?.status || null;
            } catch {
              payloadStatus = null;
            }
            const nextStatus = resolveSumupStatusFromSources2(row.status || "UNKNOWN", payloadStatus);
            if (nextStatus !== row.status) {
              await db.prepare(
                "UPDATE mainsite_financial_logs SET status = ? WHERE id = ? AND method = 'sumup_card'"
              ).bind(nextStatus, row.id).run();
              updated++;
            }
          }
          if (rows.length < pageSize) break;
          offset += pageSize;
        }
        offset = 0;
        while (true) {
          const { results } = await db.prepare(
            "SELECT id, status, raw_payload FROM mainsite_financial_logs WHERE method != 'sumup_card' ORDER BY id ASC LIMIT ? OFFSET ?"
          ).bind(pageSize, offset).all();
          const rows = results ?? [];
          if (!rows.length) break;
          for (const row of rows) {
            scanned++;
            let payloadStatus = null;
            let statusDetail;
            try {
              const payload = row.raw_payload ? JSON.parse(row.raw_payload) : null;
              payloadStatus = payload?.status || null;
              statusDetail = payload?.status_detail;
            } catch {
              payloadStatus = null;
            }
            const nextStatus = normalizeMPStatus(payloadStatus || row.status || "unknown", statusDetail);
            if (nextStatus !== row.status) {
              await db.prepare(
                "UPDATE mainsite_financial_logs SET status = ? WHERE id = ? AND method != 'sumup_card'"
              ).bind(nextStatus, row.id).run();
              updated++;
            }
          }
          if (rows.length < pageSize) break;
          offset += pageSize;
        }
        return Response.json({ success: true, scanned, updated });
      } catch (err) {
        return Response.json({ error: err instanceof Error ? err.message : "Falha ao reindexar status." }, { status: 500 });
      }
    }, "onRequestPost");
  }
});
var FINANCIAL_CUTOFF_DB_UTC3;
var getStartDbWithCutoff2;
var onRequestGet17;
var init_sumup_balance = __esm({
  "api/financeiro/sumup-balance.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    FINANCIAL_CUTOFF_DB_UTC3 = "2026-03-01 03:00:00";
    getStartDbWithCutoff2 = /* @__PURE__ */ __name2((rawDate) => {
      if (!rawDate) return FINANCIAL_CUTOFF_DB_UTC3;
      return rawDate < "2026-03-01" ? FINANCIAL_CUTOFF_DB_UTC3 : rawDate;
    }, "getStartDbWithCutoff");
    onRequestGet17 = /* @__PURE__ */ __name2(async (context22) => {
      const db = context22.env.BIGDATA_DB;
      const url = new URL(context22.request.url);
      const startDb = getStartDbWithCutoff2(url.searchParams.get("start_date"));
      try {
        const [available, unavailable] = await Promise.all([
          db.prepare(
            "SELECT COALESCE(SUM(amount), 0) as total FROM mainsite_financial_logs WHERE method = 'sumup_card' AND datetime(created_at) >= datetime(?) AND UPPER(status) IN ('SUCCESSFUL','PAID','APPROVED')"
          ).bind(startDb).first(),
          db.prepare(
            "SELECT COALESCE(SUM(amount), 0) as total FROM mainsite_financial_logs WHERE method = 'sumup_card' AND datetime(created_at) >= datetime(?) AND UPPER(status) IN ('PENDING','IN_PROCESS','PROCESSING')"
          ).bind(startDb).first()
        ]);
        return Response.json({
          available_balance: Number(available?.total ?? 0),
          unavailable_balance: Number(unavailable?.total ?? 0)
        });
      } catch {
        return Response.json({ available_balance: 0, unavailable_balance: 0 });
      }
    }, "onRequestGet");
  }
});
var updateSumupLogStatus;
var onRequestPost16;
var init_sumup_cancel = __esm({
  "api/financeiro/sumup-cancel.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_dist();
    updateSumupLogStatus = /* @__PURE__ */ __name2(async (db, checkoutId, transactionId, status, rawPayload) => {
      const payload = rawPayload ?? null;
      await db.prepare(
        "UPDATE mainsite_financial_logs SET payment_id = ?, status = ?, raw_payload = COALESCE(?, raw_payload) WHERE method = 'sumup_card' AND (payment_id = ? OR payment_id = ?)"
      ).bind(checkoutId, status, payload, checkoutId, transactionId).run();
    }, "updateSumupLogStatus");
    onRequestPost16 = /* @__PURE__ */ __name2(async (context22) => {
      const db = context22.env.BIGDATA_DB;
      const url = new URL(context22.request.url);
      const id = url.searchParams.get("id");
      if (!id) return Response.json({ success: false, error: "ID do pagamento ausente." }, { status: 400 });
      const token = context22.env.SUMUP_API_KEY_PRIVATE;
      if (!token) return Response.json({ success: false, error: "SUMUP_API_KEY_PRIVATE ausente." }, { status: 503 });
      try {
        const client = new dist_default({ apiKey: token });
        let transactionId = id;
        try {
          await client.checkouts.deactivate(id);
        } catch (apiErr) {
          let isConflict = false;
          let errMsg = apiErr instanceof Error ? apiErr.message : "Falha ao cancelar.";
          try {
            if (errMsg.includes("{")) {
              const jsonStr = errMsg.substring(errMsg.indexOf("{"));
              const parsed = JSON.parse(jsonStr);
              if (parsed?.message) errMsg = parsed.message;
              if (parsed?.detail) errMsg = parsed.detail;
              if (parsed?.error_code === "NOT FOUND") errMsg = "Checkout nao encontrado.";
              if (parsed?.error_code === "CONFLICT") {
                errMsg = "Este checkout nao pode ser cancelado no estado atual.";
                isConflict = true;
              }
            }
          } catch {
          }
          if (isConflict || apiErr instanceof Error && apiErr.message.includes("409")) {
            try {
              const checkRes = await fetch(`https://api.sumup.com/v0.1/checkouts/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              if (checkRes.ok) {
                const checkoutData = await checkRes.json();
                transactionId = checkoutData.transactions?.[0]?.id || transactionId;
                const txStatus = checkoutData.transactions?.[0]?.status;
                const rawStatus = String(txStatus || checkoutData.status || "UNKNOWN").toUpperCase();
                const realStatus = rawStatus === "PAID" ? "SUCCESSFUL" : rawStatus;
                if (checkoutData.status === "PAID" || realStatus === "SUCCESSFUL") {
                  await updateSumupLogStatus(db, id, transactionId, "SUCCESSFUL", JSON.stringify(checkoutData));
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
        await updateSumupLogStatus(db, id, transactionId, "CANCELLED");
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
var updateSumupLogStatus2;
var onRequestPost17;
var init_sumup_refund = __esm({
  "api/financeiro/sumup-refund.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_dist();
    updateSumupLogStatus2 = /* @__PURE__ */ __name2(async (db, checkoutId, transactionId, status) => {
      await db.prepare(
        "UPDATE mainsite_financial_logs SET payment_id = ?, status = ? WHERE method = 'sumup_card' AND (payment_id = ? OR payment_id = ?)"
      ).bind(checkoutId, status, checkoutId, transactionId).run();
    }, "updateSumupLogStatus");
    onRequestPost17 = /* @__PURE__ */ __name2(async (context22) => {
      const db = context22.env.BIGDATA_DB;
      const url = new URL(context22.request.url);
      const id = url.searchParams.get("id");
      if (!id) return Response.json({ success: false, error: "ID do pagamento ausente." }, { status: 400 });
      const token = context22.env.SUMUP_API_KEY_PRIVATE;
      if (!token) return Response.json({ success: false, error: "SUMUP_API_KEY_PRIVATE ausente." }, { status: 503 });
      try {
        let amount = null;
        try {
          const body = await context22.request.json();
          if (body?.amount) amount = Number(body.amount);
        } catch {
        }
        const client = new dist_default({ apiKey: token });
        const checkoutId = id;
        let txnId = id;
        try {
          const record = await db.prepare(
            "SELECT raw_payload FROM mainsite_financial_logs WHERE payment_id = ? AND method = 'sumup_card' LIMIT 1"
          ).bind(id).first();
          if (record?.raw_payload) {
            const payload = JSON.parse(record.raw_payload);
            const extracted = payload?.transactions?.[0]?.id || payload?.transaction_id;
            if (extracted) txnId = extracted;
          }
        } catch {
        }
        if (txnId === id) {
          try {
            const checkout = await client.checkouts.get(id);
            const extracted = checkout?.transactions?.[0]?.id;
            if (extracted) txnId = extracted;
          } catch {
          }
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
        const newStatus = amount ? "PARTIALLY_REFUNDED" : "REFUNDED";
        await updateSumupLogStatus2(db, checkoutId, txnId, newStatus);
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
var FINANCIAL_CUTOFF_BRT3;
var FINANCIAL_CUTOFF_UTC3;
var isOnOrAfterCutoff2;
var normalizeSumupStatus3;
var resolveSumupStatusFromSources3;
var onRequestPost18;
var init_sumup_sync = __esm({
  "api/financeiro/sumup-sync.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_dist();
    FINANCIAL_CUTOFF_BRT3 = "2026-03-01T00:00:00-03:00";
    FINANCIAL_CUTOFF_UTC3 = new Date(FINANCIAL_CUTOFF_BRT3);
    isOnOrAfterCutoff2 = /* @__PURE__ */ __name2((value) => {
      if (!value) return false;
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return false;
      return parsed.getTime() >= FINANCIAL_CUTOFF_UTC3.getTime();
    }, "isOnOrAfterCutoff");
    normalizeSumupStatus3 = /* @__PURE__ */ __name2((status) => {
      const s = String(status || "").trim().toUpperCase();
      if (!s) return "UNKNOWN";
      const map = {
        PAID: "SUCCESSFUL",
        APPROVED: "SUCCESSFUL",
        SUCCESSFUL: "SUCCESSFUL",
        PENDING: "PENDING",
        IN_PROCESS: "PENDING",
        PROCESSING: "PENDING",
        FAILED: "FAILED",
        FAILURE: "FAILED",
        EXPIRED: "EXPIRED",
        REFUNDED: "REFUNDED",
        PARTIALLY_REFUNDED: "PARTIALLY_REFUNDED",
        CANCELED: "CANCELLED",
        CANCEL: "CANCELLED",
        CANCELLED: "CANCELLED",
        CHARGEBACK: "CHARGE_BACK",
        CHARGE_BACK: "CHARGE_BACK"
      };
      return map[s] || s;
    }, "normalizeSumupStatus");
    resolveSumupStatusFromSources3 = /* @__PURE__ */ __name2((rowStatus, payloadStatus) => {
      const row = normalizeSumupStatus3(rowStatus || "UNKNOWN");
      const payload = normalizeSumupStatus3(payloadStatus || "UNKNOWN");
      const terminalPriority = ["PARTIALLY_REFUNDED", "REFUNDED", "CANCELLED", "CHARGE_BACK", "FAILED", "EXPIRED"];
      for (const status of terminalPriority) {
        if (row === status || payload === status) return status;
      }
      if (row === "SUCCESSFUL" || payload === "SUCCESSFUL") return "SUCCESSFUL";
      if (row === "PENDING" || payload === "PENDING") return "PENDING";
      return row !== "UNKNOWN" ? row : payload;
    }, "resolveSumupStatusFromSources");
    onRequestPost18 = /* @__PURE__ */ __name2(async (context22) => {
      const db = context22.env.BIGDATA_DB;
      const token = context22.env.SUMUP_API_KEY_PRIVATE;
      if (!token) return Response.json({ error: "SUMUP_API_KEY_PRIVATE ausente." }, { status: 503 });
      try {
        const client = new dist_default({ apiKey: token });
        const checkouts = await client.checkouts.list();
        if (!Array.isArray(checkouts)) throw new Error("Resposta inesperada da SumUp.");
        let inserted = 0, updated = 0;
        for (const checkout of checkouts) {
          const tx = checkout.transactions?.[0];
          const sourceTimestamp = tx?.timestamp || checkout?.timestamp || checkout?.date || checkout?.created_at || null;
          if (sourceTimestamp && !isOnOrAfterCutoff2(sourceTimestamp)) continue;
          const checkoutId = checkout.id;
          const transactionId = tx?.id || checkout.id;
          const payloadStatus = tx?.status || checkout.status || "UNKNOWN";
          const amount = Number(checkout.amount || 0);
          const raw = JSON.stringify(checkout);
          const existing = await db.prepare(
            "SELECT id, status FROM mainsite_financial_logs WHERE method = 'sumup_card' AND (payment_id = ? OR payment_id = ?) LIMIT 1"
          ).bind(checkoutId, transactionId).first();
          const status = resolveSumupStatusFromSources3(existing?.status || "UNKNOWN", payloadStatus);
          if (existing) {
            await db.prepare(
              "UPDATE mainsite_financial_logs SET payment_id = ?, status = ?, raw_payload = ? WHERE method = 'sumup_card' AND (payment_id = ? OR payment_id = ?)"
            ).bind(checkoutId, status, raw, checkoutId, transactionId).run();
            updated++;
          } else {
            await db.prepare(
              "INSERT INTO mainsite_financial_logs (payment_id, status, amount, method, payer_email, raw_payload) VALUES (?, ?, ?, ?, ?, ?)"
            ).bind(checkoutId, status, amount, "sumup_card", "N/A", raw).run();
            inserted++;
          }
        }
        return Response.json({ success: true, inserted, updated, total: checkouts.length });
      } catch (err) {
        return Response.json({ error: err instanceof Error ? err.message : "Falha ao sincronizar SumUp." }, { status: 500 });
      }
    }, "onRequestPost");
  }
});
function json6(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(json6, "json6");
var onRequestGet18;
var init_modelos2 = __esm({
  "api/itau/modelos.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name2(json6, "json");
    onRequestGet18 = /* @__PURE__ */ __name2(async ({ env: env22 }) => {
      const apiKey = env22?.GEMINI_API_KEY;
      if (!apiKey) return json6({ ok: false, error: "GEMINI_API_KEY n\xE3o configurada." }, 503);
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
        return json6({ ok: true, models, total: models.length });
      } catch (err) {
        return json6({ ok: false, error: err instanceof Error ? err.message : "Erro ao listar modelos." }, 500);
      }
    }, "onRequestGet");
  }
});
async function onRequestGet19(context22) {
  const { request, env: env22 } = context22;
  const trace32 = createResponseTrace(request);
  const url = new URL(request.url);
  const moeda = normalizeMoeda(url.searchParams.get("moeda") ?? "");
  const dias = parseDias(url.searchParams.get("dias"));
  const filtros = { moeda, dias };
  const avisos = [];
  if (env22.BIGDATA_DB) {
    try {
      const payload = await queryBigdataOverview(env22.BIGDATA_DB, filtros);
      try {
        await logModuleOperationalEvent(env22.BIGDATA_DB, {
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
        ...trace32
      }), {
        headers: toResponseHeaders2()
      });
    } catch (error32) {
      const message = error32 instanceof Error ? error32.message : "Falha ao consultar bigdata_db";
      avisos.push(`Leitura em modo D1 indispon\xEDvel: ${message}`);
    }
  }
  return new Response(JSON.stringify({
    ok: false,
    ...trace32,
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
__name(onRequestGet19, "onRequestGet19");
var toResponseHeaders2;
var normalizeMoeda;
var parseDias;
var queryBigdataOverview;
var init_overview2 = __esm({
  "api/itau/overview.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_request_trace();
    toResponseHeaders2 = /* @__PURE__ */ __name2(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toResponseHeaders");
    normalizeMoeda = /* @__PURE__ */ __name2((rawValue) => rawValue.trim().toUpperCase(), "normalizeMoeda");
    parseDias = /* @__PURE__ */ __name2((rawValue) => {
      const parsed = Number.parseInt(rawValue ?? "7", 10);
      if (!Number.isFinite(parsed)) {
        return 7;
      }
      return Math.min(90, Math.max(1, parsed));
    }, "parseDias");
    queryBigdataOverview = /* @__PURE__ */ __name2(async (db, filtros) => {
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
    __name2(onRequestGet19, "onRequestGet");
  }
});
var DEFAULT_PARAMS;
var DEFAULT_POLICIES2;
var SUPPORTED_ROUTES2;
var toHeaders13;
var toInt2;
var toRate;
var validateRate;
var ensureParametrosTables;
var readLatestParams;
var ensureRateLimitTables2;
var ensureDefaultPolicies2;
var getRateLimitWindowStats2;
var listPoliciesWithStats2;
var upsertRateLimitPolicy2;
var resetRateLimitPolicy2;
var init_itau_admin = __esm({
  "api/_lib/itau-admin.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
      }
    };
    SUPPORTED_ROUTES2 = ["oraculo_ia", "enviar_email"];
    toHeaders13 = /* @__PURE__ */ __name2(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    toInt2 = /* @__PURE__ */ __name2((value, fallback) => {
      const parsed = Number.parseInt(String(value), 10);
      return Number.isFinite(parsed) ? parsed : fallback;
    }, "toInt");
    toRate = /* @__PURE__ */ __name2((percentValue) => {
      const value = Number(percentValue);
      if (!Number.isFinite(value)) {
        return null;
      }
      return value / 100;
    }, "toRate");
    validateRate = /* @__PURE__ */ __name2((name, rate) => {
      if (!Number.isFinite(Number(rate))) {
        return `${name} inv\xE1lido.`;
      }
      if (Number(rate) < 0 || Number(rate) > 1) {
        return `${name} deve estar entre 0% e 100%.`;
      }
      return null;
    }, "validateRate");
    ensureParametrosTables = /* @__PURE__ */ __name2(async (db) => {
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
    readLatestParams = /* @__PURE__ */ __name2(async (db) => {
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
    ensureRateLimitTables2 = /* @__PURE__ */ __name2(async (db) => {
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
    ensureDefaultPolicies2 = /* @__PURE__ */ __name2(async (db) => {
      await ensureRateLimitTables2(db);
      for (const routeKey of SUPPORTED_ROUTES2) {
        const policy = DEFAULT_POLICIES2[routeKey];
        await db.prepare(`
      INSERT OR IGNORE INTO itau_rate_limit_policies (route_key, enabled, max_requests, window_minutes, updated_at, updated_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(policy.route_key, policy.enabled, policy.max_requests, policy.window_minutes, Date.now(), "system-default").run();
      }
    }, "ensureDefaultPolicies");
    getRateLimitWindowStats2 = /* @__PURE__ */ __name2(async (db, routeKey, windowMinutes) => {
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
    listPoliciesWithStats2 = /* @__PURE__ */ __name2(async (db) => {
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
    upsertRateLimitPolicy2 = /* @__PURE__ */ __name2(async (db, input) => {
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
    resetRateLimitPolicy2 = /* @__PURE__ */ __name2(async (db, routeKey, updatedBy) => {
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
async function onRequestGet20(context22) {
  const { env: env22 } = context22;
  const trace32 = createResponseTrace(context22.request);
  const adminActor = resolveAdminActorFromRequest(context22.request);
  const db = resolveParametrosDb(context22);
  const source = resolveOperationalSource4(context22);
  if (!db) {
    return json7({ ok: false, error: "Nenhum binding D1 dispon\xEDvel (BIGDATA_DB).", ...trace32 }, 503);
  }
  try {
    const parametros = await readLatestParams(db);
    if (env22.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(env22.BIGDATA_DB, {
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
    return json7({
      ok: true,
      admin_email: adminActor,
      admin_actor: adminActor,
      ...trace32,
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
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Falha ao carregar par\xE2metros do Ita\xFA";
    if (env22.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(env22.BIGDATA_DB, {
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
    return json7({ ok: false, error: message, ...trace32 }, 500);
  }
}
__name(onRequestGet20, "onRequestGet20");
async function onRequestPost19(context22) {
  const { env: env22 } = context22;
  const trace32 = createResponseTrace(context22.request);
  const db = resolveParametrosDb(context22);
  const source = resolveOperationalSource4(context22);
  if (!db) {
    return json7({ ok: false, error: "Nenhum binding D1 dispon\xEDvel (BIGDATA_DB).", ...trace32 }, 503);
  }
  try {
    const body = await context22.request.json();
    const adminActor = resolveAdminActorFromRequest(context22.request, body);
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
      return json7({ ok: false, error: validations[0], ...trace32 }, 400);
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
    if (env22.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(env22.BIGDATA_DB, {
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
    return json7({
      ok: true,
      admin_email: adminActor,
      admin_actor: adminActor,
      ...trace32,
      saved_at: (/* @__PURE__ */ new Date()).toISOString(),
      parametros_salvos: values,
      mudancas_registradas: mudancas.length
    });
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Falha ao salvar par\xE2metros do Ita\xFA";
    if (env22.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(env22.BIGDATA_DB, {
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
    return json7({ ok: false, error: message, ...trace32 }, 500);
  }
}
__name(onRequestPost19, "onRequestPost19");
var json7;
var resolveParametrosDb;
var resolveOperationalSource4;
var init_parametros = __esm({
  "api/itau/parametros.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_itau_admin();
    init_admin_actor();
    init_request_trace();
    json7 = /* @__PURE__ */ __name2((data, status = 200) => new Response(JSON.stringify(data), {
      status,
      headers: toHeaders13()
    }), "json");
    resolveParametrosDb = /* @__PURE__ */ __name2((context22) => context22.env.BIGDATA_DB, "resolveParametrosDb");
    resolveOperationalSource4 = /* @__PURE__ */ __name2(() => "bigdata_db", "resolveOperationalSource");
    __name2(onRequestGet20, "onRequestGet");
    __name2(onRequestPost19, "onRequestPost");
  }
});
async function onRequestGet21(context22) {
  const trace32 = createResponseTrace(context22.request);
  const adminActor = resolveAdminActorFromRequest(context22.request);
  const db = resolveRateLimitDb2(context22);
  const source = resolveOperationalSource5(context22);
  if (!db) {
    return json8({ ok: false, error: "Nenhum binding D1 dispon\xEDvel (BIGDATA_DB).", ...trace32 }, 503);
  }
  try {
    const policies = await listPoliciesWithStats2(db);
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return json8({
      ok: true,
      admin_email: adminActor,
      admin_actor: adminActor,
      ...trace32,
      policies
    });
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Falha ao carregar painel de rate limit do Ita\xFA";
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return json8({ ok: false, error: message, ...trace32 }, 500);
  }
}
__name(onRequestGet21, "onRequestGet21");
async function onRequestPost20(context22) {
  const trace32 = createResponseTrace(context22.request);
  const db = resolveRateLimitDb2(context22);
  const source = resolveOperationalSource5(context22);
  if (!db) {
    return json8({ ok: false, error: "Nenhum binding D1 dispon\xEDvel (BIGDATA_DB).", ...trace32 }, 503);
  }
  try {
    const body = await context22.request.json();
    const adminActor = resolveAdminActorFromRequest(context22.request, body);
    const routeKey = normalizeRoute2(body.route_key);
    if (!routeKey) {
      return json8({ ok: false, error: "Rota de rate limit inv\xE1lida.", ...trace32 }, 400);
    }
    const action = String(body.action ?? "update").trim();
    if (action === "restore_default") {
      await resetRateLimitPolicy2(db, routeKey, adminActor);
      const policies2 = await listPoliciesWithStats2(db);
      if (context22.env.BIGDATA_DB) {
        try {
          await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
      return json8({ ok: true, action: "restore_default", policies: policies2, admin_actor: adminActor, ...trace32 });
    }
    const enabled = body.enabled ? 1 : 0;
    const maxRequests = toPositiveInt3(body.max_requests, 2);
    const windowMinutes = toPositiveInt3(body.window_minutes, 10);
    if (maxRequests > 5e3 || windowMinutes > 1440) {
      return json8({ ok: false, error: "Par\xE2metros fora da faixa permitida.", ...trace32 }, 400);
    }
    await upsertRateLimitPolicy2(db, {
      routeKey,
      enabled,
      maxRequests,
      windowMinutes,
      updatedBy: adminActor
    });
    const policies = await listPoliciesWithStats2(db);
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return json8({ ok: true, action: "update", policies, admin_actor: adminActor, ...trace32 });
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Falha ao salvar painel de rate limit do Ita\xFA";
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return json8({ ok: false, error: message, ...trace32 }, 500);
  }
}
__name(onRequestPost20, "onRequestPost20");
var json8;
var normalizeRoute2;
var toPositiveInt3;
var resolveRateLimitDb2;
var resolveOperationalSource5;
var init_rate_limit2 = __esm({
  "api/itau/rate-limit.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_itau_admin();
    init_admin_actor();
    init_request_trace();
    json8 = /* @__PURE__ */ __name2((data, status = 200) => new Response(JSON.stringify(data), {
      status,
      headers: toHeaders13()
    }), "json");
    normalizeRoute2 = /* @__PURE__ */ __name2((value) => {
      const route = String(value ?? "").trim();
      if (SUPPORTED_ROUTES2.includes(route)) {
        return route;
      }
      return null;
    }, "normalizeRoute");
    toPositiveInt3 = /* @__PURE__ */ __name2((value, fallback) => {
      const parsed = Number.parseInt(String(value), 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
      }
      return parsed;
    }, "toPositiveInt");
    resolveRateLimitDb2 = /* @__PURE__ */ __name2((context22) => context22.env.BIGDATA_DB, "resolveRateLimitDb");
    resolveOperationalSource5 = /* @__PURE__ */ __name2(() => "bigdata_db", "resolveOperationalSource");
    __name2(onRequestGet21, "onRequestGet");
    __name2(onRequestPost20, "onRequestPost");
  }
});
async function onRequestPost21(context22) {
  const { request, env: env22 } = context22;
  if (!env22.BIGDATA_DB) {
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
  const syncRunId = await startSyncRun(env22.BIGDATA_DB, {
    module: "itau",
    status: "running",
    startedAt,
    metadata: { limit }
  });
  try {
    const [observSource, rateLimitSource] = await Promise.all([
      env22.BIGDATA_DB.prepare(`
        SELECT created_at, status, from_cache, force_refresh, duration_ms, moeda, valor_original, preview, error_message
        FROM itau_oraculo_observabilidade
        ORDER BY created_at DESC
        LIMIT ?
      `).bind(limit).all(),
      env22.BIGDATA_DB.prepare(`
        SELECT route_key, enabled, max_requests, window_minutes, updated_at, updated_by
        FROM itau_rate_limit_policies
      `).all()
    ]);
    const observabilidadeRows = parseObservabilidadeRows(observSource.results ?? [], limit);
    const rateLimitRows = parseRateLimitPolicies(rateLimitSource.results ?? []);
    let observabilidadeInserted = 0;
    let rateLimitUpserted = 0;
    for (const row of observabilidadeRows) {
      const alreadyExists = await existsObservabilidade(env22.BIGDATA_DB, row);
      if (alreadyExists) {
        continue;
      }
      await env22.BIGDATA_DB.prepare(`
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
      await env22.BIGDATA_DB.prepare(`
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
    await finishSyncRun(env22.BIGDATA_DB, {
      id: syncRunId,
      status: "success",
      finishedAt: Date.now(),
      recordsRead,
      recordsUpserted
    });
    await logModuleOperationalEvent(env22.BIGDATA_DB, {
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
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Falha inesperada no sync do Ita\xFA";
    await finishSyncRun(env22.BIGDATA_DB, {
      id: syncRunId,
      status: "error",
      finishedAt: Date.now(),
      recordsRead: 0,
      recordsUpserted: 0,
      errorMessage: message
    });
    await logModuleOperationalEvent(env22.BIGDATA_DB, {
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
__name(onRequestPost21, "onRequestPost21");
var parseLimit2;
var toHeaders14;
var parseObservabilidadeRows;
var parseRateLimitPolicies;
var existsObservabilidade;
var init_sync2 = __esm({
  "api/itau/sync.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    parseLimit2 = /* @__PURE__ */ __name2((rawValue) => {
      const parsed = Number.parseInt(rawValue ?? "300", 10);
      if (!Number.isFinite(parsed)) {
        return 300;
      }
      return Math.min(1e3, Math.max(1, parsed));
    }, "parseLimit");
    toHeaders14 = /* @__PURE__ */ __name2(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    parseObservabilidadeRows = /* @__PURE__ */ __name2((sourceRows, limit) => {
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
    parseRateLimitPolicies = /* @__PURE__ */ __name2((sourceRows) => {
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
    existsObservabilidade = /* @__PURE__ */ __name2(async (db, row) => {
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
    __name2(onRequestPost21, "onRequestPost");
  }
});
var EXTERNAL_MEDIA_PATTERN;
var INTERNAL_MEDIA_PREFIX;
var onRequestPost22;
var init_migrate_media_urls = __esm({
  "api/mainsite/migrate-media-urls.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    EXTERNAL_MEDIA_PATTERN = /https:\/\/mainsite-app\.lcv\.rio\.br\/api\/uploads\//g;
    INTERNAL_MEDIA_PREFIX = "/api/mainsite/media/";
    onRequestPost22 = /* @__PURE__ */ __name2(async (context22) => {
      const db = context22.env.BIGDATA_DB;
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
async function onRequestGet22(context22) {
  const { request, env: env22 } = context22;
  const trace32 = createResponseTrace(request);
  const url = new URL(request.url);
  const limit = parseLimit3(url.searchParams.get("limit"));
  if (!env22.BIGDATA_DB) {
    return new Response(JSON.stringify({
      ok: false,
      ...trace32,
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
    const payload = await queryBigdata(env22.BIGDATA_DB, limit);
    try {
      await logModuleOperationalEvent(env22.BIGDATA_DB, {
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
      ...trace32
    }), {
      headers: toResponseHeaders3()
    });
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Erro desconhecido no m\xF3dulo MainSite";
    try {
      await logModuleOperationalEvent(env22.BIGDATA_DB, {
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
      ...trace32,
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
__name(onRequestGet22, "onRequestGet22");
var toResponseHeaders3;
var parseLimit3;
var mapPost;
var queryBigdata;
var init_overview3 = __esm({
  "api/mainsite/overview.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_request_trace();
    toResponseHeaders3 = /* @__PURE__ */ __name2(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toResponseHeaders");
    parseLimit3 = /* @__PURE__ */ __name2((rawValue) => {
      const parsed = Number.parseInt(rawValue ?? "20", 10);
      if (!Number.isFinite(parsed)) {
        return 20;
      }
      return Math.min(50, Math.max(1, parsed));
    }, "parseLimit");
    mapPost = /* @__PURE__ */ __name2((post) => {
      const id = Number(post.id);
      const title22 = String(post.title ?? "").trim();
      const createdAt = String(post.created_at ?? "").trim();
      const isPinned = Number(post.is_pinned ?? 0) === 1;
      if (!Number.isFinite(id) || !title22 || !createdAt) {
        return null;
      }
      return {
        id,
        title: title22,
        createdAt,
        isPinned
      };
    }, "mapPost");
    queryBigdata = /* @__PURE__ */ __name2(async (db, limit) => {
      const [totalPostsRow, totalPinnedRow, totalFinancialRow, totalApprovedFinancialRow, latestRows] = await Promise.all([
        db.prepare("SELECT COUNT(1) AS total FROM mainsite_posts").first(),
        db.prepare("SELECT COUNT(1) AS total FROM mainsite_posts WHERE is_pinned = 1").first(),
        db.prepare("SELECT COUNT(1) AS total FROM mainsite_financial_logs").first(),
        db.prepare("SELECT COUNT(1) AS total FROM mainsite_financial_logs WHERE lower(status) IN ('approved', 'successful')").first(),
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
          totalFinancialLogs: Number(totalFinancialRow?.total ?? 0),
          totalApprovedFinancialLogs: Number(totalApprovedFinancialRow?.total ?? 0)
        },
        ultimosPosts
      };
    }, "queryBigdata");
    __name2(onRequestGet22, "onRequestGet");
  }
});
var toHeaders15;
var init_mainsite_admin = __esm({
  "api/_lib/mainsite-admin.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    toHeaders15 = /* @__PURE__ */ __name2(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
  }
});
async function onRequestGet23(context22) {
  const { request } = context22;
  const trace32 = createResponseTrace(request);
  const url = new URL(request.url);
  const id = parseId(url.searchParams.get("id"));
  try {
    const db = requireDb(context22.env);
    if (id) {
      const row = await db.prepare(`
        SELECT id, title, content, created_at, updated_at, is_pinned
        FROM mainsite_posts
        WHERE id = ?
        LIMIT 1
      `).bind(id).first();
      const post = row ? mapPostRow(row) : null;
      if (!post) {
        return buildErrorResponse3("Post n\xE3o encontrado para o ID informado.", trace32, 404);
      }
      return new Response(JSON.stringify({ ok: true, post, ...trace32 }), {
        headers: toHeaders15()
      });
    }
    const rows = await db.prepare(`
      SELECT id, title, content, created_at, updated_at, is_pinned
      FROM mainsite_posts
      ORDER BY is_pinned DESC, display_order ASC, created_at DESC
    `).all();
    const posts = (rows.results ?? []).map((row) => mapPostRow(row)).filter((item) => item !== null);
    return new Response(JSON.stringify({ ok: true, posts, ...trace32 }), {
      headers: toHeaders15()
    });
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Falha ao consultar posts do MainSite";
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return buildErrorResponse3(message, trace32, 500);
  }
}
__name(onRequestGet23, "onRequestGet23");
async function onRequestPost23(context22) {
  const trace32 = createResponseTrace(context22.request);
  try {
    const db = requireDb(context22.env);
    const body = await context22.request.json();
    const adminActor = resolveAdminActorFromRequest(context22.request, body);
    const title22 = parseText(body.title);
    const content = parseText(body.content);
    if (!title22 || !content) {
      return buildErrorResponse3("T\xEDtulo e conte\xFAdo s\xE3o obrigat\xF3rios para criar um post.", trace32, 400);
    }
    await db.prepare(`
      INSERT INTO mainsite_posts (title, content, is_pinned, display_order, created_at, updated_at)
      VALUES (?, ?, 0, 0, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(title22, content).run();
    const created = await db.prepare(`
      SELECT id, title, content, created_at, is_pinned
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
          titleLength: title22.length
        }
      });
    } catch {
    }
    return new Response(JSON.stringify({
      ok: true,
      post: createdPost,
      admin_actor: adminActor,
      ...trace32
    }), {
      status: 201,
      headers: toHeaders15()
    });
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Falha ao criar post do MainSite";
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return buildErrorResponse3(message, trace32);
  }
}
__name(onRequestPost23, "onRequestPost23");
async function onRequestPut3(context22) {
  const trace32 = createResponseTrace(context22.request);
  try {
    const db = requireDb(context22.env);
    const body = await context22.request.json();
    const adminActor = resolveAdminActorFromRequest(context22.request, body);
    const id = parseId(body.id);
    const title22 = parseText(body.title);
    const content = parseText(body.content);
    if (!id || !title22 || !content) {
      return buildErrorResponse3("ID, t\xEDtulo e conte\xFAdo s\xE3o obrigat\xF3rios para atualizar um post.", trace32, 400);
    }
    await db.prepare("UPDATE mainsite_posts SET title = ?, content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(title22, content, id).run();
    const row = await db.prepare(`
      SELECT id, title, content, created_at, is_pinned
      FROM mainsite_posts
      WHERE id = ?
      LIMIT 1
    `).bind(id).first();
    const updatedPost = row ? mapPostRow(row) : null;
    if (!updatedPost) {
      return buildErrorResponse3("Post n\xE3o encontrado para atualiza\xE7\xE3o.", trace32, 404);
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
      ...trace32
    }), {
      headers: toHeaders15()
    });
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Falha ao atualizar post do MainSite";
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return buildErrorResponse3(message, trace32);
  }
}
__name(onRequestPut3, "onRequestPut3");
async function onRequestDelete4(context22) {
  const trace32 = createResponseTrace(context22.request);
  try {
    const db = requireDb(context22.env);
    const body = await context22.request.json();
    const adminActor = resolveAdminActorFromRequest(context22.request, body);
    const id = parseId(body.id);
    if (!id) {
      return buildErrorResponse3("ID v\xE1lido \xE9 obrigat\xF3rio para excluir um post.", trace32, 400);
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
      ...trace32
    }), {
      headers: toHeaders15()
    });
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Falha ao excluir post do MainSite";
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return buildErrorResponse3(message, trace32);
  }
}
__name(onRequestDelete4, "onRequestDelete4");
var parseId;
var parseText;
var mapPostRow;
var buildErrorResponse3;
var requireDb;
var init_posts = __esm({
  "api/mainsite/posts.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_mainsite_admin();
    init_admin_actor();
    init_request_trace();
    parseId = /* @__PURE__ */ __name2((rawValue) => {
      const parsed = Number(rawValue);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return null;
      }
      return parsed;
    }, "parseId");
    parseText = /* @__PURE__ */ __name2((rawValue) => String(rawValue ?? "").trim(), "parseText");
    mapPostRow = /* @__PURE__ */ __name2((row) => {
      const id = Number(row.id);
      const title22 = String(row.title ?? "").trim();
      const content = String(row.content ?? "").trim();
      const createdAt = String(row.created_at ?? "").trim();
      const updatedAt = row.updated_at ? String(row.updated_at).trim() : null;
      if (!Number.isFinite(id) || !title22 || !content || !createdAt) {
        return null;
      }
      return {
        id,
        title: title22,
        content,
        created_at: createdAt,
        updated_at: updatedAt,
        is_pinned: Number(row.is_pinned ?? 0) === 1 ? 1 : 0
      };
    }, "mapPostRow");
    buildErrorResponse3 = /* @__PURE__ */ __name2((message, trace32, status = 500) => new Response(JSON.stringify({
      ok: false,
      error: message,
      ...trace32
    }), {
      status,
      headers: toHeaders15()
    }), "buildErrorResponse");
    requireDb = /* @__PURE__ */ __name2((env22) => {
      if (!env22.BIGDATA_DB) {
        throw new Error("BIGDATA_DB n\xE3o configurado no runtime do admin-app.");
      }
      return env22.BIGDATA_DB;
    }, "requireDb");
    __name2(onRequestGet23, "onRequestGet");
    __name2(onRequestPost23, "onRequestPost");
    __name2(onRequestPut3, "onRequestPut");
    __name2(onRequestDelete4, "onRequestDelete");
  }
});
async function onRequestPost24(context22) {
  const trace32 = createResponseTrace(context22.request);
  try {
    const db = requireDb2(context22.env);
    const body = await context22.request.json();
    const adminActor = resolveAdminActorFromRequest(context22.request, body);
    const id = parseId2(body.id);
    if (!id) {
      return buildErrorResponse4("ID v\xE1lido \xE9 obrigat\xF3rio para alternar fixa\xE7\xE3o do post.", trace32, 400);
    }
    const current = await db.prepare("SELECT is_pinned FROM mainsite_posts WHERE id = ? LIMIT 1").bind(id).first();
    if (!current) {
      return buildErrorResponse4("Post n\xE3o encontrado para alternar fixa\xE7\xE3o.", trace32, 404);
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
      ...trace32
    }), {
      headers: toHeaders15()
    });
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Falha ao alternar fixa\xE7\xE3o do post do MainSite";
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return buildErrorResponse4(message, trace32);
  }
}
__name(onRequestPost24, "onRequestPost24");
var parseId2;
var buildErrorResponse4;
var requireDb2;
var init_posts_pin = __esm({
  "api/mainsite/posts-pin.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_mainsite_admin();
    init_admin_actor();
    init_request_trace();
    parseId2 = /* @__PURE__ */ __name2((rawValue) => {
      const parsed = Number(rawValue);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        return null;
      }
      return parsed;
    }, "parseId");
    buildErrorResponse4 = /* @__PURE__ */ __name2((message, trace32, status = 500) => new Response(JSON.stringify({
      ok: false,
      error: message,
      ...trace32
    }), {
      status,
      headers: toHeaders15()
    }), "buildErrorResponse");
    requireDb2 = /* @__PURE__ */ __name2((env22) => {
      if (!env22.BIGDATA_DB) {
        throw new Error("BIGDATA_DB n\xE3o configurado no runtime do admin-app.");
      }
      return env22.BIGDATA_DB;
    }, "requireDb");
    __name2(onRequestPost24, "onRequestPost");
  }
});
async function onRequestPost25(context22) {
  const trace32 = createResponseTrace(context22.request);
  try {
    const db = context22.env.BIGDATA_DB;
    if (!db) {
      return buildErrorResponse5("BIGDATA_DB n\xE3o configurado no runtime.", trace32, 503);
    }
    const body = await context22.request.json();
    const adminActor = resolveAdminActorFromRequest(context22.request, body);
    if (!Array.isArray(body.items) || body.items.length === 0) {
      return buildErrorResponse5("Lista de itens para reordena\xE7\xE3o \xE9 obrigat\xF3ria.", trace32, 400);
    }
    const items = body.items.filter((item) => {
      if (typeof item !== "object" || item === null) return false;
      const obj = item;
      return Number.isInteger(obj.id) && Number.isInteger(obj.display_order);
    });
    if (items.length === 0) {
      return buildErrorResponse5("Nenhum item v\xE1lido para reordena\xE7\xE3o.", trace32, 400);
    }
    for (const item of items) {
      await db.prepare("UPDATE mainsite_posts SET display_order = ? WHERE id = ?").bind(item.display_order, item.id).run();
    }
    try {
      await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
      ...trace32
    }), {
      headers: toHeaders15()
    });
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Falha ao reordenar posts do MainSite";
    return buildErrorResponse5(message, trace32);
  }
}
__name(onRequestPost25, "onRequestPost25");
var buildErrorResponse5;
var init_posts_reorder = __esm({
  "api/mainsite/posts-reorder.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_mainsite_admin();
    init_admin_actor();
    init_request_trace();
    buildErrorResponse5 = /* @__PURE__ */ __name2((message, trace32, status = 500) => new Response(JSON.stringify({
      ok: false,
      error: message,
      ...trace32
    }), {
      status,
      headers: toHeaders15()
    }), "buildErrorResponse");
    __name2(onRequestPost25, "onRequestPost");
  }
});
async function onRequestGet24(context22) {
  const trace32 = createResponseTrace(context22.request);
  try {
    const adminActor = resolveAdminActorFromRequest(context22.request);
    const policies = toClientPolicies(await loadLegacyRateLimit(context22));
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return json9({ ok: true, policies, admin_actor: adminActor, ...trace32 });
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Falha ao carregar painel de rate limit do MainSite";
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return json9({ ok: false, error: message, ...trace32 }, 502);
  }
}
__name(onRequestGet24, "onRequestGet24");
async function onRequestPost26(context22) {
  const trace32 = createResponseTrace(context22.request);
  try {
    const body = await context22.request.json();
    const adminActor = resolveAdminActorFromRequest(context22.request, body);
    const route = normalizeRoute3(body.route);
    if (!route) {
      return json9({ ok: false, error: "Rota de rate limit inv\xE1lida.", ...trace32 }, 400);
    }
    const action = String(body.action ?? "update").trim();
    const currentConfig = await loadLegacyRateLimit(context22);
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
        return json9({ ok: false, error: "Par\xE2metros de rate limit inv\xE1lidos.", ...trace32 }, 400);
      }
      if (maxRequests > POLICY_LIMITS.maxRequests || windowMinutes > POLICY_LIMITS.windowMinutes) {
        return json9({ ok: false, error: "Par\xE2metros fora da faixa permitida.", ...trace32 }, 400);
      }
      nextConfig[route] = {
        enabled: toBoolean(body.enabled),
        maxRequests,
        windowMinutes
      };
    }
    await saveLegacyRateLimit(context22, nextConfig);
    const policies = toClientPolicies(await loadLegacyRateLimit(context22));
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return json9({ ok: true, action, policies, admin_actor: adminActor, ...trace32 });
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Falha ao salvar painel de rate limit do MainSite";
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return json9({ ok: false, error: message, ...trace32 }, 500);
  }
}
__name(onRequestPost26, "onRequestPost26");
var POLICY_LIMITS;
var POLICY_META;
var ROUTES;
var json9;
var toBoolean;
var parsePositiveInt;
var normalizeBucket;
var normalizeConfig;
var toClientPolicies;
var loadLegacyRateLimit;
var saveLegacyRateLimit;
var normalizeRoute3;
var init_rate_limit3 = __esm({
  "api/mainsite/rate-limit.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
      }
    };
    ROUTES = Object.keys(POLICY_META);
    json9 = /* @__PURE__ */ __name2((data, status = 200) => new Response(JSON.stringify(data), {
      status,
      headers: toHeaders15()
    }), "json");
    toBoolean = /* @__PURE__ */ __name2((value) => value === true || value === 1 || value === "1" || value === "true", "toBoolean");
    parsePositiveInt = /* @__PURE__ */ __name2((value) => {
      const parsed = Number.parseInt(String(value), 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return null;
      }
      return parsed;
    }, "parsePositiveInt");
    normalizeBucket = /* @__PURE__ */ __name2((raw, route) => {
      const defaults = POLICY_META[route].defaults;
      const maxRequestsRaw = parsePositiveInt(raw?.maxRequests);
      const windowMinutesRaw = parsePositiveInt(raw?.windowMinutes);
      return {
        enabled: toBoolean(raw?.enabled),
        maxRequests: Math.min(POLICY_LIMITS.maxRequests, maxRequestsRaw ?? defaults.max_requests),
        windowMinutes: Math.min(POLICY_LIMITS.windowMinutes, windowMinutesRaw ?? defaults.window_minutes)
      };
    }, "normalizeBucket");
    normalizeConfig = /* @__PURE__ */ __name2((raw) => ({
      chatbot: normalizeBucket(raw?.chatbot, "chatbot"),
      email: normalizeBucket(raw?.email, "email")
    }), "normalizeConfig");
    toClientPolicies = /* @__PURE__ */ __name2((config22) => ROUTES.map((route) => {
      const policy = config22[route];
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
    loadLegacyRateLimit = /* @__PURE__ */ __name2(async (context22) => {
      const db = context22.env.BIGDATA_DB;
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
    saveLegacyRateLimit = /* @__PURE__ */ __name2(async (context22, config22) => {
      const db = context22.env.BIGDATA_DB;
      if (!db) {
        throw new Error("BIGDATA_DB n\xE3o configurado no runtime do admin-app.");
      }
      const payload = JSON.stringify({
        chatbot: {
          enabled: config22.chatbot.enabled,
          maxRequests: config22.chatbot.maxRequests,
          windowMinutes: config22.chatbot.windowMinutes
        },
        email: {
          enabled: config22.email.enabled,
          maxRequests: config22.email.maxRequests,
          windowMinutes: config22.email.windowMinutes
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
    normalizeRoute3 = /* @__PURE__ */ __name2((value) => {
      const route = String(value ?? "").trim();
      if (route === "chatbot" || route === "email") {
        return route;
      }
      return null;
    }, "normalizeRoute");
    __name2(onRequestGet24, "onRequestGet");
    __name2(onRequestPost26, "onRequestPost");
  }
});
async function onRequestGet25(context22) {
  const trace32 = createResponseTrace(context22.request);
  try {
    const db = requireDb3(context22.env);
    const settings = await readPublicSettings(db);
    return new Response(JSON.stringify({
      ok: true,
      settings,
      ...trace32
    }), {
      headers: toHeaders15()
    });
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Falha ao consultar settings p\xFAblicos do MainSite";
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return buildErrorResponse6(message, trace32, 500);
  }
}
__name(onRequestGet25, "onRequestGet25");
async function onRequestPut4(context22) {
  const trace32 = createResponseTrace(context22.request);
  try {
    const db = requireDb3(context22.env);
    const body = await context22.request.json();
    const adminActor = resolveAdminActorFromRequest(context22.request, body);
    if (!isRecord(body.appearance) || !isRecord(body.rotation) || !isRecord(body.disclaimers)) {
      return buildErrorResponse6("Appearance, rotation e disclaimers precisam ser objetos JSON v\xE1lidos.", trace32, 400);
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
      ...trace32
    }), {
      headers: toHeaders15()
    });
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Falha ao salvar settings p\xFAblicos do MainSite";
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return buildErrorResponse6(message, trace32);
  }
}
__name(onRequestPut4, "onRequestPut4");
var isRecord;
var buildErrorResponse6;
var requireDb3;
var safeParseObject;
var readPublicSettings;
var upsertSetting;
var init_settings = __esm({
  "api/mainsite/settings.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_mainsite_admin();
    init_admin_actor();
    init_request_trace();
    isRecord = /* @__PURE__ */ __name2((value) => typeof value === "object" && value !== null && !Array.isArray(value), "isRecord");
    buildErrorResponse6 = /* @__PURE__ */ __name2((message, trace32, status = 500) => new Response(JSON.stringify({
      ok: false,
      error: message,
      ...trace32
    }), {
      status,
      headers: toHeaders15()
    }), "buildErrorResponse");
    requireDb3 = /* @__PURE__ */ __name2((env22) => {
      if (!env22.BIGDATA_DB) {
        throw new Error("BIGDATA_DB n\xE3o configurado no runtime do admin-app.");
      }
      return env22.BIGDATA_DB;
    }, "requireDb");
    safeParseObject = /* @__PURE__ */ __name2((rawPayload, fallback) => {
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
    readPublicSettings = /* @__PURE__ */ __name2(async (db) => {
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
    upsertSetting = /* @__PURE__ */ __name2(async (db, id, payload) => {
      await db.prepare(`
    INSERT INTO mainsite_settings (id, payload, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      payload = excluded.payload,
      updated_at = CURRENT_TIMESTAMP
  `).bind(id, JSON.stringify(payload)).run();
    }, "upsertSetting");
    __name2(onRequestGet25, "onRequestGet");
    __name2(onRequestPut4, "onRequestPut");
  }
});
async function onRequestPost27(context22) {
  const { env: env22 } = context22;
  if (!env22.BIGDATA_DB) {
    return new Response(JSON.stringify({
      ok: false,
      error: "BIGDATA_DB n\xE3o configurado no runtime."
    }), {
      status: 503,
      headers: toHeaders16()
    });
  }
  const startedAt = Date.now();
  const syncRunId = await startSyncRun(env22.BIGDATA_DB, {
    module: "mainsite",
    status: "running",
    startedAt,
    metadata: {}
  });
  try {
    const [postsCountRow, financialCountRow, settingsRowsRaw] = await Promise.all([
      env22.BIGDATA_DB.prepare("SELECT COUNT(1) AS total FROM mainsite_posts").first(),
      env22.BIGDATA_DB.prepare("SELECT COUNT(1) AS total FROM mainsite_financial_logs").first(),
      env22.BIGDATA_DB.prepare("SELECT id, payload FROM mainsite_settings").all()
    ]);
    const settingsRows = settingsRowsRaw.results ?? [];
    const settingsMap = new Map(settingsRows.map((row) => [String(row.id ?? ""), row]));
    let settingsInserted = 0;
    let settingsFixed = 0;
    for (const entry of DEFAULT_SETTINGS) {
      const current = settingsMap.get(entry.id);
      if (!current) {
        await env22.BIGDATA_DB.prepare(`
          INSERT INTO mainsite_settings (id, payload, updated_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
        `).bind(entry.id, JSON.stringify(entry.payload)).run();
        settingsInserted += 1;
        continue;
      }
      if (!isValidJson(current.payload)) {
        await env22.BIGDATA_DB.prepare(`
          UPDATE mainsite_settings
          SET payload = ?, updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `).bind(JSON.stringify(entry.payload), entry.id).run();
        settingsFixed += 1;
      }
    }
    const recordsRead = Number(postsCountRow?.total ?? 0) + Number(financialCountRow?.total ?? 0) + settingsRows.length;
    const recordsUpserted = settingsInserted + settingsFixed;
    await finishSyncRun(env22.BIGDATA_DB, {
      id: syncRunId,
      status: "success",
      finishedAt: Date.now(),
      recordsRead,
      recordsUpserted
    });
    await logModuleOperationalEvent(env22.BIGDATA_DB, {
      module: "mainsite",
      source: "bigdata_db",
      fallbackUsed: false,
      ok: true,
      metadata: {
        action: "sync",
        pulledFrom: "bigdata_db",
        postsLidos: Number(postsCountRow?.total ?? 0),
        financeirosLidos: Number(financialCountRow?.total ?? 0),
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
        lidos: Number(financialCountRow?.total ?? 0)
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
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Falha inesperada no sync do MainSite";
    await finishSyncRun(env22.BIGDATA_DB, {
      id: syncRunId,
      status: "error",
      finishedAt: Date.now(),
      recordsRead: 0,
      recordsUpserted: 0,
      errorMessage: message
    });
    await logModuleOperationalEvent(env22.BIGDATA_DB, {
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
__name(onRequestPost27, "onRequestPost27");
var toHeaders16;
var DEFAULT_SETTINGS;
var isValidJson;
var init_sync3 = __esm({
  "api/mainsite/sync.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    toHeaders16 = /* @__PURE__ */ __name2(() => ({
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
    isValidJson = /* @__PURE__ */ __name2((raw) => {
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
    __name2(onRequestPost27, "onRequestPost");
  }
});
var onRequestPost28;
var init_upload = __esm({
  "api/mainsite/upload.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    onRequestPost28 = /* @__PURE__ */ __name2(async (context22) => {
      try {
        const formData = await context22.request.formData();
        const file = formData.get("file");
        if (!file) {
          return Response.json({ error: "Nenhum arquivo submetido." }, { status: 400 });
        }
        const extension = file.name.split(".").pop() || "bin";
        const uniqueName = `${crypto.randomUUID()}.${extension}`;
        await context22.env.MEDIA_BUCKET.put(uniqueName, await file.arrayBuffer(), {
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
async function onRequestPost29(context22) {
  const trace32 = createResponseTrace(context22.request);
  if (!context22.env.BIGDATA_DB) {
    return toError11("BIGDATA_DB n\xE3o configurado no runtime.", trace32, 503);
  }
  try {
    const body = await context22.request.json();
    const adminActor = resolveAdminActorFromRequest(context22.request, body);
    const domain22 = normalizeDomain(body.domain);
    const zoneId = String(body.zoneId ?? "").trim();
    const policyText = normalizePolicyText(body.policyText);
    const tlsrptEmail = normalizeTlsRptEmail(body.tlsrptEmail);
    if (!domain22 || !zoneId || !policyText) {
      return toError11("Domain, zoneId e policyText s\xE3o obrigat\xF3rios para orquestrar o MTA-STS.", trace32, 400);
    }
    const id = generateMtastsId();
    const [mtaStsDnsResult, tlsRptDnsResult] = await Promise.all([
      upsertCloudflareTxtRecord(
        context22.env,
        zoneId,
        `_mta-sts.${domain22}`,
        `v=STSv1; id=${id}`
      ),
      tlsrptEmail ? upsertCloudflareTxtRecord(
        context22.env,
        zoneId,
        `_smtp._tls.${domain22}`,
        `v=TLSRPTv1; rua=mailto:${tlsrptEmail}`
      ) : Promise.resolve(null)
    ]);
    await context22.env.BIGDATA_DB.prepare(`
      INSERT INTO mtasts_mta_sts_policies (domain, policy_text, tlsrpt_email, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(domain) DO UPDATE SET
        policy_text = excluded.policy_text,
        tlsrpt_email = COALESCE(excluded.tlsrpt_email, mtasts_mta_sts_policies.tlsrpt_email),
        updated_at = CURRENT_TIMESTAMP
    `).bind(domain22, policyText, tlsrptEmail).run();
    await context22.env.BIGDATA_DB.prepare(`
      INSERT INTO mtasts_history (gerado_em, domain, data_criacao)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      ON CONFLICT(gerado_em) DO UPDATE SET
        domain = excluded.domain
    `).bind(id, domain22).run();
    try {
      await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
        module: "mtasts",
        source: "bigdata_db",
        fallbackUsed: false,
        ok: true,
        metadata: {
          action: "orchestrate",
          provider: "cloudflare-api",
          domain: domain22,
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
      domain: domain22,
      zoneId,
      id,
      dnsUpdated: true,
      policySaved: true,
      historySaved: true,
      provider: "cloudflare-api",
      admin_actor: adminActor,
      ...trace32
    }), {
      headers: toHeaders17()
    });
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Falha inesperada na orquestra\xE7\xE3o MTA-STS";
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return toError11(message, trace32);
  }
}
__name(onRequestPost29, "onRequestPost29");
var toHeaders17;
var normalizeDomain;
var generateMtastsId;
var toError11;
var normalizePolicyText;
var normalizeTlsRptEmail;
var init_orchestrate = __esm({
  "api/mtasts/orchestrate.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_admin_actor();
    init_request_trace();
    init_cloudflare_api();
    toHeaders17 = /* @__PURE__ */ __name2(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    normalizeDomain = /* @__PURE__ */ __name2((value) => String(value ?? "").trim().toLowerCase(), "normalizeDomain");
    generateMtastsId = /* @__PURE__ */ __name2(() => {
      const now = /* @__PURE__ */ new Date();
      const prefix = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(now.getUTCDate()).padStart(2, "0")}`;
      const random = crypto.getRandomValues(new Uint32Array(4));
      const suffix = Array.from(random).map((chunk) => String(chunk).padStart(10, "0").slice(-4)).join("");
      return `${prefix}${suffix}`;
    }, "generateMtastsId");
    toError11 = /* @__PURE__ */ __name2((message, trace32, status = 500) => new Response(JSON.stringify({
      ok: false,
      error: message,
      ...trace32
    }), {
      status,
      headers: toHeaders17()
    }), "toError");
    normalizePolicyText = /* @__PURE__ */ __name2((value) => String(value ?? "").trim(), "normalizePolicyText");
    normalizeTlsRptEmail = /* @__PURE__ */ __name2((value) => {
      const email = String(value ?? "").trim().toLowerCase();
      if (!email) {
        return null;
      }
      return email;
    }, "normalizeTlsRptEmail");
    __name2(onRequestPost29, "onRequestPost");
  }
});
async function onRequestGet26(context22) {
  const { request, env: env22 } = context22;
  const trace32 = createResponseTrace(request);
  const url = new URL(request.url);
  const domain22 = normalizeDomain2(url.searchParams.get("domain"));
  const limit = parseLimit4(url.searchParams.get("limit"));
  const avisos = [];
  if (env22.BIGDATA_DB) {
    try {
      const historyRows = domain22 ? await env22.BIGDATA_DB.prepare("SELECT gerado_em, domain, data_criacao FROM mtasts_history WHERE domain = ? ORDER BY id DESC LIMIT ?").bind(domain22, limit).all() : await env22.BIGDATA_DB.prepare("SELECT gerado_em, domain, data_criacao FROM mtasts_history ORDER BY id DESC LIMIT ?").bind(limit).all();
      const policyRows = domain22 ? await env22.BIGDATA_DB.prepare("SELECT domain, policy_text, tlsrpt_email, updated_at FROM mtasts_mta_sts_policies WHERE domain = ? ORDER BY updated_at DESC LIMIT 10").bind(domain22).all() : await env22.BIGDATA_DB.prepare("SELECT domain, policy_text, tlsrpt_email, updated_at FROM mtasts_mta_sts_policies ORDER BY updated_at DESC").all();
      const history = (historyRows.results ?? []).map((row) => mapHistoryRow(row)).filter((item) => item !== null);
      const policies = (policyRows.results ?? []).map((row) => mapPolicyRow(row)).filter((item) => item !== null);
      const payload = {
        ok: true,
        fonte: "bigdata_db",
        filtros: { domain: domain22, limit },
        avisos,
        resumo: {
          totalHistorico: history.length,
          totalPolicies: policies.length
        },
        historico: history,
        policies
      };
      try {
        await logModuleOperationalEvent(env22.BIGDATA_DB, {
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
        ...trace32
      }), {
        headers: toResponseHeaders4()
      });
    } catch (error32) {
      const message2 = error32 instanceof Error ? error32.message : "Falha ao consultar bigdata_db";
      avisos.push(`Leitura em modo D1 indispon\xEDvel: ${message2}`);
    }
  }
  const message = "BIGDATA_DB indispon\xEDvel para leitura de overview do MTA-STS.";
  return new Response(JSON.stringify({
    ok: false,
    ...trace32,
    error: message,
    filtros: { domain: domain22, limit },
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
__name(onRequestGet26, "onRequestGet26");
var toResponseHeaders4;
var parseLimit4;
var normalizeDomain2;
var mapHistoryRow;
var mapPolicyRow;
var init_overview4 = __esm({
  "api/mtasts/overview.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_request_trace();
    toResponseHeaders4 = /* @__PURE__ */ __name2(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toResponseHeaders");
    parseLimit4 = /* @__PURE__ */ __name2((rawValue) => {
      const parsed = Number.parseInt(rawValue ?? "30", 10);
      if (!Number.isFinite(parsed)) {
        return 30;
      }
      return Math.min(100, Math.max(1, parsed));
    }, "parseLimit");
    normalizeDomain2 = /* @__PURE__ */ __name2((rawValue) => String(rawValue ?? "").trim().toLowerCase(), "normalizeDomain");
    mapHistoryRow = /* @__PURE__ */ __name2((row) => {
      const geradoEm = String(row.gerado_em ?? "").trim();
      if (!geradoEm) {
        return null;
      }
      return {
        geradoEm,
        domain: row.domain == null ? null : String(row.domain).trim().toLowerCase()
      };
    }, "mapHistoryRow");
    mapPolicyRow = /* @__PURE__ */ __name2((row) => {
      const domain22 = String(row.domain ?? "").trim().toLowerCase();
      const policyText = String(row.policy_text ?? "").trim();
      if (!domain22 || !policyText) {
        return null;
      }
      return {
        domain: domain22,
        policyText,
        tlsrptEmail: row.tlsrpt_email == null ? null : String(row.tlsrpt_email).trim().toLowerCase(),
        updatedAt: row.updated_at == null ? null : String(row.updated_at)
      };
    }, "mapPolicyRow");
    __name2(onRequestGet26, "onRequestGet");
  }
});
async function onRequestGet27(context22) {
  const trace32 = createResponseTrace(context22.request);
  const url = new URL(context22.request.url);
  const domain22 = normalizeDomain3(url.searchParams.get("domain"));
  const zoneId = String(url.searchParams.get("zoneId") ?? "").trim();
  if (!domain22 || !zoneId) {
    return toError12("Par\xE2metros domain e zoneId s\xE3o obrigat\xF3rios.", trace32, 400);
  }
  try {
    const dnsSnapshot = await getCloudflareDnsSnapshot(context22.env, domain22, zoneId);
    let savedPolicy = null;
    let savedEmail = null;
    let lastGeneratedId = null;
    if (context22.env.BIGDATA_DB) {
      const policyRow = await context22.env.BIGDATA_DB.prepare(`
        SELECT policy_text, tlsrpt_email
        FROM mtasts_mta_sts_policies
        WHERE domain = ?
        LIMIT 1
      `).bind(domain22).first();
      const historyRow = await context22.env.BIGDATA_DB.prepare(`
        SELECT gerado_em
        FROM mtasts_history
        WHERE domain = ?
        ORDER BY id DESC
        LIMIT 1
      `).bind(domain22).first();
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
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
          module: "mtasts",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: true,
          metadata: {
            action: "policy-read",
            provider: "cloudflare-api",
            domain: domain22,
            hasSavedPolicy: Boolean(mapped.savedPolicy)
          }
        });
      } catch {
      }
    }
    return new Response(JSON.stringify({
      ok: true,
      ...trace32,
      domain: domain22,
      zoneId,
      policy: mapped
    }), {
      headers: toHeaders18()
    });
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Falha ao carregar policy do dom\xEDnio";
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
          module: "mtasts",
          source: "bigdata_db",
          fallbackUsed: false,
          ok: false,
          errorMessage: message,
          metadata: {
            action: "policy-read",
            provider: "cloudflare-api",
            domain: domain22
          }
        });
      } catch {
      }
    }
    return toError12(message, trace32, 502);
  }
}
__name(onRequestGet27, "onRequestGet27");
var normalizeDomain3;
var toHeaders18;
var toError12;
var init_policy = __esm({
  "api/mtasts/policy.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_request_trace();
    init_cloudflare_api();
    normalizeDomain3 = /* @__PURE__ */ __name2((rawValue) => String(rawValue ?? "").trim().toLowerCase(), "normalizeDomain");
    toHeaders18 = /* @__PURE__ */ __name2(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    toError12 = /* @__PURE__ */ __name2((message, trace32, status = 500) => new Response(JSON.stringify({
      ok: false,
      ...trace32,
      error: message
    }), {
      status,
      headers: toHeaders18()
    }), "toError");
    __name2(onRequestGet27, "onRequestGet");
  }
});
async function onRequestPost30(context22) {
  const { env: env22 } = context22;
  if (!env22.BIGDATA_DB) {
    return new Response(JSON.stringify({
      ok: false,
      error: "BIGDATA_DB n\xE3o configurado no runtime."
    }), {
      status: 503,
      headers: toHeaders19()
    });
  }
  const startedAt = Date.now();
  const syncRunId = await startSyncRun(env22.BIGDATA_DB, {
    module: "mtasts",
    status: "running",
    startedAt,
    metadata: {}
  });
  try {
    const [zones, historyRowsRaw, policyRowsRaw] = await Promise.all([
      listCloudflareZones(env22),
      env22.BIGDATA_DB.prepare("SELECT gerado_em, domain FROM mtasts_history ORDER BY id DESC").all(),
      env22.BIGDATA_DB.prepare("SELECT domain, policy_text, tlsrpt_email FROM mtasts_mta_sts_policies").all()
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
        dns: await getCloudflareDnsSnapshot(env22, zone.name, zone.id)
      }))
    );
    let historyUpserted = 0;
    let policiesUpserted = 0;
    for (const row of historyRows) {
      await env22.BIGDATA_DB.prepare(`
        INSERT INTO mtasts_history (gerado_em, domain, data_criacao)
        VALUES (?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(gerado_em) DO UPDATE SET
          domain = excluded.domain
      `).bind(row.geradoEm, row.domain).run();
      historyUpserted += 1;
    }
    for (const item of dnsSnapshots) {
      const domain22 = item.zone.name;
      const existing = policyByDomain.get(domain22);
      const policyText = existing?.policyText;
      if (!policyText) {
        continue;
      }
      await env22.BIGDATA_DB.prepare(`
        INSERT INTO mtasts_mta_sts_policies (domain, policy_text, tlsrpt_email, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(domain) DO UPDATE SET
          policy_text = excluded.policy_text,
          tlsrpt_email = excluded.tlsrpt_email,
          updated_at = CURRENT_TIMESTAMP
      `).bind(domain22, policyText, item.dns.dnsTlsRptEmail ?? existing.tlsrptEmail).run();
      policiesUpserted += 1;
    }
    const recordsRead = historyRows.length + dnsSnapshots.length;
    const recordsUpserted = historyUpserted + policiesUpserted;
    await finishSyncRun(env22.BIGDATA_DB, {
      id: syncRunId,
      status: "success",
      finishedAt: Date.now(),
      recordsRead,
      recordsUpserted
    });
    await logModuleOperationalEvent(env22.BIGDATA_DB, {
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
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Falha inesperada no sync do MTA-STS";
    await finishSyncRun(env22.BIGDATA_DB, {
      id: syncRunId,
      status: "error",
      finishedAt: Date.now(),
      recordsRead: 0,
      recordsUpserted: 0,
      errorMessage: message
    });
    await logModuleOperationalEvent(env22.BIGDATA_DB, {
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
__name(onRequestPost30, "onRequestPost30");
var toHeaders19;
var init_sync4 = __esm({
  "api/mtasts/sync.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_cloudflare_api();
    toHeaders19 = /* @__PURE__ */ __name2(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    __name2(onRequestPost30, "onRequestPost");
  }
});
async function onRequestGet28(context22) {
  const trace32 = createResponseTrace(context22.request);
  try {
    const payload = await listCloudflareZones(context22.env);
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
      ...trace32,
      fonte: "cloudflare-api",
      zones: payload
    }), {
      headers: toHeaders20()
    });
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Falha ao carregar zonas do MTA-STS";
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return toError13(message, trace32, 502);
  }
}
__name(onRequestGet28, "onRequestGet28");
var toHeaders20;
var toError13;
var init_zones2 = __esm({
  "api/mtasts/zones.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_request_trace();
    init_cloudflare_api();
    toHeaders20 = /* @__PURE__ */ __name2(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    toError13 = /* @__PURE__ */ __name2((message, trace32, status = 500) => new Response(JSON.stringify({
      ok: false,
      ...trace32,
      error: message
    }), {
      status,
      headers: toHeaders20()
    }), "toError");
    __name2(onRequestGet28, "onRequestGet");
  }
});
function normalize(text) {
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}
__name(normalize, "normalize");
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
__name(searchCurated, "searchCurated");
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
__name(buildGoogleNewsSuggestion, "buildGoogleNewsSuggestion");
async function discoverWithGemini(query, apiKey) {
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
    return parsed.filter((item) => item.name && item.url && item.category).slice(0, 5).map((item, index) => ({
      id: `gemini-${index}-${slugify(item.name)}`,
      name: item.name,
      url: item.url,
      category: item.category,
      source: "gemini-ai"
    }));
  } catch (error32) {
    console.warn("[discover] Gemini discovery failed:", error32);
    return [];
  }
}
__name(discoverWithGemini, "discoverWithGemini");
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
      const title22 = titleMatch ? titleMatch[1] : parsed.hostname.replace("www.", "");
      results.push({
        id: `detected-${slugify(title22)}-${results.length}`,
        name: cleanHtmlEntities(title22),
        url: feedUrl,
        category: "Detectado",
        source: "auto-detect"
      });
    }
    return results;
  } catch (error32) {
    console.warn("[discover] Auto-detect failed:", error32);
    return [];
  }
}
__name(autoDetectRss, "autoDetectRss");
function slugify(name) {
  return name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
__name(slugify, "slugify");
function cleanHtmlEntities(text) {
  return text.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}
__name(cleanHtmlEntities, "cleanHtmlEntities");
var DIRECTORY;
var onRequestGet29;
var init_discover = __esm({
  "api/news/discover.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
    __name2(normalize, "normalize");
    __name2(searchCurated, "searchCurated");
    __name2(buildGoogleNewsSuggestion, "buildGoogleNewsSuggestion");
    __name2(discoverWithGemini, "discoverWithGemini");
    __name2(autoDetectRss, "autoDetectRss");
    __name2(slugify, "slugify");
    __name2(cleanHtmlEntities, "cleanHtmlEntities");
    onRequestGet29 = /* @__PURE__ */ __name2(async (context22) => {
      const url = new URL(context22.request.url);
      const query = (url.searchParams.get("q") || "").trim();
      const field = url.searchParams.get("field") || "name";
      if (!query || query.length < 2) {
        return new Response(JSON.stringify({ ok: true, suggestions: [] }), {
          headers: { "Content-Type": "application/json; charset=utf-8" }
        });
      }
      const suggestions = [];
      const seenUrls = /* @__PURE__ */ new Set();
      const addUnique = /* @__PURE__ */ __name2((items) => {
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
      const apiKey = context22.env.GEMINI_API_KEY;
      if (apiKey && query.length >= 3) {
        try {
          const geminiResults = await Promise.race([
            discoverWithGemini(query, apiKey),
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
__name(detectCharset, "detectCharset");
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
__name(normalizeCharset, "normalizeCharset");
function parseRSSFeed(xmlText, sourceName, sourceId, maxItems) {
  const items = [];
  const itemRegex = /<item[\s>]([\s\S]*?)<\/item>/gi;
  let match2;
  while ((match2 = itemRegex.exec(xmlText)) !== null && items.length < maxItems) {
    const block = match2[1];
    const title22 = extractTag(block, "title");
    const link = extractTag(block, "link");
    const pubDate = extractTag(block, "pubDate") || extractTag(block, "dc:date");
    if (!title22 || !link) continue;
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
      title: cleanHtml(title22),
      link,
      source: sourceName,
      pubDate: pubDate || (/* @__PURE__ */ new Date()).toISOString(),
      timestamp: isNaN(timestamp) ? 0 : timestamp,
      thumbnail
    });
  }
  return items;
}
__name(parseRSSFeed, "parseRSSFeed");
function extractTag(block, tag) {
  const cdataRegex = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, "i");
  const cdataMatch = block.match(cdataRegex);
  if (cdataMatch) return cdataMatch[1].trim();
  const simpleRegex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i");
  const simpleMatch = block.match(simpleRegex);
  if (simpleMatch) return simpleMatch[1].trim();
  return "";
}
__name(extractTag, "extractTag");
function cleanHtml(text) {
  return text.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ").replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code))).replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))).trim();
}
__name(cleanHtml, "cleanHtml");
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
  } catch (error32) {
    console.warn(`[news] Erro ao buscar feed ${source.name}:`, error32);
    return [];
  }
}
__name(fetchFeed, "fetchFeed");
var RSS_SOURCES;
var DEFAULT_MAX_ITEMS;
var CACHE_TTL_SECONDS;
var onRequestGet30;
var init_feed = __esm({
  "api/news/feed.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
    __name2(detectCharset, "detectCharset");
    __name2(normalizeCharset, "normalizeCharset");
    __name2(parseRSSFeed, "parseRSSFeed");
    __name2(extractTag, "extractTag");
    __name2(cleanHtml, "cleanHtml");
    __name2(fetchFeed, "fetchFeed");
    onRequestGet30 = /* @__PURE__ */ __name2(async (context22) => {
      const url = new URL(context22.request.url);
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
      const cacheKey = new Request(url.toString(), context22.request);
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
      context22.waitUntil(cache.put(cacheKey, response.clone()));
      return response;
    }, "onRequestGet");
  }
});
function json10(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(json10, "json10");
function resolveToken3(env22) {
  return env22.CF_API_TOKEN?.trim() || env22.CLOUDFLARE_API_TOKEN?.trim() || "";
}
__name(resolveToken3, "resolveToken3");
var onRequestGet31;
var onRequestPut5;
var init_cron = __esm({
  "api/oraculo/cron.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name2(json10, "json");
    __name2(resolveToken3, "resolveToken");
    onRequestGet31 = /* @__PURE__ */ __name2(async ({ env: env22 }) => {
      console.log("[oraculo/cron] GET \u2014 Lendo schedule atual do worker cron-taxa-ipca");
      const token = resolveToken3(env22);
      const accountId = env22.CF_ACCOUNT_ID?.trim();
      if (!token || !accountId) {
        console.error("[oraculo/cron] GET \u2014 CF_API_TOKEN ou CF_ACCOUNT_ID ausente");
        return json10({ ok: false, error: "CF_API_TOKEN ou CF_ACCOUNT_ID ausente." }, 503);
      }
      try {
        const res = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/workers/scripts/cron-taxa-ipca/schedules`,
          { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } }
        );
        const data = await res.json();
        if (!res.ok || !data.success) {
          const msg = data.errors?.[0]?.message || `HTTP ${res.status}`;
          return json10({ ok: false, error: `Falha ao ler cron: ${msg}` }, 502);
        }
        const schedules = data.result?.schedules ?? [];
        console.log(`[oraculo/cron] GET \u2014 Schedule atual: ${JSON.stringify(schedules)}`);
        return json10({ ok: true, schedules });
      } catch (err) {
        console.error(`[oraculo/cron] GET \u2014 Erro: ${err instanceof Error ? err.message : err}`);
        return json10({ ok: false, error: err instanceof Error ? err.message : "Erro interno." }, 500);
      }
    }, "onRequestGet");
    onRequestPut5 = /* @__PURE__ */ __name2(async ({ env: env22, request }) => {
      const token = resolveToken3(env22);
      const accountId = env22.CF_ACCOUNT_ID?.trim();
      if (!token || !accountId) {
        return json10({ ok: false, error: "CF_API_TOKEN ou CF_ACCOUNT_ID ausente." }, 503);
      }
      let body;
      try {
        body = await request.json();
      } catch {
        return json10({ ok: false, error: 'Body inv\xE1lido (esperado JSON com campo "cron").' }, 400);
      }
      const cronExpr = body.cron?.trim();
      if (!cronExpr) {
        return json10({ ok: false, error: 'Campo "cron" \xE9 obrigat\xF3rio.' }, 400);
      }
      const parts = cronExpr.split(/\s+/);
      if (parts.length !== 5) {
        return json10({ ok: false, error: `Express\xE3o cron inv\xE1lida: esperado 5 segmentos, recebido ${parts.length}.` }, 400);
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
          return json10({ ok: false, error: `Falha ao atualizar cron: ${msg}` }, 502);
        }
        const schedules = data.result?.schedules ?? [];
        console.log(`[oraculo/cron] Cron atualizado com sucesso: ${JSON.stringify(schedules)}`);
        return json10({ ok: true, schedules, message: `Cron atualizado para: ${cronExpr}` });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Erro interno.";
        console.error(`[oraculo/cron] Erro: ${msg}`);
        return json10({ ok: false, error: msg }, 500);
      }
    }, "onRequestPut");
  }
});
var onRequestPost31;
var init_excluir2 = __esm({
  "api/oraculo/excluir.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    onRequestPost31 = /* @__PURE__ */ __name2(async ({ env: env22, request }) => {
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
      const db = env22?.BIGDATA_DB;
      if (!db || typeof db.prepare !== "function") {
        return new Response(JSON.stringify({ ok: false, error: "Database indispon\xEDvel." }), {
          status: 503,
          headers: { "Content-Type": "application/json" }
        });
      }
      try {
        const table32 = tipo === "lci-lca" ? "oraculo_lci_cdb_registros" : "oraculo_tesouro_ipca_lotes";
        const result = await db.prepare(`DELETE FROM ${table32} WHERE id = ?`).bind(id).run();
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
var onRequestGet32;
var init_listar2 = __esm({
  "api/oraculo/listar.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    onRequestGet32 = /* @__PURE__ */ __name2(async ({ env: env22, request }) => {
      const url = new URL(request.url);
      const tipo = url.searchParams.get("tipo") ?? "tesouro-ipca";
      const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);
      const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);
      const db = env22?.BIGDATA_DB;
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
function json11(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(json11, "json11");
var onRequestGet33;
var init_modelos3 = __esm({
  "api/oraculo/modelos.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name2(json11, "json");
    onRequestGet33 = /* @__PURE__ */ __name2(async ({ env: env22 }) => {
      const apiKey = env22?.GEMINI_API_KEY;
      if (!apiKey) return json11({ ok: false, error: "GEMINI_API_KEY n\xE3o configurada." }, 503);
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
        return json11({ ok: true, models, total: models.length });
      } catch (err) {
        return json11({ ok: false, error: err instanceof Error ? err.message : "Erro ao listar modelos." }, 500);
      }
    }, "onRequestGet");
  }
});
var DEFAULT_POLICIES3;
var SUPPORTED_ROUTES3;
var toDbRoute2;
var toHeaders21;
var toInt3;
var ensureRateLimitTables3;
var ensureDefaultPolicies3;
var getRateLimitWindowStats3;
var listPoliciesWithStats3;
var upsertRateLimitPolicy3;
var resetRateLimitPolicy3;
var init_oraculo_admin = __esm({
  "api/_lib/oraculo-admin.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
    toDbRoute2 = /* @__PURE__ */ __name2((route) => route.startsWith("oraculo/") ? route : `oraculo/${route}`, "toDbRoute");
    toHeaders21 = /* @__PURE__ */ __name2(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toHeaders");
    toInt3 = /* @__PURE__ */ __name2((value, fallback) => {
      const parsed = Number.parseInt(String(value), 10);
      return Number.isFinite(parsed) ? parsed : fallback;
    }, "toInt");
    ensureRateLimitTables3 = /* @__PURE__ */ __name2(async (db) => {
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
    ensureDefaultPolicies3 = /* @__PURE__ */ __name2(async (db) => {
      await ensureRateLimitTables3(db);
      for (const route of SUPPORTED_ROUTES3) {
        const policy = DEFAULT_POLICIES3[route];
        await db.prepare(`
      INSERT OR IGNORE INTO oraculo_rate_limit_policies (route, enabled, max_requests, window_minutes)
      VALUES (?, ?, ?, ?)
    `).bind(toDbRoute2(policy.route), policy.enabled, policy.max_requests, policy.window_minutes).run();
      }
    }, "ensureDefaultPolicies");
    getRateLimitWindowStats3 = /* @__PURE__ */ __name2(async (db, route, windowMinutes) => {
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
    listPoliciesWithStats3 = /* @__PURE__ */ __name2(async (db) => {
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
    upsertRateLimitPolicy3 = /* @__PURE__ */ __name2(async (db, input) => {
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
    resetRateLimitPolicy3 = /* @__PURE__ */ __name2(async (db, route) => {
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
async function onRequestGet34(context22) {
  const trace32 = createResponseTrace(context22.request);
  const db = resolveRateLimitDb3(context22);
  const source = resolveOperationalSource6();
  if (!db) {
    return json12({ ok: false, error: "Nenhum binding D1 dispon\xEDvel (BIGDATA_DB).", ...trace32 }, 503);
  }
  try {
    const adminActor = resolveAdminActorFromRequest(context22.request);
    const policies = await listPoliciesWithStats3(db);
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return json12({ ok: true, policies, admin_actor: adminActor, ...trace32 });
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Falha ao carregar painel de rate limit do Or\xE1culo";
    const fallbackPolicies = buildFallbackPolicies2();
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return json12({
      ok: true,
      warnings: [message, "Fallback de pol\xEDticas padr\xE3o aplicado para evitar indisponibilidade do painel."],
      policies: fallbackPolicies,
      ...trace32
    }, 200);
  }
}
__name(onRequestGet34, "onRequestGet34");
async function onRequestPost32(context22) {
  const trace32 = createResponseTrace(context22.request);
  const db = resolveRateLimitDb3(context22);
  const source = resolveOperationalSource6();
  if (!db) {
    return json12({ ok: false, error: "Nenhum binding D1 dispon\xEDvel (BIGDATA_DB).", ...trace32 }, 503);
  }
  try {
    const body = await context22.request.json();
    const adminActor = resolveAdminActorFromRequest(context22.request, body);
    const route = normalizeRoute4(body.route);
    if (!route) {
      return json12({ ok: false, error: "Rota de rate limit inv\xE1lida.", ...trace32 }, 400);
    }
    const action = String(body.action ?? "update").trim();
    if (action === "restore_default") {
      await resetRateLimitPolicy3(db, route);
      const policies2 = await listPoliciesWithStats3(db);
      if (context22.env.BIGDATA_DB) {
        try {
          await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
      return json12({ ok: true, action: "restore_default", policies: policies2, admin_actor: adminActor, ...trace32 });
    }
    const enabled = body.enabled ? 1 : 0;
    const maxRequests = toPositiveInt4(body.max_requests, 10);
    const windowMinutes = toPositiveInt4(body.window_minutes, 10);
    if (maxRequests > 500 || windowMinutes > 1440) {
      return json12({ ok: false, error: "Par\xE2metros fora da faixa permitida.", ...trace32 }, 400);
    }
    await upsertRateLimitPolicy3(db, {
      route,
      enabled,
      maxRequests,
      windowMinutes
    });
    const policies = await listPoliciesWithStats3(db);
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return json12({ ok: true, action: "update", policies, admin_actor: adminActor, ...trace32 });
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Falha ao salvar painel de rate limit do Or\xE1culo";
    if (context22.env.BIGDATA_DB) {
      try {
        await logModuleOperationalEvent(context22.env.BIGDATA_DB, {
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
    return json12({ ok: false, error: message, ...trace32 }, 500);
  }
}
__name(onRequestPost32, "onRequestPost32");
var json12;
var normalizeRoute4;
var toPositiveInt4;
var buildFallbackPolicies2;
var resolveRateLimitDb3;
var resolveOperationalSource6;
var init_rate_limit4 = __esm({
  "api/oraculo/rate-limit.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_oraculo_admin();
    init_admin_actor();
    init_request_trace();
    json12 = /* @__PURE__ */ __name2((data, status = 200) => new Response(JSON.stringify(data), {
      status,
      headers: toHeaders21()
    }), "json");
    normalizeRoute4 = /* @__PURE__ */ __name2((value) => {
      const route = String(value ?? "").trim();
      if (SUPPORTED_ROUTES3.includes(route)) {
        return route;
      }
      return null;
    }, "normalizeRoute");
    toPositiveInt4 = /* @__PURE__ */ __name2((value, fallback) => {
      const parsed = Number.parseInt(String(value), 10);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
      }
      return parsed;
    }, "toPositiveInt");
    buildFallbackPolicies2 = /* @__PURE__ */ __name2(() => [
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
    resolveRateLimitDb3 = /* @__PURE__ */ __name2((context22) => context22.env.BIGDATA_DB, "resolveRateLimitDb");
    resolveOperationalSource6 = /* @__PURE__ */ __name2(() => "bigdata_db", "resolveOperationalSource");
    __name2(onRequestGet34, "onRequestGet");
    __name2(onRequestPost32, "onRequestPost");
  }
});
function json13(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(json13, "json13");
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
  __name2(dateKey, "dateKey");
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
__name(parseCSV, "parseCSV");
var onRequestGet35;
var init_taxacache = __esm({
  "api/oraculo/taxacache.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name2(json13, "json");
    __name2(parseCSV, "parseCSV");
    onRequestGet35 = /* @__PURE__ */ __name2(async ({ env: env22, request }) => {
      const db = env22?.BIGDATA_DB;
      if (!db || typeof db.prepare !== "function")
        return json13({ ok: false, error: "BIGDATA_DB indispon\xEDvel." }, 503);
      const url = new URL(request.url);
      const force = url.searchParams.get("force") === "true";
      try {
        const hoje = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
        const cacheRow = await db.prepare(
          "SELECT data_referencia, taxa_indicativa, vencimentos_json, atualizado_em FROM oraculo_taxa_ipca_cache WHERE id = ? LIMIT 1"
        ).bind("latest").first();
        if (!force && cacheRow && cacheRow.atualizado_em?.startsWith(hoje)) {
          return json13({
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
            return json13({
              ok: true,
              fonte: "cache-stale",
              dataReferencia: cacheRow.data_referencia,
              taxaMediaIndicativa: cacheRow.taxa_indicativa,
              atualizadoEm: cacheRow.atualizado_em,
              titulos: JSON.parse(cacheRow.vencimentos_json)
            });
          }
          return json13({ ok: false, error: `CSV indispon\xEDvel (HTTP ${csvRes.status}).` }, 502);
        }
        const csvText = await csvRes.text();
        const { titulos, totalLines, sampleRow } = parseCSV(csvText);
        if (titulos.length === 0) {
          if (cacheRow) {
            return json13({
              ok: true,
              fonte: "cache-stale",
              dataReferencia: cacheRow.data_referencia,
              taxaMediaIndicativa: cacheRow.taxa_indicativa,
              atualizadoEm: cacheRow.atualizado_em,
              titulos: JSON.parse(cacheRow.vencimentos_json)
            });
          }
          return json13({
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
        return json13({
          ok: true,
          fonte: "tesouro-transparente",
          dataReferencia: dataRef,
          taxaMediaIndicativa: taxaMedia,
          atualizadoEm: agora,
          titulos
        });
      } catch (err) {
        return json13({ ok: false, error: err instanceof Error ? err.message : "Erro interno." }, 500);
      }
    }, "onRequestGet");
  }
});
function jsonResponse3(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}
__name(jsonResponse3, "jsonResponse3");
var onRequestGet36;
var onRequestDelete5;
var init_userdata2 = __esm({
  "api/oraculo/userdata.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name2(jsonResponse3, "jsonResponse");
    onRequestGet36 = /* @__PURE__ */ __name2(async ({ env: env22, request }) => {
      const db = env22?.BIGDATA_DB;
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
      } catch (error32) {
        return jsonResponse3({
          ok: false,
          error: error32 instanceof Error ? error32.message : "Erro ao listar dados de usu\xE1rios."
        }, 500);
      }
    }, "onRequestGet");
    onRequestDelete5 = /* @__PURE__ */ __name2(async ({ env: env22, request }) => {
      const db = env22?.BIGDATA_DB;
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
      } catch (error32) {
        console.error("[oraculo/userdata DELETE] Erro:", error32);
        return jsonResponse3({
          ok: false,
          error: error32 instanceof Error ? error32.message : "Erro ao excluir registro."
        }, 500);
      }
    }, "onRequestDelete");
  }
});
async function onRequestGet37(context22) {
  const { env: env22 } = context22;
  const trace32 = createResponseTrace(context22.request);
  if (!env22.BIGDATA_DB) {
    return new Response(JSON.stringify({
      ok: true,
      ...trace32,
      source: "no-bigdata-binding",
      modules: [],
      sync: [],
      generatedAt: Date.now()
    }), { headers: toResponseHeaders5() });
  }
  try {
    await ensureOperationalTables(env22.BIGDATA_DB);
    const since = Date.now() - 24 * 60 * 60 * 1e3;
    const eventsAgg = await env22.BIGDATA_DB.prepare(`
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
    const syncAgg = await env22.BIGDATA_DB.prepare(`
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
      ...trace32,
      source: "bigdata_db",
      generatedAt: Date.now(),
      modules,
      sync
    }), { headers: toResponseHeaders5() });
  } catch (error32) {
    const message = error32 instanceof Error ? error32.message : "Erro operacional desconhecido";
    return new Response(JSON.stringify({
      ok: false,
      ...trace32,
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
__name(onRequestGet37, "onRequestGet37");
var toResponseHeaders5;
var init_operational2 = __esm({
  "api/overview/operational.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_request_trace();
    toResponseHeaders5 = /* @__PURE__ */ __name2(() => ({
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }), "toResponseHeaders");
    __name2(onRequestGet37, "onRequestGet");
  }
});
async function onRequestDelete6(context22) {
  const { env: env22 } = context22;
  const trace32 = createResponseTrace(context22.request);
  const db = env22.BIGDATA_DB;
  if (!db) {
    return new Response(JSON.stringify({ ok: false, error: "Binding BIGDATA_DB indispon\xEDvel.", ...trace32 }), { status: 503, headers: { "Content-Type": "application/json" } });
  }
  const url = new URL(context22.request.url);
  const table32 = url.searchParams.get("table");
  const id = url.searchParams.get("id");
  if (!table32 || !id) {
    return new Response(JSON.stringify({ ok: false, error: "Par\xE2metros obrigat\xF3rios: table, id.", ...trace32 }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  if (!ALLOWED_TABLES.includes(table32)) {
    return new Response(JSON.stringify({ ok: false, error: `Tabela "${table32}" n\xE3o permitida.`, ...trace32 }), { status: 403, headers: { "Content-Type": "application/json" } });
  }
  try {
    await db.prepare(`DELETE FROM ${table32} WHERE id = ?`).bind(Number(id)).run();
    return new Response(JSON.stringify({ ok: true, ...trace32, deleted: { table: table32, id: Number(id) } }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro ao excluir registro.";
    return new Response(JSON.stringify({ ok: false, error: message, ...trace32 }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
__name(onRequestDelete6, "onRequestDelete6");
var ALLOWED_TABLES;
var init_delete3 = __esm({
  "api/telemetry/delete.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
    __name2(onRequestDelete6, "onRequestDelete");
  }
});
async function onRequestGet38(context22) {
  const { env: env22 } = context22;
  const trace32 = createResponseTrace(context22.request);
  const db = env22.BIGDATA_DB;
  if (!db) {
    return new Response(JSON.stringify({ ok: false, error: "Binding BIGDATA_DB indispon\xEDvel.", ...trace32 }), { status: 503, headers: headers() });
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
    const safeQuery = /* @__PURE__ */ __name2(async (query) => {
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
      ...trace32,
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
    return new Response(JSON.stringify({ ok: false, error: message, ...trace32 }), { status: 500, headers: headers() });
  }
}
__name(onRequestGet38, "onRequestGet38");
var headers;
var init_telemetry = __esm({
  "api/telemetry/telemetry.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    init_operational();
    init_request_trace();
    headers = /* @__PURE__ */ __name2(() => ({ "Content-Type": "application/json", "Cache-Control": "no-store" }), "headers");
    __name2(onRequestGet38, "onRequestGet");
  }
});
var onRequest;
var init_path = __esm({
  "api/tlsrpt/[[path]].ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    onRequest = /* @__PURE__ */ __name2(async (context22) => {
      const url = new URL(context22.request.url);
      const backendPath = url.pathname.replace("/api/tlsrpt", "") || "/";
      const backendUrl = new URL(backendPath + url.search, "http://worker.localhost");
      const serviceRequest = new Request(backendUrl.toString(), context22.request);
      try {
        const response = await context22.env.TLSRPT_MOTOR.fetch(serviceRequest);
        return response;
      } catch (error32) {
        const message = error32 instanceof Error ? error32.message : String(error32);
        return new Response(JSON.stringify({ error: "Erro no proxy interno: " + message }), {
          status: 502,
          headers: { "Content-Type": "application/json" }
        });
      }
    }, "onRequest");
  }
});
async function onRequestGet39() {
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
__name(onRequestGet39, "onRequestGet39");
var init_health = __esm({
  "api/health.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
    init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
    init_performance2();
    __name2(onRequestGet39, "onRequestGet");
  }
});
function createJsonHeaders(additional, secure = true) {
  const base = secure ? SECURE_HEADERS : STANDARD_JSON_HEADERS;
  return {
    ...base,
    ...additional || {}
  };
}
__name(createJsonHeaders, "createJsonHeaders");
function jsonResponse4(body, status = 200, additional) {
  return new Response(JSON.stringify(body), {
    status,
    headers: createJsonHeaders(additional)
  });
}
__name(jsonResponse4, "jsonResponse4");
function errorResponse(message, status = 400, details) {
  const body = {
    error: message
  };
  if (details) {
    body.details = details;
  }
  return jsonResponse4(body, status);
}
__name(errorResponse, "errorResponse");
function successResponse(data, status = 200) {
  return jsonResponse4(
    {
      success: true,
      data
    },
    status
  );
}
__name(successResponse, "successResponse");
var STANDARD_JSON_HEADERS;
var SECURE_HEADERS;
var CACHEABLE_HEADERS;
var init_http_common = __esm({
  "api/_lib/http-common.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
    __name2(createJsonHeaders, "createJsonHeaders");
    __name2(jsonResponse4, "jsonResponse");
    __name2(errorResponse, "errorResponse");
    __name2(successResponse, "successResponse");
  }
});
function validateConfig(config22) {
  if (!config22 || typeof config22 !== "object") {
    return { valid: false, error: "Configuration must be an object" };
  }
  const cfg = config22;
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
__name(validateConfig, "validateConfig");
async function handleGet() {
  try {
    return jsonResponse4(DEFAULT_CONFIG, 200);
  } catch (error32) {
    console.error("Failed to retrieve config:", error32);
    return errorResponse("Failed to retrieve configuration", 500);
  }
}
__name(handleGet, "handleGet");
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
  } catch (error32) {
    console.error("Failed to save config:", error32);
    return errorResponse("Failed to save configuration", 500);
  }
}
__name(handlePost, "handlePost");
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
  } catch (error32) {
    console.error("Failed to reset config:", error32);
    return errorResponse("Failed to reset configuration", 500);
  }
}
__name(handleDelete, "handleDelete");
async function onRequest2(context22) {
  const { request, env: env22 } = context22;
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
        return await handleDelete(request, env22);
      default:
        return errorResponse(`Method ${request.method} not allowed`, 405);
    }
  } catch (error32) {
    console.error("Config endpoint error:", error32);
    return errorResponse("Internal server error", 500);
  }
}
__name(onRequest2, "onRequest2");
var DEFAULT_CONFIG;
var init_config3 = __esm({
  "api/config.ts"() {
    "use strict";
    init_functionsRoutes_0_2367719624264596();
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
    __name2(validateConfig, "validateConfig");
    __name2(handleGet, "handleGet");
    __name2(handlePost, "handlePost");
    __name2(handleDelete, "handleDelete");
    __name2(onRequest2, "onRequest");
  }
});
var routes;
var init_functionsRoutes_0_2367719624264596 = __esm({
  "../.wrangler/tmp/pages-SfNyHM/functionsRoutes-0.2367719624264596.mjs"() {
    "use strict";
    init_transform();
    init_filename();
    init_config();
    init_config();
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
    init_delete2();
    init_financeiro();
    init_insights();
    init_mp_balance();
    init_mp_cancel();
    init_mp_refund();
    init_mp_sync();
    init_reindex_gateways();
    init_sumup_balance();
    init_sumup_cancel();
    init_sumup_refund();
    init_sumup_sync();
    init_modelos2();
    init_overview2();
    init_parametros();
    init_parametros();
    init_rate_limit2();
    init_rate_limit2();
    init_sync2();
    init_migrate_media_urls();
    init_overview3();
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
    init_modelos3();
    init_rate_limit4();
    init_rate_limit4();
    init_taxacache();
    init_userdata2();
    init_userdata2();
    init_operational2();
    init_delete3();
    init_telemetry();
    init_path();
    init_health();
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
        routePath: "/api/apphub/config",
        mountPath: "/api/apphub",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet3]
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
        modules: [onRequestPost2]
      },
      {
        routePath: "/api/astrologo/excluir",
        mountPath: "/api/astrologo",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost3]
      },
      {
        routePath: "/api/astrologo/ler",
        mountPath: "/api/astrologo",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost4]
      },
      {
        routePath: "/api/astrologo/listar",
        mountPath: "/api/astrologo",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet4]
      },
      {
        routePath: "/api/astrologo/modelos",
        mountPath: "/api/astrologo",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet5]
      },
      {
        routePath: "/api/astrologo/rate-limit",
        mountPath: "/api/astrologo",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet6]
      },
      {
        routePath: "/api/astrologo/rate-limit",
        mountPath: "/api/astrologo",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost5]
      },
      {
        routePath: "/api/astrologo/sync",
        mountPath: "/api/astrologo",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost6]
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
        modules: [onRequestGet7]
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
        modules: [onRequestGet8]
      },
      {
        routePath: "/api/cfdns/upsert",
        mountPath: "/api/cfdns",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost7]
      },
      {
        routePath: "/api/cfdns/zones",
        mountPath: "/api/cfdns",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet9]
      },
      {
        routePath: "/api/cfpw/cleanup-deployments",
        mountPath: "/api/cfpw",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet10]
      },
      {
        routePath: "/api/cfpw/cleanup-deployments",
        mountPath: "/api/cfpw",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost8]
      },
      {
        routePath: "/api/cfpw/delete-page",
        mountPath: "/api/cfpw",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost9]
      },
      {
        routePath: "/api/cfpw/delete-worker",
        mountPath: "/api/cfpw",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost10]
      },
      {
        routePath: "/api/cfpw/ops",
        mountPath: "/api/cfpw",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost11]
      },
      {
        routePath: "/api/cfpw/overview",
        mountPath: "/api/cfpw",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet11]
      },
      {
        routePath: "/api/cfpw/page-details",
        mountPath: "/api/cfpw",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet12]
      },
      {
        routePath: "/api/cfpw/worker-details",
        mountPath: "/api/cfpw",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet13]
      },
      {
        routePath: "/api/financeiro/delete",
        mountPath: "/api/financeiro",
        method: "DELETE",
        middlewares: [],
        modules: [onRequestDelete3]
      },
      {
        routePath: "/api/financeiro/financeiro",
        mountPath: "/api/financeiro",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet14]
      },
      {
        routePath: "/api/financeiro/insights",
        mountPath: "/api/financeiro",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet15]
      },
      {
        routePath: "/api/financeiro/mp-balance",
        mountPath: "/api/financeiro",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet16]
      },
      {
        routePath: "/api/financeiro/mp-cancel",
        mountPath: "/api/financeiro",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost12]
      },
      {
        routePath: "/api/financeiro/mp-refund",
        mountPath: "/api/financeiro",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost13]
      },
      {
        routePath: "/api/financeiro/mp-sync",
        mountPath: "/api/financeiro",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost14]
      },
      {
        routePath: "/api/financeiro/reindex-gateways",
        mountPath: "/api/financeiro",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost15]
      },
      {
        routePath: "/api/financeiro/sumup-balance",
        mountPath: "/api/financeiro",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet17]
      },
      {
        routePath: "/api/financeiro/sumup-cancel",
        mountPath: "/api/financeiro",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost16]
      },
      {
        routePath: "/api/financeiro/sumup-refund",
        mountPath: "/api/financeiro",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost17]
      },
      {
        routePath: "/api/financeiro/sumup-sync",
        mountPath: "/api/financeiro",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost18]
      },
      {
        routePath: "/api/itau/modelos",
        mountPath: "/api/itau",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet18]
      },
      {
        routePath: "/api/itau/overview",
        mountPath: "/api/itau",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet19]
      },
      {
        routePath: "/api/itau/parametros",
        mountPath: "/api/itau",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet20]
      },
      {
        routePath: "/api/itau/parametros",
        mountPath: "/api/itau",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost19]
      },
      {
        routePath: "/api/itau/rate-limit",
        mountPath: "/api/itau",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet21]
      },
      {
        routePath: "/api/itau/rate-limit",
        mountPath: "/api/itau",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost20]
      },
      {
        routePath: "/api/itau/sync",
        mountPath: "/api/itau",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost21]
      },
      {
        routePath: "/api/mainsite/migrate-media-urls",
        mountPath: "/api/mainsite",
        method: "POST",
        middlewares: [],
        modules: [onRequestPost22]
      },
      {
        routePath: "/api/mainsite/overview",
        mountPath: "/api/mainsite",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet22]
      },
      {
        routePath: "/api/mainsite/posts",
        mountPath: "/api/mainsite",
        method: "DELETE",
        middlewares: [],
        modules: [onRequestDelete4]
      },
      {
        routePath: "/api/mainsite/posts",
        mountPath: "/api/mainsite",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet23]
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
        modules: [onRequestGet24]
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
        modules: [onRequestGet25]
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
        modules: [onRequestGet26]
      },
      {
        routePath: "/api/mtasts/policy",
        mountPath: "/api/mtasts",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet27]
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
        modules: [onRequestGet28]
      },
      {
        routePath: "/api/news/discover",
        mountPath: "/api/news",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet29]
      },
      {
        routePath: "/api/news/feed",
        mountPath: "/api/news",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet30]
      },
      {
        routePath: "/api/oraculo/cron",
        mountPath: "/api/oraculo",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet31]
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
        modules: [onRequestGet32]
      },
      {
        routePath: "/api/oraculo/modelos",
        mountPath: "/api/oraculo",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet33]
      },
      {
        routePath: "/api/oraculo/rate-limit",
        mountPath: "/api/oraculo",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet34]
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
        modules: [onRequestGet35]
      },
      {
        routePath: "/api/oraculo/userdata",
        mountPath: "/api/oraculo",
        method: "DELETE",
        middlewares: [],
        modules: [onRequestDelete5]
      },
      {
        routePath: "/api/oraculo/userdata",
        mountPath: "/api/oraculo",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet36]
      },
      {
        routePath: "/api/overview/operational",
        mountPath: "/api/overview",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet37]
      },
      {
        routePath: "/api/telemetry/delete",
        mountPath: "/api/telemetry",
        method: "DELETE",
        middlewares: [],
        modules: [onRequestDelete6]
      },
      {
        routePath: "/api/telemetry/telemetry",
        mountPath: "/api/telemetry",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet38]
      },
      {
        routePath: "/api/tlsrpt/:path*",
        mountPath: "/api/tlsrpt",
        method: "",
        middlewares: [],
        modules: [onRequest]
      },
      {
        routePath: "/api/health",
        mountPath: "/api",
        method: "GET",
        middlewares: [],
        modules: [onRequestGet39]
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
init_functionsRoutes_0_2367719624264596();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
init_functionsRoutes_0_2367719624264596();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
init_functionsRoutes_0_2367719624264596();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
init_functionsRoutes_0_2367719624264596();
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
      var count32 = 1;
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
          count32--;
          if (count32 === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count32++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count32)
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
__name2(lexer, "lexer");
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
  var tryConsume = /* @__PURE__ */ __name2(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name2(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name2(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name2(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name2(function(prefix2) {
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
__name2(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
__name2(match, "match");
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
    var _loop_1 = /* @__PURE__ */ __name2(function(i2) {
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
__name2(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
__name2(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
__name2(flags, "flags");
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
__name2(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
__name2(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
__name2(stringToRegexp, "stringToRegexp");
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
__name2(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");
__name2(pathToRegexp, "pathToRegexp");
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
__name2(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env22, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name2(async (input, init) => {
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
        const context22 = {
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
          env: env22,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name2(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context22);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env22["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error32) {
      if (isFailOpen) {
        const response = await env22["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error32;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name2((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");
init_functionsRoutes_0_2367719624264596();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var drainBody = /* @__PURE__ */ __name2(async (request, env22, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env22);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;
init_functionsRoutes_0_2367719624264596();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
__name2(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name2(async (request, env22, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env22);
  } catch (e) {
    const error32 = reduceError(e);
    return Response.json(error32, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;
init_functionsRoutes_0_2367719624264596();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_process();
init_virtual_unenv_global_polyfill_cloudflare_unenv_preset_node_console();
init_performance2();
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
__name2(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env22, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env22, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
__name2(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env22, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env22, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");
__name2(__facade_invoke__, "__facade_invoke__");
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  static {
    __name(this, "___Facade_ScheduledController__");
  }
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name2(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name2(function(request, env22, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env22, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env22, ctx) {
      const dispatcher = /* @__PURE__ */ __name2(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env22, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env22, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
__name2(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name2((request, env22, ctx) => {
      this.env = env22;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name2((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
__name2(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody2 = /* @__PURE__ */ __name(async (request, env3, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env3);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default2 = drainBody2;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError2(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError2(e.cause)
  };
}
__name(reduceError2, "reduceError");
var jsonError2 = /* @__PURE__ */ __name(async (request, env3, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env3);
  } catch (e) {
    const error4 = reduceError2(e);
    return Response.json(error4, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default2 = jsonError2;

// .wrangler/tmp/bundle-WTPnby/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__2 = [
  middleware_ensure_req_body_drained_default2,
  middleware_miniflare3_json_error_default2
];
var middleware_insertion_facade_default2 = middleware_loader_entry_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__2 = [];
function __facade_register__2(...args) {
  __facade_middleware__2.push(...args.flat());
}
__name(__facade_register__2, "__facade_register__");
function __facade_invokeChain__2(request, env3, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__2(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env3, ctx, middlewareCtx);
}
__name(__facade_invokeChain__2, "__facade_invokeChain__");
function __facade_invoke__2(request, env3, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__2(request, env3, ctx, dispatch, [
    ...__facade_middleware__2,
    finalMiddleware
  ]);
}
__name(__facade_invoke__2, "__facade_invoke__");

// .wrangler/tmp/bundle-WTPnby/middleware-loader.entry.ts
var __Facade_ScheduledController__2 = class ___Facade_ScheduledController__2 {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__2)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler2(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env3, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env3, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env3, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__2(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env3, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__2(request, env3, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler2, "wrapExportedHandler");
function wrapWorkerEntrypoint2(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__2 === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__2.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__2) {
    __facade_register__2(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env3, ctx) => {
      this.env = env3;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__2(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__2(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint2, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY2;
if (typeof middleware_insertion_facade_default2 === "object") {
  WRAPPED_ENTRY2 = wrapExportedHandler2(middleware_insertion_facade_default2);
} else if (typeof middleware_insertion_facade_default2 === "function") {
  WRAPPED_ENTRY2 = wrapWorkerEntrypoint2(middleware_insertion_facade_default2);
}
var middleware_loader_entry_default2 = WRAPPED_ENTRY2;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__2 as __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default2 as default
};
//# sourceMappingURL=functionsWorker-0.08711767316538632.js.map
