'use strict'
var module = angular.module("sminer.controller", ["leaflet-directive", "zingchart-angularjs", "ngFileSaver", "angular-loading-bar"]);
module.controller("sminerController", ["$scope", "$http", "$rootScope", "CONSTANTS", "sminerService", "documentService",
    "dataAnalysisService", "leafletData", "FileSaver", "$timeout",
    function($scope, $http, $rootScope, CONSTANTS, sminerService, documentService, dataAnalysisService, leafletData, FileSaver, $timeout) {
        $scope.fileChosen = false;
        $scope.uploadingInProgress = false;
        $scope.extractingStopsInProgress = false;
        $scope.reachabilityPlotInProgress = false;
        $scope.STDBSCANInProgress = false;
        $scope.fileLoaded = false;
        $scope.stopsExtracted = false;
        $scope.dataSetAnalysisDone = false;
        $scope.reachabilityPlotReady = false;
        $scope.showMap = false;
        $scope.showClusters = false;
        $scope.showStops = false;
        $scope.showGeometry = false;
        $scope.locationsExtracted = false;
        $scope.locationsAvailable = false;
        $scope.semanticLocationsUploaded = false;
        $scope.isMapShown = false;

        $scope.paths = {};
        $scope.markers = {};

        /*
           Defaults for configuration of MOD dataset
        */
        $scope.modIdCol = 0;
        $scope.timestampCol = 2;
        $scope.longitudeCol = 4;
        $scope.latitudeCol = 5;

        $scope.saveConfiguration = function() {
            documentService.saveConfiguration($scope.modIdCol, $scope.timestampCol, $scope.longitudeCol, $scope.latitudeCol).then(
                function(response) {
                    $scope.saveConfigResponse = angular.fromJson(response.data);
                    $timeout(function() {
                        $scope.saveConfigResponse = undefined;
                    }, 2000)
                },
                function(errResponse) {
                    alert(errResponse.data.errorMessage);
                    console.log(errResponse.data);
                }
            )
        };

        $scope.getMbSize = function(bytes){
            return Math.round(bytes / 1000000);
        };

        // MOD file upload
        $scope.uploadFile = function(){
            // in case columns didn't configure, default values will be used
            $scope.saveConfiguration();
            $scope.uploadingInProgress = true;
            documentService.saveDoc($scope.uploadedFile).then(
                function (response) {
                    $scope.uploadingInProgress = false;
                    $scope.fileStats = angular.fromJson(response.data);
                    $scope.fileLoaded = true;
                },
                function (errResponse) {
                    $scope.failedToUploadDataset = errResponse.data;
                    $scope.uploadingInProgress = false;
                    $scope.uploadResult = errResponse.data;
                }
            );
        };

        // Stops extraction response handling
        $scope.extractStops = function() {
            $scope.extractingStopsInProgress = true;
            dataAnalysisService.extractStops($scope.minStopDuration, $scope.maxStopDuration).then(
                function(response) {
                    $scope.extractingStopsInProgress = false;
                    $scope.stopsAmount = response.data.value;
                    $scope.stopsExtracted = true;
                },
                function(errResponse) {
                    alert(errResponse.data.errorMessage);
                    $scope.extractingStopsInProgress = false;
                    $scope.stopsExtracted = false;
                }
            )
        };

        /*
            OPTICS reachability plot methods
         */
        $scope.getTemporalReachabilityPlot = function() {
            $scope.reachabilityPlotInProgress = true;
            dataAnalysisService.getTemporalReachabilityPlot($scope.epsilonTemporal, $scope.minPtsTemporal).then(
                function(response) {
                    var labels = [];
                    var data = [];
                    var temporalPlotOptions = {
                        plotTitle: "Temporal reachability plot",
                        labelX: "Points order",
                        labelY: "Stop duration (min)"
                    };
                    $scope.reachabilityPlotInProgress = false;
                    $scope.reachabilityPlotReady = true;
                    //$scope.plotData = response.data.data;
                    angular.forEach(response.data.data, function(value, key) {
                        labels.push(key);
                        data.push(value == 0 ? null : value);
                    });
                    $scope.temporalPlotData = getPlotSettings(labels, data, temporalPlotOptions);
                    //$scope.temporalScatterPlotData = getScatterPlotSettings(data, data);
                },
                function(errResponse) {
                    alert(errResponse.data.errorMessage);
                    $scope.reachabilityPlotInProgress = false;
                    $scope.reachabilityPlotReady = false;
                }
            )
        };

        $scope.getSpatialReachabilityPlot = function() {
            $scope.reachabilityPlotInProgress = true;
            dataAnalysisService.getSpatialReachabilityPlot($scope.epsilonSpatial, $scope.minPtsSpatial).then(
                function(response) {
                    var labels = [];
                    var data = [];
                    var spatialPlotOptions = {
                        plotTitle: "Spatial reachability plot",
                        labelX: "Points order",
                        labelY: "Area radius (km)"
                    };
                    $scope.reachabilityPlotInProgress = false;
                    $scope.reachabilityPlotReady = true;
                    //$scope.plotData = response.data.data;
                    angular.forEach(response.data.data, function(value, key) {
                        labels.push(key);
                        data.push(value == 0.0 ? null : value);
                    });
                    $scope.spatialPlotData = getPlotSettings(labels, data, spatialPlotOptions);
                },
                function(errResponse) {
                    alert(errResponse.data.errorMessage);
                    $scope.reachabilityPlotInProgress = false;
                    $scope.reachabilityPlotReady = false;
                }
            )
        };

        $scope.getSpatialTemporalReachabilityPlot = function() {
            dataAnalysisService.getSpatialTemporalReachabilityPlot($scope.epsilonTemporal, $scope.epsilonSpatial, $scope.minPtsTemporal).then(
                function(response) {
                    var labels = [];
                    var dataTemporal = [];
                    var dataSpatial = [];
                    var spatialTemporalPlotOptions = {
                        plotTitle: "Spatial temporal reachability plot",
                        labelX: "Points order",
                        labelY: "Stop duration (min)",
                        labelY2: "Area radius (km)"
                    };
                    angular.forEach(response.data.data, function(value, key) {
                        labels.push(key);
                        dataTemporal.push(value.temporalDim == 0 ? null : value.temporalDim);
                        dataSpatial.push(value.spatialDim == 0.0 ? null : value.spatialDim);
                    });
                    $scope.spatialTemporalPlotData = getSpatialTemporalPlotSettings(labels, dataTemporal, dataSpatial, spatialTemporalPlotOptions);
                },
                function(errResponse) {
                    alert(errResponse.data.errorMessage);
                }
            )
        };

        /*
            ST-DBSCAN response handling
         */
        $scope.getSTDBSCANData = function() {
            $scope.STDBSCANInProgress = true;
            dataAnalysisService.getSTDBSCANData($scope.epsilonTempSTDBSCAN, $scope.epsilonSpatialSTDBSCAN, $scope.minPtsSTDBSCAN).then(
                function(response) {
                    $scope.clusters = response.data.data;
                    $scope.STDBSCANClustersAvailable = true;
                    $scope.selectedCluster = 0;
                    $scope.locationsStatus = [];
                    $scope.locationsFormatted = [];
                    $scope.chosenLocations = [];
                },
                function(errResponse) {
                    alert(errResponse.data.errorMessage);
                    $scope.STDBSCANInProgress = false;
                    $scope.STDBSCANClustersAvailable = false;
                }
            )
        };

        /*
            Data visualization on the map
         */
        $scope.showMapView = function () {
            $scope.isMapShown = true;
            invalidateMap();
            $scope.getMapView();
        };

        $scope.getMapView = function() {
            $scope.regions = {
                current: {
                    northEast: {
                        lat: getBoundingBoxStretch(getMapBoundaries($scope.clusters, "LatMax"), undefined, 2, 1),
                        lng: getBoundingBoxStretch(getMapBoundaries($scope.clusters, "LonMax"), getMapBoundaries($scope.clusters, "LatMax"), 2, 1)
                    },
                    southWest: {
                        lat: getBoundingBoxStretch(getMapBoundaries($scope.clusters, "LatMin"), undefined, 2, -1),
                        lng: getBoundingBoxStretch(getMapBoundaries($scope.clusters, "LonMin"), getMapBoundaries($scope.clusters, "LatMin"), 2, -1)
                    }
                }
            };
            angular.extend($scope, {
                maxbounds: $scope.regions.current
            });
        };

        $scope.getClusterLocationsOnMap = function(showClusters) {
            if (showClusters) {
                angular.forEach($scope.clusters, function (value, key) {
                    $scope.paths["rectangle" + value.clusterId] = {
                        color: 'red',
                        fillColor: '#f03',
                        fillOpacity: 0.5,
                        weight: 1,
                        latlngs: [[value.lattitudeMax, value.longitudeMax], [value.lattitudeMin, value.longitudeMin]],
                        type: "rectangle",
                        message: "Cluster: " + value.clusterId,
                        clickable: true,
                        heading: 240
                    };
                });
            } else {
                for (var key in $scope.paths) {
                    if (key.indexOf("rectangle") !== -1) {
                        delete $scope.paths[key];
                    }
                }
            }
        };

        $scope.getLocationsGeometryOnMap = function (showGeometry) {
                var i = 0;
                angular.forEach($scope.locationsFormatted.filter(function (item) {
                    return (item.length > 0);
                }), function(cluster, key) {
                    angular.forEach(cluster, function(value, key) {
                        if (showGeometry) {
                            var latlngs = [];
                            angular.forEach(value.locationGeo, function (item, key) {
                                latlngs.push([item.lat, item.lon]);
                            });
                            $scope.paths["polygon" + i] = {
                                color: '#004C06',
                                fillColor: '#FA6905',
                                fillOpacity: 0.5,
                                weight: 1,
                                latlngs: latlngs,
                                type: "polygon",
                                message: value.locationName,
                                clickable: true,
                                heading: 240
                            };
                            i++;
                        } else {
                            for (var key in $scope.paths) {
                                if (key.indexOf("polygon") !== -1) {
                                    delete $scope.paths[key];
                                }
                            }
                        }
                    });
                });
        };

        $scope.getStopsLocationsOnMap = function (showStops) {
            if (showStops) {
                angular.forEach($scope.clusters, function(value, key) {
                    angular.forEach(value.points, function(value, key) {
                        $scope.markers["m" + value.modId] = {
                            lat: value.lattitude,
                            lng: value.longitude,
                            focus: false,
                            icon: {
                                type: "awesomeMarker",
                                icon: "star",
                                markerColor: "blue"
                            },
                            message: "ModId: " + value.modId + "</br>Stop duration: " + value.formattedDurationInMin + " min"
                        }
                    });
                });
            } else {
                $scope.markers = {};
            }
        };

        /*
            Semantic locations extraction
         */
        $scope.locationsStatus = [];
        $scope.locationsFormatted = [];
        $scope.selectedLocations = [];
        $scope.chosenLocations = [];

        $scope.extractAllLocations = function() {
            $scope.locationsFormatted = [];
            $scope.markers = {};
            $scope.paths = {};
            $scope.showStops = false;
            $scope.showClusters = false;
            $scope.showGeometry = false;
            $scope.getMapView();
            angular.forEach($scope.clusters, function(value, key) {
                $scope.getSemanticLocations(value.clusterId);
            });
        };

        $scope.getSemanticLocations = function(clusterId) {
            var overpassInterpreterURLPrefix = "https://overpass-api.de/api/interpreter?data=[out:json];way[amenity](";
            var currentCluster = $scope.clusters[clusterId];
            var clusterBoundingBox = getBoundingBoxStretch(currentCluster.lattitudeMin, undefined, $scope.boundingBoxStretch, -1) + ","
                                    + getBoundingBoxStretch(currentCluster.longitudeMin, currentCluster.lattitudeMin, $scope.boundingBoxStretch, -1) + ","
                                    + getBoundingBoxStretch(currentCluster.lattitudeMax, undefined, $scope.boundingBoxStretch, 1) + ","
                                    + getBoundingBoxStretch(currentCluster.longitudeMax, currentCluster.lattitudeMax, $scope.boundingBoxStretch, 1);
            var overpassInterpreterURLSuffix = ");out geom;";
            var overpassResponse;
            var semanticLocations = [];
            var locationsStatus = [];
            $http({
                method: 'GET',
                url: overpassInterpreterURLPrefix + clusterBoundingBox + overpassInterpreterURLSuffix
            }).then(function (response) {
                var i = 1;
                overpassResponse = response.data.elements;
                locationsStatus.push({
                    available: overpassResponse.length > 0
                });
                if (locationsStatus[0].available) {
                    angular.forEach(overpassResponse, function (value, key) {
                        var semanticLocationName = value.tags.amenity + (value.tags.name ? " " + value.tags.name : "");
                        if (semanticLocationName === 'parking') {
                            semanticLocationName = semanticLocationName + (value.tags.parking ? ": " + value.tags.parking : "");
                        }
                        if (value.tags.hasOwnProperty('addr:city')) {
                            semanticLocationName = semanticLocationName + " (" + value.tags['addr:city'] + ", " + value.tags['addr:postcode'] + ", " + value.tags['addr:street'] +
                                " " +  value.tags['addr:housenumber'] + ")";
                        }
                        if (semanticLocations.find(function (obj) { return obj.locationName === semanticLocationName; })) {
                            i++;
                            semanticLocationName = semanticLocationName + "_" + i;
                        }
                        semanticLocations.push({
                            locationName: semanticLocationName,
                            locationGeo: value.geometry
                        });
                    });
                }
                $scope.locationsFormatted[clusterId] = semanticLocations;
                locationsStatus.push({
                    extracted: true
                });
                $scope.locationsStatus[clusterId] = locationsStatus;
            }, function (errResponse) {
                alert("Sorry, there is a problem with connection to OpenstreetMap server. Please, try again later");
                $scope.locationsStatus[clusterId].push({
                    available: false,
                    extracted: false
                });
            });
        };

        /*
            Modal window with semantic locations controls
         */
        $scope.chooseSelectedLocations = function (clusterId) {
            if ($scope.selectedLocations[clusterId]) {
                var selectedLocations = [];
                angular.forEach($scope.selectedLocations[clusterId], function (value, key) {
                    selectedLocations.push(value);
                    $scope.locationsFormatted[clusterId] = $scope.locationsFormatted[clusterId].filter(function (item) {
                        return (item.locationName !== value.locationName);
                    });
                });
                if ($scope.chosenLocations[clusterId] === undefined) {
                    $scope.chosenLocations[clusterId] = [];
                    $scope.chosenLocations[clusterId] = selectedLocations;
                } else {
                    angular.forEach(selectedLocations, function(value, key) {
                        $scope.chosenLocations[clusterId].push(value);
                    });
                }
                $scope.selectedLocations[clusterId] = [];
            }
        };

        $scope.rejectChoosenLocations = function (clusterId) {
            if ($scope.selectedLocations[clusterId]) {
                var selectedLocations = [];
                angular.forEach($scope.selectedLocations[clusterId], function (value, key) {
                    selectedLocations.push(value);
                    $scope.chosenLocations[clusterId] = $scope.chosenLocations[clusterId].filter(function(item) {
                        return (item.locationName !== value.locationName);
                    });
                });
                angular.forEach(selectedLocations, function(value, key) {
                    $scope.locationsFormatted[clusterId].push(value);
                });
                $scope.selectedLocations[clusterId] = [];
            }
        };

        $scope.saveChosenLocations = function (clusterId) {
            if ($scope.chosenLocations[clusterId].length > 0) {
                $scope.locationsFormatted[clusterId] = $scope.chosenLocations[clusterId];
                $scope.chosenLocations[clusterId] = [];
            }
        };

        /*
            Export clusters' data to JSON
         */
        $scope.exportClustersData = function () {
            if ($scope.locationsFormatted) {
                angular.forEach($scope.clusters, function(cluster, keyCluster) {
                    angular.forEach($scope.locationsFormatted, function(location, keyLocations) {
                        if (parseInt(keyCluster) === keyLocations) {
                            $scope.clusters[parseInt(keyCluster)].locations = location;
                        }
                    })
                });
                var fileName = 'SMinerClusterData.json';
                var fileToSave = new Blob([angular.toJson($scope.clusters, true)], {
                    type: 'application/json',
                    name: fileName
                });
                FileSaver.saveAs(fileToSave, fileName);
            }
        };

        var invalidateMap = function() {
            leafletData.getMap().then(function(map) {
                map.invalidateSize(false);
            });
        };

        var getBoundingBoxStretch = function(value, valLat, stretchValue, offset) {
            if (stretchValue) {
                var r_earth = 6378;
                var pi = 3.14;
                if (valLat) {
                    return value + offset * (stretchValue / r_earth) * (180 / pi) / Math.cos(valLat * pi/180);
                } else {
                    return value  + offset * (stretchValue / r_earth) * (180 / pi);
                }
            }
            return value;
        };

        var getMapBoundaries = function(clusters, parameter) {
            var pointsData = [];
            angular.forEach(clusters, function (value, key) {
                pointsData.push(value.points);
            });
            pointsData = flatten(pointsData);
            if (parameter === "LonMin") {
                return  Math.min.apply(Math,pointsData.map(function(item){return item.longitude;}));
            } else if (parameter === "LonMax") {
                return  Math.max.apply(Math,pointsData.map(function(item){return item.longitude;}));
            } else if (parameter === "LatMin") {
                return  Math.min.apply(Math,pointsData.map(function(item){return item.lattitude;}));
            } else if (parameter === "LatMax") {
                return  Math.max.apply(Math,pointsData.map(function(item){return item.lattitude;}));
            }
            return 0;
        };

        var flatten = function(arr) {
            return arr.reduce(function (flat, toFlatten) {
                return flat.concat(Array.isArray(toFlatten) ? flatten(toFlatten) : toFlatten);
            }, []);
        };

        /*var getScatterPlotLabels = function(data) {
            return data.sort(function(a, b){
                return a-b
            });
        }

        var getScatterPlotSettings = function(labels, data) {
            return {
                type: "scatter",
                scaleX: {
                    zooming: true,
                    values: getScatterPlotLabels(labels)
                },
                series: [{
                    values: data
                }]
            };
        };*/

        var getSpatialTemporalPlotSettings = function(labels, dataTemporal, dataSpatial, options) {
            return {
                type: "bar",
                title: {
                    text: options.plotTitle,
                    fontFamily: "Segoe UI",
                    fontSize: 16,
                    fontColor : "#1E5D9E"
                },
                legend: {
                    layout: "x2",
                    align: "right",
                    borderWidth: "0px",
                    marker: {
                        borderRadius: 50
                    },
                    item: {
                        fontColor: "#777"
                    }
                },
                "crosshair-y": {
                    "line-color": "#FF7F27",
                    "line-width": 2,
                    "line-style": "dashed"
                },
                stacked: true,
                scrollX:{
                },
                preview:{
                    height: "20%",
                    width: "100%",
                    x: "5%",
                    y: "7%"
                },
                plot:{
                    aspect: "histogram",
                    alphaArea: 0.6,
                    tooltip: {
                        visible: false
                    }
                },
                plotarea:{
                    "margin-top": "30%",
                    "margin-bottom": "15%"
                },
                scaleX: {
                    zooming: true,
                    offsetY: -20,
                    values: labels,
                    "items-overlap": true,
                    "zoom-to":[0,50],
                    label:{
                        text: options.labelX,
                        "font-family": "Segoe UI",
                        "font-size": 14
                    },
                    item: {
                        fontColor : "#1E5D9E",
                        fontFamily: "Segoe UI"
                    },
                    tick: {
                        lineColor: '#D1D3D4'
                    }
                },
                scaleY: {
                    label:{
                        text: options.labelY,
                        "font-family": "Segoe UI",
                        "font-size": 14
                    },
                    item: {
                        fontColor : "#1E5D9E",
                        fontFamily: "Segoe UI"
                    },
                },
                "scale-y-2": {
                    label:{
                        text: options.labelY2,
                        "font-family": "Segoe UI",
                        "font-size": 14
                    }
                },
                series: [
                    {
                        text: "Area radius (km)",
                        scales:"scale-x,scale-y-2",
                        values: dataSpatial,
                        backgroundColor: "#00BAF2"
                    },
                    {
                        text: "Stop duration (min)",
                        scales:"scale-x,scale-y",
                        values: dataTemporal,
                        backgroundColor: "#E80C60"
                    }
                ]
            };
        };

        var getPlotSettings = function(labels, data, options) {
            return {
                type: "bar",
                title: {
                    text: options.plotTitle,
                    fontFamily: "Segoe UI",
                    fontSize: 16,
                    fontColor : "#1E5D9E"
                },
                "crosshair-y": {
                    "line-color": "#FF7F27",
                    "line-width": 2,
                    "line-style": "dashed"
                },
                stacked: true,
                scrollX:{
                },
                preview:{
                    height: "20%",
                    width: "100%",
                    x: "5%",
                    y: "7%"
                },
                plot:{
                    aspect: "histogram",
                    alphaArea: 0.6,
                    tooltip: {
                        visible: false
                    }
                },
                plotarea:{
                    "margin-top": "30%",
                    "margin-bottom": "15%"
                },
                scaleX: {
                    zooming: true,
                    values: labels,
                    "zoom-to":[0,50],
                    label:{
                        text: options.labelX,
                        "font-family": "Segoe UI",
                        "font-size": 14
                    },
                },
                scaleY: {
                    label:{
                        text: options.labelY,
                        "font-family": "Segoe UI",
                        "font-size": 14
                    }
                },
                series: [{
                    values: data
                }]
            };
        };
}]);

module.directive("fileModel", ["$parse", function ($parse) {
    return {
        restrict: "A",
        link: function(scope, element, attrs) {
            var model = $parse(attrs.fileModel);
            var modelSetter = model.assign;

            element.bind("change", function(){
                scope.$apply(function(){
                    modelSetter(scope, element[0].files[0]);
                });
            });
        }
    };
}]);

module.config(["cfpLoadingBarProvider", function(cfpLoadingBarProvider) {
    cfpLoadingBarProvider.includeSpinner = true;
    cfpLoadingBarProvider.latencyThreshold = 1000;
    //cfpLoadingBarProvider.parentSelector = '#loading-bar-container';
    //cfpLoadingBarProvider.spinnerTemplate = '<div><span class="fa fa-spinner">Uploading the dataset...</div>';
}]);