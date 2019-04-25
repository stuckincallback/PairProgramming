var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
//var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var winston = require('winston');
const { createLogger, format, transports } = winston;
var logtransport = require('winston-logstash-transport');
const {LogstashTransport} = logtransport;
var dbConfig = require('./db');
var mongoose = require('mongoose');

// Connect to DB
mongoose.connect(dbConfig.url,{ useNewUrlParser: true },function(error){
    if(error)
        console.log(error);
});

var app = express();
var socket = require('socket.io');
var server = app.listen(3000);
var io = socket(server);
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(favicon());

const logger = createLogger({
    
    transports: [
        new transports.Console({
            format: format.json(),
            level: 'info',
            handleExceptions: true,
            json: true,
            colorize: true
        }),
        
        new transports.Http({
            format: format.logstash(),
            host:'localhost',
            port:20890
        }),
    ],
    exitOnError: false
})

logger.stream = {
    write: function(message, encoding){
        logger.info(message);
    }
};
//new LogstashTransport({host: 'localhost', port: 5044}),
/*const logger = require('winston-logstash-transport').createLogger(null, {
    application: 'website-ssr-prod',
    logstash: {host: 'localhost', port: 5044},
    transports: [
        new transports.Console({
            format: format.logstash(),
            level: 'debug',
            handleExceptions: true,
            json: false,
            colorize: true
        })
    ]
  })*/
app.use(require("morgan")("combined", { "stream": logger.stream }));
//app.use(logger('combined'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Configuring Passport
var passport = require('passport');
var expressSession = require('express-session');
// TODO - Why Do we need this key ?
app.use(expressSession({secret: 'mySecretKey', resave: true, saveUninitialized: true}));
app.use(passport.initialize());
app.use(passport.session());

 // Using the flash middleware provided by connect-flash to store messages in session
 // and displaying in templates
var flash = require('connect-flash');
app.use(flash());

// Initialize Passport
var initPassport = require('./passport/init');
initPassport(passport);
var routes = require('./routes/index')(passport, io , logger);
app.use('/', routes);

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

module.exports = app;



