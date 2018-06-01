var Discord = require('discord.io');
var logger = require('winston');
var auth = require('./auth.json');
var rp = require('request-promise');

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
    if (message.substring(0, 1) !== '!')
        return;

    let args = message.substring(1).split(' ');
    let cmd = args[0];

    args = args.splice(1);

    args = args.join('%20');

    switch (cmd) {
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
});

createRequest = function (uri) {
    return {
        port: 443,
        uri: uri,
        method: 'GET',
        json: true,
        headers: {
            accept: '*/*'
        }
    };
}

findUser = function (name, channelID) {
    let path = 'https://stats.tanks.gg/api/ranges/eu/' + name;

    logger.info(path);

    // https://stats.tanks.gg/api/ranges/eu/pejote

    let options = createRequest(path);

    rp(options).then(function (result) {
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

        if (!result.intervals) {
            bot.sendMessage({
                to: channelID,
                message: 'No player found :('
            });

            return;
        }

        let dayInterval = result.intervals["1"];
        let winRate = (dayInterval.wins / dayInterval.battles) * 100;
        let wn8 = dayInterval.wn8.toFixed(2);

        let message = composeEmbedMessage(dayInterval, winRate, wn8);

        bot.sendMessage({
            to: channelID,
            embed: {
                title: 'Last 24h stats for ' + result.name,
                color: getColor(wn8),
                description: message
            }
        });
    });
}

findTank = function (name, channelID) {
    getCurrentVersion()
        .then(function (versionResult) {
            let version = versionResult.current;
            let path = 'https://tanks.gg/api/' + version + '/search/' + name;

            let request = createRequest(path);

            rp(request).then(function (result) {
                if (!result.tanks) {
                    bot.sendMessage({
                        to: channelID,
                        message: "No tank found :("
                    });
                    return;
                }

                let foundMessage = "Found " + result.tanks.length + " tank(s).\r\n";
                let tanks = result.tanks;

                if (result.tanks.length > 3) {
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
        });
}

composeEmbedMessage = function (dayInterval, winRate, wn8) {
    let message = 'Battles: ' + dayInterval.battles + '\r\n';
    message += 'Win rate: ' + winRate.toFixed(2) + '%\r\n';
    message += 'WN8: ' + wn8;

    return message;
}

getColor = function (wn8) {
    if (wn8 < 423)
        return 0xFF0000;

    if (wn8 < 956)
        return 0xcd3333;

    if (wn8 < 1555)
        return 0xFFA500;

    if (wn8 < 2343)
        return 0x008000;

    if (wn8 < 3155)
        return 0x40E0D0;

    return 0xEE82EE;
}

getCurrentVersion = function () {
    let options = createRequest('https://tanks.gg/api/versions');
    return rp(options);
}