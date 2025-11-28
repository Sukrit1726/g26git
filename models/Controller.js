// Controller.js
// Generic controller for a Mongoose model (replace `Model` with your model, e.g., Flight)
const { validationResult } = require('express-validator');

/**
 * Simple async wrapper to avoid repeating try/catch.
 * Usage: router.get('/', asyncHandler(controller.method))
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Controller factory - pass in the Mongoose model to get a controller for that model.
 * Example: const flightController = createController(require('../models/Flight'));
 */
const createController = (Model) => {
  return {
    // Create a new document
    create: asyncHandler(async (req, res) => {
      // optional: express-validator usage
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

      const payload = req.body;
      const doc = new Model(payload);
      await doc.save();
      return res.status(201).json({ success: true, data: doc });
    }),

    // Get paginated list
    getAll: asyncHandler(async (req, res) => {
      const page = Math.max(1, parseInt(req.query.page || '1', 10));
      const limit = Math.min(100, parseInt(req.query.limit || '25', 10));
      const skip = (page - 1) * limit;

      // optional: filtering from query params
      const filter = {};
      if (req.query.q) {
        // basic text search assuming model has text index
        filter.$text = { $search: req.query.q };
      }

      const [total, items] = await Promise.all([
        Model.countDocuments(filter),
        Model.find(filter).skip(skip).limit(limit).lean()
      ]);

      return res.json({
        success: true,
        meta: { page, limit, total, pages: Math.ceil(total / limit) },
        data: items
      });
    }),

    // Get single by id
    getById: asyncHandler(async (req, res) => {
      const { id } = req.params;
      const doc = await Model.findById(id).lean();
      if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
      return res.json({ success: true, data: doc });
    }),

    // Update by id (partial)
    update: asyncHandler(async (req, res) => {
      const { id } = req.params;
      const payload = req.body;
      const doc = await Model.findByIdAndUpdate(id, payload, { new: true, runValidators: true }).lean();
      if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
      return res.json({ success: true, data: doc });
    }),

    // Delete by id
    remove: asyncHandler(async (req, res) => {
      const { id } = req.params;
      const doc = await Model.findByIdAndDelete(id).lean();
      if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
      return res.json({ success: true, message: 'Deleted' });
    }),

    // Example custom action: toggle a boolean flag
    toggleFlag: asyncHandler(async (req, res) => {
      const { id } = req.params;
      const doc = await Model.findById(id);
      if (!doc) return res.status(404).json({ success: false, message: 'Not found' });
      doc.active = !doc.active;
      await doc.save();
      return res.json({ success: true, data: doc });
    })
  };
};

module.exports = { createController, asyncHandler };
