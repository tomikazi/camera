"use strict";

const fs = require('fs');
const positionsFile = '../positions';

class Positions {

    constructor() {
        this.load();
    }

    set(name, pan, tilt) {
        console.log(`Setting ${name} position to ${pan},${tilt}`);
        this.points[name] = {pan: pan, tilt: tilt, name: name};
        const data = JSON.stringify(Object.fromEntries(this.points));
        fs.writeFileSync(positionsFile, data);
    }

    get(name) {
        return this.points[name];
    }

    load() {
        if (fs.existsSync(positionsFile)) {
            const data = JSON.parse(fs.readFileSync(positionsFile).toString());
            this.points = new Map(Object.entries(data));
        } else {
            this.points = new Map();
        }
    }

}

module.exports = Positions