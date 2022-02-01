"use strict";

const Servo = require('.//servo');

class Tracker {

    constructor() {
        // Create pan and tilt servos
        this.pan = new Servo('Pan', {
            startPos: 0, pin: 18, reverse: true, min: -90, max: +90,
        });
        this.tilt = new Servo('Tilt', {
            startPos: 0, pin: 19, reverse: false, min: -30, max: +35,
        });
    }

    pan_tilt(d, cb) {
        if (d.cmd === 'home') {
            this.pan.move_to(0, 0, cb)
            this.tilt.move_to(0, 0, cb)

        } else if (!d.cmd) {
            if (d.relative) {
                var pv = Math.round(d.pan),
                    tv = Math.round(d.tilt);

                if (pv) {
                    this.pan.move(pv, d.slow ? 6 : 1, cb);
                }
                if (tv) {
                    this.tilt.move(tv, d.slow ? 6 : 1, cb);
                }
            } else {
                this.pan.move_to(d.pan, d.panDelay ? d.panDelay : 1, cb);
                this.tilt.move_to(d.tilt, d.tiltDelay ? d.tiltDelay : 1, cb);
            }
        }
    }

    pos() {
        return {pan: this.pan.pos, tilt: this.tilt.pos};
    }

    stop() {
    }
}

module.exports = Tracker