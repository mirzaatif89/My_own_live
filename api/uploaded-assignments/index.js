const { collectionHandler } = require('../_lib/mobileCollectionHandler');

module.exports = collectionHandler({
    storeName: 'uploaded_assignments',
    recordsKey: 'assignments',
    itemKey: 'assignment',
    prefix: 'UPLOAD-ASG'
});
