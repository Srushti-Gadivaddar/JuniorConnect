const User = require("../models/users.js");

module.exports.RenderSignupForm = (req, res) => {
    res.render("users/signup.ejs");
}

module.exports.signupLocal = async (req, res) => {
    try {
        let { username, email, password } = req.body;
        // Normalize username
        username = username.toLowerCase().trim().replace(/ /g, "_");
        const user = new User({ username, email });
        const registeredUser = await User.register(user, password);


        req.login(registeredUser, (err) => {
            if (err) return next(err);
            req.flash("success", "Welcome to JuniorConnect!");
            res.redirect("/profiles");
        });

    } catch (e) {
        req.flash("error", e.message);
        res.redirect("/signup");
    }
};

module.exports.RenderLoginForm = (req, res) => {
    res.render("users/login.ejs");
};

module.exports.LoginLocal = async(req, res) => {
        req.flash("success", "Welcome back!");
        res.redirect(res.locals.redirectUrl);
};

module.exports.googleCallBack = (req, res) => {
      req.flash("success", "Welcome back!");
      res.redirect(res.locals.redirectUrl);
};

module.exports.logOutUser = (req, res, next) => {
    req.logout(function(err) {
        if (err) {
            return next(err);
        };

        req.flash("success", "Logged out successfully!");
        res.redirect("/profiles");
    });
};