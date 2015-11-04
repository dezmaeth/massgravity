var THREEx = THREEx || {};

THREEx.Planets	= {};

THREEx.Planets.baseURL	= '../objects/';
THREEx.Planets.Terra = {};


THREEx.Planets.Terra.create	= function(size){

	var containerEarth	= new THREE.Object3D();
	var geometry	= new THREE.SphereGeometry(size, 32, 32);
	var material	= new THREE.MeshPhongMaterial({
		overdraw: true,
		map			: THREE.ImageUtils.loadTexture(THREEx.Planets.baseURL+'earth/images/earthmap1k.jpg'),
		bumpMap		: THREE.ImageUtils.loadTexture(THREEx.Planets.baseURL+'earth/images/earthbump1k.jpg'),
		bumpScale	: 0.01,
		specularMap	: THREE.ImageUtils.loadTexture(THREEx.Planets.baseURL+'earth/images/earthspec1k.jpg'),
		shininess  : 15,
		specular	: new THREE.Color('grey')
	});

	var earthMesh	= new THREE.Mesh(geometry, material);
	earthMesh.name = "EARTH";
	containerEarth.add(earthMesh);
	earthMesh.castShadow = true;
	earthMesh.receiveShadow = true;
	
	geometry	= new THREE.SphereGeometry(size, 32, 32);
	material	= THREEx.createAtmosphereMaterial();
	material.uniforms.glowColor.value.set(0x00b3ff);
	material.uniforms.coeficient.value	= 0.8;
	material.uniforms.power.value		= 2.0;
	var atmosphereMesh	= new THREE.Mesh(geometry, material );
	atmosphereMesh.scale.multiplyScalar(1.01);
	atmosphereMesh.receiveShadow = true;
	containerEarth.add( atmosphereMesh );

	geometry	= new THREE.SphereGeometry(size, 32, 32);
	material	= THREEx.createAtmosphereMaterial();
	material.side	= THREE.BackSide;
	material.uniforms.glowColor.value.set(0x00b3ff);
	material.uniforms.coeficient.value	= 0.4;
	material.uniforms.power.value		= 4.0;
	var atmosphereMeshGlow	= new THREE.Mesh(geometry, material );
	atmosphereMeshGlow.scale.multiplyScalar(1.15);
	containerEarth.add( atmosphereMeshGlow );

	var cloudMesh	= THREEx.Planets.Terra.clouds(size);
	cloudMesh.receiveShadow = true;
	containerEarth.add(cloudMesh);

	onRenderFcts.push(function(delta, now) {
		earthMesh.rotation.y += 1 / 64 * delta;
		cloudMesh.rotation.y += 1 / 32 * delta;
	});

	return containerEarth;
};



THREEx.Planets.Terra.label = function() {
	var label = document.createElement( 'div' );
	label.className = "label";
	label.innerHTML = "Terra </br> (Homeworld)";
	return new THREE.CSS3DObject( label );
};
/*
var radius   = 80,
    segments = 64,
    material = new THREE.LineBasicMaterial( { color: 0xFF9900, opacity: 0.5 } ),
    geometry = new THREE.CircleGeometry( radius, segments );

// Remove center vertex
geometry.vertices.shift();
glscene.add( new THREE.Line( geometry, material ) );
*/


THREEx.Planets.Terra.clouds	= function(size){
	// create destination canvas
	var canvasResult	= document.createElement('canvas');
	canvasResult.width	= 1024;
	canvasResult.height	= 512;
	var contextResult	= canvasResult.getContext('2d');

	// load earthcloudmap
	var imageMap	= new Image();
	imageMap.addEventListener("load", function() {
		
		// create dataMap ImageData for earthcloudmap
		var canvasMap	= document.createElement('canvas');
		canvasMap.width	= imageMap.width;
		canvasMap.height= imageMap.height;
		var contextMap	= canvasMap.getContext('2d');
		contextMap.drawImage(imageMap, 0, 0);
		var dataMap	= contextMap.getImageData(0, 0, canvasMap.width, canvasMap.height);

		// load earthcloudmaptrans
		var imageTrans	= new Image();
		imageTrans.addEventListener("load", function(){
			// create dataTrans ImageData for earthcloudmaptrans
			var canvasTrans		= document.createElement('canvas');
			canvasTrans.width	= imageTrans.width;
			canvasTrans.height	= imageTrans.height;
			var contextTrans	= canvasTrans.getContext('2d');
			contextTrans.drawImage(imageTrans, 0, 0);
			var dataTrans		= contextTrans.getImageData(0, 0, canvasTrans.width, canvasTrans.height);
			// merge dataMap + dataTrans into dataResult
			var dataResult		= contextMap.createImageData(canvasMap.width, canvasMap.height);
			for(var y = 0, offset = 0; y < imageMap.height; y++){
				for(var x = 0; x < imageMap.width; x++, offset += 4){
					dataResult.data[offset+0]	= dataMap.data[offset+0];
					dataResult.data[offset+1]	= dataMap.data[offset+1];
					dataResult.data[offset+2]	= dataMap.data[offset+2];
					dataResult.data[offset+3]	= 255 - dataTrans.data[offset+0];
				}
			}
			// update texture with result
			contextResult.putImageData(dataResult,0,0)	
			material.map.needsUpdate = true;
		});
		imageTrans.src	= THREEx.Planets.baseURL+'earth/images/earthcloudmaptrans.jpg';
	}, false);
	imageMap.src	= THREEx.Planets.baseURL+'earth/images/earthcloudmap.jpg';

	var geometry	= new THREE.SphereGeometry(size * 1.02, 32, 32)
	var material	= new THREE.MeshPhongMaterial({
		overdraw: true,
		map		: new THREE.Texture(canvasResult),
		side		: THREE.DoubleSide,
		transparent	: true,
		opacity		: 0.8
	});

	return new THREE.Mesh(geometry, material);
};
