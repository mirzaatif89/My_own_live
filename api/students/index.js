const { studentPasswordFields } = require('../_lib/studentCredentials');
const { createHandler, sendJson } = require('../_lib/http');
const { getDb } = require('../_lib/db');
const {
    bcrypt,
    ensureUniqueStudentIdentity,
    isPasswordHash,
    normalizeOptionalEmail,
    upsertAuthUser
} = require('../_lib/services');
const { Op } = require('../_lib/db');

module.exports = createHandler({
    GET: async ({ res, db }) => {
        const students = await db.models.Student.findAll();
        sendJson(res, 200, students);
    },
    POST: async ({ res, db, body }) => {
        const data = Array.isArray(body) ? body : [body];
        const { Student, User } = db.models;

        for (const item of data) {
            const existing = item.id ? await Student.findByPk(item.id) : null;
            item.username = String(item.username ?? existing?.username ?? '').trim() || null;
            Object.assign(item, await studentPasswordFields(item, existing || {}));
            item.email = normalizeOptionalEmail(item.email);
            await ensureUniqueStudentIdentity(Student, User, item, Op);


            await Student.upsert(item);
            await upsertAuthUser(User, {
                id: `student_${item.id}`,
                profileId: item.id,
                role: 'Student',
                username: item.username,
                email: item.email,
                password: item.password,
                fullName: item.fullName,
                campusName: item.campusName || null,
                plainPassword: item.plainPassword
            });
        }

        sendJson(res, 200, { success: true });
    }
}, { getDb });
