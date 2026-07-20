# System Overview

The OneByte Protocol project is a practical "HAND-CODED" implementation of a highly compacted, custom binary application-layer protocol running over User Datagram Protocol (UDP).

**Note:** This source implementation was brainstormed and written(Hand-coded) manually by Enoch Twumasi as a hands-on exploration of binary protocol design, UDP communication, and systems concepts. AI tools were not used to generate the implementation.

The system encodes multi-field application state into a single-byte payload, transmits it across a network, and decodes it back into an actionable data object on the receiving side. By utilizing raw bitwise operations instead of standardized string serialization formats, the system demonstrates how application-level overhead can be minimized.

---

## 1. The Engineering Problem

Modern software systems rely heavily on text-based serialization formats such as JSON, XML, or YAML to exchange data between nodes. While human-readable formats simplify debugging and development, they introduce significant technical costs:

*   **Size Overhead**: A simple configuration schema containing a device identifier, an operational state, and a reboot flag represented in JSON can easily exceed 50 bytes of raw ASCII character data.
*   **Parsing Overhead**: Text-based parsers must ingest string data, perform lexical analysis, and allocate memory structures dynamically.
*   **Resource Depletion**: In resource-constrained environments—such as Internet of Things (IoT) devices, embedded microcontrollers, or remote telemetry systems—memory, processing power, battery capacity, and network bandwidth are strictly limited. 

On low-power wide-area networks (LPWANs) or metered cellular connections, transmitting unnecessary metadata leads to higher operational costs, decreased battery life, and increased packet collisions.

---

## 2. Design Decisions & Trade-Offs

### Binary Packing vs. Textual Serialization
To address the overhead of text-based formats, the OneByte Protocol compresses three configuration values into a single 8-bit integer (1 byte). 

*   **JSON Format (Uncompressed)**:
    ```json
    {"deviceId":7,"isActive":true,"isHardReboot":true}
    ```
    Size: 51 bytes (excluding whitespace or framing).
*   **OneByte Protocol Format (Compressed)**:
    ```text
    0b00011111 (Decimal: 31)
    ```
    Size: 1 byte.

This represents a bandwidth reduction of over 98%. The trade-off is readability: the payload is no longer human-readable in transit and requires strict, predetermined bit-level specifications on both client and server nodes to be interpreted correctly.

### UDP vs. TCP
The transport layer uses UDP rather than Transmission Control Protocol (TCP). This choice eliminates the transmission overhead associated with TCP:
*   No multi-packet handshakes (SYN, SYN-ACK, ACK) to establish or terminate connections.
*   No transmission of keep-alive packets or continuous session state management.
*   Smaller transport header size (8 bytes for UDP versus a minimum of 20 bytes for TCP).

For unidirectional telemetry and command reporting where occasional packet loss is acceptable, UDP provides the minimum possible network footprint.

---

## 3. High-Level System Components

The project is split into two independent applications, representing the transmitter and receiver nodes:

```text
+------------------------------------+          +------------------------------------+
|           OneByteClient            |          |           OneByteServer            |
|                                    |          |                                    |
| +--------------------------------+ |          | +--------------------------------+ |
| |        ClientApp.js            | |          | |        ServerApp.js            | |
| | (Configures device state)      | |          | | (Starts the socket listener)   | |
| +---------------+----------------+ |          | +---------------+----------------+ |
|                 |                  |          |                 ^                  |
|                 v                  |          |                 |                  |
| +--------------------------------+ |          | +---------------+----------------+ |
| |     payloadCompressor.js       | |          | |      initServerSocket.js       | |
| | (Bitwise packing to 1 byte)    | |          | | (Binds UDP 8888, receives msg) | |
| +---------------+----------------+ |          | +---------------+----------------+ |
|                 |                  |          |                 |                  |
|                 v                  |          |                 v                  |
| +--------------------------------+ |  Network | +---------------+----------------+ |
| |      initClientSocket.js       | +--------->| |        packetDecoder.js        | |
| | (Sends 1-byte UDP datagram)    | |  (UDP)   | | (Bitwise unpacking to object)  | |
| +--------------------------------+ |          | +--------------------------------+ |
+------------------------------------+          +------------------------------------+
```

### OneByteClient
The client acts as the data producer. It executes the following pipeline:
1.  **Ingestion**: Receives raw configurations (device ID, active state, boot type) from the execution script (`ClientApp.js`).
2.  **Compression**: Directs parameters to `payloadCompressor.js`, which uses bitwise operators to map the variables to specific bit positions in an 8-bit integer.
3.  **Transmission**: Hands the integer to `initClientSocket.js`, which wraps the byte in a Node.js `Buffer` object and transmits it as a single-byte UDP payload to port `8888`.

### OneByteServer
The server acts as the data consumer. It remains active to process incoming payloads:
1.  **Listening**: The script `initServerSocket.js` binds to UDP port `8888` on all network interfaces (`0.0.0.0`) and listens for incoming datagrams.
2.  **Extraction**: Upon receiving a message, the server extracts the first byte (`Buffer[0]`) from the network buffer.
3.  **Decoding**: The byte is passed to `packetDecoder.js`, which applies bitwise masks to isolate and reconstruct the original configuration variables as a JavaScript object.

**Note:** In this implementation, the decoded byte is reconstructed into a JavaScript object to demonstrate that the transmitted bit pattern represents meaningful structured data rather than a random value. In resource-constrained environments such as IoT devices, this final object reconstruction may not be necessary; systems can often operate directly on the decoded fields to reduce memory and processing overhead.
---

## 4. High-Level Data Flow

The following sequence details the transformation and transport of application data from client configuration to server-side reconstruction:

```text
  User Configuration Input
  (deviceId: 7, isActive: true, isHardReboot: true)
             │
             ▼
  [Client] payloadCompressor.js
  (Bitwise OR operations and boolean coercion)
             │
             ▼
  1-Byte Integer Payload (Value: 31 / 0b00011111)
             │
             ▼
  [Client] initClientSocket.js
  (Constructs 1-byte Node.js Buffer and writes to UDP socket)
             │
             ▼
  Operating System Network Stack
  (Appends UDP, IPv4, and Ethernet frames)
             │
             ▼
  Physical Network Media (Ethernet / Wi-Fi)
             │
             ▼
  Operating System Network Stack (Server Node)
  (Strips network frames, places payload in socket queue)
             │
             ▼
  [Server] initServerSocket.js
  (Fires 'message' callback, extracts Buffer[0])
             │
             ▼
  [Server] packetDecoder.js
  (Applies bitmasks and translates bits back to values)
             │
             ▼
  JavaScript Command Object Output
  ({ deviceId: 7, isActive: true, isHardReboot: true })
```

---

## 5. Repository Layout

The codebase is organized cleanly to maintain a strict separation of concerns between client operations, server operations, and documentation:

```text
OneByte-Protocol/
│
├── OneByteClient/                  # Client codebase
│   ├── ClientApp.js                # App entry point and user inputs
│   ├── payloadCompressor.js        # Compresses states into a single byte
│   └── initClientSocket.js         # Handles UDP socket creation and delivery
│
├── OneByteServer/                  # Server codebase
│   ├── ServerApp.js                # App entry point
│   ├── initServerSocket.js         # Binds UDP socket, listens for messages
│   └── packetDecoder.js            # Unpacks the received byte into an object
│
├── docs/                           # Project documentation handbook
│   ├── README.md                   # Master index / Table of Contents
│   ├── architecture/               # High-level design and structure
│   ├── protocol/                   # Detailed bit layouts and packing mechanics
│   ├── networking/                 # Network-layer mechanics and protocols
│   ├── internals/                  # Operating system, V8, and libuv mechanics
│   ├── walkthroughs/               # Operational guides and extension tutorials
│   └── diagrams/                   # System architectural visual assets
│
└── README.md                       # Repository entrance file
```

---

## 6. Design Philosophy

The OneByte Protocol project is built upon the principle of **mechanical sympathy**—designing software with an explicit awareness of the underlying systems, hardware, and networks that execute it. 

Instead of treating the software runtime, execution environment, and operating system as opaque abstractions, this codebase and its corresponding documentation are designed to trace data step-by-step through every physical and virtual layer. Understanding how a single line of JavaScript translates into bit-level alterations, moves through the Node.js C++ bindings, crosses the operating system kernel, and physically pulses across a network interface controller is the core goal of this system.
```