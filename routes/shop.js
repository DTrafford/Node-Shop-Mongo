const path = require("path");

const express = require("express");

const shopController = require("../controllers/shop");

const isAuth = require("../middleware/is-auth");

const router = express.Router();

router.get("/", shopController.getIndex);

router.get("/products", shopController.getProducts);

router.get("/products/:productId", shopController.getProduct);

router.get("/cart", isAuth, shopController.getCart);

router.post("/cart", shopController.postAddToCart);

router.post("/cart-delete-item", shopController.postCartDeleteProduct);

router.get("/checkout", isAuth, shopController.getCheckout);

router.get(
  "/checkout/success/8g6gfa6bkkjhuug1129||!!!hhbsso1a7j3msisy2b3e",
  isAuth,
  shopController.getCheckOutSuccess
);

router.get("/checkout/cancel", isAuth, shopController.getCheckout);

router.get("/orders", isAuth, shopController.getOrders);

router.get("/orders/:orderId", isAuth, shopController.getInvoice);

module.exports = router;
