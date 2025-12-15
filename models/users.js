const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose");

const userSchema = new Schema({
    email: {
        type: String,   
    },
    username: {  
        type: String,
        unique: true,
        required: true,
        lowercase: true,   // auto convert to lowercase
        trim: true
    },
    oneSignalSubscriptionId: String,
    oneSignalUserId: String,
    googleId: String,
    githubId: String,
    blockedUsers: [
        {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
        }
    ],
});

userSchema.pre("save", function(next) {
    if (this.username) {
        this.username = this.username
            .toLowerCase()
            .replace(/ /g, "_");  // Replace spaces with "_"
    }
    next();
});


userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);