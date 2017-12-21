var url = "https://sofo.mediasite.com/Mediasite/Play/d64d7806bcc14f95a3c57633bcfd30c31d";
var player;
var controls;
var transcriptKey;
var editor;
var currentFirepad;
var currentID;
var noUsers = 0;

function startFirebase() {
  var config = {
    apiKey: "AIzaSyC_PcyEemJampMIHiefh94vw9eMpoaYDGI",
    authDomain: "test-project-96190.firebaseapp.com",
    databaseURL: "https://test-project-96190.firebaseio.com",
    projectId: "test-project-96190",
    storageBucket: "test-project-96190.appspot.com",
    messagingSenderId: "807025189838"
  };

  firebase.initializeApp(config);

  var uiConfig = {
    signInSuccessUrl: '/',
    signInOptions: [
      firebase.auth.GoogleAuthProvider.PROVIDER_ID,
    ],
    tosUrl: 'google.com'
  };

  //change callback here
  var ui = new firebaseui.auth.AuthUI(firebase.auth());
  ui.start('#auth-container', uiConfig);
  initializeCodeMirror();
  getPlayerReference(startDatabase);
}

function initializeCodeMirror() {
  editor = CodeMirror(document.getElementById("current-caption"), {linewrapping: true});
}

function getPlayerReference(callback) {
  player = new Mediasite.Player( "player",
    {
      url: url + (url.indexOf("?") == -1 ? "?" : "&") + "player=MediasiteIntegration",
      events: {
                    "ready":   callback
              }
    });

  controls = new Mediasite.PlayerControls(player, "controls",
    {
      imageSprite: "url(MediasitePlayerControls.png)"
    });
}

function startDatabase() {
  var hash = window.location.hash.replace(/#/g, '');

  if(hash) {
    var ref = firebase.database().ref("/captions/");
    checkExistence(ref.child(hash)).then(function(exists) {
      if (exists) {
        transcriptKey = hash;
        loadScript();
      }

      else {
        transcriptKey = ref.push().key;
        window.location = window.location + '#' + transcriptKey;
        initTranscript();
      }
    });
  }

  else {
    transcriptKey = firebase.database().ref("/captions/").push().key;
    window.location = window.location + '#' + transcriptKey;
    initTranscript();
  }
}

//Returns a promise to check the existence of a given transcript
function checkExistence(dataRef) {
  return dataRef.once('value').then(function(snapshot) {
    return (snapshot.val() !== null);
  });
}

function initializeTranscript() {
  var captions = player.getCaptions();
  //captions = captions.slice(0,5);

  var promise = null;

  for(var i = 0; i < captions.length; i++) {
    var caption = captions[i];
    if (promise == null) {
      promise = firebase.database().ref("/captions/" + transcriptKey).push();
    }

    else {
      promise = promise.then(function() {

      });
    }
  }

  loadTranscript();
}

function loadTranscript() {
  listenForCaptions();
  listenForFirepads();
  listenToPlayTime();
}

//TODO: Ensure that element has been added to DOM, if getElementByID is null, maybe
//try the next best option and whether an element is loaded in check if it is a better option?
//or add a time attribute to each dom element and search those instead??
function scrollToSection(key) {
  var firepadContainer = document.getElementById("firepad-container");
  var textBox = document.getElementById(key);

  textBox = document.getElementById(key);
  //console.log("Caption key we are looking for: " + key);
  //console.log("Element found for scrolling: " + textBox);
  var offset = textBox.offsetTop;
  firepadContainer.scrollTop = offset;
}

function initTranscript() {

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

  //Need to make a promise here but how??
  /*var makeElements = function(values) {
    //console.log("making element");
    var container = document.getElementById("firepad-container");
    var divElement = document.createElement('div');
    var spanElement = document.createElement('span');

    //console.log("made elements");

    divElement.id = values.captionKey;
    divElement.setAttribute("timestamp", values.time);
    divElement.classList.add("section");
    container.appendChild(divElement);
    divElement.appendChild(spanElement);

    //console.log("Added html element");

    //error occurs here....
    firebase.database().ref("/firepads/" + transcriptKey + "/" + values.captionKey + "/history").on(
      "child_added", function(history) {
        console.log("caption key " +  values.captionKey);
        var headless = Firepad.Headless(firebase.database().ref("/firepads/" + transcriptKey + "/" + values.captionKey));
        headless.getText(function(text) {
          console.log("In callback");
          spanElement.innerHTML = text;
        });
      });
  };*/

  var addFireRef = function(values) {
    //console.log("Adding firepad reference");
    var ref = firebase.database().ref("/firepads/" + transcriptKey + "/" + values.captionKey);
    var headless = Firepad.Headless(ref);
    headless.setText(values.original, function(err, committed) {
      headless.dispose();
      makeElements(values);
    });
  };

  var promiseArr = [];
  var captions = player.getCaptions();
  //captions = captions.slice(0,5);

  for(var i = 0; i < captions.length; i++) {
    var caption = captions[i];
    var promise = createCaption(caption).then(addFireRef);

    //console.log("Not Pushing promise")
    promiseArr.push(promise);
  }

  /*var timeChangedListener = function() {
    player.addHandler("currenttimechanged", function(event) {
      var id;
      firebase.database().ref("/captions/" + transcriptKey).orderByChild("time").endAt(event.currentTime).limitToLast(1).once("value")
        .then(function(snapshot) {
          for (keys in snapshot.val()) {
            id = keys;
          }
          if(id != null && id != currentID) {
            //Need to set current Firepad in here
            scrollToSection(id);
          }
        });
    });
  };*/

  Promise.all(promiseArr)
  .then(timeChangedListener)
  .then(setUpCounter)
  .then(addTranscriptUser)
  .then(addTranscriptListener);
}

function loadScript() {

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
    .then(addTranscriptListener);
}

function makeElements(values) {
  //console.log("making element");
  var container = document.getElementById("firepad-container");
  var divElement = document.createElement('div');
  var spanElement = document.createElement('span');

  //console.log("made elements");

  divElement.id = values.captionKey;
  divElement.setAttribute("timestamp", values.time);
  divElement.classList.add("section");
  container.appendChild(divElement);
  divElement.appendChild(spanElement);

  //console.log("Added html element");

  //error occurs here....
  firebase.database().ref("/firepads/" + transcriptKey + "/" + values.captionKey + "/history").on(
    "child_added", function(history) {
      //console.log("caption key " +  values.captionKey);
      var headless = Firepad.Headless(firebase.database().ref("/firepads/" + transcriptKey + "/" + values.captionKey));
      headless.getText(function(text) {
        //console.log("In callback");
        spanElement.innerHTML = text;
      });
    });
}

function timeChangedListener() {
  player.addHandler("currenttimechanged", function(event) {
    var id;
    firebase.database().ref("/captions/" + transcriptKey).orderByChild("time").endAt(event.currentTime).limitToLast(1).once("value")
      .then(function(snapshot) {
        for (keys in snapshot.val()) {
          id = keys;
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
            initializeCodeMirror();
          }

          currentFirepad = Firepad.fromCodeMirror(firepadRef, editor, {richTextToolbar:false, richTextShortcuts:false});
          currentID = id;
          scrollToSection(id);
        }
      });
  });
}

//Not used as can't pass transcript to onDisconnect
function incrementUserCount(number) {
  var ref = firebase.database().ref("/transcripts/" + transcriptKey + "/counter");
  ref.transaction(function(count) {
    count = count + number;
    return count;
  });
}

function setUpCounter() {
  return firebase.database().ref("/transcripts/" + transcriptKey + "/counter").set(0);
}

function addTranscriptUser() {
  console.log("Adding transcript user");
  //move this around!!
  var ref = firebase.database().ref("/transcripts/" + transcriptKey + "/users").push({
    id: "placeholder"
  });
  ref.onDisconnect().remove();


  //Local test
  //var testDummy = firebase.database().ref("/transcripts/" + transcriptKey + "/dummy").set({
    //id: "placeholder"
  //});
}

//Need to be aware that the serial creation of listeners may cause distributed
//issues with a removal being completed before the removal listener is added
//although SO seems to think this is a non-issue - tested for local changes and does not work
function addTranscriptListener() {
  console.log("adding transcript listener");
  var ref = firebase.database().ref("/transcripts/" + transcriptKey + "/counter");
  console.log("at on operations");
  //Test removal...
  //firebase.database().ref("/transcripts" + transcriptKey + "/dummy").remove();
  ref.on("value", function(count) {
    console.log("Current number of users: " + count.val());
  });
}
