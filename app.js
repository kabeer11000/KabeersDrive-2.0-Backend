var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const fileUpload = require('express-fileupload');
var createError = require('http-errors');
const keys = require("./api/keys");
const session = require("express-session");
const MongoStore = require("connect-mongo")(session);
const cors = require("cors");

//const MySQLClient = require('my-query-builder');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var apiRouter = require('./routes/apiRouter');
var authRouter = require('./routes/authRouter');

var app = express();

app.use(cors());
app.set("json spaces", 2);
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
// Note that this option available for versions 1.0.0 and newer.
app.use(fileUpload({}));
app.use(session({
    secret: "5s323720194bccb1cb94164a13E144994E3E17F9B",
    resave: false,
    saveUninitialized: false,
    store: new MongoStore({
        url: keys.dataBase.mongoURI
    })
}));
app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/api', apiRouter);
app.use('/auth', authRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.json('error');
});

module.exports = app;
