const path = require('path')

const express = require('express')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const multer = require('multer')
const session = require('express-session')
const MongoDBStore = require('connect-mongodb-session')(session);
const flash = require('connect-flash')
const moment = require('moment')

const errorController = require('./controllers/errors')
const bookRoutes = require('./routes/book')
const authRoutes = require('./routes/auth')
const User = require('./models/user')


const app = express()
const store = new MongoDBStore({
  uri: 'mongodb://localhost:27017/book-ooh',
  collection: 'sessions'
});

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(
      null,
      new Date().toISOString().replace(/:/g, "-") + "-" + file.originalname
    );
  }
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpeg" ||
    file.mimetype === "image/jpg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};


app.use(bodyParser.urlencoded({extended: false}))
app.use(multer({dest: 'images', storage: fileStorage, fileFilter: fileFilter }).single('image'))
app.use(flash());
app.use(session({
  secret: 'thisissomethingyoucantreallyundestand',
  resave: false,
  saveUninitialized: false,
  store: store
}))
app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "images")));



app.set("view engine", "ejs");

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.moment = moment
  next();
});

app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then(user => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch(err => {
      next(new Error(err));
    });
});

app.get('/', (req, res, next) => {
  res.render('home', {
    pageTitle: 'BookOoh',
    path: '/'
  })
})
app.use(bookRoutes)
app.use('/auth', authRoutes)

app.use('/500', errorController.get500)

app.use(errorController.get404)

// app.use((error, req, res, next) => {
//   res.redirect("/500");
// });


mongoose
  .connect('mongodb://localhost:27017/book-ooh', {useNewUrlParser: true})
  .then(result => {
    app.listen(process.env.PORT || 3000);
    console.log('I am connected')
  })
  .catch(err => {
    console.log(err);
  });