/**
 * really simple abstraction over just reading and writing json files
 */

var Message,
    crypto = require('crypto'),
    path = require('path'),
    fs = require('fs'),
    util = require('util'),
    uploadfs = require('uploadfs')(),
    http = require("http");

var MD5_PASSWORD = "47f^7)9f&$#Ee3698!@#";
var STORAGE_DIR = path.resolve(__dirname + '/../../storage');


function _md5_digest(data) {
    var hash = crypto.createHash('md5', MD5_PASSWORD);
    hash.update(data);
    return hash.digest('hex');
}


function _get_path(digest) {
    // create md5 hash from the first char in 'digest'
    // to be used as a folder for similar messages
    return util.format('%s/%s/%s.json', STORAGE_DIR, _md5_digest(digest[0]), digest);
}


Message = {
    create: function(data, fnReady) {
        var json = JSON.stringify(data),
            digest = _md5_digest(json);

        var outputFilename = digest + '.json',
            tempOutputFilepath = '/tmp/' + outputFilename;

        var outputFolderName = _md5_digest(digest[0]),
            outputFilepath = "/" + outputFolderName + "/" + outputFilename;

        fs.writeFile(tempOutputFilepath, json, function(err) {
            if (err) {
                util.error(err);
            } else {
                uploadfs.copyIn(tempOutputFilepath, outputFilepath,
                    function(e, info) {
                        if (e) {
                            util.error(e);
                        } else {
                            util.log('saved file: ' + outputFilepath);
                        }
                        fnReady(err, {
                            id: digest
                        });
                    }
                );
            }
        });
    },

    load: function(id, fnReady) {
        var msg_url = uploadfs.getUrl() +
            "/" + _md5_digest(id[0]) +
            "/" + id + ".json";
        var err, data;

        // do the GET request
        var reqGet = http.get(msg_url, function(res) {

            var body = '';

            res.on('data', function(chunk) {
                body += chunk;
            });

            res.on('end', function() {
                if (res.statusCode == 200) {
                    data = err ? null : JSON.parse(body);
                    util.log("Got response: ", JSON.parse(body));
                } else {
                    err = {
                        "message": "couldn't find message with id: " + id
                    };
                    util.error(err);
                }
                fnReady(err, data);
            });
        }).on('error', function(e) {
            fnReady(e, {});
        });
    },

    delete: function(id, fnReady) {
        uploadfs.remove("/" + _md5_digest(id[0]) + "/" + id + ".json", fnReady);
    }
};


module.exports = Message;
module.exports.localFileSystem = uploadfs;
