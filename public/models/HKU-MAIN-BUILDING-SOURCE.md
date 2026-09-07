# HKU Main Building 1/F navigation study

## V5 campus / floor-view update (2026-09-07)

The optional architecture viewer now offers a campus scene plus G/F and 2/F cutaways. Those two levels contain 24 inferred study rooms each; S identifiers are NOT actual room numbers. Existing official-plan 1/F navigation remains an independent model with 17 destinations, unchanged geometry and no new floor connectors. No new office assignments are claimed.

Campus relationships were checked against HKU Estates Campus Map v25.2 (April 2025), https://www.estates.hku.hk/download_file/view_inline/674, and actual observation of Google Maps satellite/tilted 3D views. Google geometry, imagery and map tiles were not extracted or redistributed. Terrain, heights, footprints, vegetation and context facades are independently generated estimates, not measured or georeferenced assets. Surrounding buildings are simplified proxies. Generic generated v4 brick/granite textures are retained and embedded in the GLBs.

The scene supports visual inspection only. New inferred door/corridor and stair samples were checked for model-space obstructions and floor support, which is not verification of current real-world access. Ground/upper floor plans, current room directories, stair locations, door access and field alignment remain required before expanding destination navigation.

Independently generated 2026-09-07; not an HKU-endorsed model. Private research demonstration only; no claim of an open licence to underlying university plans, branding or photographs.

Geometry reference: https://mech.hku.hk/wp-content/uploads/2025/12/Floor-plan-HWB-COB-YPB.pdf page 11, “Main Building First Floor Fire Evacuation Plan”. Drawing revision date is not confirmed; the upload directory is not a drawing date.

Room/floor catalogue: https://its.hku.hk/services/teaching-learning/classroom-support/teaching-space/ (pages 1–3). Of 32 listed MB teaching spaces, 17 door destinations on 1/F are mapped in this release. MB100, MB113G and 13 second-floor rooms are explicitly deferred. The catalogue is not a complete office register.

Wall segments are traced from PDF vectors. Nominal scale uses 0.064 metres per pixel of an 1800px-wide reference rendering, approximately related to the hall-width reference; no survey alignment is claimed. Wall height is symbolic. Door leaves are omitted as an open-state model, not evidence of actual access. Arrival is in the public corridor before a classroom door. Source room-number labels do not verify current office occupants.

Only 1/F public-corridor study routes are supplied. No outdoor entrance, cross-floor, wheelchair or evacuation navigation is certified. Courtyards and unverified stair regions are excluded from the navigation floor. All actual access restrictions and current on-site routes need verification before operational use.

Reference PDF and photographs are not redistributed as website assets. This study supersedes the v2 approximate interiors for this first-floor navigation slice only; it is not a complete multi-floor replacement.
# V4 appearance update (2026-09-07)

The current 1F GLB is `hku-main-building-1f-v4.glb`. Materials and UVs changed; source meshes and transforms did not. The original white/grey v3 asset is retained. AI-generated generic brick and granite maps are embedded, not photographs or measured PBR scans. Courtyard brick / warm plaster / stone-floor placement is an illustrative finish scheme, not a finish survey.

`hku-main-building-visual-v4.glb` is a SEPARATE full-exterior and partial-interior visual study inherited from v2, with new materials, roof seams and drainpipes. It is not coordinate-registered to the 1F navigation graph and contains inferred room subdivisions. Other levels remain approximate massing, not complete current room layouts. It must not be used to infer reachable rooms, real access, elevators or cross-floor connections.

Exterior reference: [HKU About](https://www.hku.hk/en/about-hku); architectural context: [HKU Libraries Main Building record](https://digitalrepository.lib.hku.hk/catalog/s1784s36h). Original reference photos are not embedded or redistributed as textures.
