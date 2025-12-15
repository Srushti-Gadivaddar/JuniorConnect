// routes/search.js
const express = require('express');
const router = express.Router();
const Profile = require('../models/profiles'); // adjust path
const Question = require('../models/questions'); // adjust path

// GET /api/search-index
router.get('/search-index', async (req, res) => {
  try {
    // fetch only necessary fields to keep payload small
    const profiles = await Profile.find({}, {
      _id: 1, name: 1, username: 1, branch: 1, role: 1, profile_pic: 1
    }).lean();

    const questions = await Question.find({}, {
      _id: 1, title: 1, body: 1, tags: 1, author: 1, createdAt: 1
    }).populate('author', 'name _id').lean();

    // normalize index entries so Fuse can search across types
    const index = [];

    profiles.forEach(p => {
      index.push({
        id: String(p._id),
        type: 'profile',
        name: p.name || '',
        username: p.username || '',
        branch: p.branch || '',
        role: p.role || '',
        avatar: p.profile_pic?.url || '',
        url: `/profiles/${p._id}`
      });
    });

    questions.forEach(q => {
      index.push({
        id: String(q._id),
        type: 'question',
        title: q.title || '',
        body: q.body || '',
        tags: (q.tags || []).join(' '),
        authorName: q.author?.name || '',
        url: `/questions/${q._id}`
      });
    });

    res.json({ success: true, index });
  } catch (err) {
    console.error('search-index err', err);
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
