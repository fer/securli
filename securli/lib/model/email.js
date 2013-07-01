var Email = require('email').Email,
    util = require('util');

var Mail = function(message, to, req) {
    var body, link, from;

    link = util.format('http://%s/view/%s', req.host, message.id);
    from = 'no-reply@' + req.host;

    body = "Hi, someone sent you a securli message.\n" + "You can read your message by clicking on the following link:" + "<a href=\"" + link + "\">" + link + "</a>";

    this.send = function(fnReady) {
        if (req.host === 'localhost') {
            util.log('not sending email from localhost to ' + to);
            fnReady(null);
            return;
        }

        var email = new Email({
            from: from,
            to: to,
            subject: "message from securli",
            body: body
        });

        email.send(fnReady);
    };
};

module.exports = Mail;
