"""Export an existing surveyed-source Blender scene; never manufacture interiors.

Run with Blender --background --python this.py -- /path/to/survey.
The source .blend is opened read-only and is never saved by this script.
"""
import bpy, bmesh, json, sys
from pathlib import Path

survey = Path(sys.argv[sys.argv.index('--') + 1])
dest = Path(__file__).resolve().parents[1] / 'public/models/campus-preview'
dest.mkdir(parents=True, exist_ok=True)
manifest = json.loads((survey / 'blender-output/official-campus/official-campus-manifest.json').read_text())
models = {r['model_id']: r for r in manifest['models']}
bpy.ops.wm.open_mainfile(filepath=str(survey / 'blender-output/campus-preview/HKU_Campus_Existing_Data_Preview.blend'))
scene = bpy.data.scenes['01_CAMPUS_EXISTING_DATA']
bpy.context.window.scene = scene
selected = [o for o in scene.objects if o.type == 'MESH' and o.get('official_model_id') in models and not o.hide_render]
for collection in bpy.data.collections:
    collection.hide_viewport = False
for o in scene.objects:
    o.hide_set(False)
    o.hide_viewport = False
    o.select_set(False)
bpy.context.view_layer.update()
# Crop the display extent only, retaining original vertices and coordinates.
for o in selected:
    if models[o['official_model_id']]['class'] == 'Terrain':
        o.data = o.data.copy()
        bm = bmesh.new(); bm.from_mesh(o.data)
        outside = []
        for f in bm.faces:
            points = [o.matrix_world @ v.co for v in f.verts]
            if (all(p.x < -510 for p in points) or all(p.x > 480 for p in points)
                or all(p.y < -350 for p in points) or all(p.y > 260 for p in points)):
                outside.append(f)
        bmesh.ops.delete(bm, geom=outside, context='FACES')
        bm.to_mesh(o.data); bm.free()
    o.select_set(True)
    o.name = o['official_model_id']
used_images = set()
for o in selected:
    for mat in o.data.materials:
        if mat and mat.use_nodes:
            for n in mat.node_tree.nodes:
                if n.type == 'TEX_IMAGE' and n.image: used_images.add(n.image)
for im in used_images:
    w, h = im.size
    if max(w, h) > 1024:
        s = 1024 / max(w, h); im.scale(max(1, round(w*s)), max(1, round(h*s)))
bpy.ops.export_scene.gltf(filepath=str(dest/'campus.glb'), export_format='GLB',
    use_selection=True, export_image_format='JPEG', export_image_quality=78,
    export_extras=False, export_cameras=False, export_lights=False)
landmarks = []
for code, name in [('27','本部大楼 Main Building'),('26','图书馆 Main Library'),('32','黄克竞楼 Haking Wong'),('5','明华综合大楼 Meng Wah'),('36','郑裕彤教学楼 Cheng Yu Tung'),('37','逸夫教学楼 Run Run Shaw Tower')]:
    choices = [r for r in models.values() if 'hku-map-'+code in r['map_candidates'] and r.get('display_status') != 'hidden_overlapping_untextured_variant']
    r = max(choices, key=lambda r:(bool(r['textures']), (r['bounds_local'][0][1]-r['bounds_local'][0][0])*(r['bounds_local'][1][1]-r['bounds_local'][1][0])))
    b = r['bounds_local']
    landmarks.append(dict(name=name, model=r['model_id'], position=[(b[0][0]+b[0][1])/2, b[2][1], -(b[1][0]+b[1][1])/2]))
routes = []
for feature in json.loads((survey/'data/pedestrian/routes-esri.json').read_text())['features']:
    a = feature['attributes']
    for path in feature['geometry']['paths']:
        # Keep whole source lines intersecting the focus; do not join gaps.
        if any(-510 < p[0]-832143 < 480 and -350 < p[1]-816012 < 260 for p in path):
            routes.append(dict(id=a['PedestrianRouteID'], kind=a['FeatureType'], points=[[round(p[0]-832143,3),round(p[2],3),round(-(p[1]-816012),3)] for p in path]))
report = dict(version='2026-10-15', status='existing-data-preview-not-operational-navigation',
    modelObjects=len(selected), textures=len(used_images), routeLines=len(routes),
    glbBytes=(dest/'campus.glb').stat().st_size, landmarks=landmarks,
    attribution=manifest['attribution'], source=manifest['source_dataset'],
    coordinateSystem='EPSG:2326 origin 832143,816012,0; glTF y-up',
    modifications='Source exterior selection; terrain display crop; textures downsampled to 1024px; untextured buildings use display colours. No surveyed interiors or road connectivity invented.')
(dest/'metadata.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
(dest/'paths.json').write_text(json.dumps(routes,separators=(',',':'))+'\n')
print('WEB_EXPORT_COMPLETE', json.dumps(report,ensure_ascii=False), flush=True)
