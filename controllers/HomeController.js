angular.module('app').controller("HomeController", function($scope, $rootScope, $location, SharedService) {


    // $scope.$on('$viewContentLoaded', function() {
    //     startCollab();
    // });
    $scope.userData;

    $scope.displayUsername = function() {
	    $scope.userData = SharedService.getUserData();
	    console.log($scope.userData);
    };

    $scope.logout = function() {
        
        // set to null and route 
        // add a check to see if the userdata is null or empty ==> user not logged in 
    	SharedService.setUserData(null);
    	window.location.href = "#";

    };

});