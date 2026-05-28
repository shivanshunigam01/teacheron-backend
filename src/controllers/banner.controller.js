export * from './banner.base.controller.js';
import Banner from '../models/Banner.model.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toJSONList } from '../utils/serialize.js';

/** Public: all active banners within schedule (client filters by geo/language/placement). */
export const active = asyncHandler(async (req, res) => {
  const now = new Date();
  const filter = {
    active: true,
    $and: [
      {
        $or: [{ startAt: { $exists: false } }, { startAt: null }, { startAt: { $lte: now } }],
      },
      {
        $or: [{ endAt: { $exists: false } }, { endAt: null }, { endAt: { $gte: now } }],
      },
    ],
  };
  if (req.query.placement) filter.placement = req.query.placement;

  const items = await Banner.find(filter).sort({ priority: -1, createdAt: -1 });
  ApiResponse.ok(res, { items: toJSONList(items) }, 'Active banners fetched');
});
