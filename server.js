var url = require('url');
var http = require('http');
var app = require('express').createServer();
var EventEmitter =  require('events').EventEmitter;
app.set('view engine', 'jade');
app.set('view options', {
  layout: false
});
app.get('/js/*.js', function(req, res){
  console.log(req);
  res.sendfile('.'+ req.url);
});
app.get('/images/*', function(req, res){
  console.log(req);
  res.sendfile('.'+ req.url);
});
app.get('/fonts/*', function(req, res){
  console.log(req);
  res.sendfile('.'+ req.url);
});
app.get('/', function(req, res){
  res.render('index', {
    pageTitle: 'Showzi - Find events in your area'
  })
});
app.get('/concertTour/*', function(req, res){
/*
  var preFetch = new showzi.preFetch(req, function(mashData){

  showzi.prefetch(req, function(mashData) {




  }); 
  */
  res.render('concertTour', {
    pageTitle: 'Showzi - Concert and Tour Dates - '
  })
});
app.get('/widget/js/*.js', function(req, res){
  console.log(req);
  res.sendfile('.'+ req.url);
});
app.listen(3000);


// in showzi.js
var showzi = {
  preFetch: function(req) {
    var locale = "us";
    switch (locale) {
      case "us":
      default:
        var prefetchRoute = showzi.prefetchRoute(req);
        var options = {
          host: 'api.eventful.com',
          port: 80,
          path: '/events/get/' + buildQuery(prefetchRoute.queryParams)
        };
        http.get(options, function(res) {
          console.log("Got response: " + res.statusCode);
        }).on('error', function(e) {
          console.log("Got error: " + e.message);
        });    
    }   
  },
  prefetchRoute : function(req) {
    var oUrl = url.parse(req.url, true);
    var path = oUrl.pathname;
    var rendererData = {type: /\/([A-Za-z]*)\/[^\/]*.*/.exec(path)[1], locale: 'us', device: 'www'};
    var ids = /\/[A-Za-z]*\/([^\/]*).*/.exec(path)[1].split('-');
    // TODO: figure out all relevant params for routing
    var queryParams = {
      id: ids[0]
    };
    return {
      action: 'eventMash',
      ids: ids,
      queryParams: queryParams,
      renderer: getRenderer(rendererData),
      servicesSynch: {'eventful': ['youtube','freebase']},
      servicesAsynch: null
    };
  },
  getRenderer : function(rendererData) {
    return rendererData.type;
  }
}

showzi.services = {
  eventful: {
    event: function(params) { // qp: pass id
      var options = {
        host: 'api.eventful.com',
        port: 80,
        path: '/events/get/' + buildQuery(params.queryParams)
      };
    }
  },
  youtube: {
    performer: function(params, ) { // qp: pass q 
      var queryParams = Object.create(params.queryParams, {
        orderby: { value: 'published' },
        "start-index": { value: '1' },
        "max-results": { value: '10' },
        v: { value: '2' },
        alt: { value: 'json' }                          
      });
      var options = {
        host: 'gdata.youtube.com',
        port: 80,
        path: '/feeds/api/videos' + queryParams
      };
      
    }
  },
  freebase: {
    performer: function(params) {
      var options = {
        host: 'api.eventful.com',
        port: 80,
        path: '/events/get/' + buildQuery(params.queryParams)
      };
    }
  }
}

function curry (fn, scope) {
  var args = [];
  for (var i=2, len = arguments.length; i < len; ++i) {
    args.push(arguments[i]);
  };
  return function() {
	  fn.apply(scope, args);
  };
}

function buildQuery(params) {
  var firstParamDeclared = false;
  sQuery = '';
  for (idx in params) {
    if (firstParamDeclared === false) {
      sUrl = sUrl + "?" + idx + "=" + encodeURIComponent(params[idx]);
      firstParamDeclared = true;
    }
    else {
      sUrl = sUrl + "&" + idx + "=" + encodeURIComponent(params[idx]);
    }
  }
  return sQuery;
}

showzi.preFetch.prototype = new EventEmitter();
showzi.services.eventful.event = new EventEmitter();
showzi.services.youtube.performer = new EventEmitter();
showzi.services.freebase.performer = new EventEmitter();
