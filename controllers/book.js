const Book = require('../models/book')
const User = require('../models/user')
const Review = require('../models/review')



exports.getBooks = async (req, res, next) => {
  const message = req.flash('success')
  try {
    const books = await Book.find()
    res.render('book/book-list', {
      pageTitle: 'Books',
      path: '/books',
      books: books,
      message: message
        });
  }
  catch(err) {
      const error = new Error('err')
      error.httpStatusCode = 500
      return next(error)
    }

  };

exports.getBook = async (req, res, next) => {
  const bookId = req.params.bookId
  try {
    const book = await Book.findOne({_id: bookId}).populate('userId').exec()
    const reviews = await Review.find({bookId: book._id}).populate('userId').exec()
    if(!book) {
      res.redirect('/')
    }
    res.render('book/book', {
      pageTitle: book.title,
      path: '/books',
      book: book,
      reviews
      });
  }

  catch(err) {
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

exports.postReview = async (req, res, next) => {
    const review = req.body.review
    const bookId = req.body.bookId
    
    const reviewData = new Review({
      review,
      bookId,
      userId: req.user._id
    })

    try {
      savedReview = await reviewData.save()
      const user = await User.findById(req.user._id)
      const book = await Book.findById(bookId)
      if(!user) {
        res.redirect('/login')
      }
      if(!book) {
        res.redirect("back")
      }
      user.reviews.push(savedReview._id)
      book.reviews.push(savedReview._id)
      await user.save()
      await book.save()
      res.redirect("back")
    }
    catch(err) {
      const error = new Error('err')
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
      if(!user) {
        res.redirect('/login')
      }
      user.books.push(savedBook._id)
      await user.save()
      res.redirect('/books')
  }
  catch(err) {
      const error = new Error('err')
      error.httpStatusCode = 500
      return next(error)
    }
  
}

exports.getEditBook = (req, res, next) => {
  const bookId = req.params.bookId

  Book.findById({_id: bookId})
    .then(book => {
      res.render('book/add-book', {
        pageTitle: 'Books',
        path: '/books/add-book',
        editing: true,
        book: book
      });
    })
    .catch(err => {
      const error = new Error('err')
      error.httpStatusCode = 500
      return next(error)
    })

}

exports.postEditBook = (req, res, next) => {

    const bookId = req.params.bookId

    const updatedTitle = req.body.title
    const updatedImage = req.file.path
    const updatedType = req.body.type
    const updatedDescription = req.body.description

    Book.findById({_id: bookId})
      .then(book => {
          book.title = updatedTitle
          book.image = updatedImage
          book.description = updatedDescription
          book.type = updatedType
          return book.save()
      })
      .then(result => {
        res.redirect('/books')
      })
      .catch(err => {
        const error = new Error('err')
        error.httpStatusCode = 500
        return next(error)
      })

}

exports.postDeleteBook = async (req, res, next) => {
  const bookId = req.params.bookId  
  console.log(bookId)


  try {
    const book = await Book.findById({_id: bookId})

    if(!book) {
      console.log("An error has occurred...")
      return new Error('No book found')
    }

    if (req.user._id.toString() !== book.userId.toString()) {
      return res.redirect("back")
    }

    const user = await User.findById(req.user._id)

    bookIndex = user.books.findIndex(book => book.toString() === bookId.toString() )

    user.books.splice(0, bookIndex)

    await user.save()

    review = await Review.deleteMany({bookId: bookId})
    await Book.deleteOne({_id: bookId})

    review.save()
    book.save()
    res.redirect('/books')

  }

  catch (err) {
      const error = new Error('err')
      error.httpStatusCode = 500
      return next(error)
  }

  // jsut trying to do some cool stuffs....


}
