/**
 * Module dependencies.
 */

// change cookie secret for production!
var COOKIE_SECRET = '83be60e3e0435fc2e07bc79fe84b4567',
    express = require('express'),
    util = require('util'),
    http = require('http'),
    Message = require('model/message'),
    Mail = require('model/email'),
    path = require('path');

var app = express();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'hjs');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser(COOKIE_SECRET));
app.use(express.session());
app.use(app.router);
app.use(require('less-middleware')({
    src: __dirname + '/public'
}));

// development only
if ('development' == app.get('env')) {
    app.use(express.errorHandler());
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/success/:id', function(req, res) {
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

app.get('/delete/:id', function(req, res) {

    Message.delete( req.params.id, function( err ){
        if( err ){
            res.redirect( '/error' );
            return;
        }

        res.redirect( 303, '/' );
    });
});

app.get('/view/:id', function(req, res) {
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

app.get('/', function(req, res) {
    res.render('index', {
        title: 'Securli'
    });
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
