const express = require("express");
const router = express.Router();
const passport = require("passport");
const mongoose = require("mongoose");
const async = require("async");
const cloudinary = require("cloudinary");

const isEmpty = require("../../validation/isEmpty");
const {Brand} = require("../../models/product/brand");
const Users = require("../../models/user/user");
const {Products} = require("../../models/product/product");
const {Categories} = require("../../models/product/category");
const {SubCategories} = require("../../models/product/subCategory");

const admin = require("../../middleware/admin");

//=================================
//             PRODUCTS
//=================================

//search bar filter for users or sellers
// public
router.get("/filter", (req, res) => {
  Users.find(
      {
        firstLocation: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: [
                parseFloat(req.body.longitude),
                parseFloat(req.body.latitude)
              ]
            },
            $minDistance: 0,
            $maxDistance: 100000
          }
        }
      },
      (err, sellers) => {
        if (err) return res.status(400).json({success: false, err});
        return res.json({sellers});
      }
  );
});
/*
 * search for products with in specified distance from current location of user
 * public
 *
 * */
router.post("/searchBar", (req, res) => {
  console.log(req.body)
  // only longitude, latitude are required ... for default load on shop page
  let {longitude, latitude, page = 1, perPage = 4, sortBy = "Price: Low to High", dist = 300, search = 'inspiron', category } = req.body;

  let sortPath = 'price';// default Price: Low to High
  if (sortBy === 'Price: High to Low') {
    sortPath = '-price';
  } else if (sortBy === "Ratings: Above average") {
    sortPath = '-rates.rate';
  }
  if (dist === 'More than 600') { // dist !== 10 && dist !==30 && dist !==60 && dist !== 150 && dist !==300 && dist !==600
    dist = 1000000
  }
  let searchArr = search.split(" ");
  let searchString = searchArr.join(`|`);

  const options = {
    page: parseInt(page, 10),
    limit: parseInt(perPage, 10),
    sort: `${sortPath}`,// can pass string or object see mongoose for detail
    //populate:'brand category subCategory sellerId'
    populate: [
      {
        path: 'sellerId',
        model: 'users',
        select: 'name'// sending only name instead of complete seller info
      },
      {
        path: 'category',
        model: 'Categories'
      },
      {
        path: 'brand',
        model: 'Brand'
      },
      {
        path: 'subCategory',
        model: 'SubCategories'
      }
    ]
  };
  if (!isEmpty(category) && category !== "null") {
    console.log('filter using category')
    Products.paginate({
      sellerLocation: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [
              +longitude,
              +latitude
            ]
          },
          $minDistance: 0,
          $maxDistance: +dist * 1000
        }
      },
      category: mongoose.Types.ObjectId(category),
      // ALL OF THESE METHODS WORKS WELL
      //name:{$in:[new RegExp(searchArr[0], "gi"), new RegExp(searchArr[1], "gi")]}
      name: {$regex: new RegExp(searchString, "g"), $options: "i"}
      //   $or: [
      //   {name: new RegExp(searchArr[0], "gi")},
      //   //{name: new RegExp(searchArr[1], "gi")},
      // ]

    }, options, (err, products) => {
      if (err) {
        console.log(err);
        res.status(400).json({success: false});
      }
      console.log(products)
      res.json({success: true, products});
    })
  } else {
    Products.paginate({
      sellerLocation: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [
              +longitude,
              +latitude
            ]
          },
          $minDistance: 0,
          $maxDistance: +dist * 100000
        }
      },
      // ALL OF THESE METHODS WORKS WELL
      //name:{$in:[new RegExp(searchArr[0], "gi"), new RegExp(searchArr[1], "gi")]}
      name: {$regex: new RegExp(searchString, "g"), $options: "i"},
      //   $or: [
      //   {name: new RegExp(searchArr[0], "gi")},
      //   //{name: new RegExp(searchArr[1], "gi")},
      // ]

    }, options, (err, products) => {
      if (err) {
        console.log(err);
        res.status(400).json({success: false});
      }
      console.log(products)
      res.json({success: true, products});
    })
  }


});
// for shop page filters
// public

// for landing page
//public
// BY ARRIVAL
// /articles?sortBy=createdAt&order=desc&limit=4

// BY SELL
// /articles?sortBy=sold&order=desc&limit=4
router.get("/articles", (req, res) => {
  let order = req.query.order ? req.query.order : "asc";
  let sortBy = req.query.sortBy ? req.query.sortBy : "_id";
  let limit = req.query.limit ? parseInt(req.query.limit) : 100; // limit should be a number

  Products.find()
      .populate("brand sellerId")
      .sort([[sortBy, order]])
      .limit(limit)
      .then(articles => {
        res.send(articles);
      })
      .catch(err => res.status(500).json(err));
});
// Public -- return single or multiple products separated by coma as shown below
/// /api/product/article?id=HSHSHSKSK,JSJSJSJS,SDSDHHSHDS,JSJJSDJ
router.get("/productById", (req, res) => {
  let items = req.query.id;

  let ids = items.split(",");
  items = [];
  items = ids.map(item => {
    return mongoose.Types.ObjectId(item); // mongoDB only search with objectId not string id
  });

  Products.find({_id: {$in: items}})
      .populate('brand category subCategory sellerId')
      .exec((err, docs) => {
        return res.status(200).send(docs);
      });
});
// all product by one seller
// /api/product/allProductsBySellerId?id=sjdfsfsfsfsdffdghfgh
router.get(
    "/allProductsBySellerId",
    passport.authenticate("jwt", {session: false}),
    admin,
    (req, res) => {
      console.log(req.query);
      let sellerId = req.query.id;
      const {page, perPage} = req.query;
      const options = {
        page: page ? parseInt(page, 10) : 1,
        limit: perPage ? parseInt(perPage, 10) : 8,
        sort: {updatedAt: -1},
        //populate:'brand category subCategory sellerId'
        populate: [
          {
            path: 'sellerId',
            model: 'users',
            select: 'name'// sending only name instead of complete seller info
          },
          {
            path: 'category',
            model: 'Categories'
          },
          {
            path: 'brand',
            model: 'Brand'
          },
          {
            path: 'subCategory',
            model: 'SubCategories'
          }
        ]
      };
      Products.paginate({sellerId: sellerId}, options, (err, products) => {
        if (err) {
          console.log(err);
          res.status(400).json({success: false});
        }
        res.json({success: true, products});
      })
    }
);
// adding new products
// private --- role=1
router.post(
    "/newProduct",
    passport.authenticate("jwt", {session: false}),
    admin,
    (req, res) => {
      // rules for multi document transaction
      /*
       * always follow the below pattern
       * first start session then start transaction
       * always add {session} as option on every operation
       * in mongoose find() findOne() require second parameter as projection if not required pass null and then 3rd parameter as {session}
       * to use .save() on docs .. first add session as ... sdoc.$session() to include doc in session
       * always use async lib methods such as waterfall, parallel, each, series etc to make transaction easier
       *
       * */
      addNewProduct();

      async function addNewProduct() {
        const session = await mongoose.startSession();

        session.startTransaction({
          readConcern: {level: "snapshot"},
          writeConcern: {w: "majority"}
        });

        let opts = {session};

        let taskOne = callback => {
          Products.create([req.body], opts, (err, product) => {
            if (err) {
              callback(err, null);
            } else if (product) {
              callback(null, product);
            }
          });
        };

        let taskTwo = (product, callback) => {
          Users.findOne({_id: req.user.id}, null, opts, (err, user) => {
            if (isEmpty(user)) {
              callback(err, null);
            } else if (err) {
              callback(err, null);
            } else if (user) {
              user.$session();
              if (user.productCategories.length > 0) {
                let productCategoryIndex = user.productCategories.findIndex(
                    item =>
                        !!(
                            item.categoryId.toString() ===
                            product[0].category.toString()
                        )
                );
                if (productCategoryIndex < 0) {
                  user.productCategories.push({
                    categoryId: product[0].category
                  });

                  user.save((err, newUser) => {
                    if (err) {
                      callback(err, null);
                    } else if (newUser) {
                      let result = {
                        newProduct: product[0],
                        updatedSeller: newUser
                      };
                      callback(null, result);
                    }
                  });
                } else {
                  let result = {
                    newProduct: product[0]
                  };
                  callback(null, result);
                }
              } else {
                user.productCategories.push({categoryId: product[0].category});

                user.save((err, newUser) => {
                  if (err) {
                    callback(err, null);
                  } else if (newUser) {
                    let result = {
                      newProduct: product[0],
                      updatedSeller: newUser
                    };
                    callback(null, result);
                  }
                });
              }
            }
          });
        };
        let task = [];
        task[0] = taskOne;
        task[1] = taskTwo;

        async.waterfall(task, (err, result) => {
          if (err) {
            session.abortTransaction(() => {
              session.endSession();
              console.log("transaction aborted");
              console.log(err);
              res.status(400).json({success: false, err});
            });
          } else {
            if (result) {
              session.commitTransaction(() => {
                session.endSession();
                console.log("transaction committed");
                res.status(200).json({success: true, result});
              });
            }
          }
        });
      }
    }
);
// delete product and related images if any
// private admin
// api/product/deleteProduct?id=jljfjlldfgdfjdfj
router.delete(
    "/deleteProduct",
    passport.authenticate("jwt", {session: false}),
    admin,
    (req, res) => {
      Products.findById(req.query.id, (err, productToDelete) => {
        if (err) {
          console.log(err);
          res.status(400).json({success: false, msg: "product not found"});
        } else {
          console.log(productToDelete)
          if (!isEmpty(productToDelete)) {
            deleteProduct()
          } else {
            res.status(400).json({success: false, msg: 'product not found'})
          }

          function deleteProduct() {
            let taskOne = () => {
              let imagesToDelete = [];

              if (!isEmpty(productToDelete.images)) {// if no image we will return empty array to async

                imagesToDelete = productToDelete.images.map(item => {
                  return function (callback) {
                    cloudinary.uploader.destroy(item.public_id, result => {
                      console.log(result);
                      if (result.result === "ok") {
                        callback(null, result)
                      } else {
                        callback(result, null)
                      }
                    });
                  }
                })
              }

              return imagesToDelete
            };

            let taskTwo = (callback) => {
              Products.findOneAndRemove({_id: productToDelete._id}, (error, rslt) => {
                if (error) {
                  callback(error, null)
                } else {
                  callback(null, rslt)
                }
              })
            };
            let task = [...taskOne()];// delete all images from cloudinary if any ..
            // if no image to delete then we will have only task 2 to complete
            task.push(taskTwo)// then delete product

            async.series(task, (errors, result) => {
              if (errors) {
                console.log(errors);
                res.status(400).json({success: false, errors});
              } else {
                if (result) {
                  console.log("deleting product completed");
                  res.status(200).json({success: true, result});
                }
              }
            });
          }
        }
      });
    }
);

router.post(
    "/updateProduct",
    passport.authenticate("jwt", {session: false}),
    (req, res) => {
      Products.findOneAndUpdate(
          {_id: req.query.id},
          {
            $set: req.body
          },
          {new: true},
          (err, doc) => {
            if (err) return res.status(400).json({success: false, err});
            if (!doc) return res.status(400).json({success: false, msg: 'product not found'});
            return res.status(200).json({
              success: true,
              product: doc
            });
          }
      );
    }
);

//=================================
//              BRAND
//=================================
/*
 * create new brand
 * private -- admin
 * */
router.post(
    "/newBrand",
    passport.authenticate("jwt", {session: false}),
    admin,
    (req, res) => {
      let regex = req.body.name;
      Brand.findOne({name: {$regex: regex, $options: "i"}}, (err, brand) => {
        if (err) return res.status(400).json({success: false, err});

        if (brand) {
          return res
              .status(400)
              .json({success: false, msg: "Brand name already exists"});
        }

        const newBrand = new Brand(req.body);

        newBrand.save((err, doc) => {
          if (err) return res.json({success: false, err});
          res.status(200).json({
            success: true,
            newBrand: doc
          });
        });
      });
    }
);
/*
 * get all brand
 * public
 */
router.get("/allBrands", (req, res) => {
  Brand.find({}, (err, brands) => {
    if (err) return res.status(400).send(err);
    res.status(200).send(brands);
  });
});

//=================================
//              CATEGORIES
//=================================
/*
 * Private only admin
 * create unique categories
 *
 * */
router.post(
    "/categories",
    passport.authenticate("jwt", {session: false}),
    admin,
    (req, res) => {
      Categories.findOne({category: req.body.category}, (err, cat) => {
        console.log(cat);
        if (cat && cat.category === req.body.category) {
          res
              .status(400)
              .json({success: false, msg: "category already exists"});
        } else {
          const category = new Categories(req.body);

          category.save((err, doc) => {
            if (err) return res.json({success: false, err});
            res.status(200).json({
              success: true,
              doc
            });
          });
        }
      });
    }
);

/*
 * Private --- only admin allowed
 * update category by id
 * */
router.post(
    "/updateCategories/:id",
    passport.authenticate("jwt", {session: false}),
    admin,
    (req, res) => {
      Categories.findByIdAndUpdate(
          req.params.id,
          {$set: {category: req.body.category}},
          {new: true},
          (err, doc) => {
            if (err) return res.status(400).json({success: false, error: err});
            res.json({success: true, doc});
          }
      );
    }
);
/*
 * Public
 * get single category by id
 * */
router.get("/categories/:id", (req, res) => {
  Categories.findOne({_id: req.params.id}, (err, doc) => {
    if (err) return res.status(400).json({success: false, error: err});
    res.json({success: true, doc});
  });
});
/* Private --- only admin allowed
 * delete single category by id
 * */
router.delete("/categories/:id", (req, res) => {
  Categories.findOneAndRemove({_id: req.params.id}, (err, doc) => {
    if (err) return res.status(400).json({success: false, error: err});
    res.json({success: true, doc});
  });
});
/*
 Public
* get all categories
* */
router.get("/categories", (req, res) => {
  Categories.find({}, (err, categories) => {
    if (err) return res.status(400).send(err);
    res.status(200).send(categories);
  });
});

//=================================
//              SUBCATEGORIES
//=================================
/*
 * Private only admin
 * create unique subCategories
 *
 * */
router.post(
    "/subCategories",
    passport.authenticate("jwt", {session: false}),
    admin,
    (req, res) => {
      SubCategories.findOne(
          {subCategory: req.body.subCategory},
          (err, subCat) => {
            console.log(subCat);
            console.log(req.body);
            if (err) {
              return res.json({success: false, err});
            } else if (subCat && subCat.subCategory === req.body.subCategory) {
              return res
                  .status(400)
                  .json({success: false, msg: "subCategory already exists"});
            } else {
              let data = {
                category: mongoose.Types.ObjectId(req.body.category),
                subCategory: req.body.subCategory
              };
              const subCategory = new SubCategories(data);

              subCategory.save((err, doc) => {
                if (err) return res.json({success: false, err});
                res.status(200).json({
                  success: true,
                  doc
                });
              });
            }
          }
      );
    }
);

/*
 * Private --- only admin allowed
 * update subCategory by id
 * */
router.post(
    "/updateSubCategories/:id",
    passport.authenticate("jwt", {session: false}),
    admin,
    (req, res) => {
      SubCategories.findByIdAndUpdate(
          req.params.id,
          {$set: {subCategory: req.body.subCategory}},
          {new: true},
          (err, doc) => {
            if (err) return res.status(400).json({success: false, error: err});
            res.json({success: true, doc});
          }
      );
    }
);
/*
 * Public
 * get single subCategory by id
 * */
router.get("/subCategories/:id", (req, res) => {
  SubCategories.findOne({_id: req.params.id}, (err, doc) => {
    if (err) return res.status(400).json({success: false, error: err});
    res.json({success: true, doc});
  });
});
/* Private --- only admin allowed
 * delete single subCategory by id
 * */
router.delete("/subCategories/:id", (req, res) => {
  SubCategories.findOneAndRemove({_id: req.params.id}, (err, doc) => {
    if (err) return res.status(400).json({success: false, error: err});
    res.json({success: true, doc});
  });
});
/*
 Public
* get all categories
* */
router.get("/subCategories", (req, res) => {
  SubCategories.find({}, (err, categories) => {
    if (err) return res.status(400).send(err);
    res.status(200).send(categories);
  });
});

module.exports = router;
