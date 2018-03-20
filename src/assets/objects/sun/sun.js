let THREEx = THREEx || {};

THREEx.Planets	= {}

THREEx.Planets.baseURL	= '../objects/';


THREEx.createAtmosphereMaterial	= function(){
	let vertexShader	= [
		'varying vec3 vNormal;',
		'void main(){',
		'	// compute intensity',
		'	vNormal		= normalize( normalMatrix * normal );',
		'	// set gl_Position',
		'	gl_Position	= projectionMatrix * modelViewMatrix * vec4( position, 1.0 );',
		'}',
	].join('\n')
	let fragmentShader	= [
		'uniform float coeficient;',
		'uniform float power;',
		'uniform vec3  glowColor;',

		'letying vec3  vNormal;',

		'void main(){',
		'	float intensity	= pow( coeficient - dot(vNormal, vec3(0.0, 0.0, 1.0)), power );',
		'	gl_FragColor	= vec4( glowColor * intensity, 1.0 );',
		'}',
	].join('\n')

	// create custom material from the shader code above
	//   that is within specially labeled script tags
	let material	= new THREE.ShaderMaterial({
		uniforms: { 
			coeficient	: {
				type	: "f", 
				value	: 0.5
			},
			power		: {
				type	: "f",
				value	: 2
			},
			glowColor	: {
				type	: "c",
				value	: new THREE.Color('red')
			},
		},
		vertexShader	: vertexShader,
		fragmentShader	: fragmentShader,
		side		: THREE.FrontSide,
		blending	: THREE.AdditiveBlending,
		transparent	: true,
		depthWrite	: false,
		overdraw: true
	});
	return material
};

THREEx.Planets.sunLabel = function() {

	let label = document.createElement( 'div' );
	label.className = "label";
	label.innerHTML = "Sun (life bringer)";
	let object = new THREE.CSS3DObject( label );
	
	return object;

};

THREEx.Planets.makeSun 	= function(name){
	let sunContainer = new THREE.Object3D();
	let diameter = 5;

	let geometry	= new THREE.SphereGeometry(diameter + 0.1 , 32, 32)
	
	let material	= THREEx.createAtmosphereMaterial()
	material.uniforms.glowColor.value.set(0xFFC65C)
	material.uniforms.coeficient.value	= 0.5
	material.uniforms.power.value		= 2.0
	let mesh 		= new THREE.Mesh(geometry, material );
	mesh.name = name;
	mesh.scale.multiplyScalar(1.01);

	let geometry	= new THREE.SphereGeometry(diameter + 0.1 , 32, 32)
	let material	= THREEx.createAtmosphereMaterial()
	material.side	= THREE.BackSide
	material.uniforms.glowColor.value.set(0xFFC65C)
	material.uniforms.coeficient.value	= 0.4
	material.uniforms.power.value		= 4.0
	let sunGlow		= new THREE.Mesh(geometry, material );
	sunGlow.scale.multiplyScalar(1.15);
	mesh.add( sunGlow );


	//////////////////////////////////////////////////////////////////////////////////
	//		lens flare
	//////////////////////////////////////////////////////////////////////////////////
	
	 function lensFlareUpdateCallback( object ) {

				let f, fl = object.lensFlares.length;
				let flare;
				let vecX = -object.positionScreen.x * 2;
				let vecY = -object.positionScreen.y * 2;


				for( f = 0; f < fl; f++ ) {

					   flare = object.lensFlares[ f ];

					   flare.x = object.positionScreen.x + vecX * flare.distance;
					   flare.y = object.positionScreen.y + vecY * flare.distance;

					   flare.rotation = 0;

				}

				object.lensFlares[ 2 ].y += 0.025;
				object.lensFlares[ 3 ].rotation = object.positionScreen.x * 0.5 + THREE.Math.degToRad( 45 );

	}


	let textureFlare0 = THREE.ImageUtils.loadTexture( THREEx.Planets.baseURL+ "sun/images/lensflare0.png" );
	let textureFlare2 = THREE.ImageUtils.loadTexture( THREEx.Planets.baseURL+ "sun/images/lensflare2.png" );
	let textureFlare3 = THREE.ImageUtils.loadTexture( THREEx.Planets.baseURL+ "sun/images/lensflare3.png" );


	let flareColor = new THREE.Color( 0xffffff );
	flareColor.setHSL(0.55, 0.9, 0.5+ 0.5 );

	let lensFlare = new THREE.LensFlare( textureFlare0, 700, 0.0, THREE.AdditiveBlending, flareColor );

	lensFlare.add( textureFlare2, 512, 0.0, THREE.AdditiveBlending );
	lensFlare.add( textureFlare2, 512, 0.0, THREE.AdditiveBlending );
	lensFlare.add( textureFlare2, 512, 0.0, THREE.AdditiveBlending );

	lensFlare.add( textureFlare3, 60, 0.6, THREE.AdditiveBlending );
	lensFlare.add( textureFlare3, 70, 0.7, THREE.AdditiveBlending );
	lensFlare.add( textureFlare3, 120, 0.9, THREE.AdditiveBlending );
	lensFlare.add( textureFlare3, 70, 1.0, THREE.AdditiveBlending );

	lensFlare.customUpdateCallback = lensFlareUpdateCallback;
	lensFlare.name = name + "_flare";
	sunContainer.add(lensFlare);

	
	sunContainer.add( mesh );

	let light	= new THREE.PointLight( 0xffffff, 1 , 0 );
	light.position.set(0,0,0);
	light.castShadow	= true;
	light.shadowCameraNear	= 0.01;
	light.shadowCameraFar	= 15;
	light.shadowCameraFov	= 45;

	light.shadowCameraLeft	= -10;
	light.shadowCameraRight	=  10;
	light.shadowCameraTop	=  10;
	light.shadowCameraBottom= -10;
	

	light.shadowBias	= 0.001;
	light.shadowDarkness	= 0.2;

	light.shadowMapWidth	= 1024;
	light.shadowMapHeight	= 1024;
	light.angle = 0;

	sunContainer.add(light);

	return sunContainer;
}