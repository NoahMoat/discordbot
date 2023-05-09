require('dotenv').config();
const {Client, IntentsBitField} = require('discord.js');
const {google} = require("googleapis");
const fetchAll = require('discord-fetch-all');
const fetch = require("node-fetch");
const { EmbedBuilder } = require('discord.js');
const https = require('https');

//VARS
var CHANNELID = process.env.DISCORD_CHANNELID;
var BOTID = '1077430674811793498';
var CLOSERROLEID = '1073787971003752588';
//contains all the info for sourcing 
const sourcers = [
  {discordId:'1073664693954150410', sheetsId:'1CAJouIkDgqelJxRztcEu1DkFDYqs9Zt5yw_pISrKCf8', sheetsName:'Sheet1'}, //myran
  {discordId:'935801793290567730', sheetsId:'1cXktCUd3sD1UuM8SitjiWYd66si5l4BdMrum8rHe0Ec', sheetsName:'Sheet1'} //melody
]
//quick look up for sourcing
const sourcersDiscordIds = [];
sourcers.forEach(e => {
  sourcersDiscordIds.push(e.discordId);
})


//google api
const SPREADSHEETID = process.env.SPREADSHEETID;

  const auth = new google.auth.GoogleAuth({
    keyFile: "Creds.json",
    scopes: "https://www.googleapis.com/auth/spreadsheets",
  
  });
  const gclient = auth.getClient();
  const googleSheets = google.sheets({version: "v4", auth: gclient});

  var USERS = null;
  const updateUsers = () => {
    return new Promise(function (resolve, reject) {
    googleSheets.spreadsheets.values.get({
      auth,
      spreadsheetId:SPREADSHEETID,
      range: "DiscordMembers!A:F"
    }).then(s=> {
      if (s.data.values == undefined) {
        USERS= new Array();
      } else {
        USERS=s.data.values;
        resolve(true);
      }
    }).catch(r=> {
      console.log('error updating user sheet');
      reject(false);
    })
    })
  }

  updateUsers();

  //discord api
  const client = new Client({
    intents:[
      IntentsBitField.Flags.Guilds,
      IntentsBitField.Flags.GuildMembers,
      IntentsBitField.Flags.GuildMessages,
      IntentsBitField.Flags.MessageContent,
      IntentsBitField.Flags.DirectMessages,
      IntentsBitField.Flags.GuildMessageReactions,
      IntentsBitField.Flags.DirectMessageReactions,
      IntentsBitField.Flags.DirectMessageTyping,
    ],
    partials: [
      'CHANNEL',
      "MESSAGE",
    ]
  })
  
  client.on('ready', (c) => {
    console.log(`${c.user}`)
    BOTID = c.user;
  })


//creates the new embeds
async function botResend(message) {
  

  message.delete();
  try {
  if (!isNaN(+message.content)) {
    const messageNumber = +message.content;
    let sourcer = null;
    sourcers.forEach(e=> {
      if (e.discordId == message.author) {
        sourcer = e;
      }
    })
    const data = await googleSheets.spreadsheets.values.get({
      auth,
      spreadsheetId:sourcer.sheetsId,
      range: `${sourcer.sheetsName}!B${messageNumber}:N${messageNumber}`
    })
    
    if (data.data.values == undefined) {throw new Error('no data in selected row')}
  const d = data.data.values[0];
  let discount = '\u200B';
  if (d.length > 11) {
    for(i=0;i<d.length-11;i++) {
      discount+=d[11+i];
      discount+='\n';
    }
  }
  let avatar = client.user.displayAvatarURL();
  const embed = new EmbedBuilder()
  .setTitle(d[6])
  .setDescription('send by: <@'+message.author+'>')
  .setColor(0xdead28)
  .setFooter({iconURL:avatar,text:'reply with the amount you purchase'})
  .addFields(
    {name:'Source Link', value:`[click](${d[1]})`, inline:true},
    {name:'Amazon Link', value:`[click](${d[3]})`, inline:true},
    {name:'Asin', value:d[7], inline:true},
    {name:'Cost', value:d[2], inline:true},
    {name:'BB Price', value:d[4], inline:true},
    {name:'ROI/Profit', value:d[9]+' / '+d[8], inline:true},
    {name:'Rank', value:d[5], inline:true},
    {name:'Category', value:d[10],inline:true},
    {name:'Amount Purchased', value:'0',inline:true},
    {name:'\u200B', value:'\u200B'},
    {name:'Notes/Discount', value:discount, inline:true},
    );


    message.channel.send({embeds:[embed]})
    .then(msg => {
     msg.react("👍");
     msg.react("👎");
    })
    .catch(console.error);
  }
} catch(error) {
  console.log(error)
}
}

//edits the embed to update amount purchased
function botEditEmbed(msg,content,username) {
  try {
  let emb = msg.embeds[0];
  let fields = emb.data.fields;
  let embAmount = 0;
  let index = 0;
  let asin = '';
  for(i=0;i<fields.length;i++) {
    let e = fields[i];
    if (e.name=='Amount Purchased') {
      embAmount=+e.value;
      index = i;
    }
    if (e.name=='Asin') {
      asin=e.value;
    }
    if (e.name=='') {
      e.name='\u200B';
    }
    if (e.value=='') {
      e.value='\u200B';
    }
  };

  if (!isNaN(+content)) {
    if (+content > 4000) return;
    total = Number(embAmount)+Number(content);
    AddRow(msg,+content,username,asin);
    fields[index].value = `${total}`;
    msg.edit({embeds:[emb]});
  }
} catch(error) {
  console.log(error.message);
}
}

//gets a new date
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

//adds a row to the spread sheet when someone buys a lead
function AddRow(msg,number,username,asin=' ') {
  googleSheets.spreadsheets.values.append({
    auth,
    spreadsheetId:SPREADSHEETID,
    range:'LeadBuys!A:D',
    valueInputOption: "USER_ENTERED",
    resource: {
      values: [
        [username,number,msg.id,getNewDate(),asin]
      ]
    }
  }).catch(console.error);
}

//oldschool bot edit for the old style of messages
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

//GUMROAD STUFF!!!!!!!!!!!!!!!!!!!!!!!!!------------------------------------------------------------------

function checkUser(message,key){
try {
  user = message.author.username + '#' + message.author.discriminator;
  let regex = /([A-Za-z0-9]+(-[A-Za-z0-9]+)+)\S*$/i;
  if (!regex.test(key)) {message.author.send('Please provide a valid gumroad license key.'); return false};


fetch('https://api.gumroad.com/v2/licenses/verify?product_id='+process.env.GUMROADPRODUCTID+'&license_key='+key, {
  method:"POST",
  headers: {
    "Accept-Encoding": "gzip, deflate",
    "Content-type": "application/json; charset=UTF-8"
  }
}).then(t=>{

t.json().then(s=> {
 if (!s.success) {
    message.author.send('Please provide a valid gumroad license key.'); return false
  };

  email = String(s.purchase.email);
  id = String(message.author.id);
  licenseKey = String(s.purchase.license_key);
  tname = String('TwitterName');


  console.log(getUserFromDb(licenseKey));
  if (getUserFromDb(licenseKey) != false) {
    message.author.send('Key already in use.'); 
    return false;
  } else {


      addUserToDb([id,email,user,licenseKey,tname]);
      role = message.guild.roles.cache.get(CLOSERROLEID)
      message.member.roles.add(role);
      console.log(id,email,user,licenseKey);
  }
  });
}).catch(error=> {
  console.log(error.message);
})
}catch(error) {
  console.log(error.message);
}
}


//addes a user to the database when someone joins
const addUserToDb = (arr) => {
  USERS.push(arr);
  googleSheets.spreadsheets.values.append({
    auth,
    spreadsheetId:SPREADSHEETID,
    range:'DiscordMembers!A:M',
    valueInputOption: "USER_ENTERED",
    resource: {
      values: [arr]
      }
    }).then(s=>{updateUsers()}).catch(error=> {
      console.log(error.message);
    });
}


var BreakException = {};
//FIX THIS SOMTHINGS WRONG.
const getUserFromDb = (license) => {
  res = false;
  for (i=0;i<USERS.length;i++) {
    if (USERS[i][3] == license) {
      console.log(USERS[i][3]);
      res = USERS[i];
    }
  }
  return res
}

function getUserSales(email,pass=undefined) {
  return new Promise(function (resolve, reject) {
  https.get(`https://api.gumroad.com/v2/sales?access_token=${process.env.GUMROADTOKEN}&product_id=${process.env.GUMROADPRODUCTID}&email=${email}`, (res) => {

    let data = "";
    res.on('data', (chunk) => {
      data += chunk;
    });

    res.on('end', () => {
      result = JSON.parse(data);
      if (result.success) {
        if (pass==undefined) {
          resolve(result.sales);
        } else {
          resolve([result.sales,pass]);
          
        }
      } else {
        reject(false);
      }
    })

    //error checking
    .on('error', (error) => {
      console.log(error);
      reject(false)
    })
  })
  })
}



//CHECK USERS IF THEY SHOULD BE RENMOVED FROM THE GROUP OR NOT;
function checkUserExpire() {
  try {
  let curtime = new Date();
  console.log('checking for expired users at '+ curtime.toJSON());
  updateUsers().then( s=> {
    if (!s) return;

    for(i=0;i<USERS.length;i++) {

      if (USERS[i][5] == undefined) {
        getUserSales(USERS[i][1],[USERS[i],i]).then(res=> {
          
          res[res.length-1].forEach(user => {
            if (user.cancelled && user.dead) {
              //message owners to remove twitter user.
              

              client.guilds.fetch('1073665429416988763').then(s=> {
                  //remove user id
                s.members.fetch(res[1][0][0]).then(res1=> {
                  res1.roles.remove('1073787971003752588');
                }).catch(console.error);
                
                  //message us to remvoe them
                  s.members.fetch({user:['1073664693954150410','935801793290567730']}).then(m=>{
                    m.forEach(r=> {
                      r.send('remove user: '+user.purchase.email);
                    })
                  })
              })
              
              googleSheets.spreadsheets.values.append({
                auth,
                spreadsheetId:SPREADSHEETID,
                range:'DiscordMembers!F'+(res[1][1]+1),
                valueInputOption: "USER_ENTERED",
                resource: {
                  values: [['TRUE']]
                  }
                })

            }
          })
        }).catch(error => {
          console.log(error.message);
        })
      }

    }
  })
} catch(error) {
  console.log(error.message);
}
}


setInterval(checkUserExpire,21600000);


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

//discord on message create
client.on('messageCreate', (message) => {
  //admin comand to update user 
  if (message.channelId == CHANNELID && message.author.id == '1073664693954150410' && message.content == '/updateAll') {
    forceUpdateAllMessages(message.channel);
  }

  //if channell is testbench check
  if (message.channelId == '1082837051768057916') {
    if (message.type == 0) {
      checkUser(message,message.content);
    }
    message.delete();
    return;
  } else
  //make sure message is a person sent one.
  if (message.author != BOTID) { 
    if (message.type == 19) {
      var content = message.content;
      message.delete();
      message.channel.messages.fetch(message.reference.messageId)
      .then(msg=> {
        if (msg.embeds.length > 0) {
          botEditEmbed(msg,content,message.author.username+'#'+message.author.discriminator);
        } else {
          botEdit(msg,content,message.author.username+'#'+message.author.discriminator)
        }
      }).catch(error=>{
        console.log(error.message);
      })
      
    } else
    if (message.type == 0) {
      if (message.channelId == CHANNELID) {
        if (sourcersDiscordIds.includes(message.author.id)) {
          botResend(message);
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

checkUserExpire();