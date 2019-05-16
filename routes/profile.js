const express = require("express");
const { body } = require('express-validator/check');

const isAuth = require('../middleware/is-auth')
const User = require('../models/user')
const profileController = require('../controllers/profile')

const router = express.Router();

router.get('/edit', isAuth, profileController.getEditProfile )

router.get('/edit/reset-password', profileController.getPasswordUpdate)

router.get('/books/:userId', profileController.getBooks)

router.post('/edit/username', isAuth, [
  body('username')
    .isLength({min: 5})
    .withMessage("username must be atleast 5 characters")
    .isAlphanumeric()
    .trim()
] , profileController.postEditUsername)

router.post('/edit/email', isAuth, [
  body('email', "Please provide a valid email address")
    .isEmail()
    .normalizeEmail()
], profileController.postEditEmail)

router.post('/edit/mobile', isAuth, [
  body('mobile', "Must be a valid mobile number")
  .isMobilePhone()
], profileController.postEditMobile)

router.post('/edit-image', isAuth, [
  body('image')
  .custom((value, { req }) => {
      if(!req.files.image) {
        return Promise.reject('No image file was provided');
      }
      if(req.files.image) {
          const fileType = req.files.image[0].originalname.split(".")[req.files.image[0].originalname.split(".").length - 1].toLowerCase()
          if(fileType !== "png" && fileType !== "jpeg" && fileType !== "jpg") {
              return Promise.reject("Must be an image file")
          }    
      }
      return true
  })
], profileController.postEditImage )

router.post('/update', isAuth, [
    body('newPassword', 'Please enter an alphanumeric value with atleast 5 characters').isLength({ min: 5 })
    .isAlphanumeric()
    .trim(),
    body('confirmNewPassword').trim().custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('Password confirmation does not match new password');
        }
        return true
      })
], profileController.postPasswordUpdate)


router.post('/delete', isAuth, profileController.postDeleteAccount)


module.exports = router;

