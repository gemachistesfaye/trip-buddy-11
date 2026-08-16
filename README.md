# FleetLink System

# Build: VisionFund Transport Request & Vehicle Assignment System

Build a professional, production-quality full-stack web application for managing the internal transport request and vehicle assignment process of an organization.

## IMPORTANT CONTEXT

This is based on an existing manual transport-request process observed during an internship in a Logistics and Supply Chain Department.

The organization currently has approximately:

* 9 departments

* 9 vehicles

* Drivers assigned to vehicles

* Departments currently submit transport requests manually using paper forms

* Logistics reviews the requests

* Logistics assigns an appropriate vehicle and driver

* Transport assignment reports are prepared

* There are two main request types:

  1. Daily Transport Request

  2. Weekly Transport Request

The goal is NOT to build a generic public logistics/courier website.

Build an INTERNAL TRANSPORT MANAGEMENT SYSTEM that digitizes the existing manual workflow.

Do not invent unrelated modules such as warehouse management, procurement, customer shipment tracking, or public courier tracking.

---

# 1. TECHNOLOGY

Use a modern full-stack architecture.

Preferred stack:

* React / TypeScript

* Vite

* Tailwind CSS

* shadcn/ui

* Lucide icons

* Supabase

  * PostgreSQL database

  * Authentication

  * Row Level Security

  * Realtime where useful

* React Router

* React Hook Form

* Zod validation

* TanStack Query for server state

* Recharts for reports/charts

The application must be responsive and work well on:

* Desktop

* Tablet

* Mobile

Use clean component architecture and reusable components.

---

# 2. APPLICATION STRUCTURE

Create three role-based areas:

## Department User

Can:

* Login

* View dashboard

* Submit daily transport request

* Submit weekly transport request

* View own requests

* View request details

* View request status

* View assigned vehicle and driver

* Receive notifications

* Cancel a request when permitted

## Logistics Officer

Can:

* Login

* View logistics dashboard

* View all transport requests

* Filter/search requests

* Review requests

* Approve requests

* Reject requests

* Assign vehicle

* Assign driver

* View vehicle availability

* View driver availability

* View transport schedule

* Manage vehicles

* Manage drivers

* View reports

* Export/print reports

## Administrator

Can:

* Manage users

* Manage departments

* Manage vehicles

* Manage drivers

* Manage system configuration

Use role-based access control.

Department users must not be able to access Logistics or Admin pages.

---

# 3. DESIGN DIRECTION

The application should look like a professional internal enterprise system.

Do NOT make it look like a generic landing page.

Use:

* Clean dashboard

* Professional sidebar

* Top navigation

* Cards

* Tables

* Status badges

* Modal/dialog forms

* Tabs

* Filters

* Search

* Pagination

* Charts

* Toast notifications

* Empty states

* Loading states

* Error states

* Confirmation dialogs

Use a professional blue/neutral enterprise visual style.

Support:

* Light mode

* Dark mode

* Responsive mobile layout

Avoid excessive glassmorphism, excessive gradients, or decorative animations.

Prioritize usability and clarity.

---

# 4. MAIN NAVIGATION

## Department

Sidebar:

* Dashboard

* New Request

* My Requests

* Notifications

* Profile

## Logistics

Sidebar:

* Dashboard

* Transport Requests

* Schedule

* Vehicles

* Drivers

* Assignments

* Reports

* Notifications

## Admin

Sidebar:

* Dashboard

* Users

* Departments

* Vehicles

* Drivers

* System Settings

---

# 5. AUTHENTICATION

Implement real authentication using Supabase Auth.

Login fields:

* Email

* Password

Include:

* Login validation

* Loading state

* Error messages

* Logout

* Protected routes

After login, redirect the user according to role.

Example:

Department user:

/department/dashboard

Logistics officer:

/logistics/dashboard

Admin:

/admin/dashboard

Do not allow users to manually access unauthorized routes.

---

# 6. DATABASE DESIGN

Create a normalized PostgreSQL database.

Recommended tables:

## departments

Fields:

* id

* name

* code

* contact_name

* contact_phone

* is_active

* created_at

* updated_at

Example departments can initially be demo data:

* Finance

* Human Resources

* IT

* Operations

* Credit

* Administration

* Risk

* Internal Audit

* Other

Do not claim these are the organization's actual department names unless confirmed. Make them editable by Admin.

---

## profiles

Fields:

* id

* auth_user_id

* full_name

* email

* phone

* role

* department_id

* is_active

* created_at

* updated_at

Roles:

* department_user

* logistics_officer

* admin

---

## vehicles

Fields:

* id

* plate_number

* vehicle_type

* model

* passenger_capacity

* current_status

* assigned_driver_id

* notes

* is_active

* created_at

* updated_at

Vehicle status:

* available

* assigned

* maintenance

* unavailable

---

## drivers

Fields:

* id

* full_name

* phone

* license_number

* status

* assigned_vehicle_id

* notes

* is_active

* created_at

* updated_at

Driver status:

* available

* assigned

* unavailable

* leave

---

## transport_requests

Fields:

* id

* request_number

* request_type

* requesting_department_id

* requester_id

* contact_number

* request_date

* trip_from_date

* trip_to_date

* number_of_passengers

* destination

* preferred_departure_time

* estimated_return_time

* purpose

* goods_carried

* status

* rejection_reason

* remarks

* submitted_at

* reviewed_at

* completed_at

* created_at

* updated_at

request_type:

* daily

* weekly

status:

* draft

* submitted

* under_review

* approved

* rejected

* assigned

* in_progress

* completed

* cancelled

---

# 7. WEEKLY REQUEST DETAILS

Because weekly requests can contain different requirements for different days and times, create a separate table:

## transport_request_days

Fields:

* id

* transport_request_id

* trip_date

* morning_requested

* afternoon_requested

* departure_time

* return_time

* destination

* number_of_passengers

* purpose

* goods_carried

* created_at

This allows one weekly request to contain multiple days.

Example:

Monday:

Morning ✓

Tuesday:

Morning ✓

Afternoon ✓

Wednesday:

None

Thursday:

Morning ✓

Friday:

Morning ✓

Afternoon ✓

Saturday:

None

---

# 8. VEHICLE ASSIGNMENTS

Create:

## transport_assignments

Fields:

* id

* transport_request_id

* vehicle_id

* driver_id

* assigned_by

* assignment_date

* departure_datetime

* expected_return_datetime

* notes

* status

* created_at

* updated_at

Assignment status:

* assigned

* in_progress

* completed

* cancelled

---

# 9. NOTIFICATIONS

Create:

## notifications

Fields:

* id

* user_id

* title

* message

* type

* related_request_id

* is_read

* created_at

Notification types:

* request_submitted

* request_approved

* request_rejected

* vehicle_assigned

* request_cancelled

* reminder

* system

Use in-app notifications.

Do not implement paid SMS.

---

# 10. AUDIT LOG

Create:

## audit_logs

Fields:

* id

* user_id

* action

* entity_type

* entity_id

* old_values

* new_values

* created_at

Track important actions:

* Request submitted

* Request approved

* Request rejected

* Vehicle assigned

* Driver assigned

* Request cancelled

* Vehicle updated

* Driver updated

This is important for an internal organizational system.

---

# 11. DAILY TRANSPORT REQUEST

Create a clean multi-section form.

## Section 1 — Request Information

Fields:

* Requesting Department

* Contact Number

* Date of Request

* Trip Date

## Section 2 — Trip Information

Fields:

* Number of Passengers

* Destination

* Preferred Departure Time

* Estimated Time of Return

* Purpose of Trip

* Goods Carried

## Section 3 — Additional Information

* Remarks

Submit button:

"Submit Transport Request"

---

# 12. DAILY DEADLINE RULE

A daily request should normally require at least 24 hours' notice.

Example:

Current time:

August 10, 10:00 AM

Trip:

August 11, 10:00 AM or later

Allowed.

Trip:

August 10, 5:00 PM

Not allowed.

Show:

"Daily transport requests must normally be submitted at least 24 hours before the trip."

Do not silently disable the button.

Explain why the request cannot be submitted.

IMPORTANT:

Make the deadline configurable in system settings so the organization can change it later.

---

# 13. WEEKLY TRANSPORT REQUEST

Create a dedicated weekly request form based on the existing paper form.

Fields:

* Requesting Department

* Contact Number

* Date of Request

* Trip From Date

* Trip To Date

Then show a weekly schedule:

Monday

* Morning

* Afternoon

Tuesday

* Morning

* Afternoon

Wednesday

* Morning

* Afternoon

Thursday

* Morning

* Afternoon

Friday

* Morning

* Afternoon

Saturday

* Morning

* Afternoon

Each selected trip period should allow:

* Destination

* Number of passengers

* Preferred departure time

* Estimated return time

* Purpose

* Goods carried

Do not require the user to fill unnecessary information for unselected days.

---

# 14. WEEKLY DEADLINE RULE

Weekly transport requests normally require at least 3 days' notice.

Show a clear validation message if the request does not meet the requirement.

Make this setting configurable.

Example:

"Weekly transport requests must normally be submitted at least 3 days in advance."

---

# 15. REQUEST DASHBOARD

Department dashboard should show:

* Total Requests

* Pending Requests

* Approved Requests

* Assigned Requests

* Completed Requests

Show recent requests.

Example:

TR-0001

Finance

Adama

Daily

Assigned

TR-0002

IT

Dire Dawa

Weekly

Under Review

Use status badges.

---

# 16. MY REQUESTS

Create a searchable/filterable table.

Columns:

* Request Number

* Type

* Trip Date

* Destination

* Passengers

* Status

* Submitted Date

* Assigned Vehicle

* Driver

* Actions

Filters:

* Status

* Daily/Weekly

* Date

* Destination

Clicking a request opens detailed information.

---

# 17. REQUEST DETAILS

Show:

### Request Information

* Request number

* Department

* Requester

* Request type

* Request date

* Trip date

### Trip Details

* Destination

* Passengers

* Departure

* Return

* Purpose

* Goods

### Status Timeline

Submitted

↓

Under Review

↓

Approved

↓

Vehicle Assigned

↓

Completed

Show the current state clearly.

If rejected:

Show:

* Rejection reason

* Logistics remarks

If assigned:

Show:

* Vehicle

* Plate number

* Driver

* Driver phone

* Departure time

* Return time

---

# 18. LOGISTICS DASHBOARD

Create a professional logistics dashboard.

Top statistics:

* Pending Requests

* Approved Requests

* Assigned Trips

* Today's Trips

* Available Vehicles

* Vehicles on Trip

* Available Drivers

Charts:

1. Requests by Department

2. Requests by Status

3. Daily/Weekly Trip Frequency

4. Vehicle Utilization

Recent requests table.

Upcoming trips.

---

# 19. LOGISTICS REQUEST REVIEW

When Logistics opens a request, show all submitted information.

Actions:

* Approve

* Reject

* Assign Vehicle

Reject must require a reason.

Approval should change status to:

approved

Then Logistics can assign a vehicle and driver.

---

# 20. VEHICLE ASSIGNMENT

When assigning a vehicle:

Show only suitable vehicles.

Consider:

* Vehicle availability

* Passenger capacity

* Existing schedule

* Maintenance/unavailable status

Show:

Vehicle plate

Vehicle type

Capacity

Driver

Current status

Example:

Available:

AA-12345

Toyota

7 seats

Driver: Abebe

Do not allow assigning an unavailable vehicle.

---

# 21. DOUBLE-BOOKING PREVENTION

This is a critical business rule.

If a vehicle already has:

August 12

8:00 AM – 4:00 PM

do not allow it to be assigned to another overlapping trip.

Show:

"Vehicle is unavailable during the requested time."

Do the same for drivers.

A driver must not be assigned to overlapping trips.

---

# 22. VEHICLE MANAGEMENT

Logistics/Admin can view:

* Plate number

* Vehicle type

* Model

* Capacity

* Driver

* Status

Actions:

* Add vehicle

* Edit vehicle

* Change status

* View schedule

Statuses:

Available

Assigned

Maintenance

Unavailable

---

# 23. DRIVER MANAGEMENT

Show:

* Driver name

* Phone

* License number

* Vehicle

* Status

Actions:

* Add driver

* Edit driver

* Change status

---

# 24. TRANSPORT SCHEDULE

Create a calendar/schedule page.

Views:

* Daily

* Weekly

* Monthly

Display:

* Department

* Destination

* Vehicle

* Driver

* Departure

* Return

* Status

Use different status indicators.

The schedule must make vehicle conflicts easy to identify.

---

# 25. REPORTS

Create a professional Reports section.

Main report:

## Transport Assignment Report

Columns:

* Request Number

* Department

* Request Type

* Trip Date

* Destination

* Passengers

* Vehicle

* Plate Number

* Driver

* Departure

* Return

* Status

Filters:

* Date range

* Department

* Vehicle

* Driver

* Request type

* Status

Provide:

* Search

* Filter

* Print

* Export CSV

---

# 26. TRIP FREQUENCY

Add report showing number of trips:

* Daily

* Weekly

* Monthly

Examples:

Trips by Department

Finance: 12

IT: 8

HR: 7

Trips by Vehicle

AA-12345: 15

AA-23456: 10

Trips by Destination.

Use Recharts.

---

# 27. ADMIN MANAGEMENT

Admin should manage:

### Departments

* Add

* Edit

* Activate/deactivate

### Users

* Add

* Edit

* Assign role

* Assign department

* Activate/deactivate

### Vehicles

* Add/edit

* Status

### Drivers

* Add/edit

* Status

### System Settings

Allow configuration of:

* Daily notice period

* Weekly notice period

* Maximum passenger capacity rules if needed

* Organization name

* Notification settings

Default:

Daily notice = 24 hours

Weekly notice = 3 days

---

# 28. IMPORTANT DATA SECURITY

Use Supabase Row Level Security.

Department users:

* Can read their own profile

* Can read their department's requests

* Can create requests for their department

* Cannot access other departments' private requests

* Cannot modify Logistics assignments

Logistics:

* Can read all transport requests

* Can review requests

* Can assign vehicles/drivers

* Can view reports

Admin:

* Full management access

Never expose service-role keys in frontend code.

Use environment variables.

---

# 29. DEMO DATA

Create realistic demo data so the application looks complete.

Use:

* 9 departments

* Approximately 9 vehicles

* Drivers

* Transport requests

* Assignments

* Notifications

Clearly treat these as DEMO data.

Do not use real employee names, phone numbers, or confidential VisionFund information.

---

# 30. UX DETAILS

Every page must have:

* Loading state

* Empty state

* Error state

* Success feedback

* Form validation

* Confirmation dialogs for destructive actions

Examples:

When submitting:

"Transport request submitted successfully."

When approving:

"Transport request approved."

When assigning:

"Vehicle and driver assigned successfully."

When rejecting:

"Request rejected. The requester has been notified."

---

# 31. RESPONSIVE DESIGN

Desktop:

Sidebar + main content.

Tablet:

Collapsible sidebar.

Mobile:

Bottom navigation or mobile sidebar.

Tables should become responsive cards or horizontally scrollable tables.

Forms should work comfortably on phones.

---

# 32. UI COMPONENTS

Create reusable components:

* Button

* Input

* Select

* Date picker

* Time picker

* Modal

* Dialog

* Data table

* Status badge

* Stat card

* Notification item

* Empty state

* Loading skeleton

* Confirm dialog

* Request timeline

* Vehicle card

* Driver card

Do not duplicate UI code.

---

# 33. ERROR HANDLING

Handle:

* Network errors

* Database errors

* Authentication errors

* Invalid requests

* Unauthorized access

* Vehicle conflicts

* Driver conflicts

* Deadline violations

Show user-friendly messages.

Never expose raw database errors to users.

---

# 34. IMPORTANT SCOPE RULE

Do NOT add:

* Public shipment tracking

* Customer delivery tracking

* E-commerce

* Warehouse management

* Procurement

* Fleet fuel management

* Complex accounting

* Payment system

unless requirements are later confirmed by the organization.

The core purpose is:

TRANSPORT REQUEST

→ REVIEW

→ APPROVAL

→ VEHICLE/DRIVER ASSIGNMENT

→ SCHEDULE

→ NOTIFICATION

→ REPORTING

---

# 35. DEVELOPMENT APPROACH

Do not generate a fake static UI.

Build actual:

* Database tables

* Authentication

* CRUD operations

* Role permissions

* Request workflow

* Deadline validation

* Vehicle assignment

* Driver assignment

* Conflict detection

* Notifications

* Reports

The system should work end-to-end.

Example:

Department user submits:

"Finance → Adama → 4 passengers → Aug 15 → 8 AM"

Then Logistics should actually see that request in their dashboard.

Logistics approves it.

Logistics selects a real vehicle from the database.

Logistics selects a driver.

The assignment is stored in the database.

The department user then sees:

"Approved — Vehicle AA-12345 — Driver Abebe."

This entire workflow must function without hardcoded frontend-only data.

---

# 36. CODE QUALITY

Use:

* TypeScript types

* Reusable components

* Clear folder structure

* Service/query separation

* Form validation

* Environment variables

* Secure database policies

* No duplicated business logic

* Meaningful variable names

* Error handling

* Comments only where useful

Keep business rules centralized.

For example, the 24-hour and 3-day rules should not be duplicated across multiple components.

---

# 37. FINAL PRODUCT GOAL

The finished application should feel like a real internal enterprise transport management platform.

It should allow:

DEPARTMENT

Submit request

↓

Track request

↓

Receive assignment

LOGISTICS

Review

↓

Approve/reject

↓

Assign vehicle

↓

Assign driver

↓

Manage schedule

↓

Generate reports

ADMIN

Manage users

↓

Manage departments

↓

Manage vehicles

↓

Manage drivers

↓

Configure system

Build this as a coherent working product rather than a collection of unrelated pages.

Before adding optional features, make the complete core workflow work correctly.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://trip-buddy-11.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a2baa0c5-392f-4774-9d44-32e2e2acfc82).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
