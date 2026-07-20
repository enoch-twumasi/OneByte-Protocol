/*
The Compressor function below takes human readable input and converts input into a single byte integer before sending, to save bandwidth.
*/
// deviceId: 1st three bits (0-7),
//isActive: 4th bit (1 for ON; 0 for OFF; value is boolean: true or false).
// isHardReboot: 5th bit( 1: Hard Reboot, 0: Soft boot; value is boolean: true or false)


function payloadCompressor(deviceId, isActive, isHardReboot){
  
  //bits to configure isActive and isHardReboot to "true"
  const ACT_VAL = 0b00001000
  const REB_VAL = 0b00010000

  //bits to configure isActive and isHardReboot to "false"
  const DONOT = 0
  
  //Compression logic
  const configIsActive = (isActive |0 ) ? ACT_VAL : DONOT;
  
  const configIsHardReboot = (isHardReboot |0) ? REB_VAL : DONOT;
  
  const payload = deviceId | configIsActive | configIsHardReboot ;
  
  //proves payload is an integer
  console.log(`Your payload variable in payloadCompressor holds the value: ${payload}`)
  
  return payload;
};

module.exports = payloadCompressor;