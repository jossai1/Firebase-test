
angular.module('app')
.factory('SharedService', ['$http', function($http) {

  var data = {};
  var userData = {};
  var userId = "";

  return {

    setUserData: function (data){
      userData = data;
    },
    getUserData: function() {
      console.log("getting data", userData);
      return userData;
    }
};
}]);
