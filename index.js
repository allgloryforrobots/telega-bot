const TelegramApi = require('node-telegram-bot-api')
const mongoose = require('mongoose')
require('dotenv').config()

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true  })
  .then(() => console.log('MongoDB connected'))
  .catch(error => console.log(error))

const token = process.env.TOKEN
const bot = new TelegramApi(token, {polling: true})

let store = []

const log = console.log 

bot.setMyCommands([
    {command: '/start', description: 'Начальное приветствие!'},
    {command: '/adv', description: 'Показать все объявления'}
])

bot.on('message', async msg => {
    const text = msg.text
    const chatId = msg.chat.id

    if (text === '/start') {
        await bot.sendSticker(chatId, 'https://tlgrm.ru/_/stickers/c62/4a8/c624a88d-1fe3-403a-b41a-3cdb9bf05b8a/192/30.webp')
        bot.sendMessage(chatId, `Добро пожаловать в мой телеграм бот!`)
        return bot.sendMessage(chatId, `Напиши текст объявления, которое хочешь разместить \nНапиши /adv, чтобы увидеть все объявления`)
    }

    if (text === '/adv') {
        store = store.filter( adv => Date.now() - adv.date < 60*60*1000)
        store.forEach(el => {
            if (el.redDate !== null && Date.now() - el.redDate < 5*60*1000) {
                el.redDate = null
            }
        })

        if (store[0]) {
            const red = store.find(el => el.isRed == true)
            log('red', red)
            const other = store.filter(el => el.isRed !== true)
            log('other', other)

            if (red) {
                await bot.sendMessage(chatId, red.text)
            }
            
            const html = other.map((adv, i) => `<b>${i+1}</b> ${adv.text}`).join('\n\n')
            return bot.sendMessage(chatId, html, {parse_mode : "HTML"})
        }
        return bot.sendMessage(chatId, `Нет объявлений`)
    }

    store.unshift({
        chatId,
        text,
        date: Date.now(),
        isRed: false,
        redDate: null
    })  

    log('STORE', store)
    return bot.sendMessage(chatId, 'Хочешь назначить горячую цену за объявление?',  {reply_markup: {
        inline_keyboard: [
            [{ text: 'Указать горячую цену', callback_data: JSON.stringify( { callback_data:'yesRedPrice', chatId } ) }],
            [{ text: 'Нет спеццен', callback_data: JSON.stringify( { callback_data:'noRedPrice', chatId } ) }],
        ]
    }})
}) 

bot.on('callback_query', msg => {
    const data = JSON.parse(msg.data)
    log('callback_query', data.chatId, data.callback_data)
    
    if (data.callback_data === 'yesRedPrice') {
        const redIndex = store.findIndex( el => el?.chatId === data.chatId ) 
        if (redIndex === -1) return log('!redIndex')
        log('найден redIndex')
        store.forEach(el => {
            el.isRed = false
            el.redDate = false
        })
        store[redIndex].isRed = true
        store[redIndex].redDate = Date.now()
        log('STORE2', store)
        return log('redIndex', store[0].isRed)
    }
}) 


