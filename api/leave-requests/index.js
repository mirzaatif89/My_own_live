const { createHandler, sendJson } = require('../_lib/http');
const { getDb } = require('../_lib/db');
const { readStore, upsertRecord } = require('../_lib/mobileStore');
const { authenticateToken } = require('../_lib/services');

function getAuthenticatedUser(req) {
    try {
        return authenticateToken(req);
    } catch (_error) {
        return null;
    }
}

async function getApplicantIdentity(req, db, body = {}) {
    const user = getAuthenticatedUser(req);
    const role = body.applicantRole || body.role || user?.role || 'Student';
    const normalizedRole = String(role || '').trim();
    const applicantId = body.applicantId || body.studentId || body.teacherId || user?.id || '';
    const identity = {
        applicantRole: normalizedRole,
        role: normalizedRole,
        applicantId,
        applicantName: body.applicantName || body.studentName || body.teacherName || '',
        studentId: body.studentId || '',
        teacherId: body.teacherId || '',
        studentName: body.studentName || '',
        teacherName: body.teacherName || '',
        studentCode: body.studentCode || '',
        classGrade: body.classGrade || '',
        rollNo: body.rollNo || '',
        campusName: body.campusName || user?.campusName || ''
    };

    if (!db || !applicantId) return identity;

    if (normalizedRole === 'Student') {
        const student = await db.models.Student.findByPk(applicantId);
        if (student) {
            identity.applicantName = identity.applicantName || student.fullName || '';
            identity.studentName = identity.studentName || student.fullName || '';
            identity.studentId = identity.studentId || student.id || applicantId;
            identity.studentCode = identity.studentCode || student.studentCode || student.id || '';
            identity.classGrade = identity.classGrade || student.classGrade || '';
            identity.rollNo = identity.rollNo || student.rollNo || '';
            identity.campusName = identity.campusName || student.campusName || '';
        }
    } else if (normalizedRole === 'Teacher') {
        const teacher = await db.models.Teacher.findByPk(applicantId);
        if (teacher) {
            identity.applicantName = identity.applicantName || teacher.fullName || '';
            identity.teacherName = identity.teacherName || teacher.fullName || '';
            identity.teacherId = identity.teacherId || teacher.id || applicantId;
            identity.subject = body.subject || teacher.subject || '';
            identity.campusName = identity.campusName || teacher.campusName || '';
        }
    }

    return identity;
}

module.exports = createHandler({
    GET: async ({ req, res }) => {
        let leaveRequests = readStore('leave_requests');
        const role = String(req.query.role || '').trim().toLowerCase();
        if (role) {
            leaveRequests = leaveRequests.filter((item) => String(item.applicantRole || item.role || '').trim().toLowerCase() === role);
        }
        sendJson(res, 200, { success: true, leaveRequests });
    },
    POST: async ({ req, res, db, body }) => {
        const identity = await getApplicantIdentity(req, db, body);
        const { record, records } = upsertRecord('leave_requests', {
            status: 'Pending',
            ...(body || {}),
            ...identity
        }, 'LEAVE');
        sendJson(res, 200, { success: true, leaveRequest: record, leaveRequests: records });
    }
}, { getDb });
