# Mobile App Developer API Guide

This guide is for the external mobile app developer. The `mobile-app`, `apkapp`, and any bundled mobile source folders in this repo are not required. Build the mobile app separately and connect it to this backend API.

## Base URL

Use the deployed school server URL:

```text
https://YOUR-DOMAIN.com/api
```

For local testing:

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
Content-Type: application/json
```

```json
{
  "username": "student_or_teacher_username",
  "password": "password"
}
```

The response contains `token`, `sessionId`, `permissions`, and `user`. Store the token in the mobile app and send it in the `Authorization` header.

## API Catalog Endpoint

The backend exposes the complete machine-readable API list:

```http
GET /api/catalog
GET /api/mobile-api-list
```

Use this endpoint in development if you need to confirm route names from the live server.

## Student App Main APIs

```text
POST /api/login
GET /api/student/me
GET /api/student-attendance
GET /api/fees/payments
GET /api/fees/due-balances
GET /api/date-sheet
GET /api/messages
GET /api/special-notices?portal=student
GET /api/leave-requests?role=Student
POST /api/leave-requests
GET /api/complaints?role=Student
POST /api/complaints
GET /api/student-assignments
POST /api/student-assignments
GET /api/student-diary
GET /api/student-courses
GET /api/uploaded-assignments
GET /api/uploaded-lectures
GET /api/student-quizzes
POST /api/student-quiz-submissions
```

## Teacher App Main APIs

```text
POST /api/login
GET /api/teacher/me
GET /api/teachers
GET /api/teacher-attendance
POST /api/teacher-attendance
GET /api/teacher-salaries
GET /api/messages
GET /api/special-notices?portal=teacher
GET /api/leave-requests?role=Teacher
POST /api/leave-requests
GET /api/complaints?role=Teacher
POST /api/complaints
```

## Complaints API

```http
GET /api/complaints?role=Student
GET /api/complaints?role=Teacher
GET /api/complaints?role=Family
POST /api/complaints
POST /api/complaints/:id
DELETE /api/complaints/:id
```

Submit complaint:

```json
{
  "senderRole": "Student",
  "senderId": "STUDENT_ID",
  "senderName": "Student Name",
  "senderClass": "Class 5",
  "subject": "Complaint subject",
  "message": "Complaint details"
}
```

Update complaint:

```json
{
  "status": "Resolved",
  "reply": "School office reply",
  "actionTaken": "Action taken details"
}
```

## Common Response Pattern

Most new mobile collection APIs return:

```json
{
  "success": true,
  "itemsKey": []
}
```

POST requests return the saved single record plus the full list:

```json
{
  "success": true,
  "recordKey": {},
  "itemsKey": []
}
```

## Important Notes

- Do not use local browser `localStorage` data for the new mobile app. Use these APIs.
- Existing core school data such as students, teachers, fees, attendance, messages, and notices comes from the backend database.
- New mobile support collections such as uploaded lectures, quizzes, leave requests, complaints, banners, library, cafe, and transport persist on the server under `data/mobile_api_store`.
- CORS is enabled for API access from mobile and external clients.
