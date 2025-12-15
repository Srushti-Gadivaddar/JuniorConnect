const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const replySchema = new Schema({
  text: { 
    type: String, 
    required: true 
  }, // reply text
  author: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Profile", 
    required: true 
  },
  question: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Question" 
  },
  answer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Answer", 
    required: true
  },
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "Profile" }],

}, { timestamps: true });

module.exports = mongoose.model("Reply", replySchema);
