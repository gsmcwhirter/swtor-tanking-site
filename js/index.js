var request = require("superagent")
  , page = require("page")
  , loading = require("loading-lock")
  , dom = require("dom")
  , json = require("json")
  , each = require("each")
  , locker = loading(dom("#actual_results").els[0], {size: 80})
  ;
  
function isIntNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n) && n % 1 === 0;
}

function formatIntNumber(n) {
  return Math.floor(parseFloat(n));
}  

function clearPage(){
  dom("#main, #about").each(function (item){
    item.els[0].style.display = 'none';
  });
}

function showIndex(){
  clearPage();
  dom("#main").els[0].style.display = '';
}

function showAssumptions(){
  clearPage();
  dom("#about").els[0].style.display = '';
}
  
module.exports = function run(){
  page("", showIndex);
  page("/", showIndex);
  page("/about", showAssumptions);
  page();

  //TODO: integrate relics

  var numberFields = [
    "#defRating"
  , "#shieldRating"
  , "#absorbRating"
  , "#armorRating"
  ];

  each(numberFields, function (field){
    dom(field).on('keyup', validateNumber);
    dom(field).on('change', validateNumber);
    dom(field).on('blur', validateNumber);
  });
  
  dom("#process").on('click', function (e){
    e.preventDefault();
    
    locker.lock();
    
    var klass = dom("#class").els[0];
    var stim = dom("#stim").els[0];
    var relic1 = dom("#relic1").els[0];
    var relic2 = dom("#relic2").els[0];
        
    var data = {
      'class': klass.options[klass.selectedIndex].value
    , 'stim': stim.options[stim.selectedIndex].value
    , 'defRating': formatIntNumber(dom("#defRating").els[0].value)
    , 'shieldRating': formatIntNumber(dom("#shieldRating").els[0].value)
    , 'absorbRating': formatIntNumber(dom("#absorbRating").els[0].value)
    , 'armorRating': formatIntNumber(dom("#armorRating").els[0].value)
    , 'relic1': relic1.options[relic1.selectedIndex].value
    , 'relic2': relic2.options[relic2.selectedIndex].value
    };
    
    request.post("/api/optimize")
           .send(data)
           .set('Accept', 'application/json')
           .end(function (err, res){
              locker.unlock();
              if (err || (res.status != 200 && res.status != 304) || res.error){
                //TODO: error handling
              }
              else {
                //TODO: real display of results
                var results = json.parse(res.text).result;
                console.log(results);
                
                var ddiff = results.defRating - data.defRating;
                var dclass = ddiff >= 0 ? 'add' : 'sub';
                ddiff = "" + (ddiff >= 0 ? "+" : "") + ddiff;
                
                var sdiff = results.shieldRating - data.shieldRating;
                var sclass = sdiff >= 0 ? 'add' : 'sub';
                sdiff = "" + (sdiff >= 0 ? "+" : "") + sdiff;
                
                var adiff = results.absorbRating - data.absorbRating;
                var aclass = adiff >= 0 ? 'add' : 'sub';
                adiff = "" + (adiff >= 0 ? "+" : "") + adiff;
                
                dom("#actual_results #defRatingValue").els[0].innerHTML = results.defRating + " (<span class='" + dclass + "'>" + ddiff + "</span>)";
                dom("#actual_results #shieldRatingValue").els[0].innerHTML = results.shieldRating + " (<span class='" + sclass + "'>" + sdiff + "</span>)";
                dom("#actual_results #absorbRatingValue").els[0].innerHTML = results.absorbRating + " (<span class='" + aclass + "'>" + adiff + "</span>)";
                
                dom("#actual_results #defPctNS").els[0].innerHTML = Math.floor(results.defPctNBNS * 10000) / 100 + "%";
                dom("#actual_results #defPctS").els[0].innerHTML = Math.floor(results.defPctNB * 10000) / 100 + "%";
                dom("#actual_results #shieldPct").els[0].innerHTML = Math.floor(results.shieldPctNB * 10000) / 100 + "%";
                dom("#actual_results #absorbPct").els[0].innerHTML = Math.floor(results.absorbPctNB * 10000) / 100 + "%";
                dom("#actual_results #mitigationPct").els[0].innerHTML = Math.floor(results.mitigation * 10000) / 100 + "%";
              }
           });
  });
  
  dom("#clear").on('click', function (e){
    e.preventDefault();
    each(numberFields, function (field){
      dom(field).els[0].value = 0;
    });
    
    dom("#class").els[0].selectedIndex = 0;
    dom("#stim").els[0].selectedIndex = 0;
  });
}

function validateNumber(e){
  if (!isIntNumber(e.target.value) && e.target.value !== ''){
    e.target.value = formatIntNumber(e.target.value);
  }
}
