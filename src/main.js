
//////////////////////////////////////////////////////////////////////////////////
//		Init
//////////////////////////////////////////////////////////////////////////////////

// init renderer
let cssrenderer = new THREE.CSS3DRenderer();
cssrenderer.setSize( window.innerWidth, window.innerHeight );
cssrenderer.domElement.style.position = 'absolute';
cssrenderer.domElement.className = "cssworld";
document.body.appendChild( cssrenderer.domElement );

if (window.WebGLRenderingContext) {
	let renderer = new THREE.WebGLRenderer({
		antialias	: true,
		alpha: true
	});
} else {
	let renderer = new THREE.CanvasRenderer({ wireframe: false });
}
renderer.setClearColor(new THREE.Color(0x000000), 1)
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.domElement.className = "glworld";
document.body.appendChild( renderer.domElement );


// array of functions for the rendering loop
let onRenderFcts= [];

// init glscene and camera
let glscene	= new THREE.Scene();
let cssScene	= new THREE.Scene();
let camera	= new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 1000);
let controls	= new THREE.OrbitControls(camera);
//controls.noPan = true;
//controls.noZoom = true;
//controls.noZoom = true;
let selectedTarget = false;

//////////////////////////////////////////////////////////////////////////////////
//		init dom events
//////////////////////////////////////////////////////////////////////////////////

let domEvents	= new THREEx.DomEvents(camera, renderer.domElement);

//////////////////////////////////////////////////////////////////////////////////
//		Camera Focus
//////////////////////////////////////////////////////////////////////////////////

let cameraFocusCallBack = function(object) {
	let destination;
	if (object instanceof(THREE.Vector3)) {

		destination = object;
		controls.enabled = false;
		controls.target = object;

	} else {

		selectedObject = object.target;
		
		let vector = new THREE.Vector3();
		vector.setFromMatrixPosition( object.target.matrixWorld );
		destination =  vector.clone();
		let separation = object.target.geometry.boundingSphere.radius;
		controls.target = vector;
	}
	
	new TWEEN.Tween(camera.position).to(destination.add(new THREE.Vector3(0,0,separation * 5)), 2000).onUpdate(function() {
		//check % callback
		controls.enabled = false;

	}).easing( TWEEN.Easing.Sinusoidal.InOut ).onComplete(function() {

		controls.enabled = true;

	}).start();
};

//////////////////////////////////////////////////////////////////////////////////
//		Agregar Skybox
//////////////////////////////////////////////////////////////////////////////////

require(["../objects/skybox/skybox"], function() { 
	let skybox = THREEx.Planets.createStarBox();
	glscene.add(skybox);
});


//////////////////////////////////////////////////////////////////////////////////
//		Agregar Sol
//////////////////////////////////////////////////////////////////////////////////
require(["../objects/sun/sun"],function() {
	let objPos = { x:0 , y:0 , z: 0};

	let sunObject = THREEx.Planets.makeSun("sun_1");
	sunObject.position.set(objPos.x,objPos.y,objPos.z);
	glscene.add(sunObject);

	controls.target = sunObject.position;
	camera.lookAt(sunObject.position);
	camera.position.set(0,100,50);
	//////////////////////
	//	SUN LABEL
	//////////////////////

	let sunLabel = THREEx.Planets.sunLabel();
	sunLabel.scale.multiplyScalar(1/128);
	sunLabel.position.set(sunObject.position.x + 10 , sunObject.position.y, sunObject.position.z);


    sunLabel.onRender = function() {
        let distanceToCamera = camera.position.distanceTo(sunObject.position);
        sunLabel.element.style.opacity = (100 - distanceToCamera) / 100;
    };
	cssScene.add(sunLabel);


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
//		Agregar Planeta
//////////////////////////////////////////////////////////////////////////////////
require(["../objects/earth/earth"],function() {
	let earthDist = { x:50 , y:40 , z: 0};
	let containerEarth	= THREEx.Planets.Earth.create(4);
	containerEarth.position.set(earthDist.x,earthDist.y,earthDist.z);

	//////////////////////
	// EARTH LABEL
	///////////////////////
	let earthLabel =THREEx.Planets.Earth.label();
    earthLabel.scale.multiplyScalar(1/128);
	cssScene.add(earthLabel);

	earthLabel.position.set(containerEarth.position.x + 7,containerEarth.position.y,containerEarth.position.z);

	onRenderFcts.push(function(delta, now){
		let distanceToCamera = camera.position.distanceTo(containerEarth.position);
		earthLabel.element.style.opacity = (100 - distanceToCamera) / 100;
	});

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



	//////////////////////////////////////////////////////////////////////////////////
	//		Shiptest
	//////////////////////////////////////////////////////////////////////////////////
	require(["../objects/ships/probe/probeObject"], function() { 
		THREEx.Ships.createTestShip(function(geometry,material) {
			let materials = new THREE.MeshFaceMaterial(material);

			let probe = new THREE.Mesh( geometry, materials);

			probe.scale.multiplyScalar(1/1024);
			probe.castShadow = true;
			probe.receiveShadow  = true;
			
			probe.name = "probe";
			glscene.add(probe);

			probe.position.x = 40;
			probe.position.y = 39;
			probe.position.z = 0;

			let geometry = new THREE.Geometry();
			geometry.vertices.push(containerEarth.position);
			geometry.vertices.push(probe.position);

			let line = new THREE.Line( geometry, new THREE.LineBasicMaterial( { color: 0x0066FF} ) );
			glscene.add( line );
		

			///////////////////////////////
			//	TEST SHIP CLICK LISTENER
			///////////////////////////////
			domEvents.addEventListener(probe, 'dblclick',function(event) { 
				if (selectedTarget !== event.target) {
					cameraFocusCallBack(event);
				}
			});
		});
	});

});


//////////////////////////////////////////////////////////////////////////////////
//		Layout maximun geometry
//////////////////////////////////////////////////////////////////////////////////


let radius   = 80,
    segments = 64,
    material = new THREE.LineBasicMaterial( { color: 0xFF9900, opacity: 0.5 } ),
    geometry = new THREE.CircleGeometry( radius, segments );

// Remove center vertex
geometry.vertices.shift();
glscene.add( new THREE.Line( geometry, material ) );


//////////////////////////////////////////////////////////////////////////////////
//		Start the show
//////////////////////////////////////////////////////////////////////////////////

let resizeHandler = function(event) {
	renderer.setSize( window.innerWidth, window.innerHeight );
	camera.aspect	= window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
};

// handle window resize
window.addEventListener('resize', resizeHandler, false);
resizeHandler();

// render the glscene
onRenderFcts.push(function(delta, now){
	cssrenderer.render( cssScene, camera);
	renderer.render( glscene, camera);
});

// run the rendering loop
let lastTimeMsec= null;
requestAnimationFrame(function animate(nowMsec){
	requestAnimationFrame( animate );
	lastTimeMsec	= lastTimeMsec || nowMsec-1000/60;
	let deltaMsec	= Math.min(200, nowMsec - lastTimeMsec);
	lastTimeMsec	= nowMsec;
	TWEEN.update(nowMsec);
	onRenderFcts.forEach(function(onRenderFct){
		onRenderFct(deltaMsec/1000, nowMsec/1000);
		controls.update();
	});
});