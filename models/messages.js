const mongoose = require("mongoose");

const attachmentSchema = new mongoose.Schema({
    url: String,
    type: { type: String, enum: ["image", "file"], required: true }
});

const messageSchema = new mongoose.Schema({
    sender: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    receiver: { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User", 
      required: true 
    },
    content: { 
      type: String 
    },
    blockedUsers: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    }],
    attachments: [attachmentSchema],
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Message", messageSchema);
