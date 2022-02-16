"use strict";

const fs = require('fs');
const positionsFile = '../positions';

class Positions {

    constructor() {
        this.load();
    }

    set(name, pan, tilt, label) {
        console.log(`Setting ${name} position to ${pan},${tilt}`);
        this.points[name] = {pan: pan, tilt: tilt, name: name, label: label || name};
        fs.writeFileSync(positionsFile, JSON.stringify(this.points));
    }

    get(name) {
        return this.points[name];
    }

    load() {
        if (fs.existsSync(positionsFile)) {
            this.points = JSON.parse(fs.readFileSync(positionsFile).toString());
        } else {
            this.points = {};
        }
    }

}

module.exports = Positions