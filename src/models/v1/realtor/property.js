import mongoose from 'mongoose';
import validator from 'validator';

const realtorPropertiesSchema = new mongoose.Schema(
  {
    property_name: {
      type: String,
      required: true,
      trim: true,
    },
    property_description: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    country: {
      type: String,
      trim: true,
    },
    state: {
      type: String,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    property_details: {
      property_type: {
        type: String,
        trim: true,
      },
      property_status: {
        type: String,
        trim: true,
      },
      property_price: {
        type: String,
        trim: true,
      },
      property_area: {
        type: String,
        trim: true,
      },
      property_beds: {
        type: String,
        trim: true,
      },
      property_baths: {
        type: String,
        trim: true,
      },
      property_toilets: {
        type: String,
        trim: true,
      },
    },

    property_images: [
      {
        url: {
          type: String,
          required: true,
          trim: true,
        },
        public_id: {
          type: String,
          required: true,
        },
      },
    ],

    feature_image: {
      url: {
        type: String,
        trim: true,
        required: true,
      },
      public_id: {
        type: String,
        required: true,
      },
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Realtor',
      required: true,
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);
realtorPropertiesSchema.index({ property_name: 'text' });
const RealtorProperties = mongoose.model(
  'RealtorProperties',
  realtorPropertiesSchema
);
export default RealtorProperties;
