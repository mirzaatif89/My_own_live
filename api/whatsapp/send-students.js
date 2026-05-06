const { createHandler, sendJson } = require('../_lib/http');
const { getDb } = require('../_lib/db');
const { sendBulkToStudents } = require('../_lib/whatsapp');

module.exports = createHandler({
    POST: async ({ res, db, body }) => {
        const payload = body || {};
        const studentIds = Array.isArray(payload.studentIds) ? payload.studentIds : [];
        const messageTemplate = String(payload.messageTemplate || '').trim();
        const messageType = String(payload.messageType || 'custom').trim() || 'custom';

        if (!studentIds.length) {
            sendJson(res, 400, { success: false, message: 'Select at least one student.' });
            return;
        }

        const result = await sendBulkToStudents(db, {
            studentIds,
            messageTemplate,
            messageType,
            extra: payload.extra || {}
        });

        sendJson(res, 200, { success: true, ...result });
    }
}, { getDb });
