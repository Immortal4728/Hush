<div align="center">

  <!-- Logo & Title -->
  <br />
  <h1 align="center"><b>🤫 H U S H</b></h1>
  <p align="center">
    <b>Zero-Persistence // Ephemeral Anonymous Communication Engine</b>
  </p>
  
  <p align="center">
    <i>"Conversations should be like whispers in the dark — once spoken, they fade into nothingness."</i>
  </p>

  <!-- Badges -->
  <p align="center">
    <a href="https://openjdk.org/"><img src="https://img.shields.io/badge/Java-21-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white" alt="Java 21" /></a>
    <a href="https://spring.io/projects/spring-boot"><img src="https://img.shields.io/badge/Spring_Boot-3.2.3-6DB33F?style=for-the-badge&logo=springboot&logoColor=white" alt="Spring Boot 3.2.3" /></a>
    <a href="https://react.dev/"><img src="https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black" alt="React 18" /></a>
    <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript 5.0" /></a>
    <a href="https://vitejs.dev/"><img src="https://img.shields.io/badge/Vite-5.0-646CFF?style=for-the-badge&logo=vite&logoColor=white" alt="Vite 5.0" /></a>
  </p>
  
  <p align="center">
    <a href="#-ideology--core-principles"><img src="https://img.shields.io/badge/Architecture-Zero_Persistence-00FFAA?style=for-the-badge&logo=shield&logoColor=black" alt="Zero Persistence" /></a>
    <a href="#-proven-performance--scalability"><img src="https://img.shields.io/badge/Load_Tested-1000+_Users-00F0FF?style=for-the-badge&logo=speedtest&logoColor=black" alt="1000+ Users Tested" /></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-0088FF?style=for-the-badge" alt="MIT License" /></a>
  </p>

  <!-- Quick Links Navigation -->
  <p align="center">
    <a href="#-ideology--core-principles"><b>Ideology</b></a> •
    <a href="#-key-capabilities"><b>Capabilities</b></a> •
    <a href="#-architecture"><b>Architecture</b></a> •
    <a href="#-quick-start"><b>Quick Start</b></a> •
    <a href="#-performance--scalability"><b>Performance</b></a> •
    <a href="#-security-architecture"><b>Security</b></a>
  </p>

  <br />
</div>

---

## 👁️ Ideology & Core Principles

In an era of ubiquitous data harvesting, persistent telemetry, and permanent digital footprints, **HUSH** provides a secure sanctuary for transient human connection. 

HUSH is architected around a single non-negotiable invariant: **Complete Ephemerality**.

> [!IMPORTANT]
> **ZERO DATABASE PERSISTENCE**
> 
> HUSH does not connect to PostgreSQL, MySQL, MongoDB, Redis, or any disk-backed storage. Message payloads and room states exist **exclusively in volatile RAM** and are permanently wiped when rooms expire or participants leave.

<br />

<table>
  <thead>
    <tr>
      <th width="30%" align="left">Pillar</th>
      <th width="70%" align="left">Architectural Guarantee</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td><b>🛡️ Zero Identity</b></td>
      <td>No accounts, passwords, emails, profiles, or tracking tokens required or collected.</td>
    </tr>
    <tr>
      <td><b>💨 Volatile Memory</b></td>
      <td>Rooms, queues, and message history reside purely in JVM volatile memory buffers.</td>
    </tr>
    <tr>
      <td><b>⏳ Enforced Lifecycle</b></td>
      <td>Strict Time-To-Live (TTL) timers auto-destruct rooms upon expiration or inactivity.</td>
    </tr>
    <tr>
      <td><b>🔒 Absolute Privacy</b></td>
      <td>Zero disk logging, zero payload capture, and zero third-party telemetry.</td>
    </tr>
  </tbody>
</table>

<br />

---

## ⚡ Key Capabilities

### 💬 1. Ephemeral Communication Channels
* **Direct 1-on-1 Rooms**: Capacity-capped private channels for direct dual-peer exchanges.
* **Group Rooms**: Multi-participant temporary rooms with customizable lifespans (30m, 60m, 180m).
* **Volatile History Buffer**: Active message history stored in RAM for present participants and completely destroyed on room closure.

### 🤝 2. Talk to a Stranger (Anonymous Matchmaking)
* **Instant Queue Pairing**: Atomic, lock-free queue matching that pairs available anonymous users in sub-milliseconds.
* **Race-Free Match Engine**: Concurrent queue mechanics ensuring two users are cleanly placed into a private direct room without duplicate pairing.
* **One-Click Re-pairing**: "Next Stranger" action immediately ends the current conversation and places the user back in queue for a new match.

### 🎨 3. Dual Engine UI/UX
* **Modern Messaging UI**: Sleek, accessible chat interface inspired by modern messaging apps with reactive typing cues and unread badges.
* **Retro VHS Cyberpunk Terminal**: Visual mode complete with scanlines, CRT glitch effects, dynamic radar sweeps, and sound feedback.
* **Hot-Swappable Viewports**: Seamlessly toggle between Modern and Terminal UI mid-conversation without breaking WebSocket sessions.

### 📊 4. System Observability & Telemetry
* **Real-Time Admin Dashboard**: Authenticated monitoring suite for tracking JVM heap, connection pools, and room metrics.
* **Zero-Storage Operational Metrics**: Lock-free atomic counters (`LongAdder`) capturing active connections, throughput, and latency without writing to disk.

<br />

---

## 🏗️ Architecture

HUSH operates as a high-throughput, single-instance JVM application engineered for microsecond frame delivery with minimal memory overhead.

```
                      ┌─────────────────────────────────────────┐
                      │            React 18 + Vite UI           │
                      │   (Modern Mode / Cyberpunk Terminal)    │
                      └────────────────────┬────────────────────┘
                                           │
                                           │ WSS (WebSockets) + REST
                                           ▼
                      ┌─────────────────────────────────────────┐
                      │          Spring Boot 3.2 Backend        │
                      │        (Java 21 / Embedded Tomcat)      │
                      └────────────────────┬────────────────────┘
                                           │
         ┌─────────────────────────────────┼─────────────────────────────────┐
         ▼                                 ▼                                 ▼
┌──────────────────┐             ┌──────────────────┐             ┌──────────────────┐
│   RoomService    │             │  Rate Limiter    │             │   Matchmaking    │
│ (In-Memory State)│             │ (Sliding Window) │             │ (Atomic Queue)   │
└──────────────────┘             └──────────────────┘             └──────────────────┘
```

 

<br />

---

## 🛠️ Tech Stack

<div align="center">

| Layer | Technologies & Libraries |
| :--- | :--- |
| **Backend** | Java 21 • Spring Boot 3.2.3 • Spring WebSocket • Apache Tomcat |
| **Frontend** | React 18 • TypeScript 5.0 • Vite 5.0 • Vanilla CSS Design Tokens • Lucide Icons |
| **Testing & Load** | JUnit 5 • Spring Boot Test • Node.js Native WebSocket Load Generator |

</div>

<br />

---

## 🚀 Quick Start

### Prerequisites
- **JDK 21** or higher
- **Node.js 20** or higher
- **Apache Maven 3.8+**

---

### Step 1: Clone Repository
```bash
git clone https://github.com/Immortal4728/Hush.git
cd Hush
```

### Step 2: Launch Backend Server
```bash
cd backend
mvn spring-boot:run
```
> Server runs on `http://localhost:8088`

### Step 3: Launch Frontend Application
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
> Application opens on `http://localhost:5173`

<br />

---

## ⚙️ Configuration Parameters

All system boundaries and operational limits can be customized via environment variables:

<details>
<summary><b>🔍 View Full Environment Variables Matrix</b></summary>

<br />

| Environment Variable | Application Property | Default | Description |
| :--- | :--- | :--- | :--- |
| `HUSH_MAX_WEBSOCKET_CONNECTIONS` | `hush.rate-limit.websocket.max-connections` | `1000` | Max simultaneous WebSocket clients |
| `HUSH_MESSAGE_RATE_LIMIT` | `hush.rate-limit.websocket.messages-per-second` | `10` | Max messages/sec per connection |
| `HUSH_MAX_MESSAGE_SIZE` | `hush.websocket.max-message-length` | `2000` | Maximum allowed character length per payload |
| `HUSH_MAX_MESSAGE_HISTORY` | `hush.room.max-history-messages` | `500` | Maximum messages retained in RAM per room |
| `HUSH_MAX_ROOM_PARTICIPANTS_GROUP` | `hush.room.group-max-participants` | `20` | Maximum user capacity in group rooms |
| `HUSH_ADMIN_USERNAME` | `hush.admin.username` | `admin` | Admin dashboard username |
| `HUSH_ADMIN_PASSWORD` | `hush.admin.password` | `adminpass` | Admin dashboard password |

</details>

<br />

---

## 📈 Performance & Scalability

HUSH has been benchmarked under heavy synthetic load to guarantee stability and ultra-low broadcast latency under concurrent connections.

> [!NOTE]
> **Benchmark System Specifications**: 16 vCPUs, 16GB RAM, Java 21 JVM (4GB Max Heap), Windows 11.

<br />

<div align="center">

### Benchmark Summary (1,000 Concurrent Users)

| Metric | Target / Result |
| :--- | :--- |
| **Concurrent WebSocket Connections** | **1,000 / 1,000 (100% Success)** |
| **Average Broadcast Latency** | **< 1.0 ms** |
| **P99 Broadcast Latency** | **< 1.0 ms** |
| **Peak JVM Heap Memory** | **154 MB** |
| **Message Loss / Errors** | **0.00%** |

</div>

<br />

<details>
<summary><b>📊 Detailed Load Test Tier Breakdown</b></summary>

<br />

| Users | Active Rooms | Connections | Total Broadcasts | Avg Latency | P95 Latency | P99 Latency | Peak Heap |
| ----: | -----------: | ----------: | ---------------: | ----------: | ----------: | ----------: | --------: |
| **100** | 27 | 100 / 100 | 3,784 | **< 1 ms** | **< 1 ms** | **< 1 ms** | 49 MB |
| **250** | 94 | 250 / 250 | 13,747 | **< 1 ms** | **< 1 ms** | **< 1 ms** | 64 MB |
| **500** | 227 | 500 / 500 | 35,984 | **< 1 ms** | **< 1 ms** | **< 1 ms** | 93 MB |
| **750** | 333 | 750 / 750 | 70,503 | **< 1 ms** | **< 1 ms** | **< 1 ms** | 154 MB |
| **1000** | 465 | 1000 / 1000 | 118,680 | **< 1 ms** | **< 1 ms** | **< 1 ms** | 154 MB |

</details>

<br />

---

## 🧪 Verification & Suite Execution

Run the automated test suites to verify system integrity:

```bash
# Backend Unit & Integration Suite (131 Tests)
cd backend && mvn test

# Frontend Production Build Verification
cd frontend && npm run build

# Automated Synthetic Load Generator
cd load-tests && node run_all_tests.js
```

<br />

---

## 🔒 Security Architecture

* 🛡️ **Session Security**: Admin authentication relies on BCrypt hashed credentials and `HttpOnly`, `SameSite=Strict` secure cookies.
* 🧹 **Sanitation Engine**: All incoming client message strings are sanitized and HTML-escaped before broadcasting to mitigate XSS threats.
* 🛑 **DDoS Mitigation**: Integrated token bucket / sliding-window rate limiters shield endpoints from connection flooding and message spamming.

<br />

---

## 📜 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

<br />

<div align="center">
  <p><b>HUSH Engine</b> • Engineered for Privacy, Speed, and Zero Footprint.</p>
  <a href="#top">⬆️ Back to Top</a>
</div>

