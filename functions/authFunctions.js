const endPoints = require("../api/endPoints");
const {makeid} = require("../functions/misc");
const keys = require("../api/keys");
const axios = require("axios");
const misc = require("./misc");
const apiFunc = require("./apiFunctions");

const OauthAPIIds = {
    kabeersDrive: "p6rouHTvGJJCn9OuUNTZRfuaCnwc6",
    kabeersAuth: "AStroWorld_Cn9OuUNTZRfuaCnwc6",
    scopes: ["AStroWorld_Cn9OuUNTZRfuaCnwc6:account_image", "AStroWorld_Cn9OuUNTZRfuaCnwc6:username", "AStroWorld_Cn9OuUNTZRfuaCnwc6:email", "AStroWorld_Cn9OuUNTZRfuaCnwc6:user_id", "p6rouHTvGJJCn9OuUNTZRfuaCnwc6:files", "p6rouHTvGJJCn9OuUNTZRfuaCnwc6:folder", "p6rouHTvGJJCn9OuUNTZRfuaCnwc6:email", "p6rouHTvGJJCn9OuUNTZRfuaCnwc6:username", "p6rouHTvGJJCn9OuUNTZRfuaCnwc6:upload"].join("|"),
};

const OauthCallbackHandler = async (req, res, next) => {
    if (!req.query.code) return res.status(302).json("Nothing Here");
    if (req.query.state !== req.session.state) return res.status(402).json("Invalid State");
    axios({
        method: "post",
        url: "https://kabeers-auth.herokuapp.com/auth/token?modern=true",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        data: misc.serialize({
            client_secret: keys.auth.clientSecret, // Client App IDs
            client_public: keys.auth.clientId,
            auth_code: req.query.code,
            grant_types: OauthAPIIds.scopes
        })
    }).then(response => {
        req.session.state = null;
        const
            DriveTokens = response.data.find(app => app.app_id === OauthAPIIds.kabeersDrive),
            IdentityProviderTokens = response.data.find(app => app.app_id === OauthAPIIds.kabeersAuth);

        res.cookie("token", JSON.stringify({
            expire: "2h",
            exp: Date.now(),
            token: DriveTokens.access_token
        }), {maxAge: 7.2e+6});
        res.cookie("oauth_refresh_token", DriveTokens.refresh_token, {maxAge: 8.64e+8,});
        res.cookie("user_data_token", JSON.stringify({
            expire: "2h",
            exp: Date.now(),
            token: IdentityProviderTokens.access_token
        }), {maxAge: 7.2e+6, httpOnly: true});
        res.cookie("user_data_refresh_token", IdentityProviderTokens.refresh_token, {maxAge: 8.64e+8, httpOnly: true});

        res.redirect("/");
    }).catch(error => res.status(400).json(error.message));
};
const getUserData = async (req, res, next) => {
    if (!req.cookies["user_data_token"]) return res.status(400).json("No UserData Cookie");
    const token = JSON.parse(req.cookies["user_data_token"]).token;
    axios.post("https://kabeers-auth.herokuapp.com/user/userinfo", misc.serialize({
        token: token
    }), {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        }
    })
        .then(data => (apiFunc.createNewMyDrive(data.data), res.status(200).json(data.data)))// Create New MyDrive New or Returning Handle Karlaiga
        .catch(e => res.status(400).json(e.message));
};
const OauthRefreshToken = (req, res, next) => {
    if (!req.cookies["oauth_refresh_token"]) return res.status(402).json("Refresh Token Does Not Exists");
    const
        refreshToken = req.cookies["oauth_refresh_token"],
        jwtPayload = JSON.parse(Buffer.from(req.cookies["oauth_refresh_token"].split(".")[1], "base64"));

    if (jwtPayload.iat > jwtPayload.exp) return res.json("Refresh Token Expired");
    axios({
        method: "post",
        url: "https://kabeers-auth.herokuapp.com/auth/refresh",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded"
        },
        data: misc.serialize({
            client_secret: keys.auth.clientSecret,
            client_public: keys.auth.clientId,
            refresh_token: refreshToken,
        })
    })
        .then(response => res.status(200).json({
            expire: "1h",
            exp: Date.now(),
            access_token: response.data,
        }))
        .catch(error => res.status(400).json(error.message));
};
const OauthRedirect = (req, res, next) => {
    const info = {
        clientId: keys.auth.clientId,
        scopes: OauthAPIIds.scopes,
        callback: encodeURI(endPoints.callbackURI)
    };
    req.session.state = makeid(10);
    res.redirect(`https://kabeers-auth.herokuapp.com/auth/authorize?client_id=${info.clientId}&scope=${info.scopes}&response_type=code&redirect_uri=${info.callback}&state=${req.session.state}&nonce=${makeid(5)}&prompt=none`);
};

module.exports = {
    OauthCallbackHandler,
    getUserData,
    OauthRefreshToken,
    OauthRedirect,
};
