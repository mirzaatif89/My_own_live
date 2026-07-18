const { createHandler, sendJson } = require('../_lib/http');
const { deleteRecord } = require('../_lib/mobileStore');
const { updateRecord } = require('../_lib/mobileCollectionHandler');

module.exports = createHandler({
    POST: async ({ req, res, body }) => {
        const updated = updateRecord('complaints', req.query.id, {
            ...(body || {}),
            status: body?.status || 'Pending'
        });
        if (!updated) return sendJson(res, 404, { success: false, message: 'Complaint not found.' });
        sendJson(res, 200, { success: true, complaint: updated.record, complaints: updated.records });
    },
    DELETE: async ({ req, res }) => {
        sendJson(res, 200, {
            success: true,
            deleted: true,
            complaints: deleteRecord('complaints', req.query.id)
        });
    }
});
