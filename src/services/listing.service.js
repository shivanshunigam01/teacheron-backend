import { toJSON } from '../utils/serialize.js';
import { enrichApprovedImageFields } from '../utils/publicAssetUrl.js';

export function shapeListing(doc, req) {
  const base = toJSON(doc);
  return enrichApprovedImageFields(base, req, 'imageUrl');
}

export function shapeListingList(docs, req) {
  return docs.map((doc) => shapeListing(doc, req));
}
