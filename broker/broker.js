"use strict";

var fs = require('fs');
const http = require('http');
const express = require('express');

const WebStreamerServer = require('./lib/relay');

const app = express();
const url = '/camera';

const tokensFile = __dirname + '/tokens';

// Poor-man's access control
let validateToken = function(id, token) {
    if (!fs.existsSync(tokensFile)) {
        return true;
    }
    if (id.length && token.length === 36) {
        let data = fs.readFileSync(tokensFile);
        if (data && data.includes(' ' + id + ' ' + token)) {
            return true;
        }
    }
    return false;
}

let gateKeeper = function (req, res, next) {
    if (req.path === url + '/' || req.path === url + '/index.html') {
        console.log(`New visitor to ${req.query.id}; token=${req.query.t}`);
        if (req.query.t && validateToken(req.query.id, req.query.t)) {
            next();
        } else {
            res.status(403).send(forbidden);
        }
    } else {
        next();
    }
}

let forbidden = fs.readFileSync(__dirname + '/public/forbidden.html').toString();

app.use(gateKeeper);
app.use(url, express.static(__dirname + '/public'));

const server = http.createServer(app);
const relay = new WebStreamerServer(server, {});

console.log(`Starting camera broker...`);
server.listen(5000);

process.on('SIGINT', function () {
    console.log('Caught interrupt signal');
    relay.stop();
    process.exit();
});
