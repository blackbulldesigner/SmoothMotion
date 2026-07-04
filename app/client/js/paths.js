/**
 * SmoothMotion — rutas de almacenamiento multiplataforma (Win / Mac)
 */
(function (global) {
  function isMacHome(homeDir) {
    return /^\/Users\//.test(homeDir) || /^\/var\/\//.test(homeDir);
  }

  function isMacPlatform() {
    try {
      if (typeof process !== 'undefined' && process.platform === 'darwin') return true;
    } catch (e) {}
    if (typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform || '')) return true;
    return false;
  }

  function normalizeHome(homeDir) {
    var h = String(homeDir || '').replace(/\\/g, '/');
    if (h.slice(-1) !== '/') h += '/';
    return h;
  }

  function storagePathsMac(homeDir, pathModule, appName) {
    var base = pathModule
      ? pathModule.join(homeDir.replace(/\/$/, ''), 'Library', 'Application Support', appName)
      : normalizeHome(homeDir) + 'Library/Application Support/' + appName;
    var file = pathModule ? pathModule.join(base, 'storage.json') : base + '/storage.json';
    return { dir: base, file: file };
  }

  function storagePathsWin(homeDir, pathModule, appName) {
    var roaming;
    if (pathModule && typeof process !== 'undefined' && process.env.APPDATA) {
      roaming = process.env.APPDATA;
    } else if (pathModule) {
      roaming = pathModule.join(homeDir.replace(/\/$/, ''), 'AppData', 'Roaming');
    } else {
      roaming = normalizeHome(homeDir) + 'AppData/Roaming';
    }
    var base = pathModule ? pathModule.join(roaming, appName) : roaming + '/' + appName;
    var file = pathModule ? pathModule.join(base, 'storage.json') : base + '/storage.json';
    return { dir: base, file: file };
  }

  function resolveStoragePaths(homeDir, pathModule) {
    var mac = isMacPlatform() || isMacHome(normalizeHome(homeDir));
    return mac
      ? storagePathsMac(homeDir, pathModule, 'SmoothMotion')
      : storagePathsWin(homeDir, pathModule, 'SmoothMotion');
  }

  function legacyStoragePaths(homeDir, pathModule) {
    var names = ['MotionBro', 'MotionFlow', 'FlowEase', 'EaseCraft'];
    var paths = [];
    var i;
    if (pathModule && typeof process !== 'undefined' && process.platform === 'darwin') {
      var home = (process.env.HOME || homeDir || '').replace(/\/$/, '');
      for (i = 0; i < names.length; i++) {
        paths.push(pathModule.join(home, 'Library', 'Application Support', names[i], 'storage.json'));
      }
    } else if (pathModule && process.env.APPDATA) {
      for (i = 0; i < names.length; i++) {
        paths.push(pathModule.join(process.env.APPDATA, names[i], 'storage.json'));
      }
    } else {
      var h = normalizeHome(homeDir || '');
      var mac = isMacHome(h);
      for (i = 0; i < names.length; i++) {
        paths.push(
          mac
            ? h + 'Library/Application Support/' + names[i] + '/storage.json'
            : h + 'AppData/Roaming/' + names[i] + '/storage.json'
        );
      }
    }
    return paths;
  }

  function resolveUserScriptsPath(homeDir, pathModule) {
    var storage = resolveStoragePaths(homeDir, pathModule);
    return pathModule
      ? pathModule.join(storage.dir, 'user_scripts')
      : storage.dir + '/user_scripts';
  }

  var api = {
    resolveStoragePaths: resolveStoragePaths,
    resolveUserScriptsPath: resolveUserScriptsPath,
    legacyStoragePaths: legacyStoragePaths,
    isMacHome: isMacHome
  };

  global.SmoothMotionPaths = api;
  global.MotionBroPaths    = api;
  global.MotionFlowPaths   = api;
})(typeof window !== 'undefined' ? window : global);
