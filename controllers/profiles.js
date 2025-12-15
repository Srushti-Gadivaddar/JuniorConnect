const Profile = require("../models/profiles.js");
const Post = require("../models/posts.js");
const { postSchema, profileSchema } = require("../schema.js");
const Notify = require("../utils/sendNotification");

module.exports.index = async(req, res) => {
    const allProfiles = await Profile.find({});
    res.render("profiles/index.ejs", {profiles: allProfiles });
};

module.exports.RenderNewForm = (req, res) => {
    res.render("profiles/new.ejs");
};

module.exports.showProfiles = async(req, res) => {
    const {id} = req.params;
    const profile = await Profile.findById(id);
    const posts = await Post.find({ author: profile._id })
        .populate({
        path: "comments",
        populate: {
            path: "author",
            model: "Profile",
        }
    }) .populate("likes");

        if(!profile) {
            req.flash("error", "This User does not exist");
            return res.redirect("/profiles");
        }

    let currentUserProfile = null;
    if (req.user) {
        currentUserProfile = await Profile.findOne({ user: req.user._id });
    }

    res.render("profiles/show.ejs", {profile, posts, currentUserProfile});
};

module.exports.createProfile = async(req, res, next) => {
        let url = req.file.path;
        let filename = req.file.filename;
        const newProfile = new Profile(req.body.profile);
            newProfile.profile_pic = {url, filename};

        newProfile.user = req.user._id; 
        const existingProfile = await Profile.findOne({ user: req.user._id });

        if (existingProfile) {
            req.flash("error", "You already have a profile!");
            return res.redirect(`/profiles/${existingProfile._id}`);
        }

        await newProfile.save();
        Notify.sendWelcome(newProfile.name);
        req.flash("success", "New Profile is created!");
        res.redirect("/profiles");
};

module.exports.editProfileForm = async(req, res) => {
    let {id} = req.params;
    const profile = await Profile.findById(id);
    if(!profile) {
        req.flash("error", "This User does not exist");
        return res.redirect("/profiles");
    }
    res.render("profiles/edit.ejs", {profile});
};

module.exports.editProfile = async(req, res) => { 
    let {id} = req.params;
    const profile = await Profile.findByIdAndUpdate(id, {...req.body.profile});

    if(typeof req.file !== "undefined") {
        let url = req.file.path;
        let filename = req.file.filename;
        profile.profile_pic = {url, filename};
        await profile.save();
    }
    
    if(!profile) {
        req.flash("error", "This User does not exist");
        return res.redirect("/profiles");
    }
    req.flash("success", "Changes Saved!");
    res.redirect("/profiles");
};

module.exports.deleteProfile = async(req, res) => {
    let {id} = req.params;
    let deletedProfile = await Profile.findByIdAndDelete(id);
    if(!deletedProfile) {
        req.flash("error", "This User does not exist");
        return res.redirect("/profiles");
    }
    req.flash("success", "Successfully deleted your Profile");
    res.redirect("/profiles");
};