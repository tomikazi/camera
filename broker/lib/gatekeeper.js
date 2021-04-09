"use strict";

const fs = require('fs');

const tokensFile = './tokens';

console.log('[' + tokensFile + ']');
console.log(fs.readFileSync(tokensFile).toString());

let forbidden = fs.readFileSync(__dirname + '/../public/forbidden.html').toString();

// Poor-man's access control
const validateToken = function (token) {
    if (!fs.existsSync(tokensFile)) {
        return true;
    }
    if (token && token.length === 36) {
        let data = fs.readFileSync(tokensFile);
        if (data) {
            let match = new RegExp('(.*): (.*) ' + token).exec(data.toString());
            if (match) {
                return {user: match[1], camera: match[2]};
            }
        }
    }
    return null;
}

let url, uiPaths, apiPaths;

const gateKeeper = function (req, res, next) {
    if (req.path.match(uiPaths)) {
        console.log(`New visitor to ${req.query.id}; token=${req.query.t}`);
        req.ctx = validateToken(req.query.t);
        if (req.ctx && req.ctx.camera === req.query.id) {
            next();
            return;
        }
        res.status(403).send(forbidden);

    } else if (req.path.match(apiPaths)) {
        console.log(`API request: ${req.path}`);
        req.ctx = validateToken(req.header('token'));
        if (req.ctx) {
            next();
            return;
        }
        res.status(403).send({'error': 'Forbidden; invalid token specified'});
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