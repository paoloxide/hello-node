var http = require('http'); //add the http module

//Create a server
var myServer = http.createServer(function (request, response) {
  // Return something from server
  response.writeHead(200, {"Content-Type": "text/plain"});
  response.end("Hello There!\n");
}); //create a server

myServer.listen(3000);

console.log("Go to localhost:3000 on your browser");