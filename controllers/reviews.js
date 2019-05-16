const { validationResult } = require('express-validator/check')

const Book = require('../models/book')
const Review = require('../models/review')

exports.postAddReview = async (req, res, next) => {
    const review = req.body.reviewText
    const rating = Number(req.body.rating)
    const bookId = req.body.bookId
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.redirect("/book/" + bookId)
    }
    
    const reviewData = new Review({
      text: review,
      rating: rating,
      bookId: bookId,
      userId: req.user._id
    })

    try {
      savedReview = await reviewData.save()
      const book = await Book.findById(bookId)
      if(!book) {
        res.redirect("back")
      }
      book.reviewsId.push(savedReview._id)
      await book.save()
      req.flash('success', 'Your review has been added successfully')
      res.redirect(`/book/${bookId}`)
    }
    catch(err) {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    }
    
}

exports.postEditReview = async (req, res, next) => {
    const updatedText = req.body.reviewText
    const updatedRating = Number(req.body.rating)
    const bookId = req.body.bookId
    const reviewId = req.body.reviewId
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.flash('success', 'Your review was not edited.')
      return res.redirect("/book/" + bookId)
    }
    try {
      const foundReview = await Review.findById(reviewId)
      if(foundReview.userId.toString() !== req.user._id.toString()) return res.redirect('/')
      foundReview.text = updatedText
      foundReview.rating = updatedRating
      await foundReview.save()
      const book = await Book.findById(bookId)
      if(!book) {
        return res.redirect("back")
      }
      await book.save()
      req.flash('success', 'Your review has been edited successfully')
      res.redirect(`/book/${bookId}`)
    }
    catch(err) {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    }
}

exports.getEditReview = async (req, res, next) => {
  try {
    const bookId = req.params.bookId
    const reviewId = req.params.reviewId
    const book = await Book.findById(bookId)
    const review = await Review.findById(reviewId)
  
    if(review.userId.toString() !== req.user._id.toString()) return res.redirect('/')
  
    res.render('book/book-review', {
      pageTitle: book.title,
      path: '/books',
      book: book,
      review: review
      });
  } catch(err) {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
  }
}


exports.postDeleteReview = async (req, res, next) => {
  try {
    const bookId = req.params.bookId
    const reviewId = req.params.reviewId
    await Review.deleteOne({_id: reviewId})
    await Book.findById(bookId).updateOne({$pull: {reviewsId: reviewId}})
    req.flash('success', 'Your review has been edited successfully')
    res.redirect("/book/" + bookId)
  } catch(err) {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
  }
}
