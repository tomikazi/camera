"use strict";

const Light = require('./lib/light');
var readline = require('readline');

const light = new Light();

var rl = readline.createInterface({
    input: process.stdin,
    terminal: false
})

rl.on('line', function(line) {
   light.set(line === 'on');
});

function halt() {
    console.log('Received halt request');
    light.set(false);
}

process.on('SIGTERM', halt);
process.on('SIGINT', halt);
process.on('SIGCONT', halt);
