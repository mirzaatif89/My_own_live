const { createHandler, sendJson } = require('../_lib/http');
const { getDb } = require('../_lib/db');
const { readStore, upsertRecord } = require('../_lib/mobileStore');
const { authenticateToken } = require('../_lib/services');

function safeJsonParse(value) {
    if (!value || typeof value !== 'string') return value;
    try {
        return JSON.parse(value);
    } catch (_error) {
        return value;
    }
}

function scheduleToAssignedClasses(teacher = {}) {
    const schedule = safeJsonParse(teacher.schedule);
    if (!Array.isArray(schedule)) return [];

    return schedule.map((item, index) => ({
        id: `SCHEDULE-${teacher.id}-${index + 1}`,
        teacherId: teacher.id,
        teacherName: teacher.fullName || '',
        campusName: teacher.campusName || '',
        classGrade: item.classGrade || item.class || item.className || '',
        section: item.section || '',
        subject: item.subject || teacher.subject || '',
        day: item.day || '',
        startTime: item.startTime || item.from || '',
        endTime: item.endTime || item.to || '',
        source: 'teacher_schedule',
        raw: item
    }));
}

function matchesTeacher(record = {}, teacherId = '') {
    return !teacherId || String(record.teacherId || '').trim() === String(teacherId).trim();
}

function getOptionalUser(req) {
    try {
        return authenticateToken(req);
    } catch (_error) {
        return null;
    }
}

module.exports = createHandler({
    GET: async ({ req, res, db }) => {
        const user = getOptionalUser(req);
        const teacherId = String(req.query.teacherId || (user?.role === 'Teacher' ? user.id : '') || '').trim();
        const manualClasses = readStore('teacher_assigned_classes').filter((item) => matchesTeacher(item, teacherId));
        let scheduleClasses = [];

        if (teacherId) {
            const teacher = await db.models.Teacher.findByPk(teacherId);
            if (teacher) scheduleClasses = scheduleToAssignedClasses(teacher.toJSON());
        } else {
            const teachers = await db.models.Teacher.findAll();
            scheduleClasses = teachers.flatMap((teacher) => scheduleToAssignedClasses(teacher.toJSON()));
        }

        sendJson(res, 200, {
            success: true,
            assignedClasses: [...manualClasses, ...scheduleClasses]
        });
    },
    POST: async ({ res, body }) => {
        const payload = {
            teacherId: body?.teacherId || '',
            teacherName: body?.teacherName || '',
            campusName: body?.campusName || '',
            classGrade: body?.classGrade || body?.className || '',
            section: body?.section || '',
            subject: body?.subject || '',
            day: body?.day || '',
            startTime: body?.startTime || '',
            endTime: body?.endTime || '',
            source: 'manual',
            ...(body || {})
        };
        const { record, records } = upsertRecord('teacher_assigned_classes', payload, 'TCLASS');
        sendJson(res, 200, { success: true, assignedClass: record, assignedClasses: records });
    }
}, { getDb });
