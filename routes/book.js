const express = require("express");
const { body } = require('express-validator/check');

const bookController = require("../controllers/book");

const reviewController = require('../controllers/reviews')
const isAuth = require('../middleware/is-auth')

const router = express.Router();

router.get('/', bookController.getIndex )

router.get("/about", bookController.getAboutPage)

router.get("/books", bookController.getBooks);

router.get("/book/:bookId", bookController.getBook)

router.get("/book/download/:bookId", bookController.downloadBook)

router.get("/add-book/hardcopy", isAuth, bookController.getAddBookHardCopy);

router.post("/add-hardcopy", isAuth, [
    body('title', 'Please provide a valid book title with at least 2 characters')
        .isLength({min: 2}),
    body('description', 'Book description must be atleast 20 characters')
        .isLength({min: 20}),
    body('image')
        .custom((value, { req }) => {
            if(!req.files.image) {
                return Promise.reject('No image file was provided');
            }
            const fileType = req.files.image[0].originalname.split(".")[req.files.image[0].originalname.split(".").length - 1].toLowerCase()
            if(fileType !== "png" && fileType !== "jpeg" && fileType !== "jpg") {
                return Promise.reject("Must be an image file")
            }
            return true
        }),
    body('location')
        .custom(value => {
            if(value === "null") {
                return Promise.reject("Please select one of the given options")
            }
            return true
        })
], bookController.postBookHardCopy);

router.get("/add-book/pdf", isAuth, bookController.getAddBookPdf);

router.post("/add-pdf", isAuth, [
    body('title', 'Please provide a valid book title with at least 2 characters')
        .isLength({min: 2}),
    body('description', 
        'Book description must be atleast 20 characters')
        .isLength({min: 20}),
    body('image')
        .custom((value, { req }) => {
            if(!req.files.image) {
                return Promise.reject('No image file was provided');
            }
            const fileType = req.files.image[0].originalname.split(".")[req.files.image[0].originalname.split(".").length - 1].toLowerCase()
            if(fileType !== "png" && fileType !== "jpeg" && fileType !== "jpg") {
                return Promise.reject("Must be an image file")
            }
            return true
        }),
    body("pdf")
        .custom((value, { req }) => {
            if(!req.files.pdf) {
                return Promise.reject('No pdf file was provided');
            }
            const fileType = req.files.pdf[0].originalname.split(".")[req.files.pdf[0].originalname.split(".").length - 1].toLowerCase()
            if(fileType !== "pdf") {
                return Promise.reject("Must be a pdf file")
            }
            return true
        })
  ] ,  bookController.postBookPdf);

router.get('/edit-hardcopy/:bookId', isAuth, bookController.getEditBookHardCopy)

router.get("/edit-pdf/:bookId", isAuth, bookController.getEditBookPdf);

router.post('/edit-hardcopy/:bookId', isAuth, [
    body('title', 'Please provide a valid book title with at least 2 characters')
    .isLength({min: 2}),
    body('description', 'Book description must be atleast 20 characters')
        .isLength({min: 20}),
    body('image')
        .custom((value, { req }) => {
            if(req.files.image) {
                const fileType = req.files.image[0].originalname.split(".")[req.files.image[0].originalname.split(".").length - 1].toLowerCase()
                if(fileType !== "png" && fileType !== "jpeg" && fileType !== "jpg") {
                    return Promise.reject("Must be an image file")
                }    
            }
            return true
        }),
    body('location')
        .custom(value => {
            if(value === "null") {
                return Promise.reject("Please select one of the given options")
            }
            return true
        })
], bookController.postEditBookHardCopy)

router.post('/edit-pdf/:bookId', isAuth, [
    body('title', 'Please provide a valid book title with at least 2 characters')
        .isLength({min: 2}),
    body('description','Book description must be atleast 20 characters')
        .isLength({min: 20}),
    body('image')
        .custom((value, { req }) => {
            if(req.files.image) {
                const fileType = req.files.image[0].originalname.split(".")[req.files.image[0].originalname.split(".").length - 1].toLowerCase()
                if(fileType !== "png" && fileType !== "jpeg" && fileType !== "jpg") {
                    return Promise.reject("Must be an image file")
                }    
            }
            return true
        }),
    body("pdf")
        .custom((value, { req }) => {
            if(req.files.pdf) {
                const fileType = req.files.pdf[0].originalname.split(".")[req.files.pdf[0].originalname.split(".").length - 1].toLowerCase()
                if(fileType !== "pdf") {
                    return Promise.reject("Must be a pdf file")
                }                
            }
            return true 
        })
], isAuth, bookController.postEditBookPdf)

router.post('/book/:bookId/add-review', isAuth, [
    body("reviewText", "Your review test must be at least two characters.")
        .isLength({min: 2})
], isAuth, reviewController.postAddReview)

router.post('/book/:bookId/edit-review', isAuth, [
    body("reviewText", "Your review test must be at least two characters.")
        .isLength({min: 2})
] , reviewController.postEditReview)

router.post('/book/:bookId/:reviewId/delete-review', isAuth, reviewController.postDeleteReview)

router.get('/book/:bookId/:reviewId/edit-review', isAuth, reviewController.getEditReview)

router.post('/delete-book/:bookId', isAuth, bookController.postDeleteBook)

router.post('/inquiry/:bookId', isAuth, bookController.postEnquiryMessage )

module.exports = router;

