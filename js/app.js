var app = angular.module('app', ["ngRoute"]);


/**
- session management using local storage
- when a user logs in we store their data in local storage
- it is null when they logout
- runs before routing to the a url
- if it is null that means they have not logged in yet or have logged out so we route them back to the login page
- we need it to check if a user is logged in
- if a user is logged in i.e. the userdata !== null then we let them go to their route and set the sharedservice userdata to what is in the storage
    - we need to do this re-setting because when you refresh the page angular deletes the sharedservice data

*/

//: major issues with digest t cycle here - noticesd in console on welcome page - changes location.href to location.replace and the issues seems to go in the welcome page but this lets users who havent logged in access the application
app.run(['$rootScope', '$location','SharedService', function($rootScope, $location,SharedService) {
    $rootScope.$on('$routeChangeStart', function(event, currRoute, prevRoute) {
        if (JSON.parse(window.localStorage.getItem("userData")) === null) {
            // alert("Please Login");
            window.location.replace = "#";
        } else {
            // alert("ss");
            // console.log(window.localStorage.getItem("userData"));
            SharedService.setUserData(JSON.parse(window.localStorage.getItem("userData")));
        }
    });
}]);


app.config(['$routeProvider', '$locationProvider',
    function($routeProvider, $locationProvider) {
        $routeProvider
            .when("/", {
                templateUrl: "views/welcome.html",
                controller: "LoginController"  
            })
            .when("/home", {
                templateUrl: "views/home.html",
                controller: "HomeController"  
            })
            .when("/editor", {
                templateUrl: "views/editor.html",
                controller: "MainController"  
            })
            .when("/editor" + "#" + "/:id", {
                templateUrl: "views/editor.html",
                controller: "MainController"  
            })
            .otherwise({       
                redirectTo: '/' 
            });


        // .when("/", {
        //     templateUrl: "views/editor.html",
        //     controller: "MainController"  
        // })
        // .when("/editor", {
        //     templateUrl: "views/editor.html",
        //     controller: "MainController"  
        // })
        // .otherwise({       
        //     redirectTo: '/' 
        // });

        // //code to remove hash from url
        // //check browser support
        // if (window.history && window.history.pushState) {
        //     //$locationProvider.html5Mode(true); will cause an error $location in HTML5 mode requires a  tag to be present! Unless you set baseUrl tag after head tag like so: <head> <base href="/">

        //     // to know more about setting base URL visit: https://docs.angularjs.org/error/$location/nobase

        //     // if you don't wish to set base URL then use this
        //     $locationProvider.html5Mode({
        //         enabled: true,
        //         requireBase: false
        //     });
        // }
    }
]);
