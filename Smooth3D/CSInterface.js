/* CSInterface — versión mínima funcional para SmoothText.
   Provee lo que usamos: evalScript, getSystemPath, getHostEnvironment.
   El objeto window.__adobe_cep__ lo inyecta el runtime CEP de After Effects. */

var SystemPath = {
  USER_DATA: "userData",
  COMMON_FILES: "commonFiles",
  MY_DOCUMENTS: "myDocuments",
  APPLICATION: "application",
  EXTENSION: "extension",
  HOST_APPLICATION: "hostApplication"
};

function CSInterface() {
  this.hostEnvironment = this.getHostEnvironment();
}

CSInterface.prototype.getHostEnvironment = function () {
  try { return JSON.parse(window.__adobe_cep__.getHostEnvironment()); }
  catch (e) { return {}; }
};

CSInterface.prototype.evalScript = function (script, callback) {
  if (callback === null || callback === undefined) { callback = function () {}; }
  window.__adobe_cep__.evalScript(script, callback);
};

CSInterface.prototype.getSystemPath = function (pathType) {
  try { return decodeURI(window.__adobe_cep__.getSystemPath(pathType)); }
  catch (e) { return ""; }
};

CSInterface.prototype.getApplicationID = function () {
  return this.hostEnvironment ? this.hostEnvironment.appId : "";
};

CSInterface.prototype.addEventListener = function (type, listener, obj) {
  try { window.__adobe_cep__.addEventListener(type, listener, obj); } catch (e) {}
};
