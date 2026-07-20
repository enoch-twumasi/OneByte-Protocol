# Client Architecture

The `OneByteClient` application acts as the data producer for the OneByte Protocol. Its sole responsibility is to translate human-readable configuration states into a highly compacted binary format and transmit that payload to a receiving system. 

Unlike long-running daemon processes, the client is designed as a short-lived execution pipeline. It ingests input, compresses data, executes a single network write, and terminates.

---

## Module Relationships

The client architecture is divided into three distinct files to strictly separate orchestration, data transformation, and network I/O.

```text
[ Configuration State ]
         │
         ▼
[ ClientApp.js ]
         │
    (Delegates)
         │
         ▼
[ payloadCompressor.js ]  ──(Returns Integer)──┐
                                               │
                                               ▼
[ initClientSocket.js ] <──(Passes Integer)────┘
         │
         ▼
[ Network Interface ]
```

### 1. `ClientApp.js` (The Orchestrator)
This is the main entry point of the application. It acts as the controller, defining the initial state and determining the sequence of operations. It imports both the compression utility and the socket module, acting as the bridge between pure data logic and system side-effects.

### 2. `payloadCompressor.js` (The Transformer)
This module contains a single, pure function. It is completely isolated from the network layer. It accepts the configuration parameters, performs the necessary calculations to map those values into a constrained binary space, and returns a standard integer.

### 3. `initClientSocket.js` (The Network Interface)
This module handles all operating system boundary interactions. It has no knowledge of how the integer was generated or what parameters it represents. Its only responsibilities are mapping the integer into a physical memory buffer, requesting an IPv4 UDP socket from the runtime, and dispatching the payload across the network.

---

## Execution Pipeline

The client executes a linear sequence of events for every transaction.

### Phase 1: User Input
Execution begins in `ClientApp.js`, where the intended system state is defined through standard JavaScript variables (`DEVICE_ID`, `IS_ACTIVE`, `IS_HARD_REBOOT`). These variables represent the human-readable intent of the command. The orchestrator encapsulates these values and initiates the process by passing them as arguments to the compression function.

### Phase 2: Payload Creation
Control shifts to `payloadCompressor.js`. The module accepts the distinct variables and evaluates them against predefined constants. It coerces boolean states into numerical values and assigns each parameter to a specific position within an 8-bit space. The function returns a single integer that entirely encapsulates the requested configuration.

For mathematical and bitwise specifics on how this integer is built, see [Encoding](../protocol/Encoding.md).

### Phase 3: Socket Initialization and Transmission
The orchestrator receives the compressed integer and immediately passes it to `initClientSocket.js`. 

In this final phase, the system translates the JavaScript integer into a raw physical format by writing it to a 1-byte Node.js `Buffer`. The module instantiates a UDP socket, points it at a hardcoded destination IP address and port, and issues a non-blocking send command. 

A callback function is registered to monitor the outcome of the transmission. Once the runtime confirms that the system network stack has accepted the packet (or if a system error occurs), the callback triggers and explicitly closes the socket instance. This step releases the file descriptor back to the operating system and allows the client application process to terminate gracefully.

For details on the physical networking parameters and UDP mechanics, see [Client-Server Communication](../networking/ClientServerCommunication.md).

---

## Design Principles

The primary architectural decision in the client is the strict boundary between pure logic and system I/O.

By isolating the compression logic inside `payloadCompressor.js`, the transformation algorithm can be executed, verified, and debugged in a vacuum. It does not require an active network interface, a valid target IP address, or port availability to operate. 

Similarly, the network module only requires an integer payload. This decouples the network transmission lifecycle from the application logic, allowing developers to expand the protocol or change the compression schema entirely without altering how the socket interacts with the operating system.