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

* Monaco Code Editor

### Code Editor

Implemented.

Features:

* Monaco Editor integration
* Starter code support
* Question-specific code templates

Question execution templates use a placeholder:

```cpp
LECO_USER_CODE
```

During judging:

```text
Code Snippet Template
        +
User Class Implementation
        ↓
Final Compilable Source File
```

`LECO_USER_CODE` is replaced by the user's submitted class/function implementation before compilation.

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

### Rich Text Editor

Implemented.

* Quill Editor integrated
* Used for Question Statement authoring
* Supports formatting:

  * Bold
  * Italic
  * Lists
  * Code blocks
  * Rich text content

Question statements are stored as rich HTML content and rendered on the user-facing question page.

---

## UI Status

Implemented:

* Main question list
* Question detail page
* Monaco code editor
* Admin dashboard
* Admin edit workflow
* Quill question editor

---

## Remaining Major Features

### High Priority

* Finalize Question schema
* TestCase schema
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

## Architecture Notes

### Question Authoring

Admin
↓
Quill Editor
↓
HTML Stored in MongoDB
↓
Rendered on Question Page

### Code Execution

Question
↓
Code Template (contains LECO_USER_CODE)
↓
Replace LECO_USER_CODE with User Implementation
↓
Generate Final Source File
↓
Compile
↓
Execute

---

## Last Updated

Current milestone completed:

* Google OAuth
* User Roles
* Protected Admin Routes
* Question CRUD
* Monaco Editor Integration
* Quill Integration
* LeetCode-style Question View
* Template-based Code Injection using LECO_USER_CODE



