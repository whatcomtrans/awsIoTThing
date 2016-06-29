"use strict";

// http://justbuildsomething.com/node-js-best-practices/
//callback = (typeof callback === 'function') ? callback : function() {};

/*
  TODO
*/


/**
 * Turn on and off debug to console
 */
var debugOn = true;

/**
 * debugConsole - A helper function for debuging to console, or not
 *
 * @param  {type} msg description
 * @return {type}     description
 */
function debugConsole(msg) {
     if (debugOn) {
          console.log("DEBUG: " + msg);
     }
}


/**
 * Requires...
 */
const EventEmitter = require('events');
var awsIot = require('aws-iot-device-sdk');


/**
 * Defines an AWS IoT thing object to faciliate communication
 * @class
 */
class awsIoTThing extends EventEmitter {
     constructor(client, name, callback) {
          super();
          var _this = this;
          _this._client = client;
          _this.thingName = name;
          _this._delta = new Object();
          _this._reported = new Object();
          _this._desired = new Object();
          _this._local = new Object();
          _this._lastRequestStatus = null;
          _this._options = {
               "ignoreDeltas": false,
               "persistentSubscribe": true,
               "discardStale": true,
               "enableVersioning": true,
               "makeLocalMatchDesired": false,
               "defaultDelayUpdate": false
          };
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
     get makeLocalMatchDesired() {
          return this._options.makeLocalMatchDesired;
     }
     set makeLocalMatchDesired(boolean) {
          this._options.makeLocalMatchDesired = boolean;
     }
     get defaultDelayUpdate() {
          return this._options.defaultDelayUpdate;
     }
     set defaultDelayUpdate(boolean) {
          this._options.defaultDelayUpdate = boolean;
     }

     // Method for updating properties of the thing

     reportProperty(propertyName, propertyValue, delayUpdate, callback) {
          var _this = this;
          callback = (typeof callback === 'function') ? callback : function() {};

          //Update local property
          if (_this.hasOwnProperty(propertyName) == false) {
               //create it first
               /*Object.defineProperty(_this._local, propertyName, {
                    "configurable": true,
                    "enumarable": true,
               });*/
               Object.defineProperty(_this, propertyName, {
                    "configurable": true,
                    "enumarable": true,
                    "get": function() {
                         return _this.getProperty(propertyName);
                    },
                    "set": function(value) {
                         _this.setProperty(propertyName, value);
                         _this.reportState();
                    }
               });
               _this.emit(propertyName + "Added");
          }
          var oldValue = _this._local[propertyName];
          //Only update value if it is different
          if (Object.is(oldValue, propertyValue) == false) {
               _this._local[propertyName] = propertyValue;
               _this.emit(propertyName + "Changed", propertyValue, oldValue);
               if (delayUpdate || _this.defaultDelayUpdate) {
                    //DO nothing
               } else {
                    _this.reportState(callback);
               }
          }
     }

     deleteProperty(propertyName, delayUpdate, callback) {
          var _this = this;
          var oldValue = _this[propertyName]
          delete _this[propertyName];
          delete _this._local[propertyName];
          _this.emit(propertyName + "Deleted", oldValue)
          if (delayUpdate != true) {
               _this.reportState(callback);
          }
     }

     setProperty(propertyName, propertyValue) {
          _this.reportProperty(propertyName, propertyValue);
     }

     getProperty(propertyName) {
          var _this = this;
          if (_this._local.hasOwnProperty(propertyName)) {
               return this._local[propertyName];
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
          documentState.state.reported = _this._local;
          var token = _this._client.update(_this.thingName, documentState);
          _this._client.addToken(token, "update", _this, callback);
     }

     retrieveState(callback) {
          var _this = this;
          callback = (typeof callback === 'function') ? callback : function() {};
          var token = _this._client.get(_this.thingName);
          _this._client.addToken(token, "get", _this, callback);
     }

     setLocalToDesired() {
          this._local = this._desired;
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

     getReported() {
          return this._reported;
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

     thingShadows.thingFactory = function(thingName, options, doRegister, callback) {
          var error;
          var thisThing = new awsIoTThing(thingShadows, thingName);
          Object.assign(thisThing, options);
          callback = (typeof callback === 'function') ? callback : function() {};

          if (doRegister) {
               thisThing.register(function(error) {callback(error, thisThing)});
          } else {
               callback(error, thisThing);
          }
     };

     thingShadows.registerThing = function(thing) {
          thingShadows._things.set(thing.thingName, thing);
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
               debugConsole(JSON.stringify(stateObject));
               clientRequest.thing._reported = stateObject.state.reported;
               clientRequest.thing._desired = stateObject.state.desired;
               clientRequest.thing._delta = stateObject.state.delta
               if (clientRequest.thing.makeLocalMatchDesired) {
                    Object.getOwnPropertyNames(clientRequest.thing._desired).forEach(function(val, idx, array) {
                         clientRequest.thing._local[val] = clientRequest.thing._desired[val];
                    });
               }
               if (clientRequest.method == "update") {
                    //TODO anything specific?
               }

               if (clientRequest.method == "get") {
                    //TODO anything specific?
               }

               if (clientRequest.method == "delete") {
                    //TODO anything specific?
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
