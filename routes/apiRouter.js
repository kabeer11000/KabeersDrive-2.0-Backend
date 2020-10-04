var express = require('express');
var router = express.Router();
const {initSession, executeQuery, executeTransaction} = require('my-sql');

initSession({
    connectionLimit: 10,
    host: 'remotemysql.com',
    user: 'XjfZNQPlxP',
    password: 'H2jQT9NOKp',
    database: 'XjfZNQPlxP',
    port: 3306
});

/* GET home page. */
router.get('/', function (req, res, next) {
    executeQuery(`
        SELECT * FROM folders WHERE owner = '' AND parent = ''`)
        .then((result) => {
            // Do something with the result array
            res.json((result.map(value => value.username)));
        })
        .catch((err) => {
            // Some error has occurred
        });
});

module.exports = router;

