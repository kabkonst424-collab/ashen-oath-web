// Presentation-only, explicitly opted in by a reviewed animation profile.
const HANDS = new Set(['LeftHand', 'RightHand']);

export function validateCastHands(value, clips) {
  if (value === undefined || value === null) return Object.freeze({});
  if (typeof value !== 'object' || Array.isArray(value) || ![Object.prototype, null].includes(Object.getPrototypeOf(value))) {
    throw new Error('Cast hands must be a clip-to-hand object');
  }
  const result = {};
  for (const [clip, hand] of Object.entries(value)) {
    if (!clips.has(clip)) throw new Error(`Cast hand references a missing clip: ${clip}`);
    if (!HANDS.has(hand)) throw new Error(`Invalid cast hand: ${clip}`);
    result[clip] = hand;
  }
  return Object.freeze(result);
}

export function resolveCastAnchor(actor, clip = actor?.current) {
  const root = actor.root;
  const requested = actor.castHands?.[clip];
  if (HANDS.has(requested)) {
    const exact = root.getObjectByName(requested);
    const alias = root.getObjectByName(requested === 'LeftHand' ? 'Hand_L' : 'Hand_R');
    if (exact || alias) return exact || alias;
  }
  // An absent/old profile and a missing optional hand retain the original path.
  return root.getObjectByName('RightHand') || root.getObjectByName('Hand_R') ||
    root.getObjectByName('Head') || root.getObjectByName('Chest') || root;
}
