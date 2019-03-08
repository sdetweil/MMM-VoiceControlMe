/**
 * @file node_helper.js
 *
/**
 * @originalAuthor fewieden MMM-VoiceControlMe
 * @inspirationalModules Hello-Lucy MMM-ModuleToggle MMM-Hotword MMM-AssistantMk2 MMM-MotionDetector
 * @extended  by TheStigh, Mykle1 and Sdetweil
 *
 * @license MIT
 *
 * @see  https://github.com/Mykle1/MMM-VoiceControlMe

/**
 * @external pocketsphinx-continuous
 * @see https://github.com/fewieden/pocketsphinx-continuous-node
 */
const Psc = require('pocketsphinx-continuous');

/**
 * @external fs
 * @see https://nodejs.org/api/fs.html
 */
const fs = require('fs');

/**
 * @external child_process		@see https://nodejs.org/api/child_process.html
 */
const exec = require('child_process').exec;

/**
 * @external lmtool				@see https://www.npmjs.com/package/lmtool
 */
const lmtool = require('lmtool');

/**
 * @module Bytes 
 * @description Pure Magic
 */
const bytes = require('./Bytes.js');

/**
 * @external node_helper 		@see https://github.com/MichMich/MagicMirror/blob/master/modules/node_modules/node_helper/index.js
 */
const NodeHelper = require('node_helper');

/**
 * @module node_helper
 * @description Backend for the module to query data from the API providers.
 *
 * @requires external:pocketsphinx-continuous
 * @requires external:fs
 * @requires external:child_process
 * @requires external:lmtool
 * @requires Bytes
 * @requires external:node_helper
 */
module.exports = NodeHelper.create({

    /** @member {boolean} listening - Flag to indicate listen state. */
    listening: false,

    /** @member {(boolean|string)} mode - Contains active module mode. */
    mode: false, // was false,

    /** @member {string[]} words - List of all words that are registered by the modules. */
    words: [],
	
    /**
     * @function start
     * @description Logs a start message to the console.
     * @override
     */
    start() {
        console.log(`Starting module helper: ${this.name}`);
    },

    /**
     * @function socketNotificationReceived
     * @description Receives socket notifications from the module.
     * @override
     *
     * @param {string} notification - Notification name
     * @param {*} payload - Detailed payload of the notification.
     */
    socketNotificationReceived(notification, payload) {
        if (notification === 'START') {
            /** @member {Object} config - Module config. */
            this.config = payload.config;
			
			/** @member {number} time - Time to listen after keyword. */
            this.time = this.config.timeout * 1000;
            /** @member {Object} modules - List of modules with their modes and commands. */
            this.modules = payload.modules;

            this.fillWords();
            this.checkFiles();

////////////////////////////////////////////////////////////////////////
//////////////// 		Done by @sdetweil to			////////////////
//////////////// 	release mic from PocketSphinx		////////////////
//////////////// 	and create timer and checking		////////////////
////////////////////////////////////////////////////////////////////////
        } else if(notification === 'SUSPEND_LISTENING'){
          if(this.ps.isListening())
              this.ps.stop()
        } else if(notification === 'RESUME_LISTENING'){
          if(!this.ps.isListening())
              this.ps.start()
			
////////////////////////////////// EOC /////////////////////////////////
	
            // notification relayed from another module (alarm clock)

		} else if(notification === 'ACTIVATE_MONITOR') {
			if(this.config.standByMethod === 'DPMS')		/////////// Turns on laptop display and desktop PC with DVI @ Mykle1
				exec('xset dpms force on', null); 
			if(this.config.standByMethod === 'PI')  		/////////// Turns off HDMI on Pi
				exec('/opt/vc/bin/tvservice -p && sudo chvt 6 && sudo chvt 7', null);
				this.hdmi = true;

        } else if(notification === 'DEACTIVATE_MONITOR') {
			if(this.config.standByMethod === 'DPMS')  		/////////// Turns on laptop display and desktop PC with DVI @ Mykle1
				exec('xset dpms force off', null);
			if(this.config.standByMethod === 'PI')  		/////////// Turns off HDMI on Pi
				exec('/opt/vc/bin/tvservice -o', null);
				this.hdmi = false;		
        }
    },

    /**
     * @function fillwords
     * @description Sets {@link node_helper.words} with all needed words for the registered
     * commands by the modules. This list has unique items and is sorted by alphabet.
     */
    fillWords() {
        // create array
        let words = this.config.keyword.split(' ');
        const temp = bytes.q.split(' ');
        words = words.concat(temp);
        for (let i = 0; i < this.modules.length; i += 1) {
            const mode = this.modules[i].mode.split(' ');
            words = words.concat(mode);
            for (let n = 0; n < this.modules[i].sentences.length; n += 1) {
                const sentences = this.modules[i].sentences[n].split(' ');
                words = words.concat(sentences);
            }
        }

        // filter duplicates
        words = words.filter((item, index, data) => data.indexOf(item) === index);

        // sort array
        words.sort();

        this.words = words;
    },

    /**
     * @function checkFiles
     * @description Checks if words.json exists or has different entries as this.word.
     */
    checkFiles() {
        console.log(`${this.name}: Checking files.`);
        fs.stat('modules/MMM-VoiceControlMe/words.json', (error, stats) => {
            if (!error && stats.isFile()) {
                fs.readFile('modules/MMM-VoiceControlMe/words.json', 'utf8', (err, data) => {
                    if (!err) {
                        const words = JSON.parse(data).words;
                        if (this.arraysEqual(this.words, words)) {
                            this.startPocketsphinx();
                            return;
                        }
                    }
                    this.generateDicLM();
                });
            } else {
                this.generateDicLM();
            }
        });
    },

    /**
     * @function arraysEqual
     * @description Compares two arrays.
     *
     * @param {string[]} a - First array
     * @param {string[]} b - Second array
     * @returns {boolean} Are the arrays equal or not.
     */
    arraysEqual(a, b) {
        if (!(a instanceof Array) || !(b instanceof Array)) {
            return false;
        }

        if (a.length !== b.length) {
            return false;
        }

        for (let i = 0; i < a.length; i += 1) {
            if (a[i] !== b[i]) {
                return false;
            }
        }

        return true;
    },

    /**
     * @function generateDicLM
     * @description Generates new Dictionairy and Language Model.
     */
    generateDicLM() {
        console.log(`${this.name}: Generating dictionairy and language model.`);

        fs.writeFile('modules/MMM-VoiceControlMe/words.json', JSON.stringify({ words: this.words }), (err) => {
            if (err) {
                console.log(`${this.name}: Couldn't save words.json!`);
            } else {
                console.log(`${this.name}: Saved words.json successfully.`);
            }
        });

        lmtool(this.words, (err, filename) => {
            if (err) {
                this.sendSocketNotification('ERROR', 'Couldn\'t create necessary files!');
            } else {
                fs.renameSync(`${filename}.dic`, 'modules/MMM-VoiceControlMe/MMM-VoiceControlMe.dic');
                fs.renameSync(`${filename}.lm`, 'modules/MMM-VoiceControlMe/MMM-VoiceControlMe.lm');

                this.startPocketsphinx();

                fs.unlink(`${filename}.log_pronounce`, this.noOp);
                fs.unlink(`${filename}.sent`, this.noOp);
                fs.unlink(`${filename}.vocab`, this.noOp);
                fs.unlink(`TAR${filename}.tgz`, this.noOp);
            }
        });
    },

    /**
     * @function noOp
     * @description Performs no operation.
     */
    noOp() {},

    /**
     * @function startPocketsphinx
     * @description Starts Pocketsphinx binary.
     */
    startPocketsphinx() {
        console.log(`${this.name}: Starting pocketsphinx.`);

        this.ps = new Psc({
            setId: this.name,
            verbose: true,
            microphone: this.config.microphone
        });

        this.ps.on('data', this.handleData.bind(this));
        if (this.config.debug) {
            this.ps.on('debug', this.logDebug.bind(this));
        }

		

        this.ps.on('error', this.logError.bind(this));

////////////////////////////////////////////////////////////////////////
//////////////// 		Done by @sdetweil to			////////////////
//////////////// 	release mic from PocketSphinx		////////////////
//////////////// 	and create timer and checking		////////////////
////////////////////////////////////////////////////////////////////////
        if(typeof this.ps.start != 'function')
          console.log("downlevel pocketsphinx-continuous node module... error<===============================");

////////////////////////////////// EOC /////////////////////////////////

        this.sendSocketNotification('READY');
    },

    /**
     * @function handleData
     * @description Helper method to handle recognized data.
     *
     * @param {string} data - Recognized data
     */
    handleData(data) {
        if (typeof data === 'string') {
            if (this.config.debug) {
                console.log(`${this.name} has recognized: ${data}`);
                this.sendSocketNotification('DEBUG', data);
            }
            if (data.includes(this.config.keyword) || this.listening) {
// if hotword only, start prosess med å gå online med en gang
// er dette rett plass å sette inn?
              if (this.config.onlyHotword) { 
                  if(this.ps.isListening())
                      this.ps.stop();
                  console.log("sending socket notification, have released mic");  
                  this.sendSocketNotification('SUSPENDED');
                } 
                this.listening = true;
				this.sendSocketNotification('LISTENING');
                if (this.timer) {
                    clearTimeout(this.timer);
                }
                this.timer = setTimeout(() => {
                    this.listening = false;
                    this.sendSocketNotification('SLEEPING');
                }, this.time);
            } else {
                return;
            }

            let cleanData = this.cleanData(data);

            for (let i = 0; i < this.modules.length; i += 1) {
                const n = cleanData.indexOf(this.modules[i].mode);

////////////////////////////////////////////////////////////////////////
//////////////// 		Done by @sdetweil to			////////////////
//////////////// 	release mic from PocketSphinx		////////////////
//////////////// 	and create timer and checking		////////////////
////////////////////////////////////////////////////////////////////////
                if (n === 0) {                    
                    this.mode= this.modules[i].mode;
////////////////////////////////// EOC /////////////////////////////////

                    cleanData = cleanData.substr(n + this.modules[i].mode.length).trim();
                    break;
                }
            }

////////////////////////////////////////////////////////////////////////
//////////////// 		Done by @sdetweil to			////////////////
//////////////// 	release mic from PocketSphinx		////////////////
//////////////// 	and create timer and checking		////////////////
////////////////////////////////////////////////////////////////////////
            this.mode='VOICE';
////////////////////////////////// EOC /////////////////////////////////

            if (this.mode) {
                this.sendSocketNotification('VOICE', { mode: this.mode, sentence: cleanData });
                if (this.mode === 'VOICE') {
                    this.checkCommands(cleanData);
                }
            }
        }
    },

    /**
     * @function logDebug
     * @description Logs debug information into debug log file.
     *
     * @param {string} data - Debug information
     */
    logDebug(data) {
        fs.appendFile('modules/MMM-VoiceControlMe/debug.log', data, (err) => {
            if (err) {
                console.log(`${this.name}: Couldn't save error to log file!`);
            }
        });
    },

    /**
     * @function logError
     * @description Logs error information into error log file.
     *
     * @param {string} data - Error information
     */
    logError(error) {
        if (error) {
            fs.appendFile('modules/MMM-VoiceControlMe/error.log', `${error}\n`, (err) => {
                if (err) {
                    console.log(`${this.name}: Couldn't save error to log file!`);
                }
                this.sendSocketNotification('ERROR', error);
            });
        }
    },

    /**
     * @function cleanData
     * @description Removes prefix/keyword and multiple spaces.
     *
     * @param {string} data - Recognized data to clean.
     * @returns {string} Cleaned data
     */
    cleanData(data) {
        let temp = data;
        const i = temp.indexOf(this.config.keyword);
        if (i !== -1) {
            temp = temp.substr(i + this.config.keyword.length);
        }
        temp = temp.replace(/ {2,}/g, ' ').trim();
        return temp;
    },

    /**
     * @function checkCommands
     * @description Checks for commands of voice module
     * @param {string} data - Recognized data
     */
    checkCommands(data) {

////////////////////////////////////////////////////////////////////////
//////////////// 		Done by @sdetweil to			////////////////
//////////////// 	release mic from PocketSphinx		////////////////
//////////////// 	and create timer and checking		////////////////
////////////////////////////////////////////////////////////////////////
        if (/(GO)/g.test(data) && /(ONLINE)/g.test(data)) {
        //} else if (/(GO)/g.test(data) && /(ONLINE)/g.test(data)) { 
            if(this.ps.isListening())
              this.ps.stop();
            console.log("sending socket notification, have released mic");  
            this.sendSocketNotification('SUSPENDED');
////////////////////////////////// EOC /////////////////////////////////

		} else if (/(PLEASE)/g.test(data) && /(WAKE)/g.test(data) && /(UP)/g.test(data)) {
			if(this.config.standByMethod === 'DPMS')		/////////// Turns on laptop display and desktop PC with DVI @ Mykle1
				exec('xset dpms force on', null); 
			if(this.config.standByMethod === 'PI')  		/////////// Turns on HDMI on Pi
				exec('/opt/vc/bin/tvservice -p && sudo chvt 6 && sudo chvt 7', null);
				this.hdmi = true;

        } else if (/(GO)/g.test(data) && /(SLEEP)/g.test(data)) {
			if(this.config.standByMethod === 'DPMS')  		/////////// Turns off laptop display and desktop PC with DVI @ Mykle1
				exec('xset dpms force off', null);
			if(this.config.standByMethod === 'PI')  		/////////// Turns off HDMI on Pi
				exec('/opt/vc/bin/tvservice -o', null);
				this.hdmi = false;
        }
		

////////////////////////////////////////////////////////////////////////
////////////////	 	   Enhanced by @TheStigh		////////////////
//////////////// 		to toggle show/hide modules 	////////////////
////////////////////////////////////////////////////////////////////////


//********************************************************************//
//																	  //
//		Here you have to add what modules to hide/show.				  //
//		Just copy a 'block' of code and fill in commands from		  //
//		entries you have made in config.js and determine what		  //
//		module you want to hide/show.								  //
//																	  //
//********************************************************************//

		else if (/(ROTATE)/g.test(data) && /(LAYER)/g.test(data)) {
            this.sendSocketNotification('ROTATE_LAYER')
        }

        else if (/(ZOOM)/g.test(data) && /(IN)/g.test(data)) {
            this.sendSocketNotification('ZOOM_IN');
        }

        else if (/(ZOOM)/g.test(data) && /(OUT)/g.test(data)) {
            this.sendSocketNotification('ZOOM_OUT');
        }

        else if (/(SHOW)/g.test(data) && /(DEFAULT)/g.test(data) && /(ZOOM)/g.test(data)) {
			this.sendSocketNotification('DEFAULT_ZOOM');
		}
        
        else if (/(SHOW)/g.test(data) && /(ME)/g.test(data) && /(WIND)/g.test(data)) {
			this.sendSocketNotification('CHANGE_WIND');
		}

        else if (/(SHOW)/g.test(data) && /(ME)/g.test(data) && /(RAIN)/g.test(data)) {
			this.sendSocketNotification('CHANGE_RAIN');
		}

        else if (/(SHOW)/g.test(data) && /(ME)/g.test(data) && /(CLOUDS)/g.test(data)) {
			this.sendSocketNotification('CHANGE_CLOUDS');
		}

        else if (/(SHOW)/g.test(data) && /(ME)/g.test(data) && /(TEMPERATURE)/g.test(data)) {
			this.sendSocketNotification('CHANGE_TEMP');
		}			

        else if (/(SHOW)/g.test(data) && /(ME)/g.test(data) && /(PRESSURE)/g.test(data)) {
			this.sendSocketNotification('CHANGE_PRESSURE');
		}			

        else if (/(SHOW)/g.test(data) && /(ME)/g.test(data) && /(CURRENTS)/g.test(data)) {
			this.sendSocketNotification('CHANGE_CURRENTS');
		}			

        else if (/(SHOW)/g.test(data) && /(ME)/g.test(data) && /(WAVES)/g.test(data)) {
			this.sendSocketNotification('CHANGE_WAVES');
		}
		
        else if (/(TAKE)/g.test(data) && /(SELFIE)/g.test(data)) {
            this.sendSocketNotification('TAKE_SELFIE');
        }

        else if (/(SHOW)/g.test(data) && /(MODULES)/g.test(data)) {
            this.sendSocketNotification('SHOW_MODULES');
        } 
		
		else if (/(HIDE)/g.test(data) && /(MODULES)/g.test(data)) {
            this.sendSocketNotification('HIDE_MODULES');
        }

        else if (/(SHOW)/g.test(data) && /(CAMERA)/g.test(data)) {
			this.sendSocketNotification('SHOW_CAMERA');
        } 
		
		else if (/(HIDE)/g.test(data) && /(CAMERA)/g.test(data)) {
			this.sendSocketNotification('HIDE_CAMERA');
        }

        else if (/(SHOW)/g.test(data) && /(GHOST)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-EasyPix2"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(GHOST)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-EasyPix2"], show: [], toggle:[]});
        }

        else if (/(SHOW)/g.test(data) && /(LUCY)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-EasyPix"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(LUCY)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-EasyPix"], show: [], toggle:[]});
        }

		else if (/(SHOW)/g.test(data) && /(VOICE)/g.test(data)) {
 			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-VoiceControlMe"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(VOICE)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-VoiceControlMe"], show: [], toggle:[]});
        }

         else if (/(SHOW)/g.test(data) && /(WEATHER)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["currentweather"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(WEATHER)/g.test(data)) {
 			this.sendSocketNotification('MODULE_STATUS',{hide: ["currentweather"], show: [], toggle:[]});
        }

        else if (/(SHOW)/g.test(data) && /(WIND)/g.test(data)) {
 			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-WindyV2"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(WIND)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-WindyV2"], show: [], toggle:[]});
        }

        else if (/(SHOW)/g.test(data) && /(FORECAST)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["weatherforecast"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(FORECAST)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: ["weatherforecast"], show: [], toggle:[]});
        }

        else if (/(SHOW)/g.test(data) && /(TOOLS)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-Tools"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(TOOLS)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-Tools"], show: [], toggle:[]});
        }
		
        else if (/(SHOW)/g.test(data) && /(CHANNEL)/g.test(data) && /(ONE)/g.test(data)) {
 			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-iFrame-Ping"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(CHANNEL)/g.test(data) && /(ONE)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-iFrame-Ping"], show: [], toggle:[]});
        }
		
		else if (/(SHOW)/g.test(data) && /(CHANNEL)/g.test(data) && /(WALL)/g.test(data)) {
 			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-iFrame-Ping"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(CHANNEL)/g.test(data) && /(WALL)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-iFrame-Ping"], show: [], toggle:[]});
        }

        else if (/(SHOW)/g.test(data) && /(CHANNEL)/g.test(data) && /(TWO)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-iFrame-Ping-2"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(CHANNEL)/g.test(data) && /(TWO)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-iFrame-Ping-2"], show: [], toggle:[]});
        }

        else if (/(SHOW)/g.test(data) && /(CHANNEL)/g.test(data) && /(THREE)/g.test(data)) {
 			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-iFrame-Ping-3"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(CHANNEL)/g.test(data) && /(THREE)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-iFrame-Ping-3"], show: [], toggle:[]});
        }

        else if (/(SHOW)/g.test(data) && /(CHANNEL)/g.test(data) && /(FOUR)/g.test(data)) {
 			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-iFrame-Ping-4"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(CHANNEL)/g.test(data) && /(FOUR)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-iFrame-Ping-4"], show: [], toggle:[]});
        }

        else if (/(SHOW)/g.test(data) && /(SKY)/g.test(data) && /(NEWS)/g.test(data)) {
 			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-iFrame-Ping-4"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(SKY)/g.test(data) && /(NEWS)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-iFrame-Ping-4"], show: [], toggle:[]});
        }
										
		else if (/(SHOW)/g.test(data) && /(ASSISTANT)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-AssistantMk2"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(ASSISTANT)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-AssistantMk2"], show: [], toggle:[]});
        }
		
		else if (/(SHOW)/g.test(data) && /(BACKGROUND)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-GoogleMapsTraffic"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(BACKGROUND)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-GoogleMapsTraffic"], show: [], toggle:[]});
		}

	    else if (/(SHOW)/g.test(data) && /(CALENDAR)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["calendar"], toggle:[]});
		} else if (/(HIDE)/g.test(data) && /(CALENDAR)/g.test(data)) {
            this.sendSocketNotification('MODULE_STATUS',{hide: ["calendar"], show: [], toggle:[]});
		}

		 else if (/(SHOW)/g.test(data) && /(CLOCK)/g.test(data)) {
            this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["clock"], toggle:[]});
		} else if (/(HIDE)/g.test(data) && /(CLOCK)/g.test(data)) {
            this.sendSocketNotification('MODULE_STATUS',{hide: ["clock"], show: [], toggle:[]});
		}

		else if (/(SHOW)/g.test(data) && /(COMPLIMENTS)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["compliments"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(COMPLIMENTS)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: ["compliments"], show: [], toggle:[]});
        }

		else if (/(SHOW)/g.test(data) && /(ALARM)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-Alarm-Clock"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(ALARM)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-Alarm-Clock"], show: [], toggle:[]});
		}
		
		else if (/(SHOW)/g.test(data) && /(COCKTAILS)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-Cocktails"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(COCKTAILS)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-Cocktails"], show: [], toggle:[]});
        }

		else if (/(SHOW)/g.test(data) && /(CARDS)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-CARDS"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(CARDS)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-CARDS"], show: [], toggle:[]});
        }

		else if (/(SHOW)/g.test(data) && /(CENSUS)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-Census"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(CENSUS)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-Census"], show: [], toggle:[]});
        }

		else if (/(SHOW)/g.test(data) && /(COWBOY)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-NOAA"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(COWBOY)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-NOAA"], show: [], toggle:[]});
        }

		else if (/(SHOW)/g.test(data) && /(DARWIN)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-EOL"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(DARWIN)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-EOL"], show: [], toggle:[]});
        }

		else if (/(SHOW)/g.test(data) && /(EARTH)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-EARTH"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(EARTH)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-EARTH"], show: [], toggle:[]});
        }

		else if (/(SHOW)/g.test(data) && /(EYECANDY)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-EyeCandy"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(EYECANDY)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-EyeCandy"], show: [], toggle:[]});
        }

		else if (/(SHOW)/g.test(data) && /(EVENTS)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-Events"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(EVENTS)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-Events"], show: [], toggle:[]});
        }

		else if (/(SHOW)/g.test(data) && /(FAX)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-rfacts"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(FAX)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-rfacts"], show: [], toggle:[]});
        }

		else if (/(SHOW)/g.test(data) && /(FORTUNE)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-Fortune"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(FORTUNE)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-Fortune"], show: [], toggle:[]});
        }

		else if (/(SHOW)/g.test(data) && /(GAS)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-Gas"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(GAS)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-Gas"], show: [], toggle:[]});
        }

        else if (/(SHOW)/g.test(data) && /(JEOPARDY)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-JEOPARDY"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(JEOPARDY)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-JEOPARDY"], show: [], toggle:[]});
        }

		 else if (/(SHOW)/g.test(data) && /(LICE)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-LICE"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(LICE)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-LICE"], show: [], toggle:[]});
        }

		 else if (/(SHOW)/g.test(data) && /(LOCATION)/g.test(data)) {
            this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-URHere"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(LOCATION)/g.test(data)) {
            this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-URHere"], show: [], toggle:[]});
        }

		else if (/(SHOW)/g.test(data) && /(LOTTERY)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-Lottery"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(LOTTERY)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-Lottery"], show: [], toggle:[]});
        }

		else if (/(SHOW)/g.test(data) && /(MOON)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-Lunartic"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(MOON)/g.test(data)) {
            this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-Lunartic"], show: [], toggle:[]});
        }

		else if (/(SHOW)/g.test(data) && /(NASA)/g.test(data)) {
            this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-NASA"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(NASA)/g.test(data)) {
            this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-NASA"], show: [], toggle:[]});
        }

		else if (/(SHOW)/g.test(data) && /(NEO)/g.test(data)) {
            this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-NEO"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(NEO)/g.test(data)) {
            this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-NEO"], show: [], toggle:[]});
        }

		else if (/(SHOW)/g.test(data) && /(NEWS)/g.test(data)) {
            this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["newsfeed"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(NEWS)/g.test(data)) {
            this.sendSocketNotification('MODULE_STATUS',{hide: ["newsfeed"], show: [], toggle:[]});
        }

		else if (/(SHOW)/g.test(data) && /(PETFINDER)/g.test(data)) {
            this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-PetFinder"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(PETFINDER)/g.test(data)) {
            this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-PetFinder"], show: [], toggle:[]});
        }

        else if (/(SHOW)/g.test(data) && /(PHONE)/g.test(data)) {
            this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-FMI"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(PHONE)/g.test(data)) {
            this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-FMI"], show: [], toggle:[]});
        }

		else if (/(SHOW)/g.test(data) && /(PICTURES)/g.test(data)) {
            this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-ImageSlideshow"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(PICTURES)/g.test(data)) {
            this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-ImageSlideshow"], show: [], toggle:[]});
        }

         else if (/(SHOW)/g.test(data) && /(PILOTS)/g.test(data)) {
            this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-PilotWX"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(PILOTS)/g.test(data)) {
            this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-PilotWX"], show: [], toggle:[]});
        }

		 else if (/(SHOW)/g.test(data) && /(SHIPPING)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-AfterShip"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(SHIPPING)/g.test(data)) {
            this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-AfterShip"], show: [], toggle:[]});
        }

		else if (/(SHOW)/g.test(data) && /(STATION)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-ISS"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(STATION)/g.test(data)) {
            this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-ISS"], show: [], toggle:[]});
        }

		else if (/(SHOW)/g.test(data) && /(STATS)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-PC-Stats"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(STATS)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-PC-Stats"], show: [], toggle:[]});
        }

		else if (/(SHOW)/g.test(data) && /(SUDOKU)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-Sudoku"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(SUDOKU)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-Sudoku"], show: [], toggle:[]});
        }

		else if (/(SHOW)/g.test(data) && /(SUNRISE)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-SunRiseSet"], toggle:[]});
		} else if (/(HIDE)/g.test(data) && /(SUNRISE)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-SunRiseSet"], show: [], toggle:[]});
		}

		else if (/(SHOW)/g.test(data) && /(TIDES)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-SORT"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(TIDES)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-SORT"], show: [], toggle:[]});
        }

		else if (/(SHOW)/g.test(data) && /(TIMER)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-EventHorizon"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(TIMER)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-EventHorizon"], show: [], toggle:[]});
        }

		else if (/(SHOW)/g.test(data) && /(TRIVIA)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: ["MMM-ATM"], toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(TRIVIA)/g.test(data)) {
			this.sendSocketNotification('MODULE_STATUS',{hide: ["MMM-ATM"], show: [], toggle:[]});
        }
	    
////////////////////////////////////////////////////////////////////////
//////////////// 			 Made by @Mykle1			////////////////
//////////////// 			 PAGES BY VOICE				////////////////
////////////////										////////////////	
//////////////// 	   	  Enhanced by @TheStigh to		////////////////
////////////////	  reduce script and notifications 	////////////////
////////////////////////////////////////////////////////////////////////

////////////////			  Page 1 commands 			////////////////
		else if (/(SHOW)/g.test(data) && /(MAIN)/g.test(data) && /(PAGE)/g.test(data)) {
			this.sendSocketNotification('HIDE_MODULES');
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: this.config.mainPageModules, toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(MAIN)/g.test(data) && /(PAGE)/g.test(data)) {
			this.sendSocketNotification('HIDE_MODULES');
        }

////////////////			  Page 2 commands 			////////////////
		else if (/(SHOW)/g.test(data) && /(PAGE)/g.test(data) && /(TWO)/g.test(data)) {
			this.sendSocketNotification('HIDE_MODULES');
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: this.config.pageTwoModules, toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(PAGE)/g.test(data) && /(TWO)/g.test(data)) {
			this.sendSocketNotification('HIDE_MODULES');
        }

////////////////			  Page 3 commands 			////////////////
		else if (/(SHOW)/g.test(data) && /(PAGE)/g.test(data) && /(THREE)/g.test(data)) {
			this.sendSocketNotification('HIDE_MODULES');
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: this.config.pageThreeModules, toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(PAGE)/g.test(data) && /(THREE)/g.test(data)) {
			this.sendSocketNotification('HIDE_MODULES');
        }

////////////////			  Page 4 commands 			////////////////
		else if (/(SHOW)/g.test(data) && /(PAGE)/g.test(data) && /(FOUR)/g.test(data)) {
			this.sendSocketNotification('HIDE_MODULES');
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: this.config.pageFourModules, toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(PAGE)/g.test(data) && /(FOUR)/g.test(data)) {
			this.sendSocketNotification('HIDE_MODULES');
        }

////////////////			  Page 5 commands 			////////////////
		else if (/(SHOW)/g.test(data) && /(PAGE)/g.test(data) && /(FIVE)/g.test(data)) {
			this.sendSocketNotification('HIDE_MODULES');
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: this.config.pageFiveModules, toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(PAGE)/g.test(data) && /(FIVE)/g.test(data)) {
			this.sendSocketNotification('HIDE_MODULES');
        }

////////////////			  Page 6 commands 			////////////////

		else if (/(SHOW)/g.test(data) && /(PAGE)/g.test(data) && /(SIX)/g.test(data)) {
			this.sendSocketNotification('HIDE_MODULES');
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: this.config.pageSixModules, toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(PAGE)/g.test(data) && /(SIX)/g.test(data)) {
			this.sendSocketNotification('HIDE_MODULES');
        }

////////////////			  Page 7 commands 			////////////////
		else if (/(SHOW)/g.test(data) && /(PAGE)/g.test(data) && /(SEVEN)/g.test(data)) {
			this.sendSocketNotification('HIDE_MODULES');
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: this.config.pageSevenModules, toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(PAGE)/g.test(data) && /(SEVEN)/g.test(data)) {
			this.sendSocketNotification('HIDE_MODULES');
        }

////////////////			  Page 8 commands 			////////////////
		else if (/(SHOW)/g.test(data) && /(PAGE)/g.test(data) && /(EIGHT)/g.test(data)) {
			this.sendSocketNotification('HIDE_MODULES');
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: this.config.pageEightModules, toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(PAGE)/g.test(data) && /(EIGHT)/g.test(data)) {
			this.sendSocketNotification('HIDE_MODULES');
        }

////////////////			  Page 9 commands 			////////////////
		else if (/(SHOW)/g.test(data) && /(PAGE)/g.test(data) && /(NINE)/g.test(data)) {
			this.sendSocketNotification('HIDE_MODULES');
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: this.config.pageNineModules, toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(PAGE)/g.test(data) && /(NINE)/g.test(data)) {
			this.sendSocketNotification('HIDE_MODULES');
        }

////////////////			  Page 10 commands 			////////////////
		else if (/(SHOW)/g.test(data) && /(PAGE)/g.test(data) && /(TEN)/g.test(data)) {
			this.sendSocketNotification('HIDE_MODULES');
			this.sendSocketNotification('MODULE_STATUS',{hide: [], show: this.config.pageTenModules, toggle:[]});
        } else if (/(HIDE)/g.test(data) && /(PAGE)/g.test(data) && /(TEN)/g.test(data)) {
			this.sendSocketNotification('HIDE_MODULES');
        }

////////////////////////////////// EOC /////////////////////////////////	

         else if (/(HELP)/g.test(data)) {
            if (/(CLOSE)/g.test(data) || (this.help && !/(OPEN)/g.test(data))) {
                this.sendSocketNotification('CLOSE_HELP');
                this.help = false;
            } else if (/(OPEN)/g.test(data) || (!this.help && !/(CLOSE)/g.test(data))) {
                this.sendSocketNotification('OPEN_HELP');
                this.help = true;
            }
        }
    }
	
});
