var natural = require('natural');

natural.LancasterStemmer.attach();

var strings = [
  'And You Will Know Us By the Trail of Dead - Los Angeles, California'
];

var scrub = function(tokens) {
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
          _self.splice(idx, _self.length - idx - 1);
        };
      };
      return this;      
    }
  }
}



for (var idx in strings) {
  var regX = /.*:(.*)/.exec(strings[idx]);
  if (regX && regX.length > 1) {
    strings[idx] = regX[1];
  }
  var tokens = strings[idx].toLowerCase().tokenize();
  var tokensScrubbed = scrub(tokens).stripPresenters().stripDates().stripLive().stripSoldOut();
  console.log(tokensScrubbed.tokens);
}




