const Post = require("./models/posts");
const Profile = require("./models/profiles");
const Comment = require("./models/comments");
const Question = require("./models/questions");
const { postSchema, profileSchema } = require("./schema");
const Answer = require("./models/answers");
const Reply = require("./models/replies.js");
const multer = require('multer');
const { storage } = require('./cloudConfig.js'); // your Cloudinary storage setup
const upload = multer({ storage });
const ExpressError = require('./utils/ExpressError'); // make sure you have this

const uploadFields = upload.fields([
  { name: 'images', maxCount: 8 },
  { name: 'files', maxCount: 8 }
]);

async function processUploads(req, res, next) {
  try {
    req.processedImages = [];
    req.processedFiles = [];

    if (req.files) {
      if (req.files['images']) {
        req.processedImages = req.files['images'].map(file => ({
          url: file.path,
          filename: file.filename
        }));
      }

      if (req.files['files']) {
        req.processedFiles = req.files['files'].map(file => ({
          url: file.path,
          filename: file.originalname || file.filename
        }));
      }
    }

    next();
  } catch (err) {
    console.error('processUploads error:', err);
    req.flash('error', 'Error processing uploads.');
    return res.redirect('back');
  }
}

// ------------------ Validation ------------------
module.exports.validateProfile = (req, res, next) => {
  const { error } = profileSchema.validate(req.body);
  if (error) {
    const msg = error.details.map(el => el.message).join(', ');
    throw new ExpressError(400, msg);
  } else {
    next();
  }
};

module.exports.validatePost = (req, res, next) => {
  const { error } = postSchema.validate(req.body);
  if (error) {
    const msg = error.details.map(el => el.message).join(', ');
    throw new ExpressError(400, msg);
  } else {
    next();
  }
};

// ------------------ Authentication ------------------
module.exports.isLoggedIn = (req, res, next) => {
  if (!req.isAuthenticated()) {
    req.session.redirectUrl = req.originalUrl;
    req.flash('error', 'You must be logged in');
    return res.redirect('/login');
  }
  next();
};

module.exports.storeReturnTo = (req, res, next) => {
  res.locals.redirectUrl = req.session.redirectUrl || "/profiles";
  next();
};

module.exports.saveRedirectUrl = (req, res, next) => {
  if (!req.session.redirectUrl && req.originalUrl !== "/login") {
    req.session.redirectUrl = req.originalUrl;
  }
  next();
};

// ------------------ Ownership Checks ------------------
module.exports.isProfileOwner = async (req, res, next) => {
  const { id } = req.params;
  const profile = await Profile.findById(id);
  if (!profile) {
    req.flash("error", "Profile not found!");
    return res.redirect("/profiles");
  }
  if (!profile.user.equals(req.user._id)) {
    req.flash("error", "You cannot edit someone else’s profile");
    return res.redirect(`/profiles/${id}`);
  }
  next();
};

module.exports.isPostOwner = async (req, res, next) => {
  const { postId } = req.params;
  const post = await Post.findById(postId);
  if (!post) {
    req.flash("error", "Post not found!");
    return res.redirect("/profiles");
  }
  const profile = await Profile.findOne({ user: req.user._id });
  if (!profile || !post.author.equals(profile._id)) {
    req.flash("error", "You do not have permission to do that!");
    return res.redirect(`/profiles/${profile._id}`);
  }
  next();
};

module.exports.isCommentOwner = async (req, res, next) => {
  const { commentId } = req.params;
  const comment = await Comment.findById(commentId);
  if (!comment) {
    req.flash("error", "Comment not found!");
    return res.redirect("/profiles");
  }
  const profile = await Profile.findOne({ user: req.user._id });
  if (!profile || !comment.author.equals(profile._id)) {
    req.flash("error", "You cannot delete someone else’s comment!");
    return res.redirect(`/profiles/${profile._id}`);
  }
  next();
};

module.exports.isQuestionOwner = async (req, res, next) => {
  const question = await Question.findById(req.params.id);
  if (!question) {
    req.flash("error", "Question not found");
    return res.redirect("/questions");
  }

  // Use req.user._id if req.user is Profile, otherwise fetch profile
  const profile = req.user ? req.user : await Profile.findById(req.session.profileId);

  if (!profile || !question.author.equals(profile._id)) {
    req.flash("error", "You are not allowed to do this!");
    return res.redirect(`/questions/${req.params.id}`);
  }
  next();
};


module.exports.isAnswerOwner = async (req, res, next) => {
  const { answerId } = req.params;
  const answer = await Answer.findById(answerId);

  if (!answer) {
    req.flash("error", "Answer not found");
    return res.redirect(`/questions/${req.params.id || ""}`);
  }

  const profile = req.user ? req.user : await Profile.findById(req.session.profileId);

  if (!profile || !answer.author.equals(profile._id)) {
    req.flash("error", "You are not allowed to do this!");
    return res.redirect(`/questions/${answer.question}`);
  }

  next();
};


module.exports.isReplyOwner = async (req, res, next) => {
  const { replyId } = req.params;
  const reply = await Reply.findById(replyId);
  if (!reply) {
    req.flash("error", "Reply not found");
    return res.redirect("/questions");
  }

  const profile = req.user ? req.user : await Profile.findById(req.session.profileId);

  if (!profile || !reply.author.equals(profile._id)) {
    const answer = await Answer.findById(reply.answer);
    const questionId = answer ? answer.question : "";
    req.flash("error", "You are not allowed to do this!");
    return res.redirect(`/questions/${questionId}`);
  }
  next();
};


// ------------------ Exports ------------------
module.exports.uploadFields = uploadFields;
module.exports.processUploads = processUploads;
