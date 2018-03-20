import {AdditiveBlending, Color, FrontSide, ShaderMaterial} from "three";

const atmosphereShader = require('../glsl/atmosphere.shader');

const AtmosphereMaterial = () => {
    // create custom material from the shader code above
    //   that is within specially labeled script tags
    return new ShaderMaterial({
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
                value	: new Color('red')
            },
        },
        vertexShader	: atmosphereShader.vertex,
        fragmentShader	: atmosphereShader.fragment,
        side		: FrontSide,
        blending	: AdditiveBlending,
        transparent	: true,
        depthWrite	: false,
        overdraw: true
    });
};

export default AtmosphereMaterial;