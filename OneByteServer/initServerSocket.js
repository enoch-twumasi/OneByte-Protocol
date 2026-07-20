/*
This node.js udp4 socket process receives 1 byte (8 bit) integer and decodes it into
the complete message the client packed into 1 byte packet to save bandwidth etc.
*/

const dgram = require('dgram');
const packetDecoder = require('./packetDecoder')

 //Server's PORT and IP
    const SERVER_PORT = 8888;
    const SERVER_IP = '0.0.0.0';


function initServerSocket(){
    const server = dgram.createSocket('udp4');


    // Listener for Binding Binding Event
    server.on('listening', () => {
        const address = server.address();

        console.log(`Server successfully bound to Address: ${address.address} and Port: ${address.port}`)
    });


    //Listener for Packet Arrival
    server.on('message',(msg, rinfo) => {
        const packet = msg[0];

        console.log(`Packet received from Address: ${rinfo.address} with Port: ${rinfo.port}`);
       
        console.log(`Your Packet is: ${packet}`);

        //Upon receiving packet this call back runs. Therefore upon receiving a packet we want to 
        // immediately decode that single byte integer packet into
        // the complete message client intended to pass on.

        packetDecoder(packet);

    });


    //Listener for error feedback.
    server.on('error', (err) => {
        console.error(`Server error:\n${err.stack}`);

        server.close();
    });



    server.bind(SERVER_PORT, SERVER_IP );
};

module.exports = initServerSocket;