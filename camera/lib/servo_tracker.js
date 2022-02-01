"use strict";

const fs = require('fs');

const Servo = require('./servo');

const homePosFile = 'homePos';


class Tracker {

    constructor() {
        // Create pan and tilt servos
        this.pan = new Servo('Pan', {pin: 18, reverse: true, min: -90, max: +90});
        this.tilt = new Servo('Tilt', {pin: 19, reverse: false, min: -30, max: +35});
        this.loadHomePos();
        this.move_to(this.pan.home, this.tilt.home, 0);
    }

    pan_tilt(d, cb) {
        let duration = d.duration || 0;

        if (d.cmd === 'setHome') {
            this.setHomePos();
        } else if (d.pos === 'home') {
            this.move_to(this.pan.home, this.tilt.home, duration, cb);
        } else if (d.pos === 'F') {
            this.move_to(0, 0, duration, cb);
        } else if (d.pos === 'L') {
            this.move_to(this.pan.max, 0, duration, cb);
        } else if (d.pos === 'R') {
            this.move_to(this.pan.min, 0, duration, cb);
        } else if (d.pos === 'U') {
            this.move_to(0, this.tilt.max, duration, cb);
        } else if (d.pos === 'D') {
            this.move_to(0, this.tilt.min, duration, cb);
        } else if (d.pos === 'UL' || d.pos === 'LU') {
            this.move_to(this.pan.max, this.tilt.max, duration, cb);
        } else if (d.pos === 'DL' || d.pos === 'LD') {
            this.move_to(this.pan.max, this.tilt.min, duration, cb);
        } else if (d.pos === 'UR' || d.pos === 'RU') {
            this.move_to(this.pan.min, this.tilt.max, duration, cb);
        } else if (d.pos === 'DR' || d.pos === 'RD') {
            this.move_to(this.pan.min, this.tilt.min, duration, cb);
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
                this.move_to(d.pan, d.tilt, duration, cb);
            }
        }
    }

    move_to(pan, tilt, duration, cb) {
        this.pan.move_to(pan, duration, cb);
        this.tilt.move_to(tilt, duration, cb);
    }

    pos() {
        return {pan: this.pan.pos, tilt: this.tilt.pos};
    }

    setHomePos() {
        console.log(`Setting home position to ${this.pan.home},${this.tilt.home}`);
        this.pan.home = this.pan.pos;
        this.tilt.home = this.tilt.pos;
        fs.writeFileSync(homePosFile, `${this.pan.home},${this.tilt.home}\n`);
    }

    loadHomePos() {
        if (fs.existsSync(homePosFile)) {
            let data = fs.readFileSync(homePosFile);
            if (data) {
                let pos = data.toString().split(',');
                if (pos.length === 2) {
                    this.pan.home = parseInt(pos[0], 10);
                    this.tilt.home = parseInt(pos[1], 10);
                }
            }
        }
    }

    stop() {
    }
}

module.exports = Tracker