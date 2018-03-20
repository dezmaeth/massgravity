import seedrandom from 'seedrandom';
import { PointLight, Mesh, Object3D, SphereGeometry, BackSide } from 'three';
import generateName from './name.generator';
import AtmosphereMaterial from "./assets/material/atmosphere.material";
import NoiseShaderMaterial from "./assets/material/noise.material";

class Solar{


    constructor(stringSeed) {
        this.planets = [];
        this.stars = [];
        this.asteroids = [];

        this.seed = seedrandom(stringSeed);
        this.system = new Object3D();

        this.add(this.generateStar());
        this.add(this.generatePlanet());

        return this.system;
    }


    generatePlanet() {
        let planetContainer = new Object3D();
        planetContainer.type = "planet";
        // GENERATE OUTER MESH
        let diameter = 5 * this.seed();
        let geometry	= new SphereGeometry(diameter, 32, 32);
        let material = NoiseShaderMaterial();
        let mesh = new Mesh(geometry, material);
        planetContainer.add( mesh );
        return planetContainer;
    }

    generateStar() {
       let starContainer = new Object3D();
       starContainer.type = "star";
       // GENERATE BASE MESH

       let material = AtmosphereMaterial();
       let diameter = 30 * this.seed();
        material.uniforms.glowColor.value.set(0xFFC65C);
        material.uniforms.coeficient.value	= 0.5;
        material.uniforms.power.value		= 2.0;
        let geometry	= new SphereGeometry(diameter + 0.1 , 32, 32);
        let baseMesh = new Mesh(geometry, material );
        baseMesh.name = generateName(this.seed);
        console.log("GENERATING STAR", baseMesh.name);
        baseMesh.scale.multiplyScalar(1.01);

        // GENERATE OUTER MESH
        geometry	= new SphereGeometry(diameter + 0.1 , 32, 32);
        material	= AtmosphereMaterial();
        material.side	= BackSide;
        material.uniforms.glowColor.value.set(0xFFC65C);
        material.uniforms.coeficient.value	= 0.4;
        material.uniforms.power.value		= 4.0;
        let sunGlow		= new Mesh(geometry, material );
        sunGlow.scale.multiplyScalar(1.15);
        baseMesh.add( sunGlow );


        // GENERATE LIGHT

        let light	= new PointLight( 0xffffff, 1 , 0 );
        light.position.set(0,0,0);
        light.castShadow	= true;
        light.shadow.camera.near	= 0.01;
        light.shadow.camera.far	= 15;
        light.shadow.camera.fov	= 45;

        light.shadow.camera.left	= -10;
        light.shadow.camera.right	=  10;
        light.shadow.camera.top	=  10;
        light.shadow.camera.bottom= -10;


        light.shadow.bias	= 0.001;
        light.shadow.darkness	= 0.2;

        light.shadow.mapSize.width = 1024;
        light.shadow.mapSize.height = 1024;
        light.angle = 0;

        starContainer.add(light);
        starContainer.add(baseMesh);
        return starContainer;
    }

    add(object) {
        switch (object.type) {
            case "star":
                this.system.add(object);
                break;

            case "planet":
                object.position.x = 100;
                this.system.add(object);

                break;
        }
    }
}

export default Solar;