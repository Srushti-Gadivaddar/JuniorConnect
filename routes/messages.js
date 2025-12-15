const express = require("express");
const router = express.Router();
const Message = require("../models/messages");
const { isLoggedIn } = require("../middleware");
const multer = require("multer");
const { storage } = require("../cloudConfig.js"); 
const upload = multer({ storage });
const User = require("../models/users");



// OPEN CHAT PAGE
router.get("/chat/:receiverId", isLoggedIn, async (req, res) => {
  const receiverId = req.params.receiverId;

  await Message.updateMany(
    { sender: receiverId, receiver: req.user._id },
    { $set: { isRead: true } }
  );

  const messages = await Message.find({
    $or: [
      { sender: req.user._id, receiver: receiverId },
      { sender: receiverId, receiver: req.user._id }
    ]
  })
  .sort({ createdAt: 1 })
  .populate("sender");

  const user = await User.findById(receiverId);

  res.render("messages/chats", { messages, user, currentUser: req.user });
});



// SEND MESSAGE (TEXT + IMAGES/FILES)
// SEND MESSAGE
router.post("/chat/:receiverId", isLoggedIn, upload.array("attachments"), async (req, res) => {
  try {

    const sender = await User.findById(req.user._id);
    const receiver = await User.findById(req.params.receiverId);

    //  If receiver blocked sender
    if (receiver.blockedUsers.includes(sender._id)) {
      return res.status(403).json({ error: "You are blocked by this user." });
    }

    //  If sender blocked receiver
    if (sender.blockedUsers.includes(receiver._id)) {
      return res.status(403).json({ error: "You blocked this user." });
    }

    const attachments = req.files.map(f => ({
      url: f.path,
      type: f.mimetype.startsWith("image") ? "image" : "file"
    }));

    const newMessage = new Message({
      sender: req.user._id,
      receiver: req.params.receiverId,
      content: req.body.content,
      attachments
    });

    await newMessage.save();

    const populatedMsg = await newMessage.populate("sender");

    const io = req.app.get("io");
    const room = [req.user._id.toString(), req.params.receiverId].sort().join("_");

    io.to(room).emit("receiveMessage", populatedMsg);
    
    
    res.json(populatedMsg);

  } catch (err) {
    console.log(err);
    res.status(500).json({ error: "Failed to send message" });
  }
});


// Block user
router.post("/block/:userId", isLoggedIn, async (req, res) => {
    const currentUser = await User.findById(req.user._id);

    if (!currentUser.blockedUsers.includes(req.params.userId)) {
        currentUser.blockedUsers.push(req.params.userId);
    }

    await currentUser.save();
    res.json({ success: true });
});

// Unblock user
router.post("/unblock/:userId", isLoggedIn, async (req, res) => {
    const currentUser = await User.findById(req.user._id);

    currentUser.blockedUsers = currentUser.blockedUsers.filter(
        id => id.toString() !== req.params.userId
    );

    await currentUser.save();
    res.json({ success: true });
});


// DELETE A MESSAGE
router.delete("/delete/:id", isLoggedIn, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ error: "Message not found" });

    // Only sender can delete
    if (msg.sender.toString() !== req.user._id.toString())
      return res.status(403).json({ error: "Not authorized" });

    await Message.findByIdAndDelete(req.params.id);

    req.app.get("io").emit("messageDeleted", { msgId: req.params.id });

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete message" });
  }
});


// DELETE SINGLE ATTACHMENT
router.delete("/delete-attachment/:msgId/:index", isLoggedIn, async (req, res) => {
  try {
    const { msgId, index } = req.params;
    const msg = await Message.findById(msgId);

    if (!msg) return res.status(404).json({ error: "Message not found" });

    if (msg.sender.toString() !== req.user._id.toString())
      return res.status(403).json({ error: "Not authorized" });

    msg.attachments.splice(index, 1);
    await msg.save();

    req.app.get("io").emit("attachmentDeleted", { msgId, index });

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete attachment" });
  }
});


// DELETE ALL ATTACHMENTS
router.delete("/delete-all-attachments/:msgId", isLoggedIn, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.msgId);

    if (!msg) return res.status(404).json({ error: "Message not found" });

    if (msg.sender.toString() !== req.user._id.toString())
      return res.status(403).json({ error: "Not authorized" });

    msg.attachments = [];
    await msg.save();

    req.app.get("io").emit("attachmentDeletedAll", { msgId: req.params.msgId });

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete attachments" });
  }
});


module.exports = router;
