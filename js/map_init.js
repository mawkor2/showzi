window.showzi = {};
var initialLocation;
var siberia = new google.maps.LatLng(60, 105);
var newyork = new google.maps.LatLng(40.69847032728747, -73.9514422416687);
var browserSupportFlag =  new Boolean();
var log=function(message){if(console)console.log(message)};
dojo.addOnLoad(init);

function init() {
  var success = initialize();
  console.log('called initialize');
}


function positionAcquired(browserSupportFlag, errorFlag, myOptions) {
  if (errorFlag == true) {
    alert("Geolocation service failed.");
    initialLocation = newyork;
    console.log(newyork);
    console.log('initial location is');
    console.log(initialLocation);
  } else if (!browserSupportFlag) {
    alert("Your browser doesn't support geolocation. We've placed you in New York.");
    initialLocation = newyork;
  }
  myOptions.center = initialLocation;
  console.log('Center is :');
  console.log(initialLocation);
  showzi.map = new google.maps.Map(document.getElementById("map_canvas"), myOptions);
  console.log(showzi.map);
  showzi.util.eventful = new showzi.util.eventful();
  console.log(showzi.map);
  var latLng = showzi.map.getCenter();
  showzi.util.eventful.getCategories();
  showzi.util.eventful.searchByCoords(latLng.lat(), latLng.lng());
}

function initialize() {
  var myOptions = {
    zoom: 13,
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };
  // Try W3C Geolocation (Preferred)
  if(navigator.geolocation) {
    browserSupportFlag = true;
    navigator.geolocation.getCurrentPosition(function(position) {
      initialLocation = new google.maps.LatLng(position.coords.latitude,position.coords.longitude);
      positionAcquired(true, false, myOptions);
    }, function() {
      positionAcquired(browserSupportFlag, true, myOptions);
    });
  // Try Google Gears Geolocation
  } else if (google.gears) {
    browserSupportFlag = true;
    var geo = google.gears.factory.create('beta.geolocation');
    geo.getCurrentPosition(function(position) {
      initialLocation = new google.maps.LatLng(position.latitude,position.longitude);
      positionAcquired(browserSupportFlag, false, myOptions);
    }, function() {
      positionAcquired(browserSupportFlag, true, myOptions);
    });
  // Browser doesn't support Geolocation
  } else {
    browserSupportFlag = false;
    handleNoGeolocation(browserSupportFlag, true, myOptions);
  }
  return browserSupportFlag;
}
