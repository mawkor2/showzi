dojo.require('dojo.io.script');
dojo.require('dijit.Menu');
dojo.require('dijit.form.Button');
dojo.require('dijit.ProgressBar');
dojo.require('dojo.parser');
dojo.require('dojo.fx');
dojo.require('dijit.Tooltip');
dojo.require('dojox.NodeList.delegate');
dojo.require('dijit.Dialog');
dojo.require('dojox.fx.scroll');
dojo.declare('showzi.util.eventful',
  null, {
    constructor: function() {
      this.apiKey = '7pfDQXSvjB7GFm9M';
      this.category = {};
      this.categoryButton = null;
      this.loadingProgress = 0;
      this.loadingToggler = new dojo.fx.Toggler({
         node: "downloadProgress"
      });
      this.searchParams = {
        url: 'http://api.eventful.com/json/events/search/',
        within: null,
        units: 'mile',
        location: null,
        app_key: this.apiKey,
        date: 'This Week,Next Week',
        page_size: 400,
        c: 'music',
        sort_order: 'popularity'
        //q: "film"
      };
    },
    setMapParams: function(lat, lng, radius) {
      this.searchParams.within = radius || 10;
      var lat = lat || 34.07996230865873;
      var lng = lng || -118.33648681640625;
      this.searchParams.location = lat + "," + lng;
      console.log('setting location to ' + this.searchParams.location); 
    },
    showLoading: function() {
        showzi.util.eventful.loadingToggler.show();
        if (showzi.util.eventful.loadingProgress >= 20) {
          showzi.util.eventful.loadingProgress = 0;
          showzi.util.eventful.loadingToggler.hide();
          return;
        }
        jsProgress.update({
            maximum: 20,
            progress: ++showzi.util.eventful.loadingProgress,
            showFunc: dojo.fx.wipeIn,
            hideFunc: dojo.fx.wipeOut
        });
        if (showzi.util.eventful.loadingProgress <= 20) {
            setTimeout(showzi.util.eventful.showLoading, 100);
        }
    },
    setCategory: function(categoryName, categoryId) {
      this.category.name = categoryName;
      this.category.id = categoryId;
      this.categoryButton.set({label : categoryName});
      this.categoryButton.set({categoryId : categoryId});
      this.searchParams.c = categoryId;
      var latLng = showzi.map.getCenter();
      showzi.util.eventful.searchByCoords(latLng.lat(), latLng.lng());
    },
    searchByCoords: function(lat, lng, radius) {
      this.showLoading();
      showzi.util.events.list.clear();
      showzi.clearEvents();
      this.setMapParams(lat, lng, radius);
      // workaround note: eventful jsonp api does not like . in the callback name and dojo generates a stub callback method with a dot in it, so a 'gasp' global function must be used
      var cbName = "cb_searchByCoords_" + (new Date()).getTime();
      var load = function(data) {
        showzi.putEvents(data);
      };
      var error = function(error) {
        alert("Danger Will Robinson!");
      };
      window[cbName] = load;
      this.searchParams.callback = cbName;
      var url = showzi.buildUrl(this.searchParams);
      dojo.io.script.attach(cbName, url);
    },
    getCategories: function() {
      var cbName = "cb_getCategories_" + (new Date()).getTime();
      var params = {
        url: "http://api.eventful.com/json/categories/list/",
        app_key: this.apiKey,
        callback: cbName
      };
      var load = function(data) {
        var sMarkup = [];
        var cMenu = new dijit.Menu({
          style: "display: none;"
        });
        for (var i=0;i<data.category.length;i++) {
          cMenu.addChild(new dijit.MenuItem({
            label: data.category[i].name,
            categoryId: data.category[i].id,
            onClick: function(e) {
              showzi.util.eventful.setCategory(this.label, this.categoryId);
            }
          }));
        };
        showzi.util.eventful.categoryButton = new dijit.form.DropDownButton({
            label: "Concerts &amp; Tour Dates",
            name: "programmatic2",
            dropDown: cMenu,
            id: "category-list"
        });
        dojo.byId("category-list").appendChild(showzi.util.eventful.categoryButton.domNode);
      };
      window[cbName] = load;
      var url = showzi.buildUrl(params);
      dojo.io.script.attach(cbName, url);
    }
  }
);


showzi.buildUrl = function(params) {
  var firstParamDeclared = false;
  var sUrl = "";
  for (idx in params) {
    if (idx === "url") {
      sUrl = params[idx] + sUrl;
    }
    else if (firstParamDeclared === false) {
      sUrl = sUrl + "?" + idx + "=" + encodeURIComponent(params[idx]);
      firstParamDeclared = true;
    }
    else {
      sUrl = sUrl + "&" + idx + "=" + encodeURIComponent(params[idx]);
    }
  }
  return sUrl;
}

showzi.clearEvents = function() {
  if (showzi.eventMarkers) {
    var offset = 0;
    for (var i=showzi.eventMarkers.length - 1; i>=0;i--) {
      showzi.eventMarkers[i].setMap(null);
      // we want to keep their favorites, don't delete - some conditional here
      // if (condition) {} else 
      showzi.eventMarkers.splice(i, 1);
      // also, cool to use persistent store for their favorites!
    }
  }
}

showzi.eventMarkers = [];

showzi.putEvents = function(data) {
  if (!data || !data.events || !data.events.event) {
    alert('Sorry, no events were found in this area.');
    return;
  }
  for (idx in data.events.event) {
    var event = data.events.event[idx];
    var categoryId = showzi.util.eventful.category.id;
    var categoryName = showzi.util.eventful.category.name;  
    var marker = new google.maps.Marker({
      position: new google.maps.LatLng(event.latitude, event.longitude), 
      map: showzi.map,
      title: event.title,
      event: event, 
      category: {
        name: categoryName,
        id: categoryId
      }
    });
    showzi.eventMarkers.push(marker);
    showzi.createMarkerEvent(marker);
  }
  showzi.util.events.list.render();
}

showzi.createMarkerEvent= function(marker) {
  google.maps.event.addListener(marker, 'click',  function() {
    // TODO: probably want to delegate this
    showzi.loadWidget(marker);
  }); 
}

showzi.util.events = {
  initialized: false, 
  init: function() {
    if (!showzi.util.events.initialized) {
      dojo.query('#event_list').delegate('img.info', 'onclick', function(evt) {
        var eventMarkerIdx = dojo.query(evt.target).parents('.event_item')[0].id.split('_')[2];
        new dijit.Dialog({
          title: showzi.eventMarkers[eventMarkerIdx].event.title,
          style: 'width: 500px',
          content: showzi.eventMarkers[eventMarkerIdx].event.description
        }).show();
        // TODO: tear down the dialog
      });
    }
    showzi.util.events.initialized = true;
  },
  list: {
    render : function() {
      showzi.util.events.init();
      var markup = [];
      for (var eventMarker in showzi.eventMarkers) {
        var event = showzi.eventMarkers[eventMarker].event; 
        markup.push(showzi.util.events.item.render(event, eventMarker));
      }
      dojo.byId('event_list').innerHTML = markup.join('');
      dojo.query('#event_list').delegate('img.target', 'onclick', function(evt) {
        var eventMarkerIdx = dojo.query(evt.target).parents('.event_item')[0].id.split('_')[2];
        showzi.map.setCenter(new google.maps.LatLng(showzi.eventMarkers[eventMarkerIdx].event.latitude, showzi.eventMarkers[eventMarkerIdx].event.longitude));
        showzi.eventMarkers[eventMarkerIdx].setAnimation(google.maps.Animation.BOUNCE);
        setTimeout('showzi.eventMarkers[' + eventMarkerIdx + '].setAnimation(null)', 1500);
      });
    },
    clear : function() {
      dojo.byId('event_list').innerHTML = '';
    }
  },
  item: {
    render : function(event, index) {
      event.list_id = 'event_item_' + index;
      var markup = [];
      markup.push(['<div class="event_item" id="event_item_',index,'"><div class="image_title">'].join(''));
      if (event.image && event.image.small) {
        markup.push(['<img class="image" src="',event.image.small.url,'">'].join(''));
      }
      else {
        markup.push(['<img class="image" src="/images/no_image.jpg">'].join(''));
      }
      markup.push(['<div class="title">',event.title,'</div>'].join(''));
      markup.push(['<div class="icons"><img class="target" src="/images/target.png"><img class="info" src="/images/info.jpg"></div>'].join(''));
      //markup.push(['<div class="description">',event.description,'</div>'].join(''));
      markup.push(['</div><div class="location">',event.city_name,', ',event.region_abbr,'</div>'].join(''));
      var start_date = new Date(event.start_time.split(' ')[0].replace('-','/'));
      //console.log('date string is ' + event.start_time.split(' ')[0] + ' from ' + event.start_time);
      var start_time = event.start_time.split(' ')[1];
      var start_hour = start_time.split(':')[0];
      var start_seconds = start_time.split(':')[1];
      start_date.setHours(start_hour);
      start_date.setMonth(start_date.getMonth() + 1);
      start_date.setSeconds(start_seconds);
      
      markup.push(['<div class="start_time">', getShortDate(start_date),'</div>'].join(''));
      if (event.stop_time && false) {
        var start_date = new Date(event.start_time.split(' ')[0]);
        var start_time = event.start_time.split(' ')[1];
        var start_hour = start_time.split(':')[0];
        var start_seconds = start_time.split(':')[1];
        start_date.setHours(start_hour);
        start_date.setSeconds(start_seconds);
        markup.push(['<div class="stop_time">', getShortDate(stop_date),'</div>'].join(''));
      }
      markup.push(['<div class="venue_name">',event.venue_name,'</div>'].join(''));
      markup.push(['<div class="venue_address">',event.venue_address,'</div>'].join(''));
      markup.push('</div>');
      return markup.join('');
/*
city_name: "Los Angeles"
country_name: "United States"
description: "LUNAFEST, a traveling film festival by, for, about women is dedicated to building community,through …"
geocode_type: "EVDB Geocoder"
id: "E0-001-037403492-9"
image: null
region_name: "California"
start_time: "2011-05-10 08:30:00"
stop_time: null
title: "LUNAFEST @ Professional BusinessWomen of California 22nd Annual Conference"
venue_address: "747 Howard St."
venue_name: "Moscone Center South"
venue_url: "http://eventful.com/losangeles/venues/moscone-center-south-/V0-001-003996807-7"
watching_count: null
*/
    }
  }
};

function getShortDate(date){
  return date.getMonth() + "/" +  date.getDate() + "/" +  date.getFullYear();
}
showzi.loadWidget = function(eventMarker) {
  var event = eventMarker.event;
  console.log(event);
  alert('scrolling to ' + event.list_id);
  dojo.fx.combine([
    dojox.fx.smoothScroll({
      node: dojo.byId(event.list_id),
      win: dojo.byId('event_list'),
      duration: 900
    })],
    [
    dojo.fadeOut({
      node: dojo.byId(event.list_id),
      duration: 900
    })]).play();
  ;
}

