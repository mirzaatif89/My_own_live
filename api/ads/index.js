const { collectionHandler } = require('../_lib/mobileCollectionHandler');

module.exports = collectionHandler({
    storeName: 'ads',
    recordsKey: 'ads',
    itemKey: 'ad',
    prefix: 'AD'
});
