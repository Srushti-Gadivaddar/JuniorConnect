const axios = require("axios");
const User = require("../models/users");

const APP_ID = process.env.ONESIGNAL_APP_ID;
const API_KEY = process.env.ONESIGNAL_API_KEY;

async function sendToAll(title, message, url = "/") {
  try {
    const response = await axios.post(
      "https://api.onesignal.com/notifications",
      {
        app_id: APP_ID,
        included_segments: ["Total Subscriptions"],
        headings: { en: title },
        contents: { en: message },
        url
      },
      {
        headers: {
          Authorization: `Basic ${API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("SendToAll OK:", response.data);
  } catch (err) {
    console.log("SendToAll ERROR:", err.response?.data || err);
  }
}

module.exports = {
  // SEND TO SPECIFIC USER
  sendToUser: async ({ title, message, url, userId }) => {
    try {
      const user = await User.findById(userId);
      if (!user || !user.oneSignalSubscriptionId) return;

      await axios.post(
        "https://api.onesignal.com/notifications",
        {
          app_id: APP_ID,
          include_subscription_ids: [user.oneSignalSubscriptionId],
          headings: { en: title },
          contents: { en: message },
          url
        },
        {
          headers: {
            Authorization: `Basic ${API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (err) {
      console.log("SendToUser ERROR:", err.response?.data || err);
    }
  },

  // WELCOME
  sendWelcome: (username) =>
    sendToAll("Welcome 🎉", `Hey ${username}, welcome to JuniorConnect!`, "/profiles"),

  // NEW QUESTION
  newQuestion: (title, questionId, username) =>
    sendToAll("New Question Posted!", `${username} asked: ${title}`, `/questions/${questionId}`),

  // NEW ANSWER
  newAnswer: (questionTitle, questionId, username) =>
    sendToAll("New Answer Received!", `${username} answered: ${questionTitle}`, `/questions/${questionId}`),

  // NEW REPLY
  newReply: (questionId, username) =>
    sendToAll("New Reply!", `${username} replied to a discussion`, `/questions/${questionId}`),

  // NEW COMMENT
  newComment: (questionId, username) =>
    sendToAll("New Comment!", `${username} commented on a post`, `/questions/${questionId}`),

  // NEW LIKE
  newLike: (questionId, username) =>
    sendToAll("New Like ❤️", `${username} liked a post`, `/questions/${questionId}`),

  // MENTION NOTIFICATION
  sendMention: async (username, questionId, subscriptionId) => {
    try {
      await axios.post(
        "https://api.onesignal.com/notifications",
        {
          app_id: APP_ID,
          include_subscription_ids: [subscriptionId],
          headings: { en: "You were mentioned!" },
          contents: { en: `${username} mentioned you in an answer` },
          url: `/questions/${questionId}`
        },
        {
          headers: {
            Authorization: `Basic ${API_KEY}`,
            "Content-Type": "application/json",
          },
        }
      );
    } catch (err) {
      console.log("Mention Notification ERROR:", err.response?.data || err);
    }
  }
};
