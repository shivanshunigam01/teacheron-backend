/** @param {Record<string, unknown> | undefined} props */
function pickCity(props) {
  if (!props) return '';
  return (
    props.city ??
    props.suburb ??
    props.municipality ??
    props.district ??
    props.county ??
    props.state ??
    ''
  );
}

/** @param {Record<string, unknown> | undefined} props */
export function locationFromGeoapifyProps(props) {
  if (!props?.country) return null;
  const code = String(props.country_code ?? props.countryCode ?? '').toUpperCase();
  return {
    country: String(props.country),
    countryCode: code,
    city: String(pickCity(props) || ''),
    state: props.state ? String(props.state) : undefined,
    formatted: props.formatted ? String(props.formatted) : undefined,
  };
}

/** Normalize Geoapify /v1/ipinfo JSON. */
export function parseGeoapifyIpResponse(data) {
  if (!data || typeof data !== 'object') return null;

  if (typeof data.country === 'string') {
    return locationFromGeoapifyProps(data);
  }

  const featureProps = data.features?.[0]?.properties;
  if (featureProps?.country) {
    return locationFromGeoapifyProps(featureProps);
  }

  const countryObj = data.country;
  const countryName =
    typeof countryObj === 'object' && countryObj !== null && 'name' in countryObj
      ? String(countryObj.name)
      : typeof countryObj === 'string'
        ? countryObj
        : '';
  if (!countryName) return null;

  const cityRaw = data.city;
  const city =
    typeof cityRaw === 'string'
      ? cityRaw
      : typeof cityRaw === 'object' && cityRaw !== null && 'name' in cityRaw
        ? String(cityRaw.name ?? '')
        : '';

  const stateRaw = data.state;
  const state =
    typeof stateRaw === 'object' && stateRaw !== null && 'name' in stateRaw
      ? String(stateRaw.name ?? '')
      : typeof stateRaw === 'string'
        ? stateRaw
        : undefined;

  const iso =
    typeof countryObj === 'object' && countryObj !== null
      ? countryObj.iso_code ?? countryObj.iso_alpha2 ?? ''
      : '';

  return locationFromGeoapifyProps({
    country: countryName,
    country_code: String(iso).toLowerCase(),
    city,
    state,
    formatted: typeof data.formatted === 'string' ? data.formatted : undefined,
  });
}

/** Normalize Geoapify /v1/geocode/reverse JSON. */
export function parseGeoapifyReverseResponse(data) {
  const props = data?.features?.[0]?.properties;
  return locationFromGeoapifyProps(props);
}
