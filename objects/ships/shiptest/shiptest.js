var THREEx = THREEx || {};

THREEx.Ships = THREEx.Ships || {};


THREEx.Ships.baseURL	= '../objects/ships/'

THREEx.Ships.createTestShip = function(onLoaded, onProgress, onError) {
	THREE.Loader.Handlers.add( /\.dds$/i, new THREE.DDSLoader() );
	var loader = new THREE.OBJMTLLoader();
	loader.load(THREEx.Ships.baseURL + 'shiptest/shiptest.obj', THREEx.Ships.baseURL + 'shiptest/shiptest.mtl',onLoaded, onProgress, onError );
};