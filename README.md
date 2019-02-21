## MMM-VoiceControlMe

Control other modules that use voice commands with a single microphone.

Built in motion detection for webcams. Puts your display to sleep or wakes it up.

Built in support for sound files for audio responses.

Hide and show pages of modules.

Hide and show individual modules.

No modification of other modules necessary.

Offline by default. Online by controlling other modules. (Ex. AssistantMk2)


## Who did this?

This module is the result of a three developer collaboration. @TheStigh was the driving force behind
the idea and worked tirelessly towards its creation and completion. @sdetweil added critical and crucial
functionality to the module. Without his collaboration the module doesn't include its better features.
@Mykle1's original pages and hide/show commands were improved upon. He added some lesser features and is the author of this wonderful README file.

## Examples

![](images/1.png)

![](images/2.png)

## Installation and requirements

* `git clone https://github.com/mykle1/MMM-VoiceControlMe` into the `~/MagicMirror/modules` directory.

* `cd MMM-VoiceControlMe`

* `cd installers`

* `bash dependencies.sh`


## Config.js entry and options
```
    {
    disabled: false,
    module: "MMM-VoiceControlMe",
    position: "top_center",               // bottom_bar is best
    config: {
      timeout: 10,
      keyword: 'HELLO LUCY',
      debug: false,
      standByMethod: 'DPMS',
      sounds: ["female_hi.wav"],
      startHideAll: true,
      microphone: 0, // Please set correct microphone from the cat output after installation
      speed: 1000,
  mainPageModules: ["MMM-VoiceControlMe"],
  activateMotion: false,
  pageTwoModules: [],
  pageThreeModules: [],
  pageFourModules: [],
  pageFiveModules: [],
  pageSixModules: [],
  pageSevenModules: [],
  pageEightModules: [],
  pageNineModules: [],
  pageTenModules: [],
  captureIntervalTime: 1000, // 1 second
      scoreThreshold: 20,
      timeoutMotion: 120000 // 2 minutes
           }
    },
```
##
