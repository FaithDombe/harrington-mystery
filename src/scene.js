// scene.js - Three.js 3D Victorian Study & Crime Scene
import * as THREE from 'three';
import { buildHuman, SUSPECT_PRESETS } from './character.js';

export class MysteryScene {
  constructor(canvas) {
    this.canvas = canvas;
    this.characters = {};
    this.activeFocus = 'overview';
    this.targetCameraPos = new THREE.Vector3(0, 2.2, 5.2);
    this.targetLookAt = new THREE.Vector3(0, 1.2, 0);
    this.currentLookAt = new THREE.Vector3(0, 1.2, 0);

    this.init();
  }

  init() {
    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    // Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#101622');

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      50
    );
    this.camera.position.set(0, 2.2, 5.2);

    // Build the 3D room
    this.buildRoom();
    this.setupLighting();

    // Spawn 3 Suspects
    this.spawnSuspects();

    // Resize handling
    window.addEventListener('resize', () => this.onResize());
  }

  buildRoom() {
    // Materials
    const floorMat = new THREE.MeshStandardMaterial({
      color: '#3d2518',
      roughness: 0.4,
      metalness: 0.1
    });

    const rugMat = new THREE.MeshStandardMaterial({
      color: '#8b263e',
      roughness: 0.9,
      metalness: 0.05
    });

    const wallMat = new THREE.MeshStandardMaterial({
      color: '#1a232c',
      roughness: 0.85
    });

    const woodDarkMat = new THREE.MeshStandardMaterial({
      color: '#2b1a11',
      roughness: 0.5
    });

    const goldMat = new THREE.MeshStandardMaterial({
      color: '#e8b84a',
      metalness: 0.85,
      roughness: 0.25
    });

    // Floor
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Persian Rug in center
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(8, 6), rugMat);
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(0, 0.005, 0.2);
    rug.receiveShadow = true;
    this.scene.add(rug);

    // Rug border gold trim
    const rugBorder = new THREE.Mesh(new THREE.PlaneGeometry(8.2, 6.2), goldMat);
    rugBorder.rotation.x = -Math.PI / 2;
    rugBorder.position.set(0, 0.003, 0.2);
    rugBorder.receiveShadow = true;
    this.scene.add(rugBorder);

    // Back Wall
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), wallMat);
    backWall.position.set(0, 4, -5);
    backWall.receiveShadow = true;
    this.scene.add(backWall);

    // Wainscoting panel on back wall
    const wainscot = new THREE.Mesh(new THREE.BoxGeometry(16, 1.4, 0.1), woodDarkMat);
    wainscot.position.set(0, 0.7, -4.95);
    wainscot.receiveShadow = true;
    this.scene.add(wainscot);

    // Left Wall
    const leftWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), wallMat);
    leftWall.rotation.y = Math.PI / 2;
    leftWall.position.set(-6, 4, 0);
    leftWall.receiveShadow = true;
    this.scene.add(leftWall);

    // Right Wall
    const rightWall = new THREE.Mesh(new THREE.PlaneGeometry(16, 8), wallMat);
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.position.set(6, 4, 0);
    rightWall.receiveShadow = true;
    this.scene.add(rightWall);

    // Ceiling
    const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(16, 16), wallMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(0, 7, 0);
    this.scene.add(ceiling);

    // ---- Victorian Bookshelf on Right Wall ----
    const shelfGroup = new THREE.Group();
    shelfGroup.position.set(5.7, 0, -1);
    shelfGroup.rotation.y = -Math.PI / 2;
    const shelfBody = new THREE.Mesh(new THREE.BoxGeometry(4.5, 4.2, 0.7), woodDarkMat);
    shelfBody.position.y = 2.1;
    shelfBody.castShadow = true;
    shelfGroup.add(shelfBody);

    // Add colorful book blocks on shelves
    const bookColors = ['#9e2a2b', '#2b4162', '#386641', '#d4a373', '#e09f3e'];
    for (let r = 0; r < 4; r++) {
      for (let b = 0; b < 6; b++) {
        const bookMat = new THREE.MeshStandardMaterial({
          color: bookColors[(r * 6 + b) % bookColors.length],
          roughness: 0.7
        });
        const book = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.45, 0.4), bookMat);
        book.position.set(-1.8 + b * 0.7, 0.7 + r * 0.9, 0.1);
        shelfGroup.add(book);
      }
    }
    this.scene.add(shelfGroup);

    // ---- Fireplace on Left Wall ----
    const fireplace = new THREE.Group();
    fireplace.position.set(-5.7, 0, -1);
    fireplace.rotation.y = Math.PI / 2;
    const mantle = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 2.2, 0.8),
      new THREE.MeshStandardMaterial({ color: '#1f1b18', roughness: 0.9 })
    );
    mantle.position.y = 1.1;
    fireplace.add(mantle);

    // Fire pit recess
    const firePit = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 1.3, 0.7),
      new THREE.MeshStandardMaterial({ color: '#090807', roughness: 0.95 })
    );
    firePit.position.set(0, 0.8, 0.1);
    fireplace.add(firePit);

    // Glowing logs/embers
    const emberGeo = new THREE.SphereGeometry(0.25, 12, 8);
    const emberMat = new THREE.MeshBasicMaterial({ color: '#ff6200' });
    const ember = new THREE.Mesh(emberGeo, emberMat);
    ember.position.set(0, 0.4, 0.2);
    fireplace.add(ember);
    this.scene.add(fireplace);

    // ---- Study Desk (Crime Scene) in Center Back ----
    const deskGroup = new THREE.Group();
    deskGroup.position.set(0, 0, -2.5);

    // Desk top
    const deskTop = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 1.8), woodDarkMat);
    deskTop.position.y = 0.95;
    deskTop.castShadow = true;
    deskTop.receiveShadow = true;
    deskGroup.add(deskTop);

    // Desk Legs
    for (const [x, z] of [[-1.4, -0.75], [1.4, -0.75], [-1.4, 0.75], [1.4, 0.75]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.95, 0.14), woodDarkMat);
      leg.position.set(x, 0.475, z);
      leg.castShadow = true;
      deskGroup.add(leg);
    }

    // Victim's High-Back Chair (Empty)
    const chairGroup = new THREE.Group();
    chairGroup.position.set(0, 0, -3.6);
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 0.1, 0.8),
      new THREE.MeshStandardMaterial({ color: '#681c2b', roughness: 0.7 })
    );
    seat.position.y = 0.6;
    chairGroup.add(seat);
    const backrest = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1.2, 0.12),
      new THREE.MeshStandardMaterial({ color: '#681c2b', roughness: 0.7 })
    );
    backrest.position.set(0, 1.2, -0.35);
    chairGroup.add(backrest);
    deskGroup.add(chairGroup);

    // Evidence: The Crystal Poisoned Wine Glass on Desk
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      transmission: 0.92,
      opacity: 1,
      transparent: true,
      roughness: 0.05,
      ior: 1.5
    });
    const wineGlass = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.03, 0.18, 16), glassMat);
    wineGlass.position.set(0.65, 1.1, 0.2);
    wineGlass.castShadow = true;
    deskGroup.add(wineGlass);

    // Wine liquid inside glass (Dark Red)
    const wineLiq = new THREE.Mesh(
      new THREE.CylinderGeometry(0.052, 0.032, 0.09, 16),
      new THREE.MeshStandardMaterial({ color: '#590d19', roughness: 0.1 })
    );
    wineLiq.position.set(0.65, 1.07, 0.2);
    deskGroup.add(wineLiq);

    // Desk Papers
    const paper = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.7),
      new THREE.MeshStandardMaterial({ color: '#eee8d5', roughness: 0.8 })
    );
    paper.rotation.x = -Math.PI / 2;
    paper.rotation.z = 0.2;
    paper.position.set(-0.3, 1.02, 0.1);
    paper.receiveShadow = true;
    deskGroup.add(paper);

    // Vintage Green Desk Banker Lamp
    const lampStand = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.04, 0.35, 12), goldMat);
    lampStand.position.set(-0.9, 1.18, -0.3);
    deskGroup.add(lampStand);
    const lampShade = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.14, 0.14, 16),
      new THREE.MeshStandardMaterial({ color: '#165b33', roughness: 0.3 })
    );
    lampShade.position.set(-0.9, 1.35, -0.3);
    deskGroup.add(lampShade);

    this.scene.add(deskGroup);
    this.deskGroup = deskGroup;
  }

  setupLighting() {
    // Ambient light - warm, clear Victorian interior
    const ambient = new THREE.AmbientLight('#fff3e0', 1.8);
    this.scene.add(ambient);

    // Main ceiling chandelier directional light
    const mainLight = new THREE.DirectionalLight('#fffaf0', 2.8);
    mainLight.position.set(2, 7, 4);
    this.scene.add(mainLight);

    // Fill light from left
    const fillLight = new THREE.DirectionalLight('#b0c4de', 1.4);
    fillLight.position.set(-4, 5, 2);
    this.scene.add(fillLight);

    // Fireplace warm flickering light
    this.fireLight = new THREE.PointLight('#ff7700', 3.5, 12, 0.5);
    this.fireLight.position.set(-4.8, 1.2, -1);
    this.scene.add(this.fireLight);

    // Desk Lamp warm illumination
    const deskLight = new THREE.PointLight('#ffdf9e', 2.8, 8, 0.5);
    deskLight.position.set(-0.9, 1.6, -2.8);
    this.scene.add(deskLight);
  }

  spawnSuspects() {
    // 1. Arthur Pendelton (Butler) - standing on the left side
    const butler = buildHuman(SUSPECT_PRESETS.butler.style);
    butler.root.position.set(-2.6, 0, -1.0);
    butler.root.rotation.y = 0.45;
    butler.setEmotion('nervous');
    this.scene.add(butler.root);
    this.characters.butler = butler;

    // 2. Marcus Vance (Partner) - standing on the right side
    const partner = buildHuman(SUSPECT_PRESETS.partner.style);
    partner.root.position.set(2.6, 0, -0.8);
    partner.root.rotation.y = -0.55;
    partner.setEmotion('defensive');
    this.scene.add(partner.root);
    this.characters.partner = partner;

    // 3. Dr. Evelyn Sterling (Doctor) - standing near the victim's desk
    const doctor = buildHuman(SUSPECT_PRESETS.doctor.style);
    doctor.root.position.set(1.2, 0, -2.1);
    doctor.root.rotation.y = -0.25;
    doctor.setEmotion('calm');
    this.scene.add(doctor.root);
    this.characters.doctor = doctor;
  }

  // Updates or builds the player's Detective 3D character in real time
  updateDetective(style) {
    if (this.characters.detective) {
      this.scene.remove(this.characters.detective.root);
      this.characters.detective.dispose();
    }
    const detective = buildHuman(style);
    detective.root.position.set(0, 0, 1.4);
    detective.root.rotation.y = Math.PI; // facing towards the suspects and crime scene
    this.scene.add(detective.root);
    this.characters.detective = detective;
  }

  // Set camera focus target
  setFocus(targetKey) {
    this.activeFocus = targetKey;
    switch (targetKey) {
      case 'butler':
        this.targetCameraPos.set(-2.0, 1.7, 0.4);
        this.targetLookAt.set(-2.6, 1.4, -1.0);
        break;
      case 'partner':
        this.targetCameraPos.set(2.0, 1.7, 0.6);
        this.targetLookAt.set(2.6, 1.4, -0.8);
        break;
      case 'doctor':
        this.targetCameraPos.set(0.9, 1.7, -0.8);
        this.targetLookAt.set(1.2, 1.4, -2.1);
        break;
      case 'wine':
        this.targetCameraPos.set(0.3, 1.35, -1.8);
        this.targetLookAt.set(0.65, 1.1, -2.3);
        break;
      case 'detective':
        this.targetCameraPos.set(0, 1.65, 3.2);
        this.targetLookAt.set(0, 1.4, 1.4);
        break;
      case 'overview':
      default:
        this.targetCameraPos.set(0, 2.2, 5.2);
        this.targetLookAt.set(0, 1.2, -0.5);
        break;
    }
  }

  // Update suspect emotional reaction in 3D
  setSuspectEmotion(suspectId, emotion) {
    if (this.characters[suspectId]) {
      this.characters[suspectId].setEmotion(emotion);
    }
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  render(time) {
    const t = time * 0.001;

    // Fireplace light flicker
    if (this.fireLight) {
      this.fireLight.intensity = 2.4 + Math.sin(t * 8.2) * 0.4 + Math.cos(t * 14.5) * 0.25;
    }

    // Update characters
    for (const char of Object.values(this.characters)) {
      if (char?.update) char.update(t);
    }

    // Smooth camera interpolation
    this.camera.position.lerp(this.targetCameraPos, 0.06);
    this.currentLookAt.lerp(this.targetLookAt, 0.06);
    this.camera.lookAt(this.currentLookAt);

    this.renderer.render(this.scene, this.camera);
  }
}
