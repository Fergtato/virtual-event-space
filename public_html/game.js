var controls;
var video, videoImage, videoImageContext, videoTexture;

class Game{
	constructor(){
		if ( ! Detector.webgl ) Detector.addGetWebGLMessage();

		this.modes = Object.freeze({
			NONE:   Symbol("none"),
			PRELOAD: Symbol("preload"),
			INITIALISING:  Symbol("initialising"),
			CREATING_LEVEL: Symbol("creating_level"),
			ACTIVE: Symbol("active"),
			GAMEOVER: Symbol("gameover")
		});
		this.mode = this.modes.NONE;
		
		this.container;
		this.camera;
		this.scene;
		this.renderer;
		this.assetsPath = 'assets/';
		
		this.container = document.createElement( 'div' );
		this.container.style.height = '100%';
		document.body.appendChild( this.container );

		const game = this;
		
		const options = {
			assets:[
				`${this.assetsPath}images/nx.jpg`,
				`${this.assetsPath}images/px.jpg`,
				`${this.assetsPath}images/ny.jpg`,
				`${this.assetsPath}images/py.jpg`,
				`${this.assetsPath}images/nz.jpg`,
				`${this.assetsPath}images/pz.jpg`,
				`${this.assetsPath}projections/1.jpg`,
				`${this.assetsPath}projections/2.jpg`
			],
			oncomplete: function(){
				game.init();
				game.animate();
			}
		}
		
		options.assets.push(`https://virtual-event-space.s3-eu-west-1.amazonaws.com/ExTest2.fbx`);

		// options.assets.push(`assets/projections/1.jpg`);
		// options.assets.push(`assets/projections/2.jpg`);

		// for (var i = Things.length - 1; i >= 0; i--) {
		// 	Things[i]
		// }
		
		this.mode = this.modes.PRELOAD;

		const preloader = new Preloader(options);

		window.onError = function(error){
			console.error(JSON.stringify(error));
		}


		this.moveForward = false;
		this.moveBackward = false;
		this.moveLeft = false;
		this.moveRight = false;

		this.prevTime = performance.now();
		this.velocity = new THREE.Vector3();
		this.direction = new THREE.Vector3();

		this.projectionCheckEnabled = true;
		this.projectionFinishCheck = false;
		this.projectionArray = new Array();
		this.projectionLoadIndex = 0;
		this.projectionRenderIndex = 0;
		this.myInterval = setInterval(game.loadProjections, 1);
		this.screen;
	}

	loadEnvironment(loader) {
		const game = this;
		loader.load(`https://virtual-event-space.s3-eu-west-1.amazonaws.com/ExTest2.fbx`, function(object){
			game.environment = object;
			game.colliders = [];
			game.scene.add(object);
			object.traverse( function ( child ) {
				if ( child.isMesh ) {
					if (child.name.startsWith("proxy")){
						game.colliders.push(child);
						child.material.visible = false;
					}else{
						child.castShadow = true;
						child.receiveShadow = true;
					}
				}
			} );
			
			const tloader = new THREE.CubeTextureLoader();
			tloader.setPath( `${game.assetsPath}/images/` );

			var textureCube = tloader.load( [
				'px.jpg', 'nx.jpg',
				'py.jpg', 'ny.jpg',
				'pz.jpg', 'nz.jpg'
			] );

			game.scene.background = textureCube;
		})
	}

	loadProjections() {
		const textureLoader = new THREE.TextureLoader();
 
		if (game.projectionFinishCheck) { 
			clearInterval(game.myInterval);
			console.log('Loaded ' + game.projectionLoadIndex + ' image(s)');
			return;
		}

		if (game.projectionCheckEnabled) {
			game.projectionCheckEnabled = false;

			textureLoader.load('assets/projections/' + game.projectionLoadIndex + '.jpg', function ( texture ) {
				game.pExists(texture);
			},
			undefined,
			function ( err ) {
				game.pDoesntExist();
			});
		}
		
	}

	pExists(texture) {
		game.projectionArray.push(texture);
		game.projectionLoadIndex++;
		game.projectionCheckEnabled = true;
	}

	pDoesntExist() {
		game.projectionFinishCheck = true;
	}

	
	init() {

		this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 200000 );
		this.camera.position.y = 10;
		
		this.scene = new THREE.Scene();
		// this.scene.background = new THREE.Color( 0xffffff );
		// this.scene.fog = new THREE.Fog( 0xffffff, 0, 750 );

		// var light = new THREE.HemisphereLight( 0xeeeeff, 0x777788, 0.75 );
		// light.position.set( 0.5, 1, 0.75 );
		// this.scene.add( light );

		var hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.6 );
				hemiLight.color.setHSL( 0.6, 1, 0.6 );
				hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
				hemiLight.position.set( 0, 50, 0 );
				this.scene.add( hemiLight );

				var hemiLightHelper = new THREE.HemisphereLightHelper( hemiLight, 10 );
				this.scene.add( hemiLightHelper );


				var dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
				dirLight.color.setHSL( 0.1, 1, 0.95 );
				dirLight.position.set( - 1, 1.75, 1 );
				dirLight.position.multiplyScalar( 30 );
				this.scene.add( dirLight );

				dirLight.castShadow = true;

				dirLight.shadow.mapSize.width = 2048;
				dirLight.shadow.mapSize.height = 2048;

				var d = 50;

				dirLight.shadow.camera.left = - d;
				dirLight.shadow.camera.right = d;
				dirLight.shadow.camera.top = d;
				dirLight.shadow.camera.bottom = - d;

				dirLight.shadow.camera.far = 3500;
				dirLight.shadow.bias = - 0.0001;

		controls = new THREE.PointerLockControls( this.camera, this.container );

		var blocker = document.getElementById( 'blocker' );
		var instructions = document.getElementById( 'instructions' );

		instructions.addEventListener( 'click', function () {
			controls.lock();
		}, false );

		controls.addEventListener( 'lock', function () {
			instructions.style.display = 'none';
			blocker.style.display = 'none';
		} );

		controls.addEventListener( 'unlock', function () {
			blocker.style.display = 'block';
			instructions.style.display = '';
		} );

		this.scene.add( controls.getObject() );



		// Image Tex
		let screenGeometry = new THREE.PlaneGeometry( 1965, 800, 32 );
		let screenTexture = new THREE.TextureLoader().load( "https://virtual-event-space.s3-eu-west-1.amazonaws.com/projection.jpg" );
		let screenMaterial = new THREE.MeshBasicMaterial( {map: this.projectionArray[0], side: THREE.DoubleSide} );
		this.screen = new THREE.Mesh( screenGeometry, screenMaterial );
		this.screen.position.x = -2370;
		this.screen.position.y = 1680;
		this.screen.position.z = -872;
		this.screen.rotation.y = Math.PI / 2;
		this.scene.add( this.screen );

		
		// create the video element
		video = document.createElement( 'video' );
		// video.id = 'video';
		// video.type = ' video/ogg; codecs="theora, vorbis" ';
		video.src = "assets/videos/vid.mp4";
		
		
		videoImage = document.createElement( 'canvas' );
		videoImage.width = 720;
		videoImage.height = 480;

		videoImageContext = videoImage.getContext( '2d' );
		// background color if no video present
		videoImageContext.fillStyle = '#000000';
		videoImageContext.fillRect( 0, 0, videoImage.width, videoImage.height );

		videoTexture = new THREE.Texture( videoImage );
		videoTexture.minFilter = THREE.LinearFilter;
		videoTexture.magFilter = THREE.LinearFilter;
		

		// spotlights

		var spotLight = new THREE.SpotLight( 0xffffff , 10);
		spotLight.position.set( -1687, 1201, 120 );
		spotLight.angle = 0.7;
		spotLight.penumbra = 0.5;
		spotLight.distance = 1000;
		spotLight.castShadow = true;
		spotLight.shadow.mapSize.width = 1024;
		spotLight.shadow.mapSize.height = 1024;
		spotLight.shadow.camera.near = 500;
		spotLight.shadow.camera.far = 4000;
		spotLight.shadow.camera.fov = 30;
		this.scene.add( spotLight );
		spotLight.target.position.set(-1765,0,120);
		this.scene.add( spotLight.target );

		var spotLight = new THREE.SpotLight( 0xffffff , 10);
		spotLight.position.set( -1687, 1201, -328 );
		spotLight.angle = 0.7;
		spotLight.penumbra = 0.5;
		spotLight.distance = 1000;
		spotLight.castShadow = true;
		spotLight.shadow.mapSize.width = 1024;
		spotLight.shadow.mapSize.height = 1024;
		spotLight.shadow.camera.near = 500;
		spotLight.shadow.camera.far = 4000;
		spotLight.shadow.camera.fov = 30;
		this.scene.add( spotLight );
		spotLight.target.position.set(-1765,0,-328);
		this.scene.add( spotLight.target );

		var spotLight = new THREE.SpotLight( 0xffffff , 10);
		spotLight.position.set( -1687, 1201, -844 );
		spotLight.angle = 0.7;
		spotLight.penumbra = 0.5;
		spotLight.distance = 1000;
		spotLight.castShadow = true;
		spotLight.shadow.mapSize.width = 1024;
		spotLight.shadow.mapSize.height = 1024;
		spotLight.shadow.camera.near = 500;
		spotLight.shadow.camera.far = 4000;
		spotLight.shadow.camera.fov = 30;
		this.scene.add( spotLight );
		spotLight.target.position.set(-1765,0,-844);
		this.scene.add( spotLight.target );

		var spotLight = new THREE.SpotLight( 0xffffff , 10);
		spotLight.position.set( -1687, 1201, -1345 );
		spotLight.angle = 0.7;
		spotLight.penumbra = 0.5;
		spotLight.distance = 1000;
		spotLight.castShadow = true;
		spotLight.shadow.mapSize.width = 1024;
		spotLight.shadow.mapSize.height = 1024;
		spotLight.shadow.camera.near = 500;
		spotLight.shadow.camera.far = 4000;
		spotLight.shadow.camera.fov = 30;
		this.scene.add( spotLight );
		spotLight.target.position.set(-1765,0,-1345);
		this.scene.add( spotLight.target );

		var spotLight = new THREE.SpotLight( 0xffffff , 10);
		spotLight.position.set( -1687, 1201, -1809 );
		spotLight.angle = 0.7;
		spotLight.penumbra = 0.5;
		spotLight.distance = 1000;
		spotLight.castShadow = true;
		spotLight.shadow.mapSize.width = 1024;
		spotLight.shadow.mapSize.height = 1024;
		spotLight.shadow.camera.near = 500;
		spotLight.shadow.camera.far = 4000;
		spotLight.shadow.camera.fov = 30;
		this.scene.add( spotLight );
		spotLight.target.position.set(-1765,0,-1809);
		this.scene.add( spotLight.target );


		const game = this;

		const loader = new THREE.FBXLoader();
		this.loadEnvironment(loader);

		
		// this.loadProjections();




		this.renderer = new THREE.WebGLRenderer( { antialias: true } );
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
		this.container.appendChild( this.renderer.domElement );

		window.addEventListener("keydown", (event) => game.onKeyDown(event), false );
		window.addEventListener("keyup", (event) => game.onKeyUp(event), false );
		// window.addEventListener("keypress", (event) => game.onKeyPress(event), false );
		
		// window.addEventListener( 'resize', () => game.onWindowResize(), false );
	}

	

	onKeyDown( event ) {
		switch ( event.keyCode ) {

			case 38: // up
			case 87: // w
				this.moveForward = true;
				break;

			case 37: // left
			case 65: // a
				this.moveLeft = true;
				break;

			case 40: // down
			case 83: // s
				this.moveBackward = true;
				break;

			case 39: // right
			case 68: // d
				this.moveRight = true;
				break;

			case 90: // z
				this.changeProjection(-1);
				break;

			case 88: // x
				this.changeProjection(1);
				break;

			case 86: // v
				this.videoProjection();
				break;

		}
	}

	onKeyUp( event ) {
		switch ( event.keyCode ) {

			case 38: // up
			case 87: // w
				this.moveForward = false;
				break;

			case 37: // left
			case 65: // a
				this.moveLeft = false;
				break;

			case 40: // down
			case 83: // s
				this.moveBackward = false;
				break;

			case 39: // right
			case 68: // d
				this.moveRight = false;
				break;

		}
	}

	changeProjection(value) {
		this.projectionRenderIndex += value;

		if (this.projectionRenderIndex >= this.projectionLoadIndex) {
			this.projectionRenderIndex = 0;
		} else if (this.projectionRenderIndex < 0) {
			this.projectionRenderIndex = this.projectionLoadIndex-1;
		}

		this.screen.material.map = this.projectionArray[this.projectionRenderIndex];
		this.screen.material.needsUpdate = true;
	}

	videoProjection(value) {
		video.load(); // must call after setting/changing source
		video.play();

		this.screen.material.map = videoTexture;
		this.screen.material.needsUpdate = true;
	}
	
	
	animate() {
		const game = this;
		requestAnimationFrame( function(){ game.animate(); } );

		if ( controls.isLocked === true ) {

			var time = performance.now();
			var delta = ( time - this.prevTime ) / 1000;

			this.velocity.x -= this.velocity.x * 10.0 * delta;
			this.velocity.z -= this.velocity.z * 10.0 * delta;

			this.direction.z = Number( this.moveForward ) - Number( this.moveBackward );
			this.direction.x = Number( this.moveRight ) - Number( this.moveLeft );
			this.direction.normalize(); // this ensures consistent movements in all directions

			if ( this.moveForward || this.moveBackward ) this.velocity.z -= this.direction.z * 8000.0 * delta;
			if ( this.moveLeft || this.moveRight ) this.velocity.x -= this.direction.x * 8000.0 * delta;

			controls.moveRight( - this.velocity.x * delta );
			controls.moveForward( - this.velocity.z * delta );

			controls.getObject().position.y = 170;

			this.prevTime = time;

		}

		if ( video.readyState === video.HAVE_ENOUGH_DATA ) 
		{
			videoImageContext.drawImage( video, 0, 0 );
			if ( videoTexture ) 
				videoTexture.needsUpdate = true;
		}
		
		this.renderer.render( this.scene, this.camera );
	}
}

