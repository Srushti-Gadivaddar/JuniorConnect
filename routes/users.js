const express = require('express');
const router = express.Router({mergeParams: true});
const passport = require("passport");
const { saveRedirectUrl, storeReturnTo } = require("../middleware.js");
const userController = require("../controllers/users.js");
const { isLoggedIn } = require("../middleware.js");

router.get("/leaderboard", async (req, res) => {
  const topProfiles = await Profile.find().sort({ points: -1 }).limit(20);
  res.render("users/leaderboard", { topProfiles });
});


router.post("/save-player-id", isLoggedIn, async (req, res) => {
    try {
        const { subscriptionId, userId } = req.body;

        req.user.oneSignalSubscriptionId = subscriptionId;
        req.user.oneSignalUserId = userId;

        await req.user.save();

        console.log("Player IDs saved for user:", req.user.username);
        res.status(200).json({ success: true });
    } catch (err) {
        console.error("Error saving player ID:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});


router.route("/signup")
.get(userController.RenderSignupForm)
.post(userController.signupLocal);


router.route("/login")
.get(userController.RenderLoginForm)
.post(
    saveRedirectUrl,
    passport.authenticate("local", 
        {failureRedirect: "/login", 
            failureFlash: true 
        }),
    storeReturnTo,
userController.LoginLocal);

//google Autho
router.get("/auth/google/signup", saveRedirectUrl,
  passport.authenticate("google", { 
    scope: ["openid", "profile", "email"],
    prompt: "consent" 
  })
);

router.get("/auth/google/login",
    saveRedirectUrl,
  passport.authenticate("google", { 
      scope: ["openid", "profile", "email"],
      prompt: "select_account"
  })
);


router.get("/auth/google/callback",
    storeReturnTo,
  passport.authenticate("google", { 
      failureRedirect: "/signup",
      failureFlash: true
  }),
  userController.googleCallBack
);



router.get("/logout", userController.logOutUser);

module.exports = router;