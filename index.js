require('dotenv').config();
const {Client, IntentsBitField} = require('discord.js');
const {google} = require("googleapis");
const { content } = require('googleapis/build/src/apis/content');
const fetchAll = require('discord-fetch-all');

//VARS
var CHANNELID = process.env.DISCORD_CHANNELID;
var BOTID = '1077430674811793498';
var ADMINS = process.env.DISCORD_ADMINS;


//google api
const SPREADSHEETID = process.env.SPREADSHEETID;

  const auth = new google.auth.GoogleAuth({
    keyFile: "Creds.json",
    scopes: "https://www.googleapis.com/auth/spreadsheets",
  
  });
  const gclient = auth.getClient();
  const googleSheets = google.sheets({version: "v4", auth: gclient});
  // get metadata about spread
  const metaData = googleSheets.spreadsheets.get({
    auth,
    spreadsheetId:SPREADSHEETID,
  });

  //discord api
  const client = new Client({
    intents:[
      IntentsBitField.Flags.Guilds,
      IntentsBitField.Flags.GuildMembers,
      IntentsBitField.Flags.GuildMessages,
      IntentsBitField.Flags.MessageContent,
      IntentsBitField.Flags.GuildMessageReactions
    ]
  })
  
  client.on('ready', (c) => {
    console.log(`${c.user}`)
    BOTID = c.user;
  })



function botResend(message) {
  message.delete();
    message.channel.send(`Sent by ${message.author} \n\n${message.content}\n\n:Amount-Purchased: 0`)
    .then(msg => {
     msg.react("👍");
     msg.react("👎");
    })
    .catch(console.error);
}

function getNewDate() {
  var currentdate = new Date(); 
var datetime = currentdate.getDate() + "/"
                + (currentdate.getMonth()+1)  + "/" 
                + currentdate.getFullYear() + " @ "  
                + currentdate.getHours() + ":"  
                + currentdate.getMinutes() + ":" 
                + currentdate.getSeconds();
  return datetime;
}

function AddRow(msg,number,username) {
  googleSheets.spreadsheets.values.append({
    auth,
    spreadsheetId:SPREADSHEETID,
    range:'LeadBuys!A:D',
    valueInputOption: "USER_ENTERED",
    resource: {
      values: [
        [username,number,msg.id,getNewDate()]
      ]
    }
  }).catch(console.error);
}

function botEdit(message,edit,username) {
  if (!isNaN(+edit)) {
    contentEdit = message.content.substring(0,message.content.lastIndexOf("\n"));
    a = message.content.split("\n")
    b = +(a[a.length-1].split(' ')[1]);
    if (isNaN(+b) || +edit > 1000 || +edit < 0) return;
    total = Number(edit)+Number(b);
    AddRow(message,+edit,username);
    message.edit(`${contentEdit}\n:Amount-Purchased: ${total}`);
  }
}


//HELPER FOR KILLER
const wait = async (milliseconds) => {
  await new Promise(resolve => {
      return setTimeout(resolve, milliseconds)
  });
};
//WILL REMOVE ALL DATA ON MESSAGE
async function forceUpdateAllMessages(channel) {
  temp = fetchAll.messages(channel,{reverseArray: true}).then(async e => {e.forEach(async f => {
    if (f.type==0 && f.author.id != BOTID) {
      botResend(f);
      await wait(1000);
    }
  });
});
}

client.on('messageCreate', (message) => {
  //make sure message is a person sent one.
  if (message.author != BOTID) { 
    if (message.type == 19) {
      var content = message.content;
      message.delete();
      message.channel.messages.fetch(message.reference.messageId)
      .then(msg => {botEdit(msg,content,message.author.username)})
      .catch(console.error);
    }
    if (message.type == 0) {
      if (message.channelId == CHANNELID) {
        if (ADMINS.includes(message.author.id)) {
          botResend(message,true);
        } else {
          message.delete();
        }
      }
    }
  }
})

client.login(
process.env.DISCORD_TOKEN
);
