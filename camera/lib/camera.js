"use strict";

const WebSocket = require('ws');
const Splitter = require('stream-split');
const merge = require('mout/object/merge');
const Tracker = require('./servo_tracker');
const spawn = require('child_process').spawn;

const NALseparator = new Buffer([0, 0, 0, 1]);//NAL break

const maxProbeDelay = 2000;

class Camera {

    constructor(name, url, noVideo, options) {
        this.options = merge({
            width: 1280,
            height: 720,
            fps: 16,
        }, options);

        this.name = name;
        this.url = url;
        this.noVideo = noVideo;
        this.isConnected = false;
        this.streamer = null;

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
        if (!this.noVideo && !this.readStream) {
            this.readStream = this.get_camera_feed();
            this.readStream = this.readStream.pipe(new Splitter(NALseparator));
            this.readStream.on('data', this.broadcast);
        }
    }

    stop_feed() {
        if (!this.noVideo) {
            if (this.streamer) {
                this.streamer.kill(9);
            }
            this.streamer = null;

            spawn('killall', ['raspivid']);
        }
        this.readStream = null;
    }

    get_camera_feed() {
        this.streamer = spawn('raspivid', ['-t', '0', '-o', '-', '-w', this.options.width, '-h', this.options.height, '-fps', this.options.fps, '--profile', 'baseline', '--flush']);
        this.streamer.on('exit', function (code) {
            if (code)
                console.log('raspivid failure', code);
        });
        return this.streamer.stdout;
    }

    broadcast(data) {
        if (this.isConnected && this.ws) {
            if (this.check_lag()) {
                this.reconnect();
            } else {
                this.ws.send(Buffer.concat([NALseparator, data]), {binary: true});
            }
        }
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

            this.probeIndex = 0;
            this.probeTime = Date.now() + 500;
            this.probeAcked = true;
        }
    }

    reconnect() {
        console.log('Reconnecting...');
        if (this.ws) {
            this.stop_feed();
            this.ws.removeAllListeners();
            this.ws.close();
            this.isConnected = false;
            this.ws = null;
        }
        this.connect();
    }

    onerror(error) {
        console.log(`${error}`);
        this.isConnected = false;
        this.stop_feed();
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
            action: 'status', data: {name: 'Pan', pos: -self.tracker.pan.pos}
        }));

        this.ws.send(JSON.stringify({
            action: 'status', data: {name: 'Tilt', pos: self.tracker.tilt.pos}
        }));

        this.ws.on('message', function (data) {
            if (data[0] === '{') {
                let d = JSON.parse(data);
                if (d.action === 'probe') {
                    self.process_probe(d);
                } else if (!d.hasOwnProperty('light')) {
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

    // Mechanism for monitoring that video does not become buffered up and latent
    check_lag() {
        // If probe response lags, signal alarm
        if (Date.now() > this.probeTime + maxProbeDelay) {
            console.log('Detected network lag!!!');
            this.probeTime = Date.now() + 1000;
            return true;
        }

        // Otherwise, has the last probe has been acked and is it time to send another?
        if (this.probeAcked && Date.now() > this.probeTime) {
            // Then update probe state and send it out.
            this.probeAcked = false;
            this.probeIndex++;
            this.probeTime = Date.now();
            this.ws.send(JSON.stringify({
                action: 'probe',
                index: this.probeIndex,
                time: this.probeTime
            }));
        }
        return false;
    }

    process_probe(d) {
        // Does the probe index matches our pending probe index?
        if (d.index === this.probeIndex) {
            // Id so, mark the probe as acked and schedule next one
            this.probeTime = Date.now() + 500;
            this.probeAcked = true;
        }
    }

    stop() {
        this.tracker.stop();
        if (this.ws) {
            this.ws.close();
        }
    }

}

module.exports = Camera;
