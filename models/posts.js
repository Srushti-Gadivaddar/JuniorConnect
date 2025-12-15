const mongoose = require("mongoose");
const Schema = mongoose.Schema;


const postSchema = new Schema({
    title: {
        type: String,
        trim: true
    },

    content: {
        type: String,
    },

    images:  [ 
        {
            url: String,
            filename: String,
        }
    ],

    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Profile",
    },

    comments: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Comment"
        }
    ],

    likes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Profile"
        }
    ],
    createdAt: {
        type: Date,
        default: Date.now(),
    }
});

module.exports = mongoose.model("Post", postSchema);