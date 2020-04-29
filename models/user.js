const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const userSchema = new Schema({
  email: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  cart: {
    items: [
      {
        product: {
          type: Schema.Types.ObjectID,
          ref: "Product",
          required: true,
        },
        quantity: { type: Number, reqired: true },
      },
    ],
  },
  resetToken: String,
  resetTokenExpiration: Date,
});

userSchema.methods.addToCart = function (product) {
  const cartProductIndex = this.cart.items.findIndex((item) => {
    return item.product.toString() === product._id.toString();
  });
  let newQuantity = 1;
  const updatedCartItems = [...this.cart.items];
  if (cartProductIndex >= 0) {
    newQuantity = this.cart.items[cartProductIndex].quantity + 1;
    updatedCartItems[cartProductIndex].quantity = newQuantity;
  } else {
    updatedCartItems.push({
      product: product._id,
      quantity: newQuantity,
    });
  }
  const updatedCart = {
    items: updatedCartItems,
  };
  this.cart = updatedCart;

  return this.save();
};

userSchema.methods.getCart = function () {
  const productIds = this.cart.items.map((item) => {
    return item.productId;
  });
  return db
    .collection("products")
    .find({ _id: { $in: productIds } })
    .toArray()
    .then((products) => {
      return products.map((product) => {
        return {
          ...product,
          quantity: this.cart.items.find((item) => {
            return item.productId.toString() === product._id.toString();
          }).quantity,
        };
      });
    })
    .catch((err) => console.log(err));
};

userSchema.methods.removeFromCart = function (prodId) {
  const updatedCartItems = this.cart.items.filter((item) => {
    return item.product.toString() !== prodId.toString();
  });
  this.cart.items = updatedCartItems;
  return this.save();
};

userSchema.methods.clearCart = function () {
  this.cart = { items: [] };
  return this.save();
};

module.exports = mongoose.model("User", userSchema);

// const mongodb = require("mongodb");
// const getDb = require("../util/database").getDb;

// class User {
//   constructor(id, name, email, cart) {
//     this._id = new mongodb.ObjectID(id);
//     this.name = name;
//     this.email = email;
//     this.cart = cart; // {items: []}
//   }

//   save() {
//     const db = getDb();
//     return db
//       .collection("users")
//       .insertOne(this)
//       .then((result) => {
//         console.log("User Created");
//       })
//       .catch((err) => {
//         console.log(err);
//       });
//   }

//   addToCart(product) {
//     const db = getDb();
//     const cartProductIndex = this.cart.items.findIndex((item) => {
//       return item.productId.toString() === product._id.toString();
//     });

//     let newQuantity = 1;
//     const updatedCartItems = [...this.cart.items];

//     if (cartProductIndex >= 0) {
//       newQuantity = this.cart.items[cartProductIndex].quantity + 1;
//       updatedCartItems[cartProductIndex].quantity = newQuantity;
//     } else {
//       updatedCartItems.push({
//         productId: mongodb.ObjectID(product._id),
//         quantity: newQuantity,
//       });
//     }

//     const updatedCart = {
//       items: updatedCartItems,
//     };

//     return db
//       .collection("users")
//       .updateOne(
//         { _id: new mongodb.ObjectID(this._id) },
//         { $set: { cart: updatedCart } }
//       );
//   }

//   getCart() {
//     const db = getDb();
//     const productIds = this.cart.items.map((item) => {
//       return item.productId;
//     });

//     return db
//       .collection("products")
//       .find({ _id: { $in: productIds } })
//       .toArray()
//       .then((products) => {
//         return products.map((product) => {
//           return {
//             ...product,
//             quantity: this.cart.items.find((item) => {
//               return item.productId.toString() === product._id.toString();
//             }).quantity,
//           };
//         });
//       })
//       .catch((err) => console.log(err));
//   }

//   deleteItemFromCart(id) {
// const db = getDb();
// const updatedCartItems = this.cart.items.filter(
//   (item) => item.productId.toString() !== id.toString()
// );
// const updatedCart = {
//   items: updatedCartItems,
// };

// return db
//   .collection("users")
//   .updateOne(
//     { _id: new mongodb.ObjectID(this._id) },
//     { $set: { cart: updatedCart } }
//   );
//   }

//   addOrder() {
//     const db = getDb();
//     return this.getCart()
//       .then((products) => {
//         const order = {
//           user: {
//             _id: new mongodb.ObjectID(this._id),
//             name: this.name,
//             email: this.emal,
//           },
//           items: products,
//         };
//         return db.collection("orders").insertOne(order);
//       })
//       .then((result) => {
//         this.cart = { items: [] };
//         db.collection("users").updateOne(
//           { _id: new mongodb.ObjectID(this._id) },
//           { $set: { cart: { items: [] } } }
//         );
//         console.log("Order Placed");
//       });
//   }

//   getOrders() {
//     const db = getDb();
//     return db.collection("orders").find({ "user._id": this._id }).toArray();
//   }

//   static findById(id) {
//     const db = getDb();
//     return db
//       .collection("users")
//       .findOne({ _id: new mongodb.ObjectID(id) })
//       .then((user) => {
//         console.log("user found");
//         return user;
//       })
//       .catch((err) => console.log(err));
//   }
// }

// module.exports = User;
