const Book = require('../models/book')
const User = require('../models/user')
const Review = require('../models/review')

exports.getBooks = async (req, res, next) => {
  const message = req.flash('success')
  try {
    const books = await Book.find().populate('userId').exec()
    res.render('book/book-list', {
      pageTitle: 'Books',
      path: '/books',
      books: books,
      message: message
    });
  } catch (err) {
    const error = new Error('err')
    error.httpStatusCode = 500
    return next(error)
  }

};

exports.getBook = async (req, res, next) => {
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
      loggedInUser: loggedInUser
    });
  } catch (err) {
    console.log(err)
    const error = new Error('err')
    error.httpStatusCode = 500
    return next(error)
  }
}

exports.getAddBook = (req, res, next) => {
  res.render('book/add-book', {
    pageTitle: 'Books',
    path: '/books/add-book',
    editing: false
  });
}

exports.getEditBook = async (req, res, next) => {
  const bookId = req.params.bookId
  try {
    const book = Book.findById({
      _id: bookId
    })
    if(book.userId !== req.user._id) return res.redirect('/')
  res.render('book/add-book', {
    pageTitle: 'Books',
    path: '/books/add-book',
    editing: true,
    book: book
      });
  } catch (err) {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
  }
    
}


exports.postBook = async (req, res, next) => {
  const title = req.body.title
  const image = req.file.path
  const type = req.body.type
  const description = req.body.description

  const book = new Book({
    title: title,
    image: image,
    type: type,
    description: description,
    userId: req.user._id
  })

  try {
    savedBook = await book.save()
    const user = await User.findById(req.user._id)
    if (!user) {
      res.redirect('/login')
    }
    user.booksId.push(savedBook._id)
    await user.save()
    res.redirect('/books')
  } catch (err) {
    const error = new Error('err')
    error.httpStatusCode = 500
    return next(error)
  }

}



exports.postEditBook = async (req, res, next) => {

  const bookId = req.params.bookId

  const updatedTitle = req.body.title
  const updatedImage = req.file.path
  const updatedType = req.body.type
  const updatedDescription = req.body.description

  try {
    const book = await Book.findById({
      _id: bookId
    })
    if(book.userId !== req.user._id) return res.redirect('/')
    book.title = updatedTitle
    book.image = updatedImage
    book.description = updatedDescription
    book.type = updatedType
    book.save()
    res.redirect('/books')
  } catch(err) {
      const error = new Error('err')
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
      console.log("An error has occurred...")
      return new Error('No book found')
    }
    if(book.userId !== req.user._id) return res.redirect('/')
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
    res.redirect('/books')

  } catch (err) {
    const error = new Error('err')
    error.httpStatusCode = 500
    return next(error)
  }

}