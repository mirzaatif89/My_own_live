const { createHandler, sendJson } = require('./_lib/http');
const { getDb, Op } = require('./_lib/db');
const {
    JWT_SECRET,
    PRINCIPAL_PASSWORD,
    PRINCIPAL_USERNAME,
    bcrypt,
    jwt,
    loadPermissions
} = require('./_lib/services');

async function resolveAdminCredentials(db) {
    const fallback = {
        username: process.env.ADMIN_USERNAME || 'Myownschool',
        password: process.env.ADMIN_PASSWORD || 'myownschool1122'
    };

    const appSettingModel = db?.models?.AppSetting;
    if (!appSettingModel) return fallback;

    try {
        const row = await appSettingModel.findByPk('admin_credentials');
        const saved = row?.settingValue ? JSON.parse(row.settingValue) : null;
        const username = String(saved?.username || '').trim();
        const password = String(saved?.password || '');
        if (!username || !password) return fallback;
        return { username, password };
    } catch (_error) {
        return fallback;
    }
}

function createSessionId(role, id) {
    return `${String(role || 'user').toLowerCase()}_${String(id || '0')}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

module.exports = createHandler({
    POST: async ({ res, db, body }) => {
        const { username, password } = body || {};
        const adminCredentials = await resolveAdminCredentials(db);
        const adminEmail = adminCredentials.username;
        const adminPass = adminCredentials.password;

        if (username === adminEmail && password === adminPass) {
            const permissions = await loadPermissions(db);
            const groupKey = permissions.roleGroups.Admin || 'admin';
            const sessionId = createSessionId('Admin', 'admin');
            const token = jwt.sign({ id: 'admin', role: 'Admin', sessionId }, JWT_SECRET, { expiresIn: '1d' });
            sendJson(res, 200, {
                success: true,
                token,
                sessionId,
                user: { id: 'admin', fullName: 'Administrator', role: 'Admin', username: adminEmail, groupKey },
                permissions
            });
            return;
        }

        if (username === PRINCIPAL_USERNAME && password === PRINCIPAL_PASSWORD) {
            const permissions = await loadPermissions(db);
            if (permissions.loginAccess.principal === false) {
                sendJson(res, 403, { success: false, message: 'Principal login is currently disabled by admin.' });
                return;
            }
            const groupKey = permissions.roleGroups.Principal || 'principal';
            const sessionId = createSessionId('Principal', 'principal');
            const token = jwt.sign({ id: 'principal', role: 'Principal', sessionId }, JWT_SECRET, { expiresIn: '1d' });
            sendJson(res, 200, {
                success: true,
                token,
                sessionId,
                user: { id: 'principal', fullName: 'Principal', role: 'Principal', username: PRINCIPAL_USERNAME, groupKey },
                permissions
            });
            return;
        }

        const normalizedIdentity = String(username || '').trim();
        const userWhere = { [Op.or]: [{ username: normalizedIdentity }] };
        if (normalizedIdentity.includes('@')) {
            userWhere[Op.or].push({ email: normalizedIdentity.toLowerCase() });
        }

        const { User, Student, Teacher, Staff } = db.models;
        const user = await User.findOne({ where: userWhere });

        if (!user) {
            sendJson(res, 401, { success: false, message: 'Invalid credentials' });
            return;
        }

        const permissions = await loadPermissions(db);
        const roleKey = String(user.role || '').toLowerCase();
        if (permissions.loginAccess[roleKey] === false) {
            sendJson(res, 403, { success: false, message: `${user.role} login is currently disabled by admin.` });
            return;
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            sendJson(res, 401, { success: false, message: 'Invalid credentials' });
            return;
        }

        let profileName = user.fullName;
        let designationKey = '';
        if (user.role === 'Student') {
            const student = await Student.findByPk(user.profileId);
            profileName = student?.fullName || profileName;
        } else if (user.role === 'Teacher') {
            const teacher = await Teacher.findByPk(user.profileId);
            profileName = teacher?.fullName || profileName;
            designationKey = String(teacher?.designation || 'teacher').trim().toLowerCase().replace(/[\s-]+/g, '_');
        } else if (user.role === 'Staff') {
            const staff = await Staff.findByPk(user.profileId);
            profileName = staff?.fullName || profileName;
            designationKey = String(staff?.designation || 'staff').trim().toLowerCase().replace(/[\s-]+/g, '_');
        }

        const designationRole = designationKey === 'admin' || designationKey === 'system_administrator'
            ? 'Admin' : designationKey === 'teacher' ? 'Teacher' : user.role;
        const designationGroupKey = designationRole === 'Admin' ? 'admin'
            : designationKey === 'accountant' ? 'accountant'
                : designationKey === 'teacher' ? 'teacher' : user.groupKey;

        const sessionId = createSessionId(user.role, user.profileId);
        const token = jwt.sign(
            { id: user.profileId, role: designationRole, campusName: user.campusName || '', sessionId },
            JWT_SECRET,
            { expiresIn: '1d' }
        );

        sendJson(res, 200, {
            success: true,
            token,
            sessionId,
            permissions,
            user: {
                id: user.profileId,
                fullName: profileName,
                role: designationRole,
                username: user.username,
                campusName: user.campusName || '',
                groupKey: designationGroupKey || permissions.roleGroups[designationRole] || roleKey,
                ...(designationKey ? { designation: designationKey } : {})
            }
        });
    }
}, { getDb });
