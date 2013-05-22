/**
 * Module dependencies.
 */

var cluster = require('cluster')
  , express = require('express')
  , join = require('path').join
  , fs = require('fs')
  , sto = require('swtor-tanking')
  ;
  
var procs = process.env.procs || 1
  , port = process.env.port || 3001
  , host = process.env.host || '127.0.0.1'
  ;
  
function isIntNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n) && n % 1 === 0;
}
  
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
  app.use(express.bodyParser());
  
  app.enable('trust proxy');
  app.enable('strict routing');

  // routes
  
  app.get('/:file(*)', function(req, res, next){
    var file = req.params.file;
    if (!file) return next();
    var path = join(__dirname, "static", file);
    fs.stat(path, function(err, stat){
      if (err) return next();
      res.sendfile(path);
    });
  });

  // redir / to index.html
  app.get('/*', function(req, res){
    res.sendfile(join(__dirname, "static", 'index.html'));
  });
  
  app.post('/api/optimize', function (req, res){
    var data_keys = [ 'class'
                    , 'stim'
                    , 'relic1'
                    , 'relic2'
                    ]
      , nume_keys = [ 'defRating'
                    , 'shieldRating'
                    , 'absorbRating'
                    , 'armorRating'
                    ]
      ;
    
    var error_msgs = [];
    
    data_keys.concat(nume_keys).forEach(function (key){
      if (!(req.body[key] || req.body[key] === 0)){
        error_msgs.push("Expected data '" + key + "' was not present.");
      }
    });
    
    if (req.body['class'] && ['shadow', 'guardian', 'vanguard'].indexOf(req.body['class']) === -1){
      error_msgs.push("Class value was not expected.");
    }
    
    if (req.body['stim'] && ['proto_nano', 'reuse_nano', 'none'].indexOf(req.body['stim']) === -1){
      error_msgs.push("Stim value was not expected.");
    }
    
    var relicData = {
      numRelics: 2
    , relic1: null
    , relic2: null
    };
    
    (['relic1', 'relic2']).forEach(function (relic){
      if (req.body[relic] === "none"){
        relicData.numRelics--;
      }
      else {
        var parts = req.body[relic].split(':');
        if (!sto.relicData[parts[0]][parts[1]]){
          relicData.numRelics--;
        }
        else if (!relicData.relic1){
          relicData.relic1 = sto.relicData[parts[0]][parts[1]];
        }
        else {
          relicData.relic2 = sto.relicData[parts[0]][parts[1]];
        }
      }
    });
    
    nume_keys.forEach(function (key){
      if (req.body[key] && !isIntNumber(req.body[key]) && parseFloat(req.body[key]) > 0){
        error_msgs.push(key + " must be a non-negative integer value.");
      }
    });
    
    res.set('Content-type', 'application/json')
    if (error_msgs.length) {
      //errror in parameters
      res.send({error: error_msgs});
    }
    else {
      //try to optimize
      var statBudget = 0;
      statBudget += parseFloat(req.body['defRating']);
      statBudget += parseFloat(req.body['shieldRating']);
      statBudget += parseFloat(req.body['absorbRating']);
      
      var stimValue = 0;
      if (req.body['stim'] === "proto_nano"){
        stimValue = 70;
      }
      else if (req.body['stim'] === "reuse_nano"){
        stimValue = 63;
      }
      
      sto.optimizer.optimize(sto.otherData, sto.classData[req.body['class']], relicData, statBudget, parseFloat(req.body['armorRating']), stimValue, function (err, result){
        if (err){
          res.send({error: err});
        }
        else {
          res.send({result: result});
        }
      });
    }
  });
  
  //app.use("/", express.static(join(__dirname, "static")));

  if (host && host !== 'INADDR_ANY'){
    app.listen(port, host);  
  }
  else {
    app.listen(port);
  }
  
  console.log('Worker %s listening on %s:%s', process.pid, host, port);
}
