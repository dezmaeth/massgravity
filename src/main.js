
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
renderer.setClearColor(new THREE.Color(0x000000), 1)
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
var selectedObject = false;
var planets = [];
controls.noPan = false;
controls.noZoom = false;
var selectedTarget = false;

//////////////////////////////////////////////////////////////////////////////////
//		init dom events
//////////////////////////////////////////////////////////////////////////////////

var domEvents	= new THREEx.DomEvents(camera, renderer.domElement);

//////////////////////////////////////////////////////////////////////////////////
//		Build Menu
//////////////////////////////////////////////////////////////////////////////////

var toggleBuildMenu = function(object) {
	var buildMenuHTML = document.getElementById("buildMenu");
	var heading = document.getElementById("headTitle");
	var bonjourBtn = document.getElementById("testBtn");
	buildMenuHTML.style.display = "block";
    heading.innerHTML = object.name;


    bonjourBtn.onclick = addStation;
};

//////////////////////////////////////////////////////////////////////////////////
//		Camera Focus
//////////////////////////////////////////////////////////////////////////////////

var cameraFocusCallBack = function(object,onEndCallback) {
	var destination;
	if (object instanceof(THREE.Vector3)) {

		destination = object;
		controls.enabled = false;
		controls.target = object;

	} else {

		selectedObject = object.target;
		
		var vector = new THREE.Vector3();
		vector.setFromMatrixPosition( object.target.matrixWorld );
		destination =  vector.clone();
		var separation = object.target.geometry.boundingSphere.radius;
		controls.target = vector;
	}
	
	new TWEEN.Tween(camera.position).to(destination.add(new THREE.Vector3(0,0,separation * 5)), 2000).onUpdate(function() {
		//check % callback
		controls.enabled = false;

	}).easing( TWEEN.Easing.Sinusoidal.InOut ).onComplete(function() {

		controls.enabled = true;
		if (onEndCallback !== undefined)
			onEndCallback();

	}).start();
};

//////////////////////////////////////////////////////////////////////////////////
//		Agregar Skybox
//////////////////////////////////////////////////////////////////////////////////

require(["../objects/skybox/skybox"], function() { 
	var skybox = THREEx.Planets.createStarBox();
	glscene.add(skybox);
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

	var sunLabel = THREEx.Planets.sunLabel();
	sunLabel.scale.multiplyScalar(1/128);
	sunLabel.position.set(sunObject.position.x + 10 , sunObject.position.y, sunObject.position.z);


    sunLabel.onRender = function() {
        var distanceToCamera = camera.position.distanceTo(sunObject.position);
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
	var earthDist = { x:50 , y:40 , z: 0};
	var containerEarth	= THREEx.Planets.Earth.create(4);
	containerEarth.position.set(earthDist.x,earthDist.y,earthDist.z);
    containerEarth.name = "Terra";
    containerEarth.stations = [];
    containerEarth.gravity = 0.1;
	//////////////////////
	// EARTH LABEL
	///////////////////////
	var earthLabel =THREEx.Planets.Earth.label();
    earthLabel.scale.multiplyScalar(1/128);
	cssScene.add(earthLabel);

	earthLabel.position.set(containerEarth.position.x + 7,containerEarth.position.y,containerEarth.position.z);

	onRenderFcts.push(function(delta, now){
		var distanceToCamera = camera.position.distanceTo(containerEarth.position);
		earthLabel.element.style.opacity = (100 - distanceToCamera) / 100;
	});

	/////////////////////////////////
	// ADD EARTH TO SCENE
	/////////////////////////////////
    planets[0] = containerEarth;
	glscene.add(containerEarth);

	/////////////////////////////////
	// CLICK EARTH LISTENERS
	/////////////////////////////////
	domEvents.addEventListener(glscene.getObjectByName( "EARTH", true ), 'dblclick',  function(event) {
		if (selectedTarget !== event.target) {
			cameraFocusCallBack(event,function() {
				toggleBuildMenu(containerEarth);
			});
		}
	}, false);
});

function addStation() {

    //////////////////////////////////////////////////////////////////////////////////
    //		Space Station Test
    //////////////////////////////////////////////////////////////////////////////////

    require(["../objects/ships/probe/probeObject"], function() {
        THREEx.Ships.createTestShip(function(geometry,material) {

            var parent = new THREE.Object3D();

            var materials = new THREE.MeshFaceMaterial(material);

            var probe = new THREE.Mesh( geometry, materials);

            probe.scale.multiplyScalar(1/1024);
            probe.castShadow = true;
            probe.receiveShadow  = true;

            probe.name = "probe";

            probe.rotation.z = (planets[0].stations.length * 2) * Math.PI / 3;

            parent.add(probe);

            var geometry = new THREE.Geometry();
            geometry.vertices.push(new THREE.Vector3(0,0,0));
            geometry.vertices.push(probe.position);

            var line = new THREE.Line( geometry, new THREE.LineBasicMaterial( { color: 0x0066FF} ) );
            parent.add( line );
            planets[0].add( parent );

            onRenderFcts.push(function(delta, now){
                parent.rotation.z += (0.01 * planets[0].gravity);
            });

            planets[0].stations.push(parent);

            probe.position.y = 3 + (Math.random() * 2);
            probe.position.x = 3 + (Math.random() * 2);

            ///////////////////////////////
            //	TEST SHIP CLICK LISTENER
            ///////////////////////////////
            /*domEvents.addEventListener(probe, 'dblclick',function(event) {
                if (selectedTarget !== event.target) {
                    cameraFocusCallBack(event);
                }
            });*/
        });
    });
}


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
//		Start the show
//////////////////////////////////////////////////////////////////////////////////

var resizeHandler = function(event) {
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
var lastTimeMsec= null;
requestAnimationFrame(function animate(nowMsec){
	requestAnimationFrame( animate );
	lastTimeMsec	= lastTimeMsec || nowMsec-1000/60;
	var deltaMsec	= Math.min(200, nowMsec - lastTimeMsec);
	lastTimeMsec	= nowMsec;
	TWEEN.update(nowMsec);
	onRenderFcts.forEach(function(onRenderFct){
		onRenderFct(deltaMsec/1000, nowMsec/1000);
		controls.update();
	});
});