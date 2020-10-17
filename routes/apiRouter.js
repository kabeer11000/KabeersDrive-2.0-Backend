const router = require("express").Router();
const apiFunctions = require("../functions/apiFunctions");
const Mongoose = require('mongoose');
const keys = require("../api/keys");

router.get("/get/folder/:folderId?", (req, res, next) => apiFunctions.getFolderContents(req, res, next));
router.get("/get/file/:id", (req, res, next) => apiFunctions.detailFunctions.getFileDetailsById(req, res, next));

router.get("/get/shared/folder/:folderId?", (req, res, next) => apiFunctions.getSharedFolderContents(req, res, next));
router.get("/get/shared/file/:id", (req, res, next) => apiFunctions.detailFunctions.getFileDetailsById(req, res, next));

router.post("/delete/folder", (req, res, next) => apiFunctions.removeFolderById(req, res, next));
router.post("/delete/file/:id", (req, res, next) => apiFunctions.detailFunctions.deleteFileById(req, res, next));

router.post("/create/new/folder", (req, res, next) => apiFunctions.createNewFolder(req, res, next));
router.post("/create/new/file", (req, res, next) => apiFunctions.createNewFolder(req, res, next));

router.post("/upload/:parentDir?", (req, res, next) => apiFunctions.handleFileUpload(req, res, next));

router.get("/folder/search/:folderId?", (req, res, next) => apiFunctions.getParentFromId(req, res, next));
router.get("/create/new/mydrive", (req, res, next) => apiFunctions.createNewMyDrive({
    "account_image": "https://avatars2.githubusercontent.com/u/52799968?s=40&v=4",
    "username": "baggase",
    "email": "baggase11000@gmail.com",
    "user_id": "b4000376114184b38e2f00e43b070a9fe239457d"
}, res, req));


router.get("/get/recent/file/:num?", (req, res, next) => apiFunctions.detailFunctions.getNRecentFiles(req, res, next));

router.post("/sharing/file/:id", (req, res, next) => apiFunctions.detailFunctions.changeFileSharing(req, res, next));
router.post("/sharing/folder/:id", (req, res, next) => apiFunctions.handleFolderSharing(req, res, next));

router.post("/delete/bulk/file", (req, res, next) => apiFunctions.detailFunctions.fileBulkDelete(req, res, next));

module.exports = router;

