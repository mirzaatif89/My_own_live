const { collectionHandler } = require('../_lib/mobileCollectionHandler');

module.exports = collectionHandler({
    storeName: 'student_quiz_submissions',
    recordsKey: 'submissions',
    itemKey: 'submission',
    prefix: 'QUIZ-SUB'
});
