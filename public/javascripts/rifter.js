var extend = function(subClass, superClass) {
    /*
    Extend Function
    Takes a subclass and a superclass, and extends the subclass to contain all the prototyped
    methods of the superclass, for simplified inheritence.
    */
    if (subClass === undefined) {
        throw new Error('unknown subClass');
    }
    if (superClass === undefined) {
        throw new Error('unknown superClass');
    }
    // new Function() is evil
    var f = new Function();
    f.prototype = superClass.prototype;

    subClass.prototype = new f();
    subClass.prototype.constructor = subClass;
    subClass.superClass = superClass.prototype;
    subClass.superConstructor = superClass;
    return;
};

var MISSILE_URL = "assets/rocket.js";
var RIFTER_URL = "assets/rifter4.js";
var canShoot = true;

var meshes = {};

    var queue = new createjs.LoadQueue(true);
    queue.addEventListener("progress", handleProgress);
    queue.addEventListener("fileprogress", handleFileLoad);
    queue.addEventListener("complete", handleComplete);
    queue.loadFile("assets/sky.jpg");
    queue.loadFile("assets/enemy.js");
    queue.loadFile("assets/island.js");
    queue.loadFile("assets/rifter4.js");
    queue.loadFile("assets/rocket.js");
    queue.loadFile("assets/adh1_t1_d.png");
    queue.loadFile("assets/bigringnew.png");
    queue.loadFile("assets/grass.png");
    queue.loadFile("assets/lilringnew.png");
    queue.loadFile("assets/mf4_t1_d.png");
    queue.loadFile("assets/mf4_t1_n.png");
    queue.loadFile("assets/mf4_t1_pgs.png");
    queue.loadFile("assets/water.png");
    queue.loadFile("assets/particle.png");
    
    function handleFileLoad(event){
        $('#currentfile').html(event.item.id);
    }
    
    function handleProgress(event){
        $("#loadbar").width(queue.progress * $("#loadcontainer").width());
    }
    
    function handleComplete(event){
        $("#loadcontainer").hide();
        init();
    }
    
function init(){

//Window Auto-resizer
    window.addEventListener( 'resize', onWindowResize, false );
    function onWindowResize(){
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize( window.innerWidth, window.innerHeight );
    }

//Declare standard threejs variables

    var renderer = new THREE.WebGLRenderer( {antialias: true} );
    renderer.setSize( window.innerWidth, window.innerHeight );
    renderer.sortObjects = false;
    document.body.appendChild( renderer.domElement );
    var scene;
    var camera;
    var clock = new THREE.Clock();

//Declare custom global variables
    var roty = 0;
    var rotx = 0;
    var rotz = 0;
    var thrustglow;
    var camChaser = new THREE.Object3D();
    var thruster = new THREE.Object3D(); //Thruster not yet used, need to figure out particles
    var rifterspeed;
    var enemy;
    var overheat = 0;
    var overheated = 0;
    var missiles = [];
    var MAX_LIFETIME = 50;
    var enginestatus = 1;

    //setup scene

        var scene = new THREE.Scene();
        var camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 20000 );
        
    //Load up the rifter model from json export

        var loader = new THREE.JSONLoader();
    //Add rifter to the scene using "addModelToScene" function
    var rifter = new Ship(scene, loader, RIFTER_URL, {
        rotation: {x:0, y:Math.PI, z:0},
        speed: 2,
        maxSpeed: 2,
        scale: {x:1.5, y:1.5, z:1.5}
    });

    //Light it up.

        var spotLight = new THREE.SpotLight( 0xffffff, 1 );
        spotLight.position.set( 0, 10000, -1500 );
        spotLight.castShadow = true;
        spotLight.shadowMapWidth = 1024;
        spotLight.shadowMapHeight = 1024;
        spotLight.shadowCameraNear = 500;
        spotLight.shadowCameraFar = 4000;
        spotLight.shadowCameraFov = 30;
        scene.add( spotLight );
        var light = new THREE.AmbientLight( 0x404040 ); // soft white light
        scene.add( light );

    //Make a floor, yo.

        loader.load("assets/island.js", addTerrainToScene);
        function addTerrainToScene(geometry, materials){
            var floorTexture = new THREE.ImageUtils.loadTexture( 'assets/grass.png' );
            floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping; 
            floorTexture.repeat.set( 1, 1 );
            var floorMaterial = new THREE.MeshBasicMaterial( { map: floorTexture, side: THREE.DoubleSide } );
            floor = new THREE.Mesh(geometry, floorMaterial);
            floor.scale.set(300,300,300);
            floor.rotation.set(0,Math.PI,0);
            scene.add(floor);          
            };

        var groundTexture = new THREE.ImageUtils.loadTexture( 'assets/grass.png' );
        groundTexture.wrapS = groundTexture.wrapT = THREE.RepeatWrapping; 
        groundTexture.repeat.set( 10, 10 );
        var groundMaterial = new THREE.MeshBasicMaterial( { map: groundTexture, side: THREE.DoubleSide } );
        var groundGeometry = new THREE.PlaneGeometry(20000, 20000, 10, 10);
        var ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.position.y = -150;
        ground.rotation.x = Math.PI / 2;
        scene.add(ground);

    //just add water..

        var waterTexture = new THREE.ImageUtils.loadTexture( 'assets/water.png' );
        waterTexture.wrapS = waterTexture.wrapT = THREE.RepeatWrapping; 
        waterTexture.repeat.set( 10, 10 );
        var waterMaterial = new THREE.MeshBasicMaterial( { map: waterTexture, side: THREE.DoubleSide, transparent: true, opacity: 0.4 } );
        var waterGeometry = new THREE.PlaneGeometry(20000, 20000, 10, 10);
        var water = new THREE.Mesh(waterGeometry, waterMaterial);
        water.position.y = -100;
        water.rotation.x = Math.PI / 2;
        scene.add(water);

        // engine particle system
                    
            // create the particle variables
                var particleCount = 300,
                particles = new THREE.Geometry(),
                pMaterial = new THREE.ParticleBasicMaterial({
                    color: 0xFF4000,
                    size: 0.2,
                    map: THREE.ImageUtils.loadTexture(
                    "assets/particle2.png"
                    ),
                    blending: THREE.AdditiveBlending,
                    transparent: true,
                    opacity: 0.9
                });


            // now create the individual particles
                for(var p = 0; p < particleCount; p++) {

            // create a particle with random
            // position values, -250 -> 250
                var pX = (Math.random() - 0.5) * 0.1,
                    pY = (Math.random() - 0.5) * 0.1,
                    pZ = Math.random() * (1.5 * rifter.speed/2),
                particle = new THREE.Vector3(pX, pY, pZ);
            // create a velocity vector
                particle.velocity = new THREE.Vector3( 0, Math.random(), 0);   
            // add it to the geometry
                particles.vertices.push(particle);
                }

            // create the particle system
                var particleSystem =
                new THREE.ParticleSystem(
                    particles,
                    pMaterial);
                
            // update the particle system to
            // sort the particles which enables
            // the behaviour we want
                particleSystem.sortParticles = true;

            // add it to the scene
                scene.add(particleSystem);

        
    //Load reticule images for targeting rings

        var lilring = THREE.ImageUtils.loadTexture( 'assets/lilringnew.png' );
        var targliltex = new THREE.MeshBasicMaterial( { map: lilring, transparent: true, opacity: 0.7  } );
        targliltex.side = THREE.DoubleSide;
        var flatGeo = new THREE.PlaneGeometry( 5, 5 );
        var targring2 = new THREE.Mesh( flatGeo, targliltex );
        targring2.scale.set( 1, 1, 1 );
        targring2.position.set(0,0,0);
        scene.add( targring2 );

        var bigring = THREE.ImageUtils.loadTexture( 'assets/bigringnew.png' );
        var targbigtex = new THREE.MeshBasicMaterial( { map: bigring, transparent: true, opacity: 0.7  } );
        targbigtex.side = THREE.DoubleSide;
        var flatGeo = new THREE.PlaneGeometry( 7.5, 7.5 );
        var targring1 = new THREE.Mesh( flatGeo, targbigtex );
        targring1.scale.set( 2, 2, 2 );
        targring1.position.set(0,0,0);
        scene.add( targring1 );

    //Make dat sky, dog.

        var skyBoxGeometry = new THREE.SphereGeometry( 10000, 35, 35 );
        var skyTexture = new THREE.ImageUtils.loadTexture( 'assets/sky.jpg' );
        skyTexture.wrapS = skyTexture.wrapT = THREE.RepeatWrapping; 
        skyTexture.repeat.set( 1, 1 );
        var skyBoxMaterial = new THREE.MeshBasicMaterial( { map:skyTexture, side: THREE.BackSide } );
        var skyBox = new THREE.Mesh( skyBoxGeometry, skyBoxMaterial );
        scene.add(skyBox);

    //Load the enemy

        loader.load("assets/enemy.js", addEnemyToScene);
        function addEnemyToScene(geometry, materials){
            var material = new THREE.MeshFaceMaterial(materials);
            enemy = new THREE.Mesh(geometry, material);
            enemy.scale.set(2,2,2);
            enemy.rotation.set(0,2.4,0.3);
            enemy.position.set(26,38,14);
            scene.add(enemy);  
            };

    //load thrust glow (or don't, whatever)

        var thrustglow = new THREE.PointLight( 0xff7301 );
        scene.add(thrustglow);
        

    //missile creator
    //Animate function which calls update and render
    //as well as recalling animate to make persistent

    function animate(){
            requestAnimationFrame( animate );
            update();
            render();
    }

    function update(){    

        rifter.update();    
        //update particles
        particleSystem.rotation.z += 0.1;
        particleSystem.rotation.y = rifter.mesh.rotation.y - Math.PI;
        particleSystem.rotation.x = rifter.mesh.rotation.x;
        particleSystem.position = rifter.mesh.position;
        
        var pCount = particleCount;
        while(pCount--) {

            // get the particle
            var particle = particles.vertices[pCount];
            particle.z += 0.1
            // particle conditions
            if(particle.x > 0 && particle.z > (1 * rifter.speed/2)){
                particle.x -= 0.005
            }
            if(particle.x < 0 && particle.z > (1 * rifter.speed/2)){
                particle.x += 0.005
            }
            
            if(particle.y > 0 && particle.z > (1 * rifter.speed/2)){
                particle.y -= 0.005
            }
            if(particle.y < 0 && particle.z > (1 * rifter.speed/2)){
                particle.y += 0.005
            }
            
            if(particle.z > (1.5 - Math.random()) * rifter.speed/2) {
                particle.z = 0;
                particle.x = (Math.random() - 0.5) * 0.1;
                particle.y = (Math.random() - 0.5) * 0.1;
            }
        }

        // flag to the particle system
        // that we've changed its vertices.
        
        particleSystem.geometry.__dirtyVertices = true;
        
        //Set speed/rotation vars
        
        var wobble = 0;
        var delta = clock.getDelta();
        
        $('#thruststatus').width($('#thrustbar').width() * overheat/150);
        
        if(overheat<75 && enginestatus != 1 && overheated == 0){
            $('#heatstatus').attr('src', '/assets/heatok.png');
            enginestatus = 1;
        }
        if(overheat>75 && enginestatus != 2 && enginestatus != 3){
            $('#heatstatus').attr('src', '/assets/heatbad.png');
            enginestatus = 2;
        }
        if(overheat == 150){
            overheated = 1;
        }
        if(overheated == 1 && enginestatus != 3){
            $('#heatstatus').attr('src', '/assets/overheat.png');
            enginestatus = 3;
        };


        
        //Setting up keypress to increasing
        //and decelerating rotation functions

        if(pressedl == 1){rotz -= 0.002/(delta^2)};
        if(pressedu == 1){rotx += 0.001/(delta^2 /1.2)};
        if(pressedr == 1){rotz += 0.002/(delta^2)};
        if(pressedd == 1){rotx -= 0.001/(delta^2 /1.2)};
        if(pressedshift == 1){
            if(overheated == 0){
                rifter.speed += 0.01;
                overheat += 0.25;
            } else {
                rifter.speed -= 0.02;
                overheat -= 0.5}};

        if(pressedl == 0){ if(rotz.toFixed(10)<0){rotz += 0.001}};
        if(pressedu == 0){ if(rotx.toFixed(10)>0){rotx -= 0.001}};
        if(pressedr == 0){ if(rotz.toFixed(10)>0){rotz -= 0.001}};
        if(pressedd == 0){ if(rotx.toFixed(10)<0){rotx += 0.001}};
        if(pressedshift == 0){
            rifter.speed -= 0.02;
            if(overheat>0){overheat -= 0.5}
        }
        if(overheat == 0){
            overheated = 0;
        }
            
        //Set limits on rotation and velocity

        if (rotz<=-0.08){rotz=-0.08};
        if (rotz>=0.08){rotz=0.08};
        if (rotx<-0.05){rotx=-0.05};
        if (rotx>0.05){rotx=0.05};
        if (rifter.speed>=3.5){rifter.speed=3.5};
        if (rifter.speed<=2){rifter.speed=2};
        if (rifter.speed>2){wobble = Math.random()*(rifter.speed/3)/10;}

        //Set rifter movement to rifter speed
        //and rifter rotation to rifter rot

        rifter.mesh.rotateOnAxis(new THREE.Vector3(0,0,1), rotz);
        rifter.mesh.rotateOnAxis(new THREE.Vector3(1,0,0), rotx);

        //Move enemy to camera position (spot behind rifter to line up shot)

        if(enemy){
            enemy.translateZ(1.5);
            enemy.lookAt(camera.position);
        }

        //Enable rearview cam

        var rearview;
        if(pressedpgdn == 1){rearview = -1};
        if(pressedpgdn == 0){rearview = 1};

        //Enable cockpit cam

        var cockpit;
        if(pressedpgup == 1){cockpit = -0.125};
        if(pressedpgup == 0){cockpit = 1};

        //Chase Camera Setup

        var camChaserOffset = new THREE.Vector3(0,-50 * rotx * cockpit + 1,10 * rearview);
        var chaserOffset = camChaserOffset.applyMatrix4(rifter.mesh.matrixWorld);

        camChaser.position.x = chaserOffset.x + wobble;
        camChaser.position.y = chaserOffset.y + wobble;
        camChaser.position.z = chaserOffset.z + wobble;

        var relCamOffset = new THREE.Vector3(0,-25 * rotx/2 * cockpit + 1,-5 * rifter.speed/4 * rearview * cockpit);
        //var relCamOffset = new THREE.Vector3(0,5,-5 * rearview * cockpit); // debug camera
        var cameraOffset = relCamOffset.applyMatrix4(rifter.mesh.matrixWorld);

        camera.position.x = cameraOffset.x;
        camera.position.y = cameraOffset.y;
        camera.position.z = cameraOffset.z;
        camera.lookAt(camChaser.position);

        //Create offsets for targeting reticule
        //and set reticule positions relative to
        //rifter position and rotation

        var relTar1Offset = new THREE.Vector3(0,-10 * rotx * 4,40);
        var Targ1Offset = relTar1Offset.applyMatrix4(rifter.mesh.matrixWorld);

        targring1.position.x = Targ1Offset.x;
        targring1.position.y = Targ1Offset.y;
        targring1.position.z = Targ1Offset.z;
        targring1.rotation.x = rifter.mesh.rotation.x;
        targring1.rotation.y = rifter.mesh.rotation.y;
        targring1.rotation.z = rifter.mesh.rotation.z;

        var relTar2Offset = new THREE.Vector3(0,-20 * rotx * 8,100);
        var Targ2Offset = relTar2Offset.applyMatrix4(rifter.mesh.matrixWorld);

        targring2.position.x = Targ2Offset.x;
        targring2.position.y = Targ2Offset.y;
        targring2.position.z = Targ2Offset.z;
        targring2.rotation.x = rifter.mesh.rotation.x;
        targring2.rotation.y = rifter.mesh.rotation.y;
        targring2.rotation.z = rifter.mesh.rotation.z;

        //Create offsets for thrust glow

        var relThrustOffset = new THREE.Vector3(0,0,0);
        var ThrustOffset = relThrustOffset.applyMatrix4(rifter.mesh.matrixWorld);

        thrustglow.position.x = ThrustOffset.x;
        thrustglow.position.y = ThrustOffset.y;
        thrustglow.position.z = ThrustOffset.z;
        thrustglow.intensity = rifter.speed/3;
            
        //missiles again
        
        if(pressedspc === 1 && rifter.canShoot()){
            rifter.shootMissile();
            rifter._canShoot = false;
        }

        if(pressedspc === 0) rifter._canShoot = true;

    };
        
    function render() {
        renderer.render(scene, camera);
    };

    animate();
};

var newMesh = function(parent, url, loader, position, options) {
    var url = url;
    var position = position;
    var scale = options.scale || {x:1,y:1,z:1};
    var rotation = options.rotation || {x:0,y:0,z:0};
    var addMeshToScene = function(parent) {
        return function(geometry, materials){
            var material = new THREE.MeshFaceMaterial(materials);
            var mesh = new THREE.Mesh(geometry, material);
            mesh.rotation.set(rotation.x, rotation.y, rotation.z);
            mesh.position.set(position.x, position.y, position.z);
            mesh.scale.set(scale.x, scale.y, scale.z);
            parent.scene.add(mesh);
            parent.setMesh(mesh);
        };
    };

    loader.load(url, addMeshToScene(parent));
};

var Actor = function(scene, loader, url, options) {
    this.scene = scene;
    this.loader = loader;
    this.url = url;

    this.init(options)
};

Actor.prototype.init = function(options) {
    this.position = options.position || {x:0,y:0,z:0};
    this.rotation = options.rotation || {x:0,y:0,z:0};
    this.scale = options.scale || {x:1,y:1,z:1};

    newMesh(this, this.url, this.loader, this.position, {
        scale: this.scale,
        rotation: this.rotation
    });
};

Actor.prototype.setMesh = function(mesh) {
    this.mesh = mesh;
};

Actor.prototype.update = function() {
};

var Rocket = function(scene, loader, url, options) {
    Rocket.superConstructor.apply(this, arguments);
};
extend(Rocket, Actor);

Rocket.prototype.init = function(options) {
    Rocket.superClass.init.call(this, options);
    this.speed = options.speed || 2;
    this.accel = options.accel || 0.05;
    this.maxSpeed = options.maxSpeed || 6;
};

Rocket.prototype.update = function() {
    Rocket.superClass.update.call(this);

    this.speed += this.accel;
    if (this.speed > this.maxSpeed) this.speed = this.maxSpeed;
    if (this.mesh) this.mesh.translateZ(this.speed);
};

var Ship = function(scene, loader, url, options) {
    Ship.superConstructor.apply(this, arguments);
};
extend(Ship, Rocket);

Ship.prototype.init = function(options) {
    Ship.superClass.init.call(this, options);
    this._canShoot = false;
    this.missiles = [];
};

Ship.prototype.canShoot = function() {
    return this._canShoot;
};

Ship.prototype.update = function() {
    Ship.superClass.update.call(this);
    for (var i=this.missiles.length - 1;i>=0;i--) {
        this.missiles[i].update();
    }
};

Ship.prototype.shootMissile = function() {
    var missile = new Missile(this.scene, this.loader, MISSILE_URL, {
        position: this.mesh.position,
        rotation: this.mesh.rotation,
        scale: {x:5, y:5, z:5}
    });
    this.missiles.push(missile);
};

var Missile = function(scene, loader, url, options) {
    Missile.superConstructor.apply(this, arguments);
};
extend(Missile, Rocket);

Missile.prototype.init = function(options) {
    Missile.superClass.init.call(this, options);

    this._lifetime = options.lifetime || 3000;
    this._elapsed = 0;
    this.drop = 1;
};

Missile.prototype.update = function() {
    Missile.superClass.update.call(this)
    this._elapsed += 1;
    if (this._elapsed > this._lifetime) this.kill();
    this.drop -= 0.05;
    if (this.drop < 0) this.drop = 0;
    if (this.mesh) this.mesh.translateY(-this.drop);
};