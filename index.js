
const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, SlashCommandBuilder, REST, Routes } = require('discord.js');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});

// Configuration
const BOT_TOKEN = process.env.BOT_TOKEN || '';

// Store user verification data temporarily
const verificationData = new Map();

// Bot settings (can be changed via commands)
let botSettings = {
    verificationChannelId: '',
    adminRoleId: '',
    verifiedRoleId: ''
};

// Define slash commands
const commands = [
    new SlashCommandBuilder()
        .setName('تفعيل')
        .setDescription('بدء عملية التفعيل'),
    new SlashCommandBuilder()
        .setName('verify')
        .setDescription('Start verification process'),
    new SlashCommandBuilder()
        .setName('setverify')
        .setDescription('تحديد قناة التفعيل (للمدراء فقط)')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('القناة المخصصة للتفعيل')
                .setRequired(true)),
    new SlashCommandBuilder()
        .setName('settings')
        .setDescription('عرض إعدادات البوت (للمدراء فقط)'),
    new SlashCommandBuilder()
        .setName('help')
        .setDescription('عرض قائمة الأوامر')
];

client.once('ready', async () => {
    console.log(`✅ البوت جاهز! تم تسجيل الدخول باسم ${client.user.tag}`);
    console.log(`🔧 قناة التفعيل: ${botSettings.verificationChannelId || 'غير محددة'}`);
    
    // Register slash commands
    const rest = new REST().setToken(BOT_TOKEN);
    
    try {
        console.log('🔄 بدء تسجيل الأوامر...');
        
        await rest.put(
            Routes.applicationCommands(client.user.id),
            { body: commands },
        );
        
        console.log('✅ تم تسجيل الأوامر بنجاح!');
    } catch (error) {
        console.error('❌ خطأ في تسجيل الأوامر:', error);
    }
    
    console.log(`📋 استخدم الأوامر التالية للإعداد:`);
    console.log(`   /setverify - لتحديد قناة التفعيل`);
    console.log(`   /settings - لعرض الإعدادات الحالية`);
});

client.on('interactionCreate', async (interaction) => {
    if (interaction.isCommand()) {
        const { commandName } = interaction;
        
        // Check if user has admin permissions for admin commands
        if (['setverify', 'settings'].includes(commandName)) {
            if (!interaction.member.permissions.has('ADMINISTRATOR')) {
                await interaction.reply({ 
                    content: '❌ هذا الأمر متاح للمدراء فقط!', 
                    ephemeral: true 
                });
                return;
            }
        }
        
        // Check if verification commands are used in the correct channel
        if (['تفعيل', 'verify'].includes(commandName)) {
            if (interaction.channel.id !== botSettings.verificationChannelId) {
                await interaction.reply({ 
                    content: `❌ يمكن استخدام أمر التفعيل في <#${botSettings.verificationChannelId}> فقط!`, 
                    ephemeral: true 
                });
                return;
            }
        }
        
        switch (commandName) {
            case 'setverify':
                await setVerificationChannel(interaction);
                break;
            case 'settings':
                await showSettings(interaction);
                break;
            case 'help':
                await showHelp(interaction);
                break;
            case 'تفعيل':
            case 'verify':
                await startVerification(interaction);
                break;
        }
    }
    
    if (interaction.isButton()) {
        switch (interaction.customId) {
            case 'start_personal_info':
                await showPersonalInfoModal(interaction);
                break;
            case 'start_character_info':
                await showCharacterInfoModal(interaction);
                break;
            case 'start_rules_quiz':
                await showRulesQuiz(interaction);
                break;
            case 'start_scenarios':
                await showScenariosModal(interaction);
                break;
            case 'submit_verification':
                await submitVerification(interaction);
                break;
        }
    }
    
    if (interaction.isModalSubmit()) {
        switch (interaction.customId) {
            case 'personal_info_modal':
                await handlePersonalInfo(interaction);
                break;
            case 'character_info_modal':
                await handleCharacterInfo(interaction);
                break;
            case 'rules_quiz_modal':
                await handleRulesQuiz(interaction);
                break;
            case 'scenarios_modal':
                await handleScenarios(interaction);
                break;
        }
    }
});

async function startVerification(interaction) {
    const userId = interaction.user.id;
    
    // Initialize user data
    verificationData.set(userId, {
        step: 'personal_info',
        responses: {}
    });
    
    const embed = new EmbedBuilder()
        .setTitle('🔰 نموذج التفعيل - المعلومات الشخصية')
        .setDescription('أهلاً بك في سيرفر رويال ستي!\nيرجى الضغط على الزر أدناه لبدء عملية التفعيل.')
        .setColor(0x00AE86)
        .setFooter({ text: 'نموذج التفعيل - الخطوة 1 من 4' });
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('start_personal_info')
                .setLabel('📝 بدء التفعيل')
                .setStyle(ButtonStyle.Primary)
        );
    
    await interaction.reply({ embeds: [embed], components: [row] });
}

async function showPersonalInfoModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('personal_info_modal')
        .setTitle('المعلومات الشخصية');
    
    const nameAgeInput = new TextInputBuilder()
        .setCustomId('name_age')
        .setLabel('اسمك و عمرك:')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('مثال: أحمد، 20 سنة')
        .setRequired(true);
    
    const firstActionRow = new ActionRowBuilder().addComponents(nameAgeInput);
    modal.addComponents(firstActionRow);
    
    await interaction.showModal(modal);
}

async function handlePersonalInfo(interaction) {
    const userId = interaction.user.id;
    const userData = verificationData.get(userId) || { responses: {} };
    
    userData.responses.nameAge = interaction.fields.getTextInputValue('name_age');
    userData.step = 'character_info';
    verificationData.set(userId, userData);
    
    const embed = new EmbedBuilder()
        .setTitle('✅ تم حفظ المعلومات الشخصية')
        .setDescription('الآن يرجى إدخال معلومات الشخصية')
        .setColor(0x00AE86)
        .setFooter({ text: 'نموذج التفعيل - الخطوة 2 من 4' });
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('start_character_info')
                .setLabel('📝 معلومات الشخصية')
                .setStyle(ButtonStyle.Primary)
        );
    
    await interaction.reply({ embeds: [embed], components: [row] });
}

async function showCharacterInfoModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('character_info_modal')
        .setTitle('معلومات الشخصية');
    
    const characterNameAge = new TextInputBuilder()
        .setCustomId('character_name_age')
        .setLabel('اسم شخصيتك وعمرها:')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('مثال: سارة المحمدي، 25 سنة')
        .setRequired(true);
    
    const characterStory = new TextInputBuilder()
        .setCustomId('character_story')
        .setLabel('قصة شخصيتك وتاريخ ميلادها:')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('اكتب قصة مفصلة عن شخصيتك وتاريخ ميلادها...')
        .setRequired(true);
    
    const firstRow = new ActionRowBuilder().addComponents(characterNameAge);
    const secondRow = new ActionRowBuilder().addComponents(characterStory);
    
    modal.addComponents(firstRow, secondRow);
    
    await interaction.showModal(modal);
}

async function handleCharacterInfo(interaction) {
    const userId = interaction.user.id;
    const userData = verificationData.get(userId) || { responses: {} };
    
    userData.responses.characterNameAge = interaction.fields.getTextInputValue('character_name_age');
    userData.responses.characterStory = interaction.fields.getTextInputValue('character_story');
    userData.step = 'rules_quiz';
    verificationData.set(userId, userData);
    
    const embed = new EmbedBuilder()
        .setTitle('✅ تم حفظ معلومات الشخصية')
        .setDescription('الآن حان وقت اختبار القوانين. أجب بـ ✅ أو ❌')
        .setColor(0x00AE86)
        .setFooter({ text: 'نموذج التفعيل - الخطوة 3 من 4' });
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('start_rules_quiz')
                .setLabel('📋 اختبار القوانين')
                .setStyle(ButtonStyle.Primary)
        );
    
    await interaction.reply({ embeds: [embed], components: [row] });
}

async function showRulesQuiz(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('rules_quiz_modal')
        .setTitle('اختبار القوانين');
    
    const rulesAnswers = new TextInputBuilder()
        .setCustomId('rules_answers')
        .setLabel('أجوبة القوانين (8 إجابات منفصلة بفواصل):')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('❌، ❌، ❌، ❌، ❌، ✅، ❌، ✅')
        .setRequired(true);
    
    const firstRow = new ActionRowBuilder().addComponents(rulesAnswers);
    modal.addComponents(firstRow);
    
    // Create rules embed to show before modal
    const rulesEmbed = new EmbedBuilder()
        .setTitle('📋 أسئلة القوانين')
        .setDescription(`أجب بـ ✅ أو ❌:
1. هل يحق لك تقتل عند الشقق
2. هل يحق لك تقتل عسكري في المركز
3. هل يحق لك تتكلم وانت ميت
4. هل يحق لك تخرج وانت ميت
5. هل يحق لك الخروج من الرول عند الحاجه
6. انا معي سلاح خفيف والعدو معه سلاح ثقيل يحق لي اقاوم
7. يمدي استعمل قلتشات بدون ابلغ عنها
8. يمدي اسأل عن شي معين خارج الماب مثلاً في السيرفر`)
        .setColor(0xFFD700);
    
    await interaction.reply({ embeds: [rulesEmbed], ephemeral: true });
    
    // Show modal after a short delay
    setTimeout(async () => {
        await interaction.followUp({ content: 'الآن قم بإجابة الأسئلة في النافذة المنبثقة.' });
    }, 1000);
    
    await interaction.showModal(modal);
}

async function handleRulesQuiz(interaction) {
    const userId = interaction.user.id;
    const userData = verificationData.get(userId) || { responses: {} };
    
    userData.responses.rulesAnswers = interaction.fields.getTextInputValue('rules_answers');
    userData.step = 'scenarios';
    verificationData.set(userId, userData);
    
    const embed = new EmbedBuilder()
        .setTitle('✅ تم حفظ إجابات القوانين')
        .setDescription('الآن السيناريوهات الأخيرة')
        .setColor(0x00AE86)
        .setFooter({ text: 'نموذج التفعيل - الخطوة 4 من 4' });
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('start_scenarios')
                .setLabel('🎭 السيناريوهات')
                .setStyle(ButtonStyle.Primary)
        );
    
    await interaction.reply({ embeds: [embed], components: [row] });
}

async function showScenariosModal(interaction) {
    const modal = new ModalBuilder()
        .setCustomId('scenarios_modal')
        .setTitle('السيناريوهات');
    
    const scenario1 = new TextInputBuilder()
        .setCustomId('scenario1')
        .setLabel('اذا شفت شخص خرج عن الرول وش اسوي:')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('أفتح تيكت أو أبلغ الإدارة بصور أو مقطع')
        .setRequired(true);
    
    const scenario2 = new TextInputBuilder()
        .setCustomId('scenario2')
        .setLabel('اذا شفت تخريب وش اسوي:')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('أبلغ فورًا للإدارة مع توثيق (صورة/مقطع)')
        .setRequired(true);
    
    const scenario3 = new TextInputBuilder()
        .setCustomId('scenario3')
        .setLabel('اذا شفت فساد رقابي وش اسوي:')
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder('أبلغ الإدارة العليا أو في قناة الشكاوي الخاصة')
        .setRequired(true);
    
    const firstRow = new ActionRowBuilder().addComponents(scenario1);
    const secondRow = new ActionRowBuilder().addComponents(scenario2);
    const thirdRow = new ActionRowBuilder().addComponents(scenario3);
    
    modal.addComponents(firstRow, secondRow, thirdRow);
    
    await interaction.showModal(modal);
}

async function handleScenarios(interaction) {
    const userId = interaction.user.id;
    const userData = verificationData.get(userId) || { responses: {} };
    
    userData.responses.scenario1 = interaction.fields.getTextInputValue('scenario1');
    userData.responses.scenario2 = interaction.fields.getTextInputValue('scenario2');
    userData.responses.scenario3 = interaction.fields.getTextInputValue('scenario3');
    userData.step = 'complete';
    verificationData.set(userId, userData);
    
    const embed = new EmbedBuilder()
        .setTitle('🎉 تم إكمال جميع الخطوات!')
        .setDescription('يرجى مراجعة إجاباتك والضغط على إرسال للمراجعة')
        .setColor(0x00FF00)
        .setFooter({ text: 'نموذج التفعيل - المراجعة النهائية' });
    
    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('submit_verification')
                .setLabel('📤 إرسال للمراجعة')
                .setStyle(ButtonStyle.Success)
        );
    
    await interaction.reply({ embeds: [embed], components: [row] });
}

async function submitVerification(interaction) {
    const userId = interaction.user.id;
    const userData = verificationData.get(userId);
    
    if (!userData || !userData.responses) {
        await interaction.reply({ content: '❌ لم يتم العثور على بيانات التفعيل. يرجى البدء من جديد.', ephemeral: true });
        return;
    }
    
    const responses = userData.responses;
    
    // Create comprehensive verification embed
    const verificationEmbed = new EmbedBuilder()
        .setTitle('📋 طلب تفعيل جديد')
        .setDescription(`**المستخدم:** ${interaction.user.tag} (${interaction.user.id})`)
        .addFields(
            { name: '👤 الاسم والعمر', value: responses.nameAge || 'غير متوفر', inline: false },
            { name: '🎭 اسم الشخصية وعمرها', value: responses.characterNameAge || 'غير متوفر', inline: false },
            { name: '📖 قصة الشخصية', value: responses.characterStory || 'غير متوفر', inline: false },
            { name: '📋 إجابات القوانين', value: responses.rulesAnswers || 'غير متوفر', inline: false },
            { name: '🚨 السيناريو 1: خروج عن الرول', value: responses.scenario1 || 'غير متوفر', inline: false },
            { name: '💥 السيناريو 2: التخريب', value: responses.scenario2 || 'غير متوفر', inline: false },
            { name: '👮 السيناريو 3: الفساد الرقابي', value: responses.scenario3 || 'غير متوفر', inline: false }
        )
        .setColor(0x0099FF)
        .setTimestamp()
        .setFooter({ text: 'طلب تفعيل - في انتظار المراجعة' });
    
    try {
        // Send to verification channel
        const channel = await client.channels.fetch(botSettings.verificationChannelId);
        await channel.send({ embeds: [verificationEmbed] });
        
        // Clear user data
        verificationData.delete(userId);
        
        await interaction.reply({
            content: '✅ تم إرسال طلب التفعيل بنجاح! سيتم مراجعته من قبل الإدارة قريباً.',
            ephemeral: true
        });
        
    } catch (error) {
        console.error('خطأ في إرسال طلب التفعيل:', error);
        await interaction.reply({
            content: '❌ حدث خطأ في إرسال طلب التفعيل. يرجى المحاولة لاحقاً.',
            ephemeral: true
        });
    }
}

// Admin command functions
async function setVerificationChannel(interaction) {
    const channel = interaction.options.getChannel('channel');
    
    try {
        botSettings.verificationChannelId = channel.id;
        
        const embed = new EmbedBuilder()
            .setTitle('✅ تم تحديد قناة التفعيل')
            .setDescription(`تم تحديد ${channel} كقناة للتفعيل`)
            .setColor(0x00FF00)
            .setTimestamp();
            
        await interaction.reply({ embeds: [embed] });
        
    } catch (error) {
        console.error('خطأ في تحديد قناة التفعيل:', error);
        await interaction.reply({ content: '❌ حدث خطأ في تحديد القناة!', ephemeral: true });
    }
}

async function showSettings(interaction) {
    const verificationChannel = botSettings.verificationChannelId ? 
        `<#${botSettings.verificationChannelId}>` : 'غير محددة';
    
    const embed = new EmbedBuilder()
        .setTitle('⚙️ إعدادات البوت')
        .addFields(
            { name: '📋 قناة التفعيل', value: verificationChannel, inline: true },
            { name: '🤖 حالة البوت', value: 'متصل ✅', inline: true }
        )
        .setColor(0x0099FF)
        .setTimestamp()
        .setFooter({ text: 'رويال ستي - بوت التفعيل' });
    
    await interaction.reply({ embeds: [embed] });
}

async function showHelp(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('📚 أوامر البوت - رويال ستي')
        .setDescription('قائمة بجميع الأوامر المتاحة:')
        .addFields(
            { name: '👑 أوامر الإدارة', value: '`/setverify` - تحديد قناة التفعيل\n`/settings` - عرض الإعدادات\n`/help` - عرض هذه القائمة', inline: false },
            { name: '👤 أوامر المستخدمين', value: '`/تفعيل` أو `/verify` - بدء عملية التفعيل (في قناة التفعيل فقط)', inline: false }
        )
        .setColor(0xFFD700)
        .setTimestamp()
        .setFooter({ text: 'رويال ستي - نظام التفعيل' });
    
    await interaction.reply({ embeds: [embed] });
}

// Error handling
client.on('error', error => {
    console.error('خطأ في البوت:', error);
});

process.on('unhandledRejection', error => {
    console.error('خطأ غير معالج:', error);
});

// Keep alive function for Render deployment
const http = require('http');
const PORT = process.env.PORT || 3000;

// Create a simple HTTP server to keep the app alive on Render
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>رويال ستي - بوت التفعيل</title>
        </head>
        <body style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
            <h1>🤖 بوت رويال ستي للتفعيل</h1>
            <p>البوت يعمل بنجاح!</p>
            <p>الوقت الحالي: ${new Date().toLocaleString('ar-SA')}</p>
        </body>
        </html>
    `);
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`🌐 HTTP Server running on port ${PORT}`);
});

// Self-ping to keep alive on Render (every 14 minutes)
setInterval(() => {
    const url = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
    console.log(`🔄 Pinging ${url} to keep alive...`);
    
    http.get(url, (res) => {
        console.log(`✅ Ping successful: ${res.statusCode}`);
    }).on('error', (err) => {
        console.log('⚠️ Ping error:', err.message);
    });
}, 14 * 60 * 1000); // 14 minutes

// Login to Discord
client.login(BOT_TOKEN).catch(error => {
    console.error('فشل في تسجيل الدخول:', error);
    process.exit(1);
});
