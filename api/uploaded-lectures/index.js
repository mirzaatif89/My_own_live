const { collectionHandler } = require('../_lib/mobileCollectionHandler');

module.exports = collectionHandler({
    storeName: 'uploaded_lectures',
    recordsKey: 'lectures',
    itemKey: 'lecture',
    prefix: 'LECTURE'
});
