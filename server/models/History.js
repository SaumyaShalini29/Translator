import mongoose from 'mongoose'

const historySchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    feature: {
      type: String,
      enum: ['detect', 'translate', 'scan', 'voice', 'camera'],
      required: true,
    },
    inputText: {
      type: String,
      required: true,
      trim: true,
    },
    detectedLanguage: {
      type: String,
      default: '',
    },
    targetLanguage: {
      type: String,
      default: '',
    },
    translatedText: {
      type: String,
      default: '',
    },
  },
  { timestamps: true },
)

export default mongoose.model('History', historySchema)
