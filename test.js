

var clientOptions = require("./clientConfig.json");

var factory = require("./index.js");

var awsThing;
var awsClient

factory.clientFactory(clientOptions, function(err, client) {
     awsClient = client;
     client.thingFactory("nodeIoTLauncher-98-5F-D3-3D-95-27", function(err, thing) {
          awsThing = thing;
          console.log("-------thing returned-----------");
          console.log(JSON.stringify(awsThing));
          awsThing.register(function() {
               console.log("-------thing registered------");
               console.log(JSON.stringify(awsThing));
          });
     });
     console.log("-------client returned-------");
     console.log(JSON.stringify(client));
});
