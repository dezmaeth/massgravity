
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
var controls	= new THREE.OrbitControls(camera);
controls.noPan = true;
//controls.noZoom = true;
var selectedTarget = false;

//////////////////////////////////////////////////////////////////////////////////
//		init dom events
//////////////////////////////////////////////////////////////////////////////////

var domEvents	= new THREEx.DomEvents(camera, renderer.domElement);
var labeltest = false;

//////////////////////////////////////////////////////////////////////////////////
//		Camera Focus
//////////////////////////////////////////////////////////////////////////////////

var cameraFocusCallBack = function(object) {
	if (object instanceof(THREE.Vector3)) {
		var destination = object;
		controls.enabled = false;
		controls.target = object;

	} else {
		selectedObject = object.target;
		
		var vector = new THREE.Vector3();
		vector.setFromMatrixPosition( object.target.matrixWorld );
		var destination =  vector.clone();
		
		controls.target = vector;
		controls.enabled = false;
		var separation = object.target.geometry.boundingSphere.radius;
	}
	
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
//		Agregar Skybox
//////////////////////////////////////////////////////////////////////////////////

require(["../objects/skybox/skybox"], function() { 
	var mesh = THREEx.Planets.createStarBox();
	glscene.add(mesh);
});

//////////////////////////////////////////////////////////////////////////////////
//		Agregar Skybox
//////////////////////////////////////////////////////////////////////////////////
require(["../objects/ships/shiptest/shiptest"], function() { 
	THREEx.Ships.createTestShip(function(testship) {
		testship.name = "testship";
		//glscene.add(testship);

		testship.position.x = 40;
		testship.position.y = 40;
		onRenderFcts.push(function(delta, now){
			testship.rotation.y  += 1/32 * delta;
		});
	

		///////////////////////////////
		//	TEST SHIP CLICK LISTENER
		///////////////////////////////

		/*domEvents.addEventListener(glscene.getObjectByName( "testship", true ), 'dblclick',function(event) { 
			if (selectedTarget !== event.target) {
				cameraFocusCallBack(event);
			}
		});*/
	});
});



//////////////////////////////////////////////////////////////////////////////////
//		Agregar Sol
//////////////////////////////////////////////////////////////////////////////////
require(["../objects/sun/sun"],function() {
	var objPos = { x:0 , y:0 , z: 0};


	var sunObject = THREEx.Planets.makeSun("sun_1");
	sunObject.position.set(objPos.x,objPos.y,objPos.z);
	glscene.add(sunObject);



	controls.target = sunObject.position;
	camera.lookAt(sunObject.position);
	camera.position.set(0,100,50);
	//////////////////////
	//	SUN LABEL
	//////////////////////

	/*var sunLabel = THREEx.Planets.sunLabel();
	sunLabel.scale.multiplyScalar(1/128);
	sunLabel.position.set(sunObject.position.x + 10 , sunObject.position.y, sunObject.position.z);
	cssScene.add(sunLabel);
	*/
	

	var lensFlare = glscene.getObjectByName( "sun_1_flare", true );
	console.log(lensFlare);
	/*onRenderFcts.push(function(delta, now){ 
	
	});*/


	///////////////////////////
	//	SUN CLICK LISTENER
	///////////////////////////

	domEvents.addEventListener(glscene.getObjectByName( "sun_1", true ), 'dblclick',function(event) {
		if (selectedTarget !== event.target) {
			cameraFocusCallBack(event);
		}
	});
});


//////////////////////////////////////////////////////////////////////////////////
//		Agregar Planeta Tierra
//////////////////////////////////////////////////////////////////////////////////
require(["../objects/earth/earth"],function() {
	var earthDist = { x:50 , y:40 , z: 0};
	

	var containerEarth	= THREEx.Planets.Earth.create(1);
	containerEarth.position.set(earthDist.x,earthDist.y,earthDist.z);

	//////////////////////
	// EARTH LABEL
	///////////////////////
	/*var earthLabel =THREEx.Planets.Earth.Label();
	earthLabel.scale.multiplyScalar(1/512);
	cssScene.add(earthLabel);

	earthLabel.position.set(containerEarth.position.x + 1,containerEarth.position.y,containerEarth.position.z);
	onRenderFcts.push(function(delta, now){
		earthLabel.lookAt(camera.position);
	});*/

	/////////////////////////////////
	// ADD EARTH TO SCENE
	/////////////////////////////////

	glscene.add(containerEarth);

	/////////////////////////////////
	// CLICK EARTH LISTENERS
	/////////////////////////////////
	domEvents.addEventListener(glscene.getObjectByName( "EARTH", true ), 'dblclick',  function(event) {
		if (selectedTarget !== event.target) {
			cameraFocusCallBack(event);
		}
	}, false);


	// LINE TEST
	var geometry = new THREE.Geometry();
	geometry.vertices.push(containerEarth.position);
	geometry.vertices.push(new THREE.Vector3( 0, 0, 0 ));

	var line = new THREE.Line( geometry, new THREE.LineBasicMaterial( { color: 0xffffff, opacity: 0.5 } ) );
	glscene.add( line );

});


//////////////////////////////////////////////////////////////////////////////////
//		Layout maximun geometry
//////////////////////////////////////////////////////////////////////////////////


var radius   = 80,
    segments = 64,
    material = new THREE.LineBasicMaterial( { color: 0xFF9900, opacity: 0.5 } ),
    geometry = new THREE.CircleGeometry( radius, segments );

// Remove center vertex
geometry.vertices.shift();
glscene.add( new THREE.Line( geometry, material ) );


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