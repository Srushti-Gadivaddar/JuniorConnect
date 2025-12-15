const express = require("express");
const router = express.Router({ mergeParams: true });
const Reply = require("../models/replies");
const Question = require("../models/questions");
const Profile = require("../models/profiles");
const Answer = require("../models/answers");
const { isLoggedIn } = require("../middleware");
const Notify = require("../utils/sendNotification");
const User = require("../models/users");


// Extract @mentions from text
function extractMentions(text) {
    const regex = /@([a-zA-Z0-9_]+)/g;
    let match;
    const result = [];
    while ((match = regex.exec(text)) !== null) {
        result.push(match[1]);
    }
    return result;
}

// POST: create reply
router.post("/", isLoggedIn, async (req, res) => {
    try {
        const { questionId, answerId } = req.params;

        // Get current user's profile
        const profile = await Profile.findOne({ user: req.user._id });
        if (!profile) {
            req.flash("error", "Profile not found");
            return res.redirect("/questions");
        }
        const text = req.body.text || "";
        // Extract mentions
        const mentionUsernames = extractMentions(text);
        const mentionedUsers = await User.find({ username: { $in: mentionUsernames } });
        const mentionedProfiles = await Profile.find({ user: { $in: mentionedUsers.map(u => u._id) } });

        const reply = new Reply({
            text: req.body.text,
            author: profile._id,
            answer: answerId,
            question: questionId,
            mentions: mentionedProfiles.map(p => p._id)
        });

        await reply.save();

      Notify.newReply(questionId, req.user.username);

        // Add reply reference to Answer
        const answer = await Answer.findById(answerId);
        answer.replies.push(reply._id);
        await answer.save();

        const answerAuthor = await Profile.findById(answer.author._id);
        answerAuthor.points += 3;
        await answerAuthor.save();

         //  Notify Answer Author (if not the same user)
        const answerAuthorUser = await User.findOne({ _id: answer.author.user });
        if (answerAuthorUser && answerAuthorUser.oneSignalSubscriptionId && !answerAuthorUser._id.equals(req.user._id)) {
            await Notify.newReply(questionId, req.user.username);
        }

        //  Mention Notifications
        for (let user of mentionedUsers) {
            if (!user.oneSignalSubscriptionId) continue;
            await Notify.sendMention(req.user.username, questionId, user.oneSignalSubscriptionId);
        }

        req.flash("success", "Reply added!");
        res.redirect(`/questions/${questionId}#answer-${answerId}`);
    } catch (err) {
        console.error(err);
        req.flash("error", "Cannot add reply!");
        res.redirect("/questions");
    }
});

// GET: edit reply
router.get("/:replyId/edit", isLoggedIn, async (req, res) => {
  const { questionId, answerId, replyId } = req.params;
  const reply = await Reply.findById(replyId);
  if (!reply) {
    req.flash("error", "Reply not found");
    return res.redirect(`/questions/${questionId}`);
  }
  res.render("replies/edit", { questionId, answerId, reply });
});

// PUT: update reply
router.put("/:replyId", isLoggedIn, async (req, res) => {
  const { questionId, answerId, replyId } = req.params;
  const reply = await Reply.findById(replyId);
  if (!reply) {
    req.flash("error", "Reply not found");
    return res.redirect(`/questions/${questionId}`);
  }
  reply.text = req.body.text;
  await reply.save();
  req.flash("success", "Reply updated!");
  res.redirect(`/questions/${questionId}#answer-${answerId}`);
});

// DELETE: delete reply
router.delete("/:replyId", isLoggedIn, async (req, res) => {
  const { questionId, answerId, replyId } = req.params;
  await Reply.findByIdAndDelete(replyId);
  await Answer.findByIdAndUpdate(answerId, { $pull: { replies: replyId } });
  req.flash("success", "Reply deleted!");
  res.redirect(`/questions/${questionId}#answer-${answerId}`);
});

module.exports = router;
