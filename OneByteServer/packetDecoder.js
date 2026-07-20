//This is a function that takes an integer and decodes into a command object a client intended to send to this server.
// the goal is to take an integer and return a command (Object with three properties): 

/*
    {
        deviceId: 7
        isActive: true
        isHardReboot: true
    }
*/
// deviceId: 1st three bits (0-7), isActive 4th bit (0 for OFF, one for ON), isHardReboot 5th bit( 0 for normal boot, 1 for hard reboot)


function packetDecoder (packet){

    //Masks
    const DEV_MASK = 0b00000111;
    const ACT_MASK = 0b00001000;
    const REB_MASK = 0b00010000;

    //logic & Bitwise Maths section 
    const deviceId = (packet & DEV_MASK);
    const isActive = (packet & ACT_MASK) ? true : false;
    const isHardReboot = (packet & REB_MASK) ? true : false;

    //Result section below
    const command = {
        deviceId,
        isActive,
        isHardReboot,
    };

    console.log('Command Object:',command);

    return command;
};

module.exports = packetDecoder;