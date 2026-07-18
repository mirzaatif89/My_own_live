const { collectionHandler } = require('../_lib/mobileCollectionHandler');

module.exports = collectionHandler({
    storeName: 'teacher_salaries',
    recordsKey: 'salaries',
    itemKey: 'salary',
    prefix: 'SAL'
});
