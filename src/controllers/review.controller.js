const { Review } = require("../models/review.model");

async function createReview(req, res, next) {
  try {
    const { productId, rating, comment } = req.body;
    const userId = req.user.id;
    const newReview = await Review.create({
      productId,
      userId,
      rating,
      comment,
    });

    res.status(201).json({ ok: true, data: newReview });
  } catch (err) {
    next(err);
  }
}

async function getReviewsByProduct(req, res, next) {
  try {
    const { productId } = req.params;
    const reviews = await Review.findByProduct(productId);
    res.json({ ok: true, data: reviews });
  } catch (err) {
    next(err);
  }
}

module.exports = { createReview, getReviewsByProduct };
