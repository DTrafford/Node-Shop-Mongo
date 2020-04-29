const express = require("express");
const { check, body } = require("express-validator");

const authController = require("../controllers/auth");
const User = require("../models/user");

const router = express.Router();

router.get("/signup", authController.getSignup);

// check checks all ares of a request {body, headers, etc....}
// body checks only the request body
router.post(
  "/signup",
  [
    check("email")
      .isEmail()
      .withMessage("Please enter a valid email")
      .custom((value, { req }) => {
        // if (value === "test@test.com") {
        //   throw new Error("This email address is forbidden");
        // }
        // return true;
        return User.findOne({ email: value }).then((userData) => {
          if (userData) {
            return Promise.reject("Email already exists");
          }
        });
      })
      .normalizeEmail(),
    body("password")
      .isLength({ min: 5 })
      .withMessage("Passwords must be at least 5 Characters")
      .isAlphanumeric()
      .withMessage("Passwords must contain only text and numbers")
      .trim(),
    body("confirmPassword")
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error("Passwords do not match");
        }
        return true;
      })
      .trim(),
  ],
  authController.postSignup
);

router.get("/login", authController.getLogin);

router.post(
  "/login",
  [
    body("email")
      .isEmail()
      .withMessage("Please enter a valid email address.")
      .normalizeEmail(),
    body("password", "Password has to be valid.")
      .isLength({ min: 5 })
      .isAlphanumeric()
      .trim(),
  ],
  authController.postLogin
);

router.post("/logout", authController.postLogout);

router.get("/reset-password", authController.getReset);

router.post("/reset-password", authController.postReset);

router.get("/reset/:token", authController.getNewPassword);

router.post("/new-password", authController.postNewPassword);

module.exports = router;
