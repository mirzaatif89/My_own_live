const { createHandler, sendJson } = require('../../../_lib/http');
const { updateRecord } = require('../../../_lib/mobileCollectionHandler');

module.exports = createHandler({
    POST: async ({ req, res, body }) => {
        const result = updateRecord('library_issues', req.query.id, {
            status: 'Returned',
            returnDate: body?.returnDate || new Date().toISOString().slice(0, 10)
        });
        if (!result) return sendJson(res, 404, { success: false, message: 'Library issue not found.' });
        sendJson(res, 200, { success: true, issue: result.record, issues: result.records });
    }
});
