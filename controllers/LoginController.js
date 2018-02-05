angular.module('app').controller("LoginController", function($scope, $rootScope, $location, SharedService) {



    $scope.email = "";
    $scope.password = "";

    $scope.login = function() {

        //save them locally for ease of typing
        var email = $scope.email;
        var password = $scope.password;

        firebase.auth().signInWithEmailAndPassword(email, password).then(function() {
            var user = firebase.auth().currentUser;

            firebase.database().ref('users/' + user.uid).once('value').then(function(snapshot) {
                $rootScope.currentUser = snapshot.val();
                console.log(snapshot.val());
                // if successful route to home 
                SharedService.setUserData(snapshot.val());
                window.location.href = "#home";
            });

        }).catch(function(error) {
            var errorCode = error.code;
            var errorMessage = error.message;
            alert(error);
        });

    };



    $scope.register = function() {
        //save them locally for ease of typing
        var email = $scope.email;
        var password = $scope.password;

        console.log(email);
        firebase.auth().createUserWithEmailAndPassword($scope.email, $scope.password).then(function() {
            var user = firebase.auth().currentUser;

            var currentUser = {
                email: email,
                repScore: 0,
                uid: user.uid
            };

            firebase.database().ref('users/' + user.uid).set(currentUser);
            $rootScope.currentUser = currentUser;

            alert("Account created! Please Login with your details.");

        }).catch(function(error) {
            var errorCode = error.code;
            var errorMessage = error.message;
            alert(error);
        });
    };
});