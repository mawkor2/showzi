var sgeoip = require("./simplegeoip");
var geoip = sgeoip();
console.log(geoip.lookupByIP('80.246.64.6', true));
