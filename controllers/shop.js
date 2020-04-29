require("dotenv").config();
const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");

const Product = require("../models/product");
const Order = require("../models/order");

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const ITEMS_PER_PAGE = 3;

exports.getProducts = (req, res, next) => {
  let page = +req.query.page || 1;
  let totalItems;
  Product.find()
    .countDocuments()
    .then((numberOfProducts) => {
      totalItems = numberOfProducts;
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then((products) => {
      res.render("shop/product-list", {
        prods: products,
        pageTitle: "All Products",
        path: "/products",
        currentPage: page,
        totalProducts: totalItems,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      console.log(err);
      return next(error);
    });
};

exports.getProduct = (req, res, next) => {
  const prodId = req.params.productId;

  Product.findById(prodId)
    .then((product) => {
      res.render("shop/product-detail", {
        product: product,
        pageTitle: product.title,
        path: "/products",
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      console.log(err);
      return next(error);
    });
};

exports.getIndex = (req, res, next) => {
  let page = +req.query.page || 1;
  let totalItems;
  console.log(page);
  Product.find()
    .countDocuments()
    .then((numberOfProducts) => {
      totalItems = numberOfProducts;
      return Product.find()
        .skip((page - 1) * ITEMS_PER_PAGE)
        .limit(ITEMS_PER_PAGE);
    })
    .then((products) => {
      res.render("shop/index", {
        prods: products,
        pageTitle: "Shop",
        path: "/",
        currentPage: page,
        totalProducts: totalItems,
        hasNextPage: ITEMS_PER_PAGE * page < totalItems,
        hasPreviousPage: page > 1,
        nextPage: page + 1,
        previousPage: page - 1,
        lastPage: Math.ceil(totalItems / ITEMS_PER_PAGE),
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      console.log(err);
      return next(error);
    });
};

exports.getCart = (req, res, next) => {
  req.user
    .populate("cart.items.product")
    .execPopulate()
    .then((user) => {
      const products = user.cart.items;
      res.render("shop/cart", {
        path: "/cart",
        pageTitle: "Your Cart",
        products: products,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      console.log(err);
      return next(error);
    });
};

exports.postAddToCart = (req, res, next) => {
  const prodId = req.body.productId;
  Product.findById(prodId)
    .then((product) => {
      return req.user.addToCart(product);
    })
    .then((result) => {
      console.log("Added To Cart");
      res.redirect("/cart");
    });
};

exports.postCartDeleteProduct = (req, res, next) => {
  const prodId = req.body.productId;
  req.user
    .removeFromCart(prodId)
    .then(() => res.redirect("/cart"))
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      console.log(err);
      return next(error);
    });
};

exports.getCheckout = (req, res, next) => {
  let products;
  let total;
  req.user
    .populate("cart.items.product")
    .execPopulate()
    .then((user) => {
      products = user.cart.items;
      total = 0;
      products.forEach((p) => {
        total += p.quantity * p.product.price;
      });
      return stripe.checkout.sessions
        .create({
          payment_method_types: ["card"],
          line_items: products.map((p) => {
            return {
              name: p.product.title,
              description: p.product.description,
              amount: p.product.price * 100,
              currency: "usd",
              quantity: p.quantity,
            };
          }),
          success_url:
            req.protocol + "://" + req.get("host") + "/checkout/success",
          cancel_url:
            req.protocol + "://" + req.get("host") + "/checkout/cancel",
        })
        .then((session) => {
          res.render("shop/checkout", {
            path: "/checkout",
            pageTitle: "Checkout",
            products: products,
            totalSum: total.toFixed(2),
            sessionId: session.id,
          });
        });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      return next(error);
    });
};

exports.getCheckOutSuccess = (req, res, next) => {
  req.user
    .populate("cart.items.product")
    .execPopulate()
    .then((user) => {
      const products = user.cart.items.map((item) => {
        return { quantity: item.quantity, product: item.product._doc };
      });
      const order = new Order({
        user: {
          name: req.user.email,
          userId: req.user._id,
        },
        products: products,
      });
      return order.save();
    })
    .then(() => req.user.clearCart())
    .then(() => res.redirect("/orders"))
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      console.log(err);
      return next(error);
    });
};

exports.postOrder = (req, res, next) => {
  req.user
    .populate("cart.items.product")
    .execPopulate()
    .then((user) => {
      const products = user.cart.items.map((item) => {
        console.log("ITEM = ", item);
        return { quantity: item.quantity, product: item.product._doc };
      });
      console.log("PRODTCS = ", products);
      const order = new Order({
        user: {
          name: req.user.email,
          userId: req.user._id,
        },
        products: products,
      });
      return order.save();
    })
    .then(() => req.user.clearCart())
    .then(() => res.redirect("/orders"))
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      console.log(err);
      return next(error);
    });
};

exports.getOrders = (req, res, next) => {
  Order.find({ "user.userId": req.user._id })
    .then((orders) => {
      res.render("shop/orders", {
        path: "/orders",
        pageTitle: "Your Orders",
        orders: orders,
      });
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      console.log(err);
      return next(error);
    });
};

exports.getInvoice = (req, res, next) => {
  const orderId = req.params.orderId;
  const invoiceName = orderId + "_" + "invoice.pdf";
  const invoicePath = path.join("data", "invoices", invoiceName);
  let order;
  Order.findById(orderId)
    .then((order) => {
      if (!order) {
        return next(new Error("No Order Found"));
      }
      if (order.user.userId.toString() !== req.user._id.toString()) {
        return next(new Error("Not Authorized!"));
      }
      const pdfDoc = new PDFDocument();
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        "inline; filename='" + invoiceName + "'"
      );
      pdfDoc.pipe(fs.createWriteStream(invoicePath));
      pdfDoc.pipe(res);

      pdfDoc.fontSize(26).text(`INVOICE`, { underline: true });
      pdfDoc.fontSize(26).text(`----------------------------`);
      pdfDoc.fontSize(14).text(`Order Number: ${orderId}`);
      let totalPrice = 0;
      order.products.forEach((prod) => {
        totalPrice += prod.quantity * prod.product.price;
        pdfDoc.text(
          `${prod.product.title} - Quantity (${prod.quantity}) x $${
            prod.product.price
          } = $${prod.quantity * prod.product.price}`
        );
      });
      pdfDoc.text(`Total Price = $${totalPrice}`, { underline: true });
      pdfDoc.end();
    })
    .catch((err) => {
      const error = new Error(err);
      error.httpStatusCode = 500;
      console.log(err);
      return next(error);
    });
};
