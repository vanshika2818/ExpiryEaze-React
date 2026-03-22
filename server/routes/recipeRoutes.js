const express = require('express');
const router = express.Router();
const { generateRecipe, chatWithChef } = require('../controllers/recipeController');

// @route   POST /api/v1/recipes/generate
// @desc    Generate a recipe using AI and find YouTube video
// @access  Public (or Private depending on your auth middleware setup)
router.post('/generate', generateRecipe);
router.post('/chat', chatWithChef);

module.exports = router;
