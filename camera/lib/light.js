"use strict";

var ws281x = require('rpi-ws281x');
const fs = require('fs');
const hw2 = (fs.existsSync('./hw2'))

class Light {
 
    constructor() {
        this.config = {leds:13, brightness:96, stripType:'grb', gpio:hw2 ? 18 : 21, dma: 10};
        ws281x.configure(this.config);
        this.pixels = new Uint32Array(this.config.leds);
        this.color = 0xffffff;
    }

    off() {
        console.log('Light off');
        this.fill(0x000000);
        ws281x.render(this.pixels);
    }

    on() {
        console.log('Light on');
        this.fill(this.color);
        ws281x.render(this.pixels);
    }

    set(on) {
        if (on) {
            this.on();
        } else {
            this.off();
        }
    }

    set_color(c) {
        this.color = c;
        this.fill(c);
        ws281x.render(this.pixels);
    }

    fill(c) {
        for (let i = 0; i < this.config.leds; i++) {
            this.pixels[i] = c;
        }
    }
 
}

module.exports = Light