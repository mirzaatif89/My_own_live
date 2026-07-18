const { createHandler, sendJson } = require('../_lib/http');
const { getDb } = require('../_lib/db');
const { authenticateToken } = require('../_lib/services');

module.exports = createHandler({
    GET: async ({ req, res, db }) => {
        const user = authenticateToken(req);
        if (user.role !== 'Teacher') {
            return sendJson(res, 403, { success: false, message: 'Teacher access only.' });
        }

        const teacher = await db.models.Teacher.findByPk(user.id, {
            attributes: { exclude: ['password'] }
        });
        if (!teacher) {
            return sendJson(res, 404, { success: false, message: 'Teacher record not found.' });
        }
        sendJson(res, 200, teacher);
    }
}, { getDb });
