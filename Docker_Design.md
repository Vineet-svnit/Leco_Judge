# Docker Design Notes for Online Judge

## Why Docker?

User-submitted code is untrusted.

Examples:

```cpp
while(true){}
```

```cpp
system("rm -rf /");
```

Running such code directly on the worker machine is unsafe.

Docker provides an isolated sandbox where code can be compiled and executed safely.

---

# Core Docker Concepts

## Image

Think:

```text
Blueprint
Template
Class
```

Examples:

```text
Ubuntu Image
Redis Image
GCC Image
```

An image is not running.

---

## Container

Think:

```text
Running Instance
Object
```

Examples:

```text
Ubuntu Container
Redis Container
```

Created from an image.

Relationship:

```text
Image
  ↓
Container
```

Similar to:

```text
Class
  ↓
Object
```

---

## Process

A container is NOT an operating system.

A container runs one or more processes.

Example:

```text
Container
├── g++
├── bash
└── solution
```

The container remains alive while its main process remains alive.

---

## Volume / Mount

Used to share files between host machine and container.

Example:

```text
Worker Machine
    ↓
solution.cpp
    ↓
Docker Container
```

The worker generates source files and the container accesses them through mounts.

---

# Current Execution Design

## One Container Per Submission

Current preferred design:

```text
Submission
    ↓
Create Container
    ↓
Compile
    ↓
Run Testcases
    ↓
Destroy Container
```

Reasons:

* Simpler implementation
* Lower overhead
* Compilation performed once
* Container startup cost paid once

---

# Rejected Design

## One Container Per Testcase

Example:

```text
Container
↓
Compile
↓
Run TC1
↓
Destroy

Container
↓
Compile
↓
Run TC2
↓
Destroy
```

Problems:

* Excessive container creation
* Excessive compilation
* Significant performance overhead

---

# Compile + Execute Strategy

Current preferred design:

```text
Container
↓
Compile
↓
If CE → Stop
↓
Execute Testcases
↓
Destroy Container
```

Compilation and execution happen inside the same container.

Reason:

If compilation and execution are split into separate containers:

```text
Container A
↓
Compile

Container B
↓
Execute
```

the compiled binary must somehow be transferred between containers.

This introduces unnecessary complexity.

---

# Testcase Isolation

Important realization:

Container isolation and testcase isolation are different concepts.

Current preferred design:

```text
1 Container Per Submission
1 Process Per Testcase
```

Example:

```text
Container
↓
Compile Once

Process #1
Run TC1

Process #2
Run TC2

Process #3
Run TC3
```

Reason:

Each testcase starts with a fresh program state.

Avoids:

* Global variable leakage
* Static variable leakage
* Memory state persistence

No manual resetting is required because the operating system cleans up process memory after process termination.

---

# Resource Limits

Implemented.

Docker enforces:

```text
Memory Limit  →  --memory=<N>m  +  --memory-swap=<N>m
CPU Limit     →  --cpus=1
Network       →  --network=none
```

Memory swap is set equal to memory limit to disable swap completely. This ensures the Docker OOM killer fires at exactly the memory limit, giving a clean exit code 137 which the worker detects as MLE.

Examples:

```text
256 MB RAM
1 CPU
```

Used to detect:

```text
MLE  →  exit code 137 (SIGKILL from OOM killer)
TLE  →  process timeout
RE   →  non-zero exit (other than 137)
```

---

# Worker Responsibilities

Implemented (submitWorker, runWorker, tcGenWorker).

Judge Worker:

```text
Receive Job
↓
Load data from MongoDB
↓
Build final source (replace LECO_USER_CODE)
↓
Write source to host temp dir
↓
Create Container (gcc:13, mounted temp dir)
↓
Compile (g++ -O2)
↓
Execute Testcases (one process per input)
↓
Collect outputs / detect TLE / MLE / RE
↓
Compare outputs (using question.comparatorType)
↓
Generate Verdict
↓
Save verdict to MongoDB (submit) or return inline (run)
↓
Destroy temp dir
```

Docker is owned and controlled entirely by the Judge Worker via Node.js `child_process.execFile`.

---

# Important Mental Model

Incorrect:

```text
Container = Operating System
```

Better:

```text
Container = Isolated Environment
             running processes
```

Examples:

```text
Container
├── g++
├── solution
└── helper processes
```

The container is the sandbox.

Processes perform the actual work.

---

# Future Learning Topics

Covered / in use:

* docker pull  ✅
* docker run   ✅
* Mounts / Volumes  ✅
* Resource Limits   ✅

Still to explore practically:

* docker ps
* docker stop
* docker rm
* Dockerfile (currently using pre-built gcc:13 image directly)
* Multi-stage builds
