# Empty Mall — attribution and navigation adaptation

"Empty Mall" by **loafbrr**, licensed under **Creative Commons Attribution 4.0 International (CC BY 4.0)**.

- Original: https://sketchfab.com/3d-models/empty-mall-ac571db422444da4a2ec8ac1693e9148
- Author: https://sketchfab.com/loafbrr
- License and legal text: https://creativecommons.org/licenses/by/4.0/ and https://creativecommons.org/licenses/by/4.0/legalcode
- Downloaded via Objaverse: https://huggingface.co/datasets/allenai/objaverse/resolve/main/glbs/000-146/ac571db422444da4a2ec8ac1693e9148.glb
- Retrieved: 2026-09-05. Original GLB: 3,456,400 bytes; 8,262 triangles.
- SHA256: b31ab94bdc69bd71c441fd9b139a1969d2bc5fcd798a8bb3e5cfc430baa2f206

The redistributed GLB is unchanged. The application adds route graphs, fictional shop labels, wayfinding markers, camera animation and horizontal floor clipping. This attribution does not imply endorsement by the original author.

The author's description is a three-floor empty mall. There is no evidence that this asset is a survey, scan, or digital twin of a named real building. Store names A–G and floor-use labels are test annotations, not real tenants.

## Coordinate and route evidence

Original Y-up coordinates retained. Walking surfaces: 1F y=1.000; 2F y=7.583; 3F y=14.000. Lower slab faces at y=6.083 and y=12.500 must not be mistaken for floors.

The route graph follows existing slab surfaces and the original east/west escalator ramps. Same-floor graph segments were checked against original horizontal triangles and wall slices (0.35 model-unit lateral clearance; minimum measured wall clearance 0.3586). This is a geometric prototype check, not accessibility certification or real-world safety validation. Elevator locations are not invented. Escalators are treated as bidirectional for the geometry demonstration; operational direction and availability require on-site verification before real use.

See `empty-mall-navigation-evidence.json` for source node coordinates, verified segments, ramp polylines and limitations. The app expands ramp polylines into additional non-confirmation waypoints to prevent cutting through slab edges.
