"use strict";

const fs = require('fs');
const path = require("path");

const recordingsDir = '/var/broker/recordings';

// Record up-to 40 100MiB chunks, so ~4GiB.
const maxChunks = 40;
const chunkLength = 1073741824 / 10;

class StreamRecorder {

    constructor(name) {
        this.stream = null;
        this.spsNAL = null;
        this.ppsNAL = null;
        this.syncNAL = null;

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
            this.stream = null;
        }
        let current = path.join(this.cameraDir, 'current.264');
        this.save(current);

        this.length = 0;
        if (restart) {
            this.stream = fs.createWriteStream(current);
            if (this.spsNAL) {
                this.record(this.spsNAL);
            }
            if (this.ppsNAL) {
                this.record(this.ppsNAL);
            }
            if (this.syncNAL) {
                this.record(this.syncNAL);
            }
            console.log(`Started new recording as ${current}`);
            this.prune();
        } else {
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

    prune() {
        let files = fs.readdirSync(this.cameraDir);
        files.sort((a, b) => a > b ? -1 : (a < b ? 1 : 0));
        // console.log(`recordings=${files}`);
        for (let i = maxChunks; i < files.length; i++) {
            console.log(`Removing ${files[i]}`);
            fs.unlinkSync(path.join(this.cameraDir, files[i]));
        }
    }

    record(data) {
        let readyToRoll = false;
        if (data[0] === 0 && data[1] === 0) {
            let nalIndex = 0;
            if (data[2] === 1) {
                nalIndex = 3;
            } else if (data[2] === 0 && data[3] === 1) {
                nalIndex = 4;
            }

            if (nalIndex) {
                if ((data[nalIndex] & 0x1F) === 0x07) {
                    // console.log("SPS NAL");
                    this.spsNAL = data;
                } else if ((data[nalIndex] & 0x1F) === 0x08) {
                    // console.log("PPS NAL");
                    this.ppsNAL = data;
                } else if ((data[nalIndex] & 0x1F) === 0x05) {
                    // console.log("Sync NAL");
                    this.syncNAL = data;
                    readyToRoll = true;
                }
            }
        }

        if (this.stream) {
            this.stream.write(data);
            this.length = this.length + data.length;

            if (this.length > chunkLength && readyToRoll) {
                this.rollover(true);
            }
        }
    }
}

module.exports = StreamRecorder
