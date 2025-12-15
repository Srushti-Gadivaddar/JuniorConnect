const express = require("express");
const router = express.Router();
const OpenAI = require("openai");
const client = new OpenAI({ apiKey: process.env.OPENAI_KEY });

router.post("/generate-answer", async (req, res) => {
  try {
    const { question, details } = req.body;

    const prompt = `
The user asked a technical question:

Title: ${question}
Details: ${details}

Write a clear, correct, helpful answer for a student-level engineering platform.
Don't add introductions, just the answer.
    `;

    const aiRes = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 300
    });

    res.json({
      success: true,
      answer: aiRes.choices[0].message.content
    });
  } catch (err) {
    console.log(err);
    res.json({ success: false, msg: "AI error" });
  }
});

module.exports = router;
