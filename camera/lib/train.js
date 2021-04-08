"use strict";

const mqtt = require('mqtt');
const Motor = require('./stepper');

const points = {
    'forest': {p: -5, t: -4},
    'track 1': {p: -32, t: -5},
    'track 2': {p: -40, t: -6},
    'meadow': {p: -52, t: -15},
    'coast': {p: -50, t: -4},
    'tunnel': {p: -20, t: -4},
    'tree': {p: -22, t: 27},
    'home': {p: 0, t: 0}
};

const pfx = 'train'

class TrainTracker {

    constructor(options) {
        this.location = 'unknown';
        this.nextTrack = 'unknown';

        // Create pan and tilt motors
        this.pan = new Motor('Pan', {
            step: 27, dir: 22, enable: 17, limit: -23,
            min: -100 * 16, max: 100 * 16, home_steps: 200 * 16,
        });

        this.tilt = new Motor('Tilt', {
            step: 3, dir: 4, enable: 2, limit: -24,
            min: -40 * 16, max: +40 * 16, home_steps: 60 * 16,
        });

        this.pan.set_home()
        this.tilt.set_home()

        this._on_connect = this._on_connect.bind(this);
        this.process_message = this.process_message.bind(this);
        this.track = this.track.bind(this);
        this.time_track_to = this.time_track_to.bind(this);

        // Connect to the MQTT message bus and setup handlers.
        this.client = mqtt.connect('mqtt://' + options.mqttIp, {
            clientId: 'traintracker',
            username: options.mqttUser,
            password: options.mqttPass,
            clean: true
        });

        this.client.on('connect', this._on_connect);
        this.client.on('message', this.process_message);
    }

    _on_connect() {
        this.connected = true;
        console.log('MQTT connected');
        this.client.subscribe([pfx + '/status', pfx + '/location', pfx + '/view', pfx + '/track/status']);
    }

    process_message(topic, message, p) {
        let msg = message.toString().toLowerCase();
        if (topic === pfx + '/location') {
            if (this.location !== msg) {
                this.location = msg;
                console.log(`Location: ${this.location}`);
                this.track();
            }

        } else if (topic === pfx + '/view') {
            this.view(msg);

        } else if (topic === pfx + '/track/status') {
            this.nextTrack = msg;
            console.log(`Next track: ${this.nextTrack}`);

        } else if (topic === pfx + '/status') {
            this.running = msg === 'on';
            console.log(`Train is ${this.running ? 'running' : 'stopped'}`);
            if (this.task && !this.running) {
                clearTimeout(this.task);
                this.task = null;
            }
            if (this.running) {
                setTimeout(e => this.client.publish('LightBar/power', 'on'), 2000);
            }
        }
    }

    view(loc) {
        this.move_to(loc, 6, 8);
        if (loc === 'tree') {
            setTimeout(e => this.client.publish('LightBar/power', 'off'), 600);
        } else {
            setTimeout(e => this.client.publish('LightBar/power', 'on'), 2400);
        }
    }

    track() {
        if (this.location === 'forest' && this.nextTrack !== 'unknown' && this.running) {
            // Wait a bit and then start tracking view to the next track location; fast
            this.time_track_to(this.nextTrack, 4, 1700);

        } else if (this.running && this.location === 'meadow') {
            // Wait a bit and then start tracking view to the coast location
            this.time_track_to('coast', 5, 700);

        } else if (this.running && this.location === 'tunnel') {
            // Wait a bit and then start tracking view to the coast location
            this.time_track_to('forest', 3, 10);

        } else if (this.running) {
            // Wait a bit and then start tracking view to the current location
            this.time_track_to(this.location, 4, 10);

        } else if (!this.running) {
            this.move_to(this.location);
        }
    }

    time_track_to(loc, pan_delay, after_delay) {
        this.task = setTimeout(e => {
            if (this.running) {
                this.move_to(loc, pan_delay);
            }
            this.task = null;
        }, after_delay);
    }

    move_to(loc, pan_delay = 10, tilt_delay = 10) {
        let pos = points[loc];
        if (pos) {
            console.log(`Tracking to ${loc}...`);
            this.tilt.move_to(pos.t * 16, tilt_delay);
            this.pan.move_to(pos.p * 16, pan_delay);
        }
    }

    stop_tracking() {
        this.pan.off();
        this.tilt.off();
    }

}

module.exports = TrainTracker