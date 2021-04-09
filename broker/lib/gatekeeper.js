"use strict";

const fs = require('fs');

const tokensFile = './tokens';

console.log('[' + tokensFile + ']');
console.log(fs.readFileSync(tokensFile).toString());

let forbidden = fs.readFileSync(__dirname + '/../public/forbidden.html').toString();

// Poor-man's access control
const validateToken = function (id, token) {
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

let url, uiPaths, apiPaths;

const gateKeeper = function (req, res, next) {
    if (req.path.match(uiPaths)) {
        console.log(`New visitor to ${req.query.id}; token=${req.query.t}`);
        if (req.query.t && validateToken(req.query.id, req.query.t)) {
            next();
        } else {
            res.status(403).send(forbidden);
        }
    } else if (req.path.match(apiPaths)) {
        if (req.header('token') && validateToken(req.header('id'), req.header('token'))) {
            next();
        } else {
            res.status(403).send({'error': 'Forbidden; invalid camera ID token combination specified'});
        }
    } else {
        next();
    }
}

const Init = function (app, appUrl) {
    url = appUrl;
    uiPaths = new RegExp('\\' + url + '\/$|\\' + url + '\/index\.html\/');
    apiPaths = new RegExp('\\' + url + '\/api\/');

    app.use(gateKeeper);
}

exports.Init = Init