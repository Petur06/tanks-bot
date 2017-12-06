var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');

var http = require('https');

// Configure logger settings
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, {
    colorize: true
});
logger.level = 'debug';
// Initialize Discord Bot
var bot = new Discord.Client({
   token: auth.token,
   autorun: true
});

bot.on('ready', function (evt) {
    logger.info('Connected');
    logger.info('Logged in as: ');
    logger.info(bot.username + ' - (' + bot.id + ')');
});

bot.on('message', function (user, userID, channelID, message, evt) {
    // Our bot needs to know if it will execute a command
    // It will listen for messages that will start with `!`
    if (message.substring(0, 1) == '!') {
        logger.info(message);

        var args = message.substring(1).split(' ');
        var cmd = args[0];
       
        args = args.splice(1);

        var tankName = args.join('%20');

        switch(cmd) {
            // !ping
            case 'ping':
                bot.sendMessage({
                    to: channelID,
                    message: 'Pong!'
                });
                break;
            case 'tank':
                findTank(tankName, channelID);
                break;
            // Just add any case commands if you want to..
         }
     }
});

findTank = function(name, channelID) {
    var path = '/api/v092014/search/' + name;

    logger.info(path);

    var options = {
        host: 'tanks.gg',
        port: 443,
        path: path,
        method: 'GET',
        headers: {
            accept: '*/*'
        }
    };

    callback = function(response) {
        var str = '';

        response.on('data', function (chunk) {
            str += chunk;
        });

        response.on('end', function () {
            var result = JSON.parse(str);

            if (!result.tanks)
            {
                bot.sendMessage({
                    to: channelID,
                    message: "No tank found :("
                });
                return;
            }  

            var foundMessage = "Found " + result.tanks.length + " tank(s).\r\n";
            var tanks = result.tanks;

            if (result.tanks.length > 3)
            {
                foundMessage += "Showing top 3 tanks.\r\n";
                tanks = tanks.slice(0, 3);
            }

            tanks.forEach(tank => {
                foundMessage += tank.name + " - " + "https://tanks.gg/tank/" + tank.slug + "\r\n";
            });

            bot.sendMessage({
                to: channelID,
                message: foundMessage
            });
        });
    }

    http.request(options, callback).end();
}