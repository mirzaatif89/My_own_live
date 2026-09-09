const bcrypt = require('bcryptjs');
const isHash = value => /^\$2[aby]\$\d{2}\$/.test(String(value || ''));
async function studentPasswordFields(item, existing = {}) {
    const explicit = typeof item.password === 'string' && item.password && !isHash(item.password) ? item.password : '';
    const plain = explicit || (typeof item.plainPassword === 'string' && !isHash(item.plainPassword) ? item.plainPassword : '');
    if (plain) return { password: await bcrypt.hash(plain, 10), plainPassword: plain };
    return { password: existing.password || item.password || null, plainPassword: existing.plainPassword || null };
}
module.exports = { studentPasswordFields };
