import {ShaderMaterial, Vector2} from "three";
const NoiseShader = require('../glsl/noise.shader');


const NoiseShaderMaterial	= (opts) => {
    opts	= opts	|| {};
    opts.vertexShader	= NoiseShader.vertex;
    opts.fragmentShader	= NoiseShader.fragment;
    opts.uniforms		= opts.uniforms		|| {
        time	: { type: "f" , value: 1.0 },
        scale	: { type: "v2", value: new Vector2( 1, 1 ) },
        offset	: { type: "v2", value: new Vector2( 0, 0 ) },
    };

    return new ShaderMaterial(opts)
};


export default NoiseShaderMaterial;