"use strict";

const Servo = require('./servo');
const Positions = require('./positions');

function easeLinear (t, b, c, d) {
    return c * t / d + b;
}

function easeInOutQuad (t, b, c, d) {
    if ((t /= d / 2) < 1) return c / 2 * t * t + b;
    return -c / 2 * ((--t) * (t - 2) - 1) + b;
}

function easeInOutCubic (t, b, c, d) {
    if ((t /= d / 2) < 1) return c / 2 * t * t * t + b;
    return c / 2 * ((t -= 2) * t * t + 2) + b;
}

class Tracker {

    constructor() {
        this.positions = new Positions();
        let home = this.positions.get('home') || {pan: 0, tilt: 0};
        this.pan = new Servo('Pan', {pin: 18, reverse: true, min: -90, max: +90, pos: home.pan});
        this.tilt = new Servo('Tilt', {pin: 19, reverse: false, min: -30, max: +15, pos: home.tilt});
        this.move_to_position('home', 1000, null, easeInOutQuad);
    }

    pan_tilt(d, cb) {
        let duration = d.duration || 0;
        let ease = d.ease === 'linear' ? easeLinear : (d.ease === 'cubic' ? easeInOutCubic : easeInOutQuad);

        if (d.cmd === 'setHome') {
            this.set_position('home');
        } else if (d.cmd === 'setPos') {
            this.set_position(d.pos);
        } else if (d.pos === 'F') {
            this.move_to(0, 0, duration, cb, ease);
        } else if (d.pos === 'L') {
            this.move_to(this.pan.max, 0, duration, cb, ease);
        } else if (d.pos === 'R') {
            this.move_to(this.pan.min, 0, duration, cb, ease);
        } else if (d.pos === 'U') {
            this.move_to(0, this.tilt.max, duration, cb, ease);
        } else if (d.pos === 'D') {
            this.move_to(0, this.tilt.min, duration, cb, ease);
        } else if (d.pos === 'UL' || d.pos === 'LU') {
            this.move_to(this.pan.max, this.tilt.max, duration, cb, ease);
        } else if (d.pos === 'DL' || d.pos === 'LD') {
            this.move_to(this.pan.max, this.tilt.min, duration, cb, ease);
        } else if (d.pos === 'UR' || d.pos === 'RU') {
            this.move_to(this.pan.min, this.tilt.max, duration, cb, ease);
        } else if (d.pos === 'DR' || d.pos === 'RD') {
            this.move_to(this.pan.min, this.tilt.min, duration, cb, ease);
        } else if (d.pos) {
            this.move_to_position(d.pos, duration, cb, ease);
        } else if (!d.pos) {
            if (d.relative) {
                let pv = Math.round(d.pan),
                    tv = Math.round(d.tilt);

                if (pv) {
                    this.pan.move(pv, duration, cb);
                }
                if (tv) {
                    this.tilt.move(tv, duration, cb);
                }
            } else {
                this.move_to(d.pan, d.tilt, duration, cb, ease);
            }
        }
    }

    pos() {
        return {pan: this.pan.pos, tilt: this.tilt.pos};
    }

    move_to(pan, tilt, duration, cb, ease) {
        this.pan.move_to(pan, duration, cb, ease);
        this.tilt.move_to(tilt, duration, cb, ease);
    }

    move_to_position(name, duration, cb, ease) {
        let pos = this.positions.get(name);
        if (pos) {
            this.move_to(pos.pan, pos.tilt, duration, cb, ease);
        }
    }

    set_position(name) {
        this.positions.set(name, this.pan.pos, this.tilt.pos);
    }

    stop() {
    }
}

module.exports = Tracker