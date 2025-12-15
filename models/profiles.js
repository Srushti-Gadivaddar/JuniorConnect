const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const ProfileSchema = new Schema({
    name: {
        type: String,   
        trim: true,
    },
    batch: {
        type: Number,
    },
    branch: {
        type: String,
    },
    role: {
        type: String,
        default: 'Student'
    },
    bio: {
        type: String,
        maxlength: 200
    },
    profile_pic: {
        url: String,
        filename: String,
    },
    points: { type: Number, default: 0 },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    },
}, { timestamps: true });

const Profile = mongoose.model("Profile", ProfileSchema);

module.exports = Profile;