const keys = require("../api/keys");
const MongoClient = require("mongodb").MongoClient;
const jwt = require("jsonwebtoken");
const ftp = require("basic-ftp");
const {makeid, getTypeFromMime, bufferToStream} = require("./misc");
const Client = require('@icetee/ftp');
const driveFTPClient2 = new Client();
//const driveFTPclient = new ftp.Client();
const util = require("util");
const {isArray} = require("./misc");
const {getThumbnailFromType} = require("./misc");


const mongoClient = MongoClient.connect(keys.dataBase.mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(db => db.db("drive"));

// driveFTPclient.ftp.verbose = true;
// driveFTPclient.access({
//     ...keys.ftpDetails,
//     secure: false
// }).catch(e => console.log(e));
/*
const uploadToRemote = (file) => bufferToStream(file.data)
    .then(fileBuffer => driveFTPclient.appendFrom(fileBuffer,
        `${keys.ftpDir}/css/${file.uploadPath}`,
        {}).catch(e => console.log(e)))
    .then((status) => ({
        ...file,
        ...status,
        message: "uploaded",
        data: null,
    })).catch(e => null);

*/

const uploadToRemote = (file) => new Promise((resolve, reject) => {
    try {
        driveFTPClient2.connect({
            ...keys.ftp.servers.vector_kabeersnetwork,
        });
        driveFTPClient2.put(file.data, `${keys.ftp.servers.vector_kabeersnetwork.ftpDir}/${file.uploadPath}`, (err) => {
            if (err) return reject(err);
            driveFTPClient2.end();
            driveFTPClient2.destroy();

            resolve({
                done: true
            });
        });
    } catch (err) {
        reject(err);
    }
});
const createNewMyDrive = async (user, req, res, next) => {
    console.log({
        itemType: "folder",
        isRoot: true,
        id: user.user_id,
        lastUpdated: Date.now(),
        owner: user.user_id,
        immediateParent: null,
        parents: [],
        metaData: {
            name: "My Drive",
            shared: false
        }
    });
    await mongoClient.then(db => db.collection("folders").updateOne(
        {
            id: user.user_id,
        }, {
            $set: {
                itemType: "folder",
                isRoot: true,
                id: user.user_id,
                lastUpdated: Date.now(),
                owner: user.user_id,
                immediateParent: null,
                parents: [],
                metaData: {
                    name: "My Drive",
                    shared: false
                }
            }
        }, {
            upsert: true
        })
        .then(r => console.log(r)))
        .catch(e => console.log(e));
};

const handleFileUpload = async (req, res, next) => {
    if (!req.files || !req.files.driveUploads) return res.status(400).json("invalid Params");
    jwt.verify(req.headers.authorization.split(" ")[1], keys.auth.backend.client_secret, {}, (err, decoded) => {
        if (err) return res.status(400).json(err.message);
        const
            parentDir = req.params.parentDir ? req.params.parentDir : decoded.user_id,
            fileShared = !!req.query.shared,
            required_perms = [`${keys.auth.backend.client_public}:upload`],
            decoded_grantTypes = decoded.grant_types.split("|"),
            databaseFiles = [];

        if (!required_perms.every(i => decoded_grantTypes.includes(i))) return res.status(400).json("Invalid Token Scope");
        mongoClient.then(db => db.collection("folders").findOne({
            id: parentDir,
            owner: decoded.user_id,
        }).then(parentFolder => {
            if (!parentFolder) return res.status(400).json("Folder Not Found");

            /// Is Array Check Single aur Multiple Uploads Kay Liay Hai
            (isArray(req.files.driveUploads) ? [...req.files.driveUploads] : [req.files.driveUploads]).map(async file => {
                file.uploadId = makeid(30);
                file.type = getTypeFromMime(file.mimetype);
                file.uploadPath = `${file.uploadId}${"." + file.name.substring(file.name.lastIndexOf('.') + 1, file.name.length) || file.name}`;
                await uploadToRemote(file)
                    .then(databaseFiles.push({
                        thumbnail: getThumbnailFromType(file),
                        mime: file.mimetype,
                        type: file.type,
                        name: file.name,
                        immediateParent: parentDir,
                        id: `${makeid(15)}`,
                        fileShared: parentFolder.metaData.shared,
                        owner: decoded.user_id,
                        path: file.uploadPath,
                        parents: [...parentFolder.parents, parentFolder.id]
                    }))
                    .catch(e => console.log(e));
            });
            driveFTPClient2.end();
            //driveFTPClient2.destroy();
            // Everything Working Bas FTP connection ki waja say Mongodb Error Day raha hai
            db.collection("files").insertMany(databaseFiles)
                .then(() => res.status(200).json(databaseFiles))
                .catch(e => res.status(500).json(e))
        })).catch(e => res.json(e));
    });
};
const getFolderContents = (req, res, next) => {
    jwt.verify(req.headers.authorization.split(" ")[1], keys.auth.backend.client_secret, {}, (err, decoded) => {
        if (err) return res.status(400).json(err.message);
        const parentDir = req.params.folderId ? req.params.folderId : decoded.user_id;
        const required_prems = [`${keys.auth.backend.client_public}:folder`];
        const decoded_grantTypes = decoded.grant_types.split("|");
        if (!required_prems.every(i => decoded_grantTypes.includes(i))) return res.status(400).json("Invalid Token Scope");
        mongoClient.then(db => db.collection("folders").findOne({
            $or: [{
                id: parentDir,
                owner: decoded.user_id
            }, {
                id: parentDir,
                "metaData.shared": true
            }]
        }).then(async folder => folder ? await res.json({
            ...folder,
            type: "drive#folder",
            files: await db.collection("files").find({
                immediateParent: parentDir
            }).toArray().catch(() => []),
            folders: await db.collection("folders").find({
                immediateParent: parentDir
            }).toArray().catch(() => [])
        }) : res.status(400).json({
            message: "Not Found"
        })).catch(() => res.json("Error Finding Folder")));
    });
};
const getSharedFolderContents = (req, res, next) => {
    const parentDir = req.params.folderId;
    mongoClient.then(db => db.collection("folders").findOne({
        id: parentDir,
        isShared: true
    }).then(async folder => folder ? await res.json({
        ...folder,
        type: "drive#folder",
        files: await db.collection("files").find({
            immediateParent: parentDir
        }).toArray().catch(() => []),
        folders: await db.collection("folders").find({
            immediateParent: parentDir
        }).toArray().catch(() => [])
    }) : res.status(400).json({
        message: "Not Found"
    })).catch(() => res.json("Error Finding Folder")));
};
/*
                files: await db.collection("files").aggregate([
                    { $project: { id: 1, parents: { $slice: [ "$parents", -1 ] } } },
                    { $match: { parents: parentDir } }
                ]).toArray().catch(() => []),



await db.collection("files").aggregate([
                    {$project: {parents: {$arrayElemAt: ["$parents", -1]}}},
                    {$match: {parents: parentDir}}
                ]).toArray().catch(() => [])


{ $project: { id: 1, parents: { $arrayElemAt: [ "$parents", -1 ] } } }
 */
const createNewFolder = async (req, res, next) => {
    if (!req.headers.authorization || !req.body.name) return res.status(400).json("Invalid Params");
    jwt.verify(req.headers.authorization.split(" ")[1], keys.auth.backend.client_secret, {}, (err, decoded) => {
        if (err) return res.status(400).json(err.message);
        const parentDir = req.body.id ? req.body.id : decoded.user_id;
        const required_perms = [`${keys.auth.backend.client_public}:folder`];
        const decoded_grantTypes = decoded.grant_types.split("|");
        if (!required_perms.every(i => decoded_grantTypes.includes(i))) return res.status(400).json("Invalid Token Scope");

        mongoClient.then(db => db.collection("folders").findOne({
            id: parentDir,
            owner: decoded.user_id,
        }).then(parentFolder => parentFolder ? db.collection("folders").insertOne({
            isRoot: false,
            id: makeid(20),
            created: Date.now(),
            lastUpdated: Date.now(),
            owner: `${decoded.user_id}`,
            immediateParent: parentDir,
            metaData: {
                name: req.body.name,
                shared: parentFolder.metaData.shared || false,
            },
            parents: [...parentFolder.parents, parentFolder.id]
        }) : res.status(400).json("Parent Dir Not Found")).then((r) => res.json(r.ops[0])))
    });
};
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
const handleFolderSharing = (req, res, next) => {
    if (!req.headers.authorization || !req.params.id || !req.body.method) return res.status(400).json("Invalid Params");
    jwt.verify(req.headers.authorization.split(" ")[1], keys.auth.backend.client_secret, {}, (err, decoded) => {
        if (err) return res.status(400).json(err.message);
        const parentDir = req.params.id;
        const required_perms = [`${keys.auth.backend.client_public}:folder`];
        const decoded_grantTypes = decoded.grant_types.split("|");

        if (!required_perms.every(i => decoded_grantTypes.includes(i))) return res.status(400).json("Invalid Token Scope");
        mongoClient.then(async db => {
            await db.collection("files").updateMany({
                parents: parentDir,
                owner: decoded.user_id,
            }, {
                $set: {
                    fileShared: JSON.parse(req.body.method)
                }
            });
            await db.collection("folders").updateMany({
                $or: [{id: parentDir}, {parents: parentDir}],
                owner: decoded.user_id,
                isRoot: false
            }, {
                $set: {
                    "metaData.shared": JSON.parse(req.body.method)
                }
            })
        }).then(() => res.json({
            message: "complete"
        }))
            .catch((e) => res.status(500).json("Database Error"))
    });
};

const getAllShared = (req, res, next) => {
    if (!req.headers.authorization || !req.params.id) return res.status(400).json("Invalid Params");
    jwt.verify(req.headers.authorization.split(" ")[1], keys.auth.backend.client_secret, {}, (err, decoded) => {
        if (err) return res.status(400).json(err.message);
        const fileId = req.params.id;
        const required_perms = [`${keys.auth.backend.client_public}:folder`];
        const decoded_grantTypes = decoded.grant_types.split("|");

        if (!required_perms.every(i => decoded_grantTypes.includes(i))) return res.status(400).json("Invalid Token Scope");
        mongoClient.then(async db => res.json({
            files: await db.collection("files").find({
                owner: decoded.user_id,
                fileShared: true
            }).toArray().catch(e => []),
            folders: await db.collection("folders").find({
                owner: decoded.user_id,
                "metaData.shared": true
            }).toArray().catch(e => []),
        }));
    });
};
const detailFunctions = {
    getSharedFileDetailsById: (req, res, next) => {
        if (!req.params.id) return res.status(400).json("Invalid Params");
        const fileId = req.params.id;
        mongoClient.then(db => db.collection("files").findOne({
            owner: decoded.user_id,
            id: fileId
        })
            .then(file => res.json(file))
            .catch(e => res.status(400).json("File Not Found")))
            .catch(e => res.status(500).json("Database Error Occured"));
    },
    getFileDetailsById: (req, res, next) => {
        if (!req.headers.authorization || !req.params.id) return res.status(400).json("Invalid Params");
        jwt.verify(req.headers.authorization.split(" ")[1], keys.auth.backend.client_secret, {}, (err, decoded) => {
            if (err) return res.status(400).json(err.message);
            const fileId = req.params.id;
            const required_perms = [`${keys.auth.backend.client_public}:folder`];
            const decoded_grantTypes = decoded.grant_types.split("|");

            if (!required_perms.every(i => decoded_grantTypes.includes(i))) return res.status(400).json("Invalid Token Scope");
            mongoClient.then(db => db.collection("files").findOne({
                $or: [{
                    owner: decoded.user_id,
                    id: fileId
                }, {
                    fileShared: true,
                    id: fileId
                }]
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
            const required_perms = [`${keys.auth.backend.client_public}:files.readwrite`];
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
    },
    getNRecentFiles: (req, res, next) => {
        if (!req.headers.authorization) return res.status(400).json("Invalid Params");
        jwt.verify(req.headers.authorization.split(" ")[1], keys.auth.backend.client_secret, {}, (err, decoded) => {
            if (err) return res.status(400).json(err.message);
            const required_perms = [`${keys.auth.backend.client_public}:files`];
            const decoded_grantTypes = decoded.grant_types.split("|");

            if (!required_perms.every(i => decoded_grantTypes.includes(i))) return res.status(400).json("Invalid Token Scope");
            mongoClient.then(db => {
                db.collection("files").find({
                    owner: decoded.user_id,
                }).sort({$natural: 1}).limit(req.params.num ? parseInt(req.params.num) : 10).toArray().then(files => res.status(200).json({
                    files: files || []
                }));
            })
        })
    },
    fileBulkDelete: (req, res, next) => {
        if (!req.headers.authorization || !req.body.ids) return res.status(400).json("Invalid Params");
        jwt.verify(req.headers.authorization.split(" ")[1], keys.auth.backend.client_secret, {}, (err, decoded) => {
            if (err) return res.status(400).json(err.message);
            const required_perms = [`${keys.auth.backend.client_public}:files`];
            const decoded_grantTypes = decoded.grant_types.split("|");
            if (!required_perms.every(i => decoded_grantTypes.includes(i))) return res.status(400).json("Invalid Token Scope");
            mongoClient.then(db => db.collection("files").removeMany({
                owner: decoded.user_id,
                id: {
                    $in: [...req.body.ids.split("|")]
                }
            }).catch(e => res.status(500).json("Database Error"))).then(() => {
                res.json({
                    message: "done"
                })
            }).catch(e => res.status(500).json("Database Error"));
        });
    },
    changeFileSharing: (req, res, next) => {
        if (!req.headers.authorization || !req.params.id || !req.body.sharing) return res.status(400).json("Invalid Params");
        jwt.verify(req.headers.authorization.split(" ")[1], keys.auth.backend.client_secret, {}, (err, decoded) => {
            if (err) return res.status(400).json(err.message);
            const fileId = req.params.id;
            const required_perms = [`${keys.auth.backend.client_public}:files`];
            const decoded_grantTypes = decoded.grant_types.split("|");
            if (!required_perms.every(i => decoded_grantTypes.includes(i))) return res.status(400).json("Invalid Token Scope");
            mongoClient.then(db => db.collection("files").findOneAndUpdate({
                owner: decoded.user_id,
                id: fileId
            }, {
                $set: {
                    fileShared: JSON.parse(req.body.sharing)
                },
            })
                .then(file => res.json(file))
                .catch(e => res.status(400).json("File Not Found")))
                .catch(e => res.status(500).json("Database Error Occured"));
        });
    },
};
const ConnectedAppsAddFile = (req, res, next) => {
};
module.exports = {
    createNewMyDrive,
    uploadToRemote,
    handleFileUpload,
    getFolderContents,
    createNewFolder,
    removeFolderById,
    detailFunctions,
    getAllShared,
    getSharedFolderContents,
    handleFolderSharing,
};

