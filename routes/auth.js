const express = require("express");
const { body } = require('express-validator/check');

const authController = require("../controllers/auth");
const User = require('../models/user')

const router = express.Router();

router.get('/signup', authController.getSignUp)

router.post('/signup', [
    body('email', 'Please provide a valid email').isEmail().custom(value => {
        return User.findOne({email: value}).then(user => {
          if (user) {
            return Promise.reject('E-mail already in use');
          }
        })
    }).normalizeEmail(),
    body('mobile')
        .isMobilePhone()
        .withMessage("Must be a valid mobile number"),
    body('username').isLength({min: 5})
        .withMessage("username must be atleast 5 characters")
        .isAlphanumeric()
        .trim()
        .custom(value => {
            return User.findOne({ username: value.toLowerCase() }).then(user => {
              if (user) {
                return Promise.reject('Username already in use');
              }
            })
        }),
    body('password', 'Password must be at least 7 alphanumeric characters').isLength({ min: 7 })
      .isAlphanumeric()
      .trim(),
    body('confirmPassword').trim().custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Password confirmation does not match password');
        }
        return true
      })
], authController.postSignUp)


router.get('/login', authController.getLogin)

router.post('/login', [
  body('email', 'Inavalid Email or Password')
      .isEmail()
      .normalizeEmail(),
  body('password', 
      'Inavalid Email or Password')
      .isLength({min: 7})
      .isAlphanumeric()
      .trim()
], authController.postLogin);

router.post('/logout', authController.postLogout)

router.get('/reset', authController.getReset)

router.post('/reset', authController.postReset)

router.get('/reset/:token', authController.getNewPassword)

router.post('/new-password', [
  body('password', 'Password must be at least 7 alphanumeric characters').isLength({ min: 7 })
      .isAlphanumeric()
      .trim(),
    body('confirmPassword').trim().custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Password confirmation does not match password');
        }
        return true
      })
], authController.postNewPassword)

module.exports = router;