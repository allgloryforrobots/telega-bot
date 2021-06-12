const mongoose = require('mongoose')
const Schema = mongoose.Schema

const advSchema = new Schema({
    chatId: {
        type: String,
        required: true
    },
    text: {
        type: String
    },
    date: {
        type: Date,
        default: Date.now
    },
    isRed: {
        type: Boolean,
        default: false
    },
    redDate: {
        type: Schema.Types.Mixed,
        default: null
    }
  })
  
  module.exports = mongoose.model('advs', advSchema)
