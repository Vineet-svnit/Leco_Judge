# Architecture Decisions & Design Notes

This file contains important design decisions, future plans, tradeoffs, and discussions made during development.

It is intended to help future contributors (including future AI assistants) understand why certain choices were made.

---

# Authentication

## Decision

Use Google OAuth instead of traditional email/password authentication.

## Reasoning

Benefits:

* Faster onboarding
* No password storage
* No password reset workflow
* Simpler user experience

Current user roles:

```text
USER
ADMIN
```

---

# Rich Question Authoring

## Decision

Use Quill Editor for question creation/editing.

## Reasoning

Questions require:

* Bold text
* Italics
* Lists
* Code blocks
* Rich formatting

Quill generates HTML which is stored directly in MongoDB.

Example:

```html
<p>Given an integer array <strong>nums</strong>...</p>
```

During rendering Quill is NOT required.

The browser renders stored HTML directly.

---

# Code Editor

## Decision

Use Monaco Editor.

## Reasoning

Provides:

* VS Code-like experience
* Syntax highlighting
* Autocomplete
* Multi-language support in future

Used only for user code editing.

---

# Question Execution Model

Questions are designed in a LeetCode-style format.

Users implement:

```cpp
class Solution {
public:
    ...
};
```

instead of writing a full program with main().

---

# Code Template Strategy

Every question stores:

## Starter Code

Displayed inside Monaco.

Example:

```cpp
class Solution {
public:
    int twoSum(...) {

    }
};
```

---

## Execution Template

Stored separately.

Contains:

```cpp
LECO_USER_CODE
```

placeholder.

Example:

```cpp
#include <bits/stdc++.h>
using namespace std;

LECO_USER_CODE

int main() {
    ...
}
```

During execution:

```text
Execution Template
        +
User Code
        ↓
Final Source File
```

The placeholder:

```text
LECO_USER_CODE
```

is replaced by the user's submitted solution.

---

# Official Solution Storage

Planned.

Each question will store:

```text
Official Solution
```

in addition to starter code.

Purpose:

* Generate expected outputs
* Validate custom testcases
* Future stress testing
* Future rejudging

---

# Test Cases

Current direction:

Separate collection.

```text
Question
    ↓
Many TestCases
```

Each testcase contains:

```text
input
output
isHidden
```

Benefits:

* Easier hidden testcase handling
* Better scalability
* Cleaner separation

---

# Run vs Submit

These are intentionally different actions.

---

## Run

Purpose:

Quick feedback.

Characteristics:

* Uses example testcases or custom input
* No database submission record
* No history saved
* User expects very low latency

Output:

```text
stdout
stderr
```

Future:

Expected output may be generated using the official solution.

---

## Submit

Purpose:

Official judging.

Characteristics:

* Creates Submission record
* Runs hidden testcases
* Generates official verdict
* Appears in submission history

Verdicts:

```text
AC
WA
CE
RE
TLE
SYSTEM_ERROR
```

---

# Queue Architecture

Current direction:

Separate queues.

```text
runQueue
submitQueue
```

Reasoning:

User behavior heavily favors Run.

Typical workflow:

```text
Run
Run
Run
Run
Submit
```

Users expect Run to feel nearly instant.

Submit can tolerate longer latency.

Therefore latency is prioritized over maximum worker utilization.

---

# Future Queue

Planned:

```text
runQueue
submitQueue
rejudgeQueue
```

Rejudge jobs should never delay active users.

---

# Run Queue Optimizations

Future idea.

If user executes:

```text
Run A
Run B
Run C
Run D
```

where D is newest,

older pending Run jobs may be cancelled.

Reason:

Only newest execution is useful.

Potentially large latency improvement.

---

# BullMQ

Planned queue system.

Architecture:

```text
Frontend
    ↓
API
    ↓
BullMQ
    ↓
Redis
    ↓
Worker
```

Jobs should contain:

```text
submissionId
```

instead of large payloads.

Worker loads actual data from MongoDB.

---

# Docker

Planned.

Execution architecture:

```text
Worker
    ↓
Docker Container
    ↓
Compile
    ↓
Execute
```

Purpose:

* Isolation
* Security
* Resource limits

Future handling:

```text
TLE
MLE
RE
```

through container controls.

---

# Rejudging

NOT part of current milestone.

To be revisited after the judge is fully functional.

---

## Proposed Direction

Questions will eventually have:

```text
version
```

Submissions will store:

```text
judgedAgainstVersion
```

Example:

```text
Question Version 7

Submission judged on Version 5
```

allowing stale submissions to be identified.

---

## Rejudge Strategies Discussed

Possible strategies:

```text
ALL

AC_ONLY

LATEST_PER_USER

LATEST_AC_AND_REJECTED_PER_USER
```

No final decision yet.

---

## Queue Priority

Future direction:

```text
Run Jobs
    Highest Priority

Submit Jobs
    Medium Priority

Rejudge Jobs
    Lowest Priority
```

Reason:

Active users should never wait behind maintenance operations.

---

# Development Philosophy

Use AI aggressively for:

* Boilerplate
* CRUD
* Forms
* Repetitive code

Developer remains responsible for:

* Architecture
* Data flow
* Queue design
* Security
* Worker lifecycle
* Infrastructure decisions

Goal is not merely to build the project.

Goal is to understand how real online judges work internally.
