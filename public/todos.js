var express = require('express');
var app = express();

app.get('/', function (req, res) {
	   // First read existing users.
	  console.log("in side get");
	      var val = req.query.id; 
	      console.log( val );
	      res.end( val);
	   
	});

var router = express.Router();
/*var request = require('request');*/
var querystring = require('querystring');
var https = require('https');

var question1='Testing framework';
var finalres = {};
/* GET /todos listing. */
router.get('/', function(req, res, next) {
	/*var val = req.prams.id;*/
	
  console.log(" I am here todo.js:::" + req.query.id);
  question1 = req.query.id;
  var data = querystring.stringify({
	  email: 'kgbseuro@in.ibm.com',
	  username: 'kgbseuro',
	  trustToken: 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.ImNvZ2Ftcy50cnVzdGVkLkdCU19Lbm93bGVkZ2Ui._eV3A0gOMDmMkPa_qa5BKC99nuAvCSmKXzqZBRjOr3lCRtZHoE_T2Vjk6jjCPal_XItDKbWbdgsgNx-LyKfZdQ'
    });
  console.log("data:::::::"+data);
var options = {
    host: 'cognitiveassistant.in.edst.ibm.com',
    port: 443,
    path: '/apiserver/api/trust',
    method: 'POST',
    headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': data.length
    },
    "rejectUnauthorized": false,
    dataType: "json",
};



/*var str = '{"x" : 9}',
obj = JSON.parse(str);
console.log("obj is"+obj);
console.log("obj value is"+obj.x);*/
var req = https.request(options, function(res) {
	
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
        console.log("body: " + chunk);
        obj = JSON.parse(chunk);
        console.log("api token is:::::::"+obj.apiToken);
        ////////////
        var data1 = querystring.stringify({
        	apiToken : obj.apiToken,  
        	email: 'kgbseuro@in.ibm.com'
        	});
        console.log("api:::::::"+data1);
        var options1 = {
          host: 'cognitiveassistant.in.edst.ibm.com',
          port: 443,
          path: '/apiserver/api/v1/projWcred/list',
          method: 'POST',
          headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Content-Length': data1.length
          },
          "rejectUnauthorized": false,
        };
        console.log("options1:::::::"+options1);
        var reqs = https.request(options1, function(ress) {
          ress.setEncoding('utf8');
          ress.on('data', function (chunk1) {
              console.log("body1 : " + chunk1);
              console.log(typeof chunk1);
              obj1 = JSON.parse(chunk1);
              console.log(obj1.length);
              console.log(typeof obj1);
              /*console.log(" token1 is:::::::"+obj1.apiToken);*/
              console.log(obj1[0].projectId);
              projectId = obj1[0].projectId;
              projectName = obj1[0].projectName;
              var _projNLC = {};
              for (var x = 0; x < obj1.length; x++) {
              if ((obj1[x].projectId)=='1236'){
              _projNLC.projectId=obj1[x].projectId;_projNLC.projectName=obj1[x].projectName;_projNLC.genericProjectId=obj1[x].genericProjectId;
              _projNLC.wCreds=obj1[x].wCreds;
              console.log( "_projNLC::::::"+JSON.stringify(_projNLC));
              }
              }
              console.log( "_projNLC::::::"+JSON.stringify(_projNLC));
              ///////////////////////
              var data2 = querystring.stringify({
            		apiToken : obj.apiToken,  
            		projectId : _projNLC.projectId,
            		question : question1,
            		language : 'en'
            		});

            	var options2 = {
            	  host: 'cognitiveassistant.in.edst.ibm.com',
            	  port: 443,
            	  path: '/apiserver/api/v1/ask/direct/custom',
            	  method: 'POST',
            	  headers: {
            	      'Content-Type': 'application/x-www-form-urlencoded',
            	      'Content-Length': data2.length
            	  },
            	  "rejectUnauthorized": false,


            	};
            	console.log("obj.apiToken::"+obj.apiToken);
            	console.log("question1::"+question1);
            	var reqs1 = https.request(options2, function(ress1) {
            		
            		console.log("successful");
            	  ress1.setEncoding('utf8');
            	  ress1.on('data', function (chunk2) {
            	      
            	      finalres += chunk2;
            	      console.log("finalres::: " + chunk2);
            	      
            	  });
            	  ress1.on('end', function () {
            	      /*console.log(chunk2);*/
            		  
            	    });

            	    ress1.on('error', function (err2) {
            	      console.log(err2);
            	    })
            	  
            	});
            	reqs1.on('error', function (err2) {
            		  console.log(err2);
            		});
            	reqs1.write(data2);
            	reqs1.end();

          });
          ress.on('end', function () {
              /*console.log("result1"+chunk1);*/
            });
            ress.on('error', function (err1) {
              console.log(err1);
            })
          
        });
        reqs.on('error', function (err1) {
        	  console.log("1 :::"+err1);
        	});
        reqs.write(data1);
        
        reqs.end();
        
    });

    
    res.on('end', function () {
        /*console.log(result);*/
      });
      res.on('error', function (err) {
        console.log(err);
      })
    
});
req.on('error', function (err) {
	  console.log(err);
	});

req.write(data);
res.end("done ..." + finalres);
req.end();
/////////////////////
/*var data1 = querystring.stringify({
	apiToken : result.apiToken,  
	email: 'kgbseuro@in.ibm.com',
	projectId : '1236'
	});

var options = {
  host: 'cognitiveassistant.in.edst.ibm.com',
  port: 443,
  path: '/apiserver/api/v1/projWcred/list',
  method: 'POST',
  headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': data1.length
  },
  "rejectUnauthorized": false,
};

var reqs = https.request(options, function(ress) {
	var result1 = '';
  ress.setEncoding('utf8');
  ress.on('data1', function (chunk) {
      console.log("body: " + chunk);
      result1 += chunk;
  });
  ress.on('end', function () {
      console.log(result1);
    });
    ress.on('error', function (err) {
      console.log(err);
    })
  
});
reqs.on('error', function (err) {
	  console.log(err);
	});
reqs.write(data1);
reqs.end();*/
/*  request.post(
		    'https://cognitiveassistant.in.edst.ibm.com:443/apiserver/api/trust',
		    { json: {
		    	email : 'kgbseuro@in.ibm.com',username : 'kgbseuro', 
		    	trustToken : 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.ImNvZ2Ftcy50cnVzdGVkLkdCU19Lbm93bGVkZ2Ui._eV3A0gOMDmMkPa_qa5BKC99nuAvCSmKXzqZBRjOr3lCRtZHoE_T2Vjk6jjCPal_XItDKbWbdgsgNx-LyKfZdQ'
		    	} },
		    function (error, response, body) {
		    	console.log(error);
		    	console.log(response);
		    	console.log(body);
		        if (!error && response.statusCode == 200) {
		            console.log("gotcha");
		        }
		        else{
		        	console.log("sorry");
		        }
		    }
		);*/
/* jQuery.ajax({
    url: "https://cognitiveassistant.in.edst.ibm.com:443/apiserver/api/trust"  ,
    type: "POST",
    data: {
email : 'kgbseuro@in.ibm.com',username : 'kgbseuro', 
trustToken : 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzUxMiJ9.ImNvZ2Ftcy50cnVzdGVkLkdCU19Lbm93bGVkZ2Ui._eV3A0gOMDmMkPa_qa5BKC99nuAvCSmKXzqZBRjOr3lCRtZHoE_T2Vjk6jjCPal_XItDKbWbdgsgNx-LyKfZdQ'
},
    dataType: "json",
    contentType: "application/json; charset=utf-8",
    success: function (response) {
        console.log("am here :success");
    },
    error: function (response) {
        console.log("failed");
    }
});*/
  
  
  
});
module.exports = router;

