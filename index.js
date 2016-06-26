"use strict";

// http://justbuildsomething.com/node-js-best-practices/
//callback = (typeof callback === 'function') ? callback : function() {};

/*
  TODO
*/

var debugOn = true;
function debugConsole(msg) {
     if (debugOn) {
          console.log("DEBUG: " + msg);
     }
}

const EventEmitter = require('events');
var awsIot = require('aws-iot-device-sdk');

class awsIoTThing extends EventEmitter {
     constructor(client, name, callback) {
          super();
          var _this = this;
          _this._client = client;
          _this.thingName = name;
          _this._delta = null;
          _this._reported = null;
          _this._desired = null;
          _this._lastRequestStatus = null;
          _this._options = {
               "ignoreDeltas": false,
               "persistentSubscribe": true,
               "discardStale": true,
               "enableVersioning": true
          };

          // listen for events TODO
          _this._client.on("timeout", function() {
               //TODO
          });
          _this._client.on("", function() {
               //TODO
          });
          _this._client.on("", function() {
               //TODO
          });
          _this._client.on("", function() {
               //TODO
          });
          _this._client.on("", function() {
               //TODO
          });
          _this._client.on("", function() {
               //TODO
          });

     }

     // Putting register method here rather then constructor so it can take a callback and options can be first set
     register(callback) {
          var _this = this;
          var error;
          _this._client.register(_this.thingName, _this._options);
          _this._client.registerThing(_this);
          //Wait 5 seconds before calling back (see AWS documentation for Update)
          callback = (typeof callback === 'function') ? callback : function(error) {};
          setTimeout(function() {callback(error)}, 5000);
     }

     // register options get/set
     get ignoreDeltas() {
          return this._options.ignoreDeltas;
     }
     set ignoreDeltas(boolean) {
          this._options.ignoreDeltas = boolean;
     }
     get persistentSubscribe() {
          return this._options.persistentSubscribe;
     }
     set persistentSubscribe(boolean) {
          this._options.persistentSubscribe = boolean;
     }
     get discardStale() {
          return this._options.discardStale;
     }
     set discardStale(boolean) {
          this._options.discardStale = boolean;
     }
     get enableVersioning() {
          return this._options.enableVersioning;
     }
     set enableVersioning(boolean) {
          this._options.enableVersioning = boolean;
     }

     // Method for updating properties of the thing

     reportProperty(propertyName, propertyValue, delayUpdate, callback) {
          var _this = this;
          callback = (typeof callback === 'function') ? callback : function() {};

          //Update local property
          if (_this.hasOwnProperty(propertyName) == false) {
               //create it first
               Object.defineProperty(_this, propertyName, {
                    "configurable": true,
                    "enumarable": true,
                    "get": function() {
                         return _this._reported[propertyName];
                    },
                    "set": function(value) {
                         _this._reported[propertyName] = value;
                         _this.reportState();
                    }
               });
          }
          _this[propertyName] = propertyValue;


          if (delayUpdate != true) {
               _this.reportState(callback);
          }
     }

     deleteProperty(propertyName, delayUpdate, callback) {
          var _this = this;
          delete _this[propertyName];
          delete _this._reported[propertyName];

          if (delayUpdate != true) {
               _this.reportState(callback);
          }
     }

     getProperty(propertyName) {
          var _this = this;
          if (_this._reported.hasOwnProperty(propertyName)) {
               return this._reported[propertyName];
          } else {
               return null;
          }
     }

     reportState(callback) {
          var _this = this;
          callback = (typeof callback === 'function') ? callback : function() {};
          var documentState = {
               "state": {
                    "reported": null
               }
          };
          documentState.state.reported = _this._reported;
          var token = _this._client.update(_this.thingName, documentState);
          _this._client.addToken(token, "update", _this, callback);
     }

     getDesiredProperty(propertyName) {
          var _this = this;
          if (_this._desired.hasOwnProperty(propertyName)) {
               return this._desired[propertyName];
          } else {
               return null;
          }
     }

     getDesired() {
          return this._desired;
     }

     getDelta() {
          return this._delta;
     }

     getDeltaProperty(propertyName) {
          var _this = this;
          if (_this._delta.hasOwnProperty(propertyName)) {
               return this._delta[propertyName];
          } else {
               return null;
          }
     }

     unregister() {
          this._client.unregister(this.thingName);
     }

     end(force, callback) {
          this._client.end(force, callback);
     }
}

module.exports.clientFactory = function(options, callback) {
     //This establishes a "device" or "thingShadow" that will support multiple things
     var _this = this;
     var error;
     var thingShadows = awsIot.thingShadow(options);

     callback = (typeof callback === 'function') ? callback : function() {};

     thingShadows._requestTokens = new Map();
     thingShadows._requestThings = new Map();
     thingShadows._things = new Map();


     //Wait until it has connected to return, I suppose, if at all
     thingShadows.on("connect", function() {
          callback(error, thingShadows);
     });

     thingShadows.thingFactory = function(thingName, callback) {
          var error;
          var thisThing = new awsIoTThing(thingShadows, thingName);
          callback = (typeof callback === 'function') ? callback : function() {};
          callback(error, thisThing);
     };

     thingShadows.registerThing = function(thing) {
          thingShadows._things.set(thing,thingName, thing);
     };

     thingShadows.addToken = function(clientToken, method, thing, callback) {
          var _this = this;
          var clientRequest = {
               "clientToken": clientToken,
               "method": method,
               "thing": thing,
               "thingName": thing.thingName,
               "callback": callback
          };
          _this._requestTokens.set(clientRequest.clientToken, clientRequest);
          _this._requestThings.set(clientRequest.thingName, clientRequest);
          clientRequest.thing._lastRequest = clientRequest;
     };

     function capitalizeWord(string) {
          return string.charAt(0).toUpperCase() + string.slice(1);
     }

     thingShadows.on("status", function(thingName, stat, clientToken, stateObject) {
          var _this = this;
          // Find the clientRequest
          var clientRequest = _this._requestTokens.get(clientToken);
          clientRequest.thing._lastRequestStatus = stat

          if (stat == "accepted") {
               if (clientRequest.method == "update") {
                    //TODO check this
                    clientRequest.thing._reported = stateObject.reported;
                    clientRequest.thing._desired = stateObject.desired;
                    clientRequest.thing._delta = stateObject.delta
               }

               if (clientRequest.method == "get") {
                    clientRequest.thing._reported = stateObject.reported;
                    clientRequest.thing._desired = stateObject.desired;
                    clientRequest.thing._delta = stateObject.delta;
               }

               if (clientRequest.method == "delete") {
                    //TODO - really need to refactor code above to only remove the property when delete is successful
               }
          } else { //rejected
               //TODO
          }

          // emit and callback
          clientRequest.thing.emit(clientRequest.method + capitalizeWord(stat), stateObject);
          clientRequest.thing.emit("status", thingName, stat, clientToken, stateObject);
          clientRequest.callback(stat, stateObject);
     });

     thingShadows.on("foreignStateChange", function(thingName, operation, stateObject) {
          var _this = this;
          // Find the clientRequest
          var thing = thingShadows._things.get(thingName);
          thing.emit("foreignStateChange", operation, stateObject);
     });

     thingShadows.on("timeout", function(thingName, clientToken) {
          var _this = this;
          // Find the clientRequest
          var clientRequest = _this._requestTokens.get(clientToken);
          clientRequest.thing._lastRequestStatus = "timeout"
          clientRequest.thing.emit("timeout", thingName, clientToken);
          clientRequest.callback("timeout");
     });
}
