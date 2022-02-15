"use strict";

const Gpio = require('pigpio').Gpio;

class Servo {

    constructor(name, options) {
        this.name = name;
        this.pos = options.pos;
        this.min = options.min;
        this.max = options.max;
        this.reverse = options.reverse;
        this.gpio = new Gpio(options.pin, {mode: Gpio.OUTPUT});
        this.timer = null;
    }

    scale(number, inMin, inMax, outMin, outMax) {
        return (number - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
    }

    pulseWidth(pos) {
        return Math.round(this.scale(pos, -90, +90, 500, 2500));
    }

    move_to(pos, duration, cb, ease) {
        if (this.min <= pos && pos <= this.max) {
            if (duration > 0) {
                this.executeMoveAsync(pos, duration, ease, cb)
            } else {
                this.executeMoveSync(pos, cb)
            }
        } else if (cb) {
            cb({name: this.name, err: pos});
        }
    }

    move(by, duration, cb) {
        if (by) {
            this.move_to(this.pos + by, duration, cb);
        }
    }

    executeMoveSync(pos, cb) {
        if (this.min <= pos && pos <= this.max) {
            this.pos = pos;
            this.pw = this.pulseWidth(this.pos);
            this.gpio.servoWrite(this.pw);
            if (cb) {
                try {
                    cb({name: this.name, pos: (this.reverse ? -1 : +1) * this.pos});
                } catch {
                    console.warn(`${this.name} move callback failed`);
                }
            }
        }
    }

    executeMoveAsync(pos, duration, ease, cb) {
        let self = this, start = Date.now(), startPos = this.pos

        if (this.timer) {
            // If another move interrupts this one, cancel any timers and confirm the current position
            clearInterval(this.timer);
            this.timer = null;
            self.executeMoveSync(this.pos, cb);
        }

        this.timer = setInterval(function () {
            let t = Date.now() - start;
            if (t < duration) {
                self.executeMoveSync(ease(t, startPos, pos - startPos, duration), cb);
            } else {
                self.executeMoveSync(pos, cb);
                clearInterval(self.timer);
                self.timer = null;
            }
        }, 1);
    }


}

module.exports = Servo
