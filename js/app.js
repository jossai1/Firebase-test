var app = angular.module('app', ["ngRoute"]);


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
            .when("/my-teams", {
                templateUrl: "views/my_teams.html",
                controller: "MainController"  
            })
            .when("/editor", {
                templateUrl: "views/editor.html",
                controller: "MainController"  
            })
            .when("/editor" +"#" +"/:id", {
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