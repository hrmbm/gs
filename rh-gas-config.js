/* ReHolz HRIS — native Google Apps Script endpoint.
 * After deploying the GAS Web App, replace only the endpoint value with its /exec URL.
 * Never put private credentials, PINs, or session tokens in this public file.
 */
(function(w){'use strict';w.RH_GAS_CONFIG=Object.freeze({
 endpoint:'https://script.google.com/macros/s/AKfycbwvLOVaVvzEfqyVzSvUa0G42TYFBaq-zsHTgSTZvch92ilvWy2GZNK3th25BcBJpUplCg/exec',
 requestTimeoutMs:45000,version:'2.2.0-native-gas'
});})(window);
