"use strict";

const fs = require('fs');
const hw2 = (fs.existsSync('./hw2'))

const Motor = require('.//stepper');

class Tracker {

    constructor() {
        console.log('Using ' + (hw2 ? 'HW2' : 'HW1') + ' GPIO mapping.');

        // Create pan and tilt motors
        this.pan = new Motor('Pan', {
            step: 27, dir: 22, enable: 17, limit: hw2 ? 14 : 15, reverse: true,
            min: -100 * 16, max: 100 * 16, home_steps: 220 * 16,
            home_backoff: -16 * 16, center_offset: -130 * 16
        });

        this.tilt = new Motor('Tilt', {
            step: 3, dir: 4, enable: 2, limit: hw2 ? 15 : 18, reverse: false,
            min: -28 * 16, max: +28 * 16, home_steps: 56 * 16,
            home_backoff: -16 * 16, center_offset: -28 * 16
        });

        this.autohome();
    }

    autohome(cb) {
        let self = this;
        let afterHome = cb;
        self.ready = false;
        this.tilt.start_home(function() {
            if (afterHome) {
                afterHome({name: self.tilt.name, pos: self.tilt.pos});
            }
            self.pan.start_home(function() {
                if (afterHome) {
                    afterHome({name: self.pan.name, pos: self.pan.pos});
                }
                self.ready = true;
            });
        });
    }

    pan_tilt(d, cb) {
        let self = this;
        if (!this.ready) {
            return;
        }
        if (d.cmd === 'home') {
            setTimeout(function() { self.autohome(cb); }, 1500);
            this.pan.move_to(0, 1);

        } else if (d.cmd === 'enable') {
            this.enable(d.on);

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
                this.pan.move_to(d.pan, 1, cb);
                this.tilt.move_to(d.tilt, 1, cb);
            }
        }
    }

    pos() {
        return {pan: this.pan.pos, tilt: this.tilt.pos};
    }

    enable(on) {
        if (on) {
            this.pan.on();
            this.tilt.on();
        } else {
            this.pan.off();
            this.tilt.off();
        }
    }

    stop() {
        let self = this;
        this.pan.move_to(0, 1, function() { self.enable(false) });
    }

}

module.exports = Tracker