const norm = (s) => String(s || '').trim().toLowerCase();

/**
 * @param {{ targetType?: string; targetValue?: string; active?: boolean }} banner
 * @param {{ country?: string; city?: string; countryCode?: string } | null} geo
 */
export function bannerMatchesLocation(banner, geo) {
  if (banner.active === false) return false;
  if (banner.targetType === 'global' || !banner.targetType) return true;
  if (!geo) return false;

  const target = norm(banner.targetValue);

  if (banner.targetType === 'country') {
    const country = norm(geo.country);
    const code = norm(geo.countryCode);
    return (
      country === target ||
      code === target ||
      country.includes(target) ||
      target.includes(country) ||
      (target.length === 2 && code === target)
    );
  }

  if (banner.targetType === 'city') {
    const city = norm(geo.city);
    return city === target || city.includes(target) || target.includes(city);
  }

  return false;
}

/**
 * When geo query params are present, return global banners plus geo-matched ones.
 * @param {Array<object>} items
 * @param {{ country?: string; city?: string; countryCode?: string }} geo
 */
export function filterBannersByGeo(items, geo) {
  const hasGeo = !!(geo.country || geo.city || geo.countryCode);
  if (!hasGeo) return items;
  return items.filter((b) => bannerMatchesLocation(b, geo));
}
