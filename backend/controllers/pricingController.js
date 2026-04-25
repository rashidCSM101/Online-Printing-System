import PrintPricing from '../models/PrintPricing.js';

// @desc    Get pricing (public — returns default if no shop pricing set)
// @route   GET /api/pricing
// @access  Public
export const getPricing = async (req, res) => {
  try {
    // Return the first approved shop's pricing, or defaults
    const pricing = await PrintPricing.findOne().sort({ updatedAt: -1 });
    if (pricing) {
      return res.json(pricing);
    }
    // Return schema defaults as a plain object
    res.json({
      blackWhiteNormal: 3,
      blackWhiteGlossy: 5,
      blackWhiteMatte: 5,
      colorNormal: 10,
      colorGlossy: 15,
      colorMatte: 15,
      bindingStaple: 10,
      bindingSpiral: 30,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get shop owner's own pricing
// @route   GET /api/pricing/my
// @access  Shop Owner
export const getMyPricing = async (req, res) => {
  try {
    const pricing = await PrintPricing.findOne({ shopOwner: req.user._id });
    if (!pricing) {
      // Return defaults
      return res.json({
        blackWhiteNormal: 3,
        blackWhiteGlossy: 5,
        blackWhiteMatte: 5,
        colorNormal: 10,
        colorGlossy: 15,
        colorMatte: 15,
        bindingStaple: 10,
        bindingSpiral: 30,
      });
    }
    res.json(pricing);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create or update shop owner's pricing
// @route   PUT /api/pricing/my
// @access  Shop Owner
export const upsertMyPricing = async (req, res) => {
  try {
    const {
      blackWhiteNormal, blackWhiteGlossy, blackWhiteMatte,
      colorNormal, colorGlossy, colorMatte,
      bindingStaple, bindingSpiral,
    } = req.body;

    // Validate all values are non-negative numbers
    const fields = { blackWhiteNormal, blackWhiteGlossy, blackWhiteMatte, colorNormal, colorGlossy, colorMatte, bindingStaple, bindingSpiral };
    for (const [key, val] of Object.entries(fields)) {
      if (val !== undefined && (isNaN(Number(val)) || Number(val) < 0)) {
        return res.status(400).json({ message: `Invalid value for ${key}. Must be a non-negative number.` });
      }
    }

    const update = {};
    for (const [key, val] of Object.entries(fields)) {
      if (val !== undefined) update[key] = Number(val);
    }

    const pricing = await PrintPricing.findOneAndUpdate(
      { shopOwner: req.user._id },
      { $set: update },
      { new: true, upsert: true, runValidators: true }
    );

    res.json({ message: 'Pricing updated successfully.', pricing });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
