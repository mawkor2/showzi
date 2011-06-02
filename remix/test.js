var http = require('http');
var querystring = require('querystring');
var url = require('url');
var events = require('events');
var remix = require('./remix.js')

http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'application/json'});
  var t1 = new Date();
  res.write('{"a":1,"b":2,"c":[1,2]}');  
  var t2 = new Date();
  res.end();
}).listen(1337, '127.0.0.1');
http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'application/json'});
  var t1 = new Date();
  var search = url.parse(req.url).search;
  if (search) {
  var query = querystring.parse(search.substr(1));
    if (query.a === '1') {
      res.write('{"a":true}');
    } 
  }
  var t2 = new Date();
  res.end();
}).listen(1338, "127.0.0.1");
http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'application/json'});
  var t1 = new Date();
  var search = url.parse(req.url).search;
  if (search) {
  var query = querystring.parse(search.substr(1));
    if (query.b === '2') {
      res.write('{"b":true}');
    } 
  }
  var t2 = new Date();
  res.end();
}).listen(1339, "127.0.0.1");

var config1 = {
  a: {
    request: {
      options : {
        host: '127.0.0.1',
        port: 1337,
        path: '/'
      }
    },
    futures: {

    }
  },
  b: {
   request: {
      options : {
        host: '127.0.0.1',
        port: 1338,
        path: '/',
        query : 'a=1'
      }
    },
    futures: {
      a: function(req, data) {
        req.options.query = 'a=' + data.a;
      }
    }
  },
  c : {
   request: {
      options : {
        host: '127.0.0.1',
        port: 1339,
        path: '/',
        query :'b=2'
      }
    }
  }
};

var config2 = {
  a: {
    request: {
      options: {
        host: 'api.eventful.com',
        port: 80,
        path: '/json/events/get/',
        query: 'id=E0-001-037754021-8@2011060300&app_key=7pfDQXSvjB7GFm9M',
        method: 'GET'
      }
    }
  },
  b: {
    request: {
      options : {
        host: 'gdata.youtube.com',
        port: 80,
        path: '/feeds/api/videos/',
        method: 'GET'
      }
    },
    futures : {
      a: function (req, data) {
        var query = {
          orderby: 'published',
          'start-index': '1',
          'max-results': '10',
          v: '2',
          alt: 'json',
          q: ''                        
        };
        query.q = data.title;
        req.options.query = buildQuery(query);  
      }
    }
  }
};

var buildQuery = function(o) {
  var values = [];
  for (name in o) {
    values.push(encodeURIComponent(name) + '=' + encodeURIComponent(o[name])); 
  }
  return values.join('&');
};

var someNamespace = someNamespace || {};
someNamespace.myData = null;

var jj1 = remix.remix(config1);
jj1.wire();
jj1.events.on('complete', function(data) {
  someNamespace.myData = data;
  console.log('1');
  var jj2 = remix.remix(config2);
  jj2.wire();
  jj2.events.on('complete', function(data) {
    someNamespace.myData = data;
    console.log('2');  
    console.log(someNamespace.myData);
  });
  jj2.go();  
  console.log(someNamespace.myData);
});
jj1.go();

