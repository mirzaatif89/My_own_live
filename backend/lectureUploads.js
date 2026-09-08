const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const MAX_BYTES = 30 * 1024 ** 3;
const CHUNK_BYTES = 8 * 1024 ** 2;

module.exports = function registerLectureUploads(app, { root, authenticate }) {
    fs.mkdirSync(root, { recursive: true });
    const locks = new Set();
    const wrap = fn => (req, res) => Promise.resolve(fn(req, res)).catch(error => res.status(error.status || (error.code === 'ENOSPC' ? 507 : 400)).json({ success: false, message: error.code === 'ENOSPC' ? 'Server disk is full.' : error.message }));
    const owner = req => String(req.user?.id || req.user?.username || '');
    const access = (req, res, next) => {
        if (!owner(req) || !['admin', 'teacher', 'branch', 'principal', 'staff'].includes(String(req.user?.role || '').toLowerCase())) return res.status(403).json({ message: 'Staff access required.' });
        next();
    };
    const read = req => {
        if (!/^[a-f0-9-]{36}$/.test(req.params.id)) throw new Error('Invalid upload ID.');
        const meta = JSON.parse(fs.readFileSync(path.join(root, req.params.id + '.json'), 'utf8'));
        if (meta.owner !== owner(req)) throw new Error('Upload access denied.');
        return meta;
    };
    const result = (id, meta) => ({ name: meta.name, size: meta.size, type: meta.type, url: `/lecture-files/${id}${meta.ext}` });
    app.post('/api/lecture-uploads', authenticate, access, wrap(async (req, res) => {
        const { name, size, type } = req.body;
        const ext = path.extname(String(name || '')).toLowerCase();
        if (!['.pdf','.ppt','.pptx','.doc','.docx','.mp4','.webm','.mov','.mkv','.avi','.jpg','.jpeg','.png','.txt'].includes(ext)) throw new Error('Unsupported lecture file type.');
        if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_BYTES) throw new Error('File must be between 1 byte and 30 GB.');
        const id = crypto.randomUUID();
        const meta = { name: path.basename(name), size, type: String(type || ''), ext, owner: owner(req) };
        await fs.promises.writeFile(path.join(root, id + '.json'), JSON.stringify(meta), { flag: 'wx' });
        await fs.promises.writeFile(path.join(root, id + '.part'), '', { flag: 'wx' });
        res.json({ id, chunkSize: CHUNK_BYTES });
    }));
    app.put('/api/lecture-uploads/:id', authenticate, access, express.raw({ type: 'application/octet-stream', limit: CHUNK_BYTES }), wrap(async (req, res) => {
        const meta = read(req), id = req.params.id;
        if (locks.has(id)) throw new Error('Upload is busy; retry.');
        locks.add(id);
        try {
            const file = path.join(root, id + '.part');
            const { size } = await fs.promises.stat(file);
            const offset = Number(req.query.offset);
            if (!Number.isSafeInteger(offset) || offset !== size) return res.status(409).json({ offset: size, message: 'Upload offset changed.' });
            if (!Buffer.isBuffer(req.body) || !req.body.length || size + req.body.length > meta.size) throw new Error('Invalid chunk size.');
            await fs.promises.appendFile(file, req.body);
            res.json({ offset: size + req.body.length });
        } finally { locks.delete(id); }
    }));
    app.post('/api/lecture-uploads/:id/complete', authenticate, access, wrap(async (req, res) => {
        const meta = read(req), id = req.params.id;
        const part = path.join(root, id + '.part'), final = path.join(root, id + meta.ext);
        if (locks.has(id)) throw new Error('Upload is busy; retry.');
        if (!fs.existsSync(final)) {
            if ((await fs.promises.stat(part)).size !== meta.size) throw new Error('Upload is incomplete.');
            await fs.promises.rename(part, final);
        }
        res.json({ success: true, file: result(id, meta) });
    }));
    app.get('/lecture-files/:file', (req, res, next) => {
        if (!/^[a-f0-9-]{36}\.(pdf|pptx?|docx?|mp4|webm|mov|mkv|avi|jpe?g|png|txt)$/.test(req.params.file)) return res.sendStatus(404);
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.sendFile(req.params.file, { root: path.resolve(root) }, error => { if (error) next(error); });
    });
};
module.exports.MAX_BYTES = MAX_BYTES;
