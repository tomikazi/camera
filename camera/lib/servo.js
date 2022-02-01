"use strict";

const Gpio = require('pigpio').Gpio;

class Servo {

    constructor(name, options) {
        this.name = name;
        this.pos = 0;
        this.min = options.min;
        this.max = options.max;
        this.reverse = options.reverse;
        this.gpio = new Gpio(options.pin, {mode: Gpio.OUTPUT});

        this.move = this.move.bind(this);
        this.move_to = this.move_to.bind(this);

        this.move_to(options.startPos, 0)
    }

    scale(number, inMin, inMax, outMin, outMax) {
        return (number - inMin) * (outMax - outMin) / (inMax - inMin) + outMin;
    }

    pulseWidth(pos) {
        return Math.round(this.scale(pos, -90, +90, 500, 2500));
    }

    move_to(pos, duration, cb) {        // duration is unused at the moment
        if (this.min <= pos && pos <= this.max) {
            this.pos = pos;
            this.pw = this.pulseWidth(this.pos);
            this.gpio.servoWrite(this.pw);
            try {
                cb({name: this.name, pos: (this.reverse ? -1 : +1) * this.pos});
            } catch {
                console.warn(`${this.name} move callback failed`);
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
}

module.exports = Servo