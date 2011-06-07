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

dojo.declare('showzi.util.eventful',
  null, {
    constructor: function() {
      this.apiKey = '7pfDQXSvjB7GFm9M';
      this.category = {};
      this.categoryButton = null;
      this.loadingProgress = 0;
      this.loadingToggler = new dojo.fx.Toggler({
         node: "downloadProgress",
         showFunc: dojo.fx.wipeIn,
         hideFunc: dojo.fx.wipeOut
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
            progress: ++showzi.util.eventful.loadingProgress
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
        showzi.processEventData(data);
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
          style: "display: none;width: 100%"
        });
        for (var i=0;i<data.category.length;i++) {
          cMenu.addChild(new dijit.MenuItem({
            label: data.category[i].name,
            categoryId: data.category[i].id,
            onClick: function(e) {
              showzi.util.eventful.setCategory(this.label, this.categoryId);
            },
            style: "width: 100%"
          }));
        };
        showzi.util.eventful.categoryButton = new dijit.form.DropDownButton({
            label: "Concerts &amp; Tour Dates",
            name: "programmatic2",
            dropDown: cMenu,
            id: "category-dropdown",
            autoWidth: false
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

showzi.processEventData = function(data) {
  if (!data || !data.events || !data.events.event) {
    alert('Sorry, no events were found in this area.');
    return;
  }
  for (idx in data.events.event) {
    var event = data.events.event[idx];
    event.active = true;
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
      },
      visible: true
    });
    showzi.eventMarkers.push(marker);
    showzi.createMarkerEvent(marker);
  }
  showzi.putEvents(data);
}

showzi.putEvents = function(data) {
  for (var eventMarker in showzi.eventMarkers) {
    var event = showzi.eventMarkers[eventMarker].event;
    if (event.active) {
      showzi.eventMarkers[eventMarker].setOptions({"visible": true});
    }
    else {
      showzi.eventMarkers[eventMarker].setOptions({"visible": false});
    }
  }
  showzi.util.events.list.clear();
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
      var mapOptions = {
        zoom: 13,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        center: new google.maps.LatLng(showzi.lat, showzi.lng)
      };
      showzi.map = new google.maps.Map(document.getElementById("map_canvas"), mapOptions);
      showzi.util.eventful = new showzi.util.eventful();
      showzi.util.eventful.loadingToggler.hide();
      showzi.util.eventful.getCategories();
      showzi.processEventData(showzi.eventSearchData);
      showzi.util.eventful.setMapParams(showzi.lat, showzi.lng, 10);

      var currentUrl = document.location.href.split('#');
      if (currentUrl.length > 1 && currentUrl[1].length > 0) {
        dojo.byId('event_item_detail_frame').src = currentUrl.join('');
        dojo.byId('event_item_detail').style.display = 'block';
        dojo.byId('event_item_detail').style.zIndex = '1';
      }
      dojo.byId('map_icon').addEventListener('click', function() {
        dojo.byId('event_item_detail').style.display = 'none';
      });
      dojo.query('#event_list').delegate('.event_item_link', 'onclick', function(evt) {
        if (evt.target.className === 'target') {
          dojo.byId('event_item_detail').style.display = 'none';
          dojo.byId('event_item_detail').style.zIndex = '-1';
          var eventMarkerIdx = dojo.query(evt.target).parents('.event_item')[0].id.split('_')[2];
          showzi.map.setCenter(new google.maps.LatLng(showzi.eventMarkers[eventMarkerIdx].event.latitude, showzi.eventMarkers[eventMarkerIdx].event.longitude));
          showzi.eventMarkers[eventMarkerIdx].setAnimation(google.maps.Animation.BOUNCE);
          setTimeout('showzi.eventMarkers[' + eventMarkerIdx + '].setAnimation(null)', 1500);
          dojo.stopEvent(evt);
          return false;
        }
        dojo.byId('event_item_detail').style.display = 'block';
        dojo.byId('event_item_detail').style.zIndex = '1';
        var urlParts = this.href.split('/');
        var fraggedUrl = '';
        for (var idx = 0; idx < urlParts.length; idx++) {
          if (idx !== 0) {
            fraggedUrl += '/';
          }
          if (idx === 3) {
            fraggedUrl += '#';
          }         
          fraggedUrl += urlParts[idx];
        }
        location.href = fraggedUrl;
        dojo.byId('event_item_detail_frame').src = this.href;
        dojo.stopEvent(evt);
        return false;
      });
      showzi.searchBox = new dijit.form.TextBox({
          name: "search_box",
          node: "search_box",
          id: "search_box",
          value: "" /* no or empty value! */,
          placeHolder: "search",
          onKeyDown: function(e) {
            if (e.keyCode === 13) {
              showzi.util.events.list.search(e.target.value);
            }
          },
          onBlur: function(e) {
            if (e && e.target && e.target.value === "") {
              showzi.util.events.list.activateMarkers();
              showzi.util.events.list.render();
            }
          }
      }, "search_box");    
      var viewport = dijit.getViewport();
      var viewport_height = viewport.h;
      var listHeight = (viewport_height - 52) + 'px';
      dojo.style('event_list', 'height', listHeight);
      // TODO: this is bad - need to do it with pure css 
      dojo.connect ( window, 'onresize', function(e){
        var viewport = dijit.getViewport();
        var viewport_height = viewport.h;
        var listHeight = (viewport_height - 52) + 'px';        
        dojo.style('event_list', 'height', listHeight);
       } );
    }
    showzi.util.events.initialized = true;
  },
  list: {
    render : function() {
      var markup = [];
      for (var eventMarker in showzi.eventMarkers) {
        var event = showzi.eventMarkers[eventMarker].event; 
        if (event.active) {
          markup.push(showzi.util.events.item.render(event, eventMarker));
        }
      }
      dojo.byId('event_list').innerHTML = markup.join('');
    },
    search : function(searchText) {
      for (var eventMarker in showzi.eventMarkers) {
        var searchRexExp = new RegExp(searchText, "i");
        var event = showzi.eventMarkers[eventMarker].event;
        if ((event.description && event.description.match(searchRexExp)) ||
          (event.title && event.title.match(searchRexExp)) ||
          (event.venue_name && event.venue_name.match(searchRexExp)) ||
          (event.venue_address && event.venue_address.match(searchRexExp))) {
          event.active = true;
        }
        else {
          event.active = false;
        } 
        showzi.putEvents();
      }
    },
    activateMarkers : function() {
      for (var eventMarker in showzi.eventMarkers) {
        var event = showzi.eventMarkers[eventMarker].event; 
        event.active = true;
      }
    },
    clear : function() {
      dojo.byId('event_list').innerHTML = '';
    }
  },
  item: {
    render : function(event, index) {
      event.list_id = 'event_item_' + index;
      var markup = [];
      markup.push('<a class="event_item_link" href="/concert_tour/?id=' + event.id + '">');
      markup.push(['<div class="event_item" id="event_item_',index,'"><div class="image_title">'].join(''));
      if (event.image && event.image.small) {
        markup.push(['<img class="image" src="',event.image.small.url,'">'].join(''));
      }
      else {
        markup.push(['<img class="image" src="/images/no_image.jpg">'].join(''));
      }
      markup.push(['<div class="title"><span>',event.title,'</span></div>'].join(''));
      markup.push(['<div class="icons"><img class="target" src="/images/target.png"><img class="info" src="/images/info.jpg"></div>'].join(''));
      //markup.push(['<div class="description">',event.description,'</div>'].join(''));
      markup.push(['</div><div class="location">',event.city_name,', ',event.region_abbr,'</div>'].join(''));
      var start_date = new Date(event.start_time.split(' ')[0].replace(/-/g,'/'));
      //console.log('date string is ' + event.start_time.split(' ')[0] + ' from ' + event.start_time);
      var start_time = event.start_time.split(' ')[1];
      var start_hour = start_time.split(':')[0];
      var start_seconds = start_time.split(':')[1];
      start_date.setHours(start_hour);
      start_date.setMonth(start_date.getMonth() + 1);
      start_date.setSeconds(start_seconds);
      
      markup.push(['<div class="start_time">', start_date.getShortDateAndTime() ,'</div>'].join(''));
      if (event.stop_time && false) {
        var start_date = new Date(event.start_time.split(' ')[0]);
        var start_time = event.start_time.split(' ')[1];
        var start_hour = start_time.split(':')[0];
        var start_seconds = start_time.split(':')[1];
        start_date.setHours(start_hour);
        start_date.setSeconds(start_seconds);
        markup.push(['<div class="stop_time">', stop_date.getShortDateAndTime(),'</div>'].join(''));
      }
      markup.push(['<div class="venue_name">',event.venue_name,'</div>'].join(''));
      markup.push(['<div class="venue_address">',event.venue_address,'</div>'].join(''));
      markup.push('</div></a>');
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

 
showzi.loadWidget = function(eventMarker) {
  var event = eventMarker.event;
  console.log(event);
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

showzi.findNodeWith = function(searchText, bodyText, frameId, recursions) {    
  // TODO: would be nice to childNode on the # of recursions, tricky though... not sure how to get the right childnode yet
  var maxRecursions = 5;
  var regXNodeOpen = /<[a-zA-Z]*((?:\s*[a-zA-Z0-9]*=[\'\"][^\'\"=]*[\'\"])*)\s*>/;
  var regXNodeClose = /<\/[a-zA-Z]*>/;
  if (typeof searchText !== "string") { 
    searchText = searchText.source;
  }
  // note: performance seems fast in this case less than 1ms, the only concern is bodyText beign a very large string
  var regXTextNodeSearch = new RegExp(regXNodeOpen.source + searchText);
  var t1 = new Date();
  var regXTextNodeSearchResults = regXTextNodeSearch.exec(bodyText);
  var t2 = new Date();
  //console.log("Regex performance: " + (t2 - t1) + "ms"); 
  if (regXTextNodeSearchResults ===  null) {
    return null;
  }         
  var nodeText = regXTextNodeSearchResults[0];
  var allAttributesString = regXTextNodeSearchResults[1];
  if (!/\s*[iI][dD]=[\'\"]?([^\'\"=]*)[\'\"\s$]/.exec(allAttributesString)) {
    if (recursions === null || recursions === undefined) { 
        recursions = 1;
    }
    else {
        recursions += 1;
    }
    if (recursions !== maxRecursions) {
        return shh.findNodeWith(nodeText, bodyText, frameId, recursions);
    }
    return null;
  }
  var resultNode;
  var nodeId = (/\s*[iI][dD]=[\'\"]?([^\'\"=]*)[\'\"\s$]/.exec(allAttributesString))[1];
  if (frameId) {
    return window.frames[frameId].contentDocument.getElementById(nodeId);
  }
  else {
    return document.getElementById(nodeId); // TODO: test performance if you could extend a query selector here, alternately could use native getElementsByClassName if there is no id
  }
}
dojo.addOnLoad(function(){
  showzi.util.events.init();
});

