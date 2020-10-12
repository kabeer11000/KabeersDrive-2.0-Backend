module.exports = {
    mysqlDB: {
        host: 'remotemysql.com',
        user: 'XjfZNQPlxP',
        password: 'H2jQT9NOKp',
        database: 'XjfZNQPlxP',
        port: 3306
    },
    ftpDetails: {
        host: "ftpupload.net",
        user: "unaux_25335858",
        password: "vmidgc7",
        port: 21,
    },
    ftpDir: `/drive.hosted-kabeersnetwork.unaux.com/htdocs/`,
    ftp: {
        servers: {
            driveHosted: {
                ftpDir: `/drive.hosted-kabeersnetwork.unaux.com/htdocs/docs-userfiles`,
            },
            xampp: {
                ftpDir: "/htdocs/docs-drive/user-files",
                host: "localhost",
                username: "",
                password: "",
                port: 21
            },
            hotteenPP: {
                ftpDir: "/public_html/docs-drive/user-files",
                host: "files.000webhost.com",
                username: "hotteenpp",
                password: "uganda123"
            }
        }
    },
    auth: {
        backend: {
            client_public: "p6rouHTvGJJCn9OuUNTZRfuaCnwc6",
            client_secret: "HLRnfT8Ri6Oe5kf4tiNTv1S4VGhCA"
        },
        clientId: "HlgpBwchUuns80ak3kYaEP8IOiDWxRXS840lnnmD",
        clientSecret: "rRB8nXz2jxp31accE3mHsMtBRGVtIk0AmTV0jU3g"
    },
    dataBase: {
        mongoURI: "mongodb://127.0.0.1:27017",
        //mongoURI: process.env.NODE_ENV === "development" ? "mongodb://127.0.0.1:27017" : "",
    },
};
