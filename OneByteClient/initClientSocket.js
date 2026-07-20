/*  user inputs goes through payloadCompressor which converts user input into a single byte integer payload. 
payload is then passed this client socket to be sent to another system (server), to save bandwidth.
NOTE: instead of shipping 50+ bytes we ship only 1 byte of payload saving bandwidth drastically
*/

const dgram = require('dgram');

//Server's Address and port
const D_PORT = 8888;
const D_IP = "192.168.1.6";


function initClientSocket(payload){

  const client = dgram.createSocket('udp4');


  const callBack = (err, bytes) => {
    
    if (err){
    console.error('udp socket failed to send packet',err);

    client.close();

    return;
    };
    
    //this proves how many bytes was actually sent as payload.
    console.log(`Packet of ${bytes} bytes sent successfully`);
    
    client.close();
  };


  const buff = Buffer.from([payload]);


  client.send(buff, D_PORT, D_IP,callBack );

};

module.exports = initClientSocket;