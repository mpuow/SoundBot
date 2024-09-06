require('dotenv').config();
const { Client, IntentsBitField } = require('discord.js');
const {
    joinVoiceChannel,
    getVoiceConnection,
    entersState,
    VoiceConnectionStatus,
    createAudioPlayer,
    NoSubscriberBehavior,
    createAudioResource,
    AudioPlayerStatus } = require('@discordjs/voice');

// Get names of all sound files, remove '.mp3' and add to new array
var fs = require('fs');
var files = fs.readdirSync('sounds/');
var soundNames = []

for (var i = 0; files.length > i; i++) {
    soundNames.push(files[i].split('.')[0])
}

// Create audio player
const player = createAudioPlayer({
    behaviors: {
        noSubscriber: NoSubscriberBehavior.Play,
    },
});

// Audio player status
player.on(AudioPlayerStatus.Playing, () => {
    console.log('Audio player is playing');
});

// Function to connect to voice channel, waits 15 seconds before abondoning
async function connectToChannel(channel) {
    const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: channel.guild.id,
        adapterCreator: channel.guild.voiceAdapterCreator,
    });
    try {
        await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
        return connection;
    } catch (error) {
        connection.destroy();
        throw error;
    }
}

// Client for the bot with required intents
const client = new Client({
    intents: [
        IntentsBitField.Flags.Guilds,
        IntentsBitField.Flags.GuildMembers,
        IntentsBitField.Flags.GuildMessages,
        IntentsBitField.Flags.MessageContent,
        IntentsBitField.Flags.GuildVoiceStates,
    ]
});

// Bot ready status
client.on('ready', async (c) => {
    console.log(`${c.user.tag} is running`)
});

// Receives user messages
client.on('messageCreate', async (message) => {

    // Ignore message if it belongs to another discord server or the athor is a bot
    if (!message.guild || message.author.bot) return;

    // Get the voice channel
    const channel = message.member?.voice.channel;

    // Split the message into a command and sound file name
    if (!message.author.bot) {
        var messageSplit = message.content.split(' ');
        var command = messageSplit[0]?.toLowerCase();
        var mp3Name = messageSplit[1]?.toLowerCase();
    }

    // Connects to voice channel, creates, plays and subscribes to the audio player
    if (command === '~play') {
        if (channel && mp3Name != null) {
            try {
                if (soundNames.includes(mp3Name)) {
                    const connection = await connectToChannel(channel);

                    const resource = createAudioResource(`sounds/${mp3Name}.mp3`);

                    await message.reply('Playing now!');
                    player.play(resource);
                    connection.subscribe(player);
                } else {
                    await message.reply('No sound found');
                }

            } catch (error) {
                console.error(error);
            }
        } else {
            await message.reply('No channel found');
        }

        // Disconnects from the voice channel when sound has ended
        player.on(AudioPlayerStatus.Idle, () => {
            player.stop()
            const connection = getVoiceConnection(channel.guild.id);
            connection?.destroy();
        });
    }

    // Disconnects from the voice channel when command submitted
    if (command === '~stop') {
        if (channel) {
            try {
                player.stop();
                // const connection = getVoiceConnection(channel.guild.id);
                // connection.destroy();
                await message.reply('Stoping now');
                console.log("Audio player has stopped")
            } catch (error) {
                console.error(error);
            }
        } else {
            await message.reply('Nothing playing');
        }
    }

    // Simple help command
    if (command === '~help') {
        message.reply('### List of commands: \n~play (sound name) \n~stop \n~list ');
    }

    // List of all available sounds
    if (command === '~list') {
        message.reply(`### List of sounds: \n${soundNames.join('\n')}`);
    }

});

client.login(process.env.TOKEN);