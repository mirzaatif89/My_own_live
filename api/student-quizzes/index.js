const { collectionHandler } = require('../_lib/mobileCollectionHandler');

module.exports = collectionHandler({
    storeName: 'student_quizzes',
    recordsKey: 'quizzes',
    itemKey: 'quiz',
    prefix: 'QUIZ'
});
