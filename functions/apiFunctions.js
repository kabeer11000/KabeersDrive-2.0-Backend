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
module.exports = {
    getTypeFromMime,
};
