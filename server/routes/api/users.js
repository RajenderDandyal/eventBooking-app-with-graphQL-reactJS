const express = require("express");
const router = express.Router();
let mongoose = require("mongoose");
const uuidv1 = require('uuid/v1');
const async = require("async");

const Users = require("../../models/user/user");
const {Products} = require("../../models/product/product");
const {Payment} = require("../../models/payment/payment");



const passport = require("passport");
const validateRegisterInput = require("../../validation/register");
const validateLoginInput = require("../../validation/login");
const admin = require("../../middleware/admin");

const formidable = require("express-formidable");
const cloudinary = require("cloudinary");
const isEmpty = require('../../validation/isEmpty');
// @route  GET api/users/test
// @desc   Tests users route
// @access Public
router.get("/test", (req, res) => res.json({msg: "user works"}));

// @route  POST api/users/register
// @desc   adding new user
// @access Public
/*
 * steps for registering new user
 * 1 first validate the incoming data
 * 1 find user on data base with email
 * 2 if user exists then send res.status(400).json(response msg)
 * 4 creating newUser object from req body to save on database
 * 5 hashing password using bcrypt
 * 6 saving newUser to database
 * */
router.post("/register", (req, res) => {
  //server side validation of incoming data

  const {errors, isValid} = validateRegisterInput(req.body);
  if (!isValid) {
    return res.status(400).json(errors);
  }
  //checking if email already exists on db
  Users.findOne({email: req.body.email}).then(user => {
    if (user) {
      // if user email already exists
      // then setting response status to 400(bad request) with json msg
      errors.email = "Email already exists";
      return res.status(400).json(errors);
    } else {
      // creating newUser object from req body to save on database
      let locationObject = {
        type: "Point",
        coordinates: [
          parseFloat(req.body.longitude),
          parseFloat(req.body.latitude)
        ] // longitude first
      };

      const newUser = new Users({
        name: req.body.name,
        email: req.body.email,
        role: req.body.registeringAs === "buyer" ? 0 : 1,
        password: req.body.password,
        contactNumber: req.body.contactNumber,
        registeringAs: req.body.registeringAs,
        company: req.body.company,
        firstLocation: locationObject,
        currentLocation: locationObject
      });

      //saving newUser to database
      newUser
          .save()
          .then(user => res.json(user))
          .catch(err => console.log(err));
    }
  });
});

// @route  GET api/users/login
// @desc   loging in user / receiving token from server
// @access Public
/*
 * steps for login and receiving  jwt authentication token from server
 * 1 first validate the incoming data
 * 1 find user on data base with email
 * 2 if user exists then compare pasword hash with bcrypt
 * 3 create token and sending it to user
 * */
router.post("/login", (req, res) => {
  //server side validation of incoming data
  console.log(req.body);
  const {errors, isValid} = validateLoginInput(req.body);
  if (!isValid) {
    return res.status(400).json(errors);
  }
  const email = req.body.email;
  const password = req.body.password;

  Users.findOne({email: email}).then(user => {
    if (!user) {
      errors.email = "User not found";
      return res.status(404).json(errors);
    }
    user.comparePassword(password, (err, isMatch) => {
      if (!isMatch) {
        errors.incorrectPassword = "Password is incorrect";
        return res.status(400).json(errors);
      }

      user.generateToken((err, token) => {
        let bearerToken = "Bearer " + token;
        user.token = bearerToken;
        user.save().then(user => {
          //dont send bearer in cookie .. see cookieExtractor it require naked token w/o scheme
          if (process.env.NODE_ENV === "production") {
            res.status(200).json({
              success: true,
              user
            });
          }
          if (process.env.NODE_ENV !== "production") {
            res
                .cookie("jwt", token)
                .status(200)
                .json({
                  success: true,
                  user
                });
          }
        });
      });
    });
  });
});
// @route  GET api/users/logout
// @desc   removing token from User collection
// @access protected

router.get(
    "/logout",
    passport.authenticate("jwt", {session: false}),
    (req, res) => {
      Users.findOneAndUpdate({_id: req.user._id}, {token: ""}, (err, doc) => {
        if (err) return res.json({success: false, err});

        if (process.env.NODE_ENV !== "production") {
          return res
              .clearCookie("jwt", {path: "/"})
              .status(200)
              .json({
                success: true
              });
        }
        return res.status(200).json({
          success: true
        });
      });
    }
);

// @route  GET api/users/current
// @desc   current user profile
// @access protected
/*

* Steps for authenticating users for protected route using jwt authentication token from server
* 1 inside server.js/app.js apply passport middleware
app.use(passport.initialize());
2 create the passport.js file in config folder and apply middleware function on passport
then require that in server.js as
 running the exported function from "./config/passport" with passport as parameter
require("./config/passport")(passport);
in passport.js we attached the user info to request before it reached the router.get('/current) below
3 then access the user and send the res inside route.get('/current)
* */
router.get(
    "/current",
    passport.authenticate("jwt", {session: false}),
    (req, res) => {
      res.json({
        user: req.user
      });
    }
);
// update user account details
// private
router.post(
    "/updateAccount",
    passport.authenticate("jwt", {session: false}),
    (req, res) => {
      Users.findOneAndUpdate(
          {_id: req.user._id},
          {
            $set: req.body
          },
          {new: true},
          (err, doc) => {
            if (err) return res.json({success: false, err});
            return res.status(200).json({
              success: true,
              user: doc
            });
          }
      );
    }
);

// post -- /api/users/addTOCart -- private
// localhost:3000/api/users/addToCart?productId=djsdjfljdjflsdjjdfj
router.post(
    "/addToCart",
    passport.authenticate("jwt", {session: false}),
    (req, res) => {
      let cartProduct = {};

      let duplicate = false;

      req.user.cart.forEach(item => {
        if (item.id.toString() === req.query.productId) {
          duplicate = true;
        }
      });

      if (duplicate) {
        Users.findOneAndUpdate(
            {
              _id: req.user._id,
              "cart.id": mongoose.Types.ObjectId(req.query.productId)
            },
            {$inc: {"cart.$.quantity": 1}},
            {new: true},
            (err, doc) => {
              if (err) return res.status(400).json({success: false, err});
              res.status(200).json(doc.cart);
            }
        );
      } else {
        Products.find({_id: req.query.productId})
            .populate("brand")
            .exec((err, doc) => {
              cartProduct.id = mongoose.Types.ObjectId(req.query.productId);
              cartProduct.name = doc[0].name;
              cartProduct.brand = doc[0].brand.name;
              cartProduct.discountPrice = doc[0].discountPrice;
              cartProduct.image =
                  doc[0].images.length > 0 ? doc[0].images[0] : null;
              cartProduct.quantity = 1;
              cartProduct.date = Date.now();

              Users.findOneAndUpdate(
                  {_id: req.user._id},
                  {
                    $push: {
                      cart: cartProduct
                    }
                  },
                  {new: true},
                  (err, doc) => {
                    if (err) return res.status(400).json({success: false, err});
                    res.status(200).json(doc.cart);
                  }
              );
            });
      }
    }
);

// get -- /api/users/removeFromCart -- private
// localhost:3000/api/users/removeFromCart?productId=djsdjfljdjflsdjjdfj
router.get(
    "/removeFromCart",
    passport.authenticate("jwt", {session: false}),
    (req, res) => {
      Users.findOneAndUpdate(
          {_id: req.user._id},
          {
            $pull: {cart: {id: mongoose.Types.ObjectId(req.query.productId)}}
          },
          {new: true},
          (err, doc) => {
            if (err) throw err;
            res.json(doc.cart);
          }
      );
    }
);

// get -- /api/users/reduceFromCart -- private
// localhost:3000/api/users/reduceFromCart?productId=djsdjfljdjflsdjjdfj
router.get(
    "/reduceFromCart",
    passport.authenticate("jwt", {session: false}),
    (req, res) => {
      Users.findOneAndUpdate(
          {
            _id: req.user._id,
            "cart.id": mongoose.Types.ObjectId(req.query.productId)
          },
          {$inc: {"cart.$.quantity": -1}},
          {new: true},
          (err, doc) => {
            if (err) return res.status(400).json({success: false, err});
            res.status(200).json(doc.cart);
          }
      );
    }
);

router.post(
    "/successBuy",
    passport.authenticate("jwt", {session: false}),
    (req, res) => {
      let history = [];
      let transactionData = {};

      /*req.body:
       {
           paymentData{}
       }*/
      // user history
      req.user.cart.forEach(item => {
        history.push({
          dateOfPurchase: Date.now(),
          name: item.name,
          brand: item.brand,
          id: item.id,
          price: item.price,
          quantity: item.quantity,
          paymentId: req.body.paymentData.paymentID
        });
      });

      // PAYMENTS DASH
      transactionData.user = {
        id: req.user._id,
        name: req.user.name,
        lastname: req.user.lastname,
        email: req.user.email,
        shippingAddress: req.body.paymentData.address
      };
      transactionData.data = {
        ...req.body.paymentData
      };
      transactionData.product = history;

      Users.findOneAndUpdate(
          {_id: req.user._id},
          {$push: {ordersHistory: history}, $set: {cart: []}},
          {new: true},
          (err, user) => {
            if (err) return res.status(400).json({success: false, err});

            const payment = new Payment(transactionData);
            payment.save((err, doc) => {
              if (err) return res.status(400).json({success: false, err});

              // updating product.sold field for all product in cart-- we need product id and quantity sold
              let products = [];
              doc.product.forEach(item => {
                products.push({id: item.id, quantity: item.quantity});
              });

              async.eachSeries(
                  products,
                  (item, callback) => {
                    Products.update(
                        {_id: item.id},
                        {
                          $inc: {
                            sold: item.quantity
                          }
                        },
                        {new: false},
                        callback
                    );
                  },
                  err => {
                    if (err) return res.json({success: false, err});
                    res.status(200).json(user);
                  }
              );
            });
          }
      );
    }
);

//////////////////////////////////////////
//      ADMIN ROUTES                   //
//                                     //
/////////////////////////////////////////

// api/users/admin/uploadimage
// for edit product query will be --
// api/users/admin/uploadimage?productId=fhfghfdgdsfgsdg
router.post(
    "/admin/uploadimage",
    passport.authenticate("jwt", {session: false}),
    admin,
    formidable(),
    (req, res) => {
      //First add image to cloudinary... then update product data if productId is true.. means editing product

      //cloudinary.uploader.upload(fileToUpload, cb, config)
      cloudinary.uploader.upload(
          req.files.file.path,
          result => {
            let productId = req.query.productId;
            console.log(productId);

            if (productId) {
              // added image for existing product .. hence updating product data
              Products.findById(productId, (err, prod) => {
                if (err) return res.status(400).json({
                  success: false,
                  msg: 'img uploaded but product data not updated',
                  err
                });
                if (isEmpty(prod)) return res.status(400).json({
                  success: false,
                  msg: 'img uploaded but product data not updated bcoz prod not found'
                })
                let newImgArr = isEmpty(prod.images) ? [] : prod.images;
                newImgArr.push({
                  public_id: result.public_id,
                  url: result.secure_url
                })
                prod.images = newImgArr;
                prod.save((err, updatedProduct) => {
                  if (err) return res.status(400).json({
                    success: false,
                    msg: 'img uploaded but product data not updated',
                    err
                  });

                  res.json({success: true})

                })
              })
            } else {
              // added image for new product.. hence no product update ..bcoz product dos'nt exists yet
              console.log(result);
              res.status(200).send({
                public_id: result.public_id,
                url: result.secure_url
              });
            }

          },
          {
            public_id: `${uuidv1()}`, //required
            resource_type: "auto",// ex jpeg,png or auto(cloudinary will detect filetype automaticalli)
            quality: "auto:low",
            // transformation: [// not good makes costly
            //   {aspect_ratio: "4:3", crop: "fill"},
            //   {width: "auto", dpr: "auto", crop: "scale"}
            // ]
          }
      );
    }
);

router.get(
    "/admin/removeimage",
    passport.authenticate("jwt", {session: false}),
    admin,
    (req, res) => {
      let image_id = `${req.query.public_id}`;
      let productId = req.query.productId;
      console.log(image_id, productId);

      //First update product data for images then delete image from cloudinary
      if (productId) {
        Products.findById(productId, (err, prod) => {
          if (err) return res.status(400).json({success: false, err});
          if (isEmpty(prod)) return res.status(400).json({success: false, msg: 'prod not found'})

          if (!isEmpty(prod.images)) {
            prod.images = prod.images.filter(item => item.public_id !== image_id)
            prod.save((err, doc) => {
              if (err) return res.status(400).json({success: false, err})
              cloudinary.uploader.destroy(image_id, response => {
                console.log(response);
                if (response.result === "ok") {
                  return res.status(200).send("ok");
                }
                res.status(400).json({succes: false});
              });
            })
          } else {
            cloudinary.uploader.destroy(image_id, response => {
              console.log(response);
              if (response.result === "ok") {
                return res.status(200).send("ok");
              }
              res.status(400).json({succes: false});
            });
          }
        })
      } else {
        cloudinary.uploader.destroy(image_id, response => {
          console.log(response);
          if (response.result === "ok") {
            return res.status(200).send("ok");
          }
          res.status(400).json({succes: false});
        });
      }
    }
);

router.post(
    "/admin/removeMultipleImages",
    passport.authenticate("jwt", {session: false}),
    admin,
    (req, res) => {

      let imagesToDelete = req.body;
      console.log(imagesToDelete);

      async.each(imagesToDelete, function (item, callback) {
        cloudinary.uploader.destroy(item.public_id, response => {
          console.log(response);
          if (response.result === "ok") {
            callback()
          } else {
            callback(response)
          }
        });
      }, (err) => {
        if (err) {
          console.log(err);
          res.status(400).json({success: false})
        } else {
          console.log('deleted images');
          res.json({success: true})
        }
      })
    }
);

module.exports = router;
