/* ----------- initial requires ------------ */

var Discord = require('discord.io');
var readline = require('readline');
var request = require('request');
var fs = require('fs');
var Twitter = require('twitter');

/* ----------- meat n potatoes ------------ */

var config;

function countInst(str,fin){
  return (str.match(new RegExp(fin, "g")) || []).length;
}

function log(l){
  console.log(l);
}

function json(s){
  if(typeof s == 'string'){
    return JSON.parse(s);
  }else{
    return JSON.stringify(s);
  }
}

function getConfig(){
  return json(fs.readFileSync("tightfresh.conf", "utf8"));
}

function setConfig(){
  return fs.writeFileSync("tightfresh.conf", json(config), {"encoding":'utf8'});
}

function getStorage(){
  return fs.readFileSync("tightfresh.store", "utf8");
}

function setStorage(wr){
  return fs.writeFileSync("tightfresh.store", wr, {"encoding":'utf8'});
} 

function objSize(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
}

function plug(art, nam, lnk, userID, disc){
  if(art == 'TightFresh EDM') return 'New TightFresh premiere: ' + nam + ', check it out here! \n' + lnk;
  return 'Brand new release from ' + art + ': ' + nam + ', check it out here! \n' + lnk;
}

function welcome(art, lnk, userID, disc){
  return 'Proud to announce ' + art + ' as a new member of the TightFresh fam. Check out their latest release! \n' + lnk;
}

/* ---------- load the config and require soundcloud ----------*/

config = getConfig();

var SimpleSoundCloud = require('simple-soundcloud')(config['soundcloudKey']);


/* -------- twitter stuff ---------*/

var client = new Twitter({
  consumer_key: config['twitterConsumerKey'],
  consumer_secret: config['twitterConsumerSecret'],
  access_token_key: config['twitterTokenKey'],
  access_token_secret: config['twitterTokenSecret']
});


function tweet(tw){
  client.post('statuses/update', {status: tw},  function(error, tweet, response) {
    log(error);
  });
}

/* -------- discord stuff ---------*/ 
var bot = new Discord.Client({
    token: config['botToken'],
    autorun: true
});

var regChannel = '356597179693006848';
var adminChannel = '356609994084319242';

var $owner = '132842449314906112'; //Erin

var $admin = [
  '132842449314906112', //Erin
  '289399600828383232', //pork
  '116961037365805056' //Ken
];

var $excludes = [
  bot.id //prevents the bot reading it's own posts and being sent into a loop
];


function announce(ann){
  for(chan in config["announce"]){
    bot.sendMessage({
      to: config["announce"][chan],
      message: ann
    }, function(){});
  }
}

function reply(usr, msg){
  bot.sendMessage({
    to: usr,
    message: msg
}, function(){});
}


/* -----------  process a youtube ID -----------*/

function getYoutube(channel, channelID, userID, isreg){   
  request('https://www.googleapis.com/youtube/v3/search?order=date&part=snippet&channelId=' + channel + '&key=' + config['youtubeKey'], function (error, response, body) {
    var yu = json(body);  
    if(yu['items'][0]){
    var spit = {
      artist : yu['items'][0]['snippet']['channelTitle'],
      track : yu['items'][0]['snippet']['title'],
      link : 'https://www.youtube.com/watch?v=' + yu['items'][0]['id']['videoId']
    };
    var users = json(getStorage());
    if(!users[userID] || users[userID] == null || users[userID] == false || users[userID] == ''){
      users[userID] = {
        youtubeprofile : channel,
        soundcloudprofile : null,
        name : spit['artist'],
        youtube: spit['link'],
        soundcloud: null
      };
      setStorage(json(users)); 
      log(spit['artist'] + ' joined TightFresh');
      tweet(welcome(spit['artist'], spit['link'], userID, false));
      announce(welcome(spit['artist'], spit['link'], userID, true));
      if(channelID && userID && channelID != null){
        reply(channelID, '<@' + userID + '> You were registered for Youtube promotion!');
      }
    }else{
      if(isreg == true && channelID != null){
        users[userID]['youtubeprofile'] = channel;
        users[userID]['youtube'] = spit['link'];
        setStorage(json(users));
        reply(channelID, '<@' + userID + '> You were registered for Youtube promotion!');
        tweet(plug(spit['artist'], spit['track'], spit['link'], userID, false)); 
        announce(plug(spit['artist'], spit['track'], spit['link'], userID, true));  
      }else{
        if(users[userID]['youtube'] != spit['link']){ 
          users[userID]['youtube'] = spit['link'];
          setStorage(json(users)); 
          log(spit['artist'] + ' dropped a new track on youtube');
          var premieretag = ''; 
          if(spit['artist'] == 'TightFresh EDM') premieretag = ' #PREMIERE';
          tweet(plug(spit['artist'], spit['track'], spit['link'], userID, false) + premieretag); 
          announce(plug(spit['artist'], spit['track'], spit['link'], userID, true));     
        }else{
          //log(spit['artist'] + "'s latest on youtube is still " + spit['track']);
        }
      }

    } 
    
    
    }else{
    
    
    
    } 
     
  });
};

/* -----------  process a soundcloud username -----------*/

function getSoundcloud(username, channelID, userID, isreg){
  var user = new SimpleSoundCloud.User(username);
  user.tracks().then(function(tracks){
    if(!tracks[0]) return;
    var spit = {
      artist : tracks[0]['user']['username'],
      track : tracks[0]['title'],
      link : tracks[0]['permalink_url']
    };
    var users = json(getStorage());
    if(!users[userID] || users[userID] == null || users[userID] == false || users[userID] == ''){
      users[userID] = {
        youtubeprofile : null,
        soundcloudprofile : username,
        name : spit['artist'],
        youtube: null,
        soundcloud: spit['link']
      };
      setStorage(json(users)); 
      log(spit['artist'] + ' joined TightFresh');
      tweet(welcome(spit['artist'], spit['link'], userID, false));
      announce(welcome(spit['artist'], spit['link'], userID, true));
      if(channelID && userID && channelID != null){
        reply(channelID, '<@' + userID + '> You were registered for SoundCloud promotion!');
      }
    }else{
      if(isreg == true  && channelID != null){
        users[userID]['soundcloudprofile'] = username;
        users[userID]['soundcloud'] = spit['link'];
        setStorage(json(users));
        reply(channelID, '<@' + userID + '> You were registered for SoundCloud promotion!');
        tweet(plug(spit['artist'], spit['track'], spit['link'], userID, false)); 
        announce(plug(spit['artist'], spit['track'], spit['link'], userID, true)); 
      }else{
        if(users[userID]['soundcloud'] != spit['link']){ 
          users[userID]['soundcloud'] = spit['link'];
          setStorage(json(users)); 
          log(spit['artist'] + ' dropped a new track on soundcloud');
          tweet(plug(spit['artist'], spit['track'], spit['link'], userID, false)); 
          announce(plug(spit['artist'], spit['track'], spit['link'], userID, true));     
        }else{
          //log(spit['artist'] + "'s latest on soundcloud is still " + spit['track']);
        }
      }
    }   
    
  });
};

/* -----------  process a registration -----------*/

function register(lnk, channelID, userID){
  if(lnk.indexOf('soundcloud.com/') > -1 && countInst(lnk,'/') < 6){
    var username = lnk.split('.com/')[1].split('/')[0];
    log('Processing new soundcloud profile: ' + username);
    getSoundcloud(username, channelID, userID, true);
  }else if(lnk.indexOf('youtu') > -1 && lnk.indexOf('channel/') > 5  && countInst(lnk,'/') < 6){  
    var channel = lnk.split('channel/')[1].replace(/[\/\&\?].+/g, "");
    log('Processing new youtube channel: ' + channel);
    getYoutube(channel, channelID, userID, true);
  }else{
    reply(channelID, '<@' + userID + '> something went wrong my dude, that link looked sketchy.');
  }
}

/* -----------  scan for releases -----------*/

function scan(){
  log('Checking ' + objSize(json(getStorage())) + ' artists...');
  var users = json(getStorage());
  for(userID in users){
    log('  checking ' + users[userID]['name']);
    if(users[userID]['youtubeprofile'] != null){
      getYoutube(users[userID]['youtubeprofile'], null, userID, false);
    }
    if(users[userID]['soundcloudprofile'] != null){
      getSoundcloud(users[userID]['soundcloudprofile'], null, userID, false);
    }
  }
  log('Check complete.');
}

setInterval(scan, 30000);


/* -----------  Discord Interactions -----------*/

bot.on('message', function(user, userID, channelID, message, event){
  if($excludes.indexOf(userID) > -1) return;

  if(message.indexOf(config['prefix'] + 'reg ') == 0 && channelID == regChannel){
    message = message.split(config['prefix'] + 'reg ')[1];
    if(message.indexOf('soundcloud') > -1 || message.indexOf('youtu') > -1){
      register(message, channelID, userID);
    }else{
      reply(channelID, '<@' + userID + '> I\'m sorry, I don\'t know how to read that yet. Say ' + config['prefix'] + 'reg followed by the link to your youtube or soundcloud channel.');
    }
  }
  
  if(channelID == adminChannel){
  
    if(message.indexOf(config['prefix'] + 'wipe') == 0){
      if(userID == $owner){
        setStorage('{}')
        log('i forgot stuff');
        reply(channelID, '<@' + userID + '> ' + ' i forgot stuff');
      }
    }
  
    if(message.indexOf(config['prefix'] + 'announce ') == 0){
      if($admin.indexOf(userID) > -1){
        message = message.split(config['prefix'] + 'announce ')[1];
        tweet(message); 
        announce(message);
      }
    } 
    
    if(message.indexOf(config['prefix'] + 'count') == 0){
        reply(channelID, 'Managing ' + objSize(json(getStorage())) + ' registered artists right now.');
    }
    
  }
    
});


/*---------------- On Launch -------------------*/

bot.on('ready', function(event) { 
  log(bot.username + ' is online. Prefix is "' + config['prefix'] + '". Managing ' + objSize(json(getStorage())) + ' registered artists right now.');
  scan();
});
