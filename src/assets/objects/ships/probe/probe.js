var THREEx = THREEx || {};

THREEx.Ships = THREEx.Ships || {};


THREEx.Ships.baseURL	= '../objects/ships/'

THREEx.Ships.createTestShip = function(onLoaded, onProgress, onError) {
	THREE.Loader.Handlers.add( /\.dds$/i, new THREE.DDSLoader() );
	var loader = new THREE.OBJMTLLoader();
	loader.load(THREEx.Ships.baseURL + 'probe/probe.obj', THREEx.Ships.baseURL + 'probe/probe.mtl',onLoaded, onProgress, onError );
};