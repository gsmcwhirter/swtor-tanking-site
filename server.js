/**
 * Module dependencies.
 */

var cluster = require('cluster')
  , express = require('express')
  , join = require('path').join
  , fs = require('fs')
  ;
  
var procs = process.env.procs || 1
  , port = process.env.port || 3001
  , host = process.env.host || '127.0.0.1'
  ;
  
if (cluster.isMaster) {
  //fork workers
  console.log("Starting a cluster with %s workers listening on %s:%s...", procs, host, port);
  
  for (var i = 0; i < procs; i++){
    cluster.fork();
  }
  
  cluster.on('exit', function (worker, code, signal){
    console.log('worker %s died', worker.process.pid);
  });
}
else {
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

  if (host && host !== 'INADDR_ANY'){
    app.listen(port, host);  
  }
  else {
    app.listen(port);
  }
  
  console.log('Worker %s listening on %s:%s', process.pid, host, port);
}
