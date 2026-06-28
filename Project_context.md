# Mini Online Judge

## Goal

Build a LeetCode-like Online Judge to learn:

* Backend Engineering
* System Design
* Job Queues
* Code Execution
* Deployment
* Docker
* Infrastructure Concepts

---

## Tech Stack

### Frontend

* React (Vite)
* React Router
* Axios
* Monaco Editor

### Backend

* Node.js
* Express
* MongoDB (Mongoose)

### Authentication

* Google OAuth

### Planned Infrastructure

* BullMQ
* Redis
* Docker

---

## User Roles

### USER

* Browse problems
* Open problem page
* Write code
* Run code
* Submit code
* View submission history

### ADMIN

* Create questions
* Edit questions
* Delete questions
* Manage test cases

---

## Planned Collections (basic version - already modified)

### User

* googleId
* name
* email
* avatar
* role

### Question

* title
* statement
* difficulty
* topic
* constraints
* examples
* timeLimit
* memoryLimit

### TestCase

* questionId
* input
* output
* isHidden

### Submission

* userId
* questionId
* code
* language
* status
* verdict
* executionTime
* memoryUsed
* compilerOutput

---

## Planned Verdicts

* AC
* WA
* TLE
* RE
* CE
* SYSTEM_ERROR

---

## Planned Statuses

* PENDING
* RUNNING
* COMPLETED

---

## Target Architecture

Frontend
↓
Express API
↓
MongoDB

Submission
↓
BullMQ Queue
↓
Redis
↓
Judge Worker
↓
Compiler
↓
Test Cases
↓
Verdict

---

## Future Features

 Docker-based execution
 Multiple languages
 Contest support
 Leaderboards
 Distributed workers
 Real-time updates
