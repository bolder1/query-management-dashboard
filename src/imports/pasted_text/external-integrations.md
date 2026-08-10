You are a senior product designer specializing in enterprise SaaS platforms.

Analyze the existing Query Management Dashboard design and add a new feature: External System Integrations (Jira/CRM Integration).

The goal is not only to add screens but to create a flawless end-to-end user experience. Review the current dashboard structure, navigation, components, interaction patterns, and design language. Identify UX gaps in the current integration workflow and improve them.

Feature Objective:
Allow administrators to connect external tools like Jira, configure synchronization, map fields, and bring external queries/tasks into the Query Management Dashboard.

Follow enterprise SaaS UX principles:
- Clear guided workflows
- Minimal cognitive load
- Progressive disclosure
- Strong error prevention
- Clear system feedback
- Scalable architecture for future integrations

---

## Existing Dashboard Integration

Add a new section:

Navigation:
Query Management Dashboard
→ Settings / Integrations

Create an Integration Management experience.

---

# User Flow Design

Design and optimize this complete flow:

## 1. Integration Overview

Create an Integration landing page.

Purpose:
Allow admins to view, add, and manage connected systems.

Include:

Integration cards:

Example:

Jira
Status:
Connected / Not Connected

Details:
- Last Sync
- Connected Account
- Synced Projects
- Total Imported Queries

Actions:
- Connect
- Manage
- Sync Now
- Disconnect


Also include:

"Add Integration" CTA.

Future-ready architecture:
- Jira
- Salesforce
- ServiceNow
- Zendesk
- Other CRM systems

---

# 2. Connection Setup Wizard

Create a multi-step guided setup.

Use a stepper component.

Flow:

Step 1:
Connect Account

Step 2:
Select Project

Step 3:
Configure Query Types

Step 4:
Map Fields

Step 5:
Review & Sync


The wizard should always show:

- Current step
- Completed steps
- Remaining steps
- Ability to go back
- Save progress


---

# Step 1: Connect Jira

Design a clean authentication screen.

Fields:

Jira URL
Example:
https://company.atlassian.net

Email

API Token

Requirements:

- Password masking
- Show/hide token
- Validation states
- Connection testing

Add clear feedback:

Success:
"Connected successfully"

Failure:
"Unable to connect. Check your Jira URL and credentials."


Identify UX gap:
Users may not know where to get API tokens.

Solution:
Add:
"How to generate API token" helper link.


---

# Step 2: Project Selection

After connection:

Automatically load Jira projects.

Design:

Searchable project selector.

Show:

Project Name
Project Key
Project Type
Number of Issues


Allow:

- Single project selection
- Multiple project selection (future-ready)


Add empty states:

"No projects found"

"Unable to load projects"

with retry action.

---

# Step 3: Query Type Configuration

Allow users to decide what Jira items become Query Management records.

Example:

Checkbox selection:

☑ Bug
☑ Task
☑ Service Request
☐ Story


Add preview:

"These items will appear as queries."


---

# Step 4: Field Mapping

Create a powerful but simple field mapping UI.

Default mapping:

Jira Field → Query Management Field

Example:

Summary → Query Title

Description → Description

Status → Status

Assignee → Owner


Allow:

- Add custom fields
- Remove fields
- Rename display labels
- Enable/disable visibility
- Change field order


Improve UX:

Avoid complex table configuration.

Use drag-and-drop cards.

Example:

[ Jira Field ]
        ↓
[ Dashboard Field ]


---

# Step 5: Review & Sync

Before syncing show summary:

Connection:
Jira Connected

Project:
IT Support

Issue Types:
Bug, Task

Fields:
8 mapped fields


Actions:

Back

Save Configuration

Start Sync


---

# Sync Experience

Create sync management screen.

Include:

Sync status:

Completed
Running
Failed


Show:

Last Sync Time

Imported Records

Failed Records

Sync Duration


Actions:

Sync Now

View Logs

Retry Failed Sync


---

# Query Management Integration

Imported Jira issues should appear naturally inside existing Query Management.

Each query should show:

Source:
Jira

Project:
IT Support

External ID:
JIRA-1024


Maintain consistency with existing query cards.

---

# UX Improvements Required

Before designing, analyze possible user problems and solve them.

Identify and solve:

## Problem 1:
Users do not know setup progress.

Solution:
Use guided stepper.


## Problem 2:
Users fear incorrect field mapping.

Solution:
Add preview before saving.


## Problem 3:
Sync failures create confusion.

Solution:
Create detailed sync status and logs.


## Problem 4:
Users connect wrong projects.

Solution:
Show project metadata before selection.


## Problem 5:
Large Jira environments have hundreds of projects.

Solution:
Add search, filters, recently used projects.


---

# Required Screens

Create complete high-fidelity designs for:

1. Integration Dashboard

2. Add Integration Modal

3. Jira Connection Screen

4. Connection Success State

5. Project Selection Screen

6. Query Type Selection

7. Field Mapping Screen

8. Review Configuration Screen

9. Sync Progress Screen

10. Sync History / Logs

11. Integration Management Details Page


---

# Design Requirements

Follow the existing dashboard design system.

Maintain:

- Existing typography
- Colors
- Components
- Spacing system
- Cards
- Buttons
- Tables
- Forms


Design should feel like a modern enterprise security/productivity SaaS platform.

Prioritize:

- Clean hierarchy
- Minimal steps
- Clear actions
- Error prevention
- Scalability


Deliver:
A complete UX flow prototype showing how an administrator connects Jira and manages synced queries from start to finish.