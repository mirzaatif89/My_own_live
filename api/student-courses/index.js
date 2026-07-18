const { collectionHandler } = require('../_lib/mobileCollectionHandler');

module.exports = collectionHandler({
    storeName: 'student_courses',
    recordsKey: 'courses',
    itemKey: 'course',
    prefix: 'COURSE'
});
