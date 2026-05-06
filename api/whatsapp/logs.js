const { createHandler, sendJson } = require('../_lib/http');
const { getDb } = require('../_lib/db');

module.exports = createHandler({
    GET: async ({ res, db }) => {
        const Log = db.models.WhatsAppMessageLog;
        const logs = Log ? await Log.findAll({ order: [['createdAt', 'DESC']], limit: 100 }) : [];
        sendJson(res, 200, { success: true, logs });
    }
}, { getDb });
