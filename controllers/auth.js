require("dotenv").config();
const User = require("../models/user");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
const { validationResult } = require("express-validator");
const sendGridTransport = require("nodemailer-sendgrid-transport");
const transporter = nodemailer.createTransport(
  sendGridTransport({
    auth: {
      api_key: process.env.SEND_GRID_API_KEY,
    },
  })
);

exports.getSignup = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/signup", {
    path: "/signup",
    pageTitle: "Signup",
    errorMessage: message,
    oldInput: {
      email: "",
      password: "",
      confirmPassword: "",
    },
    validationErrors: [],
  });
};

exports.postSignup = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;
  const confirmPassword = req.body.confirmPassword;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("auth/signup", {
      path: "/signup",
      pageTitle: "Signup",
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password,
        confirmPassword: confirmPassword,
      },
      validationErrors: errors.array(),
    });
  }
  return bcrypt
    .hash(password, 12)
    .then((hash) => {
      const user = new User({
        email: email,
        password: hash,
        cart: { items: [] },
      });
      return user.save();
    })
    .then(() => {
      res.redirect("/login");
      return transporter.sendMail({
        to: email,
        from: "d.trafford@outlook.com",
        subject: "Sign Up Completed",
        html:
          "<h1>Thanks for signing up!</h1><br><h3>Hope you enjoy our app</h3>",
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      console.log(err);
      return next(error);
    });
};

exports.getLogin = (req, res, next) => {
  // isLoggedIn = req.cookies["loggedIn"] === "true" ? true : false; /// TO USE WITH COOKIES NOT EXPRESS-SESSION
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/login", {
    path: "/login",
    pageTitle: "Login",
    errorMessage: message,
    oldInput: {
      email: "",
      password: "",
    },
    validationErrors: [],
  });
};

exports.postLogin = (req, res, next) => {
  const email = req.body.email;
  const password = req.body.password;

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).render("auth/login", {
      path: "/login",
      pageTitle: "Login",
      errorMessage: errors.array()[0].msg,
      oldInput: {
        email: email,
        password: password,
      },
      validationErrors: errors.array(),
    });
  }
  User.findOne({ email: email })
    .then((user) => {
      if (!user) {
        return res.status(422).render("auth/login", {
          path: "/login",
          pageTitle: "Login",
          errorMessage: "Email Not Found",
          oldInput: {
            email: email,
            password: password,
          },
          validationErrors: errors.array(),
        });
      }
      bcrypt
        .compare(password, user.password)
        .then((match) => {
          if (match) {
            req.session.isLoggedIn = true;
            req.session.user = user;
            return req.session.save(() => res.redirect("/"));
          } else {
            return res.status(422).render("auth/login", {
              path: "/login",
              pageTitle: "Login",
              errorMessage: "Invalid Password",
              oldInput: {
                email: email,
                password: password,
              },
              validationErrors: errors.array(),
            });
          }
        })
        .catch((err) => {
          res.redirect("/login");
        });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      console.log(err);
      return next(error);
    });
};

exports.postLogout = (req, res, next) => {
  req.session.destroy((err) => {
    console.log(err);
    res.redirect("/login");
  });
};

exports.getReset = (req, res, next) => {
  let message = req.flash("error");
  if (message.length > 0) {
    message = message[0];
  } else {
    message = null;
  }
  res.render("auth/reset", {
    path: "/reset-password",
    pageTitle: "Reset Password",
    errorMessage: message,
  });
};

exports.postReset = (req, res, next) => {
  crypto.randomBytes(32, (err, buffer) => {
    if (err) {
      return res.redirect("/reset-password");
    }
    const token = buffer.toString("hex");
    User.findOne({ email: req.body.email })
      .then((user) => {
        if (!user) {
          req.flash("error", "No account with that email found");
        }
        user.resetToken = token;
        user.resetTokenExpiration = Date.now() + 3600000;
        return user.save();
      })
      .then(() => {
        res.redirect("/");
        return transporter.sendMail({
          to: req.body.email,
          from: "d.trafford@outlook.com",
          subject: "Password Reset",
          html: `
            <p>You requested a password reset</p>
            <p>Click this <a href="http://127.0.0.1:3001/reset/${token}">link</a> to reset password</p>
            `,
        });
      });
  });
};

exports.getNewPassword = (req, res, next) => {
  const token = req.params.token;
  User.findOne({ resetToken: token, resetTokenExpiration: { $gt: Date.now() } })
    .then((user) => {
      let message = req.flash("error");
      if (message.length > 0) {
        message = message[0];
      } else {
        message = null;
      }
      res.render("auth/new-password", {
        path: "/new-password",
        pageTitle: "Reset Password",
        errorMessage: message,
        userId: user._id.toString(),
        passwordToken: token,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      console.log(err);
      return next(error);
    });
};

exports.postNewPassword = (req, res, next) => {
  const newPassword = req.body.password;
  const userId = req.body.userId;
  const passwordToken = req.body.passwordToken;
  let updatedUser;
  User.findOne({
    resetToken: passwordToken,
    resetTokenExpiration: { $gt: Date.now() },
    _id: userId,
  })
    .then((user) => {
      updatedUser = user;
      return bcrypt.hash(newPassword, 12);
    })
    .then((hash) => {
      updatedUser.password = hash;
      updatedUser.resetToken = undefined;
      updatedUser.resetTokenExpiration = undefined;
      updatedUser.save();
    })
    .then(() => res.redirect("/login"))
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      console.log(err);
      return next(error);
    });
};

// PULLS COOKIES WITHOUT COOKIE PARSER
// var cookies = {};
// req.headers &&
//   req.headers.cookie.split(";").forEach(function (cookie) {
//     var parts = cookie.match(/(.*?)=(.*)$/);
//     cookies[parts[1].trim()] = (parts[2] || "").trim();
//   });
