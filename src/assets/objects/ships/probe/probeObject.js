let THREEx = THREEx || {};

THREEx.Ships = THREEx.Ships || {};


THREEx.Ships.baseURL	= '../objects/ships/probe/';

THREEx.Ships.createTestShip = function(onLoaded, onProgress, onError) {
	

	loader = new THREE.JSONLoader();
	loader.load(THREEx.Ships.baseURL + 'probe.js',onLoaded);


	/*THREE.Loader.Handlers.add( /\.dds$/i, new THREE.DDSLoader() );
	let loader = new THREE.OBJMTLLoader();
	loader.load(THREEx.Ships.baseURL + 'probe/probe.obj', THREEx.Ships.baseURL + 'probe/probe.mtl',onLoaded, onProgress, onError );*/
};