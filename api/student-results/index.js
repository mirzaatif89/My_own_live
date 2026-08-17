const { createHandler, sendJson } = require('../_lib/http');
const { readStore, upsertRecord } = require('../_lib/mobileStore');

function matchesQuery(record = {}, query = {}) {
    const filters = ['studentId', 'rollNo', 'classGrade', 'examName', 'session'];
    return filters.every((key) => {
        const value = String(query[key] || '').trim().toLowerCase();
        if (!value) return true;
        return String(record[key] || '').trim().toLowerCase() === value;
    });
}

module.exports = createHandler({
    GET: async ({ req, res }) => {
        const results = readStore('student_results').filter((item) => matchesQuery(item, req.query || {}));
        sendJson(res, 200, { success: true, results });
    },
    POST: async ({ res, body }) => {
        const payload = {
            studentId: body?.studentId || '',
            studentName: body?.studentName || '',
            rollNo: body?.rollNo || '',
            classGrade: body?.classGrade || '',
            examName: body?.examName || '',
            session: body?.session || '',
            subjects: Array.isArray(body?.subjects) ? body.subjects : [],
            totalMarks: body?.totalMarks || '',
            obtainedMarks: body?.obtainedMarks || '',
            percentage: body?.percentage || '',
            grade: body?.grade || '',
            remarks: body?.remarks || '',
            publishedAt: body?.publishedAt || new Date().toISOString(),
            ...(body || {})
        };
        const { record, records } = upsertRecord('student_results', payload, 'RESULT');
        sendJson(res, 200, { success: true, result: record, results: records });
    }
});
