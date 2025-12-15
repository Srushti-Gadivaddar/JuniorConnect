const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const questionSchema = new Schema({
  title: { 
    type: String, 
    required: true 
    },

  body: { 
    type: String, 
    required: true 
    }, 

  author: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Profile", required: true 
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
    tags: [
    {
      type: String,
      lowercase: true,
      trim: true
    }
  ],
  answers: [
        { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "Answer" 
        }
    ]
}, { timestamps: true });

module.exports = mongoose.model("Question", questionSchema);
