# Current Progress

## Authentication

Completed.

Features:

* Google OAuth
* User creation on first login
* User roles
* Protected routes

---

## User Side

Implemented.

### Main Page (/)

Users can:

* View question list
* Open a question

### Question Page

LeetCode-style layout:

Left Pane:

* Question statement
* Metadata
* Examples
* Constraints

Right Pane:

* Code editor

Current editor integration in progress.

---

## Admin Side

Implemented.

### Admin Route Protection

Only users with:

role = ADMIN

can access admin pages.

### Admin Features

CRUD functionality implemented:

* Create Question
* Read Question
* Update Question
* Delete Question

Admin sees question list and can open questions for editing.

---

## UI Status

Implemented:

* Main question list
* Question detail page
* Admin dashboard
* Admin edit workflow

---

## Remaining Major Features

### High Priority

* Finalize Question schema
* TestCase schema
* Monaco editor integration
* Quill integration (admin side)
* Run Code API
* Submission model

### Judge System

* BullMQ queue
* Redis
* Worker process
* Compilation
* Execution
* Verdict generation

### Execution Constraints

* Time limit handling
* Memory limit handling
* Runtime error detection
* Compilation error handling

### Deployment

* Frontend deployment
* Backend deployment
* Production OAuth configuration

---

## Last Updated

Update this file after every completed feature.
