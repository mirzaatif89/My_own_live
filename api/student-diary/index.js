const { collectionHandler } = require('../_lib/mobileCollectionHandler');

module.exports = collectionHandler({
    storeName: 'student_diary',
    recordsKey: 'diary',
    itemKey: 'entry',
    prefix: 'DIARY'
});
