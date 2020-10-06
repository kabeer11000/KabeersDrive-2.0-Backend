const router = require("express").Router({}),
    authFunctions = require("../functions/authFunctions");

router.get("/redirect", (req, res, next) => authFunctions.OauthRedirect(req, res, next));
router.get("/callback", (req, res, next) => authFunctions.OauthCallbackHandler(req, res, next));
router.get("/user/data", (req, res, next) => authFunctions.getUserData(req, res, next));
router.get("/store/tokens/refresh", (req, res, next) => authFunctions.OauthRefreshToken(req, res, next));

router.get("/aa", (req, res) => {
    res.send(`Bearer ${JSON.parse(req.cookies["user_data_token"]).token}`);
});
module.exports = router;
