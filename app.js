var express = require('express');
var app = express();

//Static resources server
app.use(express.static(__dirname + '/www'));

var server = app.listen(8080, function () {
	var host = server.address().address;
	var port = server.address().port;
	console.log('Server running at port %s', port);
});
