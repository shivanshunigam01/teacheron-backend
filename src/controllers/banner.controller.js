export * from './banner.base.controller.js';
import Banner from '../models/Banner.model.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { toJSONList } from '../utils/serialize.js';
import { filterBannersByGeo } from '../utils/bannerGeo.js';

/** Public: active banners (optionally pre-filtered by country/city from IP/geo CMS). */
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

  let items = await Banner.find(filter).sort({ priority: -1, createdAt: -1 }).lean();

  const geo = {
    country: req.query.country ? String(req.query.country).trim() : '',
    city: req.query.city ? String(req.query.city).trim() : '',
    countryCode: req.query.countryCode ? String(req.query.countryCode).trim() : '',
  };
  items = filterBannersByGeo(items, geo);

  ApiResponse.ok(res, { items: toJSONList(items) }, 'Active banners fetched');
});
