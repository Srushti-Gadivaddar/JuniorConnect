const express = require("express");
const router = express.Router({ mergeParams: true }); // merge params to get :id (questionId)
const Question = require("../models/questions");
const User = require("../models/users");
const Answer = require("../models/answers");
const Mention = require("../models/mentions");
const Profile = require("../models/profiles");
const { isLoggedIn, uploadFields, processUploads, isAnswerOwner } = require("../middleware");
const { cloudinary } = require("../cloudConfig");
const Notify = require("../utils/sendNotification");

// Extract @mentions (supports underscores)
function extractMentions(text) {
  const regex = /@([a-zA-Z0-9_]+)/g;
  let match;
  let result = [];
  while ((match = regex.exec(text)) !== null) {
    result.push(match[1]);
  }
  return result;
}

// CREATE answer
router.post(
  "/",
  isLoggedIn,
  uploadFields,
  processUploads,
  async (req, res) => {
    try {
      const question = await Question.findById(req.params.questionId);
      const profile = await Profile.findOne({ user: req.user._id });
      const text = req.body.text || '';

      if (!question) return res.redirect("/questions");
      if (!profile) return res.redirect(`/questions/${question._id}`);

      const mentionUsernames = extractMentions(text);
      const mentionedUsers = await User.find({ username: { $in: mentionUsernames } });
      const mentionedProfiles = await Profile.find({
        user: { $in: mentionedUsers.map(u => u._id) },
      });

      const answer = new Answer({
        text: req.body.text,
        author: profile._id,
        question: question._id,
        images: req.processedImages,
        files: req.processedFiles,
        mentions: mentionedProfiles.map(p => p._id),
      });

      await answer.save();
      question.answers.push(answer._id);
      await question.save();

      // Add points to answer author
      profile.points += 10;
      await profile.save();

        // 1. Mention notifications
      for (const user of mentionedUsers) {
        if (!user.oneSignalSubscriptionId) continue;
        await Notify.sendMention(
          req.user.username,
          question._id,
          user.oneSignalSubscriptionId
        );
      }

    Notify.newAnswer(question.title, question._id, req.user.username);

      req.flash("success", "Answer posted");
      res.redirect(`/questions/${question._id}#answer-${answer._id}`);
    } catch (err) {
      console.error(err);
      req.flash("error", "Could not post answer");
      res.redirect(`/questions/${req.params.questionId}`);
    }
  }
);

// EDIT answer form
router.get("/:answerId/edit", isLoggedIn, async (req, res) => {
  const { questionId, answerId } = req.params;
  const question = await Question.findById(questionId);
  const answer = await Answer.findById(answerId);
  if (!question || !answer) {
    req.flash("error", "Not found");
    return res.redirect("/questions");
  }
  res.render("answers/edit", { question, answer });
});

// UPDATE answer
router.put(
  "/:answerId",
  isLoggedIn,
  uploadFields,
  processUploads,
  async (req, res) => {
    try {
      const { questionId, answerId } = req.params;
      const answer = await Answer.findById(answerId);
      if (!answer) {
        req.flash("error", "Answer not found");
        return res.redirect(`/questions/${questionId}`);
      }

      answer.text = req.body.text || answer.text;

      // Add new uploads
      if (req.processedImages?.length) answer.images.push(...req.processedImages);
      if (req.processedFiles?.length) answer.files.push(...req.processedFiles);

      await answer.save();
      req.flash("success", "Answer updated");
      res.redirect(`/questions/${questionId}#answer-${answer._id}`);
    } catch (err) {
      console.error(err);
      req.flash("error", "Unable to update answer");
      res.redirect(`/questions/${req.params.questionId}`);
    }
  }
);


// DELETE answer
router.delete("/:answerId", isLoggedIn, async (req, res) => {
  try {
    const { questionId, answerId } = req.params;
    const answer = await Answer.findById(answerId);
    if (!answer) {
      req.flash("error", "Answer not found");
      return res.redirect(`/questions/${questionId}`);
    }

    // delete images from cloudinary
    if (answer.images && answer.images.length) {
      for (let img of answer.images) {
        // img.filename should be the public_id stored by Cloudinary (CloudinaryStorage sets file.filename)
        if (img.filename) {
          try { await cloudinary.uploader.destroy(img.filename); } catch (e) { console.warn("Cloudinary destroy error:", e); }
        }
      }
    }

    // remove answer id from question.questions array
    await Question.findByIdAndUpdate(questionId, { $pull: { answers: answer._id } });
    await Answer.findByIdAndDelete(answerId);

    req.flash("success", "Answer deleted");
    res.redirect(`/questions/${questionId}`);
  } catch (err) {
    console.error(err);
    req.flash("error", "Could not delete answer");
    res.redirect(`/questions/${req.params.questionId}`);
  }
});

// remove a single image from answer (AJAX or form post)
router.post("/:answerId/images/:filename/delete", isLoggedIn, async (req, res) => {
  try {
    const { questionId, answerId, filename } = req.params;
    const answer = await Answer.findById(answerId);
    if (!answer) {
      req.flash("error", "Answer not found");
      return res.redirect(`/questions/${questionId}`);
    }

    // remove from cloudinary
    await cloudinary.uploader.destroy(filename);

    // remove from DB array (match filename field)
    answer.images = answer.images.filter(img => img.filename !== filename);
    await answer.save();

    req.flash("success", "Image removed");
    res.redirect(`/questions/${questionId}#answer-${answer._id}`);
  } catch (err) {
    console.error(err);
    req.flash("error", "Unable to remove image");
    res.redirect("/questions");
  }
});

// AUTOCOMPLETE — get all usernames
router.get("/api/usernames", async (req, res) => {
    const profiles = await Profile.find({}, "name");
    res.json(profiles);
});

module.exports = router;
