# OneByte Protocol

A hand-coded educational project demonstrating a compact custom binary application-layer protocol over User Datagram Protocol (UDP). The project explores how multiple application state values can be encoded into a single byte using JavaScript bitwise operators, transmitted between two Node.js applications, and reconstructed on the receiving side.

**Note:** This source implementation was brainstormed and written (hand-coded) manually by Enoch Twumasi as a hands-on exploration of binary protocol design, UDP communication, and systems concepts. AI tools were not used to generate the implementation.

---

# Why This Project Exists

Modern software commonly exchanges information using text-based formats such as JSON, XML, or YAML. While these formats are easy for humans to read, they introduce additional bytes, parsing overhead, and memory allocations that are unnecessary for many communication scenarios.

The OneByte Protocol demonstrates an alternative approach: representing multiple application-level values inside a single byte through explicit bit-level encoding. Although intentionally simple, the project reflects techniques commonly found in embedded systems, Internet of Things (IoT) devices, industrial controllers, robotics, and other resource-constrained environments where bandwidth, memory, processing power, and battery life are valuable resources.

The objective of this repository is not to replace modern serialization formats, but to demonstrate the engineering principles behind compact binary communication while providing a practical introduction to networking and systems programming concepts.

---

# What This Project Demonstrates

* Designing a custom binary application-layer protocol
* Packing multiple values into a single byte using JavaScript bitwise operators
* Decoding binary payloads back into meaningful application data
* Building UDP client and server applications with Node.js
* Separating protocol logic from networking logic through modular design
* Understanding the complete lifecycle of a packet from JavaScript to the operating system and back
* Learning networking fundamentals through practical implementation rather than abstraction

---

# Project Architecture

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
| | (Bitwise packing to 1 byte)    | |          | | (Receives UDP datagrams)       | |
| +---------------+----------------+ |          | +---------------+----------------+ |
|                 |                  |          |                 |                  |
|                 v                  |  UDP     |                 v                  |
| +--------------------------------+ |--------->| +--------------------------------+ |
| |      initClientSocket.js       | |          | |       packetDecoder.js         | |
| | (Sends 1-byte UDP payload)     | |          | | (Bitwise reconstruction)       | |
| +--------------------------------+ |          | +--------------------------------+ |
+------------------------------------+          +------------------------------------+
```

---

# Repository Structure

```text
OneByte-Protocol/
│
├── OneByteClient/
│   ├── ClientApp.js
│   ├── payloadCompressor.js
│   └── initClientSocket.js
│
├── OneByteServer/
│   ├── ServerApp.js
│   ├── initServerSocket.js
│   └── packetDecoder.js
│
├── docs/
│   ├── architecture/
│   ├── protocol/
│   ├── networking/
│   ├── internals/
│   ├── walkthroughs/
│   └── diagrams/
│
├── README.md
├── LICENSE
└── .gitignore
```

---

# Documentation

The repository documentation is organized as an engineering handbook rather than a collection of isolated notes.

| Section          | Purpose                                                                                                                                       |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Architecture** | Explains the overall system design, responsibilities, and data flow.                                                                          |
| **Protocol**     | Documents the binary packet specification, bit layouts, encoding, and decoding process.                                                       |
| **Networking**   | Covers UDP fundamentals, client-server communication, and packet traversal.                                                                   |
| **Internals**    | Explores the runtime beneath Node.js, including libuv, operating system mechanics, buffers, and packet movement through the networking stack. |
| **Walkthroughs** | Practical guides for running, understanding, and extending the project.                                                                       |
| **Diagrams**     | Visual representations of the system architecture, protocol layout, and packet journey.                                                       |

---

# Quick Start

## 1. Clone the repository

```bash
git clone https://github.com/enoch-twumasi/OneByte-Protocol.git
```

## 2. Navigate into the project

```bash
cd OneByte-Protocol
```

## 3. Start the server

```bash
node OneByteServer/ServerApp.js
```

## 4. Run the client

```bash
node OneByteClient/ClientApp.js
```

The client compresses the configured application state into a single byte, transmits it over UDP, and the server reconstructs the original values from the received packet.

---

# Educational Focus

This project emphasizes understanding rather than memorization.

Rather than treating networking, Node.js, or binary communication as opaque abstractions, the accompanying documentation traces the journey of a single byte across multiple layers of the computing stack—from JavaScript bitwise operations, through Node.js and libuv, into the operating system kernel, across the network, and back into a running application.

The goal is to help readers develop accurate mental models of how software interacts with the systems beneath it.

---

# Intended Audience

This repository is intended for:

* Computer science students
* Software engineers
* JavaScript developers interested in systems programming
* Developers learning networking fundamentals
* Engineers exploring binary protocol design
* Anyone interested in understanding what happens beneath high-level APIs

---

# Project Status

This repository represents the initial implementation of the OneByte Protocol and serves as the foundation for future experimentation and learning. The emphasis is on correctness, clarity, and documenting the engineering concepts behind the implementation rather than building a production-ready communication framework.

---

# License

This project is released under the license provided in the `LICENSE` file.