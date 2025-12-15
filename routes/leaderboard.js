const express = require("express");
const router = express.Router();
const Profile = require("../models/profiles.js");

router.get("/", async (req, res) => {
  try {
    const profiles = await Profile.find({})
      .sort({ points: -1 })  // highest first
      .limit(50)
      .lean();

    res.render("leaderboards/leaderboard", { profiles });
  } catch (err) {
    console.error("Leaderboard Error:", err);
    req.flash("error", "Please try again!");
    res.redirect("/questions");
  }
});

module.exports = router;
