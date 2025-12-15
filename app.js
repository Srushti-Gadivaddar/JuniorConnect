if(process.env.NODE_ENV !== "production"){
    require('dotenv').config();
}

const express = require("express");
const app = express();
const http = require("http");
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);
app.set("io", io);

const mongoose = require('mongoose');
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const ExpressError = require("./utils/ExpressError.js");
const session = require("express-session");
const flash = require("connect-flash");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require("./models/users.js");
const MongoStore = require('connect-mongo');

app.set("io", io);
//routes
const profilesRoutes = require("./routes/profiles.js");
const PostsRoutes = require("./routes/posts.js");
const CommentsRoutes = require("./routes/comments.js");
const UsersRoutes = require("./routes/users.js");
const QuestionRoutes = require("./routes/questions.js");
const answerRoutes = require("./routes/answers.js");
const replyRoutes = require("./routes/replies.js");
const messageRoutes = require("./routes/messages.js");
const mentionRoutes = require("./routes/mentions.js");
const aiRoutes = require("./routes/ai");
const leaderboardRoutes = require('./routes/leaderboard');
const searchRoutes = require('./routes/search');
// const authRouter = require("./routes/auth.js");



const port = 8080;
const path = require("path");
// const MONGO_URL = 'mongodb://127.0.0.1:27017/EngineerLand';


app.set("view engine", "ejs");
app.engine('ejs', ejsMate);
app.set("views", path.join(__dirname, "views"));
app.use(express.static(path.join(__dirname, "public")));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));


const dbUrl = process.env.ATLASDB_URL;
main().then(() => {
    console.log("Mongo DB is connected");
}).catch((err) => {
    console.log(err);
});


async function main() {
  await mongoose.connect(dbUrl);
}

//express -session implemention
app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7,
        httpOnly: true
    }
}));

// const store = MongoStore.create({
//     mongoUrl: dbUrl,
//     crypto: {
//     secret: process.env.SECRET
//     },
//     touchAfter: 24 * 3600,
// });


// store.on("error", (err) => {
//     console.log("ERROR IN MONGO SESSION STORE", err);
// });


// const sessionOptions = {
//     store,
//     secret: process.env.SECRET,
//     resave: false,
//     saveUninitialized: true,
//     cookie: {
//         expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
//         maxAge: 7 * 24 * 60 * 60 * 1000,
//     }
// };


// app.use(session(sessionOptions));
app.use(flash());

app.use(passport.initialize()); //passport init before usage
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "http://localhost:8080/auth/google/callback"
    },

    async (accessToken, refreshToken, profile, done) => {
      try {
        if (!profile.emails || profile.emails.length === 0) {
          return done(new Error("Google account has no email associated."));
        }

        const email = profile.emails[0].value;

        let existingUser = await User.findOne({ googleId: profile.id });

        if (existingUser) {
          return done(null, existingUser);
        }

        let existingEmailUser = await User.findOne({ username: email });
        if (existingEmailUser) {
          return done(
            new Error(
              "This email is already registered. Please login with password."
            )
          );
        }

        const newUser = new User({
          username: email,
          googleId: profile.id,
          name: profile.displayName
        });

        await newUser.save();

        const Profile = require("./models/profiles");
        const newProfile = new Profile({
          name: profile.displayName,
          user: newUser._id,
          bio: "Hello! I am new here "
        });

        await newProfile.save();

        return done(null, newUser);

      } catch (err) {
        console.error("Google Auth Error:", err);
        return done(err);
      }
    }
  )
);
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());


app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    res.locals.success = req.flash("success");
    res.locals.error = req.flash("error");
    next();
});

app.get("/", (req, res) => {
    res.render("MainUI/landingPage.ejs");
});

//profiles routes would go here
app.use("/profiles", profilesRoutes);
app.use("/profiles/:id/posts", PostsRoutes);
app.use("/profiles/:id/posts/:postId/comments", CommentsRoutes);
app.use("/", UsersRoutes);
app.use("/questions", QuestionRoutes);
app.use("/questions/:questionId/answers", answerRoutes);
app.use("/questions/:questionId/answers/:answerId/replies", replyRoutes);
app.use("/messages", messageRoutes);
app.use("/", mentionRoutes);
app.use("/ai", aiRoutes);
app.use("/leaderboard", leaderboardRoutes);
app.use('/api', searchRoutes);

// app.use('/', authRouter);


const onlineUsers = new Map(); // track online sockets per user

io.on("connection", (socket) => {

    // Track online user
    socket.on("join", ({ userId }) => {
        if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
        onlineUsers.get(userId).add(socket.id);
        socket.userId = userId;
    });

    // Join private room (two-user chat)
    socket.on("joinRoom", ({ sender, receiver }) => {
        const room = [sender, receiver].sort().join("_");
        socket.join(room);
        socket.room = room;
    });

    // Send message to room
    socket.on("sendMessage", (msg) => {
        // emit to room
        io.to(socket.room).emit("receiveMessage", msg);

        // emit to online user directly
        const receiverSockets = onlineUsers.get(String(msg.receiver));
        if (receiverSockets) {
            receiverSockets.forEach(sid => io.to(sid).emit("new_message", msg));
        }
    });

    socket.on("disconnect", () => {
        const userId = socket.userId;
        if (userId && onlineUsers.has(userId)) {
            onlineUsers.get(userId).delete(socket.id);
            if (onlineUsers.get(userId).size === 0) onlineUsers.delete(userId);
        }
    });
});


//page not found
app.all(/.*/, (req, res, next) => {
    next(new ExpressError(404, "Page Not Found!"))
});

//error handler
app.use((err, req, res, next) => {
    let {statusCode = 500, message = "Something went wrong!!"} = err;
    res.status(statusCode).render("Error.ejs", {statusCode, message});
});


server.listen(port, () => {
    console.log(`Server running on port ${port}`);
});