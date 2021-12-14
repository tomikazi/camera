"use strict";

const Gpio = require('pigpio').Gpio;
const A4988 = require('a4988');

class Motor {

    constructor(name, options) {
        this.name = name;
        this.min = options.min;
        this.max = options.max;
        this.mid = (options.max - options.min) / 2;
        this.home_steps = options.home_steps;
        this.home_backoff = options.home_backoff;
        this.center_offset = options.center_offset;
        this.reverse = options.reverse;
        this.homing = false;
        this.searching = false;
        this.moving = false;
        this.limit = null;
        this.home_timer = null;

        this.ctl = new A4988({
            step: options.step,
            dir: options.dir,
            enable: options.enable
        });

        if (options.limit > 0) {
            console.log(`${this.name} setup limit on ${options.limit}`);
            this.limit = new Gpio(options.limit, {
                mode: Gpio.INPUT,
                pullUpDown: Gpio.PUD_UP,
                alert: true
            });

            this.limit.glitchFilter(10000);

            this.limit.on('alert', (level, tick) => {
                console.log(`${this.name} limit: ${level}`);
                this.check_limit();
            });
        }

        this.ctl.enabled = !this.limit;
        this.ctl.step_size = 'SIXTEENTH';

        this.move = this.move.bind(this);
        this.move_to = this.move_to.bind(this);
        this.set_home = this.set_home.bind(this);
        this.start_home = this.start_home.bind(this);
        this._finish_home = this._finish_home.bind(this);

        if (!this.limit) {
            this.set_home();
        }
    }

    move_to(pos, delay, cb) {
        // console.log(`${this.name} moving to ${pos}`);
        let delta = pos - this.pos * (this.reverse ? -1 : +1);
        return this.move(delta, delay, cb);
    }

    move(by, delay, cb) {
        if (by && !this.moving && this.ctl.enabled) {
            let bySteps = by * (this.reverse ? -1 : +1)
            let nextPos = this.pos + bySteps;
            if ((nextPos < this.min || nextPos > this.max) && !this.homing) {
                if (cb) {
                    cb({name: this.name, err: nextPos});
                } else {
                    console.error(`${this.name} cannot move past limit to ${nextPos}`)
                }
            } else {
                // console.log(`${this.name} moving by ${bySteps}`);
                if (this.moving) {
                    this.ctl.stop();
                }

                if (delay) {
                    this.ctl.delay = delay;
                }

                this.moving = true;
                this.ctl.direction = bySteps < 0;
                return this.ctl.turn(Math.abs(bySteps))
                    .then(steps => {
                        this.pos = this.pos + (steps * (bySteps < 0 ? -1 : +1));
                        if (cb) {
                            try {
                                cb({name: this.name, pos: this.pos});
                            } catch {
                                console.warn(`${this.name} move callback failed`);
                            }
                        }
                        this.moving = false;
                    });
            }
        }
        return Promise.resolve();
    }

    set_home() {
        console.log(`${this.name} homed`);
        this.ctl.delay = 1;
        this.pos = 0;
        this.homing = false;
        this.searching = false;
        this.moving = false;
    }

    off() {
        console.log(`${this.name} disabled`);
        this.ctl.enabled = false;
    }

    on() {
        console.log(`${this.name} enabled`);
        this.ctl.enabled = true;
    }

    check_limit() {
        if (this.homing && this.searching && !this.limit.digitalRead()) {
            console.log(`${this.name} stopping`);
            this.searching = false;
            this.ctl.stop();
            if (this.home_timer) {
                clearInterval(this.home_timer);
                this.home_timer = null;
            }
        }
    }

    _finish_home(steps) {
        console.log(`${this.name} homed in ${steps} steps...`);
        if (!steps || steps < this.home_steps) {
            console.log(`${this.name} centering by ${this.center_offset} steps`);
            this.ctl.delay = 1;
            this.move(this.center_offset)
                    .then(steps => {
                        this.set_home();
                        console.log(`${this.name} moved to center`);
                        if (this.home_cb) {
                            this.home_cb();
                        }
                    });
        } else {
            console.error(`Unable to reach ${this.name} limit switch`);
        }
    }

    start_home(cb) {
        this.homing = true;
        this.searching = true;
        this.ctl.enabled = true;
        this.ctl.delay = 2;
        this.home_cb = cb;

        if (!this.limit.digitalRead()) {
            console.log(`${this.name} at limit... backing off by ${this.home_backoff} steps...`);
            this.move(this.home_backoff).then(steps => {
                this.start_home(cb);
            });
        } else {
            console.log(`${this.name} starting to home (max ${this.home_steps} steps)`);
            this.home_timer = setInterval(this.check_limit, 10);
            this.move(this.home_steps)
                .then(steps => this._finish_home(steps));
        }
    }

}

module.exports = Motor
