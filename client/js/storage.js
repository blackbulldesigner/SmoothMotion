/**
 * MotionFlow Persistent Storage (Windows + macOS)
 */
(function () {
  "use strict";

  var _fs, _path, _os;
  var useNode = false;

  try {
    var req =
      (typeof window !== "undefined" && window.require) ||
      (typeof require !== "undefined" && require);
    if (req) {
      _path = req("path");
      _fs = req("fs");
      _os = req("os");
      useNode = !!(_path && _fs);
    }
  } catch (e) {
    console.warn("[SmoothMotion Storage] Node.js require failed, using CEP fallback.", e);
  }

  var STORAGE_DIR = "";
  var STORAGE_FILE = "";

  if (useNode) {
    try {
      var home = _os.homedir();
      var resolved = SmoothMotionPaths.resolveStoragePaths(home, _path);
      STORAGE_DIR = resolved.dir;
      STORAGE_FILE = resolved.file;
    } catch (e) {
      console.warn("[SmoothMotion Storage] Node path resolution failed:", e);
      useNode = false;
    }
  }

  if (!STORAGE_FILE && typeof window !== "undefined" && window.cep) {
    try {
      var homeDir = window.cep.fs.getHomeDirectory();
      var cepResolved = SmoothMotionPaths.resolveStoragePaths(homeDir, null);
      STORAGE_DIR = cepResolved.dir;
      STORAGE_FILE = cepResolved.file;
    } catch (e) {
      console.warn("[SmoothMotion Storage] CEP path resolution failed:", e);
    }
  }

  if (!STORAGE_FILE) {
    console.warn("[SmoothMotion Storage] Fallback to native localStorage.");
    return;
  }

  var dirCreated = false;
  if (useNode) {
    try {
      if (!_fs.existsSync(STORAGE_DIR)) {
        _fs.mkdirSync(STORAGE_DIR, { recursive: true });
      }
      dirCreated = true;
    } catch (e) {
      console.warn("[SmoothMotion Storage] Node mkdir failed:", e);
    }
  }

  if (!dirCreated && window.cep && window.cep.fs) {
    try {
      var mk = window.cep.fs.makedir(STORAGE_DIR);
      if (mk.err === 0 || mk.err === 9) dirCreated = true;
    } catch (e) {
      console.warn("[SmoothMotion Storage] CEP mkdir failed:", e);
    }
  }

  var _data = {};

  function _loadFromDisk() {
    var raw = "";
    var fileRead = false;

    if (useNode) {
      try {
        if (_fs.existsSync(STORAGE_FILE)) {
          raw = _fs.readFileSync(STORAGE_FILE, "utf8");
          fileRead = true;
        }
      } catch (e) {
        console.warn("[SmoothMotion Storage] Node read failed:", e);
      }
    }

    if (!fileRead && window.cep && window.cep.fs) {
      try {
        var result = window.cep.fs.readFile(STORAGE_FILE);
        if (result.err === 0) {
          raw = result.data;
          fileRead = true;
        }
      } catch (e) {
        console.warn("[SmoothMotion Storage] CEP read failed:", e);
      }
    }

    if (fileRead && raw) {
      try {
        _data = JSON.parse(raw) || {};
      } catch (e) {
        _data = {};
      }
    } else {
      _data = {};
      _tryLegacyStorage();
    }
  }

  function _readLegacyFile(legacyFile) {
    if (!legacyFile) return "";
    try {
      if (useNode && _fs.existsSync(legacyFile)) {
        return _fs.readFileSync(legacyFile, "utf8");
      }
      if (window.cep && window.cep.fs) {
        var r = window.cep.fs.readFile(legacyFile);
        if (r.err === 0) return r.data;
      }
    } catch (e) {}
    return "";
  }

  function _tryLegacyStorage() {
    var home = useNode && _os ? _os.homedir() : "";
    if (!home && window.cep) {
      try {
        home = window.cep.fs.getHomeDirectory();
      } catch (e) {}
    }
    var paths = SmoothMotionPaths.legacyStoragePaths(home, _path);
    for (var i = 0; i < paths.length; i++) {
      var legacyRaw = _readLegacyFile(paths[i]);
      if (legacyRaw) {
        _data = JSON.parse(legacyRaw) || {};
        _saveToDisk();
        console.log("[SmoothMotion Storage] Migrado desde " + paths[i]);
        return;
      }
    }
  }

  function _saveToDisk() {
    var serialized = JSON.stringify(_data, null, 2);
    var saved = false;

    if (useNode) {
      try {
        _fs.writeFileSync(STORAGE_FILE, serialized, "utf8");
        saved = true;
      } catch (e) {
        console.warn("[SmoothMotion Storage] Node write failed:", e);
      }
    }

    if (!saved && window.cep && window.cep.fs) {
      try {
        var result = window.cep.fs.writeFile(STORAGE_FILE, serialized);
        if (result.err === 0) saved = true;
      } catch (e) {
        console.warn("[SmoothMotion Storage] CEP write failed:", e);
      }
    }
  }

  _loadFromDisk();

  try {
    var nativeStorage = window.localStorage;
    if (nativeStorage && typeof nativeStorage.key === "function" && nativeStorage.length > 0) {
      var migrated = false;
      for (var i = 0; i < nativeStorage.length; i++) {
        var key = nativeStorage.key(i);
        if (key && !_data.hasOwnProperty(key)) {
          var val = nativeStorage.getItem(key);
          if (val !== null) {
            _data[key] = val;
            migrated = true;
          }
        }
      }
      if (migrated) _saveToDisk();
    }
  } catch (e) {}

  var _persistentStorage = {
    get length() {
      return Object.keys(_data).length;
    },
    key: function (index) {
      return Object.keys(_data)[index] || null;
    },
    getItem: function (key) {
      return _data.hasOwnProperty(key) ? _data[key] : null;
    },
    setItem: function (key, value) {
      _data[String(key)] = String(value);
      _saveToDisk();
    },
    removeItem: function (key) {
      if (_data.hasOwnProperty(key)) {
        delete _data[key];
        _saveToDisk();
      }
    },
    clear: function () {
      _data = {};
      _saveToDisk();
    },
  };

  try {
    Object.defineProperty(window, "localStorage", {
      value: _persistentStorage,
      writable: false,
      configurable: true,
    });
    console.log("[SmoothMotion Storage] Activo: " + STORAGE_FILE);
  } catch (e) {
    console.warn("[SmoothMotion Storage] No se pudo reemplazar localStorage.", e);
  }
})();
