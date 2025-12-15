const Profile = require("../models/profiles.js");
const Post = require("../models/posts.js");
const multer  = require('multer');
const { storage , cloudinary} = require("../cloudConfig.js");
const upload = multer({ storage });
const Notify = require("../utils/sendNotification");

module.exports.createPost = async(req, res) => {
    const profile = await Profile.findById(req.params.id);
    if (!profile) {
        req.flash("error", "Profile not found!");
        return res.redirect("/profiles");
    }

    if (!profile.user.equals(req.user._id)) {
        req.flash("error", "You cannot create a post for another profile!");
        return res.redirect(`/profiles/${profile._id}`);
    }

    // Create new post
    const newPost = new Post(req.body.post);
    newPost.author = profile._id;

    // MULTIPLE IMAGES FIX
    if (req.files && req.files.length > 0) {
        newPost.images = req.files.map(file => ({
            url: file.path,
            filename: file.filename
        }));
    }

    await newPost.save();

    req.flash("success", "Post created successfully!");
    res.redirect(`/profiles/${profile._id}`);
};


module.exports.RenderPostEditForm = async (req, res) => {
    const profile = await Profile.findById(req.params.id);
    const post = await Post.findById(req.params.postId);
    if(!post) {
        req.flash("error", "This Post does not exist");
        res.redirect("/profiles");
    }
    res.render("posts/edit", { profile, post });
};

module.exports.editPost = async (req, res) => {
    const { id, postId } = req.params;

    const post = await Post.findById(postId);

    if (!post) {
        req.flash("error", "This Post does not exist");
        return res.redirect(`/profiles/${id}`);
    }

    // Update text fields
    post.title = req.body.post.title;
    post.content = req.body.post.content;

    // --- DELETE OLD IMAGES IF SELECTED ---
    if (req.body.deleteImages) {
        for (let filename of req.body.deleteImages) {
            await cloudinary.uploader.destroy(filename);
            post.images = post.images.filter(img => img.filename !== filename);
        }
    }

    if (req.files && req.files.length > 0) {
        const newImgs = req.files.map(file => ({
            url: file.path,
            filename: file.filename
        }));

        post.images.push(...newImgs);
    }

    await post.save();

    req.flash("success", "Changes Saved!");
    res.redirect(`/profiles/${id}`);
};


module.exports.deletePost = async(req, res) => {
    let post = await Post.findByIdAndDelete(req.params.postId);
    if(!post) {
        req.flash("error", "This Post does not exist");
        res.redirect("/profiles");
    }
    req.flash("success", "Post deleted successfully!");
    res.redirect(`/profiles/${req.params.id}`);
};

module.exports.likePost = async (req, res) => {
    const { id, postId } = req.params;

    const profile = await Profile.findById(id);
    const post = await Post.findById(postId);

    if (!profile || !post) {
        req.flash("error", "Profile or Post not found!");
        return res.redirect(`/profiles/${id}`);
    }

    // Toggle like
    if (post.likes.includes(profile._id)) {
        post.likes.pull(profile._id); // Remove like
    } else {
        post.likes.push(profile._id); // Add like
    }

    await post.save();
    
    Notify.newLike(questionId, req.user.username);

    res.redirect(`/profiles/${id}`);
};

