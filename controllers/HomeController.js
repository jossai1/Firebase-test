angular.module('app').controller("HomeController", function($scope, $rootScope, $location, SharedService) {


    // $scope.$on('$viewContentLoaded', function() {
    //     startCollab();
    // });
    $scope.userData;

    $scope.transcripts = [

      {title:"Usability and Accessibility Lecture", author:"John Doe", desc:"Lorem epsom lorem lorem", href:"#/editor#-L2ECATL0IGoA4Pj7RlP"},
      {title:"Lecture 2 locked", author:"Jane Doe", desc:"Lorem epsom lorem lorem", href:"#/editor#-L4WwFL9lmfeCf1lTCKP"},
      {title:"Lecture 3", author:"Bon Drain", desc:"Lorem epsom lorem lorem", href:"#/editor#-L48g1dPLTPK2PhsyGLx"},


    ];

    $scope.displayUsername = function() {
	    $scope.userData = SharedService.getUserData();
	    // console.log($scope.userData);
    };

    $scope.logout = function() {

        // set to null and route
        // add a check to see if the userdata is null or empty ==> user not logged in
    	SharedService.setUserData(null);
    	window.location.href = "#";

    };

});
