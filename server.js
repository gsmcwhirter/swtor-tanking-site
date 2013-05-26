/**
 * Module dependencies.
 */

var cluster = require('cluster')
  , express = require('express')
  , join = require('path').join
  , fs = require('fs')
  , sto = require('swtor-tanking')
  , ce = require('cloneextend')
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
    
    var otherData = ce.clone(sto.otherData);
    if (req.body['advanced']){
      otherData = ce.extend(otherData, req.body['advanced']);
      
      for (var key in req.body['advanced']){
        if (otherData.hasOwnProperty(key)){
          otherData[key] = parseFloat(otherData[key]);
        }
      }
    }
    
    if (Math.abs(otherData.dmgMRKE + otherData.dmgFTKE + otherData.dmgFTIE - 1.0) > 0.0000001){
      error_msgs.push("Damage types do not add up correctly.");
    }
    else if (otherData.dmgMRKE < 0 || otherData.dmgFTKE < 0 || otherData.dmgFTIE < 0){
      error_msgs.push("Damage type percentages must be non-negative.");
    }
    
    if (otherData.shieldLow > otherData.shieldHigh){
      error_msgs.push("Shield lower bound cannot be greater than the upper bound.");
    }
    else if (otherData.shieldLow < 0 || otherData.shieldHigh > 1){
      error_msgs.push("Shield bounds must be values between 0 and 1.");
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
      if (req.body[key] && !(isIntNumber(req.body[key]) && parseFloat(req.body[key]) > 0)){
        error_msgs.push(key + " must be a non-negative integer value.");
      }
    });
    
    res.set('Content-type', 'application/json');
    
    if (error_msgs.length) {
      //errror in parameters
      res.send({error: error_msgs});
    }
    else {
      //try to optimize
      var startingStats = {
        'startingDef': parseInt(req.body['defRating'], 10)
      , 'startingShield': parseInt(req.body['shieldRating'], 10)
      , 'startingAbsorb': parseInt(req.body['absorbRating'], 10)  
      };
      
      var stimValue = 0;
      if (req.body['stim'] === "proto_nano"){
        stimValue = 70;
      }
      else if (req.body['stim'] === "reuse_nano"){
        stimValue = 63;
      }
      
      sto.optimizer.optimize(otherData, sto.classData[req.body['class']], relicData, startingStats, parseInt(req.body['armorRating'], 10), stimValue, function (err, result){
        if (err){
          res.send({error: err});
        }
        else {
          res.send({result: result});
        }
      });
    }
  });
  
  app.get("/api/class-data", function (req, res){
    res.set('Content-type', 'application/json');
    
    res.send(sto.classData);
  });
  
  app.get("/api/relic-data", function (req, res){
    res.set('Content-type', 'application/json');
    
    res.send(sto.relicData);
  });
  
  app.get("/api/combat-data", function (req, res){
    res.set('Content-type', 'application/json');
    
    res.send({
      dmgMRKE: sto.otherData.dmgMRKE
    , dmgFTKE: sto.otherData.dmgFTKE
    , dmgFTIE: sto.otherData.dmgFTIE
    , timePerSwing: sto.otherData.timePerSwing
    });
  });
  
  app.get("/api/shield-data", function (req, res){
    res.set('Content-type', 'application/json');
    
    res.send({
      low: sto.otherData.shieldLow
    , high: sto.otherData.shieldHigh
    });
  });
  
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
  
  //app.use("/", express.static(join(__dirname, "static")));

  if (host && host !== 'INADDR_ANY'){
    app.listen(port, host);  
  }
  else {
    app.listen(port);
  }
  
  console.log('Worker %s listening on %s:%s', process.pid, host, port);
}
