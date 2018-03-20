//////////////////////////////////////////////////////////////////////////////////
//		Imports
//////////////////////////////////////////////////////////////////////////////////

import { Color, Scene, PerspectiveCamera, WebGLRenderer, BoxGeometry, MeshBasicMaterial, Mesh, Clock} from 'three';
import OrbitControls from 'orbit-controls-es6';
// import CSS3DRenderer from 'three-css3drenderer';
import Stats from 'stats-js';

import Solar from './solar';

//////////////////////////////////////////////////////////////////////////////////
//		Main Application
//////////////////////////////////////////////////////////////////////////////////


class MassGravity {


    constructor () {

        this.setComponents();
        this.setListeners();
    }

    setComponents() {
        // CSS RENDERER
        // this.cssRenderer = new CSS3DRenderer;
        // this.cssRenderer.setSize( window.innerWidth, window.innerHeight );
        // this.cssRenderer.domElement.style.position = 'absolute';
        // this.cssRenderer.domElement.className = "cssworld";
        // document.body.appendChild(this.cssRenderer.domElement);
        // GL RENDERER
        this.glRenderer = new WebGLRenderer();
        this.glRenderer.setClearColor(new Color(0x000000), 1);
        this.glRenderer.setPixelRatio( window.devicePixelRatio );
        this.glRenderer.setSize( window.innerWidth, window.innerHeight );
        this.glRenderer.domElement.className = "glworld";
        document.body.appendChild(this.glRenderer.domElement);


        this.clock = new Clock();
        this.glscene	= new Scene();
        this.cssScene	= new Scene();
        this.camera = new PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);

        this.stats = new Stats();

        this.timeScale = 1.0;
        this.camera.position.z = 400;

        this.controls = new OrbitControls(this.camera, this.glRenderer.domElement);

        this.solar = new Solar("test");
        this.glscene.add(this.solar);
    }


    setListeners() {
        window.scene = this.glscene;

        this.render();
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.glRenderer.setSize( window.innerWidth, window.innerHeight );
    }


    render() {
        requestAnimationFrame(() => { this.render() });

        this.glRenderer.render(this.glscene, this.camera);
    }
}

export default MassGravity;
new MassGravity();