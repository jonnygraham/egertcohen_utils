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
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI/180)
}

function getCurrentLocation() {
	if (navigator.geolocation)
    {
		navigator.geolocation.getCurrentPosition(handleCurrentPosition);
    }
}

var medicalCentersDistances = []
function updateMedicalCentersDistances(pos) {
	medicalCentersDistances = []
	$.each(medicalCentersData, function(idx, obj){
		var distance = getDistanceFromLatLonInKm(pos.lat, pos.lon, obj.location.lat, obj.location.lon);
		medicalCentersDistances.push({id: obj.id, distance: distance})
	});

}

document.addEventListener('deviceready', onDeviceReady, false);
function onDeviceReady() {
	navigator.splashscreen.hide();
	document.addEventListener("resume", onResume, false);
}

function onResume() {
	getCurrentLocation();
}

function getCenterTypes() {
	return getDistinct(function(obj) { return obj.centreType })
}

function getAreas() {
	return getDistinct(function(obj) { return obj.area })
}

function getDistinct(selector) {
	var items = medicalCentersData.map(selector)
	var distinctItems = items.filter(function(item,i,items){
		return i==items.indexOf(item);
	});
	return distinctItems;
}

function onDataReady() {
	populateTypesList(getCenterTypes(),"typesList");
	populateAreaSelector(getAreas(),"areaSelector");
	$('a.startButton').removeClass('ui-disabled');
	getCurrentLocation();
}

var medicalCentersData=null;
function getMedicalCenters(url) {
	$.getJSON(url,
		function (data) {
			medicalCentersData = data;
			localStorage.setItem("medicalCentersData",medicalCentersData)
			onDataReady();
		} )
		.fail(function(jqXHR, textStatus, errorThrown) {
			medicalCentersData = localStorage.getItem("medicalCentersData");
			if (medicalCentersData === null) {
				alert("Unable to load Medical Center data. Please check your connection to the internet.");
			}
			else {
				onDataReady();
			}
		});
}
var defaultZoom = 16;
var map;
$(document).ready(function() {

	FastClick.attach(document.body);
	getMedicalCenters("http://jonnygraham.github.io/eggert_cohen/www/data/medicalCentersData.json")
	$("#centerDetails").on("pageshow", function onPageShow(e,data) {
		displayMedicalCenterById(localStorage.getItem("centerId"));
	});
	$("#chooseCenter").on("pageshow", function onPageShow(e,data) {
		var centerType = localStorage.getItem("centerType")
		$("#centerTypeTitle").html(centerType)
		$('#areaSelector').trigger('change');
	});

	$('#map_canvas').gmap({'center': new google.maps.LatLng(31.780496,35.217254), 'zoom': defaultZoom, 'disableDefaultUI':true, 'callback': function() {
						map = this;
						var self = this;
						self.addMarker({'position': this.get('map').getCenter() }).click(function() {
							self.openInfoWindow({ 'content': 'You are here!' }, this);
						});
					}}); 
	$("#areaSelector").change(function () {
		$("#noListMessage").hide();
		var area = $("#areaSelector option:selected").val();
		console.log("Area chosen:"+area);
		var centerType = localStorage.getItem("centerType");
		displayMedicalCenters(9999,function(medicalCenter) {
			var filterByType = centerType === medicalCenter.centreType
			if (area === "Nearby") return filterByType;
			else return filterByType && medicalCenter.area === area;
		});		
	});
});

function parsePhoneNumber(phoneNum) {
	return phoneNum.replace(/-/g,'')
}
function displayMedicalCenters(maxToDisplay, filterFunction) {
	var str = ""
	//sort them by distance, then by id
	medicalCentersData.sort(function(a,b) {
		var distToA = getDistance(a.id)
		var distToB = getDistance(b.id)
		if (distToA == distToB) return (a.id < b.id) ? -1 : 1
		else return (distToA < distToB) ? -1 : 1
	})
	var numCenters = 0
	$.each(medicalCentersData, function(idx, obj){ 
		if (idx <= maxToDisplay) {
			if(filterFunction(obj)) {
				str += displayMedicalCenterInList(obj);
				numCenters +=1;
			}
		}
	});
	if (numCenters == 0 ) $("#noListMessage").show();
	$("#centersList").html(str)
	$("#centersList").listview("refresh")
	$("#centersList").children("li").on("click", function() {
		console.log($(this))
		localStorage.setItem("centerId",$(this).attr("center-id"));
	});
}

function populateTypesList(centerTypes,id) {
	var htmlStr = ""
	$.each(centerTypes,
		function(idx,centerType) {
			htmlStr += '<li><a href="#chooseCenter" center-type="'+centerType+'">'+centerType+'</a></li>';
		}
	);
	$("#"+id).html(htmlStr)
	//$("#"+id).listview("refresh") Populated before rendered so don't call refresh
	$("#"+id+" a").on("click", function(event) {
		localStorage.setItem("centerType",$(this).attr("center-type"));
		$("#centersList").html("")
	});
}
function populateAreaSelector(areas,id) {
	$.each(areas,function(idx, area) {
		$("#"+id).append('<option value="'+area+'">'+area+'</option>')
	})
}


function displayMedicalCenterById(id) {
	console.log(id)
	var medicalCenters = $.grep(medicalCentersData, function(obj,idx){ 
		return (obj.id === id)
	});
	if (medicalCenters.length != 1) {
		alert("Medical Center "+id+" not found");
		return;
	}
	var medicalCenter = medicalCenters[0];
	displayMedicalCenterDetails(medicalCenter)
	//$("#centerName").html(id)
			
}
function displayMedicalCenterDetails(obj) {
	$("#centerType").html(obj.centreType)
	$("#centerNameTitle").html(obj.name)
	$("#centerName").html(obj.name)
	var address = obj.address;
	var dist = getDistance(obj.id)
	var distance = ""
	if (dist !== null) {
		distance = " ("+dist.toFixed(2)+"km away)";
	}
	if (obj.location.lat !== 0) {
		//address += " (<a href='waze://?ll="+obj.location.lat+","+obj.location.lon+"' target='_blank'>Open in Waze</a>)";
		distance += " (<a href='http://waze.to/?ll="+obj.location.lat+","+obj.location.lon+"&navigate=yes'>Open in Waze</a>)";
	}
	$("#centerAddress").html(address)
	$("#centerDistance").html(distance)
	var phoneNumbers = ""
	$.each(obj.phoneNumbers, function(idx,phoneNumber) {
		phoneNumbers +="<p><a href='tel:"+parsePhoneNumber(phoneNumber.number)+"'>"+phoneNumber.number+"</a></p>"
	});
	$("#centerPhoneNumbers").html(phoneNumbers)
	var openingHours = "<table class='table-stripe rounded-corners'><tbody>"
	$.each(obj.openingHours, function(idx,line) {
		openingHours +="<tr>";
		var d_h = line.split(": ")
		if (d_h[0] === "") {
			openingHours += "<td>Not known</td>";
		}
		else {
			openingHours +="<td>"+d_h[0]+"</td>"
			if (d_h.length > 1) openingHours +="<td>"+d_h[1]+"</td>"
		}
		openingHours +="</tr>"
	});
	openingHours += "</tbody></table>";
	$("#centerOpeningHours").html(openingHours)
	showMedicalCenterOnMap(obj);
}

function getDistance(centerId) {
	var medicalCenters = $.grep(medicalCentersDistances, function(obj,idx){ 
		return (obj.id === centerId)
	});
	if (medicalCenters.length == 1) return medicalCenters[0].distance
	return null;
}

function displayMedicalCenterInList(obj) {
	var str = "<li  data-filtertext='"+obj.name+"' center-id='"+obj.id+"'>" //data-icon='info'
	str +="<a href='#centerDetails'>"
	str += "<h3>"+obj.name +"</h3>"
	str += "<p><strong>"+obj.address+"</strong></p>"

	var distance = getDistance(obj.id)
	if (distance !== null) {
		str+="<p class='ui-li-aside'>"+distance.toFixed(2)+"km away</p>"
	}
	str +="</a>"
	str +="</li>"
	return str;
}

function showMedicalCenterOnMap(medicalCenter) {
	var latLng = new google.maps.LatLng(medicalCenter.location.lat, medicalCenter.location.lon);
	map.clear('markers')
	map.addMarker({'position': latLng }).click(function() {
							map.openInfoWindow({ 'content': medicalCenter.name }, this);
						});
	map.get('map').setCenter(latLng);
	map.get('map').setZoom(defaultZoom);
	$('#map_canvas').gmap('refresh');
}

var lastKnownPos = { lat:0.0, lon: 0.0 };
function handleCurrentPosition(position) {
	var pos = { lat: position.coords.latitude, lon: position.coords.longitude }
	if (pos.lat != lastKnownPos.lat || pos.lon != lastKnownPos.lon) {
		lastKnownPos = pos
		updateMedicalCentersDistances(pos);
	}
}
