var url = require('url');
var http = require('http');
var sgeoip = require("./simplegeoip");
var geoip = sgeoip();
var natural = require('natural');
var querystring = require('querystring');
var app = require('express').createServer();
var remix = require('./remix');
var EventEmitter =  require('events').EventEmitter;
process.on('uncaughtException', function(err){
  console.log(err);
  // dont crash
});
app.set('view engine', 'jade');
app.set('view options', {
  layout: false
});
app.get('/js/*.js', function(req, res){
  res.sendfile('.'+ req.url);
});
app.get('/images/*', function(req, res){
  res.sendfile('.'+ req.url);
});
app.get('/fonts/*', function(req, res){
  res.sendfile('.'+ req.url);
});
app.get('/', function(req, res){
  var ip_address = null;
  if (req.headers['x-forwarded-for']) {
    ip_address = req.headers['x-forwarded-for'];
  }
  else {
    ip_address = req.connection.remoteAddress;
  }
  var geoipInfo = geoip.lookupByIP(ip_address, true);
  var oQuery = {
    within: null,
    units: 'mile',
    location: null,
    app_key: '7pfDQXSvjB7GFm9M',
    date: 'This Week,Next Week',
    page_size: 400,
    c: 'music',
    sort_order: 'popularity'
  };
  oQuery.within = 10;
  var lat = 34.07996230865873;
  var lng = -118.33648681640625;
  //test
  //var lat = null;
  //var lng = null;
  if (geoipInfo) {
    lat = geoipInfo.latitude;
    lng = geoipInfo.longitude;
  }
  oQuery.location = lat + "," + lng;
  var sQuery = showzi.buildQuery(oQuery);
  sQuery = sQuery.substr(1, sQuery.length - 1);
  var config = {
    eventful: {
      request: {
        options: {
          host: 'api.eventful.com',
          port: 80,
          path: '/json/events/search/',
          query: sQuery,
          method: 'GET'
        }
      }
    }
  };
  var date_1 = new Date();
  var jj = remix.remix(config);
  var date_2 = new Date();
  jj.wire();
  var date_3 = new Date();
  jj.events.on('complete', function(data) {
    res.render('index', {
      pageTitle: 'Tadoo - Find events in your area',
      sEvents: JSON.stringify(data.eventful),
      oEvents: data.eventful.events,
      lat: lat,
      lng: lng
    });
  });
  jj.go();
});

/*

note to self:

https://www.eventbrite.com/json/event_get?id=1737598203&app_key=OTg4OTIzNDZiYjY5
OTg4OTIzNDZiYjY5 


*/
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
          if (data.performers && data.performers.performer && data.performers.performer.name) {
            query.q = '"' + data.performers.performer.name + '"';
          }
          else if (data.description && data.description.match(/.*(http:\/\/www.youtube.com\/[^\s]*).*/)) {            
            query.q = /.*http:\/\/www.youtube.com\/watch?v=([^\s])*.*/.exec(data.description)[1];
          }
          else {
            var title = data.title;
            title = title.replace('w/','');
            var regX = /.*:(.*)/.exec(title);
            if (regX && regX.length > 1) {
              title = regX[1];
            };
            // strip out location like los angeles, ca
            var regX = /(.*)[\s][A-Za-z]*,\s*[A-Za-z]\{2\}(.*)/.exec(title);
            if (regX && regX.length > 1) {
              title = regX[1];
              if (title.length > 2) {
                title += regX[2];
              };
            };
            var tokens = title.toLowerCase().tokenize();
            var tokensScrubbed = scrub(tokens).stripPresenters().stripDates().stripLive().stripSoldOut().stripPlays();
            query.q = tokensScrubbed.tokens.join(',');
          };
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
    var tagRegX = /<[^>]*>/g;
    if (data.eventful.description) {
      data.eventful.description = data.eventful.description.replace(/<[^>]*>?/g, '');
    }
    else {
      data.eventful.description = "No description";
    }
    if (data.eventful.free === 1) {
      data.eventful.displayPrice = 'FREE!';
    }
    else {
      if (!data.eventful.price) {
        data.eventful.displayPrice = 'Varies';
      }
      else {
        data.eventful.displayPrice = data.eventful.price.replace(/<[^>]*>/g, '');
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
      page_title: 'Concert and Tour Dates - ' + data.eventful.title,
      page_keywords: data.eventful.title.split(' ').join(','),
      query: querystring.parse(url.parse(req.url).query).id,
      event_data: [data]
    });
  });
  jj.go();
});
app.get('/widget/js/*.js', function(req, res){
  res.sendfile('.'+ req.url);
});
app.listen(8080);


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

function htmlEscape(text) {
   return text.replace(/&/g,'&amp;').
     replace(/</g,'&lt;').
     replace(/"/g,'&quot;').
     replace(/'/g,'&#039;');
} 

function scrub(tokens) {
  // ugly nasty completely subjective data scrub heuristic methods
  var _self = tokens; 
  return {
    stripPresenters: function() {
      var spliceIdx = null;
      for (var idx = 0; idx < _self.length; idx++) {
        if (_self[idx].match(/presents|present/)) {
          spliceIdx = idx;
        }
      };
      if (spliceIdx) {
        _self.splice(0, spliceIdx + 1);
      };
      return this;
    },
    stripDates: function() {
      for (var idx = 0; idx < _self.length; idx++) {
        if (_self[idx].match(/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|january|february|march|april|may|june|july|august|september|october/) || _self[idx].match(/\d+/)) {
          _self.splice(idx, 1);
          idx--;
        };
      };
      return this;
    },
    stripLive: function() {
      for (var idx = 0; idx < _self.length; idx++) {
        if (_self[idx] === 'live' && _self[idx + 1].match(/dj|band/)) {
          _self.splice(idx, 2);          
        };
      };
      return this;      
    },
    stripSoldOut: function() {
      for (var idx = 0; idx < _self.length; idx++) {
        if (_self[idx] === 'sold' && _self[idx + 1] === 'out') {
          _self.splice(idx, 2);          
        };
      };
      return this;      
    },
    stripPlays: function() {
      for (var idx = 0; idx < _self.length; idx++) {
        if (_self[idx] === 'plays') {
          _self.splice(idx, _self.length - idx);
        };
      };
      return this;      
    },
    tokens: _self
  }
}


var transforms = {
  eventful: function(data) {
    

  }
}



