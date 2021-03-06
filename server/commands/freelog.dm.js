const config = require("../../config.json");
const Discord = require('discord.js');
require('./log.tools.js')();

let currentUsers = [];

const freelogCMD = 'freelog';
const logsChannelName = 'adaptation_logs';

const qSFLagreement_sanity = 'Please answer with either `y` or `n`.';
const qSFLagreement_regex = /^[yYnN]$/;

module.exports = {
  processFreelog: function(command, message, args, dry=false) {
    if (command === freelogCMD) {
      executeFreelog(message);
      return true;
    }
    return false;
  }
};

async function executeFreelog(message) {
    if (currentUsers.includes(message.author.id)) {
        return;
    }
    currentUsers.push(message.author.id);
    try {
        await freelog(message);
    }
    catch (err) {
        await message.author.send(
            `Error while logging, send this to Ninichat:
            ${err}`
        );
        console.error(`ERR\t: ${err}`);
    }
    finally {
        currentUsers.splice(currentUsers.indexOf(message.author.id), 1);
    }
}

async function freelog(message) {
  console.log(`CMD   : ${freelogCMD.toUpperCase()}`);
  const member = getMember(message);
  if (member) {
    let collected;


    let botMessage;
    try {
      botMessage = await message.author.send('Write your adaptation log here. If you want to abort, wait an hour or answer here with `abort`.');
    }
    catch (err) {
      console.warn(`WARN\t: Couldn't send message to ${message.author.username}: ${err}`);
      if (message.channel.name != logsChannelName) {
        message.channel.send(`${message.author}: \`+freelog\` cannot work if I cannot DM you.`).catch(console.warn);
      }
      return true;
    }


    if (!(collected = await collectFromUser(message.author, botMessage.channel, "freelog"))) {
      return true;
    }

    let qSleepTracker = {name: "sleep tracker", answer: "", attachment: null};
    if (hasRole(member, 'Sleep Tracker')) {
      if (!await processqSleepTracker(message, qSleepTracker)) {
        return true;
      }
    }

    let displayName = member.nickname;
    if (!displayName) {
      displayName = message.author.username;
    }
    let colorRole = member.roles.filter(r => ['Nap only', 'Everyman', 'Dual Core', 'Tri Core', 'Biphasic', 'Experimental'].includes(r.name)).first();
    const color = colorRole ? colorRole.color : '#ffffff';

    const embed = new Discord.RichEmbed()
      .setColor(color)
      .setTitle('Freelog')
      .setAuthor(displayName, message.author.avatarURL)
      .setTimestamp()
      .setFooter(`ID: ${member.id}`)
      .setDescription(collected.content);

    message.author.send(embed);
    let qConfirm = {name: 'log: confirm sending', message: "A preview of how the bot is going to edit the log can be seen below. Write `y` to confirm the edit, or `n` to abort.",
      parse: c => qSFLagreement_regex.test(c) ? "" : qSFLagreement_sanity, answer: ""};
    if (!await processqGeneric(message, qConfirm)) {
      return true;
    }
    if (qConfirm.answer.toLowerCase() === 'n') {
      message.author.send('Aborted.');
      return true;
    }
    getChannel(message, logsChannelName).send(embed);
    if (qSleepTracker.attachment) {
      getChannel(message, logsChannelName).send(
          `${message.author} EEG\n` + qSleepTracker.answer,
          qSleepTracker.attachment
      );
    }
    message.author.send("Thank you!");
  } else {
    message.author.send('You must join the Polyphasic Sleeping server if you want to post adaptation logs.');
  }
  return true;
}
