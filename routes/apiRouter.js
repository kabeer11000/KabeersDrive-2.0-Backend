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
    driveFTPclient = new ftp.Client;
driveFTPclient.ftp.verbose = true;
driveFTPclient.access({
    ...keys.ftpDetails,
    secure: false
});

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
    findUserById: (username, password) => `SELECT * FROM users WHERE username = '${username}' AND password = '${password}' LIMIT 1`
};
/* GET home page. */
router.get('/', function (req, res, next) {
    SqlClient.query(sqlQueries.findAllFoldersByUser("bugs"))
        .then((v) => res.json(v))
        .catch((v) => res.json(v));
});
router.get('/old_account_login', (req, res, next) => {
    SqlClient.query(sqlQueries.findAllFoldersByUser("bugs"))
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
    .then(async fileBuffer => (await driveFTPclient, file.name = `${makeid(20)}${file.name}`, driveFTPclient.uploadFrom(fileBuffer, `${keys.ftpDir}/${makeid(30)}${"." + file.name.substring(file.name.lastIndexOf('.') + 1, file.name.length) || file.name}`, {}).catch(e => console.log(e))))
    .then((status) => ({
        ...file,
        ...status,
        message: "uploaded",
        data: null,
    })).catch(e => console.log(e));

router.get("/file", (req, res) => {
    res.send(`<form action='/api/upload' method='post' encType="multipart/form-data"><input type="file" name="sampleFile"/><input type='submit' value='Upload!'/></form>`);
});
router.post("/upload", (req, res) => {
    jwt.verify(req.headers.authorization.split(" ")[1], keys.auth.clientSecret, {}, function (err, decoded) {
        if (err || !decoded) return res.status(400).json(err);
    });
    uploadToRemote(req.files.sampleFile).then(value => res.json(value)).catch(e => res.json(e));
});
module.exports = router;

