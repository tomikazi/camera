"use strict";

const fs = require('fs');
const path = require("path");

const recordingsDir = '/var/broker/recordings';

const chunkLength = 1073741824/10;

class StreamRecorder {

    constructor(name) {
        if (!fs.existsSync(recordingsDir) || !fs.lstatSync(recordingsDir).isDirectory()) {
            console.log('Recordings directory not found; recording is disabled');
            return;
        }

        this.cameraDir = path.join(recordingsDir, name);
        if (!fs.existsSync(this.cameraDir)) {
            fs.mkdirSync(this.cameraDir);
        }

        this.start();
    }

    start() {
        if (!this.stream) {
            this.stream = null;
            this.rollover(true);
        }
    }

    stop() {
        this.rollover(false);
    }

    rollover(restart) {
        if (this.stream) {
            this.stream.end();
        }
        let current = path.join(this.cameraDir, 'current.264');
        this.save(current);

        this.length = 0;
        if (restart) {
            this.stream = fs.createWriteStream(current);
            console.log(`Started new recording as ${current}`);
        } else {
            this.stream = null;
            console.log('Stopped recording');
        }
    }

    save(current) {
        if (fs.existsSync(current)) {
            let ts = new Date().toISOString()
                .replace(/[:-]/g, '')
                .replace(/\..+/, '')
                .replace(/T/, '-');
            let save = path.join(this.cameraDir, ts + '.264');
            fs.renameSync(current, save);
            console.log(`Saved current recording as ${save}`);
        }
    }

    record(data) {
        if (this.stream) {
            this.stream.write(data);
            this.length = this.length + data.length;

            if (this.length > chunkLength) {
                this.rollover(true);
            }
        }
    }

}

module.exports = StreamRecorder
