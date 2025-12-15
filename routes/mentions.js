const express = require("express");
const router = express.Router(); // merge params to get :id (questionId)
const Mention = require("../models/mentions");
const { isLoggedIn, processUploads, isQuestionOwner } = require("../middleware");

router.get("/mentions", isLoggedIn, async (req, res) => {
    const mentions = await Mention.find({ mentionedUser: req.user._id })
        .populate("mentionedBy", "name")
        .sort({ createdAt: -1 });

    res.render("mentions/mention", { mentions });
});

module.exports = router;
