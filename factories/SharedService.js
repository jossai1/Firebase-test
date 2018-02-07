
angular.module('app')
.factory('SharedService', ['$http', function($http) {

  var userData = null;

  return {

    setUserData: function (data){
      userData = data;
      window.localStorage.setItem("userData",JSON.stringify(data));
    },
    getUserData: function() {
      // console.log("getting data", userData);
      return userData;
    },
    getLocalData: function () {
      return JSON.parse(window.localStorage.getItem("userData"));
    }
};
}]);
