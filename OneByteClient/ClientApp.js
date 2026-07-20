const payloadCompressor = require('./payloadCompressor.js');
const initClientSocket = require('./initClientSocket.js');
 
//Configuration input (User Input)
const DEVICE_ID = 7;
const IS_ACTIVE = true;
const IS_HARD_REBOOT = true;


function runClientApp (deviceId, isActive, isHardReboot){
  
  //the payloadCompressor takes user input as arguments and returns a single integer to be sent as 1 byte payload instead of 50+ bytes
  //to save bandwidth drastically
  //Server later decodes this intger into orginal message/command this client intended to send.

  const payload = payloadCompressor(deviceId, isActive, isHardReboot);
  

  initClientSocket(payload);
};

// first argument is deviceId, second configures isActive, and third configures isHardReboot
//You can pass your arguments here

runClientApp(DEVICE_ID, IS_ACTIVE, IS_HARD_REBOOT);
