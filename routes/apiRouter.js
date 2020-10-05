const express = require("express"),
    router = express.Router(),
    SqlClient = ({
        initSession: initSession,
        executeQuery: executeQuery,
        executeTransaction: executeTransaction
    } = require("my-sql")),
    keys = require("../api/keys"),
    fs = require("fs"),
    jwt = require("jsonwebtoken"),
    ftp = require("basic-ftp"),
    driveFTPclient = new ftp.Client,
    mongo = require("mongodb"),
    MongoClient = mongo.MongoClient;
const apiFunctions = require("../functions/apiFunctions");
const {getTypeFromMime} = require("../functions/apiFunctions");

// try {
//     driveFTPclient.ftp.verbose = true;
//     driveFTPclient.access({
//         ...keys.ftpDetails,
//         secure: false
//     });
// } catch (e) {
//     //console.log(e)
// }
const mongoClient = MongoClient.connect(keys.dataBase.mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(db => db.db("drive"));
//
// SqlClient.query = SqlClient.executeQuery;
// SqlClient.initSession({
//     connectionLimit: 10,
//     ...keys.mysqlDB
// });
const {Readable} = require('stream');

/**
 * @param binary Buffer
 * returns readableInstanceStream Readable
 */
const bufferToStream = async (binary) => new Readable({
    read() {
        this.push(binary);
        this.push(null);
    }
});

const makeid = t => {
    let o = "";
    const r = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let a;
    for (a = 0; a < t; a++) o += r.charAt(Math.floor(Math.random() * r.length));
    return o;
};
const sqlQueries = {
    findAllFoldersByUser: (userName) => `SELECT * FROM folders WHERE owner = '${userName}';`,
    findOneFolderById: (folderId, userName) => `SELECT * FROM folders WHERE uniqueId = '${folderId}' AND owner = '${userName}' LIMIT 1`,
    findUserByCred: (username, password) => `SELECT * FROM users WHERE username = '${username}' AND password = '${password}' LIMIT 1`
};
/* GET home page. */
router.get('/', function (req, res, next) {
    // Root Folder Creation
    mongoClient.then(db => {
        db.collection("folders").findOne({
            itemType: "folder",
            isRoot: true,
            id: makeid(20),
            lastUpdated: Date.now(),
            owner: "[OWNER ID]",
            metaData: {
                name: "My Drive",

            },
            children: []
        }, {
            upsert: true
        })
    });

    // File Creation
    mongoClient.then(db => {
        db.collection("folders").findOneAndUpdate({
            id: "[FIle Creation Directory]",
            owner: "[OWNER ID]",
        }, {
            $set: {
                lastUpdated: Date.now(),
                $addToSet: {
                    children:
                        {
                            itemType: "file",
                            id: "[UNIQUE ID]",
                        },
                },
            }
        }, {
            upsert: true
        })
    });


});

router.get("/get/folder/:folderId?", (req, res, next) => apiFunctions.getFolderContents(req, res, next));
router.post("/upload/:parentDir?", (req, res, next) => apiFunctions.handleFileUpload(req, res, next));
module.exports = router;

