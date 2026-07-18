const { createHandler, sendJson } = require('../_lib/http');
const { deleteRecord } = require('../_lib/mobileStore');
const { updateRecord } = require('../_lib/mobileCollectionHandler');

module.exports = createHandler({
    POST: async ({ req, res, body }) => {
        const result = updateRecord('leave_requests', req.query.id, {
            ...(body || {}),
            status: body?.status || 'Pending',
            reviewedAt: new Date().toISOString()
        });
        if (!result) return sendJson(res, 404, { success: false, message: 'Leave request not found.' });
        sendJson(res, 200, { success: true, leaveRequest: result.record, leaveRequests: result.records });
    },
    DELETE: async ({ req, res }) => {
        sendJson(res, 200, { success: true, deleted: true, leaveRequests: deleteRecord('leave_requests', req.query.id) });
    }
});
