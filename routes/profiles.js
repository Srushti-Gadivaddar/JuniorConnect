const express = require('express');
const router = express.Router();
const wrapAsync = require("../utils/WrapAsync.js");
const {isLoggedIn, isProfileOwner, validateProfile} = require("../middleware.js");
const  profileController  = require("../controllers/profiles.js");
const multer  = require('multer');
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });

//profiles - index route //profiles - create route
router.route("/")
.get(wrapAsync(profileController.index))
.post(validateProfile, upload.single('profile[profile_pic]'), wrapAsync(profileController.createProfile));


// Profiles - create route(render form)
router.get("/new", isLoggedIn, profileController.RenderNewForm);

//profiles - show route  //profiles - Update route //profiles - Delete route
router.route("/:id")
.get(wrapAsync(profileController.showProfiles))
.put(validateProfile, isLoggedIn , isProfileOwner, upload.single('profile[profile_pic]'), wrapAsync(profileController.editProfile))
.delete(isLoggedIn, isProfileOwner, wrapAsync(profileController.deleteProfile));

//profiles - edit route(render form)
router.get("/:id/edit", isLoggedIn , isProfileOwner, wrapAsync(profileController.editProfileForm));

module.exports = router;

