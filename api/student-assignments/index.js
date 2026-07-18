const { collectionHandler } = require('../_lib/mobileCollectionHandler');

module.exports = collectionHandler({
    storeName: 'student_assignments',
    recordsKey: 'assignments',
    itemKey: 'assignment',
    prefix: 'ASG'
});
