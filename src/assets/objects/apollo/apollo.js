THREEx = THREEx || {};
THREEx.Ships = THREEx.Ships || {};

THREEx.Ships.createApollo = function()  { 
	var geometry = new THREE.BoxGeometry( 0.1, 0.01, 0.01 );
	var material = new THREE.MeshBasicMaterial( {color: 0xffffff} );
	var mesh = new THREE.Mesh( geometry, material );

	return mesh;
};