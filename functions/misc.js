const {Readable} = require('stream');
const keys = require("../api/keys");

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
const isArray = (obj) => !!obj && obj.constructor === Array;

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
            "text/javascript",
            "application/octet-stream",
            "application/x-python-code",
            "text/x-python",
            "application/x-typescript"
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
            return "other";
    }
};
const icons = {
    video: `https://cdn.jsdelivr.net/gh/kabeer11000/docs-hosted@main/drive/api/icons/movie.svg`,
    document: `https://cdn.jsdelivr.net/gh/kabeer11000/docs-hosted@main/drive/api/icons/document.svg`,
    code: `https://cdn.jsdelivr.net/gh/kabeer11000/docs-hosted@main/drive/api/icons/code.svg`,
    pdf: `https://cdn.jsdelivr.net/gh/kabeer11000/docs-hosted@main/drive/api/icons/picture_as_pdf.svg`,
    text: `https://cdn.jsdelivr.net/gh/kabeer11000/docs-hosted@main/drive/api/icons/subject-24px.svg`,
    broken: `https://cdn.jsdelivr.net/gh/kabeer11000/docs-hosted@main/drive/api/icons/broken_image-24px.svg`,
};
const getThumbnailFromType = (file) => {
    switch (file.type) {
        case "image":
            return `${keys.ftp.servers.vector_kabeersnetwork.thumb}/${file.uploadPath}`;
        case "video":
            return icons.video;
        case "code":
            return icons.code;
        case "document":
            return icons.document;
        case "text":
            return icons.text;
        case "pdf":
            return icons.pdf;
        default:
            return icons.broken;
    }
};
module.exports = {
    makeid: t => {
        let o = "";
        const r = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let a;
        for (a = 0; a < t; a++) o += r.charAt(Math.floor(Math.random() * r.length));
        return o;
    },
    serialize: (object) => Object.entries(object)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join("&"),

    bufferToStream,
    getTypeFromMime,
    getThumbnailFromType,
    isArray,
};
