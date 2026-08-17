const path = require('path');
const { sendJson } = require('../_lib/http');
const { normalizeJsonUpload, parseMultipart, saveUploadedFile } = require('../_lib/uploadFile');

async function readRawBuffer(req) {
    const chunks = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    return Buffer.concat(chunks);
}

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.end();
        return;
    }

    if (req.method !== 'POST') {
        sendJson(res, 405, { success: false, message: `Method ${req.method} not allowed.` });
        return;
    }

    try {
        const contentType = String(req.headers['content-type'] || '').toLowerCase();
        const uploadRoot = path.join(process.cwd(), 'frontend');
        let fields = {};
        let file = null;

        if (contentType.includes('multipart/form-data')) {
            const parsed = parseMultipart(await readRawBuffer(req), contentType);
            fields = parsed.fields;
            file = parsed.files[0] || null;
        } else {
            const raw = await readRawBuffer(req);
            const body = raw.length ? JSON.parse(raw.toString('utf8')) : {};
            fields = body || {};
            file = normalizeJsonUpload(body || {});
        }

        const uploadedFile = saveUploadedFile({ req, uploadRoot, fields, file });
        sendJson(res, 200, { success: true, file: uploadedFile, url: uploadedFile.url });
    } catch (error) {
        sendJson(res, error.statusCode || 500, {
            success: false,
            message: error.message || 'File upload failed.'
        });
    }
};
