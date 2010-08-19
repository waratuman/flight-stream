require.paths.unshift(__dirname + '/lib');

var fs = require('fs'),
	ws = require('ws'),
	sys = require('sys'),
	url = require('url'),
	http = require('http'),
	path = require('path'),
	redis = require('redis-client');
	
var db = redis.createClient(9281, 'goosefish.redistogo.com');
var dbAuth = function() { db.auth('dc64f7b818f4e3ec2e3d3d033e3e5ff4'); }
db.addListener('connected', dbAuth);
db.addListener('reconnected', dbAuth);

var httpServer = http.createServer( function(request, response) {
	var pathname = url.parse(request.url).pathname;
	if (pathname == "/") pathname = "index.html";
	var filename = path.join(process.cwd(), 'public', pathname);
	
	path.exists(filename, function(exists) {
		if (!exists) {
			response.writeHead(404, {"Content-Type": "text/plain"});
			response.write("404 Not Found");
			response.end();
			return;
		}
		
		response.writeHead(200, {'Content-Type': 'text/html'});
		fs.createReadStream(filename, {
			'flags': 'r',
			'encoding': 'binary',
			'mode': 0666,
			'bufferSize': 4 * 1024
		}).addListener("data", function(chunk) {
			response.write(chunk, 'binary');
		}).addListener("close",function() {
			response.end();
		});
	});
});

db.subscribeTo("flight_stream", function(channel, message, pattern) {
	try { var flight = JSON.parse(message); }
	catch (SyntaxError) { return false; }
	
	if ( flight.origin.iata == "BOS" || flight.destination.iata == "BOS") {
		server.broadcast(flight);
	}
});

var server = ws.createServer({}, httpServer);

server.listen(8000);