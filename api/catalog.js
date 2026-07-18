const { createHandler, sendJson } = require('./_lib/http');
const apiCatalog = require('./_lib/apiCatalog');

module.exports = createHandler({
    GET: async ({ res }) => {
        sendJson(res, 200, { success: true, ...apiCatalog });
    }
});
