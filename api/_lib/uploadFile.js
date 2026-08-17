const fs = require('fs');
const path = require('path');

const ALLOWED_CATEGORIES = new Set(['assignment', 'syllabus', 'profile', 'lecture', 'message', 'general']);
const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

function sanitizeSegment(value = '', fallback = 'general') {
    const normalized = String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
    return normalized || fallback;
}

function sanitizeFileName(value = '', fallback = 'upload.bin') {
    const parsed = path.parse(String(value || fallback));
    const name = (parsed.name || 'upload').replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'upload';
    const ext = (parsed.ext || '').toLowerCase().replace(/[^.a-z0-9]/g, '');
    return `${name}${ext || '.bin'}`;
}

function extensionFromMime(mimeType = '') {
    const mime = String(mimeType || '').toLowerCase();
    if (mime.includes('jpeg')) return '.jpg';
    if (mime.includes('png')) return '.png';
    if (mime.includes('webp')) return '.webp';
    if (mime.includes('gif')) return '.gif';
    if (mime.includes('pdf')) return '.pdf';
    if (mime.includes('msword')) return '.doc';
    if (mime.includes('officedocument.wordprocessingml')) return '.docx';
    if (mime.includes('officedocument.presentationml')) return '.pptx';
    if (mime.includes('spreadsheetml')) return '.xlsx';
    return '.bin';
}

function inferMimeType(fileName = '') {
    const ext = path.extname(fileName).toLowerCase();
    if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
    if (ext === '.png') return 'image/png';
    if (ext === '.webp') return 'image/webp';
    if (ext === '.gif') return 'image/gif';
    if (ext === '.pdf') return 'application/pdf';
    if (ext === '.doc') return 'application/msword';
    if (ext === '.docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    if (ext === '.pptx') return 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
    if (ext === '.xlsx') return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    return 'application/octet-stream';
}

function getRequestBaseUrl(req) {
    const protocol = req.headers['x-forwarded-proto'] || (req.connection?.encrypted ? 'https' : 'http');
    const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost';
    return `${protocol}://${host}`;
}

function parseDataUrl(dataUrl = '') {
    const match = String(dataUrl || '').match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
    if (!match) return null;
    const mimeType = match[1] || 'application/octet-stream';
    const isBase64 = Boolean(match[2]);
    const data = match[3] || '';
    return {
        mimeType,
        buffer: isBase64 ? Buffer.from(data, 'base64') : Buffer.from(decodeURIComponent(data), 'utf8')
    };
}

function bufferSplit(buffer, separator) {
    const parts = [];
    let start = 0;
    let index = buffer.indexOf(separator, start);
    while (index !== -1) {
        parts.push(buffer.slice(start, index));
        start = index + separator.length;
        index = buffer.indexOf(separator, start);
    }
    parts.push(buffer.slice(start));
    return parts;
}

function parseMultipart(buffer, contentType = '') {
    const boundaryMatch = String(contentType || '').match(/boundary=(?:"([^"]+)"|([^;]+))/i);
    const boundary = boundaryMatch?.[1] || boundaryMatch?.[2];
    if (!boundary) return { fields: {}, files: [] };

    const delimiter = Buffer.from(`--${boundary}`);
    const fields = {};
    const files = [];

    for (const rawPart of bufferSplit(buffer, delimiter)) {
        let part = rawPart;
        if (part.length < 4 || part.equals(Buffer.from('--\r\n')) || part.equals(Buffer.from('--'))) continue;
        if (part.slice(0, 2).toString() === '\r\n') part = part.slice(2);
        if (part.slice(-2).toString() === '\r\n') part = part.slice(0, -2);
        if (part.slice(-2).toString() === '--') part = part.slice(0, -2);

        const separatorIndex = part.indexOf(Buffer.from('\r\n\r\n'));
        if (separatorIndex < 0) continue;

        const headerText = part.slice(0, separatorIndex).toString('utf8');
        let content = part.slice(separatorIndex + 4);
        if (content.slice(-2).toString() === '\r\n') content = content.slice(0, -2);

        const disposition = headerText.match(/content-disposition:[^\r\n]+/i)?.[0] || '';
        const name = disposition.match(/name="([^"]+)"/i)?.[1] || '';
        const fileName = disposition.match(/filename="([^"]*)"/i)?.[1] || '';
        const mimeType = headerText.match(/content-type:\s*([^\r\n]+)/i)?.[1]?.trim() || inferMimeType(fileName);

        if (!name) continue;
        if (fileName) files.push({ fieldName: name, fileName, mimeType, buffer: content });
        else fields[name] = content.toString('utf8');
    }

    return { fields, files };
}

function normalizeJsonUpload(body = {}) {
    const dataUrl = body.dataUrl || body.fileData || body.file || '';
    const parsed = parseDataUrl(dataUrl);
    const rawBase64 = body.base64 || body.contentBase64 || '';
    const mimeType = body.mimeType || parsed?.mimeType || inferMimeType(body.fileName || body.name || '');
    const buffer = parsed?.buffer || (rawBase64 ? Buffer.from(String(rawBase64), 'base64') : null);

    if (!buffer) return null;
    return {
        fieldName: 'file',
        fileName: body.fileName || body.name || `upload${extensionFromMime(mimeType)}`,
        mimeType,
        buffer
    };
}

function saveUploadedFile({ req, uploadRoot, fields = {}, file }) {
    if (!file?.buffer?.length) {
        const error = new Error('Upload file is required.');
        error.statusCode = 400;
        throw error;
    }

    if (file.buffer.length > MAX_UPLOAD_BYTES) {
        const error = new Error('File is too large. Maximum upload size is 15MB.');
        error.statusCode = 413;
        throw error;
    }

    const requestedCategory = sanitizeSegment(fields.category || fields.type || fields.folder || 'general');
    const category = ALLOWED_CATEGORIES.has(requestedCategory) ? requestedCategory : 'general';
    const safeName = sanitizeFileName(file.fileName, `upload${extensionFromMime(file.mimeType)}`);
    const finalName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${safeName}`;
    const relativeDir = path.join('uploads', 'mobile', category);
    const absoluteDir = path.join(uploadRoot, relativeDir);
    fs.mkdirSync(absoluteDir, { recursive: true });

    const absolutePath = path.join(absoluteDir, finalName);
    fs.writeFileSync(absolutePath, file.buffer);

    const relativeUrl = `/${relativeDir.replace(/\\/g, '/')}/${encodeURIComponent(finalName)}`;
    const url = `${getRequestBaseUrl(req)}${relativeUrl}`;

    return {
        url,
        relativeUrl,
        fileName: finalName,
        originalName: file.fileName,
        mimeType: file.mimeType || inferMimeType(file.fileName),
        size: file.buffer.length,
        category,
        fieldName: file.fieldName || 'file'
    };
}

module.exports = {
    MAX_UPLOAD_BYTES,
    normalizeJsonUpload,
    parseMultipart,
    saveUploadedFile
};
