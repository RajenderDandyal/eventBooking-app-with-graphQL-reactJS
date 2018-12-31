const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const mongoosePaginate = require('mongoose-paginate');

const GeoSchema = new Schema({
  type: {
    type: String,
    default: "Point"
  },
  coordinates: {
    type: []
  }
});

const productSchema = mongoose.Schema(
  {
    name: {
      required: true,
      type: String,
      maxlength: 100
    },
    description: {
      required: true,
      type: String,
      maxlength: 100000
    },
    specification: {
      type: String,
      maxlength: 100000
    },
    price: {
      required: true,
      type: Number,
      maxlength: 255
    },
    discountPrice: {
      type: Number
    },
    brand: {
      type: Schema.Types.ObjectId, // same as ,.. mongoose.Schema.Type.ObjectId
      ref: "Brand"
    },
    category: {
      type: Schema.Types.ObjectId, // same as ,.. mongoose.Schema.Type.ObjectId
      ref: "Categories",
      required: true
    },
    subCategory: {
      type: Schema.Types.ObjectId, // same as ,.. mongoose.Schema.Type.ObjectId
      ref: "SubCategories",
      required: true
    },
    rates: [
      {
        client_id: {
          type: Schema.Types.ObjectId,
          ref: "users"
        },
        rate: {
          type: Number
        },
        review: {
          type: String
        }
      }
    ],
    sellerId: {
      type: Schema.Types.ObjectId,
      ref: "users",
      required: true
    },

    sellerLocation: GeoSchema,

    shipping: {
      type: Boolean,
      default: true
    },
    condition: {
      type: String,
      default: "new" // two values new and old
    },
    available: {
      required: true,
      type: Boolean,
      default: true
    },
    sold: {
      type: Number,
      default: 0
    },
    publish: {
      required: true,
      type: Boolean,
      default: true
    },
    images: {
      type: Array,
      default: []
    }
  },
  { timestamps: true }
);

productSchema.index({ sellerLocation: "2dsphere" });
productSchema.index({ name: "text" });
productSchema.plugin(mongoosePaginate);

const Products = mongoose.model("Product", productSchema);
module.exports = { Products };
