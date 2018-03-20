let THREEx = THREEx || {};

THREEx.Planets = THREEx.Planets || {};

THREEx.Planets.baseURL	= '../objects/'

THREEx.Planets.createStarBox = function() {
    let uniforms ={ "tCube": { type: "t", value: null },
      "tFlip": { type: "f", value: -1 } };

    let vertexShader = [

      "letying vec3 vWorldPosition;",

      THREE.ShaderChunk[ "logdepthbuf_pars_vertex" ],

      "void main() {",

      "   vec4 worldPosition = modelMatrix * vec4( position, 1.0 );",
      "   vWorldPosition = worldPosition.xyz;",

      "   gl_Position = projectionMatrix * modelViewMatrix * vec4( position + cameraPosition, 1.0 );",

      THREE.ShaderChunk[ "logdepthbuf_vertex" ],

      "}"

    ].join("\n");

    let fragmentShader = [
      "uniform samplerCube tCube;",
      "uniform float tFlip;",
      "letying vec3 vWorldPosition;",

      THREE.ShaderChunk[ "logdepthbuf_pars_fragment" ],

      "void main() {",

      "   gl_FragColor = textureCube( tCube, vec3( tFlip * vWorldPosition.x, vWorldPosition.yz ) );",

      THREE.ShaderChunk[ "logdepthbuf_fragment" ],

      "}"

    ].join("\n");

  let urlPrefix = THREEx.Planets.baseURL + "skybox/empty_space/";
  let urls = [ urlPrefix + "m_RT.jpg", urlPrefix + "m_LF.jpg",
      urlPrefix + "m_UP.jpg", urlPrefix + "m_DN.jpg",
      urlPrefix + "m_FT.jpg", urlPrefix + "m_BK.jpg" ];

  let textureCube	= THREE.ImageUtils.loadTextureCube( urls );
  textureCube.format = THREE.RGBFormat;
  uniforms["tCube"].value = textureCube;

  let skyMaterial = new THREE.ShaderMaterial({
    fragmentShader: fragmentShader,
    vertexShader: vertexShader,
    uniforms: uniforms,
    depthWrite: false,
    side: THREE.BackSide
  });

  let skyBox = new THREE.Mesh(new THREE.BoxGeometry(750,750,750), skyMaterial);
  skyMaterial.frustumCulled = false;
  return skyBox;
};