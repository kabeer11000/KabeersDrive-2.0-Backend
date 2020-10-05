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
};
