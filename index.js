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
     constructor(client, name) {
          super();
          var _this = this;
          _this._client = client;
          _this.thingName = name;
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
}

module.exports.clientFactory = function(options, callback) {
     //This establishes a "device" or "thingShadow" that will support multiple things
     var _this = this;
     var error;
     var thingShadows = awsIot.thingShadow(options);
     callback = (typeof callback === 'function') ? callback : function() {};

     //Wait until it has connected to return, I suppose, if at all
     thingShadows.on("connect", function() {
          callback(error, thingShadows);
     });

     thingShadows.thingFactory = function(thingName, callback) {
          var error;
          var thisThing = new awsIoTThing(thingShadows, thingName);
          callback = (typeof callback === 'function') ? callback : function() {};
          callback(error, thisThing);
     }
}
