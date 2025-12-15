const express = require('express');
const router = express.Router({mergeParams: true});
const wrapAsync = require("../utils/WrapAsync.js");
const {isLoggedIn, isPostOwner, validatePost} = require("../middleware.js");
const PostController = require("../controllers/posts.js");
const multer  = require('multer');
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });


//post routes
router.post("/", validatePost, isLoggedIn, upload.array("postImages", 3), wrapAsync(PostController.createPost));

//post - edit route (render form)
router.get("/:postId/edit", isLoggedIn, isPostOwner, wrapAsync(PostController.RenderPostEditForm));

//post - edit  //post - delete
router.route("/:postId")
.put(validatePost,isLoggedIn, isPostOwner, upload.array("postImages", 3), wrapAsync(PostController.editPost))
.delete(isLoggedIn,isPostOwner, wrapAsync(PostController.deletePost));

//like route
router.post("/:postId/like", isLoggedIn, wrapAsync(PostController.likePost));

module.exports = router;