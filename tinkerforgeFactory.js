'use strict';

const Tinkerforge = require('tinkerforge');
const util = require('util');

class TinkerforgeFactory {
    constructor(log, tfcon) {
        this.deviceFactory = {
            '13': {
                'buildObject': Tinkerforge.BrickMaster,
                'readAllData': this.readMasterData
            },
            '297': {
                'buildObject': Tinkerforge.BrickletAirQuality,
                'readAllData': this.readAirQualityData
            }
        };
        
        this.log = log;
        this.tfcon = tfcon;

        log.info('TinkerforgeFactory created');
    }

    registerDevice (deviceIdentifier, uid, connectedUid, position) {
        if (this.deviceFactory[deviceIdentifier] !== undefined) {
            const device = new this.deviceFactory[deviceIdentifier].buildObject(uid, this.tfcon);
            this.deviceFactory[deviceIdentifier].readAllData(uid, device);
        } else {
            this.log.info('unknown Device Identifier');
        }

    }

    readMasterData(uid, device) {
        this.log.info('(' + uid + ') readMasterData :' + util.inspect(device));
    }
    
    readAirQualityData(uid, device) {
        this.log.info('(' + uid + ') readAirQualityData: ' + util.inspect(device));
    }
   
}

module.exports = TinkerforgeFactory;