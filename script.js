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
var clock = null;
var hasIrnNextHour = false;
var hasNewsNextHour = false;
var hasRecordedWeatherNextHour = false;
var hasLocalReadWeatherNextHour = false;
var networkGreenroomOK = true;
var networkStudioAOK = true;
var networkExternalOK = true;
loadScheduledMessages();
loadSchedule();

$(function() {
    createClock();
});

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

function updateTimer() {
    var dateParts = [0, 0, 0, 'Monday', 1, 'January', 1970];
    dateParts = getDateParts();
    micLiveStatus = getMicLiveStatus();
	getStudioStatus();
    checkForScheduledNotices(dateParts);
	//displayNetworkMessage();
    // Only load the schedule at xx:00:00, xx:30:00
    if (((dateParts[1] == 0 || dateParts[1] == 30) && dateParts[2] == 0)) { loadSchedule();}
    // Only update the engineering notice at xx:00:15, xx:10:15, xx:20:15 etc.
    if ((dateParts[1] == 0 || dateParts[1] == 10 || dateParts[1] == 20 || dateParts[1] == 30 || dateParts[1] == 40 || dateParts[1] == 50) && dateParts[2] == 15) { getEngineeringMessage(); }
	// At xx:51:00 check whether the next hour has news
	if ((dateParts[1] == 51) && (dateParts[2] == 0)) {hasNewsNextHour = checkForNewsNextHour((dateParts[0] + 1), dateParts[3]);}
	// At xx:52:00 check whether IRN is scheduled
	if ((dateParts[1] == 52) && (dateParts[2] == 0)) {checkForIrn();}
	// At xx:53:00 check whether weather is scheduled
	if ((dateParts[1] == 53) && (dateParts[2] == 0)) {checkForWeather();}
	// At xx:49:00 unset the IRN/News/weather check
	if (dateParts[1] == 49 && dateParts[2] == 0) { hasNewsNextHour=false; hasIrnNextHour = false; hasRecordedWeatherNextHour = false; hasLocalReadWeatherNextHour = false;}
    // At 03:25:00, reload the whole page so we hopefully drop any DOM objects we've leaked
    if (dateParts[0] == 3 && dateParts[1] == 25 && dateParts[2] == 0) { location.reload(true); }

    return true;
}

function getDateParts() {
    d = new Date();
    return [d.getHours(), d.getMinutes(), d.getSeconds(), days[d.getDay()], d.getDate(), months[d.getMonth()], d.getFullYear()];
}

function updateTextClock(dateParts) {
    $('#time').html(padZeros(dateParts[0]) + ":" + padZeros(dateParts[1]) + ":" + padZeros(dateParts[2]));
    $('#date').html(dateParts[3] + ", " + dateParts[4] + " " + dateParts[5] + " " + dateParts[6]);
}

function getMicLiveStatus() {
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
		if (data['a'] == '1') {updateLight('studioA',true);} else {updateLight('studioA',false);}
		if (data['b'] == '1') {updateLight('studioB',true);} else {updateLight('studioB',false);}
		if (data['remote'] == '1') {updateLight('remote',true);} else {updateLight('remote',false);}
	}).fail(function() {
		networkGreenroomOK = false;
	});
}	

function updateLight(divid,status) {
    if (status == true) {
        $('#'+divid).css("color","black");
        $('#'+divid).css("background-color","red");
    }
    else {
        $('#'+divid).css("color", "#808080");
        $('#'+divid).css("background-color", "black");
    }
}


function checkForScheduledNotices(dateParts) {
    messageSet = false;
    if (dateParts[1] >= 55 && (hasNewsNextHour == true || hasIrnNextHour == true)) { displayTOTHNotice(dateParts[1], dateParts[2]); messageSet = true;}
	else if (dateParts[1] >= 55 && endOfProgInNext15Mins() == true) { displayProgEndCountdown(); messageSet = true;}
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
            if (dateParts[1] >= 45 && endOfProgInNext15Mins()) { displayNextProgramme(); }
            else { displayProgrammeName(); }
        }
    }
}
        
function displayIrnWeatherStatus() {
	$('#footer').css('color', 'yellow');
	if (hasRecordedWeatherNextHour == true) {
		$('#footer').html('SKY NEWS then RECORDED WEATHER');
	}
	else {
		$('#footer').html('SKY NEWS. No weather follows.');
	}
}

function displayNewsStatus() {
	$('#footer').css('color', 'yellow');
	$('#footer').html('LOCAL NEWS');
}

function displayTOTHNotice(mins,secs) {
    $('#footer').css('color', 'yellow');
	secsToTOTH = ((59 - mins) * 60) + (60 - secs);
    secsToTOTH = secsToTOTH - 12; // News intro
    if (secsToTOTH < 0) {
        $('#footer').html('&quot;This is community radio in your city, Cambridge 105&quot;');
    }
    else {
        minsToTOTH = Math.floor(secsToTOTH / 60);
        secsToTOTH = secsToTOTH - (minsToTOTH * 60);
        countToNews = padZeros(minsToTOTH) + ":" + padZeros(secsToTOTH);
		if (hasNewsNextHour == true) {newsType = "LOCAL";} else {newsType="SKY";}
        $('#footer').html(newsType + ' NEWS INTRO in: <span class="countdown">' + countToNews + '</span>');
    }
}


function displayProgEndCountdown() {
    $('#footer').css('color', 'yellow');
	d = new Date;
    secsToEnd = Math.floor((thisProgEnds - d.getTime())/1000);
	minsToEnd = Math.floor(secsToEnd / 60);
    secsToEnd = secsToEnd - (minsToEnd * 60);
    countToEnd = padZeros(minsToEnd) + ":" + padZeros(secsToEnd);
	$('#footer').html('Programme ends in: <span class="countdown">' + countToEnd + '</span>');

}

function displayNotice(message,color) {
    if (color === undefined || color.length<1) {color = "yellow";}
    $('#footer').css('color', color);
    $('#footer').html(message);
}

function displayNextProgramme() {
    $('#footer').css('color', 'white');
    $('#footer').html('<strong>NEXT:</strong> ' + nextProg + " (" + nextProgType + ")");
    if (nextProg.length < 1) { $('#footer').html('<strong>NEXT:</strong> Failed to load schedule'); }
}

function displayProgrammeName() {
    $('#footer').css('color', 'white');
    $('#footer').html(thisProg);
    if (thisProg.length < 1) { $('#footer').html("Failed to load schedule"); }
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
                    displayProgrammeName();
                }
                else if ((progInfo['start'] * 1000) == thisProgEnds) {
                    nextProg = progInfo['title'];
                    nextProgType = progInfo['type'];
                }
            //});
        });
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

// This function is no longer called. Left in case we need it in the future.
function checkForLocalReadWeather() {
	hasLocalReadWeatherNextHour = false;
	 $.each(scheduledMessages, function (key, schedMsg) {
                    if ((dateParts[0]+1) == schedMsg["h"] && schedMsg["m"]==2 && schedMsg["msg"]=="WEATHER")
                        {hasLocalReadWeatherNextHour = true;}
                });
}

function checkForNewsNextHour(nextHour,day) {
	console.log(nextHour + ":" + day);
	if (day == "Sunday") 
	{
		if (nextHour>7 && nextHour<11) {return true;}
	}
	else if (day == "Saturday")
	{
		if (nextHour>7 && nextHour<10) {return true;}
	}
	else if (day != "Saturday" && day != "Sunday")
	{
		if ((nextHour>6 && nextHour<10) || (nextHour==13) || (nextHour>15 && nextHour<19)) {return true;}
	}
	return false;
}

function displayMessage(response) {
	networkExternalOK = true;
	if (response.message.length > 1)
		{displayMessageText('<span class=\"engNotice\">Engineering notice:</span><br />' + response.message);}
}

function displayMessageText(message) {
	$('#message').html(message);
    if (message.length < 1) { $('#message').hide(); } else { $('#message').show(); }
}

function createClock() {
    clock = new CoolClock({
        canvasId:       'clockid',
        skinId:         'chunkySwissOnBlack',
        displayRadius:  200
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
