const { createHandler, sendJson } = require('../_lib/http');
const { getDb } = require('../_lib/db');
const { sendAutomaticAlerts } = require('../_lib/whatsapp');

module.exports = createHandler({
    POST: async ({ req, res, db, body }) => {
        const expectedSecret = process.env.WHATSAPP_CRON_SECRET || '';
        const providedSecret = req.headers['x-cron-secret'] || body?.secret || '';

        if (expectedSecret && providedSecret !== expectedSecret) {
            sendJson(res, 401, { success: false, message: 'Invalid WhatsApp cron secret.' });
            return;
        }

        const result = await sendAutomaticAlerts(db, {
            birthdays: body?.birthdays !== false,
            feeDues: body?.feeDues !== false
        });
        sendJson(res, 200, { success: true, ...result });
    }
}, { getDb });
