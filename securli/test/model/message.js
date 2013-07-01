var assert = require('assert'),
    fs = require('fs'),
    Message = require('model/message');


var STORAGE_DIR = __dirname + '/../../storage/';

suite('model message', function() {
    test('create must create files with valid json', function(done) {
        var data = {
            message: Math.random()
        };

        Message.create(data, function(err, msg) {
            var path, json;

            assert.equal(err, null, 'no errors reported');
            assert.ok(msg.id, 'message has an id');

            path = fs.realpathSync(STORAGE_DIR + msg.id + '.json');

            assert.ok(fs.existsSync(path), 'created a json file');
            json = JSON.parse(fs.readFileSync(path));

            assert.equal(json.message, data.message, 'created valid json');

            fs.unlink(path, done);
        });
    });

    test('load must load and parse json', function(done) {
        var data = {
            message: Math.random()
        };

        Message.create(data, function(err, msg) {
            var path = fs.realpathSync(STORAGE_DIR + msg.id + '.json');


            Message.load(msg.id, function(err, msg) {
                assert.equal(err, null, 'no errors reported');
                assert.equal(msg.message, data.message, 'loaded expected message');

                fs.unlink(path, done);
            });
        });
    });

    test('load with an invalid id returns an error', function(done) {
        Message.load(Math.random(), function(err, msg) {
            assert.ok(err, 'error was provided');

            assert.equal(err.code, 'ENOENT', 'got expected error code');
            assert.equal(msg, null, 'no data was returned');

            done();
        });
    });

    test('delete must remove the file', function(done) {
        var data = {
            message: Math.random()
        };

        Message.create(data, function(err, msg) {
            var path = fs.realpathSync(STORAGE_DIR + msg.id + '.json');

            assert.equal(fs.existsSync(path), true, 'file exists');

            Message.delete(msg.id, function(err) {
                assert.equal(null, err, 'no errors deleting');
                assert.equal(fs.existsSync(path), false, 'file no longer exists');

                done();
            });
        });
    });

    test('delete with an invalid id returns an error', function(done) {
        Message.delete(Math.random(), function(err) {
            assert.ok(err, 'error was provided');
            assert.equal(err.code, 'ENOENT', 'got expected error code');

            done();
        });
    });

});
