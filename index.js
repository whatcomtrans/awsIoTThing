"use strict";

// http://justbuildsomething.com/node-js-best-practices/
//callback = (typeof callback === 'function') ? callback : function() {};

/*
  TODO
*/


/**
 * Turn on and off debug to console by setting to null
 */
var _debugConsole = console;

/**
 * //debugConsole - A helper function for debuging to console, or not
 *
 * @param  {type} msg description
 * @return {type}     description
 */
function debugConsole(msg) {
     if (_debugConsole != null) {
          _debugConsole.log(msg);
     }
}


/**
 * Requires...
 */
const EventEmitter = require('events');
const equal = require('deep-equal');
const awsIot = require('aws-iot-device-sdk');


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
          callback = (typeof callback === 'function') ? callback : function(error) {};
          _this._client.registerThing(_this);
          _this._client.register(_this.thingName, _this._options, callback);
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

     get connected() {
          return this._client.connected();
     }

     get reconnecting() {
          return this._client.reconnecting();
     }

     // Method for updating properties of the thing

     reportProperty(propertyName, propertyValue, delayUpdate, callback) {
          var _this = this;
          //debugConsole(JSON.stringify(_this._local));
          callback = (typeof callback === 'function') ? callback : function() {};
          var oldValue = null;
          var isAdded = false;

          //Update local property
          if (_this.hasOwnProperty(propertyName) == false) {
               //debugConsole("Property " + propertyName + " does not exist in _local, adding it now.")
               //create it first
               if (_this._local.hasOwnProperty(propertyName) == false) {
                    _this._local[propertyName] = propertyValue;
               }
               ////debugConsole("Property added, _local is now " + JSON.stringify(_this._local));
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
               isAdded = true;
               _this.emit(propertyName + "Added", propertyValue);
          } else {
               oldValue = _this._local[propertyName];
          }

          //Only update value if it is different
          ////debugConsole("Here with " + propertyName + " of value " + JSON.stringify(propertyValue) + " and old propertyValue of " + JSON.stringify(oldValue));
          if (Object.is(oldValue, propertyValue)) {     //same value
               //debugConsole("No value change");
          } else {       //New value
               //debugConsole("New property value, current _local is " + JSON.stringify(_this._local));
               _this._local[propertyName] = propertyValue;
               if (isAdded == false) {  //Fire added or changed but not both
                    //debugConsole("About to fire event " + propertyName + "Changed");
                    _this.emit(propertyName + "Changed", propertyValue, oldValue);
               }
               if (delayUpdate || _this.defaultDelayUpdate) {
                    //DO nothing
               } else {
                    ////debugConsole("Here, about to reportState" + JSON.stringify(_this._local));
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
          var _this = this;
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
          //debugConsole("About to reportState with documentState = " + JSON.stringify(documentState));
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
          var _this = this;
          //debugConsole("In setLocalToDesired and _desired is " + JSON.stringify(_this._desired));
          if (typeof _this._desired === 'undefined') {
               _this._desired = new Object();

          } else {
               Object.getOwnPropertyNames(_this._desired).forEach(function(val, idx, array) {
                    _this.reportProperty(val, _this._desired[val], true);
               });
          }
     }

     getDesiredProperty(propertyName) {
          var _this = this;
          if (_this._desired === undefined) {
               return null;
          } else {
               if (_this._desired.hasOwnProperty(propertyName)) {
                    return this._desired[propertyName];
               } else {
                    return null;
               }
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
          if (_this._delta === undefined) {
               return null;
          } else {
               if (_this._delta.hasOwnProperty(propertyName)) {
                    return this._delta[propertyName];
               } else {
                    return null;
               }
          }
     }

     unregister() {
          this._client.unregister(this.thingName);
     }

     end(force, callback) {
          this._client.end.apply(this, arguments);
     }

     subscribe(topic, options, callback) {
          this._client.subscribe.apply(this, arguments);
     }

     publish(topic, message, options, callback) {
          this._client.publish.apply(this, arguments);
     }

     unsubscribe(topic, callback) {
          this._client.unsubscribe.apply(this, arguments);
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
     thingShadows.on("connect", function(connack) {
          thingShadows._things.forEach(function(obj) {
               obj.emit("connect", connack);
          });
          callback(error, thingShadows);
     });

     thingShadows.on("reconnect", function() {
          thingShadows._things.forEach(function(obj) {
               obj.emit("reconnect");
          });
     });

     thingShadows.on("close", function() {
          thingShadows._things.forEach(function(obj) {
               obj.emit("close");
          });
     });

     thingShadows.on("offline", function() {
          thingShadows._things.forEach(function(obj) {
               obj.emit("offline");
          });
     });

     thingShadows.on("error", function() {
          thingShadows._things.forEach(function(obj) {
               obj.emit("error");
          });
     });

     thingShadows.on("message", function(topic, message, packet) {
          debugConsole("Received message from topic " + topic + " with contents of " + message);
          thingShadows._things.forEach(function(obj) {
               obj.emit("message", topic, message, packet);
          });

          //TODO need to map subscriptions to thing via thingShadow and emit only for those things that subscribed
     });

     thingShadows.on("packetsend", function(packet) {
          thingShadows._things.forEach(function(obj) {
               obj.emit("packetsend", packet);
          });
     });

     thingShadows.on("packetreceive", function(packet) {
          thingShadows._things.forEach(function(obj) {
               obj.emit("packetreceive", packet);
          });
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
               // For all
               //debugConsole("Status event recieved, " + clientRequest.method + " wa " + stat + " and returned " + JSON.stringify(stateObject));
               if (clientRequest.method == "update") {
                    clientRequest.thing._reported = stateObject.state.reported;
                    // Update only returns reported
               }

               if (clientRequest.method == "get") {
                    clientRequest.thing._reported = stateObject.state.reported;
                    clientRequest.thing._desired = stateObject.state.desired;
                    clientRequest.thing._delta = stateObject.state.delta
                    if (clientRequest.thing.makeLocalMatchDesired) {
                         //debugConsole("Going to setLocalToDesired");
                         clientRequest.thing.setLocalToDesired();
                         clientRequest.thing.reportState();
                    }
               }

               if (clientRequest.method == "delete") {
                    debugConsole("In delete, stateObject is " + JSON.stringify(stateObject));
                    clientRequest.thing._reported = stateObject.state.reported;
                    clientRequest.thing._desired = stateObject.state.desired;
                    clientRequest.thing._delta = stateObject.state.delta
                    if (clientRequest.thing.makeLocalMatchDesired) {
                         //debugConsole("Going to setLocalToDesired");
                         clientRequest.thing.setLocalToDesired();
                    }
               }
          } else { //rejected
               //TODO
          }

          // emit and callback
          clientRequest.thing.emit(clientRequest.method + capitalizeWord(stat), stateObject);
          clientRequest.thing.emit("status", thingName, stat, clientToken, stateObject);
          clientRequest.callback(stat, stateObject);
     });

     thingShadows.on("delta", function(thingName, stateObject) {
          var _this = this;
          debugConsole("In delta, state is " + JSON.stringify(stateObject));
          // Find the clientRequest
          // TODO - need to not just emit but to also update values as needed
          var thing = thingShadows._things.get(thingName);
          thing._delta = stateObject.state;
          if (thing.makeLocalMatchDesired) {
               debugConsole("Going to retrieveState and make sure we are up to date");
               //thing.setLocalToDesired();
               thing.retrieveState();
          }
          thing.emit("delta", stateObject);
     });

     thingShadows.on("foreignStateChange", function(thingName, operation, stateObject) {
          var _this = this;
          // Find the clientRequest
          // TODO - need to not just emit but to also update values as needed
          var thing = thingShadows._things.get(thingName);
          thing._reported = stateObject;
          thing._desired = stateObject;
          thing._delta = stateObject;
          if (thing.makeLocalMatchDesired) {
               //debugConsole("Going to setLocalToDesired");
               thing.setLocalToDesired();
          }
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

    return thingShadows;  // As the client
}

module.exports.setLogger = function(logger) {
     _debugConsole = logger;
};
