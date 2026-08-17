const { createHandler, sendJson } = require('../_lib/http');
const { authenticateToken } = require('../_lib/services');

module.exports = createHandler({
    POST: async ({ req, res }) => {
        const user = authenticateToken(req);
        sendJson(res, 200, {
            success: true,
            sessionId: user.sessionId || '',
            serverTime: new Date().toISOString()
        });
    }
});
