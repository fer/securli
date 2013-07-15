var Account,
    fs = require('fs');

// set folder to store authentication files.
var authFolder = './auth/';
var encoding;

// checks if folder exists in project where executed.

function initialChecks() {
    if (!fs.existsSync(authFolder)) {
        fs.mkdirSync(authFolder);
    }
}

function validateUser(user) {
    // Returns true if it matches correct format.
    user = /^[a-z0-9]+$/i.test(user);
    return user;
}

Account = {
    // TODO: encrypt saved passwords
    create: function(user, password, email) {
        initialChecks();
        // Returns true if successful.

        if (fs.existsSync(authFolder + user + ".json")) {
            return false;
        } else if (validateUser(user)) {
            var user_data = {
                "name": user,
                "password": password,
                "email": email
            };

            fs.writeFileSync(authFolder + user_data.name + ".json", JSON.stringify(user_data));
            return true;
        }
    },

    auth: function(username, password, cb) {
        initialChecks();

        // Returns req if correct or a boolean false if incorrect.
        if ((validateUser(username)) && (fs.existsSync(authFolder + username + ".json"))) {
            var user_data = JSON.parse(fs.radFileSync(authFolder + username + '.json', encoding = 'utf8'));
            if (user_data.password == password) {
                var user = {
                    'name': user_data.name,
                    'email': user_data.email
                };
                return cb(null, user);
            } else {
                return cb(null, null);
            }
        } else {
            return cb(null, null);
        }
    },

    findByName: function(name, cb) {
        if (fs.existsSync(authFolder + name + ".json")) {
            cb(null, JSON.parse(fs.readFileSync(authFolder + name + '.json', encoding = 'utf8')));
        } else {
            cb(new Error('User ' + name + ' does not exist'));
        }
    }

};

module.exports = Account;
