# Data Flow

While architecture documentation describes the components that make up the system, this document traces execution and movement. It tracks the physical and virtual transitions of a single command payload as it crosses boundaries between runtimes, libraries, kernel spaces, and network hardware.

To illustrate these transitions, the step-by-step path below traces the transmission of the project’s default configuration parameters:
*   **Device ID**: `7` (Binary representation: `0b111`)
*   **Is Active**: `true` (Mapped to bit 3: `0b00001000` or `8`)
*   **Is Hard Reboot**: `true` (Mapped to bit 4: `0b00010000` or `16`)
*   **Target Payload Value**: `7 | 8 | 16 = 31` (Hexadecimal: `0x1F`, Binary: `0b00011111`)

---

## The Transaction Journey Map

This diagram organizes the boundaries crossed by the payload during its lifecycle, divided into client-side software layers, system hardware interfaces, and server-side software layers.

```text
============================= USER SPACE (CLIENT) =============================
  1. User Constants  -->  2. Human-Readable  -->  3. Bitwise Compaction (V8)
  (ClientApp.js)            Parameters              (payloadCompressor.js)
                                                              │
                                                              ▼
  5. libuv Queue     <--  4. 1-Byte JS Buffer <───────────────┘
  (C++ Bindings)
        │
============================ KERNEL SPACE (CLIENT) ============================
        ▼
  6. Socket Buffer (sk_buff)  -->  Appends UDP Header (8B) + IP Header (20B)
===============================================================================
                                      │
                                      ▼
=============================== PHYSICAL LAYER ================================
  7. NIC TX Ring Buffer  -->  Physical Media (Copper / Wireless RF)  -->  RX Ring
===============================================================================
                                                                           │
                                                                           ▼
============================ KERNEL SPACE (SERVER) ============================
  8. Socket Receive Buffer  <--  Strips Headers  <──  Validates Frame/Checksum
===============================================================================
        │
        ▼
============================= USER SPACE (SERVER) =============================
  9. libuv Event Loop  -->  10. Buffer Extraction  -->  11. Bitmask Decoding
  (C++ Network IO)           (Buffer[0])                 (packetDecoder.js)
                                                                │
                                                                ▼
                                                        12. JS Command Object
                                                        (Server Output)
```

---

## Detailed Step-by-Step Data Journey

### Step 1: Input Configuration
The lifecycle begins in the client user space within `ClientApp.js`. The configurations are represented as high-level JavaScript constants:
*   `DEVICE_ID = 7` (Type: Number, stored as a double-precision float in V8 memory)
*   `IS_ACTIVE = true` (Type: Boolean)
*   `IS_HARD_REBOOT = true` (Type: Boolean)

### Step 2: Human-Readable Parameters
The constants are passed as arguments to `runClientApp()`, which executes `payloadCompressor(DEVICE_ID, IS_ACTIVE, IS_HARD_REBOOT)`. At this point, the three parameters occupy separate memory addresses on the client application call stack.

### Step 3: Bitwise Compaction
Inside `payloadCompressor.js`, the JavaScript engine performs bitwise computations. 
1.  The Boolean values `isActive` and `isHardReboot` are coerced to integers (`1` or `0`) using bitwise OR (`| 0`).
2.  Ternary statements map the coerced values to bit masks: `isActive` maps to `ACT_VAL` (`0b00001000`), and `isHardReboot` maps to `REB_VAL` (`0b00010000`).
3.  The engine executes `payload = deviceId | configIsActive | configIsHardReboot`. In CPU registers, this evaluates to `7 | 8 | 16`.
4.  The output is a single integer value: `31`.

### Step 4: JavaScript Buffer Serialization
The client application passes the integer payload `31` to `initClientSocket.js`. 
1.  The statement `Buffer.from([payload])` is executed.
2.  The Node.js runtime allocates a 1-byte raw memory space outside the V8 heap.
3.  The value `31` (stored as the binary byte `00011111`, which represents hexadecimal `0x1F`) is written directly to this 1-byte memory address.

### Step 5: Runtime Socket Hand-off
The application invokes `client.send(buff, D_PORT, D_IP, callBack)`.
1.  The Node.js `dgram` module passes the raw memory address of the buffer to its internal C++ binding layer (`UDPWrap`).
2.  `UDPWrap` invokes libuv, the underlying asynchronous platform abstraction layer.
3.  libuv enqueues the request and prepares to execute the network write operation on the system socket.

### Step 6: Client Kernel Space Hand-off
The runtime leaves user space and enters kernel space through a system call (typically sendto).
1. The operating system kernel allocates a network packet buffer structure (such as sk_buff in Linux) with enough headroom for headers.
2. The payload byte (0x1F) is copied into the data section of the packet buffer.
3. The kernel network stack prepends the protocol headers by wrapping them around the payload:
   * **UDP Header**: 8 bytes (containing source port, destination port 8888, packet length, and checksum).
   * **IPv4 Header**: 20 bytes (containing source IP, destination IP, packet flags, and TTL).
   * **Ethernet Frame Header & Trailer**: 18 bytes (destination and source MAC addresses, EtherType, and Frame Check Sequence).
4. The total size of the network frame on the wire becomes 47 bytes (1 byte payload + 46 bytes header/trailer overhead).

### Step 7: Physical Transit
The network driver initiates the physical transmission process.
1.  The network driver adds a packet descriptor pointing to the socket buffer into the TX ring buffer (located in system RAM).
2.  The NIC reads this descriptor and pulls the actual packet payload from system RAM directly into its own internal hardware FIFO queue via Direct Memory Access (DMA).
3.  The NIC physical layer (PHY) serializes the frame data into physical signals (voltages on copper wires or radio frequency pulses over wireless media).
4.  The physical signals travel across network routers and switches to reach the physical layer of the server NIC.

### Step 8: Server NIC and Kernel Ingestion
The server hardware and operating system receive and process the transmission.
1. The server NIC physical layer reconstructs the digital frame from physical signals and writes the frame directly into system RAM via DMA, updating an entry in the RX ring buffer.
2. The NIC issues an initial hardware interrupt to the server CPU to alert the kernel that data has arrived.
3. The server kernel-level driver handles the interrupt, transitions to NAPI polling mode to disable further interrupts, and validates the Ethernet frame integrity using the Frame Check Sequence (FCS).
4. The kernel network stack decapsulates the packet from the bottom up:
   * Strips the Ethernet frame.
   * Strips the IPv4 header and verifies target routing.
   * Strips the UDP header, extracts the payload byte 0x1F, and queues it inside the receive buffer associated with the socket bound to port 8888.

### Step 9: Server Application Notification
The server application is alerted to the queued data.
1. The libuv event loop, monitoring the server socket file descriptor via system-specific event notification APIs (such as epoll on Linux or kqueue on macOS), detects that the descriptor is ready for reading.
2. libuv executes the read operation, writing the incoming data into a pre-allocated internal buffer pool in the server's user space, and creates a lightweight Buffer instance acting as a sliced view over the received byte 0x1F.
3. The server's dgram module emits the 'message' event, passing this buffer view and a remote address metadata object.
4. The callback in initServerSocket.js is fired, receiving the payload slice as the parameter msg.

### Step 10: Server Buffer Extraction
Inside the callback, the server application extracts the raw value from the received buffer.
1.  `const packet = msg[0]` is executed.
2.  This direct index access reads the raw byte from the non-V8 heap memory pool via the Buffer's internal pointer.
3.  The variable `packet` is loaded into V8 execution memory as the integer `31`.

### Step 11: Bitwise Extraction and Decompression
The server calls `packetDecoder(packet)`. Inside `packetDecoder.js`, bitmasks are applied to isolate the parameters:
1.  **Device ID**: `packet & 0b00000111` evaluates to `31 & 7`. The output is the integer `7`.
2.  **Is Active**: `packet & 0b00001000` evaluates to `31 & 8`. Since the result is `8` (a non-zero truthy value), the ternary statement evaluates to the Boolean `true`.
3.  **Is Hard Reboot**: `packet & 0b00010000` evaluates to `31 & 16`. Since the result is `16` (a non-zero truthy value), the ternary statement evaluates to the Boolean `true`.

### Step 12: Reconstructed Structured Object
The isolated properties are mapped to a standard JavaScript object:
```javascript
const command = {
    deviceId: 7,
    isActive: true,
    isHardReboot: true
};
```
This object is stored on the server's V8 heap and output to the standard terminal stream, completing the data flow cycle.

---

## Data Transformation Matrix

The following matrix summarizes the state, size, and location of the payload at each phase of the network transaction:


| Phase | Boundary / Context | Data Representation | Allocation Size | Values Stored |
| :--- | :--- | :--- | :--- | :--- |
| **Input** | Client User Space (V8 Stack) | Multiple JavaScript variables | V8 variable stack | `7, true, true` |
| **Compression** | Client User Space (V8 Register) | Single binary-packed integer | CPU Register / V8 Heap | `31` (`0b00011111`) |
| **Serialization** | Client User Space (External Heap) | Raw Node.js Buffer | 1 Byte | `0x1F` |
| **System Queue** | Client User Space (libuv runtime) | libuv work request / pointer | Address Pointer | Pointer to Buffer address |
| **Encapsulation** | Client Kernel Space | `sk_buff` / Packet buffer | `~47 Bytes` (incl. Headers) | `0x1F` + UDP, IP, MAC headers |
| **Transmission** | Physical Medium | Physical waveforms (Voltages / RF) | N/A (Streaming bits) | Binary serialization of frame |
| **Decapsulation** | Server Kernel Space | Operating system socket queue | `~47 Bytes` (Full retained frame) | `0x1F` + UDP, IP, MAC headers |
| **Reception** | Server User Space (External Heap) | Node.js Buffer pool slice | Slices a pre-allocated pool | `0x1F` |
| **Decompression**| Server User Space (V8 Register) | Bitwise mask evaluation | CPU Register / V8 Heap | `7, true, true` |
| **Output** | Server User Space (V8 Heap) | JavaScript structured Object | Dynamic V8 Object | `deviceId: 7, isActive: true, isHardReboot: true` |