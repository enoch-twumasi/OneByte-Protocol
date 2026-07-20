# Server Architecture

The `OneByteServer` application acts as the data consumer for the OneByte Protocol. In contrast to the short-lived, sequential execution model of the client, the server operates as a persistent daemon. Its primary responsibility is to attach to the operating system's network stack, wait asynchronously for incoming packets, extract the compacted binary payloads, and translate them back into structured application state.

---

## Module Relationships

The server architecture mirrors the client but processes data in reverse, moving from the physical network boundary upward into the application logic.

```text
[ Network Interface ]
         │
         ▼
[ initServerSocket.js ] ──(Passes Integer)───┐
         │                                   │
    (Managed by)                             ▼
         │                        [ packetDecoder.js ]
[ ServerApp.js ]                             │
                                      (Returns Object)
                                             │
                                             ▼
                                  [ Command Object ]
```

### 1. `ServerApp.js` (The Entry Point)
This is the execution root of the application. Its sole responsibility is to import and invoke the socket initialization process, effectively starting the server daemon. 

### 2. `initServerSocket.js` (The Network Interface)
This module acts as the boundary between the Node.js runtime and the operating system. It requests a UDP socket, binds it to specific network interfaces, and establishes the event-driven lifecycle. It manages all I/O events, error handling, and the extraction of the raw byte from the incoming network buffer. 

### 3. `packetDecoder.js` (The Transformer)
This module contains the pure business logic required to interpret the payload. It is isolated from the network layer, accepting only a raw integer as input. It applies the necessary decompression algorithms to reconstruct the exact configuration state intended by the client.

---

## Execution & Event Flow

Because the server must wait for external network events, it does not execute sequentially. Instead, it relies on an asynchronous event loop divided into four distinct phases.

### Phase 1: Initialization and Binding
Execution begins in `ServerApp.js`, which immediately calls `initServerSocket()`. The application initializes a Node.js UDP wrapper object and requests the operating system to create a network socket bound to port `8888` across all available network interfaces via the `0.0.0.0` address. 

The operating system manages the physical and transport layer routing. When the network stack receives an incoming UDP packet, it inspects the destination port number. Finding port `8888`, the operating system identifies the specific socket descriptor owned by the `OneByteServer` process and routes the packet data into that socket's receive queue.

For detailed networking behavior, see [Client-Server Communication](../networking/ClientServerCommunication.md).

### Phase 2: The Listening Loop
Once the socket is bound, the module registers three primary event listeners:
*   `'listening'`: Confirms the socket successfully attached to the port.
*   `'error'`: Catches hardware or kernel-level networking faults, logging the error and safely closing the socket to prevent hanging processes and file descriptor leaks.
*   `'message'`: Defines the behavior for incoming data.

After registering these listeners, the synchronous execution finishes. The Node.js process remains alive, yielding control to the internal event loop to wait for incoming traffic.

### Phase 3: Packet Reception
When the operating system network stack identifies an incoming UDP datagram matching the bound port, it alerts the Node.js runtime, which in turn emits the 'message' event. 

The callback function for this event receives two parameters: the raw network data wrapped in a Node.js Buffer object, and a metadata object containing the sender's IP and port. The server immediately extracts the target payload by reading the first index of the buffer (msg[0]), loading that specific byte into V8 execution memory as a standard JavaScript integer.

### Phase 4: Decoding and Reconstruction
The extracted integer is immediately passed to `packetDecoder.js`. This function processes the integer using mathematical bitmasks to evaluate the state of specific bits. It uses these evaluated bits to recreate the original configuration parameters. 

The function constructs and returns a standard JavaScript object containing the fully restored command configuration (e.g., Device ID and reboot flags). At this point, the data flow is complete, and the server returns to Phase 2, waiting for the next packet.

For the mathematical mechanics of payload extraction, see [Decoding](../protocol/Decoding.md).

---

## Design Principles

The defining architectural principle of the server is the strict isolation of system I/O from pure business logic.

The network module (`initServerSocket.js`) handles physical boundaries, asynchronous callbacks, and system error states, but it does not know what the data represents. It only knows how to extract a byte and pass it forward. 

Conversely, the decoding module (`packetDecoder.js`) has no awareness of network origins, IP addresses, or buffers. Because it is a pure function, the decoding logic can be unit-tested entirely independently of the network stack. This separation ensures that if the transport layer changes from UDP to another protocol, or if the data source changes from a network socket to a local file, the decoding logic remains completely unmodified.