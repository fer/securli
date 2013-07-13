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

var sjcl = require('./public/javascripts/sjcl.js');

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
                    util.error( err, 'unknown error');
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



/**
 * REST API for messages
 */

// Creates & sends a encrypted message
// returns id if valid
// POST /api/message
// (email, message, password)
/*
 Example:
 > curl -X POST -H "email: fer@ferqwerty.com"  \
                -H "message: Hire me, please"  \
                -H "password: f3rn4nd0"        \
                http://localhost:3000/api/message

 Result:
 {
    "id": "50f8c264e91b7301abd15f5b4839d73b"
 }
*/

app.post('/api/message', function(req, res) {
    if ( ( 'email'    in req.headers) &&
         ( 'message'  in req.headers) &&
         ( 'password' in req.headers) )
    {
        // Check email format
        if( ! /\w+\@\w+[.]\w+/.test( req.headers.email ) ){
            res.json( 404, { "error" : 'Please provide a valid e-mail to send to!' } );
            return;
        }

        if( req.headers.message.length > 140 ){
            res.json( 404, { "error" : 'The message you typed is too long!' } );
            return;
        }

        if( req.headers.message.length < 1 ){
            res.json( 404, { "error" : 'The message you typed is too short!' } );
            return;
        }

        util.log('creating new message for: ' + req.headers.email);

        var encrypted = sjcl.encrypt( req.headers.password, req.headers.message );

        Message.create( {"email" : req.headers.email, "message" : encrypted } , function(err, data) {
            var email = new Mail( data, req.headers.email, req );

            email.send(function(err){
                if( err ) {
                    util.error( err, 'unknow error');
                    res.json( 404, { "error" : err } );
                    return;
                }

                req.session.messageId = data.id;
                res.json( { "id" : data.id } );
            });
        });

        return;

    } else {
        res.json( { "error" : "Missing email/message/password!" } );
        return;
    }
});

// Gets message(id)
// GET /api/message/:id
// (password)
/*
 Example:
 > curl -X GET -H "password: f3rn4nd0" \
               http://localhost:3000/api/message/50f8c264e91b7301abd15f5b4839d73b

 Result:
 {
    "id": "50f8c264e91b7301abd15f5b4839d73b",
    "email": "fer@ferqwerty.com",
    "message": "Hire me, please"
 }
*/

app.get('/api/message/:id', function(req, res) {
    if ('password' in req.headers) {
        Message.load( req.params.id, function( err, data ){
            var msg;

            if( err ){
                res.json( 404, { "error" : err } );
                return;
            }

            try {
                msg = sjcl.decrypt( req.headers.password, data.message );
                res.json( { "id": req.params.id , "email" : data.email, "message" : msg } );
                return;
            }
            catch(error) {
                res.json( 404, { "error" : error } );
                return;
            }
        });
    } else {
        res.json( 404, { "error" : "Missing password!" } );
        return;
    }
});

// Deletes message(id)
// DELETE /api/message/:id
/*
 Example:
 > curl -X DELETE http://localhost:3000/api/message/50f8c264e91b7301abd15f5b4839d73b

 Result:
 {
    "message": "Message deleted with id: 50f8c264e91b7301abd15f5b4839d73b"
 }
*/
app.delete('/api/message/:id', function(req, res) {
    Message.delete( req.params.id, function( err ){
        if( err ){
            res.json( 404, { "error" : err } );
            return;
        }

        res.json( { "message" : "Message deleted with id: " + req.params.id } );
        return;
    });
});

http.createServer(app).listen(app.get('port'), function() {
    console.log('Express server listening on port ' + app.get('port'));
});
