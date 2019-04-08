const express = require("express");

const bookController = require("../controllers/book");

const router = express.Router();

router.get("/books", bookController.getBooks);

router.get("/book/:bookId", bookController.getBook)

router.get("/add-book", bookController.getAddBook);

router.post("/add-book", bookController.postBook);

router.get('/edit-book/:bookId', bookController.getEditBook)

router.post('/edit-book/:bookId', bookController.postEditBook)

router.post('/book/:bookId/add-review', bookController.postReview)

router.post('/delete-book/:bookId', bookController.postDeleteBook)

module.exports = router;

