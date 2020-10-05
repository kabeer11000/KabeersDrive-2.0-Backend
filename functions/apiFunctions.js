const
    keys = require("../api/keys"),
    mongo = require("mongodb"),
    MongoClient = mongo.MongoClient,
    jwt = require("jsonwebtoken"),
    mongoClient = MongoClient.connect(keys.dataBase.mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }).then(db => db.db("drive"));
const {makeid} = require("./misc");

const createNewMyDrive = async user => mongoClient.then(db => {
    db.collection("folders").findOne({
        itemType: "folder",
        isRoot: true,
        id: makeid(20),
        lastUpdated: Date.now(),
        owner: `${user.userId}`,
        metaData: {
            name: "My Drive",
        },
        children: []
    }, {
        upsert: true
    })
});

const getTypeFromMime = (mime) => {
    const MimeDictionary = {
        image: [
            "image/png",
            "image/jpg",
            "image/jpeg",
            "image/gif",
            "image/svg",
            "image/svg+xml",
        ],
        video: [
            "video/ogg",
            "video/m4a",
            "video/ogg",
            "video/mov",
            "video/mp4"
        ],
        code: [
            "text/css",
            "text/x-php",
            "text/html",
            "text/xhtml",
            "text/javscript"
        ],
        doc: [
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            "application/rtf",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ],
        txt: [
            "text/plain",
        ],
        pdf: [
            "application/pdf",
            "application/x-pdf",
        ],
        none: []
    };
    switch (true) {
        case MimeDictionary.image.includes(mime):
            return "image";
        case MimeDictionary.video.includes(mime):
            return "video";
        case MimeDictionary.code.includes(mime):
            return "code";
        case MimeDictionary.doc.includes(mime):
            return "document";
        case MimeDictionary.txt.includes(mime):
            return "text";
        case MimeDictionary.pdf.includes(mime):
            return "pdf";
        default:
            return null;
    }
};
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
            parentDir = req.params.parentDir ? req.params.parentDir : decoded.userId,
            fileShared = !!req.query.shared,
            required_prems = [`${keys.auth.backend.client_public}:upload`],
            decoded_grantTypes = decoded.grant_types.split("|");

        if (!required_prems.every(i => decoded_grantTypes.includes(i))) return res.status(400).json("Invalid Token Scope");
        const filesArray = [];
        req.files["driveUploads"].map((file, index) => {
            file.uploadId = makeid(20);
            file.uploadPath = `${file.uploadId}${"." + file.name.substring(file.name.lastIndexOf('.') + 1, file.name.length) || file.name}`;
            uploadToRemote(file).then(() => filesArray.push({
                mime: file.mimetype,
                type: getTypeFromMime(file.mimetype),
                name: file.name,
                parentDir: parentDir || decoded.userId,
                id: `${makeid(10)}`,
                fileShared: fileShared,
                userId: decoded.userId,
                path: file.uploadPath
            }));
        });
        return mongoClient.then(db => db.collection("files").insertMany(filesArray)
            .then(() => db.collection("folders").findOneAndUpdate({
                id: parentDir || decoded.userId,
                owner: decoded.userId,
            }, {
                $set: {
                    lastUpdated: Date.now(),
                    $addToSet: {
                        children: filesArray.map(v => v.id)
                    },
                }
            })
                .catch(e => res.status(500).json("Db Connection Error")))
            .catch(e => res.status(500).json("Db Connection Error")))
            .catch(e => res.status(500).json("Db Connection Error"));
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
            id: parentDir
        }).then(folder => {
            const contents = {
                files: [],
                folders: [],
            };
            folder.children.map(item => item.itemType === "file" ? contents.files.push(item.id) : contents.folders.push(item.id));
            res.json({
                files: db.collection("files").find({id: {$in: contents.files}}).toArray().catch(e => []),
                folders: db.collection("folders").find({id: {$in: contents.folders}}).toArray().catch(e => [])
            });
        }).catch(e => res.json("Error Finding Folder")));
    });
};
module.exports = {
    getTypeFromMime,
    createNewMyDrive,
    uploadToRemote,
    handleFileUpload,
    getFolderContents,
};
