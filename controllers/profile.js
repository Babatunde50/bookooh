const fs = require('fs')

const bcrypt = require('bcryptjs')
const { validationResult } = require('express-validator/check')
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();
const PNF = require('google-libphonenumber').PhoneNumberFormat;
const cloudinary = require('cloudinary').v2;


const User = require('../models/user')
const Review = require('../models/review')
const Book = require('../models/book')

cloudinary.config({ 
  cloud_name: 'dqso3yl2s', 
  api_key: '788773899141986', 
  api_secret: 'KKqjbc1E_LzkKoJ1H6i3NMb9Ztw' 
});

exports.getEditProfile = async (req, res, next) => {
  let message = req.flash('success')
  console.log(message)
  if(message.length > 0) {
      message = message[0]
  } else {
      message = null
  }
  try {
      const user = await User.findById(req.user._id)
      res.render('profile/user', {
        pageTitle: user.username,
        path: '/profile',
        user: user,
        errorMessage: null,
        errorLocation: null,
        successMessage: message
      });
  } catch(err) {
    const error = new Error(err)
    error.httpStatusCode = 500
    return next(error)
  }

};

exports.getPasswordUpdate = async (req, res, next) => {
  res.render('profile/update', {
    pageTitle: "Reset Password",
    path: '/profile',
    validationErrors: [],
    oldInput: {
      oldPassword: null,
      newPassword: null,
      confirmNewPassword: null
    },
    errorMessage: null
  })
}


exports.getBooks = async (req, res, next) => {
  const userId = req.params.userId
  let loggedInUser
  if(req.session.isLoggedIn) {
    loggedInUser = req.user._id.toString()
  }
  const isOwner = loggedInUser === userId.toString()
  const ITEM_PER_PAGE = 5
  const page = +req.query.page || 1
  try {
    const totalBooks = await Book.find({userId: userId}).countDocuments()
    const books = await Book.find({userId: userId})
                    .skip((page - 1) * ITEM_PER_PAGE)
                    .limit(ITEM_PER_PAGE)
                    .sort({ updatedAt: -1 })
                    .populate('userId').exec()
    res.render('profile/books', {
        pageTitle: "Your Books",
        path: '/profile',
        books: books,
        currentPage: page,
        isOwner: isOwner,
        showPagination: totalBooks > ITEM_PER_PAGE,
        hasNextPage: ITEM_PER_PAGE * page < totalBooks,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalBooks / ITEM_PER_PAGE)
      })
  } catch(err) {
    const error = new Error(err)
    error.httpStatusCode = 500
    return next(error)
  }
  
}

exports.postPasswordUpdate = async (req, res, next) => {
    const oldPassword = req.body.oldPassword
    const newPassword = req.body.newPassword
    const confirmNewPassword = req.body.confirmNewPassword
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).render('profile/update', {
        pageTitle: "Reset Password",
        path: '/profile',
        validationErrors: errors.array(),
        oldInput: {
            oldPassword: req.body.oldPassword,
            newPassword: req.body.newPassword,
            confirmNewPassword: confirmNewPassword
        },
        successMessage: null
      })
    };
    try {
      const user = await User.findOne({_id: req.user._id })
      const doMatch = await bcrypt.compare(oldPassword, user.password)
      if(!doMatch) {
        return res.status(422).render('profile/update', {
          pageTitle: "Reset Password",
          path: '/profile',
          validationErrors: [{
            param: "oldPassword",
            value: req.body.oldPassword,
            msg: "Password is incorrect"
          }],
          oldInput: {
            oldPassword: req.body.oldPassword,
            newPassword: req.body.newPassword,
            confirmNewPassword: req.body.confirmNewPassword
        }
        })
      }
      const hashedPw = await bcrypt.hash(newPassword, 12)
      user.password = hashedPw
      user.save()
      req.flash('success', 'Your password has been updated successfully')
      res.redirect("/profile/edit")
    } catch(err) {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
    }

}

exports.postEditUsername = async (req, res, next) => {
  try {
    const username = req.body.username.toLowerCase()
    const formalUsername = req.body.formal.toLowerCase()
    const user = await User.findById(req.user._id)

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).render('profile/user', {
        pageTitle: user.username,
        path: '/profile',
        user: user,
        errorMessage: errors.array()[0].msg,
        errorLocation: "username",
        successMessage: null
      });
    };

    if(username === formalUsername) {
        return res.status(422).render('profile/user', {
            pageTitle: user.username,
            path: '/profile',
            user: user,
            errorMessage: "Value was same as before",
            errorLocation: "username",
            successMessage: null
          });
    }

  const findUser = await User.findOne({username: username })
  if(findUser) {
    return res.status(422).render('profile/user', {
      pageTitle: user.username,
      path: '/profile',
      user: user,
      errorMessage: "A user with that username already exists. Please try a different one",
      errorLocation: "username",
      successMessage: null
    });
  }
  user.username = username
  await user.save()
  req.flash('success', 'Your username has been updated successfully')
  res.redirect("/profile/edit")
  } catch(err) {
    const error = new Error(err)
    error.httpStatusCode = 500
    return next(error)
  }
  
} 

exports.postEditEmail = async (req, res, next) => {
  try {
    const email = req.body.email
    const formalEmail = req.body.formal
    const user = await User.findById(req.user._id)
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(422).render('profile/user', {
        pageTitle: user.username,
        path: '/profile',
        user: user,
        errorMessage: errors.array()[0].msg,
        errorLocation: "email",
        successMessage: null
      });
    };

    if(email === formalEmail) {
      return res.status(422).render('profile/user', {
        pageTitle: user.username,
        path: '/profile',
        user: user,
        errorMessage: "Value was same as before",
        errorLocation: "email",
        successMessage: null
      });
      }

    const findUser = await User.findOne({ email: email })
    if(findUser) {
      return res.status(422).render('profile/user', {
        pageTitle: user.username,
        path: '/profile',
        user: user,
        errorMessage: "A user with that email already exists. Please try a different one",
        errorLocation: "email",
        successMessage: null
      });
    }
    user.email = email
    await user.save()
    req.flash('success', 'Your email has been updated successfully')
    res.redirect("/profile/edit")
  } catch(err) {
    const error = new Error(err)
    error.httpStatusCode = 500
    return next(error)
  }
} 

exports.postEditMobile = async (req, res, next) => {
  try {
    const mobile = req.body.mobile
    const formalMobile = req.body.formal
    const numberNew = phoneUtil.parseAndKeepRawInput(mobile, 'NG');
    const mobileConvert = phoneUtil.format(numberNew, PNF.E164).slice(1)
    const user = await User.findById(req.user._id)
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).render('profile/user', {
        pageTitle: user.username,
        path: '/profile',
        user: user,
        errorMessage: errors.array()[0].msg,
        errorLocation: "mobile",
        successMessage: null
      });
    };
    if(formalMobile === mobileConvert) {
      return res.status(422).render('profile/user', {
        pageTitle: user.username,
        path: '/profile',
        user: user,
        errorMessage: "Value was same as before",
        errorLocation: "mobile",
        successMessage: null
      });
      }

    const findUser = await User.findOne({ mobile: mobileConvert })
    if(findUser) {
      return res.status(422).render('profile/user', {
        pageTitle: user.username,
        path: '/profile',
        user: user,
        errorMessage: "A user with that mobile number already exists. Please try a different one",
        errorLocation: "mobile",
        successMessage: null
      });
    }
    user.mobile = mobileConvert
    await user.save()
    req.flash('success', 'Your mobile number has been updated successfully')
    res.redirect("/profile/edit")
  } catch(err) {
    const error = new Error(err)
    error.httpStatusCode = 500
    return next(error)
  }
}

exports.postEditImage = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    const user = await User.findById(req.user._id)
    if (!errors.isEmpty()) {
      return res.status(422).render('profile/user', {
        pageTitle: user.username,
        path: '/profile',
        user: user,
        errorMessage: errors.array()[0].msg,
        errorLocation: "image",
        successMessage: null
      });
    };
    const profileImage = req.files.image[0].path
    if(user.profileImage) {
      const imgArr = user.profileImage.split('.').slice(0, -1).join('.').split('/')
      const imageId = imgArr[imgArr.length - 1]
      try {
        await cloudinary.uploader.destroy(imageId)
      } catch(err) {
        req.flash("success", "The image could not be uploaded. This is probably due to your network")
        return res.redirect("/profile/edit")
      }
  
    } 
    let resultImg
    try {
      resultImg = await cloudinary.uploader.upload(profileImage, {quality: "auto"})
    } catch(err) {
        req.flash("success", "The image could not be uploaded. This is probably due to your network")
        return res.redirect("/profile/edit")
    }
    user.profileImage = resultImg.url
    await user.save()
    req.flash('success', 'Your profile Image has been updated successfully')
    res.redirect("/profile/edit")
  } catch(err) {
      const error = new Error(err)
      error.httpStatusCode = 500
      return next(error)
  }
}

exports.postDeleteAccount = async (req, res, next) => {
  try {
  const books = await Book.find({userId: req.user._id})
  const pdfsAndImages = books.filter(book => book.type === 'pdf').map(book => [book.pdf, book.image])
  let finalPdfsAndImages = []
  const images = books.filter(book => book.type === 'hard-copy').map(book => book.image )
  for(let i =0; i < pdfsAndImages.length; i++) {
    finalPdfsAndImages.push(pdfsAndImages[i][0], pdfsAndImages[i][1] )
  }
  images.forEach(async (image) => {
    //delete image
    const imgArr = image.split('.').slice(0, -1).join('.').split('/')
    const imageId = imgArr[imgArr.length - 1]
    try {
      await cloudinary.uploader.destroy(imageId)
    } catch(err) {
      req.flash("success", "Your account could not be deleted. This is probably due to your network")
      return res.redirect("/profile/edit")
    }
    
  })
  finalPdfsAndImages.forEach(async (data) => {
    //delete pdf and image
    const pdfImgArr = data.split('.').slice(0, -1).join('.').split('/')
    const pdfImgId = pdfImgArr[pdfImgArr.length - 1]
    try {
      await cloudinary.uploader.destroy(pdfImgId)
    } catch(err) {
      req.flash("success", "Your account could not be deleted. This is probably due to your network")
      return res.redirect("/profile/edit")
    }
    
  })
    await Review.deleteMany({userId: req.user._id})
    await Book.deleteMany({userId: req.user._id})
    await User.deleteOne({_id: req.user._id})
    await req.session.destroy()
    res.redirect('/')
  } catch(err) {
    console.log(err)
    const error = new Error(err)
    error.httpStatusCode = 500
    return next(error)
  }

}