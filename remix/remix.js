var http = require('http');
var querystring = require('querystring');
var url = require('url');
var events = require('events');

exports.remix = function(config) {
  var me = this;
  var config = config;
  var props = function(o) {
    var names = [];
    for (name in o) {
      if (o.hasOwnProperty(name)) {
        names.push(name);
      }
    }
    return names;
  };
  var wire = function() {
    var actorsIdx = props(config);
    for (var idx in actorsIdx) {
      var actor = config[actorsIdx[idx]];
      actor.parent = config;   
      actor.events = Object.create(events.EventEmitter.prototype);
      actor.events.parent = actor;
      actor.makeRequest = requestScope();
      actor._id = actorsIdx[idx];
      actor = config[actorsIdx[idx]];
    }
    for (var idx1 in actorsIdx) {
      var actor = config[actorsIdx[idx1]];
      if (actor.futures && props(actor.futures).length > 0) {
        actor._futuresComplete = {};
        for (var idx2 in actor.futures) {
          var currActor = actor;
          currActor._futuresComplete[idx2] = false;
          var currIdx = idx2;
          config[idx2].events.on(idx2 + 'done', function() {
            currActor._futuresComplete[currIdx] = true;
            currActor.futures[currIdx](currActor.request, this.parent.data);
            var bMakeRequest = true;
            for (var idx3 in currActor._futuresComplete) {
              if (currActor._futuresComplete === false) {
                break;
              }
            }
            currActor.makeRequest();
          });
        }
      }
    }
  };
  var requestScope = function() {
    return function() {
      var port = this.request.options.port,
          host = this.request.options.host,
          path = this.request.options.path,
          query = this.request.options.query,
          method = (this.request.options.method) ? this.request.options.method : 'GET';
      var pathQuery = [path, '?', query].join('');
      var sPort = (port === 80) ? '' : ':' + port;
      var sQuery = (query) ? '?' + query : '';
      var fullUrl = ['http://', host, sPort, path, sQuery].join('');
      var responseScope = function(o, remixScope) {
        var that = o;
        return function(res) {
          var aResponse = [];
          res.setEncoding('utf8');
          res.on('data', function (chunk) {
            aResponse.push(chunk);
          });
          res.on('end', function() {
            // assign the result to actor
            var sResponse = aResponse.join('');
            that.data = JSON.parse(sResponse);
            that.events.emit(that._id + 'done');
            me.events.emit('itemComplete');
          });
          res.on('error', function(e) {
            var error = e.message + ': ' + fullUrl;
            console.log(error);
          });
        }
      };
      var options = {
        host: host,
        port: port,
        path: pathQuery,
        method: method
      };
      var request = http.request(options, responseScope(this));
      request.on('error', function(e) {
        var error = e.message + ': ' + fullUrl;
        console.log(error);
      });
      request.end();
    };
  };
  this.events = Object.create(events.EventEmitter.prototype);
  return {
    wire: function() {
      wire();
      this.events.on('itemComplete', function() {
        for (var name in config) {
          if (!(config[name].data)) {
            return;
          }
        }
        var remixed = {};
        for (var name in config) {
          remixed[name] = config[name].data;
        }
        this._events.complete(remixed);   
      });
    },
    go : function() {
      var actorsIdx = props(config);
      for (var idx in actorsIdx) {
        var actor = config[actorsIdx[idx]];
        if (!actor.futures || props(actor.futures).length === 0) {
          actor.makeRequest();
        }
      }
    },
    events: this.events
  }
}; 

