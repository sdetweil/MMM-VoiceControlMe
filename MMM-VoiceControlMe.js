/**
 * @file MMM-VoiceControlMe.js
 *
 * @originalAuthor fewieden MMM-voice
 * @inspirationalModules Hello-Lucy MMM-ModuleToggle MMM-Hotword MMM-AssistantMk2 MMM-MotionDetector
 * @extended by TheStigh, Mykle1 and Sdetweil
 *
 * @license MIT
 *
 * @see  https://github.com/Mykle1/MMM-VoiceControlMe
 */

/* global Module Log MM */

/**
 * @external Module   @see https://github.com/MichMich/MagicMirror/blob/master/js/module.js
 * @external Log      @see https://github.com/MichMich/MagicMirror/blob/master/js/logger.js
 * @external MM 	  @see https://github.com/MichMich/MagicMirror/blob/master/js/main.js
 *
 * @module MMM-VoiceControlMe
 * @description Frontend for the module to display data.
 *
 * @requires external:Module, Log and MM
 */

'use strict';

Module.register('MMM-VoiceControlMe', {

    /** @member {string} icon - Microphone icon. */
    icon: 'fa-microphone-slash',
    /** @member {boolean} pulsing - Flag to indicate listening state. */
    pulsing: true,
    /** @member {boolean} help - Flag to switch between render help or not. */
    help: false,

////////////////////////////////////////////////////////////////////////
//////////////// 		Done by @sdetweil to			////////////////
//////////////// 	release mic from PocketSphinx		////////////////
////////////////////////////////////////////////////////////////////////
	timeout: null, 
    
	
////////////////////////////////// EOC /////////////////////////////////
	
    /**
     * @member {Object} voice - Defines the default mode and commands of this module.
     * @property {string} mode - Voice mode of this module.
     * @property {string[]} sentences - List of voice commands of this module.
     */


///////////// Add your commands to the sentences array below ///////////////////

    voice: {
	mode: 'Say, HELLO LUCY',
	sentences: [
	  'HIDE ALARM',
	  'SHOW ALARM',
	  'HIDE BACKGROUND',
	  'SHOW BACKGROUND',
	  'HIDE CALENDAR',
	  'SHOW CALENDAR',
      'SHOW CARDS',
      'HIDE CENSUS',
      'SHOW CENSUS',
      'HIDE CLOCK',
      'SHOW CLOCK',
      'HIDE COCKTAILS',
      'SHOW COCKTAILS',
      'HIDE COMPLIMENTS',
      'SHOW COMPLIMENTS',
      'HIDE COWBOY',
      'SHOW COWBOY',
      'HIDE DARWIN',
      'SHOW DARWIN',
      'HIDE EARTH',
      'SHOW EARTH',
      'HIDE EYECANDY',
      'SHOW EYECANDY',
      'HIDE EVENTS',
      'SHOW EVENTS',
      'HIDE FAX',
      'SHOW FAX',
      'HIDE FLIPPER',
      'SHOW FLIPPER',
      'HIDE FLIGHTS',
      'SHOW FLIGHTS',
      'HIDE FORTUNE',
      'SHOW FORTUNE',
      'HIDE GAS',
	  'SHOW GAS',
      'HIDE JEOPARDY',
      'SHOW JEOPARDY',
      'HIDE LICE',
      'SHOW LICE',
      'HIDE LOCATION',
      'SHOW LOCATION',
      'HIDE LOTTERY',
      'SHOW LOTTERY',
      'HIDE LUCY',
      'SHOW LUCY',
      'HIDE MODULES',
      'SHOW MODULES',
      'HIDE MOON',
      'SHOW MOON',
      'HIDE NASA',
      'SHOW NASA',
      'HIDE NEO',
      'SHOW NEO',
      'HIDE NEWS',
      'SHOW NEWS',
      'HIDE PETFINDER',
      'SHOW PETFINDER',
      'HIDE PHONE',
      'SHOW PHONE',
      'HIDE PICTURES',
      'SHOW PICTURES',
      'HIDE PILOTS',
      'SHOW PILOTS',
      'HIDE SHIPPING',
      'SHOW SHIPPING',
      'HIDE STATION',
      'SHOW STATION',
      'HIDE STATS',
      'SHOW STATS',
      'HIDE SUNRISE',
      'SHOW SUNRISE',
      'HIDE SUDOKU',
      'SHOW SUDOKU',
      'HIDE TIDES',
      'SHOW TIDES',
      'HIDE TIMER',
      'SHOW TIMER',
      'HIDE TRAFFIC',
      'SHOW TRAFFIC',
      'HIDE TRIVIA',
      'SHOW TRIVIA',
      'HIDE VOICE',
      'SHOW VOICE',
      'HIDE WEATHER',
      'SHOW WEATHER',
      'HIDE WIND',
      'SHOW WIND',
      'HIDE PAGE ONE',
      'SHOW PAGE ONE',
	  'HIDE PAGE TWO',
      'SHOW PAGE TWO',
      'HIDE PAGE THREE',
      'SHOW PAGE THREE',
      'HIDE PAGE FOUR',
      'SHOW PAGE FOUR',
      'HIDE PAGE FIVE',
      'SHOW PAGE FIVE',
      'HIDE PAGE SIX',
      'SHOW PAGE SIX',
      'HIDE PAGE SEVEN',
      'SHOW PAGE SEVEN',
      'HIDE PAGE EIGHT',
      'SHOW PAGE EIGHT',
      'HIDE PAGE NINE',
      'SHOW PAGE NINE',
      'HIDE PAGE TEN',
      'SHOW PAGE TEN',
	  'HIDE MAIN PAGE',
	  'SHOW MAIN PAGE',
      'PLEASE WAKE UP',
      'GO TO SLEEP',
      'OPEN HELP',
      'CLOSE HELP',
	  'ACTIVATE ASSISTANT',
	  'HIDE ASSISTANT',
	  'SHOW ASSISTANT',
	  'HIDE CHANNEL ONE',
	  'SHOW CHANNEL ONE',
  	  'HIDE CHANNEL WALL',
	  'SHOW CHANNEL WALL',
	  'HIDE CHANNEL TWO',
	  'SHOW CHANNEL TWO',
	  'HIDE CHANNEL THREE',
	  'SHOW CHANNEL THREE',
	  'HIDE CHANNEL FOUR',
	  'SHOW CHANNEL FOUR',
	  'HIDE CHANNEL FIVE',
	  'SHOW CHANNEL FIVE',
	  'SHOW CNN',
	  'SHOW SKY NEWS',
	  'HIDE TOOLS',
	  'SHOW TOOLS',
	  'HIDE FORECAST',
	  'SHOW FORECAST',
	  'GO ONLINE',
	  'HIDE GHOST',
	  'SHOW GHOST',
	  'HIDE CAMERA',
      'SHOW CAMERA',
      'TAKE SELFIE',
        ]
    },

    /** @member {Object[]} modules - Set of all modules with mode and commands. */
    modules: [],
    /** @member - keep list of modules already hidden when sleep occurs */
    previouslyHidden: [],
    /**
     * @member {Object} defaults - Defines the default config values.
     * @property {int} timeout - Seconds to active listen for commands.
     * @property {string} keyword - Keyword to activate active listening.
     * @property {boolean} debug - Flag to enable debug information.
     */
    defaults: {
        timeout: 10,                            // timeout listening for a command/sentence
        keyword: 'HELLO LUCY',                  // keyword to activate listening for a command/sentence
        debug: false,                           // get debug information in console
        standByMethod: 'DPMS',                  // 'DPMS' = anything else than RPi or 'PI'
		sounds: ["female_hi.wav"],              // welcomesound at startup, add several for a random choice of welcome sound
        startHideAll: true,                     // if true, all modules start as hidden
        microphone: 0,                          // Please set correct microphone from the cat output after installation
        speed: 1000,                            // transition speed between show/no-show/show in milliseconds
		mainPageModules: ["MMM-VoiceControlMe"],// default modules to show on page one/startup
        activateMotion: false,                  // if true, webcam will be used to activate/deactivate MM on movement
        onlyHotword: false,                     // TBA - Hotword only to activate external module by sendNotification
        timeoutSeconds: 10,                     // seconds to wait for external module to confirm control of mic
        pageTwoModules: [],                     // modules to show on page two
		pageThreeModules: [],                   // modules to show on page two
		pageFourModules: [],                    // modules to show on page two
		pageFiveModules: [],                    // modules to show on page two
		pageSixModules: [],                     // modules to show on page two
		pageSevenModules: [],                   // modules to show on page two
		pageEightModules: [],                   // modules to show on page two
		pageNineModules: [],                    // modules to show on page two
		pageTenModules: [],                     // modules to show on page two
		captureIntervalTime: 1000,              // how often should the webcam check for motion, in milliseconds, default 1 second
        scoreThreshold: 20,                     // threshold to assume motion/no-motion -> se console log for score
        timeoutMotion: 120000                   // timeout with no motion until sleep monitor, in milliseconds, default 2 minutes
    },

    lastTimeMotionDetected: null,
    poweredOff: false,

    getScripts: function() {
        return ['diff-cam-engine.js'];
    },

    /**
     * @function start
     * @description Sets mode to initialising.
     * @override
     */
    start() {
		Log.info(`Starting module: ${this.name}`);
        this.mode = this.translate('INIT');
        this.modules.push(this.voice);
        Log.info(`${this.name} is waiting for voice command registrations.`);
		var pageOne = MM.getModules().withClass(this.config.mainPageModules);
		var pageTwo = MM.getModules().withClass(this.config.pageTwoModules);
		var pageThree = MM.getModules().withClass(this.config.pageThreeModules);
		var pageFour = MM.getModules().withClass(this.config.pageFourModules);
		var pageFive = MM.getModules().withClass(this.config.pageFiveModules);
		var pageSix = MM.getModules().withClass(this.config.pageSixModules);
		var pageSeven = MM.getModules().withClass(this.config.pageSevenModules);
		var pageEight = MM.getModules().withClass(this.config.pageEightModules);
		var pageNine = MM.getModules().withClass(this.config.pageNineModules);
		var pageTen = MM.getModules().withClass(this.config.pageTenModules);

		if (this.config.activateMotion) {
			Log.info('DETECTOR: starting up');
			console.log('DETECTOR starter');
			this.lastTimeMotionDetected = new Date();
			this.sendNotification('ACTIVATE_MONITOR');
			console.log('DETECTOR started, sendt melding om å skru på skjerm');

			let _this = this;
			let canvas = document.createElement('canvas');
			let video = document.createElement('video');
			let cameraPreview = document.createElement('div');
			cameraPreview.id = 'cameraPreview';
			cameraPreview.style = 'visibility:hidden;';
			cameraPreview.appendChild(video);

			DiffCamEngine.init({
				video: video,
				captureIntervalTime: _this.config.captureIntervalTime,
				motionCanvas: canvas,
				initSuccessCallback: function () {
					DiffCamEngine.start();
				},
				initErrorCallback: function () {
					const warning = 'DETECTOR: error init cam engine';
					Log.warn(warning);
					console.log(warning);
				},
				captureCallback: function(payload) {
					const score = payload.score;	
					if (score > _this.config.scoreThreshold) {
						_this.lastTimeMotionDetected = new Date();
						if (_this.poweredOff) {
							_this.poweredOff = false;
							_this.sendSocketNotification('ACTIVATE_MONITOR');
							console.log('MOTION DETECTED, turning monitor on!');
						}
					}
					else {
						const currentDate = new Date(),
							time = currentDate.getTime() - _this.lastTimeMotionDetected;
						if ((time > _this.config.timeoutMotion) && (!_this.poweredOff)) {
							_this.sendSocketNotification('DEACTIVATE_MONITOR');						
							_this.poweredOff = true;
						}
					}
					const info = 'DETECTOR: score ' + score;
					Log.info(info);
					console.info(info);
				}
			});
		}
    },


    /**
     * @function getStyles
     * @description Style dependencies for this module.
     * @override
     * @returns {string[]} List of the style dependency filepaths.
     */
    getStyles() {
        return ['font-awesome.css', 'MMM-VoiceControlMe.css'];
    },

    /**
     * @function getTranslations
     * @description Translations for this module.
     * @override
     * @returns {Object.<string, string>} Available translations for this module (key: language code, value: filepath).
     */

    getTranslations() {
        return {
            en: 'translations/en.json',
            de: 'translations/de.json',
            id: 'translations/id.json'
        };
    },

    /**
     * @function getDom
     * @description Creates the UI as DOM for displaying in MagicMirror application.
     * @override
     * @returns {Element}
     */

    getDom() {
        const wrapper = document.createElement('div');
        const voice = document.createElement('div');
        voice.classList.add('small', 'align-left');

        const icon = document.createElement('i');
        icon.classList.add('fa', this.icon, 'icon');
        if (this.pulsing) {
            icon.classList.add('pulse');
        }
        voice.appendChild(icon);

        const modeSpan = document.createElement('span');
        modeSpan.innerHTML = this.mode;
        voice.appendChild(modeSpan);
        if (this.config.debug) {
            const debug = document.createElement('div');
            debug.innerHTML = this.debugInformation;
            voice.appendChild(debug);
        }

        const modules = document.querySelectorAll('.module');
        for (let i = 0; i < modules.length; i += 1) {
            if (!modules[i].classList.contains(this.name)) {
                if (this.help) {
                    modules[i].classList.add(`${this.name}-blur`);
                } else {
                    modules[i].classList.remove(`${this.name}-blur`);
                }
            }
        }
////////////////////////////////////////////////////////////////////////		
////////////////		Edit help screen to fit			//////////////// 
////////////////		all commands TO DO @ Mykle1		////////////////
////////////////////////////////////////////////////////////////////////

        if (this.help) {
            voice.classList.add(`${this.name}-blur`);
            const modal = document.createElement('div');
            modal.classList.add('modal');
            this.appendHelp(modal);
            wrapper.appendChild(modal);
        }

        wrapper.appendChild(voice);

        return wrapper;
    },

////////////////////////////////// EOC /////////////////////////////////

    /**
     * @function notificationReceived
     * @description Handles incoming broadcasts from other modules or the MagicMirror core.
     * @override
     * @param {string} notification - Notification name
     * @param {*} payload - Detailed payload of the notification.
     */

    notificationReceived(notification, payload, sender) {
        var self=this;
		if (notification === 'DOM_OBJECTS_CREATED') {
            this.sendSocketNotification('START', { config: this.config, modules: this.modules });
        } else if (notification === 'REGISTER_VOICE_MODULE') {
            if (Object.prototype.hasOwnProperty.call(payload, 'mode') && Object.prototype.hasOwnProperty.call(payload, 'sentences')) {
                this.modules.push(payload);
            }

////////////////////////////////////////////////////////////////////////
//////////////// 		Done by @sdetweil to			////////////////
//////////////// 	release mic from PocketSphinx		////////////////
//////////////// 	and create timer and checking		////////////////
////////////////////////////////////////////////////////////////////////

		// add handlers for notifications from other modules
        // did some other module  say they were done with the mic
        } else if(notification === 'HOTWORD_RESUME'){
            Log.error("HOTWORD_RESUME received from "+(sender!=null?sender.name:"unknown"))
            Log.error("HOTWORD_RESUME timeout value = "+this.timeout)
            if( this.timeout!=null){
              Log.error("HOTWORD_RESUME clearing timeout handle")
              clearTimeout( this.timeout);
               this.timeout=null;
            }
             this.icon = 'fa-microphone';
             this.pulsing=false;
  //           Log.error("resume updatedom")
             this.updateDom(100);
             this.sendSocketNotification('RESUME_LISTENING');
        // did some other module request the mic?
        // this could also be a confirm using the mic from the other module
        } else if(notification === 'HOTWORD_PAUSE'){ 
            Log.error("HOTWORD_PAUSE received from "+(sender!=null?sender.name:"unknown"))
            Log.error("HOTWORD_PAUSE timeout value = "+this.timeout)
            if( this.timeout!=null){
              Log.error("HOTWORD_ PAUSE clearing timeout handle")
              clearTimeout( this.timeout);
               this.timeout=null;
            }        
             this.icon='fa-microphone-slash'
             this.pulsing=false;
             //Log.error("pause updatedom")
             this.updateDom(100);
            // if we send the suspend and already not listening, all is ok
             this.sendSocketNotification('SUSPEND_LISTENING');
        }

////////////////////////////////////////////////////////////////////////
//////////////// 	   	   Enhanced by @Mykle1	 		////////////////
//////////////// 		  to play startup sounds 		////////////////
////////////////////////////////////////////////////////////////////////

		if (notification === 'DOM_OBJECTS_CREATED') {
				 var audio_files = this.config.sounds;
				 var random_file = audio_files[Math.floor(Math.random() * audio_files.length)];
				 var audio = new Audio(random_file);
				 audio.src = 'modules/MMM-VoiceControlMe/sounds/'+random_file;
				 audio.play();
			  }
			  
////////////////////////////////////////////////////////////////////////
////////////////	 	   Enhanced by @TheStigh		////////////////
//////////////// 		   to manage hide/show 		    ////////////////
//////////////// 		    modules on startup 			////////////////
////////////////////////////////////////////////////////////////////////

		if (this.config.startHideAll) {
			if (notification === 'DOM_OBJECTS_CREATED') {
				MM.getModules().enumerate((module) => {
				module.hide(1000);
				});
			}
		}

       if (notification === 'DOM_OBJECTS_CREATED'){
			var showOnStart = MM.getModules().withClass(self.config.mainPageModules);
            
            showOnStart.enumerate(function(module) {
                var callback = function(){};
                module.show(self.config.speed, callback);
				});
		}

////////////////////////////////////////////////////////////////////////
//////////////// 	   	Enhanced by @ & @THeStigh 		////////////////
//////////////// 		to show page one on alert 		////////////////
////////////////////////////////////////////////////////////////////////

		if (notification === 'SHOW_ALERT') {				// Alarm clock rings, sends SHOW_ALERT, Receive it here and send SHOW_PAGE_ONE to node_helper of MMM-VoiceControlMe
            var showOnStart = MM.getModules().withClass(self.config.mainPageModules);
            showOnStart.enumerate(function(module) {
                var callback = function(){};
                module.show(self.config.speed, callback);
				});
			}
	//},


////////////////////////////////////////////////////////////////////////
//////////////// 	   	   Enhanced by @TheStigh 		////////////////
//////////////// 		receive activate/deactivate		////////////////
//////////////// 		 from MMM-MotionDetector		////////////////
////////////////////////////////////////////////////////////////////////

		if (notification === 'DEACTIVATE_MONITOR') {
			this.sendSocketNotification('DEACTIVATE_MONITOR');
			}

		if (notification === 'ACTIVATE_MONITOR') {
			this.sendSocketNotification('DEACTIVATE_MONITOR');
			}
			
	},

////////////////////////////////// EOC /////////////////////////////////

    /**
     * @function socketNotificationReceived
     * @description Handles incoming messages from node_helper.
     * @override
     *
     * @param {string} notification - Notification name
     * @param {*} payload - Detailed payload of the notification.
     */
    socketNotificationReceived(notification, payload) {
        if (notification === 'READY') {
            this.icon = 'fa-microphone';
            this.mode = this.translate('NO_MODE')+this.config.keyword;
            this.pulsing = false;
			
        } else if (notification === 'LISTENING') {
            this.pulsing = true;
        } else if (notification === 'SLEEPING') {
            this.pulsing = false;
        } else if (notification === 'ERROR') {
            this.mode = notification;


////////////////////////////////////////////////////////////////////////
//////////////// 		Done by @sdetweil to			////////////////
//////////////// 	release mic from PocketSphinx		////////////////
//////////////// 	and create timer and checking		////////////////
////////////////////////////////////////////////////////////////////////

		/// new handler for detected 'go online' in node_helper
        } else if (notification === 'SUSPENDED') {
            console.log('>>>>>> Got the message!');
            this.icon='fa-microphone-slash'
            this.pulsing = false;
            this.debugInformation=" ";
            this.updateDom(100);
		// tell other module to resume voice detection
            this.timeout=setTimeout(() => {                        // dummy code here for response from other module when done
                    Log.log("mic suspend timeout,  sending socket notification to RESUME_LISTENING")
                    this.notificationReceived('HOTWORD_RESUME');
                }, this.config.timeoutSeconds*1000);         
            this.sendNotification('ASSISTANT_ACTIVATE', {profile:'default'});

////////////////////////////////// EOC /////////////////////////////////			

		} else if (notification === 'HIDE_MODULES') {
            MM.getModules().enumerate((module) => {
                module.hide(1000);
            });
        
		} else if (notification === 'SHOW_MODULES') {
            MM.getModules().enumerate((module) => {
                module.show(1000);
            });
			
		} else if (notification === 'HELLO_THERE_GHOST') {
			this.sendNotification('PLAY_GHOST');

		} else if (notification === 'SHOW_CAMERA') {
			this.sendNotification('SHOW_CAMERA');

		} else if (notification === 'HIDE_CAMERA') {
            this.sendNotification('HIDE_CAMERA');
            
        } else if (notification === 'TAKE_SELFIE') {
			this.sendNotification('SELFIE');

////////////////////////////////////////////////////////////////////////
/////////////// 	   	  Enhanced by @TheStigh to		////////////////
///////////////			show/hide by core messages 		////////////////
///////////////		 	either by single module- or 	////////////////
///////////////	      PAGE commands from node_helper	////////////////
////////////////////////////////////////////////////////////////////////

		} else if (notification === "MODULE_STATUS") {
			//console.log("Beskjed mottatt");
			//Log.error(self.name + " received a module notification: " + notification);
			var hide = MM.getModules().withClass(payload.hide);
			hide.enumerate(function(module) {
				Log.log("Hide "+ module.name);
				var callback = function(){};
				var options = {lockString: self.identifier};
				module.hide(self.config.speed, callback, options);
			});
            
			var show = MM.getModules().withClass(payload.show);
			show.enumerate(function(module) {
				Log.log("Show "+ module.name);
				var callback = function(){};
				var options = {lockString: self.identifier};
				module.show(self.config.speed, callback, options);
			});
		
////////////////////////////////// EOC //////////////////////////////////

	} else if (notification === 'DEBUG') {
            this.debugInformation = payload;
        }
        this.updateDom(300);
    },

    /**
     * @function appendHelp
     * @description Creates the UI for the voice command SHOW HELP.
     *
     * @param {Element} appendTo - DOM Element where the UI gets appended as child.
     */
    appendHelp(appendTo) {
        const title = document.createElement('h1');
        title.classList.add('xsmall'); // was medium @ Mykle
        title.innerHTML = `${this.name} - ${this.translate('COMMAND_LIST')}`;
        appendTo.appendChild(title);

        const mode = document.createElement('div');
    mode.classList.add('xsmall'); // added @ Mykle
        mode.innerHTML = `${this.translate('MODE')}: ${this.voice.mode}`;
        appendTo.appendChild(mode);

        const listLabel = document.createElement('div');
    listLabel.classList.add('xsmall'); // added @ Mykle
        listLabel.innerHTML = `${this.translate('VOICE_COMMANDS')}:`;
        appendTo.appendChild(listLabel);

        const list = document.createElement('ul');
        for (let i = 0; i < this.voice.sentences.length; i += 1) {
            const item = document.createElement('li');
      list.classList.add('xsmall'); // added @ Mykle
            item.innerHTML = this.voice.sentences[i];
            list.appendChild(item);
        }
        appendTo.appendChild(list);
    }
});
