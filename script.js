var days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
var months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
var clockTimer = setInterval(function () { updateClock() }, 250);
var mainTimer = setInterval(function () { updateTimer() }, 1000);
var thisProg = "";
var nextProg = "";
var thisProgIsLive = false;
var thisProgEnds = 0;
var nextProgType = "";
loadSchedule();

function unloadTimeout() {
    clearInterval(mainTimer);
    clearInterval(clockTimer);
}

function updateClock() {
    var dateParts = [0, 0, 0, 'Monday', 1, 'January', 1970];
    dateParts = getDateParts();
    updateTextClock(dateParts);
}

function updateTimer() {
    var dateParts = [0, 0, 0, 'Monday', 1, 'January', 1970];
    dateParts = getDateParts();
    micLiveStatus = getMicLiveStatus();
    checkForScheduledNotices(dateParts);
    // Only load the schedule at xx:00:00, xx:30:00
    if (((dateParts[1] == 0 || dateParts[1] == 30) && dateParts[2] == 0)) { loadSchedule(); }
    // Only update the engineering notice at xx:00:15 and xx:30:15
    if ((dateParts[1] == 0 && dateParts[2] == 15) || (dateParts[1] == 30 && dateParts[2] == 15)) { getEngineeringMessage(); }
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
    $.getJSON("micLive.js?nocache=" + (new Date()).getTime(), function (data) {
        if (data['micLiveState'] == '1') { updateMicLiveLight(true); } else { updateMicLiveLight(false); }
    });
}

function updateMicLiveLight(micLiveStatus) {
    if (micLiveStatus == true) {
        $('#micLive').css("color","black");
        $('#micLive').css("background-color","red");
    }
    else {
        $('#micLive').css("color", "#808080");
        $('#micLive').css("background-color", "black");
    }
}

function updateStudioLiveLight() {
    if (thisProgIsLive == true) {
        $('#studioLive').css("color", "black");
        $('#studioLive').css("background-color", "orange");
    }
    else {
        $('#studioLive').css("color", "#808080");
        $('#studioLive').css("background-color", "black");
    }
}

function checkForScheduledNotices(dateParts) {
    // Is it nearly the TOTH?
    if (dateParts[1] >= 55) { displayTOTHNotice(dateParts[1], dateParts[2]); }
    else if (dateParts[2] == 1) {
        // Update only once a minute so we don't degrade performance
        // NB: This is a bit of a hack but it's done at xx:xx:01 to ensure we reset after schedule loads at xx:00:00 and xx:30:00
        // Is it time for travel?
        if ((((dateParts[0] >= 7 && dateParts[0] < 10) || (dateParts[0] >= 16 && dateParts[0] < 19))) && ((dateParts[1] >= 19 && dateParts[1] <= 21) || (dateParts[1] >= 39 && dateParts[1] <= 41) || (dateParts[1] >= 54 && dateParts[1] <= 56))) { displayTravelNotice(); }
            // Display fire alarm test due if it is
        else if (dateParts[5] == "Wednesday" && dateParts[0] == 10 && dateParts[1] >= 22 && dateParts[1] < 28) { displayFireAlarmTestDue(); }
            // Is it time for headlines?
        else if ((((dateParts[0] >= 7 && dateParts[0] < 10) || (dateParts[0] >= 16 && dateParts[0] < 19))) && ((dateParts[1] >= 29 && dateParts[1] <= 31))) { displayHeadlinesNotice(); }
            // Display next programme if within 15 mins of the end of this one
        else if (dateParts[1] >= 45 && endOfProgInNext15Mins()) { displayNextProgramme(); }
        else { displayProgrammeName(); }
    }
}

function displayTOTHNotice(mins,secs) {
    $('#footer').css('color', 'yellow');
    secsToTOTH = ((59 - mins) * 60) + (60 - secs);
    secsToTOTH = secsToTOTH - 8; // News intro
    if (secsToTOTH < 0) {
        $('#footer').html('&quot;This is community radio in your city, Cambridge 105&quot;');
    }
    else {
        minsToTOTH = Math.floor(secsToTOTH / 60);
        secsToTOTH = secsToTOTH - (minsToTOTH * 60);
        countToNews = padZeros(minsToTOTH) + ":" + padZeros(secsToTOTH);
        $('#footer').html('NEWS INTRO in: <span class="countdown">' + countToNews + '</span>');
    }
}

function displayTravelNotice() {
    $('#footer').css('color', 'yellow');
    $('#footer').html('TRAVEL NEWS?');
}

function displayHeadlinesNotice() {
    $('#footer').css('color', 'yellow');
    $('#footer').html('HEADLINES?');
}

function displayFireAlarmTestDue() {
    $('#footer').css('color', 'coral');
    $('#footer').html('FIRE ALARM TEST DUE');
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
    timeNow = new Date().getTime();
    $.getJSON("schedule.js?nocache=" + (new Date()).getTime(), function (sched) {
        $.each(sched, function (key, progInfo) {
            $.each(progInfo, function (progInfoKey, progInfoValue) {
                //console.log("Loading: " + progInfo['title']);
                if ((progInfo['start'] * 1000) <= timeNow && (progInfo['end'] * 1000) > timeNow) {
                    thisProg = progInfo['title'];
                    console.log("Current programme " + thisProg);
                    if (progInfo['type'] == "LIVE") { thisProgIsLive = true; } else { thisProgIsLive = false; }
                    thisProgEnds = progInfo['end'] * 1000;
                    updateStudioLiveLight();
                    displayProgrammeName();
                }
                else if ((progInfo['start'] * 1000) == thisProgEnds) {
                    nextProg = progInfo['title'];
                    nextProgType = progInfo['type'];
                }
            });
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
        url: "http://www.domsmith.co.uk/c105/studioMessage.js",
        dataType: "jsonp",
        timeout: 10000,
        jsonpCallback: "displayMessage"
    });

    req.success(function () {
        //console.log('JSONP OK');
    });

    req.error(function () {
        //console.log('JSONP failed');
    });
}


function displayMessage(response) {
    $('#message').html('<span class=\"engNotice\">Engineering notice:</span><br />' + response.message);
    if (response.message.length < 1) { $('#message').hide(); } else { $('#message').show(); }
};


// -------- JSONP magic
//var tag = document.createElement("script");
//tag.src = 'http://www.domsmith.co.uk/c105/studioMessage.js?callback=displayMessage&nocache=' + (new Date()).getTime();
//document.getElementsByTagName("head")[0].appendChild(tag);