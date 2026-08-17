# Mobile App Developer API Guide

This guide is for the external mobile app developer building the Student Portal and Teacher Portal apps for My Own School Jand. Build the app separately and connect it to this backend API.

## Base URL

Live server:

```text
https://myownschooljand.com/api
```

Local testing:

```text
http://localhost:3000/api
```

## Headers

For JSON requests:

```text
Content-Type: application/json
```

After login, protected APIs use:

```text
Authorization: Bearer <token>
```

## Login

```http
POST /api/login
```

Request:

```json
{
  "username": "student_or_teacher_username",
  "password": "password"
}
```

Response contains `success`, `token`, `permissions`, and `user`. Store `token` in the app and send it in the `Authorization` header for protected APIs such as profile and messages.

Token validity:

```text
JWT token expiry: 1 day
Refresh token: Not available
Logout endpoint: POST /api/session/end
Heartbeat endpoint: POST /api/session/heartbeat
```

Logout request:

```http
POST /api/session/end
Authorization: Bearer <token>
```

After successful logout, remove the token from mobile app storage.

## Error Response Format

All failed API responses use this pattern:

```json
{
  "success": false,
  "message": "Error message"
}
```

Common examples:

```json
{
  "success": false,
  "message": "Invalid credentials"
}
```

```json
{
  "success": false,
  "message": "Authentication token required."
}
```

```json
{
  "success": false,
  "message": "Invalid or expired token."
}
```

## Pagination

Current list APIs return all matching records in one response. There is no pagination yet on attendance, notices, messages, results, syllabus, complaints, leave requests, or assigned classes.

Mobile developer should handle the returned arrays directly and apply local filtering/search in the app. If server-side pagination is needed later, add `page` and `limit` support in backend first.

## File Upload

Use this endpoint for assignment files, syllabus files, profile pictures, lecture files, or message attachments:

```http
POST /api/upload
Content-Type: multipart/form-data
```

Multipart fields:

```text
file: selected file
category: assignment | syllabus | profile | lecture | message | general
```

Response:

```json
{
  "success": true,
  "url": "https://myownschooljand.com/uploads/mobile/assignment/FILE_NAME.pdf",
  "file": {
    "url": "https://myownschooljand.com/uploads/mobile/assignment/FILE_NAME.pdf",
    "relativeUrl": "/uploads/mobile/assignment/FILE_NAME.pdf",
    "fileName": "FILE_NAME.pdf",
    "originalName": "homework.pdf",
    "mimeType": "application/pdf",
    "size": 12345,
    "category": "assignment"
  }
}
```

JSON upload is also supported:

```http
POST /api/upload
Content-Type: application/json
```

```json
{
  "category": "profile",
  "fileName": "student-photo.jpg",
  "mimeType": "image/jpeg",
  "base64": "BASE64_FILE_CONTENT"
}
```

You can also send `dataUrl` instead of `base64`.

Upload size limit:

```text
Maximum file size: 15MB
```

How to use returned file URL:

```text
Assignment file: upload file first, then send returned url as fileUrl in POST /api/student-assignments or POST /api/uploaded-assignments.
Syllabus file: upload file first, then send returned url as fileUrl in POST /api/student-syllabus.
Profile picture: upload image first, then save returned url as profileImage in POST /api/students or POST /api/teachers.
Lecture file: upload file first, then save returned url as fileUrl in POST /api/uploaded-lectures.
```

## API Catalog

The backend exposes the machine-readable API list:

```http
GET /api/catalog
GET /api/mobile-api-list
```

## Student Portal APIs

| Module | Method | Endpoint | Notes |
| --- | --- | --- | --- |
| Login | POST | `/api/login` | Student login |
| Profile | GET | `/api/student/me` | Requires student bearer token |
| File Upload | POST | `/api/upload` | Returns uploaded file URL |
| Attendance | GET | `/api/student-attendance` | Student attendance records |
| Attendance | POST | `/api/student-attendance` | Save attendance |
| Results | GET | `/api/student-results` | Optional query: `studentId`, `rollNo`, `classGrade`, `examName`, `session` |
| Results | POST | `/api/student-results` | Save/publish result |
| Syllabus | GET | `/api/student-syllabus` | Optional query: `classGrade`, `subject`, `term`, `session` |
| Syllabus | POST | `/api/student-syllabus` | Save/publish syllabus |
| Fee Records | GET | `/api/fees/payments` | Paid/partial payment history |
| Fee Records | GET | `/api/fees/due-balances` | Student due balances |
| Fee Records | GET | `/api/fees` | Fee records |
| Apply Leave | GET | `/api/leave-requests?role=Student` | Student leave list |
| Apply Leave | POST | `/api/leave-requests` | Submit leave |
| Quiz | GET | `/api/student-quizzes` | Quiz list |
| Quiz | POST | `/api/student-quiz-submissions` | Submit quiz answers |
| Diary | GET | `/api/student-diary` | Class diary |
| Diary | POST | `/api/student-diary` | Save diary record |
| Lectures | GET | `/api/uploaded-lectures` | Lecture links/files |
| Lectures | POST | `/api/uploaded-lectures` | Save lecture |
| Notices | GET | `/api/special-notices?portal=student` | Student notices |
| Message | GET | `/api/messages` | Requires bearer token |
| Date Sheet | GET | `/api/date-sheet` | Exam date sheet |
| Assignments | GET | `/api/uploaded-assignments` | Teacher/school uploaded assignments |
| Assignments | POST | `/api/student-assignments` | Student assignment submission |
| Complain | GET | `/api/complaints?role=Student` | Student complaints |
| Complain | POST | `/api/complaints` | Submit complaint |
| About Software | GET | `/api/about-software` | App info screen |

## Teacher Portal APIs

| Module | Method | Endpoint | Notes |
| --- | --- | --- | --- |
| Login | POST | `/api/login` | Teacher login |
| Profile | GET | `/api/teacher/me` | Requires teacher bearer token |
| File Upload | POST | `/api/upload` | Returns uploaded file URL |
| Attendance | GET | `/api/teacher-attendance` | Teacher attendance records |
| Attendance | POST | `/api/teacher-attendance` | Save attendance |
| Salary Record | GET | `/api/teacher-salaries` | Salary records |
| Salary Record | POST | `/api/teacher-salaries` | Save salary record |
| Complain | GET | `/api/complaints?role=Teacher` | Teacher complaints |
| Complain | POST | `/api/complaints` | Submit complaint |
| Notices | GET | `/api/special-notices?portal=teacher` | Teacher notices |
| Message | GET | `/api/messages` | Requires bearer token |
| Assigned Classes | GET | `/api/teacher-assigned-classes` | Uses token teacher ID or query `teacherId` |
| Assigned Classes | POST | `/api/teacher-assigned-classes` | Save manual class assignment |
| Apply Leave | GET | `/api/leave-requests?role=Teacher` | Teacher leave list |
| Apply Leave | POST | `/api/leave-requests` | Submit leave |
| About Software | GET | `/api/about-software` | App info screen |

## Message Sending

Read messages:

```http
GET /api/messages
Authorization: Bearer <student_or_teacher_token>
```

Send portal message from admin/principal:

```http
POST /api/messages
Authorization: Bearer <admin_or_principal_token>
Content-Type: application/json
```

```json
{
  "targetRole": "Student",
  "targetScope": "individual",
  "recipientId": "STU-001",
  "recipientName": "Student Name",
  "subject": "Fee reminder",
  "body": "Please clear your dues."
}
```

Supported `targetScope` values:

```text
all
campus
class
individual
```

For student/teacher sending a message to school office, use complaints:

```http
POST /api/complaints
```

## Sample Payloads

Student result:

```json
{
  "studentId": "STU-001",
  "studentName": "Student Name",
  "rollNo": "12",
  "classGrade": "Class 5",
  "examName": "Mid Term",
  "session": "2026",
  "subjects": [
    { "subject": "English", "totalMarks": 100, "obtainedMarks": 85, "grade": "A" }
  ],
  "totalMarks": 100,
  "obtainedMarks": 85,
  "percentage": 85,
  "grade": "A",
  "remarks": "Good"
}
```

Syllabus:

```json
{
  "classGrade": "Class 5",
  "subject": "English",
  "term": "Term 1",
  "session": "2026",
  "title": "English Term 1 Syllabus",
  "description": "Chapters 1 to 5",
  "fileUrl": "https://example.com/syllabus.pdf",
  "chapters": ["Chapter 1", "Chapter 2"]
}
```

Leave request:

```json
{
  "applicantRole": "Student",
  "applicantId": "STU-001",
  "fromDate": "2026-08-01",
  "toDate": "2026-08-02",
  "reason": "Medical leave"
}
```

Complaint:

```json
{
  "senderRole": "Teacher",
  "senderId": "TCH-001",
  "senderName": "Teacher Name",
  "subject": "Complaint subject",
  "message": "Complaint details"
}
```

Teacher assigned class:

```json
{
  "teacherId": "TCH-001",
  "teacherName": "Teacher Name",
  "campusName": "Main Campus",
  "classGrade": "Class 5",
  "section": "A",
  "subject": "English",
  "day": "Monday",
  "startTime": "09:00",
  "endTime": "09:40"
}
```

File upload with returned URL inside assignment:

```json
{
  "studentId": "STU-001",
  "assignmentTitle": "Science Homework",
  "subject": "Science",
  "fileUrl": "https://myownschooljand.com/uploads/mobile/assignment/homework.pdf",
  "note": "Submitted from mobile app"
}
```

Profile picture update after upload:

```json
{
  "id": "STU-001",
  "fullName": "Student Name",
  "username": "student_username",
  "password": "student_password",
  "profileImage": "https://myownschooljand.com/uploads/mobile/profile/student-photo.jpg"
}
```

## Test Logins

Use a real student and teacher created in the admin panel because login checks the live database user table.

```text
Student test login: create/select one Student record in Admin > Students and share its username/password with the app developer.
Teacher test login: create/select one Teacher record in Admin > Teachers and share its username/password with the app developer.
```

Do not hard-code public test credentials in the app build. Replace these placeholders before sharing:

```json
{
  "student": { "username": "STUDENT_TEST_USERNAME", "password": "STUDENT_TEST_PASSWORD" },
  "teacher": { "username": "TEACHER_TEST_USERNAME", "password": "TEACHER_TEST_PASSWORD" }
}
```

## Response Pattern

Most collection APIs return:

```json
{
  "success": true,
  "itemsKey": []
}
```

POST requests return the saved record plus the updated list:

```json
{
  "success": true,
  "recordKey": {},
  "itemsKey": []
}
```

## Important Notes

- Use `https://myownschooljand.com/api` as the app base URL after deployment.
- Do not use browser `localStorage` data in the mobile app. Use these APIs.
- Core records such as students, teachers, fees, attendance, messages, and notices are served by backend routes.
- Mobile support modules such as results, syllabus, uploaded lectures, quizzes, leave requests, complaints, assigned classes, and about software persist under `data/mobile_api_store`.
- CORS is enabled for mobile and external clients.
