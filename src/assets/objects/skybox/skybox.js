var THREEx = THREEx || {};

THREEx.Planets = THREEx.Planets || {};

THREEx.Planets.baseURL	= '../objects/'

THREEx.Planets.createStarBox = function() { 


	var urlPrefix	= THREEx.Planets.baseURL + "skybox/images/";
	var urls = [ urlPrefix + "s_px.jpg", urlPrefix + "s_nx.jpg",
			urlPrefix + "s_py.jpg", urlPrefix + "s_ny.jpg",
			urlPrefix + "s_pz.jpg", urlPrefix + "s_nz.jpg" ];

	var textureCube	= THREE.ImageUtils.loadTextureCube( urls );	
	textureCube.format = THREE.RGBFormat;
	var skyShader = THREE.ShaderLib["cube"];
    skyShader.uniforms["tCube"].value = textureCube;

    var skyMaterial = new THREE.ShaderMaterial({
      fragmentShader: skyShader.fragmentShader, vertexShader: skyShader.vertexShader,
      uniforms: skyShader.uniforms, depthWrite: false, side: THREE.BackSide
    });
    var skyBox = new THREE.Mesh(new THREE.BoxGeometry(750,750,750), skyMaterial);
    skyMaterial.needsUpdate = true;
    return skyBox;
};