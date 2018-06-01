angular.module('app').controller("MainController", function($scope, $rootScope, $location,SharedService) {


  $scope.userData;
  $scope.shareUrl;

  $scope.$on('$viewContentLoaded', function() {
      //get and store userdata from sharedservice
      $scope.userData = SharedService.getUserData();

      console.log("starting firebase");
      startFirebase();
  });

  $scope.test = function (){
    $('.ui.basic.modal')
      .modal('show');
  };

  $scope.newCopy =  function () {
    window.location.href = "#/editor";
  };

var url = "https://sofo.mediasite.com/Mediasite/Play/d64d7806bcc14f95a3c57633bcfd30c31d";
var player;   // The player object
var controls; // Controls for the player
var transcriptKey;  // Key for the transcript that is being viewed
var editor; 
var currentFirepad;
var currentID;
var playKeyDown = false;
var playing = false;
var noUsers;  // The number of users currently viewing the transcript

//GLOBALS FOR BACKSPACE + SHIFT
var scheduledStop = false;
var scheduledTime;
var startBarrier;
var stopMade = false;
var stopTime;
var tEventID;

//GLOBALS TRACKING USER WATCH TIME
var editing = false;
var longestStreak = 0.0;
var startWatch;
var endWatch;

//GLOABLS FOR STORING CAPTION INFORMATION
var captionStart;
var captionEnd;

//Time change promise
var tcpromise = null;
var epsilon = 0.5;

// Called when the page loads
function startFirebase() {
  $('.ui.checkbox').checkbox({
    onChecked: function () {editing = true;},
    onUnchecked: function () {editing = false;}
  });
  getPlayerReference(startDatabase);
}

/**
* Initialises a codemirror text editor
*/
function initializeCodeMirror() {
  editor = CodeMirror(document.getElementById("current-caption"), {linewrapping: true});
  editor.setOption("extraKeys", {
    "Shift-Backspace": function(cm) {}
  });

  editor.on("focus", function(event) {
    $('#checkboi').checkbox('check');
    $('#checkboi').checkbox('disable');
  });

  editor.on("blur", function(event) {
    $('#checkboi').checkbox('enable');
  })
}

/**
* Sets up the Mediasite Player
* @param callback A callback function you want called when the player is ready
*/
function getPlayerReference(callback) {
  console.log("Getting player reference");
  player = new Mediasite.Player( "player",
    {
      url: url + (url.indexOf("?") == -1 ? "?" : "&") + "player=MediasiteIntegration",
      events: {
                    "ready":   callback,
                    "playstatechanged": function(e) {updatePlayingState(e);}
              }
    });

  controls = new Mediasite.PlayerControls(player, "controls",
    {
      imageSprite: "url(MediasitePlayerControls.png)"
    });
}

// Updates the address bar with the transcript key and either loads the transcript or creates an entirely new one
function startDatabase() {
  var hash = window.location.hash.replace(/#/g, '');
  console.log("hash: " + hash);
  //angular router has hash in url  already so add this check instaed
  if(hash !== "/editor") {
    var ref = firebase.database().ref("/captions/");
    checkExistence(ref.child(hash.split("editor")[1])).then(function(exists) {
      if (exists) {
        transcriptKey = hash.split("editor")[1];
        $scope.shareUrl = window.location.href;
        $scope.$apply(); //get url to show in input box
        loadScript();
      }

      else {
        transcriptKey = ref.push().key;
        window.location.hash = window.location.hash + '#' + transcriptKey;
        //console.log("new window location: " + window.location.split('#')[0] + '#' + transcriptKey);
        $scope.shareUrl = window.location.href;
        $scope.$apply(); //get url to show in input box
        initTranscript();
      }
    });

    player.removeHandler("ready", this);
    console.log("handler removed");
  }

  else {
    transcriptKey = firebase.database().ref("/captions/").push().key;
    window.location.hash = window.location.hash + "#" + transcriptKey;
    //console.log("hash is: " + window.location.hash);
    //history.replaceState(undefined, undefined, '#' + transcriptKey);
    //console.log("hash is " + window.location.hash);
    $scope.shareUrl = window.location.href;
    $scope.$apply(); //get url to show in input box
    initTranscript();
  }
}

//Returns a promise to check the existence of a given transcript
function checkExistence(dataRef) {
  return dataRef.once('value').then(function(snapshot) {
    return (snapshot.val() !== null);
  });
}

/**
* Moves the scroll pane to the element representing a given captions
* @param key The id of the caption you want to scroll to
*/
function scrollToSection(key) {
  $('#firepad-container').scrollTop(
    $('#'+key).offset().top - $('#firepad-container').offset().top + $('#firepad-container').scrollTop()
  );
}

// Creates a brand new transcript in Firebase
function initTranscript() {
  console.log("init transcript called");
  //Returns a promise
  var createCaption = function(caption) {
    //console.log("in creating caption");
    var ref = firebase.database().ref("/captions/" + transcriptKey).push()

    return ref.set(
      {
        time: caption.time,
        endTime: caption.endTime,
        original: caption.text
      }
    ).then(function() {
      return {
        original: caption.text,
        captionKey: ref.key,
        time: caption.time
      }
    });
  };

  var addFireRef = function(values) {
    //console.log("Adding firepad reference");
    var ref = firebase.database().ref("/firepads/" + transcriptKey + "/" + values.captionKey);
    var headless = Firepad.Headless(ref);
    headless.setText(values.original, function(err, committed) {
      headless.dispose();
      //makeElements(values);
    });
  };

  var promiseArr = [];
  var captions = player.getCaptions();
  captions = captions.slice(1);

  for(var i = 0; i < captions.length; i++) {
    var caption = captions[i];
    var promise = createCaption(caption).then(addFireRef);
    promiseArr.push(promise);
  }

  Promise.all(promiseArr)
  .then(setUpCounter)
}

/*
* Loads a transcript which already exists and sets up listeners
*/
function loadScript() {
  console.log("Load script called");
  console.log("checking for a lock");
  firebase.database().ref('transcripts/' + transcriptKey).once('value').then( function(snapshot) {

    if (snapshot.val().lock === true) {
      console.log(snapshot.val());
      alert("Locked transcript. Please check back in a while");
      window.location.href = "#home";
    } else {
      firebase.database().ref("/captions/" + transcriptKey).once("value")
        .then(function (snapshot) {
          return snapshot.val();
        })
        .then(function(transcript) {
          for (caption in transcript) {
            var current = transcript[caption];
            var ctime = current.time;
            makeElements({
              captionKey: caption,
              time: ctime
            });
          }
        })
        .then(timeChangedListener)
        .then(addTranscriptUser)
        .then(addTranscriptListener)
        .then(addDocumentListeners);
    }
  });
}

/** Creates all the elements for a caption objects
* @param values An object specifying properties of the caption
*/
function makeElements(values) {
  //console.log("making element");
  var container = $("#firepad-container");
  var sectionElement = createSectionElement(values);
  container.append(sectionElement);
}

// Adds an event handler to the Mediasite player which tracks the current caption so the text editor can be updated.
// Also tracks the watch time of each caption of each caption by each user and is responsible for autoscrolling.
function timeChangedListener() {
  player.addHandler("currenttimechanged", function(event) {
    if (tcpromise === null) {
      //console.log("Initialising promise");
      tcpromise = new Promise(function(resolve, reject) {
        //console.log("running first promise");
        if(startBarrier > player.getCurrentTime()) {
          if (tEventID !== undefined) {
            player.removeTimedEvent(tEventID);
          }
          stopMade = false;
        }

        else if(scheduledTime + epsilon < player.getCurrentTime()) {
          if (tEventID !== undefined) {
            player.removeTimedEvent(tEventID);
          }
          stopMade = false;
        }
        //console.log("first part of initial promise has finished");
        resolve();
      }).then(function () {
        //console.log("In second part of initial promise");
        if (!stopMade) {
          var id;
          return firebase.database().ref("/captions/" + transcriptKey).orderByChild("time").endAt(event.currentTime).limitToLast(1).once("value")
            .then(function(snapshot) {
              //console.log("executing promise for: " + event.currentTime);
              for (keys in snapshot.val()) {
                id = keys;
              }

              if(startWatch === undefined) {
                startWatch = event.currentTime;
                endWatch = event.currentTime;
              }

              if (event.currentTime >= endWatch - epsilon && event.currentTime <= endWatch + 2*epsilon) {
                endWatch = event.currentTime;
                streak = endWatch - startWatch;
                if(streak > longestStreak) {
                  longestStreak = streak;
                }
              }

              else {
                console.log("resetting timer");
                console.log("current time is: " + event.currentTime);
                console.log("endWatch: " +  endWatch);
                startWatch = event.currentTime
                endWatch = event.currentTime;
              }

              if(id != null && id != currentID) {
                var firepadRef = firebase.database().ref("/firepads/" + transcriptKey + "/" + id);

                if(currentFirepad) {
                  currentFirepad.dispose();
                  editor.setValue("");
                  editor.clearHistory();
                  var cmelement = document.getElementsByClassName('CodeMirror')[0];
                  var ccelement = document.getElementById("current-caption");
                  ccelement.removeChild(cmelement);
                }

                if(currentID !== undefined) {
                  //console.log("checking streak is longest for " + currentID);
                  //console.log("longest streak: " + longestStreak);
                  //console.log("perfect streak is: " + (captionEnd - captionStart));
                  if (longestStreak > 0.8*(captionEnd - captionStart) && editing) {
                    firebase.database().ref("/watchInfo/" + transcriptKey + "/" + currentID + "/" + firebase.auth().currentUser.uid)
                    .set(firebase.database.ServerValue.TIMESTAMP);
                  }
                }

                caption = snapshot.val();
                //for(keys in caption) {
                  //console.log(keys);
                //};
                captionStart = caption[id].time;
                captionEnd = caption[id].endTime;
                startWatch = event.currentTime;
                endWatch = event.currentTime;
                longestStreak = 0.0;
                //console.log("captionStart: " + captionStart);
                //console.log("start watch: " + startWatch);
                //console.log("captionEnd: " + captionEnd);
                //console.log("end watch: " + endWatch);

                initializeCodeMirror();
                currentFirepad = Firepad.fromCodeMirror(firepadRef, editor, {richTextToolbar:false, richTextShortcuts:false});
                currentID = id;
                scrollToSection(id);
              }
            });
        }
      });
    }

    else {
      tcpromise = tcpromise.then(function () {
        //console.log("time changed event");
        //console.log("current time changed to: " + event.currentTime);
        epsilon = 0.5;

        if(startBarrier > player.getCurrentTime()) {
          if (tEventID !== undefined) {
            player.removeTimedEvent(tEventID);
          }
          stopMade = false;
        }

        else if(scheduledTime + epsilon < player.getCurrentTime()) {
          if (tEventID !== undefined) {
            player.removeTimedEvent(tEventID);
          }
          stopMade = false;
        }
      }).then(function() {
        if (!stopMade) {
          var id;
          return firebase.database().ref("/captions/" + transcriptKey).orderByChild("time").endAt(event.currentTime).limitToLast(1).once("value")
            .then(function(snapshot) {
              //console.log("executing promise for: " + event.currentTime);
              for (keys in snapshot.val()) {
                id = keys;
              }

              if(startWatch === undefined) {
                startWatch = event.currentTime;
                endWatch = event.currentTime;
              }

              if (event.currentTime >= endWatch - epsilon && event.currentTime <= endWatch + 2*epsilon) {
                endWatch = event.currentTime;
                streak = endWatch - startWatch;
                if(streak > longestStreak) {
                  longestStreak = streak;
                }
              }

              else {
                //console.log("resetting timer");
                //console.log("current time is: " + event.currentTime);
                //console.log("endWatch: " +  endWatch);
                startWatch = event.currentTime
                endWatch = event.currentTime;
              }

              if(id != null && id != currentID) {
                var firepadRef = firebase.database().ref("/firepads/" + transcriptKey + "/" + id);

                if(currentFirepad) {
                  currentFirepad.dispose();
                  editor.setValue("");
                  editor.clearHistory();
                  var cmelement = document.getElementsByClassName('CodeMirror')[0];
                  var ccelement = document.getElementById("current-caption");
                  ccelement.removeChild(cmelement);
                }

                if(currentID !== undefined) {
                  //console.log("checking streak is longest for " + currentID);
                  //console.log("longest streak: " + longestStreak);
                  //console.log("perfect streak is: " + (captionEnd - captionStart));
                  if (longestStreak > 0.8*(captionEnd - captionStart) && editing) {
                    firebase.database().ref("/watchInfo/" + transcriptKey + "/" + currentID + "/" + firebase.auth().currentUser.uid)
                    .set(firebase.database.ServerValue.TIMESTAMP);
                  }
                }

                caption = snapshot.val();
                captionStart = caption[id].time;
                captionEnd = caption[id].endTime;
                startWatch = event.currentTime;
                endWatch = event.currentTime;
                longestStreak = 0.0;

                //console.log("captionStart: " + captionStart);
                //console.log("start watch: " + startWatch);
                //console.log("captionEnd: " + captionEnd);
                //console.log("end watch: " + endWatch);

                initializeCodeMirror();
                currentFirepad = Firepad.fromCodeMirror(firepadRef, editor, {richTextToolbar:false, richTextShortcuts:false});
                currentID = id;
                scrollToSection(id);
              }
            });
        }
      });
    }
  });

  player.addHandler("timedeventreached", function(event) {
    if(playing) {
      togglePlayPause();
    }

    stopMade = true;
    player.removeTimedEvent(tEventID);
    tEventID = undefined;
  });
}

/*
  Increments the counter that keeps track of the number of users viewing a transcript.
  NOT IN USE: Cannot start transactions when a user disconnects, thus we cannot use this function.
*/
function incrementUserCount(number) {
  var ref = firebase.database().ref("/transcripts/" + transcriptKey + "/counter");
  ref.transaction(function(count) {
    count = count + number;
    return count;
  });
}

// Initialises the counter that keeps track of the number of users for a newly created transcript
function setUpCounter() {
  return firebase.database().ref("/transcripts/" + transcriptKey + "/counter").set(0);
}

// Adds a new user to the list of users for the transcript
function addTranscriptUser() {
  console.log("Adding transcript user");

  var ref = firebase.database().ref("/transcripts/" + transcriptKey + "/users").push();
  ref.onDisconnect().remove();
  ref.set({
    id: firebase.database.ServerValue.TIMESTAMP
  });
}

// Adds the listener which keeps track of the number of collaborators
function addTranscriptListener() {
  //console.log("adding transcript listener");
  var ref = firebase.database().ref("/transcripts/" + transcriptKey + "/counter");
  //console.log("at on operations");

  //Test removal...
  //firebase.database().ref("/transcripts" + transcriptKey + "/dummy").remove();

  ref.on("value", function(count) {
    console.log("Current number of users: " + count.val());
    noUsers = count.val();
    //$('.collabno').text(noUsers);
    $('.collabNumber').text("Collaborators: " + noUsers)
  });
}


/**
 * Given a section object create the section header element
 * @param section A section object
 */
function createSectionHeaderElement(values) {
    var sectionHeaderElement = $('<div class="section-header"></div>');
    var timestamp = createSectionTimeStampElement(values.time)
    sectionHeaderElement.append(timestamp);
    //sectionHeaderElement.append(createSectionSpeakerElement(section)); - NOT VALUD
    return sectionHeaderElement;
    //return timestamp;
}

function formatStartTime(startTime) {
    return secondsToHms(startTime);
}

/**
 * Create the start time label
 * @param time The time of the caption
 */
function createSectionTimeStampElement(time) {
    var sectionTimestampElement = $('<div class="ui top left attached label"><input class="label-formatting" placeholder="Speaker" type="text" size="10" maxlength="16" class="section-timestamp" value="' + formatStartTime(time) + '" disabled /></div>');
    sectionTimestampElement.click(function() {
      setPlayerTime(time);
      //console.log("click");
    });
    //var sectionTimestampElement = $("<div class='ui top left attached label'>"+time+"</div>");
    return sectionTimestampElement;
}

/**
 * Creates the text element for a caption text and adds a listener that listens for updates to the caption text
 * @param values An object containing the key of target caption
 * @returns The element which contains the caption text
 */
function createSectionEditorElement(values) {
    //var sectionEditorElement = $('<div contentEditable="true" class="section-editor our-form-control"></div>');

    var sectionEditorElement = $('<div class="description" contentEditable="false"></div>');
    //var sectionEditorElement = $('<div class="description" contentEditable="false"></div>');
    var spanElement = $('<p style="margin-top: 4%;margin-left: 2%;margin-bottom: 1%;"></p>');
    sectionEditorElement.append(spanElement);

    firebase.database().ref("/firepads/" + transcriptKey + "/" + values.captionKey + "/history").on(
      "child_added", function(history) {
        //console.log("caption key " +  values.captionKey);
        var headless = Firepad.Headless(firebase.database().ref("/firepads/" + transcriptKey + "/" + values.captionKey));
        headless.getText(function(text) {
          //Need to UPDATE different element here
          spanElement.text(text);
        });
      });

    return sectionEditorElement;
}

/**
 * Create a new element containing the caption described by the values object
 * @param values An object describing the caption by its key and its timestamp
 * @returns The element for the caption
 */
function createSectionElement(values){

    // create a section element for this section object
    //var sectionElement = $('<div class="section"></div>');
    var sectionElement = $('<div class="ui card"><div class="content"></div></div>');
    //var sectionElement = $('<div class="content"></div>');

    sectionElement.attr('id', values.captionKey);
    sectionElement.attr('time', values.time);
    sectionElement.append(createSectionHeaderElement(values));
    sectionElement.append(createSectionEditorElement(values));

    return sectionElement;
}

/**
 * Keeps track of the Media Player play state
 * @param eventData A Mediasite player event
 */
function updatePlayingState(eventData) {
    state = eventData.playState;
    if (state == "playing") {
      console.log("Changed to playing");
      playing = true;
      stopMade = false;
    }
    else {
      console.log("Changed to paused");
      playing = false;
    }
}

/*
* Toggles the playing state of the Mediasite player
*/
function togglePlayPause() {
    if(playing) {
        player.pause();
    } else {
        stopMade = false;
        player.play();
    }
}


/**
 * Get the current player time in seconds
 *
 * @returns {double} SS.sssssss
 */
function getPlayerTime() {
    return player.getCurrentTime();
}

/**
* Get the length of the current video
*
* @returns {double} SS.sssssss
*/
function getDuration() {
  return player.getDuration();
}

/**
 * Set the player to the provided time in seconds
 *
 * @param time start time in seconds
 */
function setPlayerTime(time) {
    //player.currentTime = time;
    console.log("player time set");
    player.seekTo(time);
}

/**
 * Format SS.sss to HH:MM:SS, sss
 *
 * @param d time in seconds
 * @returns {string} formatted time stamp string
 */
function secondsToHms(d) {
    d = Number(d);
    //console.log(d);

    var h = Math.floor(d / 3600);
    var m = Math.floor(d % 3600 / 60);
    var s = Math.floor(d % 3600 % 60);
    var ms = d - Math.floor(d);
    ms = Math.floor(ms*1000);

    h = ('00' + h).slice(-2);
    m = ('00' + m).slice(-2);
    s = ('00' + s).slice(-2);

    return (h+':'+m+':'+s);
}

/**
 * Convert a timestamp string to milliseconds
 * @param timestamp A string containing at least HH:MM:SS, SSS
 */
function hmsToSeconds(timestamp) {
    var dateRegex = /\d\d\s*:\s*\d\d\s*:\s*\d\d\s*,\s*\d\d\d/;
    var timestamp = _.head(timestamp.match(dateRegex));

    if (timestamp) {
        var parts = timestamp.split(',');

        var hms = parts[0].split(':');
        var ms = +parts[1] / 1000;
        var hours = +hms[0] * 3600;
        var minutes = +hms[1] * 60;
        var seconds = +hms[2];

        return hours + minutes + seconds + ms;
    }
}

// Adds key listeners to the transcript editor
function addDocumentListeners() {
  document.addEventListener("keydown", function (event) {
    if (event.keyCode == 37 && event.shiftKey) {
        event.preventDefault();

        if(stopMade) {
          console.log("stop made");
          console.log(currentID);
          firebase.database().ref("/captions/" + transcriptKey + "/" + currentID).once("value")
            .then(function(snapshot) {
              value = snapshot.val();
              return value.time;
            })
            .then(function(time) {
              return firebase.database().ref("/captions/" + transcriptKey).orderByChild("time").endAt(time)
                .limitToLast(2).once("value").then(function(snapshot) {
                  var value2 = snapshot.val();
                  var i = 0;
                  for (key in value2) {
                    return value2[key].time;
                  }
                });
            }).then(function (time) {
              setPlayerTime(time);
            });
        }

        else {
          firebase.database().ref("/captions/" + transcriptKey).orderByChild("time").endAt(getPlayerTime())
          .limitToLast(2).once("value").then(function (snapshot) {
            var value = snapshot.val();
            var i = 0;
            for (key in value) {
              return value[key].time;
            }
          }).then(function(time) {
              setPlayerTime(time);
          });
        }
    }


    if (event.keyCode == 39 && event.shiftKey) {
      event.preventDefault();

      if(stopMade) {
        console.log("stop made, currentID is...");
        console.log(currentID);
        stopMade = false;
        firebase.database().ref("/captions/" + transcriptKey + "/" + currentID).once("value")
        .then(function(snapshot) {
          value = snapshot.val();
          return value.time;
        }).then(function(time) {
          return firebase.database().ref("/captions/" + transcriptKey).orderByChild("time").startAt(time)
          .limitToFirst(2).once("value").then(function(snapshot) {
            var value2 = snapshot.val();
            var numKeys = Object.keys(value2).length;
            var count = 1;
            if(numKeys == 2) {
              for (key in value2) {
                if (count == 2) {
                  return value2[key].time;
                }

                else {
                  count++;
                }
              }
            }

            else {
              for (key in value2) {
                return value2[key].time;
              }
            }
          });
        }).then(function (time) {
          setPlayerTime(time);
        });
      }

      else {
          firebase.database().ref("/captions/" + transcriptKey + "/" + currentID).once("value")
          .then(function(snapshot) {
            value = snapshot.val();
              return value.time;
          }).then(function (time) {
            return firebase.database().ref("/captions/" + transcriptKey).orderByChild("time").startAt(time)
            .limitToFirst(2).once("value").then(function(snapshot) {
              var value2 = snapshot.val();
              var numKeys = Object.keys(value2).length;
              var count = 1;
              if(numKeys == 2) {
                for (key in value2) {
                  if (count == 2) {
                    return value2[key].time;
                  }
                  else {
                    count++;
                  }
                }
              }

              else {
                for (key in value2) {
                  return value2[key].time;
                }
              }
            });
          }).then(function (time) {
            setPlayerTime(time);
          });
      }
    }

    //
    if (event.keyCode == 8 && event.shiftKey) {
      event.preventDefault();
      firebase.database().ref("/captions/" + transcriptKey + "/" + currentID).once("value").then(function(snapshot) {
        var value = snapshot.val();
        return {
          time: value.time,
          endTime: value.endTime
        };
      })
      .then(function(info) {
        setPlayerTime(info.time);
        scheduledStop = true;
        scheduledTime = info.endTime;
        startBarrier = info.time;

        if (tEventID !== undefined) {
          player.removeTimedEvent(tEventID);
        }

        tEventID = player.addTimedEvent(info.endTime, "pause", "");

        if(!playing) {
          togglePlayPause();
        }
        console.log("Scheduled time set:");
        console.log(scheduledTime);
      });
    }

    if(event.keyCode == 32 && event.shiftKey) {
      event.preventDefault();
      togglePlayPause();
    }

    //F7 rewind 10 seconds
    if(event.keyCode === 118 && event.ctrlKey) {
      stopMade = false;
      var time = getPlayerTime();
      var cor = time < 10? 0 : time - 10;
      setPlayerTime(cor);
    }

    //F8 forward 10 seconds
    if(event.keyCode === 119 && event.ctrlKey) {
      stopMade = false;
      var time = getPlayerTime();
      var duration = getDuration();
      var cor = duration - time < 10? duration : time + 10;
      setPlayerTime(cor);
    }

    //F9 key held down will play
    if(event.keyCode === 120 && !playKeyDown) {
      playKeyDown = true;

      if (!playing) {
        togglePlayPause();
      }
    }
    }, false);

  document.addEventListener('keyup', function(event) {
    //F9 key released will pause audio
    if(event.keyCode === 120 && playKeyDown) {
        playKeyDown = false;
        togglePlayPause();
    }
  }, false);
}

});
