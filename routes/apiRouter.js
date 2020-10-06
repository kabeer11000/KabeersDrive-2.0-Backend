const router = require("express").Router();
const apiFunctions = require("../functions/apiFunctions");
const Mongoose = require('mongoose');
const keys = require("../api/keys");

router.get("/get/folder/:folderId?", (req, res, next) => apiFunctions.getFolderContents(req, res, next));
router.get("/get/file/:id?", (req, res, next) => apiFunctions.detailFunctions.getFileDetailsById(req, res, next));

router.post("/delete/folder", (req, res, next) => apiFunctions.removeFolderById(req, res, next));
router.post("/create/new/folder", (req, res, next) => apiFunctions.createNewFolder(req, res, next));
router.post("/upload/:parentDir?", (req, res, next) => apiFunctions.handleFileUpload(req, res, next));
router.get("/folder/search/:folderId?", (req, res, next) => apiFunctions.getParentFromId(req, res, next));
router.get("/create/new/mydrive", (req, res, next) => apiFunctions.createNewMyDrive({
    "account_image": "https://avatars2.githubusercontent.com/u/52799968?s=40&v=4",
    "username": "baggase",
    "email": "baggase11000@gmail.com",
    "user_id": "b4000376114184b38e2f00e43b070a9fe239457d"
}, res, req));

module.exports = router;
