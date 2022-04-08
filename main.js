'use strict';

/*
 * Created with @iobroker/create-adapter v1.16.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');

// Load your modules here, e.g.:
const tf = require('tinkerforge');
const util = require('util');

const brickletFactory = {
    '13': tf.BrickMaster,
    '297': tf.BrickletAirQuality
};

class Tinkerforge extends utils.Adapter {
    /**
     * @param {Partial<ioBroker.AdapterOptions>} [options={}]
     */
    constructor(options) {
        super({
            ...options,
            name: 'tinkerforge',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('objectChange', this.onObjectChange.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        // this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));

        this.tfcon = new tf.IPConnection();
        this.tfcon.on(tf.IPConnection.CALLBACK_CONNECTED, () => {
            this.log.info('Connected to ' + this.config.ip);
            this.enumerateBricklets();
        });

        this.tfcon.on(tf.IPConnection.CALLBACK_DISCONNECTED, () => {
            this.log.info('Disconnected from ' + this.config.ip);
        });
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        // Initialize your adapter here

        // The adapters config (in the instance object everything under the attribute "native") is accessible via
        // this.config:
        this.log.info('config ip: ' + this.config.ip);
        this.log.info('config port: ' + this.config.port);
        this.log.info('config autoReconnect: ' + this.config.autoReconnect);

        /*
        For every state in the system there has to be also an object of type state
        Here a simple template for a boolean variable named "testVariable"
        Because every adapter instance uses its own unique namespace variable names can't collide with other adapters variables
        */
        await this.setObjectAsync('testVariable', {
            type: 'state',
            common: {
                name: 'testVariable',
                type: 'boolean',
                role: 'indicator',
                read: true,
                write: true,
            },
            native: {},
        });

        // in this template all states changes inside the adapters namespace are subscribed
        this.subscribeStates('*');

        // connect to Tinkerforge Master-Brick
        this.connectToBrick(this.config.autoReconnect);

        /*
        setState examples
        you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
        */
        // the variable testVariable is set to true as command (ack=false)
        await this.setStateAsync('testVariable', true);

        // same thing, but the value is flagged "ack"
        // ack should be always set to true if the value is received from or acknowledged from the target system
        await this.setStateAsync('testVariable', { val: true, ack: true });

        // same thing, but the state is deleted after 30s (getState will return null afterwards)
        await this.setStateAsync('testVariable', { val: true, ack: true, expire: 30 });

        // examples for the checkPassword/checkGroup functions
        let result = await this.checkPasswordAsync('admin', 'iobroker');
        this.log.info('check user admin pw ioboker: ' + result);

        result = await this.checkGroupAsync('admin', 'admin');
        this.log.info('check group user admin group admin: ' + result);
    }


    connectToBrick(autoReconnect) {
        this.tfcon.setAutoReconnect(autoReconnect);
        this.tfcon.connect(this.config.ip, this.config.port, (error) => {
            this.log.error('Connecting Host ' + this.config.ip + ':' + this.config.port + ' Error: ' + error);
        }); // Connect to brickd
    }

    enumerateBricklets() {
        this.tfcon.enumerate();

        // Register Enumerate Callback
        this.tfcon.on(tf.IPConnection.CALLBACK_ENUMERATE, (uid, connectedUid, position, hardwareVersion, firmwareVersion, deviceIdentifier, enumerationType) => {
            // Print incoming enumeration
            this.log.info('UID:               '+uid);
            this.log.info('Enumeration Type:  '+enumerationType);

            if(enumerationType === tf.IPConnection.ENUMERATION_TYPE_DISCONNECTED) {
                return;
            }

            this.log.info('Connected UID:     '+connectedUid);
            this.log.info('Position:          '+position);
            this.log.info('Hardware Version:  '+hardwareVersion);
            this.log.info('Firmware Version:  '+firmwareVersion);
            this.log.info('Device Identifier: '+deviceIdentifier);

            if (deviceIdentifier === 297) {
//                const bricklet = new tf.BrickletAirQuality(uid, this.tfcon);
                const bricklet = new brickletFactory[deviceIdentifier](uid, this.tfcon);

                this.log.info('deviceDisplayName: ' + bricklet.deviceDisplayName);

                bricklet.getAllValues((iaqIndex, iaqIndexAccuracy, temperature, humidity, airPressure) => {
                    this.log.info('IAQ Index: ' + iaqIndex);

                    if(iaqIndexAccuracy === tf.BrickletAirQuality.ACCURACY_UNRELIABLE) {
                        this.log.info('IAQ Index Accuracy: Unreliable');
                    }
                    else if(iaqIndexAccuracy === tf.BrickletAirQuality.ACCURACY_LOW) {
                        this.log.info('IAQ Index Accuracy: Low');
                    }
                    else if(iaqIndexAccuracy === tf.BrickletAirQuality.ACCURACY_MEDIUM) {
                        this.log.info('IAQ Index Accuracy: Medium');
                    }
                    else if(iaqIndexAccuracy === tf.BrickletAirQuality.ACCURACY_HIGH) {
                        this.log.info('IAQ Index Accuracy: High');
                    }
    
                    this.log.info('Temperature: ' + temperature/100.0 + ' °C');
                    this.log.info('Humidity: ' + humidity/100.0 + ' %RH');
                    this.log.info('Air Pressure: ' + airPressure/100.0 + ' hPa');
                }, (error) => {
                    this.log.error('Error: ' + error);
                });
            }
        });

        setTimeout(() => {

            Object.entries(this.tfcon.devices).forEach(([key, value]) => {
                this.log.info('key: ' + key);
                this.log.info('value: ' + value);
                this.log.info('value: ' + util.inspect(value));
                this.log.info('readUID: ' + value.readUID());
            });
/*
            this.log.info('Devices: ' + util.inspect(this.tfcon.devices));
            this.log.info('Devices["1"]: ' + this.tfcon.devices['1']);
//            this.log.info('Devices["1"].readUID(): ' + this.tfcon.devices['1'].readUID[0]());
            this.log.info('Devices["1"].deviceDisplayName: ' + this.tfcon.devices['1'].deviceDisplayName);
            this.log.info('Devices["143156"]: ' + this.tfcon.devices['143156']);
//            this.log.info('Devices["143156"].readUID(): ' + this.tfcon.devices['143156'].readUID[0]());
            this.log.info('Devices["143156"].deviceDisplayName: ' + this.tfcon.devices['143156'].deviceDisplayName);
*/
        }, 3000);
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            this.tfcon.disconnect();
            this.log.info('cleaned everything up...');
            callback();
        } catch (e) {
            callback();
        }
    }

    /**
     * Is called if a subscribed object changes
     * @param {string} id
     * @param {ioBroker.Object | null | undefined} obj
     */
    onObjectChange(id, obj) {
        if (obj) {
            // The object was changed
            this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
        } else {
            // The object was deleted
            this.log.info(`object ${id} deleted`);
        }
    }

    /**
     * Is called if a subscribed state changes
     * @param {string} id
     * @param {ioBroker.State | null | undefined} state
     */
    onStateChange(id, state) {
        if (state) {
            // The state was changed
            this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
        } else {
            // The state was deleted
            this.log.info(`state ${id} deleted`);
        }
    }

    // /**
    //  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
    //  * Using this method requires "common.message" property to be set to true in io-package.json
    //  * @param {ioBroker.Message} obj
    //  */
    // onMessage(obj) {
    // 	if (typeof obj === 'object' && obj.message) {
    // 		if (obj.command === 'send') {
    // 			// e.g. send email or pushover or whatever
    // 			this.log.info('send command');

    // 			// Send response in callback if required
    // 			if (obj.callback) this.sendTo(obj.from, obj.command, 'Message received', obj.callback);
    // 		}
    // 	}
    // }

}

// @ts-ignore parent is a valid property on module
if (module.parent) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<ioBroker.AdapterOptions>} [options={}]
     */
    module.exports = (options) => new Tinkerforge(options);
} else {
    // otherwise start the instance directly
    new Tinkerforge();
}