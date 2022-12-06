var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DATEPART_HOUR = 0;
const DATEPART_MIN = 1;
const DATEPART_SEC = 2;
var clockTimer = setInterval(updateClock, 250);
var mainTimer = setInterval(updateTimer, 1000);
var minuteTimer = setInterval(function () { checkForIrn(); checkForAds(); getEngineeringMessage(); }, 60 * 1000);
var halfHourTimer = setInterval(function() { loadSchedule(); loadScheduledMessages(); }, 30 * 60 * 1000);
var clock = null;
var networkGreenroomOK = true;
var networkStudioAOK = true;
var networkExternalOK = true;
var currentStudio = null;
var loadedFromGreenroom = false;
var allowGreenroomSlideAnimation = true;
var maxSlideshowImgs = 0;
var lastSlideshowImg = -1;
var secondsSinceSlideChange = 12;
var runningInStudio = "";
var studioDelay = 0;
var runningRemote = false;
var apiBase = "http://c105r-fs1.studio.cambridge105.fm/";
var schedule = [];

// Array of scheduled event objects:
// - timestamp (result of Date.getTime())
// - label (text label to display)
// - cssClass (class to apply to text label)
// - countdownTime (duration to show countdown before event time, ms)
// - duration (how long to keep event visible)
var scheduledEvents = [];

loadScheduledMessages();
loadSchedule();
checkRunningStudio();
checkForOBDelay();
checkForIrn();
checkForAds();

if (window.location.href.indexOf("greenroom") > -1) { loadedFromGreenroom = true; }
if (runningRemote) {
	apiBase = "https://clock.cambridge105.co.uk/";
}

$(function() {
    createClock();
	loadSlides();
	if (runningRemote) {
		updateLight('remote', true); 
	}
});

var fakeDate = null;
function getDate() {
	if (fakeDate != null) {
		return new Date(fakeDate);
	} else {
		return new Date();
	}
}

// This checks the list of scheduled events for one with the same timestamp; if it
// finds one, it replaces that event with the supplied one; if not, it appends the
// new event to the array.
function insertOrUpdateScheduledEvent(e) {
	let foundExisting = false;
	for (let i = 0; i < scheduledEvents.length; i++) {
		if (scheduledEvents[i].timestamp == e.timestamp) {
			scheduledEvents[i] = e;
			foundExisting = true;
			break;
		}
	}
	if (!foundExisting) {
		scheduledEvents.push(e);
	}
}

// Fetch any scheduled event we should be caring about at the moment:
// - Get the one with the closest start date in the future, where we are within the countdown period
// - Or the most recent start date in the past, where we are within the duration period
function getActiveScheduledEvent() {
	let nextFutureEvent = null;
	let mostRecentPastEvent = null;
	let now = getDate().getTime();
	for (let i = 0; i < scheduledEvents.length; i++) {
		let e = scheduledEvents[i];
		if (e.timestamp >= now) {
			// Future event. Is it closer to now than our current future event? If not, we don't care.
			if (nextFutureEvent == null || e.timestamp < nextFutureEvent.timestamp) {
				// If it is closer, are we within its countdown period?
				if ((e.timestamp - e.countdownTime) < now) {
					nextFutureEvent = e;
				}
			}
		} else {
			// Past event. Is it more recent than our current past event? If not, we don't care.
			if (mostRecentPastEvent == null || e.timestamp > mostRecentPastEvent.timestamp) {
				// Are we still within the duration period?
				if ((e.timestamp + e.duration) >= now) {
					mostRecentPastEvent = e;
				}
			}
		}
	}

	// If we have both a future and past event, prefer the future one - what's coming up is more important than what's happened
	if (nextFutureEvent != null) {
		return nextFutureEvent;
	} else {
		return mostRecentPastEvent;
	}
}

function loadSlides() {
	// Note: tempslides is loaded from http://fileserver1/scratch/GREENROOM%20SCREEN/dirlist.php by the calling page
	if (loadedFromGreenroom)
	{
		slideTxt = "<div id='img0' class='slideimg'><img src='slides/welcome.jpg'></div>";
		slideTxt += "<div id='img1' class='slideimg'><img src='slides/acrossthecity.jpg'></div>";
		slideTxt += "<div id='img2' class='slideimg'><img src='slides/awards2022.jpg'></div>";
		slideTxt += "<div id='img3' class='slideimg'><img src='slides/liveandlocal.jpg'></div>";
		slideTxt += "<div id='img4' class='slideimg'><img src='slides/localnews.jpg'></div>";
		slideTxt += "<div id='img5' class='slideimg'><img src='slides/travelnews.jpg'></div>";
		maxSlideshowImgs = 5;
		if (typeof tempslides != 'undefined' && tempslides instanceof Array)
		{
			for (i = 0; i < tempslides.length; i++) {
				slideTxt += "<div id='img" + (i+7) + "' class='slideimg'><img src='http://fileserver1/scratch/GREENROOM%20SCREEN/" + tempslides[i] + "' height='720px' width='1280px'></div>";
			}
			maxSlideshowImgs=tempslides.length + 6;
		}
		$('#slideshow').html(slideTxt);
	}
}

function rotateSlideshow() {
	$('#img' + lastSlideshowImg).css("display","none");
	if (lastSlideshowImg == maxSlideshowImgs) {lastSlideshowImg = -1;}
	lastSlideshowImg = lastSlideshowImg + 1;
	$('#img' + lastSlideshowImg).css("display","inline");
}

function checkForSlideRotate() {
	if (secondsSinceSlideChange == 12) {rotateSlideshow(); secondsSinceSlideChange = 0;}
	secondsSinceSlideChange = secondsSinceSlideChange + 1;
}


function loadScheduledMessages() {
    d = getDate();
    messageFile = "messages/"+days[d.getDay()].toLowerCase() + ".js?nocache=" + d.getTime();
    $.ajax({
        url: messageFile, 
        dataType: 'json',
        timeout: 5000
    }).success(function (schedMsgs) {
        for (let i = 0; i < schedMsgs.length; i++) {
        	let m = schedMsgs[i];
			let mDate = getDate();
			mDate.setHours(m.h);
			mDate.setMinutes(m.m);
			mDate.setSeconds(0);
        	insertOrUpdateScheduledEvent({
        		timestamp: mDate.getTime(),
        		label: m.msg,
        		countdownTime: m.c * 1000,
        		duration: m.d * 60 * 1000
        	});
        }
    });
}

function updateClock() {
    let dateParts = getDateParts();
    updateTextClock(dateParts);
    refreshClock();
}

function updateTimer() {
    let dateParts = getDateParts();
    micLiveStatus = getMicLiveStatus();
	getStudioStatus();
	if (loadedFromGreenroom && dateParts[DATEPART_MIN] == 2 && dateParts[DATEPART_SEC] == 0) 
	{
		// Reset the slides animation at xx:02:00
		allowGreenroomSlideAnimation = true; 
		$('#slideshowOverlay').css("display", "none");
		$('#specialNoticeContent').css("display","none");
	}
	
	if (loadedFromGreenroom) {checkForSlideRotate();}
	//displayNetworkMessage();
	if (!displayScheduledEvent()) {
		allowGreenroomSlideAnimation = true;
		displayProgrammeName();
	}

    // At 03:25:00, reload the whole page so we hopefully drop any DOM objects we've leaked
    if (dateParts[DATEPART_HOUR] == 3 && dateParts[DATEPART_MIN] == 25 && dateParts[DATEPART_SEC] == 0) { location.reload(true); }

    return true;
}

function getDateParts() {
	d = getDate();
	if (studioDelay > 0) {
		d = new Date(d.getTime() + (studioDelay * 1000));
	}
	return [d.getHours(), d.getMinutes(), d.getSeconds(), days[d.getDay()], d.getDate(), months[d.getMonth()], d.getFullYear()];
}

function updateTextClock(dateParts) {
    $('#time').html(padZeros(dateParts[DATEPART_HOUR]) + ":" + padZeros(dateParts[DATEPART_MIN]) + ":" + padZeros(dateParts[DATEPART_SEC]));
	if (studioDelay > 0)
	{
		$('#time').html(padZeros(dateParts[DATEPART_HOUR]) + ":" + padZeros(dateParts[DATEPART_MIN]) + ":" + padZeros(dateParts[DATEPART_SEC]) + " (+" + studioDelay + "s)");
	}
    $('#date').html(dateParts[3] + ", " + dateParts[4] + " " + dateParts[5] + " " + dateParts[6]);
}

function getMicLiveStatus() {
	if (runningInStudio == "b" || runningRemote == true) {$('#micLive').css("visibility","hidden"); return;}
    $.ajax({
        url: "http://studioa-pi:8081/miclive",
        dataType: "json",
        timeout: 2000
    }).done(function (data) {
		networkStudioAOK = true;
        if (data['micLiveState'] == '1') { updateLight('micLive',true); } else { updateLight('micLive',false); }
    }).fail(function() {
		networkStudioAOK = false;
	});
}

function getStudioStatus() {
	if (runningRemote == true) { return;}
	$.ajax({
        url: "http://greenroom-pi:8081/studios", 
        dataType: "json",
        timeout: 2000
    }).done(function (data) {
		networkGreenroomOK = true;
        var newStudio;
		if (data['a'] == '1') {updateLight('studioA',true); newStudio = 'Studio A'; } else {updateLight('studioA',false);}
		if (data['b'] == '1') {updateLight('studioB',true); newStudio = 'Studio B'; } else {updateLight('studioB',false);}
		if (data['remote'] == '1') {updateLight('remote',true); newStudio = 'Remote'; } else {updateLight('remote',false);}

        if (currentStudio != null && newStudio !== currentStudio) {
			$('#flash-container').css('display', 'block');
            $('#flash-message').html('Station output changed to ' + newStudio);
            currentStudio = newStudio;
            setTimeout(function() { 
                $('#flash-container').css('display', 'none');
            }, 5000);
        }
	}).fail(function() {
		networkGreenroomOK = false;
	});
}	

function updateLight(divid,status) {
    var div = $('#' + divid);
    if (status) {
        div.css("color","black");
        div.css("background-color","red");
    }
    else {
        div.css("color", "#808080");
        div.css("background-color", "black");
    }
}

function displayScheduledEvent() {
	let e = getActiveScheduledEvent();
	let now = getDate().getTime();
	let labelHtml = null;
	if (e != null) {
		labelHtml = e.label;
		if (e.timestamp >= now) {
			// Event is in the future - we're in countdown mode
			let secsToGo = (e.timestamp - now) / 1000;
			let minsToGo = Math.floor(secsToGo / 60);
			secsToGo = Math.floor(secsToGo - (minsToGo * 60));

			labelHtml = labelHtml + " <span class=\"countdown\">" + padZeros(minsToGo) + ":" + padZeros(secsToGo);
		}

		if (loadedFromGreenroom) {
			$('#onNextText').html(labelHtml);
		} else {
			$('#footer').html(labelHtml);
		}
		return true;
	} else {
		return false;
	}
}

// TODO: reinstate this.
function displayGreenroomNews(type) {
	if ($('#slideshow').html().indexOf('news.jpg') < 1)
	{
		dateParts = getDateParts();
		$('#slideshowOverlay').html('<img src="slides/news.jpg">');
		$('#slideshowOverlay').css("display", "block");
		hours12 = dateParts[0];
		if (hours12 > 12) {hours12 = hours12 - 12;} // 12-hour clock
		if (hours12 < 1) {hours12 = 12;}
		newsintro = "&quot;From the " + type + " at " + hours12 + "...&quot;";
		$('#specialNoticeContent').html(newsintro);
		$('#specialNoticeContent').css("display","inline");
		allowGreenroomSlideAnimation = false;
	}
}

function displayProgrammeName() {
	let currentProgramme = getCurrentProgramme();
	let nextProgramme = getNextProgramme();
	if (loadedFromGreenroom == true)
	{
		if (currentProgramme != null) {
			$('#onNowText').html(currentProgramme.title);
			$('#onNextText').html(nextProgramme.title);
			var nextProgTime = new Date(nextProgramme.start * 1000);
			var nextProgTimeString = setLeadingZeros(nextProgTime.getHours()) + ":" + setLeadingZeros(nextProgTime.getMinutes());
			$('#nextLabel').html(nextProgTimeString);
		} else {
			$('#onNowText').html("Failed to load schedule");
			$('#onNextText').html("-"); 
		}
	}
	else 
	{
		let now = getDate().getTime();
        $('#footer').css('color', 'white');
		if (nextProgramme != null && nextProgramme.start * 1000 < now + 15 * 60 * 1000) {
			// Next programme starts within 15 mins; count down to that instead
			$('#footer').html('<strong>NEXT:</strong> ' + nextProgramme.title + ' (' + nextProgramme.type + ')');
		} else if (currentProgramme != null) {
        	$('#footer').html(currentProgramme.title);
		} else {
			$('#footer').html("Failed to load schedule");
		}
	}
}

function setLeadingZeros(myInt) {
	myInt = myInt + ""; // Force cast to string
	if (myInt.length > 1) {return myInt;}
	else {return "0" + myInt;}
}

function loadSchedule() {
    timeNow = getDate().getTime();
    $.ajax({
        url: "schedule.js?nocache=" + (getDate()).getTime(),
        dataType: "json",
        timeout: 10000
    }).success(function (sched) {
    	schedule = sched;
    });
}

function getCurrentProgramme() {
	if (!schedule) {
		return null;
	}
	let now = getDate().getTime();
	for (let i = 0; i < schedule.length; i++) {
		let p = schedule[i];
		if (p.start * 1000 <= now && p.end * 1000 > now) {
			return p;
		}
	}
	return null;
}

function getNextProgramme() {
	if (!schedule) {
		return null;
	}
	let now = getDate().getTime();
	let nextProgramme = null;
	for (let i = 0; i < schedule.length; i++) {
		let p = schedule[i];
		if (p.start * 1000 > now && (nextProgramme == null || p.start < nextProgramme.start)) {
			nextProgramme = p;
		}
	}
	return nextProgramme;
}

function padZeros(num) {
    if (num < 10) { num = "0" + num; }
    return num;
}

function getEngineeringMessage() {
    if (!loadedFromGreenroom && !runningRemote)
	{
		 var req = $.ajax({
			url: "https://clock.cambridge105.co.uk/studioMessage.js?nocache=" + (getDate()).getTime(),
			dataType: "json",
			timeout: 5000
		});

		req.success(displayMessage);

		req.fail(function () {
			networkExternalOK = false; 
		});
	}
}

function checkForIrn() {
	// Don't check for IRN in the first 45 minutes of the hour: it won't be valid yet
	if (getDate().getMinutes() < 45)
		return;

	var req = $.ajax({
		type: 'GET',
		crossDomain: true,
		dataType: 'text',
		url: apiBase + "trackdata/irnnext?nocache=" + (getDate()).getTime(),
		headers: {
			"Access-Control-Request-Method": "Get",
			"Access-Control-Request-Headers": "Content-Type"
		},
		timeout: 3000
	});

	req.success(scheduleIrnCountdown);

	req.fail(function () {
		console.log("IRN False");
		hasIrnNextHour = false;
	});
}

function scheduleIrnCountdown() {
	// Work out the time IRN is going to start - top of the *next* hour
	let irnStartTime = getDate();
	irnStartTime.setHours(irnStartTime.getHours() + 1);
	irnStartTime.setMinutes(0);
	irnStartTime.setSeconds(0);
	insertOrUpdateScheduledEvent({
		timestamp: irnStartTime.getTime(),
		label: "SKY NEWS",
		countdownTime: 60 * 1000,
		duration: 2 * 60 * 1000,
	});
}

function checkForAds() {
	// Don't check for TOTH ads in the first 45 minutes of the hour: it won't be valid yet
	if (getDate().getMinutes() < 45)
		return;
	
	var req = $.ajax({
		type: 'GET',
		crossDomain: true,
		dataType: 'text',
		url: apiBase + "trackdata/tothbreak?nocache=" + (getDate()).getTime(),
		headers: {
			"Access-Control-Request-Method": "Get",
			"Access-Control-Request-Headers": "Content-Type"
		},
		timeout: 3000
	});

	req.success(scheduleAdsCountdown);
}

function scheduleAdsCountdown() {
	// Work out the time the TOTH ads are going to start
	let tothStartTime = getDate();
	tothStartTime.setMinutes(58);
	tothStartTime.setSeconds(30);
	insertOrUpdateScheduledEvent({
		timestamp: tothStartTime.getTime(),
		label: "TOTH SEQUENCE",
		countdownTime: 5 * 60 * 1000,
		duration: 90 * 1000,
	});
}

function displayMessage(response) {
	networkExternalOK = true;
	if (response.content && response.content.length > 3) {
		displayMessageText('<span class=\"' + response.class + '\">' + response.content + '</span>');
	} else 	{
		displayMessageText('');
	}
}

function displayMessageText(message) {
	if (!loadedFromGreenroom)
	{
        $('#message').html(message);
        if (message.length < 1) { $('#message').hide(); } else { $('#message').show(); }
	}
}

function createClock() {
	if (loadedFromGreenroom) {radius = 160;} else {radius = 200;}
    clock = new CoolClock({
        canvasId:       'clockid',
        skinId:         'chunkySwissOnBlack',
        displayRadius:  radius
    });
    clock.stop(); // stop the internal timer so we can refresh manually
}

function refreshClock() {
    if(clock) {
        clock.refreshDisplay();
    }
}

function displayNetworkMessage() {
	if (networkExternalOK == true)
	{
		if (networkGreenroomOK == false && networkStudioAOK == false) {displayMessageText('ERROR: Green Room and Studio A Pis appear offline. All info may be inaccurate.');}
		else if (networkGreenroomOK == false) {displayMessageText('ERROR: Green Room Pi offline. Studio switching status may be inaccurate.');}
		else if (networkStudioAOK == false) {displayMessageText('ERROR: Studio A Pi offline. Mic live status may be inaccurate.');}
		else { };
	}
	else
	{
		if (networkStudioAOK == false || networkGreenroomOK == false) {displayMessageText('ERROR: No network connection. All info may be inaccurate.');}
		else (displayMessageText('ERROR: No WAN connection. Schedule may be inaccurate.'));
	}
}

function getParameterByName(name, url) {
	//From: https://stackoverflow.com/questions/901115/how-can-i-get-query-string-values-in-javascript
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

function checkRunningStudio() {
	let studio = getParameterByName("studio");
	if (!studio || studio == "remote") {
		// Studio not set, so assume remote
		runningInStudio = "remote";
		runningRemote = true;
		return;
	} else {
		runningInStudio = studio.toLowerCase();
		runningRemote = false;
	}
}

function checkForOBDelay() {
	let delay = getParameterByName("delay");
	if (delay != null) {
		studioDelay = delay;
	}
}
