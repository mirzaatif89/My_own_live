const { createHandler, sendJson } = require('../_lib/http');
const { readStore, upsertRecord } = require('../_lib/mobileStore');

function matchesQuery(record = {}, query = {}) {
    const filters = ['classGrade', 'subject', 'term', 'session'];
    return filters.every((key) => {
        const value = String(query[key] || '').trim().toLowerCase();
        if (!value) return true;
        return String(record[key] || '').trim().toLowerCase() === value;
    });
}

module.exports = createHandler({
    GET: async ({ req, res }) => {
        const syllabus = readStore('student_syllabus').filter((item) => matchesQuery(item, req.query || {}));
        sendJson(res, 200, { success: true, syllabus });
    },
    POST: async ({ res, body }) => {
        const payload = {
            classGrade: body?.classGrade || '',
            subject: body?.subject || '',
            term: body?.term || '',
            session: body?.session || '',
            title: body?.title || body?.subject || 'Syllabus',
            description: body?.description || '',
            fileUrl: body?.fileUrl || body?.url || '',
            chapters: Array.isArray(body?.chapters) ? body.chapters : [],
            publishedAt: body?.publishedAt || new Date().toISOString(),
            ...(body || {})
        };
        const { record, records } = upsertRecord('student_syllabus', payload, 'SYL');
        sendJson(res, 200, { success: true, syllabusItem: record, syllabus: records });
    }
});
