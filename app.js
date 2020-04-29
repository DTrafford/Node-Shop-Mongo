require("dotenv").config();
const path = require("path");
const express = require("express");

const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const multer = require("multer");

const session = require("express-session"); // Session Management
const MongoDBStore = require("connect-mongodb-session")(session); // Connect Session to MongoDB
const csrf = require("csurf"); // CSRF TOKEN PACKAGE
const flash = require("connect-flash");
const errorController = require("./controllers/error");

const User = require("./models/user");

// USED WITHOUT MONGOOSE
// const mongoConnect = require("./util/database").mongoConnect;
const mongoose = require("mongoose");

// Routes
const adminRoutes = require("./routes/admin");
const shopRoutes = require("./routes/shop");
const authRoutes = require("./routes/auth");

// Constants
const csrfProtection = csrf();
const MONGODB_URI = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASS}@node-shopping-fu1b9.mongodb.net/shop?retryWrites=true&w=majority`;
const STORE = new MongoDBStore({
  uri: MONGODB_URI,
  collection: "sessions",
});

const IMAGE_STORAGE = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, "images");
  },
  filename: (req, file, callback) => {
    callback(null, new Date().toISOString() + "-" + file.originalname);
  },
});

const FILE_FILTER = (req, file, callback) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jgp" ||
    file.mimetype === "image/jpeg"
  ) {
    callback(null, true);
  } else {
    callback(null, false);
  }
};

const app = express();

app.set("view engine", "ejs");
app.set("views", "views");

app.use(bodyParser.urlencoded({ extended: false }));
// app.use(cookieParser());
app.use(
  multer({ storage: IMAGE_STORAGE, fileFilter: FILE_FILTER }).single("image")
);

app.use(
  session({
    secret: "ThiS SecRet WilL bE uSeD to Hash",
    resave: false,
    saveUninitialized: false,
    store: STORE,
  })
);

app.use(csrfProtection);
app.use(flash());

app.use(express.static(path.join(__dirname, "public")));
app.use("/images", express.static(path.join(__dirname, "images")));

app.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});

app.use((req, res, next) => {
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then((user) => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch((err) => {
      throw new Error(err);
    });
});

app.use("/admin", adminRoutes);
app.use(shopRoutes);
app.use(authRoutes);
app.use("/500", errorController.get500);
app.use(errorController.get404);

app.use((error, req, res, next) => {
  // res.status(error.httpStatusCode).render(...);
  // res.redirect('/500');
  console.log(error);
  res.status(500).render("500", {
    pageTitle: "Error!",
    path: "/500",
    isAuthenticated: req.session.isLoggedIn,
  });
});

/// USED WITHOUT MONGOOSE
// mongoConnect((client) => {
//   app.listen(3001);
// });

mongoose
  .connect(MONGODB_URI, { useNewUrlParser: true })
  .then((result) => {
    app.listen(3001);
    console.log("CONNECTED");
  })
  .catch((err) => console.log(err));
