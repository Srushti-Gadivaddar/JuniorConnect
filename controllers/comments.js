const Comment = require("../models/comments.js");
const Profile = require("../models/profiles.js");
const Post = require("../models/posts.js");
const Notify = require("../utils/sendNotification");


module.exports.addComment = async (req, res) => {
    const { id, postId } = req.params;

    const post = await Post.findById(postId);
    if (!post) {
        throw new ExpressError(404, "Post not found");
    }
    const commenterProfile = await Profile.findOne({ user: req.user._id });

    if (!commenterProfile) {
        throw new ExpressError(404, "Profile not found for user");
    }

    const newComment = new Comment({
        comment: req.body.comment.comment,
        author: commenterProfile._id,  
        post: postId,
    });

    await newComment.save();

    post.comments.push(newComment._id);
    await post.save();

    Notify.newComment(questionId, req.user.username);

    req.flash("success", "Comment added successfully!");
    res.redirect(`/profiles/${id}`);
};

module.exports.editCommentForm = async (req, res) => {
    const { id, postId, commentId } = req.params;

    const profile = await Profile.findById(id);
    const post = await Post.findById(postId);
    const comment = await Comment.findById(commentId).populate("author");

    if (!comment) {
        req.flash("error", "Comment not found!");
        return res.redirect(`/profiles/${id}`);
    }

    res.render("comments/edit", { profile, post, comment });
};

module.exports.editComment = async (req, res) => {
    const { id, commentId } = req.params;

    const comment = await Comment.findById(commentId);
    if (!comment) throw new ExpressError(404, "Comment not found");

    comment.comment = req.body.comment.comment;

    await comment.save();
    req.flash("success", "Comment updated successfully!");
    res.redirect(`/profiles/${id}`);
};

module.exports.deleteComment = async (req, res) => {
    const { id, postId, commentId } = req.params;
    await Comment.findByIdAndDelete(commentId);

    // Pull comment from post array
    await Post.findByIdAndUpdate(postId, { 
        $pull: { comments: commentId }
    });
    req.flash("success", "Comment deleted successfully!");
    res.redirect(`/profiles/${id}`);
};