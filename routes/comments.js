const express = require("express");
const router = express.Router({mergeParams: true});
const wrapAsync = require("../utils/WrapAsync.js");
const {isLoggedIn, isCommentOwner} = require("../middleware.js");
const CommentController = require("../controllers/comments.js");


// Add comment
router.post("/", isLoggedIn, wrapAsync(CommentController.addComment));

// Render comment edit form
router.get("/:commentId/edit", isLoggedIn, isCommentOwner, wrapAsync(CommentController.editCommentForm));

//comments update route  //delete comment route
router.route("/:commentId")
.put(isLoggedIn, isCommentOwner, wrapAsync(CommentController.editComment))
.delete(isLoggedIn, isCommentOwner, wrapAsync(CommentController.deleteComment));

module.exports = router;

