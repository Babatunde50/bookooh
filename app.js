const path = require('path')

const express = require('express')
const mongoose = require('mongoose')
const bodyParser = require('body-parser')
const multer = require('multer')
const session = require('express-session')
const MongoDBStore = require('connect-mongodb-session')(session);
const csrf = require('csurf')
const flash = require('connect-flash')
const moment = require('moment')
const helmet = require('helmet')
const compression = require('compression')

const errorController = require('./controllers/errors')
const bookRoutes = require('./routes/book')
const authRoutes = require('./routes/auth')
const profileRoutes = require('./routes/profile')
const User = require('./models/user')

const app = express()

const MONGODB_URI = process.env.MONGO_PASSWORD
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: 'sessions'
});
const csrfProtection = csrf()

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "files");
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
    file.mimetype === "image/jpg" ||
    file.mimetype === "application/pdf"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};


app.use(bodyParser.urlencoded({extended: false}))
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).fields([
    { name: 'image', maxCount: 1 },
    { name: 'pdf', maxCount: 1 }
  ])
);

app.use(flash());
app.use(session({
  secret: 'thisissomethingyoucantreallyundestand',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7
  },
  store: store
}))
app.use(csrfProtection)
app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "images")));
app.use("/files", express.static(path.join(__dirname, "files")));

app.set("view engine", "ejs");

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.moment = moment
  res.locals.csrfToken = req.csrfToken()
  if(req.session.isLoggedIn) {
    res.locals.userId = req.session.user._id
    res.locals.username = req.session.user.username
  }
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

app.use(helmet())
app.use(compression())

app.use(bookRoutes)
app.use('/auth', authRoutes)
app.use('/profile', profileRoutes)
app.get("/500", errorController.get500);


app.use(errorController.get404);

app.use((error, req, res, next) => {
  console.log(error)
  res.redirect("/500")
});

mongoose
  .connect(MONGODB_URI, {useNewUrlParser: true})
  .then(result => {
    app.listen(process.env.PORT || 3000);
    console.log("connected")
  })
  .catch(err => {
    console.log(err)
  });