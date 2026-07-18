const { collectionHandler } = require('../../_lib/mobileCollectionHandler');

module.exports = collectionHandler({
    storeName: 'fee_fine_charges',
    recordsKey: 'fineCharges',
    itemKey: 'fineCharge',
    prefix: 'FINE'
});
