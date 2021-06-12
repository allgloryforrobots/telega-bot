const TelegramApi = require('node-telegram-bot-api')
const mongoose = require('mongoose')
require('dotenv').config()

const Adv = require('./models/Adv')

mongoose.set('useFindAndModify', false)

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true  })
  .then(() => console.log('MongoDB connected'))
  .catch(error => console.log(error))

const token = process.env.TOKEN
const bot = new TelegramApi(token, {polling: true})

const log = console.log 

bot.setMyCommands([
    {command: '/start', description: 'Начальное приветствие!'},
    {command: '/adv', description: 'Показать все объявления'}
])

const errorHandler = (chatId, e, code) => {
    bot.sendMessage(chatId, `Ошибка в базе данных, код: ${code}`)
    log(e)
}

async function cleaner() {
    await Adv.deleteMany({ date: { $lte: Date.now() - 60*60*1000 } })
}

async function redCleaner() {
    await Adv.updateMany({ redDate: { $lte: Date.now() - 5*60*1000 } }, {"$set":{"isRed": false, "redDate": null}})
}

setInterval(redCleaner, 60*1000)
setInterval(cleaner, 60*1000)

bot.on('message', async msg => {
    const text = msg.text
    const chatId = msg.chat.id
    if (text === '') return bot.sendMessage(chatId, 'Объявление не может быть пустой строкой!')

    if (text === '/start') {
        await bot.sendSticker(chatId, 'https://tlgrm.ru/_/stickers/c62/4a8/c624a88d-1fe3-403a-b41a-3cdb9bf05b8a/192/30.webp')
        bot.sendMessage(chatId, `Добро пожаловать в мой телеграм бот!`)
        return bot.sendMessage(chatId, `Напиши текст объявления, которое хочешь разместить \nНапиши /adv, чтобы увидеть все объявления`)
    }

    if (text === '/adv') {

            try {
                const red = await Adv.findOne({ isRed: true })

                if (red !== null)  await bot.sendMessage(chatId, red.text)
            } catch (e) {
                // errorHandler(chatId, e, 1)
            }
            
            try {
                const other = await Adv.find({ isRed: false })
                const html = other.map((adv, i) => `<b>${i+1}</b> ${adv.text}`).join('\n\n')
                if (other !== null) await bot.sendMessage(chatId, html, {parse_mode : "HTML"})
            } catch (e) {
                // errorHandler(chatId, e, 2)
            }
            return

    }

    const adv = new Adv({
        chatId,
        text,
        date: Date.now(),
        isRed: false,
        redDate: null
    })

    try {
        await adv.save()
        bot.sendMessage(chatId, `Объявление успешно зарегестрировано`)
      } catch(e) {
        bot.sendMessage(chatId, `Что-то пошло не так, попробуйте снова`)
        log(e)
      }
    


    return bot.sendMessage(chatId, 'Хочешь назначить горячую цену за объявление?',  {reply_markup: {
        inline_keyboard: [
            [{ text: 'Указать горячую цену', callback_data: JSON.stringify( { callback_data:'yesRedPrice', chatId } ) }],
            [{ text: 'Нет спеццен', callback_data: JSON.stringify( { callback_data:'noRedPrice', chatId } ) }],
        ]
    }})
}) 

bot.on('callback_query', async msg => {
    const data = JSON.parse(msg.data)
    log('callback_query', data.chatId, data.callback_data)
    
    if (data.callback_data === 'yesRedPrice') {

        try {
            await Adv.updateMany({"isRed": true}, {"$set":{"isRed": false, "redDate": null}})
        } catch (e) {
            return errorHandler(data.chatId, e, 4)
        }

        try {
            await Adv.findOneAndUpdate({"chatId": data.chatId}, {"$set":{"isRed": true, "redDate": Date.now()}}).sort( {date: -1} )
            await bot.sendMessage(data.chatId, `Объявление будет закреплено вверху списка до тех пор, пока другой пользователь не даст красную цену`)
        } catch (e) {
            errorHandler(data.chatId, e, 5)
        }

        return
    }
}) 


