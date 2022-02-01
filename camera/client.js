"use strict";

const Camera = require('./lib/camera');

const args = require('minimist')(process.argv.slice(2))
const name = args['name'] || 'Camera'
const url = args['url'] || '/camera'

console.log(`Starting camera client against ${url}...`);
const camera = new Camera(name, url);

function halt() {
    console.log('Received halt request');
    camera.stop();
    setTimeout(process.exit, 1000);
}

process.on('SIGTERM', halt);
process.on('SIGINT', halt);
process.on('SIGCONT', halt);
