function getDistanceFromLatLonInKm(lat1,lon1,lat2,lon2) {
  var R = 6371; // Radius of the earth in km
  var dLat = deg2rad(lat2-lat1);  // deg2rad below
  var dLon = deg2rad(lon2-lon1); 
  var a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
    ; 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  var d = R * c; // Distance in km
  return d.toFixed(2);
}

function deg2rad(deg) {
  return deg * (Math.PI/180)
}

function getCurrentLocation() {
	if (navigator.geolocation)
    {
		navigator.geolocation.getCurrentPosition(handleCurrentPosition);
    }
	else {
		//handleNoGeo();
	}
}

function prepareData() {
	function processMedicalCenter(idx,obj) {
		var id = idx;
		var latLng = new google.maps.LatLng(obj.location.latitude,obj.location.longitude);
		var marker = new google.maps.Marker({
			position: latLng,
			map: map,
			title: obj.name
		});
		var infowindow = new google.maps.InfoWindow({
			content: '<div>'+obj.name+'</div>'
		});
		google.maps.event.addListener(marker, 'click', function() {
			if (typeof openInfoWindow !== 'undefined') openInfoWindow.close();
			openInfoWindow = infowindow;
			infowindow.open(map,marker);
		});
		medicalCentersList[idx] = obj
		obj.id = id
		obj.latLng = latLng
		obj.marker = marker
		obj.infowindow = infowindow
	}
	
	medicalCentersList = []
	$.each(medicalCenters,processMedicalCenter)
	/*$.getJSON("data/medicalCenters.json",function(medicalCenters) {
		$.each(medicalCenters,processMedicalCenter)
	});
	*/
}

function updateMedicalCentersWithDistance() {
	$.each(medicalCentersList, function(idx, obj){
		var distance = getDistanceFromLatLonInKm(myPos.lat(), myPos.lng(), obj.location.latitude, obj.location.longitude);
		obj.distance = distance;
	});
	medicalCentersList.sort(function(a,b) {
		return (a.distance < b.distance) ? -1 : 1
	});
}

function populateAreaList() {
	var areas = medicalCentersList.map(function(obj) { return obj.area })
	var distinctAreas = $.unique(areas)
	$.each(distinctAreas,function(idx, area) {
		$('#areaSelector').append('<option value="'+area+'">'+area+'</option>')
	})
}

$(document).ready(function() {
	
    var mapOptions = {
    zoom: 14,
    center: new google.maps.LatLng(31.780496,35.217254),
    mapTypeId: google.maps.MapTypeId.ROADMAP
  };
  map = new google.maps.Map(document.getElementById('map-canvas'),
      mapOptions);
	prepareData();
	populateAreaList();
	getCurrentLocation();
	
	$('input[name=searchBy]:radio').change(function () {
		
		var chosenSearchBy = $('input[name=searchBy]:radio:checked').val()
		if (chosenSearchBy === 'area') {
			$('#byArea').siblings().hide()
			$('#byArea').show()
		}
		else {
			$('#nearest').siblings().hide()
			$('#nearest').show()
			if (typeof myPos === 'undefined') {
				$('#nearest').html("Unable to find your location! Please search by area.")
			}
			else {
				$('#nearest').html("Showing the 10 medical centers nearest to your location")
				displayMedicalCenters(10,function(medicalCenter) {
					return true;
				});
			}
		}
	})
	$("#areaSelector").change(function () {
		alert("change areaSelector")
		var area = $("#areaSelector option:selected").val();
		displayMedicalCenters(100,function(medicalCenter) {
			return medicalCenter.area === area;
		});		
	});
})

function parsePhoneNumber(phoneNum) {
	return phoneNum.replace(/-/g,'')
}

function displayMedicalCenters(maxToDisplay, filterFunction) {
	var str = ""
	$.each(medicalCentersList, function(idx, obj){ 
		if (idx <= maxToDisplay) {
			if(filterFunction(obj)) {
				str += displayMedicalCenter(obj) 
			}
		}
	});
	$("#medicalCenters").html(str)
}
function displayMedicalCenter(obj) {

	var lat = obj.marker.getPosition().lat()
	var lng = obj.marker.getPosition().lng()
	
	var str ="<h2><a href='javascript:showMedicalCenterOnMap("+obj.id+")'>"+obj.name+"</a></h2>"
	str +="<ul>"
	if (typeof obj.distance !== 'undefined') str +="<li>"+obj.distance+"km away</li>"

	str +="<li>Phone: <a href='tel:"+parsePhoneNumber(obj.phone)+"'>"+obj.phone+"</a></li>"
	str +="<li>Opening hours: "+obj.openingHours+"</li>"
	str +="</ul>"
	return str;
}

function showMedicalCenterOnMap(id) {
	var medicalCenter = getMedicalCenterById(id);
	map.panTo(medicalCenter.latLng);
	google.maps.event.trigger(medicalCenter.marker, 'click');
}

function getMedicalCenterById(id) {
	for(var i=0 ; i < medicalCentersList.length; ++i) {
		if (medicalCentersList[i].id === id) return medicalCentersList[i];
	}
}

function handleCurrentPosition(position) {
	myPos = new google.maps.LatLng(position.coords.latitude ,position.coords.longitude);
	var markerTitle = "You are here"
	myPosMarker = new google.maps.Marker({
					position: myPos,
					map: map,
					title: markerTitle
				});
	var infowindow = new google.maps.InfoWindow({
		content: '<div>'+markerTitle+'</div>'
	});
	map.center(myPos);
	updateMedicalCentersWithDistance();
	// If user didn't choose a radio button yet, default to 'nearest'
	if ($('input[name=searchBy]:radio:checked').length === 0) {
		$("input[name=searchBy]:radio[name=nearest]").prop("checked", true)
	}
	
}

function showError(error)
  {
  switch(error.code) 
    {
    case error.PERMISSION_DENIED:
      alert("User denied the request for Geolocation.");
      break;
    case error.POSITION_UNAVAILABLE:
      alert("Location information is unavailable.")
      break;
    case error.TIMEOUT:
      alert("The request to get user location timed out.")
      break;
    case error.UNKNOWN_ERROR:
      alert("An unknown error occurred.")
      break;
    }
  }