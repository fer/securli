/**
 * Module dependencies.
 */

// change cookie secret for production!
var COOKIE_SECRET  = '83be60e3e0435fc2e07bc79fe84b4567',
    SESSION_SECRET = 'e60efc29fe4b45e07bc767883e04353b',
    express = require('express'),
    passport = require('passport'),
    util = require('util'),
    LocalStrategy = require('passport-local').Strategy,
    http = require('http'),
    Message = require('model/message'),
    Mail = require('model/email'),
    Account = require('model/account'),
    path = require('path');

// Passport session setup.
passport.serializeUser(function(user, done) {
    done(null, user.name);
});

passport.deserializeUser(function(name, done) {
    Account.findByName(name, function (err, user) {
        done(err, user);
    });
});


// Use the LocalStrategy within Passport.
passport.use(new LocalStrategy({ usernameField: 'name', passwordField: 'password' },
    function(username, password, done) {
        process.nextTick(function () {
            Account.auth(username, password, function (err, user) {
                if (err) return done(err, false, null);
                return done(null, user);
            });
        });
    }
));

// Simple route middleware to ensure user is authenticated.

function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    res.redirect('/home');
}

// run express
var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'hjs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.cookieParser(COOKIE_SECRET));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.session({ secret: SESSION_SECRET }));
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.use(require('less-middleware')({
    src: __dirname + '/public'
}));

// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/success/:id', ensureAuthenticated, function(req, res) {
    if( req.session.messageId !== req.params.id ){
        // you can only view this page if you created this
        res.redirect( '/error' );
    }

    Message.load( req.params.id, function( err, data ){
        if( err ){
            res.redirect( '/error' );
            return;
        }

        res.render('success', {
            title: 'Securli',
            id: req.params.id,
            email: data.email
        });
    });
});

app.get('/delete/:id', ensureAuthenticated, function(req, res) {

    Message.delete( req.params.id, function( err ){
        if( err ){
            res.redirect( '/error' );
            return;
        }

        res.redirect( 303, '/' );
    });
});

app.get('/view/:id', ensureAuthenticated, function(req, res) {
    Message.load( req.params.id, function( err, data ){
        if( err ){
            res.redirect( '/error' );
            return;
        }

        res.render('view', {
            title: 'Securli',
            id: req.params.id,
            message: data.message
        });
    });
});

app.get('/error', function(req, res) {
    res.status(404);
    res.render('error', {
        title: 'Securli - an error occured'
    });
});

app.get('/', ensureAuthenticated, function(req, res) {
    res.render('index', {
        title: 'Securli',
        username: req.user.name
    });
});

app.get("/home", function(req, res) {
    res.render('home', {
        title: 'Securli'
    });
});

app.post("/sign_in", passport.authenticate('local', {
    failureRedirect: '/home'}), function(req, res) {
    if (res.status != 500) {
        res.redirect("/");
        /*
        res.render('index', {
            title: 'Securli',
            username: req.user.name,
            flash_message: "Welcome to Securli, " + req.user.name
        });
        */
    }
});

app.post("/sign_up", function(req, res) {

    if (Account.create(req.body.inputUser, req.body.inputPassword, req.body.inputEmail)) {
        req.logIn(req.body.inputUser, function(err) {
            if (err) res.redirect('/home');
            // login success!
            res.render('index', {
                title: 'Securli',
                username: req.body.inputUser
            });
        });
    }
});

app.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/home');
});

app.post('/', function(req, res) {
    if (req.body.message && req.body.email) {
        util.log('creating new message for: ' + req.body.email);

        Message.create(req.body, function(err, data) {
            var email = new Mail( data, req.body.email, req );

            email.send(function(err){
                if( err ) {
                    util.error( err, 'unknow error');
                    res.redirect('/error');
                    return;
                }

                req.session.messageId = data.id;
                res.redirect( 303, '/success/' + data.id);
            });
        });

        return;
    }

    res.redirect('/?error=' + (req.body.message ? 'email' : 'message'));
});

http.createServer(app).listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});