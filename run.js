var forever = require('forever-monitor')
  , path = require('path')
  , config = require('./config.json')
  ;
  
var env = process.env.environment || config.environment || 'development'
  , host = process.env.host || config.host || 'INADDR_ANY'
  , port = process.env.port || config.port || 8004
  , cluster_procs = process.env.procs || config.procs || 1
  , logDir = config.logDir || './log'
  ;
  
console.log("Starting cluster at %s:%s in %s mode...", host, port, env);
console.log("Logging to %s....", logDir);

var child = new (forever.Monitor)('server.js', {
  silent: false
, forever: true
, uid: config.uid
, env: {
    NODE_ENV: env
  , port: port
  , host: host
  , procs: cluster_procs
  }
, logFile: path.join(logDir, "tortank_forever.log")
, outFile: path.join(logDir, "tortank_out.log")
, errFile: path.join(logDir, "tortank_error.log")
, appendLog: true
});

child.on('exit', function (){
  console.log("Cluster server exited.");
});

child.start();
