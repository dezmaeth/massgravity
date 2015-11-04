var THREEx = THREEx || {};

THREEx.Planets = THREEx.Planets || {};

THREEx.Planets.baseURL	= 'objects/'

THREEx.Planets.createStarBox = function() {
    var uniforms ={ "tCube": { type: "t", value: null },
      "tFlip": { type: "f", value: -1 } };

    var vertexShader = [

      "varying vec3 vWorldPosition;",

      THREE.ShaderChunk[ "logdepthbuf_pars_vertex" ],

      "void main() {",

      "   vec4 worldPosition = modelMatrix * vec4( position, 1.0 );",
      "   vWorldPosition = worldPosition.xyz;",

      "   gl_Position = projectionMatrix * modelViewMatrix * vec4( position + cameraPosition, 1.0 );",

      THREE.ShaderChunk[ "logdepthbuf_vertex" ],

      "}"

    ].join("\n");

    var fragmentShader = [
      "uniform samplerCube tCube;",
      "uniform float tFlip;",
      "varying vec3 vWorldPosition;",

      THREE.ShaderChunk[ "logdepthbuf_pars_fragment" ],

      "void main() {",

      "   gl_FragColor = textureCube( tCube, vec3( tFlip * vWorldPosition.x, vWorldPosition.yz ) );",

      THREE.ShaderChunk[ "logdepthbuf_fragment" ],

      "}"

    ].join("\n");

  var urlPrefix = THREEx.Planets.baseURL + "skybox/empty_space/";
  var urls = [ urlPrefix + "m_RT.jpg", urlPrefix + "m_LF.jpg",
      urlPrefix + "m_UP.jpg", urlPrefix + "m_DN.jpg",
      urlPrefix + "m_FT.jpg", urlPrefix + "m_BK.jpg" ];

  var textureCube	= THREE.ImageUtils.loadTextureCube( urls );
  textureCube.format = THREE.RGBFormat;
  uniforms["tCube"].value = textureCube;

  var skyMaterial = new THREE.ShaderMaterial({
    fragmentShader: fragmentShader,
    vertexShader: vertexShader,
    uniforms: uniforms,
    depthWrite: false,
    side: THREE.BackSide
  });

  var skyBox = new THREE.Mesh(new THREE.BoxGeometry(750,750,750), skyMaterial);
  skyMaterial.frustumCulled = false;
  return skyBox;
};