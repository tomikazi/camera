"use strict";

const mqtt = require('mqtt');
const secret = require('./secret')

const points = {
    'forest': {p: -5, t: 0},
    'track 1': {p: -27, t: -4},
    'track 2': {p: -30, t: -5},
    'meadow': {p: -48, t: -7},
    'coast': {p: -43, t: -3},
    'tunnel': {p: -20, t: -2},
    'tree': {p: -22, t: 27},
    'home': {p: 0, t: 0}
};

const pfx = 'train'

class TrainApp {

    constructor(tracker) {
        this.location = 'unknown';
        this.nextTrack = 'unknown';

        this.tracker = tracker;

        this._on_connect = this._on_connect.bind(this);
        this.process_message = this.process_message.bind(this);
        this.track = this.track.bind(this);
        this.time_track_to = this.time_track_to.bind(this);

        // Connect to the MQTT message bus and setup handlers.
        this.client = mqtt.connect('mqtt://' + secret.mqttIp, {
            clientId: 'traintracker',
            username: secret.mqttUser,
            password: secret.mqttPass,
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

    process_command(d) {
        if (d.train === 'view') {
            this.view(d.loc);
        } else if (d.train === 'station') {
            this.set_station(d.loc);
        } else if (d.train === 'track') {
            this.set_track(d.track);
        }
    }

    view(loc) {
        this.move_to(this.process_track(loc), 4, 6);
        if (loc === 'tree') {
            setTimeout(e => this.client.publish('LightBar/power', 'off'), 600);
        } else {
            setTimeout(e => this.client.publish('LightBar/power', 'on'), 2400);
        }
    }

    light(on) {
        this.client.publish('LightBar/power', on ? 'on' : 'off');
    }

    track() {
        if (this.location === 'forest' && this.nextTrack !== 'unknown' && this.running) {
            // Wait a bit and then start tracking view to the next track location; fast
            this.time_track_to(this.nextTrack, 4, 9, 1100);

        } else if (this.running && this.location === 'meadow') {
            // Wait a bit and then start tracking view to the coast location
            this.time_track_to('coast', 5, 5,700);

        } else if (this.running && this.location === 'tunnel') {
            // Wait a bit and then start tracking view to the coast location
            this.time_track_to('forest', 3, 10,10);

        } else if (this.running) {
            // Wait a bit and then start tracking view to the current location
            this.time_track_to(this.location, 4, 10,10);

        } else if (!this.running) {
            this.move_to(this.location);
        }
    }

    time_track_to(loc, pan_delay, tilt_delay, after_delay) {
        this.task = setTimeout(e => {
            if (this.running) {
                this.move_to(loc, pan_delay, tilt_delay);
            }
            this.task = null;
        }, after_delay);
    }

    move_to(loc, pan_delay = 10, tilt_delay = 10) {
        let pos = points[loc];
        if (pos) {
            console.log(`Tracking to ${loc}...`);
            this.tracker.pan_tilt({
                'pan': pos.p * 16,
                'panDelay': pan_delay,
                'tilt': pos.t * 16,
                'tiltDelay': tilt_delay
            });
        }
    }

    process_track(t) {
        return (t === 'track1' ? 'track 1' : (t === 'track2' ? 'track 2' : t));
    }

    set_station(loc) {
        this.client.publish('train/station', this.process_track(loc));
    }

    set_track(loc) {
        this.client.publish('train/track', this.process_track(loc));
    }

}

module.exports = TrainApp

