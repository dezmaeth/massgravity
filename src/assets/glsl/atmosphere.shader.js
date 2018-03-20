module.exports = require('shader-reload')({
    fragment: `
    uniform float coeficient;
    uniform float power;
    uniform vec3  glowColor;
    varying vec3  vNormal;
    void main () {
       float intensity	= pow( coeficient - dot(vNormal, vec3(0.0, 0.0, 1.0)), power );
       gl_FragColor	= vec4( glowColor * intensity, 1.0 );
    }`,
    vertex: `
    varying vec3 vNormal;
    void main () {
        vNormal		= normalize( normalMatrix * normal );
        gl_Position	= projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }`
});