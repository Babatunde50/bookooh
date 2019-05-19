const fs = require("fs")

const cloudinary = require('cloudinary').v2;

cloudinary.config({ 
  cloud_name: 'dqso3yl2s', 
  api_key: '788773899141986', 
  api_secret: 'KKqjbc1E_LzkKoJ1H6i3NMb9Ztw' 
});

const Nexmo = require('nexmo')
const { validationResult } = require('express-validator/check')

const Book = require('../models/book')
const User = require('../models/user')
const Review = require('../models/review')
const coordinates = require("../maps")

exports.getIndex = async (req, res, next) => {
  let message = req.flash('success')
  if(message.length > 0) {
      message = message[0]
  } else {
      message = ''
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
  let pdfLink
  const loggedInUser = req.session.isLoggedIn ? req.user._id.toString() : null
  try {
    const book = await Book.findOne({
      _id: bookId
    }).populate('userId').populate("reviewsId").exec()
    const reviews = await Review.find({
      bookId: book._id
    }).populate('userId').exec()

    if(book.pdf) {
      pdfLink = book.pdf.split("/")
      pdfLink.splice(6, 0, "fl_attachment")
      pdfLink = pdfLink.join("/")
    }
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
      pdfLink: pdfLink,
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
    const pdfLink = req.body.pdfLink
    const foundBook = await Book.findById(bookId)
    foundBook.downloads = foundBook.downloads + 1
    await foundBook.save()
    res.redirect(pdfLink)
  } catch(err) {
      console.log(err)
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
      let result
       try{
          result = await cloudinary.uploader.upload(image, {quality: "auto"})
      } catch(err) {
          console.log(err)
          req.flash("success", "The book could not be added. This is probably to your network")
          return res.redirect("/books")
      } 
      const book = new Book({
        title: title,
        image: result.url,
        type: "hard-copy",
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
  }catch(err) {
    console.log(err)
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
      let imageRes
      let pdfRes
      try{
        imageRes = await cloudinary.uploader.upload(image, {quality: "auto"})
        pdfRes = await cloudinary.uploader.upload(pdf, {quality: "auto"})
      } catch(err) {
          req.flash("success", "The book could not be added. This is probably to your network")
          return res.redirect("/books")
      }
    const book = new Book({
      title: title,
      type: "pdf",
      image: imageRes.url,
      pdf: pdfRes.url,
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

  } catch(err) {
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
    book.coordinates = coord
    if(image) {
      const imgArr = book.image.split('.').slice(0, -1).join('.').split('/')
      const imageId = imgArr[imgArr.length - 1]
      let result
       try{
          await cloudinary.uploader.destroy(imageId)
          result = await cloudinary.uploader.upload(image[0].path, {quality: "auto"})
          book.image = result.url
      } catch(err) {
          req.flash("success", "The book could not be edited. This is probably to your network")
          return res.redirect('/book/' + bookId)
      } 
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
      const imgArr = book.image.split('.').slice(0, -1).join('.').split('/')
      const imageId = imgArr[imgArr.length - 1]
      let resultImg
       try{
          await cloudinary.uploader.destroy(imageId)
          resultImg = await cloudinary.uploader.upload(updatedImage[0].path, {quality: "auto"})
          book.image = resultImg.url
      } catch(err) {
          req.flash("success", "The book could not be edited. This is probably to your network")
          res.redirect('/book/' + bookId)
      }
    }
    if(updatedPdf) {
      const pdfArr = book.pdf.split('.').slice(0, -1).join('.').split('/')
      const pdfId = pdfArr[pdfArr.length - 1]
      let resultPdf
      try{
        await cloudinary.uploader.destroy(pdfId)
        resultPdf = await cloudinary.uploader.upload(updatedPdf[0].path, {quality: "auto"})
        book.pdf = resultPdf.url
    } catch(err) {
        req.flash("success", "The book could not be edited. This is probably to your network")
        res.redirect('/book/' + bookId)
    }
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
      return res.redirect("/")
    }
    if(book.userId.toString() !== req.user._id.toString()) return res.redirect('/')
    if(book.type === "pdf") {
      //delete pdf
      const pdfArr = book.pdf.split('.').slice(0, -1).join('.').split('/')
      const pdfId = pdfArr[pdfArr.length - 1]
      try {
        await cloudinary.uploader.destroy(pdfId) 
      } catch(err) {
        req.flash("success", "The book could not be deleted. This is probably to your network")
        return res.redirect('/book/' + bookId)
      }
    }
    //delete image
    const imgArr = book.image.split('.').slice(0, -1).join('.').split('/')
    const imageId = imgArr[imgArr.length - 1]
    try {
      await cloudinary.uploader.destroy(imageId)
    } catch(err) {
      req.flash("success", "The book could not be deleted. This is probably to your network")
      return res.redirect('/book/' + bookId)
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
    requestedBook.available = false
    
    await requestedBook.save()
    const nexmo = new Nexmo({
      apiKey: process.env.API_KEY,
      apiSecret: process.env.API_SECRET
    })

    const from = 'Bukooh'
    const to = userGiving.mobile
    const text = `Please feel free to send a reply to ${userRecieving.mobile}. book-title: ${requestedBook.title} ${message} . @bukooh!`
    console.log(from, to, text)
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