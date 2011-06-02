var url = require('url');
var http = require('http');
var querystring = require('querystring');
var app = require('express').createServer();
var remix = require('../remix/remix');
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
app.get('/concert_tour/', function(req, res){
  var event_id = querystring.parse(url.parse(req.url).query).id;
  var config = {
    eventful: {
      request: {
        options: {
          host: 'api.eventful.com',
          port: 80,
          path: '/json/events/get/',
          query: 'app_key=7pfDQXSvjB7GFm9M&id=' + event_id,
          method: 'GET'
        }
      }
    },
    youtube: {
      request: {
        options : {
          host: 'gdata.youtube.com',
          port: 80,
          path: '/feeds/api/videos/',
          method: 'GET'
        }
      },
      futures : {
        eventful: function (req, data) {
          var query = {
            orderby: 'published',
            'start-index': '1',
            'max-results': '10',
            v: '2',
            alt: 'json',
            q: ''                        
          };
          query.q = '"' + data.title + '"';
          req.options.query = showzi.buildQuery(query);  
        }
      }
    }
  };
  var jj = remix.remix(config);
  jj.wire();
  jj.events.on('complete', function(data) {
    data.youtube.feed.height = '280px';
    data.youtube.feed.width = '400px';
    var videoIds = [];
    for (var idx in data.youtube.feed.entry) {
      if (idx !== 0) {
        videoIds.push(data.youtube.feed.entry[idx]['media$group']['yt$videoid']['$t']);
      }
    };
    if (data.eventful.free === 1) {
      data.eventful.displayPrice = 'FREE!';
    }
    else {
      if (!data.eventful.price) {
        data.eventful.displayPrice = 'Varies';
      }
      else {
        data.eventful.displayPrice = '$' + data.eventful.price;
      }
    }
    if (!data.eventful.images) {
      data.eventful.images = { image : {} };
    }
    if (!data.eventful.images.image.medium) {
      data.eventful.images.image.medium = {
        url: "/images/no_image.jpg"
      }
    }
    if (!data.eventful.start_time) {
      res.render('fail', {
        pageTitle: 'Something is bad'
      });
      return;
    }    
    var start_date = new Date(data.eventful.start_time.split(' ')[0].replace(/-/g,'/'));
    //console.log('date string is ' + event.start_time.split(' ')[0] + ' from ' + event.start_time);
    var start_time = data.eventful.start_time.split(' ')[1];
    var start_hour = start_time.split(':')[0];
    var start_seconds = start_time.split(':')[1];
    start_date.setHours(start_hour);
    start_date.setMonth(start_date.getMonth() + 1);
    start_date.setSeconds(start_seconds);
    data.eventful.pretty_start_time = start_date.getShortDateAndTime();
    data.eventful.ticket_url = 'http://www.stubhub.com/search/doSearch?pageNumber=1&rows=50&searchMode=event&channel=1;Concerts&location=10;' + encodeURIComponent(data.eventful.city) + ',' + data.eventful.region + '&searchStr=' + encodeURIComponent(data.eventful.title);
    if (data.youtube.feed.entry) {
      data.youtube.feed.firstVideoId = data.youtube.feed.entry[0]['media$group']['yt$videoid']['$t'];
      data.youtube.feed.videoIds = videoIds.join(',');
    }
    else {
      data.youtube.feed = {
        firstVideoId: 'q1YABGdai5k',
        videoIds: '',
        height: '280px',
        width: '400px'
      }
    }
    res.render('concert_tour', {
      page_title: 'Showzi - Concert and Tour Dates - ' + data.eventful.title,
      page_keywords: data.eventful.title.split(' ').join(','),
      query: querystring.parse(url.parse(req.url).query).id,
      event_data: [data]
    });
  });
  jj.go();
});
app.get('/widget/js/*.js', function(req, res){
  console.log(req);
  res.sendfile('.'+ req.url);
});
app.listen(3000);


// in showzi.js
var showzi = {
  buildQuery : function(params) {
    var firstParamDeclared = false;
    var sQuery = '';
    for (idx in params) {
      if (firstParamDeclared === false) {
        sQuery = sQuery + "?" + idx + "=" + encodeURIComponent(params[idx]);
        firstParamDeclared = true;
      }
      else {
        sQuery = sQuery + "&" + idx + "=" + encodeURIComponent(params[idx]);
      }
    }
    return sQuery;
  }
};

function curry (fn, scope) {
  var args = [];
  for (var i=2, len = arguments.length; i < len; ++i) {
    args.push(arguments[i]);
  };
  return function() {
	  fn.apply(scope, args);
  };
}

Date.prototype.addHours = function(hours) {
  this.setTime(this.getTime() + (1000 * 60 * 60 * hours));
  return this;
}
Date.prototype.getShortDateAndTime = function() {
  return this.getShortDate() + " " + this.getTimeString();
}
Date.prototype.getShortDate = function() {
  return this.getMonth() + "/" +  this.getDate() + "/" +  this.getFullYear();
}

Date.prototype.getTimeString = function() {
  var hours = this.getHours();
  var hourString;
  var minutesString = (this.getMinutes() == 0) ? "00" : this.getMinutes(); 
  if (hours > 12) {
    hourString = hours - 12 + ":" + minutesString + 'PM';
  }
  else {
    hourString = hours + ":" + minutesString  + 'AM';
  }
  return hourString;
}  


