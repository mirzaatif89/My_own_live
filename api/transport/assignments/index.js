const { collectionHandler } = require('../../_lib/mobileCollectionHandler');

module.exports = collectionHandler({
    storeName: 'transport_assignments',
    recordsKey: 'assignments',
    itemKey: 'assignment',
    prefix: 'TRN'
});
