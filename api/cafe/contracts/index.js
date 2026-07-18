const { collectionHandler } = require('../../_lib/mobileCollectionHandler');

module.exports = collectionHandler({
    storeName: 'cafe_contracts',
    recordsKey: 'contracts',
    itemKey: 'contract',
    prefix: 'CAFE'
});
