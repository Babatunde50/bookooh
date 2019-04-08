const express = require("express");
const { body } = require('express-validator/check');

const authController = require("../controllers/auth");
const User = require('../models/user')

const router = express.Router();

router.get('/signup', authController.getSignUp )

router.post('/signup', [
    body('email').isEmail().custom(value => {
        return User.findOne({email: value}).then(user => {
          if (user) {
            return Promise.reject('E-mail already in use');
          }
        })
    }).normalizeEmail(),
    body('username').isLength({min: 5})
        .isAlphanumeric()
        .trim()
        .custom(value => {
            return User.findOne({username: value}).then(user => {
              if (user) {
                return Promise.reject('Username already in use');
              }
            })
        }),
    body('password', 'Please enter a password with only numbers and text and at least 5 characters').isLength({ min: 5 })
      .isAlphanumeric()
      .trim(),
    body('confirmPassword').trim().custom((value, { req }) => {
        console.log(value)
        if (value !== req.body.password) {
          console.log(value)
          throw new Error('Password confirmation does not match password');
        }
        return true
      })
], authController.postSignUp)


router.get('/login', authController.getLogin)

router.post('/login', [
  body('email').isEmail(),
  body('password').trim()
], authController.postLogin)

router.post('/logout', authController.postLogout)

router.get('/verify/:token', authController.getVerified)


module.exports = router;

