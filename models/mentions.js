const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const mentionSchema = new Schema({
    mentionedUser: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User",
        required: true 
    },
    mentionedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "User",
        required: true 
    },
    type: {
        type: String,
        enum: ["question", "answer", "reply"],
        required: true
    },
    itemId: {        // questionId OR answerId OR replyId
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model("Mention", mentionSchema);
