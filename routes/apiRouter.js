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
const {getTypeFromMime} = require("../functions/apiFunctions");

driveFTPclient.ftp.verbose = true;
driveFTPclient.access({
    ...keys.ftpDetails,
    secure: false
});

const mongoClient = MongoClient.connect(keys.dataBase.mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(db => db.db("drive"));

SqlClient.query = SqlClient.executeQuery;
SqlClient.initSession({
    connectionLimit: 10,
    ...keys.mysqlDB
});
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
    SqlClient.query(sqlQueries.findAllFoldersByUser("bugs"))
        .then((v) => res.json(v))
        .catch((v) => res.json(v));
});
router.get('/old_account_login', (req, res, next) => {
    SqlClient.query(sqlQueries.findUserByCred("bugs", "bugs"))
        .then((v) => res.json(v))
        .catch((v) => res.json(v));
});
router.get("/redirect", (req, res) => {
    // AStroWorld_Cn9OuUNTZRfuaCnwc6:username|AStroWorld_Cn9OuUNTZRfuaCnwc6:email|AStroWorld_Cn9OuUNTZRfuaCnwc6:user_id
    const info = {
        clientId: "S565ds6887df646k5Y4f56IOiDWxRXS840lnnmD",
        scopes: ["AStroWorld_Cn9OuUNTZRfuaCnwc6:account_image", "AStroWorld_Cn9OuUNTZRfuaCnwc6:username", "AStroWorld_Cn9OuUNTZRfuaCnwc6:email", "AStroWorld_Cn9OuUNTZRfuaCnwc6:user_id", "s564d68a34dCn9OuUNTZRfuaCnwc6:getSong", "s564d68a34dCn9OuUNTZRfuaCnwc6:search", "s564d68a34dCn9OuUNTZRfuaCnwc6:feed", "s564d68a34dCn9OuUNTZRfuaCnwc6:history.readwrite"].join("|"),
        callback: encodeURI(endPoints.callbackURLFAKE)
    };
    const id = makeid(10);
    req.session.state = id;
    const authUrl = `https://kabeers-auth.herokuapp.com/auth/authorize?client_id=${info.clientId}&scope=${info.scopes}&response_type=code&redirect_uri=${info.callback}&state=${id}&nonce=${makeid(5)}&prompt=none`;
    res.redirect(authUrl);
});


const uploadToRemote = async (file) => bufferToStream(file.data)
    .then(async fileBuffer => (await driveFTPclient, file.uploadId = makeid(20), file.uploadPath = `${file.uploadId}${"." + file.name.substring(file.name.lastIndexOf('.') + 1, file.name.length) || file.name}`, file.name = `${file.uploadId}${file.name}`, driveFTPclient.uploadFrom(fileBuffer, `${keys.ftpDir}/${file.uploadPath}`, {}).catch(e => console.log(e))))
    .then((status) => ({
        ...file,
        ...status,
        message: "uploaded",
        data: null,
    })).catch(e => console.log(e));

router.get("/file", (req, res) => {
    res.send(`<form action='/api/upload' method='post' encType="multipart/form-data"><input type="file" multiple name="sampleFile"/><input type='submit' value='Upload!'/></form>`);
});
router.post("/upload", (req, res) => {
    uploadToRemote(req.files.sampleFile[0]).then(value => res.json(value)).catch(e => res.json(e))
});
router.post("/upload_____", (req, res) => {
    const
        parentDir = req.query.parentDir,
        fileShared = !!req.query.shared;
    jwt.verify(req.headers.authorization.split(" ")[1], keys.auth.clientSecret, {}, (err, decoded) => {
        if (err || !decoded) return res.status(400).json("Token Error");
        req.files["driveUploads"].map((file, index) => {
            mongoClient.then(db => uploadToRemote(file).then(fileInfo => db.collection("files").findOne({
                    mime: fileInfo.mimetype,
                    type: getTypeFromMime(fileInfo.mimetype),
                    name: fileInfo.name,
                    parentDir: parentDir || decoded.userId,
                    id: `${makeid(10)}`,
                    fileShared: fileShared,
                    userId: decoded.userId,
                    path: fileInfo.uploadPath
                },
                {upsert: true})))
                .then(() => res.status(200).json("Uploaded"))
                .catch(e => res.status(500).json("Db Connection Error"))
        })
    });
});
module.exports = router;

