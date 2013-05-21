/**
 * Module dependencies.
 */

var express = require('express')
  , join = require('path').join
  , fs = require('fs')
  , config = require('./config.json')
  ;

var app = express();

app.use(express.favicon());
app.use(express.logger());

app.enable('strict routing');

// routes

/**
 * GET /* as a file if it exists.
 */

app.get('/:file(*)', function(req, res, next){
  var file = req.params.file;
  if (!file) return next();
  var name = req.params.example;
  var path = join(__dirname, "static", name, file);
  fs.stat(path, function(err, stat){
    if (err) return next();
    res.sendfile(path);
  });
});

/**
 * GET /* as index.html
 */

app.get('/*', function(req, res){
  var name = req.params.example;
  res.sendfile(join(__dirname, "static", name, 'index.html'));
});

app.listen(config.port || 3000);
console.log('Example server listening on port %s', config.port || 3000);
