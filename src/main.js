
//////////////////////////////////////////////////////////////////////////////////
//		Init
//////////////////////////////////////////////////////////////////////////////////

// init renderer

var cssrenderer = new THREE.CSS3DRenderer(); 
cssrenderer.setSize( window.innerWidth, window.innerHeight );
cssrenderer.domElement.style.position = 'absolute';
cssrenderer.domElement.className = "cssworld";
document.body.appendChild( cssrenderer.domElement );

if (window.WebGLRenderingContext) {
	var renderer = new THREE.WebGLRenderer({
		antialias	: true,
		alpha: true
	});
} else {
	var renderer = new THREE.CanvasRenderer({ wireframe: false });
}
renderer.setClearColor(new THREE.Color('lightgrey'), 1)
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.domElement.className = "glworld";
document.body.appendChild( renderer.domElement );


// array of functions for the rendering loop
var onRenderFcts= [];

// init glscene and camera
var glscene	= new THREE.Scene();
var cssScene	= new THREE.Scene();
var camera	= new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 1000);	
var controls	= new THREE.OrbitControls(camera)
var selectedTarget = false;

//////////////////////////////////////////////////////////////////////////////////
//		init dom events
//////////////////////////////////////////////////////////////////////////////////

var domEvents	= new THREEx.DomEvents(camera, renderer.domElement);
var labeltest = false;

//////////////////////////////////////////////////////////////////////////////////
//		Camera Focus
//////////////////////////////////////////////////////////////////////////////////

var cameraFocusCallBack = function(event) {
	selectedObject = event.target;
	
	var vector = new THREE.Vector3();
	vector.setFromMatrixPosition( event.target.matrixWorld );
	var destination =  vector.clone();
	
	controls.target = vector;
	controls.enabled = false;
	var separation = event.target.geometry.boundingSphere.radius;
	var tween = new TWEEN.Tween(camera.position).to(destination.add(new THREE.Vector3(0,0,separation * 5)), 4000).onUpdate(function() {
		//check % callback

	}).easing( TWEEN.Easing.Sinusoidal.InOut ).onComplete(function() {
		controls.enabled = true;
	}).start();
};


var cameraFocusObject = function(object,callback) {
	selectedObject = object;
	var tween = new TWEEN.Tween(camera.position).to(object.position.add(new THREE.Vector3(0,0,separation * 5)), 4000).onUpdate(function() {
		//check % callback

	}).easing( TWEEN.Easing.Sinusoidal.InOut ).onComplete(function() {
		controls.enabled = true;
	}).start();
};

//////////////////////////////////////////////////////////////////////////////////
//		Agregar Planeta Tierra
//////////////////////////////////////////////////////////////////////////////////
require(["../objects/earth/earth"],function() {
	var earthDist = { x:80 , y:0 , z: 0};
	var containerEarth	= new THREE.Object3D()
	containerEarth.position.set(earthDist.x,earthDist.y,earthDist.z);	

	var earthMesh	= THREEx.Planets.createEarth()
	

	var geometry	= new THREE.SphereGeometry(0.5, 32, 32)
	var material	= THREEx.createAtmosphereMaterial()
	material.uniforms.glowColor.value.set(0x00b3ff)
	material.uniforms.coeficient.value	= 0.8
	material.uniforms.power.value		= 2.0
	var atmosphereMesh	= new THREE.Mesh(geometry, material );
	atmosphereMesh.scale.multiplyScalar(1.01);
	containerEarth.add( atmosphereMesh );

	var geometry	= new THREE.SphereGeometry(0.5, 32, 32)
	var material	= THREEx.createAtmosphereMaterial()
	material.side	= THREE.BackSide
	material.uniforms.glowColor.value.set(0x00b3ff)
	material.uniforms.coeficient.value	= 0.4
	material.uniforms.power.value		= 4.0
	var atmosphereMeshGlow	= new THREE.Mesh(geometry, material );
	atmosphereMeshGlow.scale.multiplyScalar(1.15);
	containerEarth.add( atmosphereMeshGlow );

	var cloudMesh	= THREEx.Planets.createEarthCloud()
	containerEarth.add(cloudMesh);
	containerEarth.add(earthMesh);

	domEvents.addEventListener(earthMesh, 'dblclick',  function(event) {
		if (selectedTarget !== event.target) {
			cameraFocusCallBack(event);
		}
	}, false);

	
	var moonMesh	= THREEx.Planets.createEarthMoon();
	moonMesh.position.set( 2 , 2 ,0);
	moonMesh.scale.multiplyScalar(1/12)
	moonMesh.receiveShadow	= true
	moonMesh.castShadow	= true
	containerEarth.add(moonMesh);

	domEvents.addEventListener(moonMesh, 'dblclick', function(event) { 
		if (selectedTarget !== event.target) {
			cameraFocusCallBack(event);
		}
	}, false);

	//earth rotation
	moonMesh.angle = 0;
	onRenderFcts.push(function(delta, now){
		earthMesh.rotation.y  += 1/64 * delta;
		cloudMesh.rotation.y  += 1/32 * delta;
		moonMesh.angle += 1 / 128;
		
		moonMesh.position.set(2 * Math.cos(moonMesh.angle),2 * Math.sin(moonMesh.angle),0);
		
		if (moonMesh.angle >= 360)
			moonMesh.angle = 0;

	});

	// earth label
	var earthLabel = THREEx.Planets.createEarthLabel();
	earthLabel.scale.multiplyScalar(1/512);
	cssScene.add(earthLabel);
	//earthLabel.add(camera);
	earthLabel.position.set(containerEarth.position.x + 1,containerEarth.position.y,containerEarth.position.z);
	onRenderFcts.push(function(delta, now){
		if (earthLabel.position.distanceTo(camera.position) <= 6) {
			
		} else {
		
		}
		earthLabel.lookAt(camera.position);
	});

	//earthLabel.position = containerEarth.position;

	glscene.add(containerEarth);
	controls.target = containerEarth.position;
	camera.lookAt(containerEarth.position);
});

//////////////////////////////////////////////////////////////////////////////////
//		Agregar Skybox
//////////////////////////////////////////////////////////////////////////////////

require(["../objects/skybox/skybox"], function() { 
	var mesh = THREEx.Planets.createStarBox();
	glscene.add(mesh);
});

//////////////////////////////////////////////////////////////////////////////////
//		Agregar luces
//////////////////////////////////////////////////////////////////////////////////
//
var light	= new THREE.PointLight( 0xffffff, 1 , 0 )
light.position.set(0,0,0)
glscene.add( light )
light.castShadow	= true
light.shadowCameraNear	= 0.01
light.shadowCameraFar	= 15
light.shadowCameraFov	= 45

light.shadowCameraLeft	= -3
light.shadowCameraRight	=  3
light.shadowCameraTop	=  3
light.shadowCameraBottom= -3
// light.shadowCameraVisible	= true

light.shadowBias	= 0.001
light.shadowDarkness	= 0.2

light.shadowMapWidth	= 1024
light.shadowMapHeight	= 1024
light.angle = 0;


//////////////////////////////////////////////////////////////////////////////////
//		Agregar Sol
//////////////////////////////////////////////////////////////////////////////////
require(["../objects/sun/sun"],function() { 
	var sunMesh = THREEx.Planets.makeSun();
	sunMesh.position = light.position;
	glscene.add(sunMesh);

	domEvents.addEventListener(sunMesh, 'dblclick',function(event) { 
		if (selectedTarget !== event.target) {
			cameraFocusCallBack(event);
		}
	});


	var sunLabel = THREEx.Planets.sunLabel();
	sunLabel.scale.multiplyScalar(1/128);
	sunLabel.position.set(sunMesh.position.x + 10 , sunMesh.position.y, sunMesh.position.z);
	cssScene.add(sunLabel);

	onRenderFcts.push(function(delta, now){ 
		sunLabel.lookAt(camera.position);
		sunMesh.rotation.y  += 1/64 * delta;
	});

});


//////////////////////////////////////////////////////////////////////////////////
//		Comenzar el show
//////////////////////////////////////////////////////////////////////////////////

var resizeHandler = function(event) {
	renderer.setSize( window.innerWidth, window.innerHeight )
	camera.aspect	= window.innerWidth / window.innerHeight
	camera.updateProjectionMatrix();
};

// handle window resize
window.addEventListener('resize', resizeHandler, false);
resizeHandler();

// render the glscene
onRenderFcts.push(function(delta, now){
	cssrenderer.render( cssScene, camera);
	renderer.render( glscene, camera);
})

// run the rendering loop
var lastTimeMsec= null
requestAnimationFrame(function animate(nowMsec){
	requestAnimationFrame( animate );
	lastTimeMsec	= lastTimeMsec || nowMsec-1000/60
	var deltaMsec	= Math.min(200, nowMsec - lastTimeMsec)
	lastTimeMsec	= nowMsec
	TWEEN.update(nowMsec);
	onRenderFcts.forEach(function(onRenderFct){
		onRenderFct(deltaMsec/1000, nowMsec/1000);
		controls.update();
	})
});


var domListeners = function() { 
	document.getElementById("earthFocusBtn").addEventListener("click", function() { 
		cameraFocusObject(earthMesh);
	});

};