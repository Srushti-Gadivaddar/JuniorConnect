const express = require("express");
const router = express.Router();
const Question = require("../models/questions");
const Answer = require("../models/answers");
const User = require("../models/users");
const Profile = require("../models/profiles");
const { isLoggedIn, uploadFields, processUploads, isQuestionOwner } = require("../middleware");
const { cloudinary } = require("../cloudConfig");
const Notify = require("../utils/sendNotification");

// Extract @mentions (supports underscores)
function extractMentions(text) {
  const regex = /@([a-zA-Z0-9_]+)/g;
  let match;
  const result = [];
  while ((match = regex.exec(text)) !== null) {
    result.push(match[1]);
  }
  return result;
}


// NEW form
router.get("/new", isLoggedIn, (req, res) => {
  res.render("questions/new");
});


// CREATE
router.post("/", isLoggedIn, uploadFields, processUploads, async (req, res) => {
  try {
    let tags = [];

      if (req.body.tags) {
      tags = req.body.tags
        .split(",")
        .map(t => t.trim().toLowerCase())
        .filter(t => t.length > 0);
      }

    // 1. Get sender profile
    const profile = await Profile.findOne({ user: req.user._id });
    if (!profile) {
      req.flash("error", "Profile not found");
      return res.redirect("/questions");
    }

    const text = req.body.text || "";
    const title = req.body.title || "Untitled Question";

     // Handle mentions in question text (optional)
      const mentionUsernames = extractMentions(text);
      const mentionedUsers = await User.find({ username: { $in: mentionUsernames } });

    // 2. Create question
    const question = new Question({
      title: req.body.title,
      body: req.body.body,
      author: profile._id,
      images: req.processedImages,
      files: req.processedFiles,
      tags: tags,
    });
    await question.save();


         // Send mention notifications
    for (const user of mentionedUsers) {
      if (!user.oneSignalSubscriptionId) continue;
        await Notify.sendMention(
          req.user.username,
          question._id,
          user.oneSignalSubscriptionId
      );
    }  

    Notify.newQuestion(question.title, question._id, req.user.username);

    req.flash("success", "Question posted");
    res.redirect(`/questions/${question._id}`);

  } catch (err) {
    console.error(err);
    req.flash("error", "Unable to create question");
    res.redirect("/questions");
  }
});


// INDEX
router.get("/", async (req, res) => {
  const questions = await Question.find({}).populate("author").sort({ createdAt: -1 });
  res.render("questions/listQA", { questions });
});

// SHOW
router.get("/:id", async (req, res) => {
   const question = await Question.findById(req.params.id)
    .populate("author")
    .populate({
      path: "answers",
      populate: [
        { path: "author" },
        { 
          path: "mentions",        
          select: "username" // use username to display @username
        },
        {
          path: "replies",
          populate: [
            { path: "author" },
            { 
              path: "mentions",
              select: "username" // populate mentions for replies too
            }
          ]
        }
      ]
    });

    
  if (!question) {
    req.flash("error", "Question not found");
    return res.redirect("/questions");
  }

  let currentProfile = null;

  if (req.isAuthenticated()) {
    currentProfile = await Profile.findOne({ user: req.user._id });
  }

  res.render("questions/show", {
    question,
    answers: question.answers,
    answerCount: question.answers.length,
    currentProfile
  });
});


// EDIT form
router.get("/:id/edit", isLoggedIn, async (req, res) => {
  const question = await Question.findById(req.params.id);
  res.render("questions/edit", { question });
});

// UPDATE
router.put("/:id", isLoggedIn, uploadFields, processUploads, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    question.title = req.body.title || question.title;
    question.body = req.body.body || question.body;
    if (req.processedImages && req.processedImages.length) question.images.push(...req.processedImages);
    if (req.processedFiles && req.processedFiles.length) question.files.push(...req.processedFiles);
    await question.save();
    req.flash("success", "Question updated");
    res.redirect(`/questions/${question._id}`);
  } catch (err) {
    console.error(err);
    req.flash("error", "Unable to update question");
    res.redirect("questions");
  }
});

// DELETE
router.delete("/:id", isLoggedIn, async (req, res) => {
  try {
    const q = await Question.findById(req.params.id);
    if (q && q.images && q.images.length) {
      for (let img of q.images) {
        if (img.filename) {
          try { await cloudinary.uploader.destroy(img.filename); } catch (e) { console.warn(e); }
        }
      }
    }
    await Question.findByIdAndDelete(req.params.id);
    req.flash("success", "Question deleted");
    res.redirect("/questions");
  } catch (err) {
    console.error(err);
    req.flash("error", "Unable to delete question");
    res.redirect("questions");
  }
});

// remove single image from question
router.post("/:id/images/:filename/delete", isLoggedIn, async (req, res) => {
  try {
    const { id, filename } = req.params;
    const question = await Question.findById(id);
    if (!question) {
      req.flash("error", "Question not found");
      return res.redirect("/questions");
    }
    await cloudinary.uploader.destroy(filename);
    question.images = question.images.filter(img => img.filename !== filename);
    await question.save();
    req.flash("success", "Image removed");
    res.redirect(`/questions/${id}/edit`);
  } catch (err) {
    console.error(err);
    req.flash("error", "Unable to remove image");
    res.redirect("questions");
  }
});

// remove single file from question (no cloudinary destroy needed if you stored file using cloudinary — if you used different storage adjust accordingly)
router.post("/:id/files/:filename/delete", isLoggedIn, async (req, res) => {
  try {
    const { id, filename } = req.params;
    const question = await Question.findById(id);
    if (!question) {
      req.flash("error", "Question not found");
      return res.redirect("/questions");
    }
    // attempt to destroy by filename too - if file was uploaded to cloudinary and filename is public_id
    try { await cloudinary.uploader.destroy(filename); } catch (e) { /* ignore */ }
    question.files = question.files.filter(f => f.filename !== filename);
    await question.save();
    req.flash("success", "File removed");
    res.redirect(`/questions/${id}/edit`);
  } catch (err) {
    console.error(err);
    req.flash("error", "Unable to remove file");
    res.redirect("questions");
  }
});


//for searching question under tags
router.get("/tag/:tag", async (req, res) => {
  const tag = req.params.tag.toLowerCase();
  const questions = await Question.find({ tags: tag }).populate("author");

  res.render("questions/tag", { questions, tag });
});


module.exports = router;
