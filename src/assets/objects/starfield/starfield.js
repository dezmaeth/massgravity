var THREEx = THREEx || {}

THREEx.Planets	= THREEx.Planets || {};
THREEx.Planets.baseURL = '../objects/'

THREEx.Planets.StarField = function() { 
	// create the geometry sphere
	var geometry  = new THREE.SphereGeometry(150, 32, 32)
	// create the material, using a texture of startfield
	var material  = new THREE.MeshBasicMaterial({
		overdraw: true
	})
	material.map   = THREE.ImageUtils.loadTexture( THREEx.Planets.baseURL + 'starfield/images/galaxy_starfield.png')
	material.side  = THREE.BackSide
	// create the mesh based on geometry and material
	var mesh  = new THREE.Mesh(geometry, material);
	return mesh;
};