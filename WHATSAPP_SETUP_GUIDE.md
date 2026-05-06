# WhatsApp Automation Setup

This system sends WhatsApp messages through the official WhatsApp Cloud API.
Do not use unofficial personal-WhatsApp browser automation for school notices; it is unreliable and can get the number blocked.

## 1. Required `.env` values

Add these values on the server:

```env
WHATSAPP_ACCESS_TOKEN=your_meta_cloud_api_access_token
WHATSAPP_PHONE_NUMBER_ID=your_meta_phone_number_id
WHATSAPP_API_VERSION=v20.0
WHATSAPP_DISPLAY_PHONE=923001234567
SCHOOL_NAME=My own Science school
SCHOOL_PHONE_NUMBER=923001234567
WHATSAPP_CRON_SECRET=choose_a_long_random_secret
```

`WHATSAPP_DISPLAY_PHONE` is only for records/display. Messages are sent by the WhatsApp Business number attached to `WHATSAPP_PHONE_NUMBER_ID`.

## 2. Send from the app

Open `notifications.html`.

- `Send Birthday WhatsApp` sends birthday wishes to students whose birthday is today.
- `Send Fee WhatsApp` sends fee reminders to students listed under pending fee notifications.

Student WhatsApp numbers are read from `parentPhone`, so student records must have valid parent numbers like `03001234567` or `923001234567`.

## 3. Automatic daily send

Create a daily cron job that calls:

```bash
curl -X POST "https://your-domain.com/api/whatsapp/auto-alerts" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: your_WHATSAPP_CRON_SECRET" \
  -d "{\"birthdays\":true,\"feeDues\":true}"
```

For local testing:

```bash
curl -X POST "http://localhost:3000/api/whatsapp/auto-alerts" \
  -H "Content-Type: application/json" \
  -H "x-cron-secret: your_WHATSAPP_CRON_SECRET" \
  -d "{\"birthdays\":true,\"feeDues\":true}"
```

## 4. Important WhatsApp API note

Meta may require approved message templates for proactive messages outside the 24-hour customer-service window. If plain text sends fail with a Meta policy error, create approved templates in Meta Business Manager and extend the API helper to send template messages.
