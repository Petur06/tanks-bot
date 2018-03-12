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

        args = args.join('%20');

        switch(cmd) {
            // !ping
            case 'ping':
                bot.sendMessage({
                    to: channelID,
                    message: 'Pong!'
                });
                break;
            case 'tank':
                findTank(args, channelID);
                break;
            case 'eu':
                findUser(args, channelID);
                break;
            // Just add any case commands if you want to..
         }
     }
});

findUser = function(name, channelID) {
    var path = '/api/ranges/eu/' + name;

    logger.info(path);

    // https://stats.tanks.gg/api/ranges/eu/pejote

    var options = {
        host: 'stats.tanks.gg',
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

        response.on('end', function() {
            var result = JSON.parse(str);

            if (result.queued) {
                bot.sendMessage({
                    to: channelID,
                    message: 'Player queued for update, will try again in a few seconds...'
                });

                setTimeout(() => {
                    findUser(name, channelID);
                }, 3000);

                return;
            }

            if (!result.intervals)
            {
                bot.sendMessage({
                    to: channelID,
                    message: 'No player found :('
                });
                return;
            }

            var dayInterval = result.intervals["1"];

            var winRate = (dayInterval.wins / dayInterval.battles) * 100;

            var wn8 = dayInterval.wn8.toFixed(2);
            message += 'Battles: ' + dayInterval.battles + '\r\n';

            var message = 'Battles: ' + dayInterval.battles + '\r\n';
            message += 'Win rate: ' + winRate.toFixed(2) + '%\r\n';
            message += 'WN8: ' + wn8;
 
             bot.sendMessage({
                to: channelID,
                embed: {
                    title: 'Last 24h stats for ' + result.name,
                    color: getColor(wn8),
                    description: message
                }
             });
        });
    };

    http.request(options, callback).end();
}

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