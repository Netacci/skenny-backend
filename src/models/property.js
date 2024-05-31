import mongoose from 'mongoose';
import validator from 'validator';

const propertySchema = new mongoose.Schema(
  {
    first_name: {
      type: String,
      required: true,
      trim: true,
    },
    last_name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      validate(value) {
        if (!validator.isEmail(value)) {
          throw new Error(`Invalid email: ${value}`);
        }
      },
    },
    phone_number: {
      type: String,
      trim: true,
      unique: true,
      required: true,
      validate(value) {
        if (!validator.isMobilePhone(value)) {
          throw new Error(`Invalid phone number: ${value}`);
        }
      },
    },
    password: {
      type: String,
      required: true,
      trim: true,
      minlength: 8,
      validate(value) {
        if (!validator.isStrongPassword(value)) {
          throw new Error(
            `Weak password: ${value}. Your password must include lowercase, uppercase, digits, symbols and must be at least 8 characters`
          );
        }
      },
    },
    account_type: {
      type: String,
      required: true,
      enum: ['realtor', 'individual'],
    },
  },
  {
    timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' },
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

const Property = mongoose.model('Property', propertySchema);
export default Property;
