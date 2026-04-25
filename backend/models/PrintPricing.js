import mongoose from 'mongoose';

// One pricing record per shop owner.
// Stores per-page prices for each combination of printType + paperType.
const printPricingSchema = new mongoose.Schema(
  {
    shopOwner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    // Per-page base prices (in Rs.)
    blackWhiteNormal:  { type: Number, default: 3 },
    blackWhiteGlossy:  { type: Number, default: 5 },
    blackWhiteMatte:   { type: Number, default: 5 },
    colorNormal:       { type: Number, default: 10 },
    colorGlossy:       { type: Number, default: 15 },
    colorMatte:        { type: Number, default: 15 },
    // Binding surcharge (flat per order)
    bindingStaple:     { type: Number, default: 10 },
    bindingSpiral:     { type: Number, default: 30 },
  },
  { timestamps: true }
);

const PrintPricing = mongoose.model('PrintPricing', printPricingSchema);
export default PrintPricing;
