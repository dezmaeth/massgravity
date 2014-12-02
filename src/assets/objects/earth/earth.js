var THREEx = THREEx || {}

THREEx.Planets	= {}

THREEx.Planets.baseURL	= '../objects/'


THREEx.createAtmosphereMaterial	= function(){
	var vertexShader	= [
		'varying vec3 vNormal;',
		'void main(){',
		'	// compute intensity',
		'	vNormal		= normalize( normalMatrix * normal );',
		'	// set gl_Position',
		'	gl_Position	= projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
		'}',
	].join('\n')
	var fragmentShader	= [
		'uniform float coeficient;',
		'uniform float power;',
		'uniform vec3  glowColor;',

		'varying vec3  vNormal;',

		'void main(){',
		'	float intensity	= pow( coeficient - dot(vNormal, vec3(0.0, 0.0, 1.0)), power );',
		'	gl_FragColor	= vec4( glowColor * intensity, 1.0 );',
		'}',
	].join('\n')

	// create custom material from the shader code above
	//   that is within specially labeled script tags
	var material	= new THREE.ShaderMaterial({
		uniforms: { 
			coeficient	: {
				type	: "f", 
				value	: 1.0
			},
			power		: {
				type	: "f",
				value	: 2
			},
			glowColor	: {
				type	: "c",
				value	: new THREE.Color('pink')
			},
		},
		vertexShader	: vertexShader,
		fragmentShader	: fragmentShader,
		side		: THREE.FrontSide,
		blending	: THREE.AdditiveBlending,
		transparent	: true,
		overdraw: true,
		depthWrite	: false,
	});
	return material
};


THREEx.Planets.createEarth	= function(){
	var geometry	= new THREE.SphereGeometry(0.5, 32, 32)
	var material	= new THREE.MeshPhongMaterial({
		overdraw: true,
		map			: THREE.ImageUtils.loadTexture(THREEx.Planets.baseURL+'earth/images/earthmap1k.jpg'),
		bumpMap		: THREE.ImageUtils.loadTexture(THREEx.Planets.baseURL+'earth/images/earthbump1k.jpg'),
		bumpScale	: 0.02,
		specularMap	: THREE.ImageUtils.loadTexture(THREEx.Planets.baseURL+'earth/images/earthspec1k.jpg'),
		shininess  : 15,
		specular	: new THREE.Color('grey'),
	});
	var mesh	= new THREE.Mesh(geometry, material);

	return mesh;
};



THREEx.Planets.createEarthLabel = function() {
	var label = document.createElement( 'div' );
	label.className = "label";
	label.innerHTML = "Earth";
	var object = new THREE.CSS3DObject( label );
	return object;
};



THREEx.Planets.createEarthCloud	= function(){
	// create destination canvas
	var canvasResult	= document.createElement('canvas')
	canvasResult.width	= 1024
	canvasResult.height	= 512
	var contextResult	= canvasResult.getContext('2d')		

	// load earthcloudmap
	var imageMap	= new Image();
	imageMap.addEventListener("load", function() {
		
		// create dataMap ImageData for earthcloudmap
		var canvasMap	= document.createElement('canvas')
		canvasMap.width	= imageMap.width
		canvasMap.height= imageMap.height
		var contextMap	= canvasMap.getContext('2d')
		contextMap.drawImage(imageMap, 0, 0)
		var dataMap	= contextMap.getImageData(0, 0, canvasMap.width, canvasMap.height)

		// load earthcloudmaptrans
		var imageTrans	= new Image();
		imageTrans.addEventListener("load", function(){
			// create dataTrans ImageData for earthcloudmaptrans
			var canvasTrans		= document.createElement('canvas')
			canvasTrans.width	= imageTrans.width
			canvasTrans.height	= imageTrans.height
			var contextTrans	= canvasTrans.getContext('2d')
			contextTrans.drawImage(imageTrans, 0, 0)
			var dataTrans		= contextTrans.getImageData(0, 0, canvasTrans.width, canvasTrans.height)
			// merge dataMap + dataTrans into dataResult
			var dataResult		= contextMap.createImageData(canvasMap.width, canvasMap.height)
			for(var y = 0, offset = 0; y < imageMap.height; y++){
				for(var x = 0; x < imageMap.width; x++, offset += 4){
					dataResult.data[offset+0]	= dataMap.data[offset+0]
					dataResult.data[offset+1]	= dataMap.data[offset+1]
					dataResult.data[offset+2]	= dataMap.data[offset+2]
					dataResult.data[offset+3]	= 255 - dataTrans.data[offset+0]
				}
			}
			// update texture with result
			contextResult.putImageData(dataResult,0,0)	
			material.map.needsUpdate = true;
		})
		imageTrans.src	= THREEx.Planets.baseURL+'earth/images/earthcloudmaptrans.jpg';
	}, false);
	imageMap.src	= THREEx.Planets.baseURL+'earth/images/earthcloudmap.jpg';

	var geometry	= new THREE.SphereGeometry(0.51, 32, 32)
	var material	= new THREE.MeshPhongMaterial({
		overdraw: true,
		map		: new THREE.Texture(canvasResult),
		side		: THREE.DoubleSide,
		transparent	: true,
		opacity		: 0.8,
	})
	var mesh	= new THREE.Mesh(geometry, material)
	return mesh	
}

THREEx.Planets.createEarthMoon = function() {
	var geometry	= new THREE.SphereGeometry(0.5, 32, 32)
	var material	= new THREE.MeshPhongMaterial({
		overdraw: true,
		map			: THREE.ImageUtils.loadTexture(THREEx.Planets.baseURL+'earth/images/moonmap1k.jpg'),
		bumpMap		: THREE.ImageUtils.loadTexture(THREEx.Planets.baseURL+'earth/images/moonbump1k.jpg'),
		bumpScale	: 0.01
	});

	var mesh	= new THREE.Mesh(geometry, material);

	return mesh;
};