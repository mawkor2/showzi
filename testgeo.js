var geo = require('./GeoIP-js/geoip.js');
geo.open({ cache: true, filename: './geo/GeoLiteCity.dat'});
var coord = geo.lookup('74.125.227.16');
console.log(coord);
geo.close();
