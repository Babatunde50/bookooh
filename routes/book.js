const express = require("express");

const bookController = require("../controllers/book");

const reviewController = require('../controllers/reviews')
const isAuth = require('../middleware/is-auth')

const router = express.Router();

router.get("/books", bookController.getBooks);

router.get("/book/:bookId", bookController.getBook)

router.get("/add-book", isAuth, bookController.getAddBook);

router.post("/add-book", isAuth, bookController.postBook);

router.get('/edit-book/:bookId', isAuth, bookController.getEditBook)

router.post('/edit-book/:bookId', isAuth, bookController.postEditBook)

router.post('/book/:bookId/add-review', isAuth, reviewController.postAddReview)

router.post('/book/:bookId/edit-review', isAuth, reviewController.postEditReview)

router.post('/book/:bookId/:reviewId/delete-review', isAuth, reviewController.postDeleteReview)

router.get('/book/:bookId/:reviewId/edit-review', isAuth, reviewController.getEditReview)

router.post('/delete-book/:bookId', isAuth, bookController.postDeleteBook)

module.exports = router;

