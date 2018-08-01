var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
var clockTimer = setInterval(function () { updateClock() }, 250);
var mainTimer = setInterval(function () { updateTimer() }, 1000);
var thisProg = "";
var nextProg = "";
var thisProgIsLive = false;
var thisProgEnds = 0;
var nextProgType = "";
var scheduledMessages = [];
var tothRules = [];
var clock = null;
var hasIrnNextHour = false;
var hasNewsNextHour = false;
var hasRecordedWeatherNextHour = false;
var hasLocalReadWeatherNextHour = false;
var networkGreenroomOK = true;
var networkStudioAOK = true;
var networkExternalOK = true;
var hasTOTHAdSequence = false;
var currentStudio = "";
var loadedFromGreenroom = false;
var allowGreenroomSlideAnimation = true;
var maxSlideshowImgs = 0;
var lastSlideshowImg = -1;
var secondsSinceSlideChange = 12;
var runningInStudio = "";
var studioDelay = 0;
var nextTOTHRuleName = "";
var nextTOTHRuleTime = 0;
loadScheduledMessages();
loadSchedule();
checkRunningStudio();
loadTOTHRules();
checkForOBDelay();

if (window.location.href.indexOf("greenroom") > -1) {loadedFromGreenroom = true;}

$(function() {
    createClock();
	loadSlides();
});



function loadSlides() {
	// Note: tempslides is loaded from http://fileserver1/scratch/GREENROOM%20SCREEN/dirlist.php by the calling page
	if (loadedFromGreenroom)
	{
		slideTxt = "<div id='img0' class='slideimg'><img src='slides/welcome.jpg' height='720px' width='1280px'></div>";
		slideTxt += "<div id='img1' class='slideimg'><img src='slides/how-to-listen.jpg' height='720px' width='1280px'></div>";
		slideTxt += "<div id='img2' class='slideimg'><img src='slides/home-of-music.jpg' height='720px' width='1280px'></div>";
		slideTxt += "<div id='img3' class='slideimg'><img src='slides/news-promo.jpg' height='720px' width='1280px'></div>";
		slideTxt += "<div id='img4' class='slideimg'><img src='slides/guests.jpg' height='720px' width='1280px'></div>";
		slideTxt += "<div id='img5' class='slideimg'><img src='slides/travel.jpg' height='720px' width='1280px'></div>";
		slideTxt += "<div id='img6' class='slideimg'><img src='slides/south-cambs.jpg' height='720px' width='1280px'></div>";
		maxSlideshowImgs = 6;
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
	$('#img' + lastSlideshowImg).css("visibility","hidden");
	if (lastSlideshowImg == maxSlideshowImgs) {lastSlideshowImg = -1;}
	lastSlideshowImg = lastSlideshowImg + 1;
	$('#img' + lastSlideshowImg).css("visibility","visible");
}

function checkForSlideRotate() {
	if (secondsSinceSlideChange == 12) {rotateSlideshow(); secondsSinceSlideChange = 0;}
	secondsSinceSlideChange = secondsSinceSlideChange + 1;
}


function loadScheduledMessages() {
    d = new Date();
    scheduledMessages = [];
    messageFile = "messages/"+days[d.getDay()].toLowerCase() + ".js?nocache=" + d.getTime();
    $.ajax({
        url: messageFile, 
        dataType: 'json',
        timeout: 5000
    }).success(function (schedMsgs) {
        scheduledMessages = schedMsgs;
    });
}

function loadTOTHRules() {
    d = new Date();
    tothRules = [];
    messageFile = "tothrules.json?nocache=" + d.getTime();
    $.ajax({
        url: messageFile, 
        dataType: 'json',
        timeout: 5000
    }).success(function (rulesjson) {
        tothRules = rulesjson;
		parseTothRules();
    });
}


function unloadTimeout() {
    clearInterval(mainTimer);
    clearInterval(clockTimer);
}

function updateClock() {
    var dateParts = [0, 0, 0, 'Monday', 1, 'January', 1970];
    dateParts = getDateParts();
    updateTextClock(dateParts);
    refreshClock();
}

function parseTothRules() {
	// Note this won't work at midnight at present
	d = new Date();
	thisDay = d.getDay() - 1;
	if (thisDay == -1) {thisDay = 6;} // Because the JSON file starts on Monday but JS doesn't
	nextHour = d.getHours() + 1;
	if (nextHour > 23) {nextHour = 0;}
	todaysRules = tothRules["toths"][thisDay]["hours"];
	for (var i = 0; i < todaysRules.length; i++) {
		console.log("Checking " + todaysRules[i]["hour"]);
		if (todaysRules[i]["hour"] == nextHour)
		{
			applyTOTHRule(todaysRules[i]["items"]);
		}	
	}
}

function applyTOTHRule(ruleString) {
	console.log("Applying rule " + ruleString);
	if (ruleString.indexOf("LOCALNEWS") > -1) {hasNewsNextHour = true;}
	ruleAr = ruleString.split(",");
	var tmpDateNow = new Date();
	for (var i=0; i<ruleAr.length; i++) {
		var tmpRuleName = ruleAr[i];
		var tmpRuleDate = new Date();
		for (var j=0; j<tothRules["timings"].length; j++) {
			if (tothRules["timings"][j]["name"] == tmpRuleName)
			{
				tmpRuleDate.setMinutes(tothRules["timings"][i]["startat"]["minutes"]);
				tmpRuleDate.setSeconds(tothRules["timings"][i]["startat"]["seconds"]);
				if (tmpDateNow < tmpRuleDate)
				{
					nextTOTHRuleName = tmpRuleName;
					nextTOTHRuleTime = tmpRuleDate;
					console.log ("Set rule " + nextTOTHRuleName + " at " + nextTOTHRuleTime);
					return true;
				}
			}
		}
	}
	return false;
}

function updateTimer() {
    var dateParts = [0, 0, 0, 'Monday', 1, 'January', 1970];
    dateParts = getDateParts();
    micLiveStatus = getMicLiveStatus();
	getStudioStatus();
    checkForScheduledNotices(dateParts);
	if (loadedFromGreenroom && dateParts[1] == 2 && dateParts[2] == 0) 
	{
		// Reset the slides animation at xx:02:00
		allowGreenroomSlideAnimation = true; 
		$('#slideshowOverlay').css("display", "none");
		$('#specialNotice').css("visibility","hidden");
	} 
	if (loadedFromGreenroom) {checkForSlideRotate();}
	//displayNetworkMessage();
    // Only load the schedule at xx:03:00, xx:30:00
    if (((dateParts[1] == 3 || dateParts[1] == 30) && dateParts[2] == 0)) { loadSchedule();}
    // Only update the engineering notice at xx:00:15, xx:10:15, xx:20:15 etc.
    if ((dateParts[1] == 0 || dateParts[1] == 10 || dateParts[1] == 20 || dateParts[1] == 30 || dateParts[1] == 40 || dateParts[1] == 50) && dateParts[2] == 15) { getEngineeringMessage(); }
	// At xx:52:00 check whether IRN is scheduled
	if ((dateParts[1] == 52) && (dateParts[2] == 0)) {checkForIrn(); checkForAds(); }
	// At xx:53:00 check whether weather is scheduled
	if ((dateParts[1] == 53) && (dateParts[2] == 0)) {checkForWeather();}
	// At xx:31:00 reload the TOTH rules
	if (dateParts[1] == 31 && dateParts[2] == 0) {nextTOTHRuleName=""; nextTOTHRuleTime=0; parseTothRules();}
    // At xx:49:00 unset the IRN/News/weather check
	if (dateParts[1] == 49 && dateParts[2] == 0) {hasIrnNextHour = false; hasRecordedWeatherNextHour = false; hasLocalReadWeatherNextHour = false; hasTOTHAdSequence = false; hasNewsNextHour = false;}
    // At 03:25:00, reload the whole page so we hopefully drop any DOM objects we've leaked
    if (dateParts[0] == 3 && dateParts[1] == 25 && dateParts[2] == 0) { location.reload(true); }

    return true;
}

function getDateParts() {
	d = new Date();
	if (studioDelay > 0) {
		d = new Date(d.getTime() + (studioDelay * 1000));
	}
	return [d.getHours(), d.getMinutes(), d.getSeconds(), days[d.getDay()], d.getDate(), months[d.getMonth()], d.getFullYear()];
}

function updateTextClock(dateParts) {
    $('#time').html(padZeros(dateParts[0]) + ":" + padZeros(dateParts[1]) + ":" + padZeros(dateParts[2]));
	if (studioDelay > 0)
	{
		$('#time').html(padZeros(dateParts[0]) + ":" + padZeros(dateParts[1]) + ":" + padZeros(dateParts[2]) + " (+" + studioDelay + "s)");
	}
    $('#date').html(dateParts[3] + ", " + dateParts[4] + " " + dateParts[5] + " " + dateParts[6]);
}

function getMicLiveStatus() {
	if (runningInStudio == "b") {$('#micLive').css("visibility","hidden"); return;}
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

        if (newStudio !== currentStudio) {
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


function checkForScheduledNotices(dateParts) {
    messageSet = false;
    if (dateParts[1] >= 55) { calculateTOTHNotice(dateParts[1], dateParts[2]); messageSet = true;} //TODO: Don't actually want to set messageSet here because if the programme continues into the next hour, we shouldn't pause greenroom animations
    else if (dateParts[1] < 2 && hasNewsNextHour == true) {displayNewsStatus(); messageSet = true;}
    else if (dateParts[1] < 2 && hasIrnNextHour == true) {displayIrnWeatherStatus(); messageSet = true;}
    else if (dateParts[2] == 1) {
        // Update only once a minute so we don't degrade performance
        // NB: This is a bit of a hack but it's done at xx:xx:01 to ensure we reset after schedule loads at xx:00:00 and xx:30:00
        // Is it time for travel?
        //console.log("Scheduled messages; " + scheduledMessages);
        $.each(scheduledMessages, function (key, schedMsg) {
                    //console.log(schedMsg);
                    offtime = schedMsg["m"] + schedMsg["d"];
                    if (dateParts[0] == schedMsg["h"] && dateParts[1] >= schedMsg["m"] && dateParts[1] < offtime)
                        {displayNotice(schedMsg["msg"],schedMsg["c"]); messageSet = true;}
                });
        if (messageSet == false)
        {
			allowGreenroomSlideAnimation = true;
			if (loadedFromGreenroom)
			{
				displayProgrammeName();
			}
			else
			{
                if (dateParts[1] >= 45 && endOfProgInNext15Mins()) { displayNextProgramme(); }
                else { displayProgrammeName(); }
			}
        }
    }
}
        
function displayIrnWeatherStatus() {
	if (!loadedFromGreenroom)
	{
        $('#footer').css('color', 'yellow');
        if (hasRecordedWeatherNextHour == true) {
            $('#footer').html('SKY NEWS then RECORDED WEATHER');
		}
		else {
			$('#footer').html('SKY NEWS. No weather follows.');
		}
	}
	else {
		displayGreenroomNews('Sky News Centre')
	}
	
}

function displayNewsStatus() {
	if (!loadedFromGreenroom)
	{
        $('#footer').css('color', 'yellow');
        $('#footer').html('LOCAL NEWS');
	}
	else {
		displayGreenroomNews('Cambridge newsdesk');
	}
}

function displayGreenroomNews(type) {
	if ($('#slideshow').html().indexOf('news.jpg') < 1)
	{
		dateParts = getDateParts();
		$('#slideshowOverlay').html('<img src="slides/news.jpg" height="720px" width="1280px">');
		$('#slideshowOverlay').css("display", "block");
		hours12 = dateParts[0];
		if (hours12 > 12) {hours12 = hours12 - 12;} // 12-hour clock
		if (hours12 < 1) {hours12 = 12;}
		newsintro = "&quot;From the " + type + " at " + hours12 + "...&quot;";
		$('#specialNoticeContent').html(newsintro);
		$('#specialNotice').css("visibility","visible");
		allowGreenroomSlideAnimation = false;
	}
}

function calculateTOTHNotice(mins,secs) {
	//Logic
	var d = new Date();
	// 0.  If there's a rule set in the past, reload the rules
	if (nextTOTHRuleTime <= d && nextTOTHRuleTime != 0) {nextTOTHRuleTime  = 0; parseTothRules(); calculateTOTHNotice(mins,secs);}
	//  1. If there's a rule set in the future, countdown to the next rule 
	else if (nextTOTHRuleTime >= d) {displayTOTHNotice(nextTOTHRuleName + " in ", mins, secs);}
	// 2.  If there's IRN next, countdown to IRN, starting at xx:58:51
	else if (hasIrnNextHour == true) {displayTOTHNotice("TIMECHECK in ", mins, secs);}
	// 3. If the end of programme is next, count to end of prog
	else if (endOfProgInNext15Mins() == true) {displayProgEndCountdown();}
	// 5. Do nothing (programme continues)
	return false;
}



function displayTOTHNotice(noticeText, mins,secs) {
    var showCountdown = true;
	
	if (!loadedFromGreenroom) 
	{
        $('#footer').css('color', 'yellow'); 
		divToFill = "footer";
	}
	else 
	{
		divToFill = "onNextBar";
		$('#nextLabel').html("-");
	}
	
	if (mins > 58 && secs > 47)
	{
			showCountdown = false;
		    if (secs < 53) 
			{
				$('#' + divToFill).html('&quot;Online, on Digital and on FM...');
				if (loadedFromGreenroom == true)
				{
					if ($('#slideshowOverlay').html().indexOf('toth.jpg') < 1)
					{
						$('#slideshowOverlay').html('<img src="slides/toth.jpg" height="720px" width="1280px">');
						$('#slideshowOverlay').css("display", "block");
						allowGreenroomSlideAnimation = false;
					}
				}
			}
			else
			{
				$('#' + divToFill).html('...this is Cambridge 105 Radio&quot;');
			}
	}
	else if (nextTOTHRuleTime == 0 && hasIrnNextHour == true)
	{
		secsToGo = ((59 - mins) * 60) + (60 - secs);
		secsToGo = secsToGo - 23; // Timecheck
		if (secsToGo < 0) {noticeText = "SKY NEWS in"; secsToGo=secsToGo+11;} // True during timecheck, count to news jingle
	}
	else 
	{
		var tmpTimeNow = new Date();
		var tmpTimeDiff = nextTOTHRuleTime.getTime() - tmpTimeNow.getTime(); 
		secsToGo = tmpTimeDiff / 1000;
	}
	if (showCountdown == true)
	{
		minsToGo = Math.floor(secsToGo / 60);
		secsToGo = Math.floor(secsToGo - (minsToGo * 60));
		countToRule = padZeros(minsToGo) + ":" + padZeros(secsToGo);
		$('#' + divToFill).html(noticeText + ' <span class="countdown">' + countToRule + '</span>');
	}
}
	
	

function displayProgEndCountdown() {
	if (!loadedFromGreenroom)
    {
        $('#footer').css('color', 'yellow');
        d = new Date;
        secsToEnd = Math.floor((thisProgEnds - d.getTime())/1000);
        minsToEnd = Math.floor(secsToEnd / 60);
        secsToEnd = secsToEnd - (minsToEnd * 60);
        countToEnd = padZeros(minsToEnd) + ":" + padZeros(secsToEnd);
        $('#footer').html('Programme ends in: <span class="countdown">' + countToEnd + '</span>');
	}
}

function displayNotice(message,color) {
    if (!loadedFromGreenroom)
	{
        if (color === undefined || color.length<1) {color = "yellow";}
        $('#footer').css('color', color);
        $('#footer').html(message);
	}
}

function displayNextProgramme() {
	if (!loadedFromGreenroom)
	{
        $('#footer').css('color', 'white');
        $('#footer').html('<strong>NEXT:</strong> ' + nextProg + " (" + nextProgType + ")");
        if (nextProg.length < 1) { $('#footer').html('<strong>NEXT:</strong> Failed to load schedule'); }
	}
	// Don't need to display next in Greenroom as this is done by displayProgrammeName()
}

function displayProgrammeName() {
	if (loadedFromGreenroom == true)
	{
		$('#onNowBar').html(thisProg);
		$('#onNextBar').html(nextProg);
		var nextProgTime = new Date(thisProgEnds);
		var nextProgTime = setLeadingZeros(nextProgTime.getHours()) + ":" + setLeadingZeros(nextProgTime.getMinutes());
		$('#nextLabel').html(nextProgTime);
		if (thisProg.length < 1) { $('#onNowBar').html("Failed to load schedule"); $('#onNextBar').html("-"); }
	}
	else 
	{
        $('#footer').css('color', 'white');
        $('#footer').html(thisProg);
        if (thisProg.length < 1) { $('#footer').html("Failed to load schedule"); }
	}
}

function setLeadingZeros(myInt) {
	myInt = myInt + ""; // Force cast to string
	if (myInt.length > 1) {return myInt;}
	else {return "0" + myInt;}
}

function loadSchedule() {
    thisProg = "";
    nextProg = "";
    thisProgEnds = 0;
    thisProgIsLive = false;
    nextProgType = "";
    timeNow = new Date().getTime() + 5000; // Pretend we're 5 secs in the future to avoid race condition if we load exactly when a prog ends
    $.ajax({
        url: "schedule.js?nocache=" + (new Date()).getTime(),
        dataType: "json",
        timeout: 10000
    }).success(function (sched) {
        $.each(sched, function (key, progInfo) {
            //$.each(progInfo, function (progInfoKey, progInfoValue) {
                //console.log("Loading: " + progInfo['title']);
                if ((progInfo['start'] * 1000) <= timeNow && (progInfo['end'] * 1000) > timeNow) {
                    thisProg = progInfo['title'];
                    console.log("Current programme " + thisProg);
                    if (progInfo['type'] == "LIVE") { thisProgIsLive = true; } else { thisProgIsLive = false; }
                    thisProgEnds = progInfo['end'] * 1000;
                }
                else if ((progInfo['start'] * 1000) == thisProgEnds) {
                    nextProg = progInfo['title'];
                    nextProgType = progInfo['type'];
                }
            //});
        });
		displayProgrammeName();
    });
}

function endOfProgInNext15Mins() {
    timeNow = new Date().getTime();
    timeRemaining = thisProgEnds - timeNow;
    if (timeRemaining <= (15 * 60 * 1000)) { return true; }
    return false;
}

function padZeros(num) {
    if (num < 10) { num = "0" + num; }
    return num;
}

function getEngineeringMessage() {
    if (!loadedFromGreenroom)
	{
		 var req = $.ajax({
			url: "http://cambridge105.github.io/studio-screen/studioMessage.js",
			dataType: "jsonp",
			timeout: 5000,
			jsonpCallback: "displayMessage"
		});

		req.success(function () {
			// Nothing
		});

		req.fail(function () {
			networkExternalOK = false; 
		});
	}
}

function checkForIrn() {
    var req = $.ajax({
        url: "http://fileserver1/trackdata/irnnext",
        timeout: 3000
    });

    req.success(function () {
        hasIrnNextHour = true;
    });

    req.fail(function () {
        hasIrnNextHour = false;
    });
}

function checkForWeather() {
    var req = $.ajax({
        url: "http://fileserver1/trackdata/weathernext",
        timeout: 3000
    });

    req.success(function () {
        hasRecordedWeatherNextHour = true;
    });

    req.fail(function () {
        hasRecordedWeatherNextHour = false;
    });
}

function checkForAds() {
	var req = $.ajax({
        url: "http://fileserver1/trackdata/tothbreak",
        timeout: 3000
    });

    req.success(function () {
        hasTOTHAdSequence = true;
    });

    req.fail(function () {
        hasTOTHAdSequence = false;
    });
}

// This function is no longer called. Left in case we need it in the future.
function checkForLocalReadWeather() {
	hasLocalReadWeatherNextHour = false;
	 $.each(scheduledMessages, function (key, schedMsg) {
                    if ((dateParts[0]+1) == schedMsg["h"] && schedMsg["m"]==2 && schedMsg["msg"]=="WEATHER")
                        {hasLocalReadWeatherNextHour = true;}
                });
}



function displayMessage(response) {
	networkExternalOK = true;
	if (response.message.length > 1)
		{displayMessageText('<span class=\"engNotice\">Engineering notice:</span><br />' + response.message);}
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
	studio = getParameterByName("studio");
	if (!studio) {
		// Studio not set, so assume 'A' which is default anyway
		runningInStudio = "a";
		return;
	}
	runningInStudio = studio.toLowerCase();
}

function checkForOBDelay() {
	delay = getParameterByName("delay");
	if (delay) {
		studioDelay = delay;
	}
}
