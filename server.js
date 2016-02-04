var express = require('express');
var app = express();

var port = '50943';

app.use(express.static(__dirname + '/public/'));
app.listen(port);

console.log('gulp ractive foundation now running on http://localhost:' + port );
