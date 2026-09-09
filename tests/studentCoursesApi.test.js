const test = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const vm = require('node:vm');

test('course API saves, lists, and deletes a Class 3 attachment', async () => {
    const port = 3128;
    const server = spawn(process.execPath, ['app.js'], {
        cwd: process.cwd(),
        env: { ...process.env, PORT: String(port) },
        stdio: ['ignore', 'pipe', 'pipe']
    });
    let startupOutput = '';
    server.stdout.on('data', chunk => { startupOutput += chunk; });
    server.stderr.on('data', chunk => { startupOutput += chunk; });

    const baseUrl = `http://127.0.0.1:${port}/api/student-courses`;
    const courseId = `COURSE-E2E-${Date.now()}`;
    const timeout = Date.now() + 15000;

    try {
        while (Date.now() < timeout) {
            try {
                const response = await fetch(baseUrl);
                if (response.ok) break;
            } catch (_error) {
                await new Promise(resolve => setTimeout(resolve, 250));
            }
        }

        const healthCheck = await fetch(baseUrl).catch(() => null);
        assert.ok(healthCheck, `Local server did not start: ${startupOutput}`);

        const course = {
            id: courseId,
            campusName: 'Main Campus',
            classGrade: 'Class 3',
            title: 'Mathematics',
            details: 'E2E syllabus',
            file: { name: 'syllabus.txt', dataUrl: 'data:text/plain;base64,c3lsbGFidXM=' }
        };
        const createResponse = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(course)
        });
        const created = await createResponse.json();
        assert.equal(created.success, true);
        assert.equal(created.course.id, courseId);
        assert.equal(created.course.classGrade, 'Class 3');

        const listed = await (await fetch(baseUrl)).json();
        const savedCourse = listed.courses.find(item => item.id === courseId);
        assert.equal(savedCourse.title, 'Mathematics');
        assert.equal(savedCourse.file.name, 'syllabus.txt');

        const portal = fs.readFileSync('frontend/student_portal.html', 'utf8');
        const normalizeStart = portal.indexOf("        function normalizeClassName(value = '')");
        const normalizeEnd = portal.indexOf('        function getStudentClassSchedules', normalizeStart);
        const filterStart = portal.indexOf('        function getPortalData(key)');
        const filterEnd = portal.indexOf('        function groupPortalDiaryItems', filterStart);
        const storage = new Map([['eduCore_student_courses', JSON.stringify([
            savedCourse,
            { id: 'play-group-course', campusName: 'Main Campus', classGrade: 'Play Group', title: 'Not for Class 3' },
            { id: 'other-campus-course', campusName: 'Other Campus', classGrade: 'Class 3', title: 'Not for Main Campus' }
        ])]]);
        const portalContext = {
            localStorage: { getItem: key => storage.get(key) || '[]' },
            loggedInUser: { campusName: 'Main Campus' },
            STUDENT_ASSIGNMENT_SUBMISSION_KEY: 'assignment-submissions',
            assignmentSubmissionCache: []
        };
        vm.createContext(portalContext);
        vm.runInContext(portal.slice(normalizeStart, normalizeEnd) + portal.slice(filterStart, filterEnd), portalContext);
        const visibleCourses = portalContext.getClassWiseItems('eduCore_student_courses', { classGrade: 'Class 3', campusName: 'Main Campus' });
        assert.equal(JSON.stringify(visibleCourses.map(item => item.id)), JSON.stringify([courseId]));

        const deleted = await (await fetch(`${baseUrl}/${courseId}`, { method: 'DELETE' })).json();
        assert.equal(deleted.success, true);
        assert.equal(deleted.courses.some(item => item.id === courseId), false);
    } finally {
        server.kill();
    }
});
