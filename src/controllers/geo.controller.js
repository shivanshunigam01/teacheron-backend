import env from '../config/env.js';
import { ApiResponse } from '../utils/ApiResponse.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import {
  parseGeoapifyIpResponse,
  parseGeoapifyReverseResponse,
} from '../utils/geoapifyParse.js';
import {
  getCurrencyForCountryCode,
  getCurrencySymbol,
} from '../utils/currencyFromCountry.js';

function clientIpFromRequest(req) {
  const xf = req.headers['x-forwarded-for'];
  if (typeof xf === 'string' && xf.trim()) {
    return xf.split(',')[0].trim();
  }
  const ip = req.ip || req.socket?.remoteAddress || '';
  return ip.replace(/^::ffff:/, '');
}

async function geoFetch(url) {
  if (!env.geoapifyApiKey) return null;
  const r = await fetch(url);
  if (!r.ok) return null;
  return r.json();
}

export const ip = asyncHandler(async (req, res) => {
  if (!env.geoapifyApiKey) {
    res.set('X-Location-Source', 'disabled');
    return ApiResponse.ok(res, { location: null, geoapify: null }, 'Geo not configured');
  }

  const clientIp = clientIpFromRequest(req);
  const isLocal = !clientIp || clientIp === '127.0.0.1' || clientIp === '::1';
  const url = isLocal
    ? `https://api.geoapify.com/v1/ipinfo?apiKey=${env.geoapifyApiKey}`
    : `https://api.geoapify.com/v1/ipinfo?ip=${encodeURIComponent(clientIp)}&apiKey=${env.geoapifyApiKey}`;

  const raw = await geoFetch(url);
  const location = parseGeoapifyIpResponse(raw);

  res.set('Cache-Control', 'private, max-age=300');
  res.set('X-Location-Source', 'geoapify-ip');
  if (clientIp && !isLocal) res.set('X-Client-IP', clientIp);

  ApiResponse.ok(res, { location, geoapify: raw }, 'Location fetched');
});

export const reverse = asyncHandler(async (req, res) => {
  if (!env.geoapifyApiKey) {
    return ApiResponse.ok(res, { location: null, geoapify: null }, 'Geo not configured');
  }

  const lat = Number(req.query.lat);
  const lon = Number(req.query.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return ApiResponse.ok(res, { location: null, geoapify: null }, 'Invalid coordinates');
  }

  const raw = await geoFetch(
    `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&apiKey=${env.geoapifyApiKey}`,
  );
  const location = parseGeoapifyReverseResponse(raw);

  res.set('Cache-Control', 'private, max-age=300');
  res.set('X-Location-Source', 'geoapify-reverse');
  ApiResponse.ok(res, { location, geoapify: raw }, 'Location fetched');
});

export const currency = asyncHandler(async (req, res) => {
  const explicit = String(req.query.countryCode || '').trim();
  if (explicit) {
    const countryCode = explicit.toUpperCase();
    const currencyCode = getCurrencyForCountryCode(countryCode);
    return ApiResponse.ok(
      res,
      {
        countryCode,
        country: null,
        currency: currencyCode,
        symbol: getCurrencySymbol(currencyCode),
        source: 'query',
      },
      'Currency resolved',
    );
  }

  if (!env.geoapifyApiKey) {
    return ApiResponse.ok(
      res,
      {
        countryCode: null,
        country: null,
        currency: 'USD',
        symbol: getCurrencySymbol('USD'),
        source: 'default',
      },
      'Geo not configured — default currency',
    );
  }

  const clientIp = clientIpFromRequest(req);
  const isLocal = !clientIp || clientIp === '127.0.0.1' || clientIp === '::1';
  const url = isLocal
    ? `https://api.geoapify.com/v1/ipinfo?apiKey=${env.geoapifyApiKey}`
    : `https://api.geoapify.com/v1/ipinfo?ip=${encodeURIComponent(clientIp)}&apiKey=${env.geoapifyApiKey}`;

  const raw = await geoFetch(url);
  const location = parseGeoapifyIpResponse(raw);
  const countryCode = location?.countryCode || null;
  const currencyCode = countryCode ? getCurrencyForCountryCode(countryCode) : 'USD';

  res.set('Cache-Control', 'private, max-age=300');
  res.set('X-Location-Source', 'geoapify-ip');

  ApiResponse.ok(
    res,
    {
      countryCode,
      country: location?.country || null,
      currency: currencyCode,
      symbol: getCurrencySymbol(currencyCode),
      source: countryCode ? 'ip' : 'default',
    },
    'Currency fetched',
  );
});
