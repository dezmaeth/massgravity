let THREEx = THREEx || {};

THREEx.Planets	= {};

THREEx.Planets.baseURL	= '../objects/';
THREEx.Planets.Earth = {};


THREEx.Planets.Earth.create	= function(size){

	let containerEarth	= new THREE.Object3D();
	let geometry	= new THREE.SphereGeometry(size, 32, 32);
	let material	= new THREE.MeshPhongMaterial({
		overdraw: true,
		map			: THREE.ImageUtils.loadTexture(THREEx.Planets.baseURL+'earth/images/earthmap1k.jpg'),
		bumpMap		: THREE.ImageUtils.loadTexture(THREEx.Planets.baseURL+'earth/images/earthbump1k.jpg'),
		bumpScale	: 0.01,
		specularMap	: THREE.ImageUtils.loadTexture(THREEx.Planets.baseURL+'earth/images/earthspec1k.jpg'),
		shininess  : 15,
		specular	: new THREE.Color('grey')
	});

	let earthMesh	= new THREE.Mesh(geometry, material);
	earthMesh.name = "EARTH";
	containerEarth.add(earthMesh);
	earthMesh.castShadow = true;
	earthMesh.receiveShadow = true;
	
	geometry	= new THREE.SphereGeometry(size, 32, 32);
	material	= THREEx.createAtmosphereMaterial();
	material.uniforms.glowColor.value.set(0x00b3ff);
	material.uniforms.coeficient.value	= 0.8;
	material.uniforms.power.value		= 2.0;
	let atmosphereMesh	= new THREE.Mesh(geometry, material );
	atmosphereMesh.scale.multiplyScalar(1.01);
	atmosphereMesh.receiveShadow = true;
	containerEarth.add( atmosphereMesh );

	geometry	= new THREE.SphereGeometry(size, 32, 32);
	material	= THREEx.createAtmosphereMaterial();
	material.side	= THREE.BackSide;
	material.uniforms.glowColor.value.set(0x00b3ff);
	material.uniforms.coeficient.value	= 0.4;
	material.uniforms.power.value		= 4.0;
	let atmosphereMeshGlow	= new THREE.Mesh(geometry, material );
	atmosphereMeshGlow.scale.multiplyScalar(1.15);
	containerEarth.add( atmosphereMeshGlow );

	let cloudMesh	= THREEx.Planets.Earth.clouds(size);
	cloudMesh.receiveShadow = true;
	containerEarth.add(cloudMesh);

	let moonMesh	= THREEx.Planets.Earth.moon();
	moonMesh.scale.multiplyScalar(1/2);
	moonMesh.castShadow	= false;
    moonMesh.receiveShadow = true;

	containerEarth.add(moonMesh);

	moonMesh.angle = 0;
	onRenderFcts.push(function(delta, now){
		earthMesh.rotation.y  += 1/64 * delta;
		cloudMesh.rotation.y  += 1/32 * delta;
		moonMesh.angle += 1 / 256;
		
		moonMesh.position.set(8 * Math.cos(moonMesh.angle),8 * Math.sin(moonMesh.angle),0);
		
		if (moonMesh.angle >= 360)
			moonMesh.angle = 0;

	});

	return containerEarth;
};



THREEx.Planets.Earth.label = function() {
	let label = document.createElement( 'div' );
	label.className = "label";
	label.innerHTML = "Terra </br> (Homeworld)";
	return new THREE.CSS3DObject( label );
};



THREEx.Planets.Earth.clouds	= function(size){
	// create destination canvas
	let canvasResult	= document.createElement('canvas');
	canvasResult.width	= 1024;
	canvasResult.height	= 512;
	let contextResult	= canvasResult.getContext('2d');

	// load earthcloudmap
	let imageMap	= new Image();
	imageMap.addEventListener("load", function() {
		
		// create dataMap ImageData for earthcloudmap
		let canvasMap	= document.createElement('canvas');
		canvasMap.width	= imageMap.width;
		canvasMap.height= imageMap.height;
		let contextMap	= canvasMap.getContext('2d');
		contextMap.drawImage(imageMap, 0, 0);
		let dataMap	= contextMap.getImageData(0, 0, canvasMap.width, canvasMap.height);

		// load earthcloudmaptrans
		let imageTrans	= new Image();
		imageTrans.addEventListener("load", function(){
			// create dataTrans ImageData for earthcloudmaptrans
			let canvasTrans		= document.createElement('canvas');
			canvasTrans.width	= imageTrans.width;
			canvasTrans.height	= imageTrans.height;
			let contextTrans	= canvasTrans.getContext('2d');
			contextTrans.drawImage(imageTrans, 0, 0);
			let dataTrans		= contextTrans.getImageData(0, 0, canvasTrans.width, canvasTrans.height);
			// merge dataMap + dataTrans into dataResult
			let dataResult		= contextMap.createImageData(canvasMap.width, canvasMap.height);
			for(let y = 0, offset = 0; y < imageMap.height; y++){
				for(let x = 0; x < imageMap.width; x++, offset += 4){
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

	let geometry	= new THREE.SphereGeometry(size * 1.02, 32, 32)
	let material	= new THREE.MeshPhongMaterial({
		overdraw: true,
		map		: new THREE.Texture(canvasResult),
		side		: THREE.DoubleSide,
		transparent	: true,
		opacity		: 0.8
	});

	return new THREE.Mesh(geometry, material);
};

THREEx.Planets.Earth.moon = function() {
	let geometry	= new THREE.SphereGeometry(0.5, 32, 32);
	let material	= new THREE.MeshPhongMaterial({
		overdraw: true,
		map			: THREE.ImageUtils.loadTexture(THREEx.Planets.baseURL+'earth/images/moonmap1k.jpg'),
		bumpMap		: THREE.ImageUtils.loadTexture(THREEx.Planets.baseURL+'earth/images/moonbump1k.jpg'),
		bumpScale	: 0.01
	});

	return new THREE.Mesh(geometry, material);;
};

