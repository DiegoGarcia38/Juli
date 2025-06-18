// Variables globales del juego
let escena, camara, renderizador, controles;
let reloj = new THREE.Clock();
let mezcladorPersonajePrincipal;
let personajePrincipal;
let accionActiva, ultimaAccion;
let teclasPresionadas = {};
let velocidadPersonaje = 0.05;
let corriendo = false;
let saltando = false;
let golpeando = false;
let direccionPersonaje = new THREE.Vector3(0, 0, 0);
let objetos = [];
let tiempo = 0;
let listener;
const posicionCamaraObjetivo = new THREE.Vector3();
const accionesAnimacion = {};
const obstaculos = [];
const radioPersonaje = 0.8;
const velocidadRotacion = 0.1;
const quaternionObjetivo = new THREE.Quaternion();
let enemigos = [];

// Variables de juego
let puntuacion = 0;
let vidas = 3;
let enemigosRestantes = 3;
let gameOver = false;
let youWin = false;
let invulnerable = false;
let tiempoInvulnerable = 0;
let tiempoUltimoDano = 0;
let tiempoUltimoGolpe = 0;
const sonidos = {
    fondo: null,
    salto: null,
    golpe: null,
    dano: null,
    muerteEnemigo: null,
    gameOver: null,
    victoria: null
};
const tiempoCooldownDano = 1.0;

// Variables salto
let salto = false;
let puedeSaltar = true;
const alturaSalto = 2;
const gravedad = 0.03;
let velocidadY = 0;
let enSuelo = true;
let tiempoSaltoIniciado = null;
let posicionInicial = null;

// Variables gamepad
let gamepadAnterior = { buttons: [], axes: [] };
let ultimoEstadoCorrer = false;
let estadoCorriendoGamepad = false;

// Elementos UI
const scoreElement = document.getElementById('score');
const livesElement = document.getElementById('lives');
const enemiesElement = document.getElementById('enemies');
const healthFill = document.getElementById('health-fill');
const gameOverScreen = document.getElementById('game-over');
const youWinScreen = document.getElementById('you-win');
const finalScoreElement = document.getElementById('final-score');
const winScoreElement = document.getElementById('win-score');
const loadingScreen = document.getElementById('loading');
const restartButtons = document.querySelectorAll('.restart-btn');

// Inicializar el juego
init();
animate();

function init() {
    // Creación de la escena
    escena = new THREE.Scene();
    escena.background = new THREE.Color(0x87CEEB);
    
    camara = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camara.position.set(0, 5, 10);
    
    renderizador = new THREE.WebGLRenderer({ antialias: true });
    renderizador.setSize(window.innerWidth, window.innerHeight);
    renderizador.shadowMap.enabled = true;
    renderizador.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderizador.domElement);
    
    controles = new THREE.OrbitControls(camara, renderizador.domElement);
    controles.enableDamping = true;
    controles.dampingFactor = 0.05;
    controles.enabled = false; // Desactiva al inicio
    
    const luzAmbiente = new THREE.AmbientLight(0xffffff, 0.5);
    escena.add(luzAmbiente);
    
    const luzDireccional = new THREE.DirectionalLight(0xffffff, 0.8);
    luzDireccional.position.set(10, 20, 10);
    luzDireccional.castShadow = true;
    luzDireccional.shadow.mapSize.width = 2048;
    luzDireccional.shadow.mapSize.height = 2048;
    escena.add(luzDireccional);
    
    listener = new THREE.AudioListener();
    camara.add(listener);
    
    crearSuelo();
    crearObjetosPersonalizados();
    cargarPersonajePrincipal();
    cargarPersonajesSecundarios();
    cargarObjetosImportados();
    
    window.addEventListener('keydown', (e) => {
        if (gameOver || youWin) return;
        
        const key = e.key.toLowerCase();
        teclasPresionadas[key] = true;
        
        if (key === 'e' && !saltando && puedeSaltar) {
            iniciarSalto();
        }
        
        if (key === 'f' && !golpeando) {
            golpear();
        }
        
        if (key === ' ') {
            corriendo = !corriendo;
            velocidadPersonaje = corriendo ? 0.1 : 0.05;
            actualizarAnimacion();
        }
        
        if (key === 'r') {
            // Reiniciar posición del personaje
            reiniciarPosicionPersonaje();
        }
        
        // Reiniciar juego con espacio en las pantallas de fin
        if ((gameOver || youWin) && key === ' ') {
            reiniciarJuego();
        }
    });
    
    window.addEventListener('keyup', (e) => {
        const key = e.key.toLowerCase();
        teclasPresionadas[key] = false;
        if (['w', 'a', 's', 'd'].includes(key)) {
            actualizarAnimacion();
        }
    });
    
    window.addEventListener('resize', onWindowResize);

    // Eventos para los botones de reinicio
    restartButtons.forEach(button => {
        button.addEventListener('click', reiniciarJuego);
    });
    
    // Ocultar pantalla de carga después de un tiempo
    setTimeout(() => {
        loadingScreen.style.display = 'none';
    }, 3000);

    cargarSonidos();
    setTimeout(() => {
        if (sonidos.fondo) {
            sonidos.fondo.play();
        }
    }, 3000);
}

function reiniciarPosicionPersonaje() {
    if (personajePrincipal) {
        personajePrincipal.position.set(0, 0, 0);
    } 
}  

function crearSuelo() {
    // Usamos un color sólido en lugar de textura para evitar problemas de carga
    const geometriaSuelo = new THREE.PlaneGeometry(100, 100);
    const materialSuelo = new THREE.MeshStandardMaterial({ 
        color: 0x7CFC00,
        side: THREE.DoubleSide
    });
    
    const suelo = new THREE.Mesh(geometriaSuelo, materialSuelo);
    suelo.rotation.x = -Math.PI / 2;
    suelo.receiveShadow = true;
    escena.add(suelo);
}

function crearObjetosPersonalizados() {
    // 1. Árbol simple
    function createTree(x, z) {
        const trunkGeometry = new THREE.CylinderGeometry(0.2, 0.3, 2, 8);
        const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
        trunk.position.set(x, 1, z);
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        escena.add(trunk);
        
        const leavesGeometry = new THREE.ConeGeometry(1.5, 3, 8);
        const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
        const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
        leaves.position.set(x, 3.5, z);
        leaves.castShadow = true;
        leaves.receiveShadow = true;
        escena.add(leaves);
        
        return { trunk, leaves };
    }
    
    // 2. Banco del parque
    function createBench(x, z, rotation) {
        const group = new THREE.Group();
        
        // Base del banco
        const baseGeometry = new THREE.BoxGeometry(2, 0.1, 0.6);
        const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 0.4;
        base.castShadow = true;
        base.receiveShadow = true;
        group.add(base);
        
        // Respaldo
        const backGeometry = new THREE.BoxGeometry(2, 0.6, 0.1);
        const backMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
        const back = new THREE.Mesh(backGeometry, backMaterial);
        back.position.set(0, 0.7, -0.25);
        back.castShadow = true;
        back.receiveShadow = true;
        group.add(back);
        
        // Patas
        const legGeometry = new THREE.BoxGeometry(0.1, 0.4, 0.1);
        const legMaterial = new THREE.MeshStandardMaterial({ color: 0x696969 });
        
        const leg1 = new THREE.Mesh(legGeometry, legMaterial);
        leg1.position.set(-0.9, 0.2, 0);
        leg1.castShadow = true;
        leg1.receiveShadow = true;
        group.add(leg1);
        
        const leg2 = new THREE.Mesh(legGeometry, legMaterial);
        leg2.position.set(0.9, 0.2, 0);
        leg2.castShadow = true;
        leg2.receiveShadow = true;
        group.add(leg2);
        
        group.position.set(x, 0, z);
        group.rotation.y = rotation;
        escena.add(group);
        
        return group;
    }
    
    // 3. Fuente de agua
    function createFountain(x, z) {
        const group = new THREE.Group();
        
        // Base de la fuente
        const baseGeometry = new THREE.CylinderGeometry(3, 3.5, 0.5, 32);
        const baseMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
        const base = new THREE.Mesh(baseGeometry, baseMaterial);
        base.position.y = 0.25;
        base.castShadow = true;
        base.receiveShadow = true;
        group.add(base);
        
        // Fuente interior
        const innerGeometry = new THREE.CylinderGeometry(2.5, 2.5, 0.5, 32);
        const innerMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
        const inner = new THREE.Mesh(innerGeometry, innerMaterial);
        inner.position.y = 0.5;
        inner.castShadow = true;
        inner.receiveShadow = true;
        group.add(inner);
        
        // Agua
        const waterGeometry = new THREE.CylinderGeometry(2.4, 2.4, 0.1, 32);
        const waterMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3399ff,
            transparent: true,
            opacity: 0.7
        });
        const water = new THREE.Mesh(waterGeometry, waterMaterial);
        water.position.y = 0.55;
        group.add(water);
        
        // Pilar central
        const pillarGeometry = new THREE.CylinderGeometry(0.3, 0.4, 1.5, 16);
        const pillarMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 });
        const pillar = new THREE.Mesh(pillarGeometry, pillarMaterial);
        pillar.position.y = 1.25;
        pillar.castShadow = true;
        group.add(pillar);
        
        // Esfera superior
        const sphereGeometry = new THREE.SphereGeometry(0.3, 16, 16);
        const sphereMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3399ff,
            transparent: true,
            opacity: 0.6
        });
        const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
        sphere.position.y = 2.3;
        sphere.castShadow = true;
        group.add(sphere);
        
        objetos.push({
            object: sphere,
            type: 'fountain',
            initialY: 2.3
        });
        
        group.position.set(x, 0, z);
        escena.add(group);
        
        return group;
    }
    
    // 4. Farola
    function createLampPost(x, z) {
        const group = new THREE.Group();
        
        // Poste
        const poleGeometry = new THREE.CylinderGeometry(0.1, 0.1, 3, 8);
        const poleMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const pole = new THREE.Mesh(poleGeometry, poleMaterial);
        pole.position.y = 1.5;
        pole.castShadow = true;
        pole.receiveShadow = true;
        group.add(pole);
        
        // Brazo
        const armGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1, 8);
        const arm = new THREE.Mesh(armGeometry, poleMaterial);
        arm.position.set(0.5, 2.9, 0);
        arm.rotation.z = Math.PI / 2;
        arm.castShadow = true;
        arm.receiveShadow = true;
        group.add(arm);
        
        // Lámpara
        const lampGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const lampMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffff99,
            emissive: 0xffff00,
            emissiveIntensity: 0.5
        });
        const lamp = new THREE.Mesh(lampGeometry, lampMaterial);
        lamp.position.set(1, 2.85, 0);
        group.add(lamp);
        
        // Luz
        const light = new THREE.PointLight(0xffff99, 1, 10);
        light.position.set(1, 2.85, 0);
        group.add(light);
        
        group.position.set(x, 0, z);
        escena.add(group);
        
        return group;
    }
    
    // Objetos en la escena
    createTree(5, 5);
    obstaculos.push({
        posicion: new THREE.Vector3(5, 0, 5),
        radio: 1.5
    });
    createTree(-5, 5);
    obstaculos.push({
        posicion: new THREE.Vector3(-5, 0, 5),
        radio: 1.5
    });
    createTree(10, -8);
    createTree(-10, -5);
    createTree(8, 10);
    createTree(-7, -10);
    
    createBench(3, 3, Math.PI / 4);
    createBench(-4, 2, -Math.PI / 6);
    
    createFountain(0, -10);
    
    createLampPost(6, 0);
    createLampPost(-6, 0);
    createLampPost(0, 6);
    createLampPost(0, -6);
}

// Función para detectar colisiones
function detectarColisiones(nuevaPosicion) {
    for (const obstaculo of obstaculos) {
        const pos2D = new THREE.Vector2(nuevaPosicion.x, nuevaPosicion.z);
        const obstaculo2D = new THREE.Vector2(obstaculo.posicion.x, obstaculo.posicion.z);
        
        const distancia = pos2D.distanceTo(obstaculo2D);
        if (distancia < (radioPersonaje + obstaculo.radio)) {
            const direccion = pos2D.clone().sub(obstaculo2D).normalize();
            const posCorregida = obstaculo2D.clone().add(direccion.multiplyScalar(radioPersonaje + obstaculo.radio));
            return new THREE.Vector3(posCorregida.x, nuevaPosicion.y, posCorregida.y);
        }
    }
    return null;
}

function cargarPersonajePrincipal() {
    const cargador = new THREE.GLTFLoader();

    cargador.load('https://threejs.org/examples/models/gltf/RobotExpressive/RobotExpressive.glb', (gltf) => {
        personajePrincipal = gltf.scene;
        personajePrincipal.scale.set(0.5, 0.5, 0.5);
        personajePrincipal.position.set(0, 0, 0);
        escena.add(personajePrincipal);

        mezcladorPersonajePrincipal = new THREE.AnimationMixer(personajePrincipal);
        
        gltf.animations.forEach((clip) => {
            accionesAnimacion[clip.name] = mezcladorPersonajePrincipal.clipAction(clip);
        });

        // Animación de inicio
        accionActiva = accionesAnimacion['Idle'];
        accionActiva.play();

        configurarControlesPersonaje();
    }, undefined, (err) => console.error('Error al cargar el personaje:', err));
}

function configurarControlesPersonaje() {
    window.addEventListener('keydown', (e) => {
        const k = e.key.toLowerCase();
        if (k === 'w' && accionesAnimacion['Walking']) {
            fadeTo('Walking');
        }
        if (k === 'shift' && accionesAnimacion['Running']) {
            fadeTo('Running');
        }
        if (k === 'e' && accionesAnimacion['Jump']) {
            fadeTo('Jump', { once: true });
        }
        if (k === 'f' && accionesAnimacion['Punch']) {
            fadeTo('Punch', { once: true });
        }
    });
}

function cargarSonidos(){
    const audioLoader = new THREE.AudioLoader();

    audioLoader.load('musica/music.mp3', (buffer) => {
        sonidos.fondo = new THREE.Audio(listener);
        sonidos.fondo.setBuffer(buffer);
        sonidos.fondo.setLoop(true);
        sonidos.fondo.setVolume(0.5);
    });
    audioLoader.load('musica/jump.mp3', (buffer) => {
        sonidos.salto = new THREE.Audio(listener);
        sonidos.salto.setBuffer(buffer);
        sonidos.salto.setVolume(0.7);
    });

    audioLoader.load('musica/punch.mp3', (buffer) => {
        sonidos.golpe = new THREE.Audio(listener);
        sonidos.golpe.setBuffer(buffer);
        sonidos.golpe.setVolume(0.8);
    });
    audioLoader.load('musica/colision.mp3', (buffer) => {
        sonidos.muerteEnemigo = new THREE.Audio(listener);
        sonidos.muerteEnemigo.setBuffer(buffer);
        sonidos.muerteEnemigo.setVolume(0.8);
    });
    audioLoader.load('musica/victory.mp3', (buffer) => {
        sonidos.victoria = new THREE.Audio(listener);
        sonidos.victoria.setBuffer(buffer);
        sonidos.victoria.setVolume(0.8);
    });
    audioLoader.load('musica/damage.mp3', (buffer) => {
        sonidos.dano = new THREE.Audio(listener);
        sonidos.dano.setBuffer(buffer);
        sonidos.dano.setVolume(0.8);
    }); 
    audioLoader.load('musica/gameover.mp3', (buffer) => {
        sonidos.gameOver = new THREE.Audio(listener);
        sonidos.gameOver.setBuffer(buffer);
        sonidos.gameOver.setVolume(0.8);
    });
}

function iniciarSalto() {
    if (!mezcladorPersonajePrincipal || !accionActiva || !puedeSaltar) return;
    
    puedeSaltar = false;
    enSuelo = false;
    velocidadY = Math.sqrt(alturaSalto * 2 * gravedad);
    accionActiva = accionesAnimacion["Jump"];
    accionActiva.reset().play();
    if (sonidos.salto) {    
        sonidos.salto.setVolume(0.8);
        sonidos.salto.play();
    }
}

function cargarPersonajesSecundarios() {
    const loader = new THREE.GLTFLoader();
    const dracoLoader = new THREE.DRACOLoader();
    dracoLoader.setDecoderPath('https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/draco/');
    loader.setDRACOLoader(dracoLoader);
    
    loader.load('https://threejs.org/examples/models/gltf/Soldier.glb', gltf => {
        const baseModel = gltf.scene;
        const clips = gltf.animations;

        // Configuraciones de los soldados enemigos
        const configs = [
            {
                type: 'linear',
                startPosition: new THREE.Vector3(15, 0, 15),
                endPosition:   new THREE.Vector3(-15, 0, 15),
                duration: 20,
                time:     0,
                radio: 0.8,
                vivo: true
            },
            {
                type: 'circular',
                center: new THREE.Vector3(0,0,20),
                radius: 7,
                speed:  0.3,
                angle:  0,
                radio: 0.8,
                vivo: true
            },
            {
                type: 'sinusoidal',
                startPosition: new THREE.Vector3(0, 0, 10),
                amplitude: 5,
                frequency: 0.5,
                time:      0,
                radio: 0.8,
                vivo: true
            }
        ];

        configs.forEach(cfg => {
            const model = THREE.SkeletonUtils.clone(baseModel);
            model.position.copy(cfg.startPosition || cfg.center.clone().add(new THREE.Vector3(cfg.radius,0,0)));
            model.scale.set(0.8, 0.8, 0.8);
            
            // Sombras
            model.traverse(c => {
                if (c.isMesh) {
                    c.castShadow = true;
                    c.receiveShadow = true;
                }
            });

            escena.add(model);

            // Mixer
            const mixer  = new THREE.AnimationMixer(model);
            mixer.clipAction(clips[1]).play();
            cfg.time  = 0;
            cfg.angle = 0;
            
            // Agregar a enemigos
            enemigos.push({
                object: model,
                mixer,
                ...cfg
            });
        });
    });
}

function cargarObjetosImportados() {
    const loader = new THREE.GLTFLoader();
    loader.load('https://cdn.jsdelivr.net/gh/mrdoob/three.js@r128/examples/models/gltf/AVIFTest/forest_house.glb', (gltf) => {
        const model = gltf.scene;
        model.scale.set(10, 10, 10);
        model.position.set(12, 0, -12);
        
        model.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        
        escena.add(model);
    });
}

function actualizarSalto() {
    if (!enSuelo) {
        personajePrincipal.position.y += velocidadY;
        velocidadY -= gravedad;
        
        // Detectar si toca el suelo
        if (personajePrincipal.position.y <= 0) {
            personajePrincipal.position.y = 0;
            velocidadY = 0;
            enSuelo = true;
            puedeSaltar = true;
            actualizarAnimacion();
        }
    }
}

function golpear() {
    if (golpeando || !mezcladorPersonajePrincipal) return;
    
    golpeando = true;
    const accionAnterior = accionActiva;

    mezcladorPersonajePrincipal.stopAllAction();

    const accionGolpe = accionesAnimacion["Punch"];
    accionGolpe.reset();
    accionGolpe.play();
    
    accionGolpe.setLoop(THREE.LoopOnce);
    accionGolpe.clampWhenFinished = true;
    
    accionGolpe.fadeIn(0.1);    
    
    accionActiva = accionGolpe;
    if (sonidos.golpe) {
        sonidos.golpe.play(); // Solo reproducir aquí
    }
    verificarGolpeEnemigo();

    
    mezcladorPersonajePrincipal.addEventListener('finished', (e) => {
        if (e.action === accionGolpe) {
            golpeando = false;
            
            if (accionAnterior) {
                accionAnterior.reset().play();
                accionAnterior.fadeIn(0.1);
                accionActiva = accionAnterior;
            } else {
                const accionIdle = accionesAnimacion["Idle"];
                if (accionIdle) {
                    accionIdle.reset().play();
                    accionIdle.fadeIn(0.1);
                    accionActiva = accionIdle;
                }
            }
        }
    });
}

function verificarGolpeEnemigo() {
    const tiempoActual = reloj.getElapsedTime();
    if (tiempoActual - tiempoUltimoGolpe < 0.5) return;
    
    tiempoUltimoGolpe = tiempoActual;
    
    for (let i = 0; i < enemigos.length; i++) {
        const enemigo = enemigos[i];
        if (enemigo.vivo) {
            const distancia = personajePrincipal.position.distanceTo(enemigo.object.position);
            if (distancia < 2.5) {
                if (sonidos.muerteEnemigo) sonidos.muerteEnemigo.play();
                // Eliminar enemigo
                enemigo.vivo = false;
                escena.remove(enemigo.object);
                
                // Actualizar puntuación y UI
                puntuacion += 100;
                enemigosRestantes--;
                actualizarUI();
                
                // Crear efecto visual de golpe
                crearEfectoGolpe(enemigo.object.position);
                
                // Verificar victoria
                if (enemigosRestantes === 0) {
                    if (sonidos.victoria) sonidos.victoria.play();
                    youWin = true;
                    winScoreElement.textContent = puntuacion;
                    youWinScreen.classList.add('active');
                }
                break;
            }
        }
    }
}

function crearEfectoGolpe(posicion) {
    const hitEffect = document.createElement('div');
    hitEffect.className = 'hit-effect';
    hitEffect.style.left = `${(posicion.x / 100 + 0.5) * 100}%`;
    hitEffect.style.top = `${(0.5 - posicion.z / 100) * 100}%`;
    document.body.appendChild(hitEffect);
    
    // Animación
    hitEffect.animate([
        { transform: 'scale(0.5)', opacity: 0.8 },
        { transform: 'scale(2)', opacity: 0 }
    ], {
        duration: 500,
        easing: 'ease-out'
    }).onfinish = () => {
        document.body.removeChild(hitEffect);
    };
}

function verificarColisionEnemigos() {
    if (invulnerable) return;
    
    const tiempoActual = reloj.getElapsedTime();
    if (tiempoActual - tiempoUltimoDano < tiempoCooldownDano) return;
    
    for (let i = 0; i < enemigos.length; i++) {
        const enemigo = enemigos[i];
        if (enemigo.vivo) {
            const distancia = personajePrincipal.position.distanceTo(enemigo.object.position);
            if (distancia < (radioPersonaje + enemigo.radio)) {
                // El jugador recibe daño
                vidas--;
                tiempoUltimoDano = tiempoActual;
                invulnerable = true;
                actualizarUI();
                
                // Efecto visual de daño
                crearEfectoDano();
                if (sonidos.dano) sonidos.dano.play();

                
                if (vidas <= 0) {
                    // Game over
                    gameOver = true;
                    if (sonidos.gameOver) sonidos.gameOver.play();

                    finalScoreElement.textContent = puntuacion;
                    gameOverScreen.classList.add('active');
                }
                
                // Temporizador de invulnerabilidad
                setTimeout(() => {
                    invulnerable = false;
                }, 1000);
                
                break;
            }
        }
    }
}

function crearEfectoDano() {
    const hitEffect = document.createElement('div');
    hitEffect.className = 'hit-effect';
    hitEffect.style.backgroundColor = 'radial-gradient(circle, rgba(255,0,0,0.8) 0%, rgba(255,0,0,0) 70%)';
    hitEffect.style.left = '50%';
    hitEffect.style.top = '50%';
    document.body.appendChild(hitEffect);
    
    // Animación
    hitEffect.animate([
        { transform: 'scale(0.5)', opacity: 0.8 },
        { transform: 'scale(3)', opacity: 0 }
    ], {
        duration: 500,
        easing: 'ease-out'
    }).onfinish = () => {
        document.body.removeChild(hitEffect);
    };
}

function actualizarUI() {
    scoreElement.textContent = puntuacion;
    livesElement.textContent = vidas;
    enemiesElement.textContent = enemigosRestantes;
    healthFill.style.width = `${(vidas / 3) * 100}%`;
}

function resetearDespuesDeAccion() {
    if (hayAlgunaTeclaPresionada()) {
        accionActiva = corriendo ? accionesAnimacion["Running"] : accionesAnimacion["Walking"];
    } else {
        accionActiva = accionesAnimacion["Idle"];
    }
    
    ultimaAccion.fadeOut(0.2);
    accionActiva.reset();
    accionActiva.fadeIn(0.2);
    accionActiva.play();
}

function hayAlgunaTeclaPresionada() {
    return teclasPresionadas['w'] || teclasPresionadas['a'] || teclasPresionadas['s'] || teclasPresionadas['d'];
}

function actualizarAnimacion() {
    if (!accionActiva || !mezcladorPersonajePrincipal || !enSuelo || golpeando) return;
    
    const moviendose = hayAlgunaTeclaPresionada();
    let nuevaAccion;
    
    if (moviendose) {
        nuevaAccion = corriendo ? accionesAnimacion["Running"] : accionesAnimacion["Walking"];
    } else {
        nuevaAccion = accionesAnimacion["Idle"];
    }
    
    if (nuevaAccion && nuevaAccion !== accionActiva) {
        ultimaAccion = accionActiva;
        accionActiva = nuevaAccion;
        ultimaAccion.fadeOut(0.2);
        accionActiva.reset().fadeIn(0.2).play();
    }
}

function actualizarMovimientoPersonaje() {
    if (!personajePrincipal || gameOver || youWin) return;
    
    // direccionPersonaje.set(0, 0, 0);
    let inputX = 0;
    let inputZ = 0;
    
    if (teclasPresionadas['w']) inputZ -= 1;
    if (teclasPresionadas['s']) inputZ += 1;
    if (teclasPresionadas['a']) inputX -= 1;
    if (teclasPresionadas['d']) inputX += 1;

    const gamepads = navigator.getGamepads();
    if (gamepads[0]) {
        const gamepad = gamepads[0];
        if (Math.abs(gamepad.axes[0]) > 0.1) inputX = gamepad.axes[0];
        if (Math.abs(gamepad.axes[1]) > 0.1) inputZ = gamepad.axes[1];
    }
    
    direccionPersonaje.set(inputX, 0, inputZ);
    
    if (direccionPersonaje.length() > 0) {
        direccionPersonaje.normalize();
        const nuevaPosicion = personajePrincipal.position.clone();
        nuevaPosicion.x += direccionPersonaje.x * velocidadPersonaje;
        nuevaPosicion.z += direccionPersonaje.z * velocidadPersonaje;  
        
        const posicionCorregida = detectarColisiones(nuevaPosicion);
        if (posicionCorregida) {
            personajePrincipal.position.copy(posicionCorregida);
        } else {
            personajePrincipal.position.copy(nuevaPosicion);
        }
        
        // Rotación suave del personaje
        const anguloObjetivo = Math.atan2(direccionPersonaje.x, direccionPersonaje.z);
        quaternionObjetivo.setFromAxisAngle(
            new THREE.Vector3(0, 1, 0), 
            anguloObjetivo
        );
        
        personajePrincipal.quaternion.slerp(quaternionObjetivo, velocidadRotacion);
    } else { 
        if (accionActiva !== accionesAnimacion['Idle'] && enSuelo) {
            fadeTo('Idle');
        }
    }
    const offsetCamara = new THREE.Vector3(0, 5, 10);
    posicionCamaraObjetivo.copy(personajePrincipal.position).add(offsetCamara);
    
    camara.position.lerp(posicionCamaraObjetivo, 0.1);
    controles.target.lerp(personajePrincipal.position, 0.1);
}

function actualizarGamepad() {
    const gamepads = navigator.getGamepads();
    if (!gamepads[0]) return;
    
    const gamepad = gamepads[0];
    const axes = gamepad.axes;
    
    // Reiniciar estado de teclas
    teclasPresionadas = {};
    
    // Eje izquierdo (movimiento)
    if (Math.abs(axes[0]) > 0.15 || Math.abs(axes[1]) > 0.15) {
        teclasPresionadas['w'] = axes[1] < -0.15;
        teclasPresionadas['s'] = axes[1] > 0.15;
        teclasPresionadas['a'] = axes[0] < -0.15;
        teclasPresionadas['d'] = axes[0] > 0.15;
    }
    
    // Botones
    if (gamepad.buttons[2]?.pressed) iniciarSalto();  // Botón X
    if (gamepad.buttons[3]?.pressed) golpear();       // Botón Cuadrado
    if (gamepad.buttons[0]?.pressed) reiniciarPosicionPersonaje();  // Botón Triangulo 
    if (gamepad.buttons[4]?.pressed && !estadoCorriendoGamepad) {
        corriendo = true;
        estadoCorriendoGamepad = true;
        actualizarAnimacion();
    }
    else if (!gamepad.buttons[4]?.pressed && estadoCorriendoGamepad) {
        corriendo = false;
        estadoCorriendoGamepad = false;
        actualizarAnimacion();
    }
    
    velocidadPersonaje = corriendo ? 0.1 : 0.05;
}

function actualizarObjetosAnimados(delta) {
    tiempo += delta;
    
    objetos.forEach(obj => {
        switch (obj.type) {
            case 'fountain':
                obj.object.position.y = obj.initialY + Math.sin(tiempo * 5) * 0.1;
                break;
        }
    });
    
    // Actualizar enemigos
    for (let i = 0; i < enemigos.length; i++) {
        const enemigo = enemigos[i];
        if (!enemigo.vivo) continue;
        
        if (enemigo.mixer) {
            enemigo.mixer.update(delta);
        }
        
        switch (enemigo.type) {
            case 'linear':
                enemigo.time += delta;
                const t = (enemigo.time % enemigo.duration) / enemigo.duration;
                if (t <= 0.5) {
                    const progress = t * 2; 
                    enemigo.object.position.lerpVectors(enemigo.startPosition, enemigo.endPosition, progress);
                    enemigo.object.rotation.y = Math.PI/2;
                } else {
                    const progress = (t - 0.5) * 2;
                    enemigo.object.position.lerpVectors(enemigo.endPosition, enemigo.startPosition, progress);
                    enemigo.object.rotation.y = -Math.PI/2;
                }
                break;
                
            case 'circular':
                enemigo.angle += delta * enemigo.speed;
                const posX = enemigo.center.x + Math.cos(enemigo.angle) * enemigo.radius;
                const posZ = enemigo.center.z + Math.sin(enemigo.angle) * enemigo.radius;
                enemigo.object.position.set(posX, enemigo.object.position.y, posZ);
                enemigo.object.rotation.y = -enemigo.angle + (-Math.PI);
                break;
                
            case 'sinusoidal':
                enemigo.time += delta;
                const amplitude = enemigo.amplitude;
                const frequency = enemigo.frequency;
                const x = enemigo.startPosition.x + amplitude * Math.sin(frequency * enemigo.time);
                enemigo.object.position.x = x;
                const direction = Math.cos(frequency * enemigo.time) > 0 ? -Math.PI / 2 : Math.PI / 2;
                enemigo.object.rotation.y = direction;
                break;
        }
    }
}

function fadeTo(name, options = {}) {
    if (golpeando) return;
    const next = accionesAnimacion[name];
    if (!next || next === accionActiva) return;

    accionActiva.fadeOut(0.1);
    next.reset();
    next.fadeIn(0.2).play();

    if (options.once) {
        next.setLoop(THREE.LoopOnce, 1);
        next.clampWhenFinished = true;
        next.getMixer().addEventListener('finished', () => {
            if (hayAlgunaTeclaPresionada()) {
                fadeTo(corriendo ? 'Running' : 'Walking');
            } else {
                fadeTo('Idle');
            }
        });
    }
    accionActiva = next;
}

function onWindowResize() {
    camara.aspect = window.innerWidth / window.innerHeight;
    camara.updateProjectionMatrix();
    renderizador.setSize(window.innerWidth, window.innerHeight);
}

function reiniciarJuego() {
    // Reiniciar variables del juego
    if (sonidos.fondo) {
        sonidos.fondo.stop();
        sonidos.fondo.play();
    }
    puntuacion = 0;
    vidas = 3;
    enemigosRestantes = 3;
    gameOver = false;
    youWin = false;
    invulnerable = false;
    
    // Restaurar posición del jugador
    if (personajePrincipal) {
        personajePrincipal.position.set(0, 0, 0);
    }
    
    // Restaurar enemigos
    for (let i = 0; i < enemigos.length; i++) {
        const enemigo = enemigos[i];
        enemigo.vivo = true;
        escena.add(enemigo.object);
    }
    
    // Ocultar pantallas de fin
    gameOverScreen.classList.remove('active');
    youWinScreen.classList.remove('active');
    
    // Actualizar UI
    actualizarUI();
}

function animate() {
    requestAnimationFrame(animate);
    
    const delta = Math.min(reloj.getDelta(), 0.05); 
    controles.update();
    
    if (mezcladorPersonajePrincipal) {
        mezcladorPersonajePrincipal.update(delta);
    }
    
    actualizarMovimientoPersonaje();
    actualizarSalto(); 
    actualizarGamepad();
    actualizarObjetosAnimados(delta);
    
    // Verificar colisiones con enemigos
    if (!gameOver && !youWin) {
        verificarColisionEnemigos();
    }
    
    renderizador.render(escena, camara);
}