const { createHandler, sendJson } = require('../_lib/http');
const { readStore, upsertRecord } = require('../_lib/mobileStore');

function normalizeRole(value = '') {
    const role = String(value || '').trim();
    if (/^teacher$/i.test(role)) return 'Teacher';
    if (/^(family|parent|parents)$/i.test(role)) return 'Family';
    return 'Student';
}

function normalizeComplaint(payload = {}) {
    const role = normalizeRole(payload.senderRole || payload.role || payload.complainantRole);
    return {
        status: 'Pending',
        ...payload,
        senderRole: role,
        senderId: payload.senderId || payload.studentId || payload.teacherId || '',
        senderName: payload.senderName || payload.studentName || payload.teacherName || payload.parentName || payload.familyName || '',
        senderClass: payload.senderClass || payload.className || payload.class || '',
        subject: payload.subject || 'Complaint',
        message: payload.message || payload.complaint || payload.details || '',
        status: payload.status || 'Pending'
    };
}

module.exports = createHandler({
    GET: async ({ req, res }) => {
        let complaints = readStore('complaints');
        const role = String(req.query.role || req.query.senderRole || '').trim().toLowerCase();
        const senderId = String(req.query.senderId || req.query.studentId || req.query.teacherId || '').trim();
        const status = String(req.query.status || '').trim().toLowerCase();

        if (role) {
            complaints = complaints.filter((item) => String(item.senderRole || '').trim().toLowerCase() === role);
        }
        if (senderId) {
            complaints = complaints.filter((item) => String(item.senderId || item.studentId || item.teacherId || '') === senderId);
        }
        if (status) {
            complaints = complaints.filter((item) => String(item.status || '').trim().toLowerCase() === status);
        }

        sendJson(res, 200, { success: true, complaints });
    },
    POST: async ({ res, body }) => {
        const { record, records } = upsertRecord('complaints', normalizeComplaint(body || {}), 'CMP');
        sendJson(res, 200, { success: true, complaint: record, complaints: records });
    }
});
