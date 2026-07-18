const { createHandler, sendJson } = require('../_lib/http');
const { readStore, upsertRecord } = require('../_lib/mobileStore');

module.exports = createHandler({
    GET: async ({ req, res }) => {
        let leaveRequests = readStore('leave_requests');
        const role = String(req.query.role || '').trim().toLowerCase();
        if (role) {
            leaveRequests = leaveRequests.filter((item) => String(item.applicantRole || item.role || '').trim().toLowerCase() === role);
        }
        sendJson(res, 200, { success: true, leaveRequests });
    },
    POST: async ({ res, body }) => {
        const { record, records } = upsertRecord('leave_requests', {
            status: 'Pending',
            ...(body || {}),
            applicantRole: body?.applicantRole || body?.role || 'Student',
            applicantId: body?.applicantId || body?.studentId || body?.teacherId || '',
            applicantName: body?.applicantName || body?.studentName || body?.teacherName || ''
        }, 'LEAVE');
        sendJson(res, 200, { success: true, leaveRequest: record, leaveRequests: records });
    }
});
