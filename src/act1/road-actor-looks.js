import * as T from '../../assets/vendor/three.module.js';

const rigParts = {
  crest: { size: [.52, .46, .12], position: [0, .25, -.07], anchor: ['Head', 'Neck'], shape: 'crest' },
  collar: { size: [.51, .11, .38], position: [0, -.035, .05], anchor: ['Neck', 'Head'], shape: 'band' },
  mantle: { size: [.91, .33, .21], position: [0, .09, -.18], anchor: ['Spine2', 'Spine', 'Chest'], shape: 'mantle' },
  mantlet: { size: [.52, .59, .16], position: [-.34, -.03, -.16], anchor: ['Spine2', 'Spine', 'Chest'], shape: 'crest' },
  lantern: { size: [.24, .35, .24], position: [0, -.15, -.15], anchor: ['Spine', 'Chest', 'Head'], shape: 'lantern' },
  harness: { size: [.67, .14, .55], position: [0, .015, -.12], anchor: ['Spine', 'Spine2', 'Chest'], shape: 'band' },
};

function accentGeometry(shape, size) {
  if (shape === 'band') {
    const band = new T.TorusGeometry(.5, .11, 5, 11);
    band.rotateX(Math.PI / 2);
    return band.scale(...size.map(n => n / 1.22));
  }
  if (shape === 'lantern') return new T.IcosahedronGeometry(.5, 0).scale(...size);
  const form = new T.Shape();
  const crest = shape === 'crest';
  form.moveTo(-.5, .35);
  form.lineTo(0, .5);
  form.lineTo(.5, .35);
  form.lineTo(.42, crest ? -.18 : -.35);
  form.lineTo(0, -.5);
  form.lineTo(-.42, crest ? -.18 : -.35);
  form.closePath();
  return new T.ExtrudeGeometry(form, { depth: 1, bevelEnabled: false }).translate(0, 0, -.5).scale(...size);
}

export function addRoadAccent(world, actor, visual) {
  const part = rigParts[visual?.accent];
  if (!part || !Number.isInteger(visual.color)) return;
  const anchor = [...part.anchor, 'Body', 'Torso', 'Root'].map(name => actor.root.getObjectByName(name)).find(Boolean) || actor.root;
  actor.wrapper.updateMatrixWorld(true);
  const scale = anchor.getWorldScale(new T.Vector3());
  const sockets = new T.Group();
  sockets.name = 'Road outfit · ' + visual.accent;
  sockets.scale.set(1 / Math.max(.001, Math.abs(scale.x)), 1 / Math.max(.001, Math.abs(scale.y)), 1 / Math.max(.001, Math.abs(scale.z)));
  sockets.position.set(part.position[0] * sockets.scale.x, part.position[1] * sockets.scale.y, part.position[2] * sockets.scale.z);
  anchor.add(sockets);

  const geometry = world.geometry('road-outfit:' + visual.accent, () => accentGeometry(part.shape, part.size));
  const material = new T.MeshStandardMaterial({
    color: visual.color, roughness: .8, metalness: .12,
    emissive: part.shape === 'lantern' ? visual.color : 0, emissiveIntensity: .28,
  });
  const mesh = new T.Mesh(geometry, material);
  if (anchor === actor.root) mesh.position.y = actor.refreshHeight * .53;
  mesh.userData.modelOrigin = { kind: 'actor-accessory', source: 'Roads visual variants', accent: visual.accent };
  sockets.add(mesh);
  actor.ownMaterials.push(material);
}
