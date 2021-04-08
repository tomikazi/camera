"use strict";

const WebSocket = require('ws');
const Splitter = require('stream-split');
const merge = require('mout/object/merge');
const Tracker = require('./tracker');
const util = require('util');
const spawn = require('child_process').spawn;

const NALseparator = new Buffer([0, 0, 0, 1]);//NAL break

class Camera {

    constructor(name, url, options) {
        this.options = merge({
            width: 1280,
            height: 720,
            fps: 16,
        }, options);

        this.name = name;
        this.url = url;
        this.isConnected = false;
        this.streamer = null;

        this.leds = this.create_light();
        this.light(true);

        this.tracker = new Tracker();

        this.connect = this.connect.bind(this);
        this.onerror = this.onerror.bind(this);
        this.register = this.register.bind(this);
        this.broadcast = this.broadcast.bind(this);
        this.broadcast_status = this.broadcast_status.bind(this);
        this.on_motion = this.on_motion.bind(this);

        setInterval(this.connect, 5000);
        this.connect();
    }

    start_feed() {
        if (!this.readStream) {
            this.readStream = this.get_camera_feed();
            this.readStream = this.readStream.pipe(new Splitter(NALseparator));
            this.readStream.on('data', this.broadcast);
        }
    }

    stop_feed() {
        if (this.streamer) {
            this.streamer.kill(9);
        }
        this.streamer = null;

        spawn('killall', ['raspivid']);
        this.readStream = null;
    }

    get_camera_feed() {
        this.streamer = spawn('raspivid', ['-t', '0', '-o', '-', '-w', this.options.width, '-h', this.options.height, '-fps', this.options.fps, '-pf', 'baseline']);
        this.streamer.on('exit', function (code) {
            if (code)
                console.log('raspivid failure', code);
        });
        return this.streamer.stdout;
    }

    create_light() {
        let leds = spawn('node', ['leds.js'], {stdio: ['pipe', 'ignore', 'ignore']});
        leds.on('exit', function (code) {
            if (code)
                console.log('leds failure', code);
        });
        return leds.stdin;
    }


    broadcast(data) {
        this.ws.send(Buffer.concat([NALseparator, data]), {binary: true});
    }

    broadcast_status(data) {
        this.ws.send(JSON.stringify({
            action: 'status',
            data: data
        }));
    }

    connect() {
        if (!this.isConnected) {
            console.log(`Attempting reconnection to broker: ${this.url}`);
            this.ws = new WebSocket(this.url);
            this.ws.on('error', this.onerror)
            this.ws.on('open', this.register);
        }
    }

    onerror(error) {
        console.log(`${error}`);
        this.isConnected = false;
        this.stop_feed();
        this.light(false);
    }

    register() {
        let self = this;
        console.log('Connected to broker');

        this.isConnected = true;
        this.ws.on('ping', this.heartbeat);
        this.ws.on('close', function () {
            self.onerror('Disconnected from broker');
        });

        this.ws.send(JSON.stringify({
            action: 'register', name: this.name
        }));

        this.ws.send(JSON.stringify({
            action: 'status', data: {name: 'Pan', pos: self.tracker.pos().pan}
        }));

        this.ws.send(JSON.stringify({
            action: 'status', data: {name: 'Tilt', pos: self.tracker.pos().tilt}
        }));

        this.ws.on('message', function (data) {
            if (data[0] === '{') {
                let d = JSON.parse(data);
                if (d.hasOwnProperty('light')) {
                    self.light(d.light);
                } else {
                    self.process_command(d);
                }
            }
        });

        this.start_feed();
    }

    heartbeat() {
        this.isConnected = true;
    }

    process_command(d) {
        this.tracker.pan_tilt(d, this.on_motion);
    }

    on_motion(d) {
        this.broadcast_status(d);
    }

    light(on) {
        try {
            this.leds.write(on ? 'on\r\n' : 'off\r\n');
        } catch (error) {
            console.log('LEDS error');
        }
    }

    stop() {
        this.light(false);
        this.tracker.stop();
        if (this.ws) {
            this.ws.close();
        }
    }

}

module.exports = Camera;
