
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
renderer.setClearColor(new THREE.Color(0x000000), 1);
renderer.setSize( window.innerWidth, window.innerHeight );
renderer.domElement.className = "glworld";
document.body.appendChild( renderer.domElement );

var rendererStats   = new THREEx.RendererStats();
rendererStats.domElement.style.position = 'absolute';
rendererStats.domElement.style.left = '0px';
rendererStats.domElement.style.bottom   = '0px';
document.body.appendChild( rendererStats.domElement );

// array of functions for the rendering loop
var onRenderFcts= [];

// init glscene and camera
var glscene	= new THREE.Scene();
var cssScene	= new THREE.Scene();
var camera	= new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.01, 1000);	
var controls	= new THREE.OrbitControls(camera);
var groupSelection = new THREE.GroupSelection(camera);
var selectedObject = false;
var running = true;
var planets = [];
controls.noPan = true;
controls.noZoom = false;
var selectedTarget = false;

//////////////////////////////////////////////////////////////////////////////////
//		init dom events
//////////////////////////////////////////////////////////////////////////////////

var domEvents	= new THREEx.DomEvents(camera, renderer.domElement);

//////////////////////////////////////////////////////////////////////////////////
//		Build Menu
//////////////////////////////////////////////////////////////////////////////////

var toggleBuildMenu = function(planet) {
	var buildMenuHTML = document.getElementById("buildMenu");
	var heading = document.getElementById("headTitle");
	var testBtn = document.getElementById("testBtn");
	buildMenuHTML.style.display = "block";
    heading.innerHTML = planet.name;
    // @todo : add circle on planet
    var radius   = 5,
        segments = 64,
        material = new THREE.LineBasicMaterial( { color: 0x6495ed, opacity: 1 } ),
        geometry = new THREE.CircleGeometry( radius, segments );
    geometry.vertices.shift();
    var outline = new THREE.Line( geometry, material );
    onRenderFcts.push(function() {
        outline.rotation = camera.rotation.clone();
    });
    planet.add(outline);


	testBtn.onclick = function () { addStation("terran","probe"); };
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


require(["../objects/terra/terra"],function() {
	var earthDist = { x:50 , y:40 , z: 0};
    var planet_size = 4;
	var planet	= THREEx.Planets.Terra.create(planet_size);
	planet.position.set(earthDist.x,earthDist.y,earthDist.z);
    planet.stations = [];
    planet.gravity = 0.1;
    planet.size = planet_size;


	/////////////////////////////////
	// ADD EARTH TO SCENE
	/////////////////////////////////
    planets.push(planet);
	glscene.add(planet);

	/////////////////////////////////
	// CLICK EARTH LISTENERS
	/////////////////////////////////
	domEvents.addEventListener(glscene.getObjectByName( "TERRA", true ), 'dblclick',  function(event) {
		if (selectedTarget !== event.target) {
			cameraFocusCallBack(event,function() {
				toggleBuildMenu(planet);
			});
		}
	}, false);
});

function addStation(race,station) {

    //////////////////////////////////////////////////////////////////////////////////
    //		Space Station
    //////////////////////////////////////////////////////////////////////////////////

    require(["../objects/"+race+"/" +station + "/" + station], function() {
        THREEx.Ships.probe(function(geometry,material) {

            var parent = new THREE.Object3D();

            var materials = new THREE.MeshFaceMaterial(material);

            var station = new THREE.Mesh( geometry, materials);

            station.scale.multiplyScalar(1/1024);
            station.castShadow = true;
            station.receiveShadow  = true;

            station.name = "probe";

            parent.rotation.z = (planets[0].stations.length * 2) * Math.PI / 12;

            station.position.y = (planets[0].size / 2) + 3 + (Math.random() * 2);
            //station.position.x = 3 + (Math.random() * 2);

            parent.add(station);

            geometry = new THREE.Geometry();
            geometry.vertices.push(new THREE.Vector3(0,0,0));
            geometry.vertices.push(station.position);

            var line = new THREE.Line( geometry, new THREE.LineBasicMaterial( { color: 0x0066FF} ) );
            parent.add( line );
            planets[0].add( parent );

            onRenderFcts.push(function(){
                parent.rotation.z += (0.01 * planets[0].gravity);
            });

            planets[0].stations.push(parent);
        });
    });
}

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
    if (rendererStats)
        rendererStats.update(renderer);
});



// run the rendering loop
var lastTimeMsec= null;
requestAnimationFrame(function animate(nowMsec){
    if (running) {
        requestAnimationFrame(animate);
        lastTimeMsec = lastTimeMsec || nowMsec - 1000 / 60;
        var deltaMsec = Math.min(200, nowMsec - lastTimeMsec);
        lastTimeMsec = nowMsec;
        TWEEN.update(nowMsec);
        onRenderFcts.forEach(function (onRenderFct) {
            onRenderFct(deltaMsec / 1000, nowMsec / 1000);
            controls.update();
        });
    }
});