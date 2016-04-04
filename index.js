var exec = require('child_process').exec;
var fs = require('fs');
var http = require('http');
var path = require('path');
var index = fs.readFileSync('index.html');

var gpioExport = '/export';
var oldPath = '/sys/devices/virtual/gpio';  // pre 3.18.x kernel
var newPath = '/sys/class/gpio';            // post 3.18.x kernel
var w1Path = '/sys/devices/w1_bus_master1/';
var w1Device = '28-';
var w1Slave = 'w1_slave';
var output = 'out';
var input = 'in';
var low = 0;
var high = 1;
var TEMP_TARGET = 0;
var TEMP_SENSOR = 0.0;
var RELAY_PIN = 15;
var GPIO_PATH = '';
var SENSOR_PATH = '';

// find gpio path
if(fs.existsSync(newPath)) {
  GPIO_PATH = newPath;
}
else {
  GPIO_PATH = oldPath;
}

// setup pins
setupPin(RELAY_PIN, output);
getSensorPath();
setInterval(getTemperature, 5000);
setInterval(monitorTemperature, 5000);

// create HTTP server
var server = http.createServer(function(req, res) {
  if(req.url === '/api/temp') {
    if(req.method === 'GET') {
      res.writeHead(200, {'Content-Type': 'application/json'});
      res.end(JSON.stringify({temp: TEMP_SENSOR}));
    }
    if(req.method === 'POST') {
      var body = [];
      var data = null;
      req.on('data', function(chunk) {
        body.push(chunk);
      });

      req.on('end', function() {
        try {
          data = JSON.parse(Buffer.concat(body).toString());
          TEMP_TARGET = parseInt(data.temp, 10);
          console.log('setting target temperature to: ' + TEMP_TARGET);
        }
        catch(e) {
          console.error('error: could not parse body');
        }

        if(data !== null) {
          res.writeHead(200, 'OK', {'Content-Type': 'text/html'});
          res.end();
        }
        else {
          res.writeHead(400, 'could not parse body', {'Content-Type': 'text/html'});
          res.end();
        }
      });
    }
  }
  else {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(index);
  }
});
server.listen(8080);
console.log("Server is listening");

// gpio related functions
function setupPin(pin, direction) {
  var command = 'echo \"' + pin + '\" > ' + GPIO_PATH + gpioExport;

  exec(command, function(err, stdout, stderr) {
    if(err) {
      if(err.message.indexOf('write error: Device or resource busy') >= 0) {
        console.log('expected okay');
      }
      console.error('error: trying to setup pin ' + pin);
    }

    setDirection(pin, direction);
  });
}

function setDirection(pin, direction) {
  var command = 'echo \"' + direction + '\" > ' + GPIO_PATH + '/gpio' + pin + '/direction';

  exec(command, function(err, stdout, stderr) {
    if(err) {
      console.error('error: trying to set pin ' + pin + ' direction');
    }
  });
}

function setPinValue(pin, value) {
  var command = 'echo \"' + value + '\" > ' + GPIO_PATH + '/gpio' + pin + '/value';

  exec(command, function(err, stdout, stderr) {
    if(err) {
      console.error('error: trying set pin ' + pin + ' : ' + value);
    }
  });
}

function getSensorPath() {
  var command = 'ls ' + w1Path;

  exec(command, function(err, stdout, stderr) {
    if(err) {
      console.error('error: trying to list w1 devices');
    }
    var lines = stdout.split('\n');
    for(var i = 0; i < lines.length; i++) {
      if(lines[i].indexOf(w1Device) >= 0) {
        SENSOR_PATH = w1Path + '/' + lines[i];
        return;
      }
    }
    console.error('error: sensor device was not found');
  });
}

function getTemperature() {
  var command = 'cat ' + SENSOR_PATH + '/' + w1Slave;

  exec(command, function(err, stdout, stderr) {
    if(err) {
      console.error('error: trying get temperature');
    }

    var lines = stdout.split('\n');
    for(var i = 0; i < lines.length; i++) {
      var position = lines[i].indexOf('t=');
      if(position >= 0) {
        var t = lines[i].slice(position + 2, lines[i].length);
        TEMP_SENSOR = parseFloat(t) / 1000;
        return;
      }
    }
    console.error('error: trying to parse temperature');
  });
}

function monitorTemperature() {
  if(TEMP_SENSOR >= TEMP_TARGET) {
    setPinValue(RELAY_PIN, low);
  }
  if(TEMP_SENSOR <= TEMP_TARGET) {
    setPinValue(RELAY_PIN, high);
  }
}
