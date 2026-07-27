/**
 * SmoothMotion — licencias vinculadas al equipo (HWID + firma offline).
 */
(function (global) {
  global.SM_LICENSE_CONFIG = {
    API_URLS: [],
    ONLINE_TIMEOUT_MS: 8000,
    REQUIRE_ONLINE_ACTIVATION: false,
  };
})(typeof window !== 'undefined' ? window : global);
