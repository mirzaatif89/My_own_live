const { collectionHandler } = require('../../_lib/mobileCollectionHandler');

module.exports = collectionHandler({
    storeName: 'library_issues',
    recordsKey: 'issues',
    itemKey: 'issue',
    prefix: 'LIB'
});
