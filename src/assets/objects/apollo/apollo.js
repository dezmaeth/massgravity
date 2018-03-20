THREEx = THREEx || {};
THREEx.Ships = THREEx.Ships || {};

THREEx.Ships.createApollo = function()  { 
	let geometry = new THREE.BoxGeometry( 0.1, 0.01, 0.01 );
	let material = new THREE.MeshBasicMaterial( {color: 0xffffff} );
	let mesh = new THREE.Mesh( geometry, material );

	return mesh;
};