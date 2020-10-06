const keys = require("../api/keys");
const MongoClient = require("mongodb").MongoClient;
const jwt = require("jsonwebtoken");
const ftp = require("basic-ftp");
const {makeid, getTypeFromMime, bufferToStream} = require("./misc");

const driveFTPclient = new ftp.Client().access({
    ...keys.ftpDetails,
    secure: false
});
const mongoClient = MongoClient.connect(keys.dataBase.mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(db => db.db("drive"));


const createNewMyDrive = async (user, res = null, req = null) => mongoClient.then(db => db.collection("folders").insertOne({
    itemType: "folder",
    isRoot: true,
    id: user.user_id,
    lastUpdated: Date.now(),
    owner: `${user.user_id}`,
    parents: [],
    metaData: {
        name: "My Drive",
        shared: false
    }
}).then((r) => res.json(r)));


const uploadToRemote = async (file) => bufferToStream(file.data)
    .then(async fileBuffer => (await driveFTPclient, driveFTPclient.uploadFrom(fileBuffer, `${keys.ftpDir}/${file.uploadPath}`, {}).catch(e => console.log(e))))
    .then((status) => ({
        ...file,
        ...status,
        message: "uploaded",
        data: null,
    })).catch(e => console.log(e));

const handleFileUpload = async (req, res, next) => {
    jwt.verify(req.headers.authorization.split(" ")[1], keys.auth.backend.client_secret, {}, (err, decoded) => {
        if (err) return res.status(400).json(err.message);
        const
            parentDir = req.params.parentDir ? req.params.parentDir : decoded.user_id,
            fileShared = !!req.query.shared,
            required_prems = [`${keys.auth.backend.client_public}:upload`],
            decoded_grantTypes = decoded.grant_types.split("|");

        if (!required_prems.every(i => decoded_grantTypes.includes(i))) return res.status(400).json("Invalid Token Scope");
        mongoClient.then(db => db.collection("folders").findOne({
            id: parentDir,
            owner: decoded.user_id,
        }).then(async parentFolder => {
            const filesArray = [];
            req.files["driveUploads"].map(file => {
                file.uploadId = makeid(20);
                file.uploadPath = `${file.uploadId}${"." + file.name.substring(file.name.lastIndexOf('.') + 1, file.name.length) || file.name}`;
                uploadToRemote(file).then(() => filesArray.push({
                    mime: file.mimetype,
                    type: getTypeFromMime(file.mimetype),
                    name: file.name,
                    parentDir: parentDir,
                    id: `${makeid(10)}`,
                    fileShared: fileShared,
                    userId: decoded.user_id,
                    path: file.uploadPath,
                    parents: [...parentFolder.parents, parentFolder.id]
                }));
            });
            await db.collection("files").insertMany(filesArray)
                .then(() => res.status(200).json({
                    message: "inserted",
                    ...filesArray,
                }))
                .catch(() => res.status(500).json("Db Connection Error"));
        })
            .catch(() => res.status(500).json("Db Connection Error")))
            .catch(() => res.status(500).json("Db Connection Error"));
    });
};
const getFolderContents = (req, res, next) => {
    jwt.verify(req.headers.authorization.split(" ")[1], keys.auth.backend.client_secret, {}, (err, decoded) => {
        if (err) return res.status(400).json(err.message);
        const parentDir = req.params.folderId ? req.params.folderId : decoded.userId;
        const required_prems = [`${keys.auth.backend.client_public}:folder`];
        const decoded_grantTypes = decoded.grant_types.split("|");
        if (!required_prems.every(i => decoded_grantTypes.includes(i))) return res.status(400).json("Invalid Token Scope");

        mongoClient.then(db => db.collection("folder").findOne({
            id: parentDir,
            owner: decoded.userId
        }).then(folder => {
            const contents = {
                files: [],
                folders: [],
            };
            folder.children.map(item => item.itemType === "file" ? contents.files.push(item.id) : contents.folders.push(item.id));
            res.json({
                type: "drive#folder",
                files: db.collection("files").find({id: {$in: contents.files}}).toArray().catch(() => []),
                folders: db.collection("folders").find({id: {$in: contents.folders}}).toArray().catch(() => [])
            });
        }).catch(() => res.json("Error Finding Folder")));
    });
};
const createNewFolder = async (req, res, next) => {
    if (!req.headers.authorization || !req.body.name) return res.status(400).json("Invalid Params");
    jwt.verify(req.headers.authorization.split(" ")[1], keys.auth.backend.client_secret, {}, (err, decoded) => {
        if (err) return res.status(400).json(err.message);
        const parentDir = req.body.id ? req.body.id : decoded.user_id;
        const required_perms = [`${keys.auth.backend.client_public}:folder`];
        const decoded_grantTypes = decoded.grant_types.split("|");
        if (!required_perms.every(i => decoded_grantTypes.includes(i))) return res.status(400).json("Invalid Token Scope");

        const currentFolderId = makeid(20);
        mongoClient.then(db => db.collection("folders").findOne({
            id: parentDir,
            owner: decoded.user_id,
        }).then(parentFolder => parentFolder ? db.collection("folders").insertOne({
            isRoot: false,
            id: currentFolderId,
            created: Date.now(),
            lastUpdated: Date.now(),
            owner: `${decoded.user_id}`,
            metaData: {
                name: req.body.name,
                isShared: true,
            },
            parents: [...parentFolder.parents, parentFolder.id]
        }) : res.status(400).json("Parent Dir Not Found")).then((r) => res.json(r.ops[0])))
    });
};
/* Unused Functions */
const handleFolderSearch = async (req, res, next) => {
    await mongoClient.then(async db => {
        var path = [];
        var item = await db.collection("folders").findOne({id: "wUahWq97tFq5QABglT6l"});
        while (item.parent) {
            item = await db.collection("folders").findOne({id: item.parent});
            path.push(item);
            console.log(item);
        }
        await res.json(path);
    })
};
const getParentFromId = async (req, res, next) => {
    await mongoClient.then(async db => {
        db.collection("folders").createIndex({parent: 1});
        const path = [];
        let item = await db.collection("folders").findOne({id: "IUIhzI0N4Kh7XQEKThvi"});
        while (item.parent) {
            item = await db.collection("folders").findOne({id: item.parent});
            path.push(item.id);
        }
        await res.json(path.reverse());
    })
};
const getChildrenFromId = async (req, res, next) => {
    await mongoClient.then(async db => {
        const path = [];
        let item = await db.collection("folders").findOne({id: "b4000376114184b38e2f00e43b070a9fe239457d"});
        while (item && item.children) {
            item = await db.collection("folders").find({
                id: {
                    $in: [...item.children.map(v => v.type === "folder" ? v.id : null).filter(Boolean)]
                }
            }).toArray();
            path.push(item);
        }
        await res.json(path);
    })
};
/* Unused Functions */

const removeFolderById = (req, res, next) => {
    if (!req.headers.authorization || !req.body.id) return res.status(400).json("Invalid Params");
    jwt.verify(req.headers.authorization.split(" ")[1], keys.auth.backend.client_secret, {}, (err, decoded) => {
        if (err) return res.status(400).json(err.message);
        const parentDir = req.body.id;
        const required_perms = [`${keys.auth.backend.client_public}:folder`];
        const decoded_grantTypes = decoded.grant_types.split("|");

        if (!required_perms.every(i => decoded_grantTypes.includes(i))) return res.status(400).json("Invalid Token Scope");
        mongoClient.then(db => db.collection("folders").removeMany({
            $or: [{id: parentDir}, {parents: parentDir}],
            owner: decoded.user_id
        }).then(() => res.json({
            message: "complete"
        })).catch((e) => res.status(500).json("Database Error")))
            .catch((e) => res.status(500).json("Database Error"))
    });
};
const detailFunctions = {
    getFileDetailsById: (req, res, next) => {
        if (!req.headers.authorization || !req.params.id) return res.status(400).json("Invalid Params");
        jwt.verify(req.headers.authorization.split(" ")[1], keys.auth.backend.client_secret, {}, (err, decoded) => {
            if (err) return res.status(400).json(err.message);
            const fileId = req.params.id;
            const required_perms = [`${keys.auth.backend.client_public}:folder`];
            const decoded_grantTypes = decoded.grant_types.split("|");

            if (!required_perms.every(i => decoded_grantTypes.includes(i))) return res.status(400).json("Invalid Token Scope");
            mongoClient.then(db => db.collection("files").findOne({
                owner: decoded.user_id,
                id: fileId
            })
                .then(file => res.json(file))
                .catch(e => res.status(400).json("File Not Found")))
                .catch(e => res.status(500).json("Database Error Occured"));
        });
    },
    deleteFileById: (req, res, next) => {
        if (!req.headers.authorization || !req.params.id) return res.status(400).json("Invalid Params");
        jwt.verify(req.headers.authorization.split(" ")[1], keys.auth.backend.client_secret, {}, (err, decoded) => {
            if (err) return res.status(400).json(err.message);
            const fileId = req.params.id;
            const required_perms = [`${keys.auth.backend.client_public}:folder`];
            const decoded_grantTypes = decoded.grant_types.split("|");

            if (!required_perms.every(i => decoded_grantTypes.includes(i))) return res.status(400).json("Invalid Token Scope");
            mongoClient.then(db => db.collection("files").findOneAndDelete({
                owner: decoded.user_id,
                id: fileId
            })
                .then(file => res.json({...file, message: "deleted"}))
                .catch(e => res.status(400).json("File Not Found")))
                .catch(e => res.status(500).json("Database Error Occured"));
        });
    }
};
module.exports = {
    createNewMyDrive,
    uploadToRemote,
    handleFileUpload,
    getFolderContents,
    createNewFolder,
    handleFolderSearch,
    getChildrenFromId,
    getParentFromId,
    removeFolderById,
    detailFunctions,
};
