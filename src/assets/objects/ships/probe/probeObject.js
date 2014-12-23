var THREEx = THREEx || {};

THREEx.Ships = THREEx.Ships || {};


THREEx.Ships.baseURL	= '../objects/ships/probe/';

THREEx.Ships.createTestShip = function(onLoaded, onProgress, onError) {
	var config = {

		baseUrl: THREEx.Ships.baseURL,
		weapons:  [  [ "weapon.js", "weapon.png" ]
					],
		body: "probe.js",
		skins: [ "probe_difuse.jpg"]
	};

	probeModel = new THREE.MD2Character();
	probeModel.scale = 3;
	probeModel.onLoadComplete = onLoaded;
	probeModel.loadParts( config );
	// AVERIGUAR PORQUE NO TOMA ANIMACION
	probeModel.setAnimation("FRAME");
	onRenderFcts.push(function(delta, now){
		probeModel.update(delta);
	});	
/*	THREE.Loader.Handlers.add( /\.dds$/i, new THREE.DDSLoader() );
	var loader = new THREE.OBJMTLLoader();
	loader.load(THREEx.Ships.baseURL + 'probe/probe.obj', THREEx.Ships.baseURL + 'probe/probe.mtl',onLoaded, onProgress, onError );*/
};