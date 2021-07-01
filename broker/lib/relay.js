"use strict";

const WebSocketServer = require('ws').Server;
const merge = require('mout/object/merge');

class StreamRelay {

    constructor(server, options) {
        this.options = merge({
            width: 1280,
            height: 720,
        }, options);

        this.cws = new WebSocketServer({ port: 6000 });
        this.wss = new WebSocketServer({ server });

        this.new_camera = this.new_camera.bind(this);
        this.new_client = this.new_client.bind(this);

        this.cameras = new Map(); // name to camera bindings
        this.clients = new Map(); // socket to camera name bindings

        this.cws.on('connection', this.new_camera);
        this.wss.on('connection', this.new_client);
    }

    new_camera(socket) {
        let name = null;
        let camera = {
            name: null,
            socket: socket,
            initMessages: [],
            pos: { pan: 0, tilt: 0 },
            tracking_client: "",
        };
        let self = this;
        console.debug(`Camera connected`);

        socket.on('message', function(data) {
            if (data[0] === '{') {
                let d = JSON.parse(data);
                if (d.action === 'register') {
                    name = d.name;
                    console.log(`Camera ${name} registered`);
                    camera.name = name;
                    self.cameras.set(name, camera);
                    self.update_camera_light(name);
                } else if (d.action === 'status') {
                    if (d.data.name === 'Pan') {
                        camera.pos.pan = d.data.pos;
                    } else if (d.data.name === 'Tilt') {
                        camera.pos.tilt = d.data.pos;
                    }
                }

            } else if (camera.initMessages.length < 2) {
                camera.initMessages.push(data);
            }

            // Relay message to all camera viewers
            self.clients.forEach(function(cn, s, map) {
                if (cn.name === name) {
                    s.send(data);
                }
            });
        });

        socket.on('close', function() {
            console.log(`Camera ${name} disconnected`);
            self.cameras.delete(name);
        });
    }

    new_client(socket) {
        let name = 'unknown';
        let uuid = this.uuidv4();
        let self = this;
        console.debug('Viewer connected');

        socket.on('message', function(data) {
            if (data[0] === '{') {
                let d = JSON.parse(data);
                // Relay command to the target camera
                if (self.cameras.has(name)) {
                    self.cameras.get(name).socket.send(data);
                }
            } else {
                let cmd = ('' + data).split(' ');
                let action = cmd[0];
                console.debug(`Incoming action '${action}'`);
                if (action === 'REQUESTSTREAM') {
                    name = cmd.length > 1 && cmd[1].length ? cmd[1] : 'Camera';
                    console.log(`${uuid} connecting to ${name}`);
                    self.clients.set(socket, { name: name, uuid: uuid });

                    if (self.cameras.has(name)) {
                        console.debug(`Sending ${name} initial ${self.cameras.get(name).initMessages.length} frames`);
                        self.cameras.get(name).initMessages.forEach(function(vid_data) {
                            socket.send(vid_data);
                        });
                    }
                    self.update_camera_light(name);
                } else if (action === 'REQUESTTRACK') {
                    let camera = self.cameras.get(name);
                    if (camera.tracking_client == "") {
                        socket.send(JSON.stringify({ data: { name: 'StartTrack' } }))
                        camera.tracking_client = uuid;
                    }
                } else if (action === 'STOPTRACK') {
                    let camera = self.cameras.get(name);
                    if (camera.tracking_client == uuid) {
                        camera.tracking_client = "";
                    }
                }
            }
        });

        socket.on('close', function() {
            console.log(`Viewer disconnected from ${name}`);
            self.clients.delete(socket);
            self.update_camera_light(name);
            if (self.cameras.has(name)) {
                let camera = self.cameras.get(name);
                if (camera.tracking_client == uuid) {
                    camera.tracking_client = "";
                }
            }
        });

        socket.send(JSON.stringify({
            action: 'init',
            width: this.options.width,
            height: this.options.height,
        }));
    }

    update_camera_light(name) {
        let on = false;
        this.clients.forEach(function(cn, s, map) {
            on = on || cn.name === name;
            if (on) {
                return;
            }
        });
        if (this.cameras.has(name)) {
            console.log(`Camera ${name} light: ${on}`);
            this.cameras.get(name).socket.send(`{"light": ${on}}`);
        }
    }

    stop() {
        console.log('Stopping');
    }

    uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0,
                v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
}

module.exports = StreamRelay;