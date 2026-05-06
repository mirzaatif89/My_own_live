const axios = require('axios');

function getWhatsAppConfig() {
    return {
        accessToken: process.env.WHATSAPP_ACCESS_TOKEN || '',
        phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
        apiVersion: process.env.WHATSAPP_API_VERSION || 'v20.0',
        schoolName: process.env.SCHOOL_NAME || 'My own Science school',
        schoolPhone: process.env.SCHOOL_PHONE_NUMBER || process.env.WHATSAPP_DISPLAY_PHONE || ''
    };
}

function normalizePhoneNumber(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';

    let digits = raw.replace(/[^\d+]/g, '');
    if (digits.startsWith('+')) digits = digits.slice(1);
    if (digits.startsWith('00')) digits = digits.slice(2);
    if (digits.startsWith('0')) digits = `92${digits.slice(1)}`;
    if (digits.length === 10 && digits.startsWith('3')) digits = `92${digits}`;
    return digits;
}

function renderMessageTemplate(template, student = {}, extra = {}) {
    const values = {
        NAME: student.fullName || student.studentName || 'Student',
        FATHER_NAME: student.fatherName || '',
        CLASS: student.classGrade || '',
        ROLL_NO: student.rollNo || '',
        PHONE: student.parentPhone || student.phoneNumber || '',
        MONTH: extra.month || new Date().toLocaleString('en-US', { month: 'long' }),
        AMOUNT: extra.amount || student.monthlyFee || '',
        DUES: extra.dues || extra.amount || student.monthlyFee || '',
        SCHOOL_NAME: extra.schoolName || '',
        SCHOOL_PHONE: extra.schoolPhone || ''
    };

    return String(template || '').replace(/\{([A-Z_]+)\}/g, (_match, key) => values[key] ?? '');
}

function createDefaultMessage(type, student = {}, extra = {}) {
    if (type === 'birthday') {
        return `Assalam o Alaikum {NAME}, ${extra.schoolName} ki taraf se aap ko birthday mubarak. Allah aap ko kamyabi de.`;
    }

    if (type === 'fee_due') {
        return `Assalam o Alaikum, {NAME} ki {MONTH} fee/dues PKR {AMOUNT} pending hain. Barah-e-karam school office me jama karwa dein. ${extra.schoolName} {SCHOOL_PHONE}`;
    }

    if (type === 'notice') {
        return `{SCHOOL_NAME} Notice: ${extra.noticeText || '{NAME}, please contact school office.'}`;
    }

    return `Assalam o Alaikum {NAME}, ${extra.schoolName} ki taraf se important update.`;
}

async function sendWhatsAppText({ to, message }) {
    const config = getWhatsAppConfig();
    if (!config.accessToken || !config.phoneNumberId) {
        const error = new Error('WhatsApp Cloud API credentials are missing.');
        error.statusCode = 503;
        throw error;
    }

    const normalizedTo = normalizePhoneNumber(to);
    if (!normalizedTo) {
        const error = new Error('Recipient WhatsApp number is missing.');
        error.statusCode = 400;
        throw error;
    }

    const url = `https://graph.facebook.com/${config.apiVersion}/${config.phoneNumberId}/messages`;
    const response = await axios.post(url, {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: normalizedTo,
        type: 'text',
        text: {
            preview_url: false,
            body: message
        }
    }, {
        headers: {
            Authorization: `Bearer ${config.accessToken}`,
            'Content-Type': 'application/json'
        },
        timeout: 20000
    });

    return {
        providerMessageId: response.data?.messages?.[0]?.id || '',
        raw: response.data
    };
}

async function logWhatsAppMessage(db, payload) {
    const Log = db?.models?.WhatsAppMessageLog;
    if (!Log) return null;

    const id = payload.id || `WA-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    return Log.create({
        id,
        studentId: payload.studentId || '',
        studentName: payload.studentName || '',
        phoneNumber: payload.phoneNumber || '',
        messageType: payload.messageType || 'custom',
        messageContent: payload.messageContent || '',
        status: payload.status || 'pending',
        providerMessageId: payload.providerMessageId || '',
        errorMessage: payload.errorMessage || '',
        sentAt: payload.sentAt || new Date()
    });
}

async function sendMessageToStudent(db, student, options = {}) {
    const config = getWhatsAppConfig();
    const messageType = options.messageType || options.type || 'custom';
    const template = options.messageTemplate || createDefaultMessage(messageType, student, {
        ...options,
        schoolName: config.schoolName,
        schoolPhone: config.schoolPhone
    });
    const message = renderMessageTemplate(template, student, {
        ...options,
        schoolName: config.schoolName,
        schoolPhone: config.schoolPhone
    }).trim();
    const phoneNumber = normalizePhoneNumber(options.phoneNumber || student.parentPhone);

    if (!message) {
        throw new Error('WhatsApp message is empty.');
    }

    try {
        const sent = await sendWhatsAppText({ to: phoneNumber, message });
        await logWhatsAppMessage(db, {
            studentId: student.id,
            studentName: student.fullName,
            phoneNumber,
            messageType,
            messageContent: message,
            status: 'sent',
            providerMessageId: sent.providerMessageId,
            sentAt: new Date()
        });
        return {
            success: true,
            studentId: student.id,
            studentName: student.fullName,
            phoneNumber,
            providerMessageId: sent.providerMessageId
        };
    } catch (error) {
        const details = error.response?.data?.error?.message || error.message || 'WhatsApp send failed.';
        await logWhatsAppMessage(db, {
            studentId: student.id,
            studentName: student.fullName,
            phoneNumber,
            messageType,
            messageContent: message,
            status: 'failed',
            errorMessage: details,
            sentAt: new Date()
        });
        return {
            success: false,
            studentId: student.id,
            studentName: student.fullName,
            phoneNumber,
            error: details
        };
    }
}

async function sendBulkToStudents(db, { studentIds = [], messageTemplate = '', messageType = 'custom', extra = {} } = {}) {
    const where = Array.isArray(studentIds) && studentIds.length
        ? { id: studentIds.map((id) => String(id)) }
        : {};
    const students = await db.models.Student.findAll({ where });
    const results = [];

    for (const record of students) {
        const student = typeof record.toJSON === 'function' ? record.toJSON() : record;
        results.push(await sendMessageToStudent(db, student, {
            ...extra,
            messageTemplate,
            messageType
        }));
    }

    return {
        results,
        summary: {
            requested: Array.isArray(studentIds) && studentIds.length ? studentIds.length : students.length,
            matched: students.length,
            sent: results.filter((item) => item.success).length,
            failed: results.filter((item) => !item.success).length
        }
    };
}

function parseBirthdayDate(value) {
    const raw = String(value || '').trim();
    if (!raw) return null;
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
        return { month: parsed.getMonth() + 1, day: parsed.getDate() };
    }

    const match = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (!match) return null;
    const first = Number(match[1]);
    const second = Number(match[2]);
    return {
        month: first > 12 ? second : first,
        day: first > 12 ? first : second
    };
}

function isBirthdayToday(student, today = new Date()) {
    const birth = parseBirthdayDate(student.dob);
    return !!birth && birth.month === today.getMonth() + 1 && birth.day === today.getDate();
}

async function sendAutomaticAlerts(db, options = {}) {
    const students = await db.models.Student.findAll();
    const now = new Date();
    const month = now.toLocaleString('en-US', { month: 'long' });
    const monthShort = month.slice(0, 3).toLowerCase();
    const paidStudentIds = new Set();
    if (db.models.FeePayment) {
        const payments = await db.models.FeePayment.findAll({ where: { status: 'Paid' } });
        payments.forEach((record) => {
            const payment = typeof record.toJSON === 'function' ? record.toJSON() : record;
            const feeMonth = String(payment.feeMonth || '').toLowerCase();
            if (feeMonth.includes(month.toLowerCase()) || feeMonth.includes(monthShort)) {
                paidStudentIds.add(String(payment.studentId || ''));
            }
        });
    }
    const birthdayResults = [];
    const feeResults = [];

    for (const record of students) {
        const student = typeof record.toJSON === 'function' ? record.toJSON() : record;
        const isTerminated = String(student.feesStatus || '').trim().toLowerCase() === 'terminated';
        if (isTerminated) continue;

        if (options.birthdays !== false && isBirthdayToday(student, now)) {
            birthdayResults.push(await sendMessageToStudent(db, student, {
                messageType: 'birthday'
            }));
        }

        const feeStatus = String(student.feesStatus || '').trim().toLowerCase();
        const amount = Number.parseInt(student.monthlyFee || 0, 10) || 0;
        if (options.feeDues !== false && feeStatus !== 'paid' && !paidStudentIds.has(String(student.id || '')) && amount > 0) {
            feeResults.push(await sendMessageToStudent(db, student, {
                messageType: 'fee_due',
                month,
                amount: amount.toLocaleString('en-PK')
            }));
        }
    }

    return {
        birthdayResults,
        feeResults,
        summary: {
            birthdaySent: birthdayResults.filter((item) => item.success).length,
            birthdayFailed: birthdayResults.filter((item) => !item.success).length,
            feeSent: feeResults.filter((item) => item.success).length,
            feeFailed: feeResults.filter((item) => !item.success).length
        }
    };
}

module.exports = {
    createDefaultMessage,
    getWhatsAppConfig,
    normalizePhoneNumber,
    renderMessageTemplate,
    sendAutomaticAlerts,
    sendBulkToStudents,
    sendMessageToStudent,
    sendWhatsAppText
};
