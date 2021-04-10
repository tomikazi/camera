"use strict";

const http = require('http');
const express = require('express');

const WebStreamerServer = require('./lib/relay');
const gatekeeper = require('./lib/gatekeeper')
const api = require('./lib/api')

const url = '/camera';
const app = express();

gatekeeper.Init(app, url);
app.use(url, express.static(__dirname + '/public'));

const server = http.createServer(app);
const relay = new WebStreamerServer(server, {});

api.Init(app, url, relay);

console.log(`Starting camera broker...`);
server.listen(5000);

process.on('SIGINT', function () {
    console.log('Caught interrupt signal');
    relay.stop();
    process.exit();
});
