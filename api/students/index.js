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
        const ids = data.map((item) => String(item?.id || '').trim()).filter(Boolean);
        if (!data.length || ids.length !== data.length) {
            sendJson(res, 400, { success: false, message: 'Every student record must include an ID.' });
            return;
        }

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

        const savedRows = await Student.findAll({
            where: { id: [...new Set(ids)] },
            attributes: ['id']
        });
        const savedIds = new Set(savedRows.map((row) => String(row.id)));
        const missingIds = [...new Set(ids)].filter((id) => !savedIds.has(id));
        if (missingIds.length) {
            sendJson(res, 500, {
                success: false,
                message: `Database did not confirm ${missingIds.length} student record(s).`
            });
            return;
        }

        sendJson(res, 200, { success: true, savedIds: [...savedIds], totalStudents: await Student.count() });
    }
}, { getDb });
