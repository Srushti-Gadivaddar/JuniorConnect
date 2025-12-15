const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const answerSchema = new Schema({
  text: { 
    type: String, 
    required: true 
    }, // Quill HTML
  author: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Profile", 
    required: true 
    },
  question: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Question", 
    required: true 
    },
  images: [
        { 
            url: String, 
            filename: String 
        }
    ],
  files: [
        { 
            url: String, 
            filename: String 
        }
    ],
  replies: [
        { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "Reply" 
        }
    ],
  mentions: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Profile",
    }
  ],
  reactions: [{
    user: { type: mongoose.Schema.Types.ObjectId, ref: "Profile" },
    type: String // like, heart, fire
  }],
}, { timestamps: true });

module.exports = mongoose.model("Answer", answerSchema);
