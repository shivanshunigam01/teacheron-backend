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
import { resolveGeoLookupIp } from '../utils/resolveGeoIp.js';

async function geoFetch(url) {
  if (!env.geoapifyApiKey) return null;
  const r = await fetch(url);
  if (!r.ok) return null;
  return r.json();
}

function geoapifyIpUrl(ip) {
  const base = `https://api.geoapify.com/v1/ipinfo?apiKey=${env.geoapifyApiKey}`;
  return ip ? `${base}&ip=${encodeURIComponent(ip)}` : base;
}

export const ip = asyncHandler(async (req, res) => {
  if (!env.geoapifyApiKey) {
    res.set('X-Location-Source', 'disabled');
    return ApiResponse.ok(res, { location: null, geoapify: null }, 'Geo not configured');
  }

  const { ip: lookupIp, source } = resolveGeoLookupIp(req);

  if (!lookupIp) {
    res.set('Cache-Control', 'no-store');
    res.set('X-Location-Source', 'none');
    return ApiResponse.ok(
      res,
      {
        location: null,
        geoapify: null,
        resolvedIp: null,
        ipSource: source,
      },
      'Could not resolve client IP — pass ?ip= from browser or connect directly',
    );
  }

  const raw = await geoFetch(geoapifyIpUrl(lookupIp));
  const location = parseGeoapifyIpResponse(raw);

  res.set('Cache-Control', 'no-store');
  res.set('X-Location-Source', 'geoapify-ip');
  res.set('X-Client-IP', lookupIp);
  res.set('X-IP-Source', source);

  ApiResponse.ok(
    res,
    { location, geoapify: raw, resolvedIp: lookupIp, ipSource: source },
    'Location fetched',
  );
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

  res.set('Cache-Control', 'no-store');
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

  const { ip: lookupIp, source } = resolveGeoLookupIp(req);

  if (!lookupIp) {
    return ApiResponse.ok(
      res,
      {
        countryCode: null,
        country: null,
        currency: 'USD',
        symbol: getCurrencySymbol('USD'),
        source: 'default',
        resolvedIp: null,
        ipSource: source,
      },
      'Could not resolve client IP',
    );
  }

  const raw = await geoFetch(geoapifyIpUrl(lookupIp));
  const location = parseGeoapifyIpResponse(raw);
  const countryCode = location?.countryCode || null;
  const currencyCode = countryCode ? getCurrencyForCountryCode(countryCode) : 'USD';

  res.set('Cache-Control', 'no-store');
  res.set('X-Location-Source', 'geoapify-ip');
  res.set('X-Client-IP', lookupIp);
  res.set('X-IP-Source', source);

  ApiResponse.ok(
    res,
    {
      countryCode,
      country: location?.country || null,
      currency: currencyCode,
      symbol: getCurrencySymbol(currencyCode),
      source: countryCode ? 'ip' : 'default',
      resolvedIp: lookupIp,
      ipSource: source,
    },
    'Currency fetched',
  );
});
