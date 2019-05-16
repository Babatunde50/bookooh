const fs = require("fs")

const Nexmo = require('nexmo')
//const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding")
//const geocodingClient = mbxGeocoding({ accessToken: 'pk.eyJ1IjoiYmFiYXR1bmRlNTAiLCJhIjoiY2p2OXdleTl2MGZibDRlcW15cG5raWludCJ9.tPMSVi86muRBzc07nERijQ'})
const { validationResult } = require('express-validator/check')

const Book = require('../models/book')
const User = require('../models/user')
const Review = require('../models/review')
const fileHelper = require('../util/file-helper')
const coordinates = require("../maps")

exports.getIndex = async (req, res, next) => {
  let message = req.flash('success')
  if(message.length > 0) {
      message = message[0]
  } else {
      message = null
  }
  try {
    const books = await Book.find()
                  .limit(3).sort({ updatedAt: -1 }).populate('userId').exec()
    res.render('home', {
      pageTitle: 'Bookooh',
      path: '/',
      books: books,
      successMessage: message
    });
  } catch (err) {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
  }
}

exports.getBooks = async (req, res, next) => {
  let message = req.flash('success')
  if(message.length > 0) {
      message = message[0]
  } else {
      message = null
  }
  const page = +req.query.page || 1
  const ITEM_PER_PAGE = 6
  let totalBooks
  let books
  let notFound
  try {
    if(req.query.search) {
      const regex = new RegExp(escapeRegex(req.query.search), 'gi')
      totalBooks = await Book.find({title: regex}).countDocuments()
      books = await Book.find({title: regex})
                .skip((page - 1) * ITEM_PER_PAGE)
                .limit(ITEM_PER_PAGE)
                .sort({ updatedAt: -1 })
                .populate('userId').exec()
      if(totalBooks <= 0) {
        notFound = `No book named ${req.query.search} found`
      }
    } else {
      totalBooks = await Book.find().countDocuments()
      books = await Book.find()
                  .skip((page - 1) * ITEM_PER_PAGE)
                  .limit(ITEM_PER_PAGE)
                  .sort({ updatedAt: -1 })
                  .populate('userId').exec()
    }
    res.render('book/book-list', {
      pageTitle: 'Books',
      path: '/books',
      books: books,
      notFound: notFound,
      showPagination: totalBooks > ITEM_PER_PAGE,
      successMessage: message,
      currentPage: page,
      hasNextPage: ITEM_PER_PAGE * page < totalBooks,
      hasPreviousPage: page > 1,
      nextPage: page + 1,
      previousPage: page - 1,
      lastPage: Math.ceil(totalBooks / ITEM_PER_PAGE)
    });
  } catch (err) {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
  }


};

exports.getBook = async (req, res, next) => {
  let message = req.flash('success')
  if(message.length > 0) {
      message = message[0]
  } else {
      message = null
  }
  const bookId = req.params.bookId
  let hasReview = false
  let ownedBook = false
  let review = null
  const loggedInUser = req.session.isLoggedIn ? req.user._id.toString() : null
  try {
    const book = await Book.findOne({
      _id: bookId
    }).populate('userId').populate("reviewsId").exec()
    const reviews = await Review.find({
      bookId: book._id
    }).populate('userId').exec()
    const averageRatings = await Review.aggregate([{
        $match: {
          _id: {
            $in: book.reviewsId
          }
        }
      },
      {
        $group: {
          _id: book._id,
          average: {
            $avg: '$rating'
          }
        }
      }
    ])
    if (req.session.isLoggedIn) {
      const userReviewIndex = book.reviewsId.findIndex(review => review.userId.toString() === req.user._id.toString())
      review = book.reviewsId[userReviewIndex]
      hasReview = userReviewIndex >= 0
      ownedBook = req.user._id.toString() === book.userId._id.toString()
    }
    if (averageRatings.length < 1) {
      book.averageRatings = 0
    } else {
      book.averageRatings = (averageRatings[0].average).toFixed(1)
    }
    await book.save()
    res.render('book/book', {
      pageTitle: book.title,
      path: '/books',
      book: book,
      reviews: reviews,
      ownedBook: ownedBook,
      hasReview: hasReview,
      review: review,
      successMessage: message,
      loggedInUser: loggedInUser
    });
  } catch (err) {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
  }
}

exports.downloadBook = async (req, res, next) => {
  try {
    const bookId = req.params.bookId
    const foundBook = await Book.findById(bookId)
    const bookName = foundBook.title
    const bookPath = foundBook.pdf
    foundBook.downloads = foundBook.downloads + 1
    await foundBook.save()
    const file = fs.ReadStream(bookPath)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', 'attachment; filename="' + bookName + '.pdf"' )
    file.pipe(res)
  } catch(err) {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
  }
  
}

exports.getAddBookHardCopy = (req, res, next) => {
  res.render('book/add-book-hardcopy', {
    pageTitle: 'Add Book',
    path: '/books/add-book',
    editing: false,
    oldInput: {
      title: '',
      description: '',
      location: ''
    },
    validationErrors: []
  });
}

exports.postBookHardCopy = async (req, res, next) => {
  const title = req.body.title
  const description = req.body.description
  const location = req.body.location
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render('book/add-book-hardcopy', {
      pageTitle: 'Add Book',
      path: '/books/add-book',
      editing: false,
      oldInput: {
          title: title,
          description: description,
          location: location
      },
      validationErrors: errors.array()
    });
  }
  const image = req.files.image[0].path
  const coord = coordinates[location.split(" ")[0]]
try {  
    const book = new Book({
      title: title,
      image: image,
      type: "hard-copy",
      enquiriesNumber: 0,
      description: description,
      userId: req.user._id,
      location: location,
      coordinates: coord,
      averageRatings: 0
    })
    savedBook = await book.save()
    const user = await User.findById(req.user._id)
    if (!user) {
      res.redirect('/login')
    }
    user.booksId.push(savedBook._id)
    await user.save()
    req.flash("success", "The book was added successfully")
    res.redirect('/books')
  } catch (err) {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
  }

}


exports.getAddBookPdf = (req, res, next) => {
  res.render('book/add-book-pdf', {
    pageTitle: 'Add Book',
    path: '/books/add-book',
    editing: false,
    oldInput: {
      title: '',
      description: ''
    },
    validationErrors: []
  });
}

exports.postBookPdf = async (req, res, next) => {
  const title = req.body.title
  const description = req.body.description
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render('book/add-book-pdf', {
      pageTitle: 'Add Book',
      path: '/books/add-book',
      editing: false,
      oldInput: {
          title: title,
          description: description
      },
      validationErrors: errors.array()
    });
  }
  const pdf = req.files.pdf[0].path
  const image = req.files.image[0].path

try {  
    const book = new Book({
      title: title,
      type: "pdf",
      image: image,
      pdf: pdf,
      description: description,
      userId: req.user._id,
      averageRatings: 0,
      downloads: 0
    })
    savedBook = await book.save()
    const user = await User.findById(req.user._id)
    if (!user) {
      res.redirect('/login')
    }
    user.booksId.push(savedBook._id)
    await user.save()
    req.flash("success", "The book was added successfully")
    res.redirect('/books')
  } catch (err) {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
  }

}

exports.getEditBookHardCopy = async (req, res, next) => {
  const bookId = req.params.bookId
  try {
    const book = await Book.findById({
      _id: bookId
    })
    if(book.userId.toString() !== req.user._id.toString()) return res.redirect('/')
  res.render('book/add-book-hardcopy', {
    pageTitle: 'Add Books',
    path: '/books/add-book',
    editing: true,
    oldInput: {
      title: '',
      description: '',
      location: ''
    },
    validationErrors: [],
    book: book
      });
  } catch (err) {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
  }    
}

exports.getEditBookPdf = async (req, res, next) => {
  const bookId = req.params.bookId
  try {
    const book = await Book.findById({
      _id: bookId
    })
    if(book.userId.toString() !== req.user._id.toString()) return res.redirect('/')
  res.render('book/add-book-pdf', {
    pageTitle: 'Add Books',
    path: '/books/add-book',
    editing: true,
    oldInput: {
      title: '',
      description: ''
    },
    validationErrors: [],
    book: book
      });
  } catch (err) {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
  }
}

exports.postEditBookHardCopy = async (req, res, next) => {
  const bookId = req.params.bookId
  const updatedTitle = req.body.title
  const updatedDescription = req.body.description
  const updatedLocation = req.body.location
  const updatedStatus = req.body.available === "true"
  const coord = coordinates[updatedLocation.split(" ")[0]]
  const errors = validationResult(req);
  try {
    const book = await Book.findById({
      _id: bookId
    })
    if (!errors.isEmpty()) {
      return res.status(422).render('book/add-book-hardcopy', {
        pageTitle: 'Add Books',
        path: '/books/add-book',
        editing: true,
        oldInput: {
          title: updatedTitle,
          description: updatedDescription,
          location: updatedLocation
        },
        validationErrors: errors.array(),
        book: book
      }); 
    }
    const image = req.files.image
    book.title = updatedTitle
    book.description = updatedDescription
    book.location = updatedLocation
    book.available = updatedStatus
    book.coordinates = coord
    if(image) {
      fileHelper.deleteFile(book.image)
      book.image = image[0].path
    }
    book.save()
    req.flash("success", "The book was edited successfully")
    res.redirect('/book/' + bookId)
  } catch(err) {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
  }

}

exports.postEditBookPdf = async (req, res, next) => {
  const bookId = req.params.bookId
  const updatedTitle = req.body.title
  const updatedImage = req.files.image
  const updatedPdf = req.files.pdf
  const updatedDescription = req.body.description
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(422).render('book/add-book-pdf', {
      pageTitle: 'Add Book',
      path: '/books/add-book',
      editing: true,
      oldInput: {
          title: updatedTitle,
          description: updatedDescription
      },
      validationErrors: errors.array()
    });
  }

  try {
    const book = await Book.findById({
      _id: bookId
    })
    if(book.userId.toString() !== req.user._id.toString()) return res.redirect('/')
    book.title = updatedTitle
    book.description = updatedDescription
    if(updatedImage) {
      fileHelper.deleteFile(book.image)
      book.image = updatedImage[0].path
    }
    if(updatedPdf) {
      fileHelper.deleteFile(book.pdf)
      book.pdf = updatedPdf[0].path
    }
    book.save()
    req.flash("success", "The book was edited successfully")
    res.redirect('/book/' + bookId)
  } catch(err) {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
  }

}

exports.postDeleteBook = async (req, res, next) => {
  const bookId = req.params.bookId
  try {
    const book = await Book.findById({
      _id: bookId
    })

    if (!book) {
      return new Error('No book found')
    }
    if(book.userId.toString() !== req.user._id.toString()) return res.redirect('/')
    if(book.type === "pdf") {
      fileHelper.deleteFile(book.image)
      fileHelper.deleteFile(book.pdf)
    } else {
      fileHelper.deleteFile(book.image)
    }
    
    await Review.deleteMany({
      bookId: bookId
    })
    await Book.deleteOne({
      _id: bookId
    })
    await User.findById(req.user._id).updateOne({
      $pull: {
        books: bookId
      }
    })
    book.save()
    req.flash("success", "The book was deleted successfully")
    res.redirect('/books')

  } catch (err) {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
  }

}

exports.postEnquiryMessage = async (req, res, next) => {
  try {
    const { message, loggedInUserId, bookId} = req.body
    const userRecieving = await User.findById({_id: loggedInUserId })
    const requestedBook = await Book.findById({_id: bookId})
    const userGiving = await User.findById({_id: requestedBook.userId })
    requestedBook.enquiriesNumber = requestedBook.enquiriesNumber + 1
    if(requestedBook.enquiriesNumber === 2) {
      requestedBook.available = false
    }
    await requestedBook.save()
    const nexmo = new Nexmo({
      apiKey: process.env.API_KEY,
      apiSecret: process.env.API_SECRET
    })
  
    const from = userRecieving.mobile
    const to = userGiving.mobile
    const text = `${message} book-title: ${requestedBook.title} .Please feel free to send a reply. @bookooh!`
  
    nexmo.message.sendSms(from, to , text)
    req.flash("success", "The message has been sent successfully. We hope the owner contact you soon")
    res.redirect('/book/' + bookId )
  } catch(err) {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
  }
}

exports.getAboutPage = (req, res, next) => {
  res.render('about', {
    pageTitle: 'About Us',
    path: '/about'
  });
};

function escapeRegex(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};