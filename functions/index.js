
// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions

/* Creates Firebase cloud functions which runs locally on the Firebase server instead of the client machine
*  As of now there is only one cloud function which updates the user count for a given transcript in the Firebase database
*/
const functions  = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp(functions.config().firebase);

exports.updateCounter = functions.database.ref('/transcripts/{transcriptKey}/users/{userID}').onWrite(event => {
  const transcriptKey = event.params.transcriptKey;

  if(!event.data.val()) {
    admin.database().ref('/transcripts/' + transcriptKey + '/counter').transaction(function(count) {
      count = count - 1;
      return count;
    });
  }

  else {
    admin.database().ref('/transcripts/' + transcriptKey + '/counter').transaction(function(count) {
      count = count + 1;
      return count;
    });
  }
});
