"use strict";

const bodyParser = require('body-parser');

let cameras = null, clients = null, url;

const getCameras = function (req, res) {
    console.debug(`Getting list of currently registered cameras`);
    let d = [];
    cameras.forEach((_, name) => d.push(name));
    res.status(200).send(JSON.stringify(d));
}

const getViewers = function (req, res) {
    console.debug(`Getting list of current viewers`);
    let d = [];
    clients.forEach((name, socket) => d.push({camera: name, address: socket._socket.remoteAddress}));
    res.status(200).send(JSON.stringify(d));
}

const checkPermissions = function(id, req, res) {
    if (req.params.camera === id) {
        return true;
    }
    res.status(403).send({'error': 'Forbidden; token does not apply to the specified camera'});
    return false;
}

const getCamera = function (req, res) {
    if (checkPermissions(req.params.camera, req, res)) {
        console.debug(`Getting ${req.params.camera} information`);
        let camera = cameras.get(req.params.camera);
        let v = [];
        clients.forEach((name, socket) => { if (name === camera.name) { v.push(socket._socket.remoteAddress)}});
        res.status(200).send({
            camera: camera.name,
            viewers: v,
            pos: camera.pos,
            recording: camera.recorder.stream != null
        });
    }
}

const getCameraSnapshot = function (req, res) {
    if (checkPermissions(req.params.camera, req, res)) {
        console.debug(`Taking ${req.params.camera} snapshot`);
        let camera = cameras.get(req.params.camera);
        res.status(200).contentType('image/png').send(camera.recorder.snapshot());
    }
}

const getCameraRecordings = function (req, res) {
    if (checkPermissions(req.params.camera, req, res)) {
        console.debug(`Getting ${req.params.camera} recordings`);
        let camera = cameras.get(req.params.camera);
        let recordings = camera.recorder.getRecordings();
        res.status(200).send(JSON.stringify({'recordings': recordings}));
    }
}

const getCameraRecording = function (req, res) {
    if (checkPermissions(req.params.camera, req, res)) {
        console.debug(`Getting ${req.params.camera} recording ${req.params.recording}`);
        let camera = cameras.get(req.params.camera);
        res.download(camera.recorder.getRecordingPath(req.params.recording));
    }
}

const controlCamera = function (req, res) {
    if (checkPermissions(req.params.camera, req, res)) {
        console.debug(`Controlling ${req.params.camera}: ${req.body.cmd}`);
        let camera = cameras.get(req.params.camera);
        let cmd = req.body.cmd;

        if (cmd === 'moveTo') {
            let pos = req.body.pos,
                duration = req.body.duration || 0,
                ease = req.body.ease || 'quad';
            if (pos) {
                camera.socket.send(`{"pos": "${pos}", "duration": ${duration}, "ease": "${ease}"}`);
            } else if (!pos) {
                camera.socket.send(`{"pan": ${req.body.pan}, "tilt": ${req.body.tilt}, "duration": ${duration}, "relative": false, "ease": "${ease}"}`);
            }
        } else if (cmd === 'moveBy') {
            camera.socket.send(`{"pan": ${req.body.pan}, "tilt": ${req.body.tilt}, "relative": true}`);
        } else if (cmd === 'setHome') {
            camera.socket.send(`{"cmd": "setPos", "pos": "home"}`);
        } else if (cmd === 'setPos' && req.body.pos) {
            let label = req.body.label || req.body.pos;
            camera.socket.send(`{"cmd": "setPos", "pos": "${req.body.pos}", label: "${label}"}`);
        } else if (cmd === 'startRecording') {
            camera.recorder.start();
        } else if (cmd === 'stopRecording') {
            camera.recorder.stop();
        }

        res.status(200).send();
    }
}

const disconnectCameraViewer = function (req, res) {
    if (checkPermissions(req.params.camera, req, res)) {
        console.debug(`Disconnecting ${req.params.viewer} from ${req.params.camera}`);
        let camera = cameras.get(req.params.camera);
        clients.forEach((name, socket) => {
            if (name === camera.name && socket._socket.remoteAddress.endsWith(':' + req.params.viewer)) {
                socket.close();
            }
        });
        res.status(200).send();
    }
}

const Init = function(app, appUrl, relay) {
    url = appUrl;
    cameras = relay.cameras;
    clients = relay.clients;

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    app.get(url + '/api/cameras', getCameras);
    app.get(url + '/api/viewers', getViewers);
    app.get(url + '/api/:camera', getCamera);
    app.get(url + '/api/:camera/snapshot', getCameraSnapshot);
    app.get(url + '/api/:camera/recordings', getCameraRecordings);
    app.get(url + '/api/:camera/recordings/:recording', getCameraRecording);
    app.put(url + '/api/:camera', controlCamera);
    app.delete(url + '/api/:camera/:viewer', disconnectCameraViewer);
}

exports.Init = Init