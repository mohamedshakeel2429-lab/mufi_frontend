import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Cpu,
  BarChart2,
  ShieldCheck,
  RotateCcw,
  Pause,
  Play,
  Sun,
  Moon,
  Box,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { motion } from 'motion/react';
import { useEstate } from '../../context/EstateContext';
import { formatCurrency } from '../../utils/formatters';
import hero3DHouseImg from '../../assets/images/hero_3d_luxury_house_1794504279619.jpg';
import isometricCardHouseImg from '../../assets/images/isometric_house_card_1794504282774.jpg';

export const HERO_3D_HOUSE_IMAGE = hero3DHouseImg;
export const ISOMETRIC_CARD_HOUSE_IMAGE = isometricCardHouseImg;

interface LuxuryHouseSceneProps {
  compact?: boolean;
  interactiveStep?: number;
  variant?: 'hero' | 'miniature';
}

/**
 * Procedural CanvasTexture generator for architectural stone/concrete bump & roughness
 * Avoids any external texture fetches that could 404.
 */
function createProceduralStoneTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 1800; i++) {
    const x = (i * 73) % 256;
    const y = (i * 137) % 256;
    const shade = 200 + (i % 45);
    ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade + 4})`;
    ctx.fillRect(x, y, 3, 2);
  }

  // Subtle architectural tile seams
  ctx.strokeStyle = 'rgba(100, 116, 139, 0.22)';
  ctx.lineWidth = 1;
  for (let g = 0; g < 256; g += 32) {
    ctx.beginPath();
    ctx.moveTo(g, 0);
    ctx.lineTo(g, 256);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, g);
    ctx.lineTo(256, g);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4);
  return tex;
}

/**
 * Procedural radial soft contact shadow CanvasTexture placed flush beneath grounded props
 */
function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
  grad.addColorStop(0, 'rgba(15, 23, 42, 0.55)');
  grad.addColorStop(0.55, 'rgba(15, 23, 42, 0.22)');
  grad.addColorStop(1, 'rgba(15, 23, 42, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

export const LuxuryHouseScene: React.FC<LuxuryHouseSceneProps> = ({
  compact = false,
  interactiveStep,
}) => {
  const {
    currency,
    latestPrediction,
    currentInputs,
    modelMetrics,
    selectedModel,
    theme,
  } = useEstate();

  const mountRef = useRef<HTMLDivElement | null>(null);
  const [webglSupported, setWebglSupported] = useState<boolean>(true);
  const [viewMode, setViewMode] = useState<'3d_model' | 'studio_render'>('3d_model');
  const [autoRotate, setAutoRotate] = useState<boolean>(true);
  const [nightLighting, setNightLighting] = useState<boolean>(false);
  const [cameraPreset, setCameraPreset] = useState<'isometric' | 'front' | 'aerial'>('isometric');
  const [activeCard, setActiveCard] = useState<'valuation' | 'market' | 'confidence' | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);

  // Desired camera target & position vectors for exponential damping in rAF loop
  const desiredCamPosRef = useRef<THREE.Vector3>(new THREE.Vector3(11.5, 7.2, 12.5));
  const desiredTargetRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 1.4, 0));
  const isTransitioningPresetRef = useRef<boolean>(false);

  const predictedVal = latestPrediction?.predicted_price || 8855000;
  const activeMetrics = modelMetrics[selectedModel];

  const applyCameraPreset = (preset: 'isometric' | 'front' | 'aerial') => {
    setCameraPreset(preset);
    if (preset === 'isometric') {
      desiredCamPosRef.current.set(11.5, 7.2, 12.5);
    } else if (preset === 'front') {
      desiredCamPosRef.current.set(0.4, 3.8, 14.8);
    } else if (preset === 'aerial') {
      desiredCamPosRef.current.set(7.8, 14.2, 8.2);
    }
    desiredTargetRef.current.set(0, 1.4, 0);
    isTransitioningPresetRef.current = true;
  };

  useEffect(() => {
    if (viewMode !== '3d_model') return;
    const container = mountRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglSupported(false);
      return;
    }

    const width = container.clientWidth || 640;
    const height = container.clientHeight || (compact ? 250 : 530);

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = nightLighting ? 1.08 : 1.22;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const isDarkScene = theme === 'dark' || nightLighting;
    const fogColor = new THREE.Color(isDarkScene ? 0x11151c : 0xf4f6f9);
    scene.fog = new THREE.FogExp2(fogColor, 0.018);

    // Studio PBR Environment via PMREMGenerator + RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    const envTexture = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTexture;

    // Camera
    const camera = new THREE.PerspectiveCamera(36, width / height, 0.1, 120);
    if (compact) {
      camera.position.set(10.8, 6.6, 11.4);
    } else {
      camera.position.copy(desiredCamPosRef.current);
    }

    // OrbitControls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(0, 1.4, 0);
    controls.minDistance = 6.0;
    controls.maxDistance = 24;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.75;

    const stopPresetTransition = () => {
      isTransitioningPresetRef.current = false;
    };
    renderer.domElement.addEventListener('pointerdown', stopPresetTransition);

    // Studio Lighting: Warm Directional Key Light + Cool Hemisphere Fill + Rim Accents
    const hemiLight = new THREE.HemisphereLight(
      isDarkScene ? 0x93c5fd : 0xfff7ed,
      0x1e293b,
      isDarkScene ? 0.55 : 0.78
    );
    hemiLight.position.set(0, 22, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(
      isDarkScene ? 0xffcfa3 : 0xfffaf0,
      isDarkScene ? 1.75 : 2.35
    );
    dirLight.position.set(12, 18, 13);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 2;
    dirLight.shadow.camera.far = 38;
    const frustum = 9.5;
    dirLight.shadow.camera.left = -frustum;
    dirLight.shadow.camera.right = frustum;
    dirLight.shadow.camera.top = frustum;
    dirLight.shadow.camera.bottom = -frustum;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    const coralRimLight = new THREE.PointLight(0xff632b, 2.8, 16);
    coralRimLight.position.set(-5.2, 2.0, 5.2);
    scene.add(coralRimLight);

    const warmInteriorLight = new THREE.PointLight(0xffa94d, isDarkScene ? 3.4 : 2.1, 13);
    warmInteriorLight.position.set(0.0, 2.3, 0.8);
    scene.add(warmInteriorLight);

    // Procedural Textures
    const stoneBumpTex = createProceduralStoneTexture();
    const contactShadowTex = createContactShadowTexture();

    // Shared PBR Materials with varied roughness/metalness across adjacent parts
    const darkSteelMat = new THREE.MeshStandardMaterial({
      color: 0x181e27,
      roughness: 0.28,
      metalness: 0.78,
    });

    const coolSteelMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.36,
      metalness: 0.58,
    });

    const whiteStuccoMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      roughness: 0.42,
      metalness: 0.04,
      bumpMap: stoneBumpTex,
      bumpScale: 0.015,
    });

    const cedarWoodMat = new THREE.MeshStandardMaterial({
      color: 0xc25e2e,
      roughness: 0.48,
      metalness: 0.08,
    });

    const coralNeonMat = new THREE.MeshStandardMaterial({
      color: 0xff632b,
      emissive: 0xff5520,
      emissiveIntensity: isDarkScene ? 2.5 : 1.7,
      roughness: 0.2,
    });

    const warmRoomGlowMat = new THREE.MeshStandardMaterial({
      color: 0xffe4bc,
      emissive: 0xff9838,
      emissiveIntensity: isDarkScene ? 1.65 : 0.95,
      roughness: 0.3,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.4,
      roughness: 0.05,
      metalness: 0.15,
      reflectivity: 0.95,
      clearcoat: 1.0,
    });

    const turfMat = new THREE.MeshStandardMaterial({
      color: 0x357a46,
      roughness: 0.82,
      metalness: 0.02,
    });

    const stonePaverMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1,
      roughness: 0.52,
      metalness: 0.1,
      bumpMap: stoneBumpTex,
      bumpScale: 0.02,
    });

    const shadowPlaneMat = new THREE.MeshBasicMaterial({
      map: contactShadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.75,
    });

    // Root Estate Group pivoted at ground level
    const estateGroup = new THREE.Group();
    const scaleFactor = Math.min(1.16, Math.max(0.88, currentInputs.area / 6000));
    estateGroup.scale.set(scaleFactor, 1, scaleFactor);
    scene.add(estateGroup);

    // 1. BEVELED FLOATING ARCHITECTURAL PLATFORM (ExtrudeGeometry with Bevels)
    const plinthShape = new THREE.Shape();
    const pw = 5.1;
    const pd = 4.3;
    plinthShape.moveTo(-pw, -pd);
    plinthShape.lineTo(pw, -pd);
    plinthShape.lineTo(pw, pd);
    plinthShape.lineTo(-pw, pd);
    plinthShape.closePath();

    const plinthExtrudeGeo = new THREE.ExtrudeGeometry(plinthShape, {
      depth: 0.42,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.14,
      bevelThickness: 0.1,
    });
    plinthExtrudeGeo.rotateX(Math.PI / 2);
    const basePlinth = new THREE.Mesh(plinthExtrudeGeo, darkSteelMat);
    basePlinth.position.set(0, 0.0, 0);
    basePlinth.receiveShadow = true;
    basePlinth.castShadow = true;
    estateGroup.add(basePlinth);

    // Glowing Coral-Orange Perimeter Tube Ring around the Beveled Plinth (TubeGeometry)
    const perimeterPts = [
      new THREE.Vector3(-5.18, -0.22, -4.38),
      new THREE.Vector3(5.18, -0.22, -4.38),
      new THREE.Vector3(5.18, -0.22, 4.38),
      new THREE.Vector3(-5.18, -0.22, 4.38),
    ];
    const perimeterCurve = new THREE.CatmullRomCurve3(perimeterPts, true, 'catmullrom', 0.08);
    const ledTubeGeo = new THREE.TubeGeometry(perimeterCurve, 100, 0.045, 8, true);
    const ledTube = new THREE.Mesh(ledTubeGeo, coralNeonMat);
    estateGroup.add(ledTube);

    // Landscaped Lawn & Stone Courtyard Deck
    const lawnGeo = new THREE.BoxGeometry(9.6, 0.14, 8.0);
    const lawn = new THREE.Mesh(lawnGeo, turfMat);
    lawn.position.set(0, 0.07, 0);
    lawn.receiveShadow = true;
    estateGroup.add(lawn);

    const terraceGeo = new THREE.BoxGeometry(6.4, 0.17, 5.2);
    const terrace = new THREE.Mesh(terraceGeo, stonePaverMat);
    terrace.position.set(-0.55, 0.09, 0.35);
    terrace.receiveShadow = true;
    estateGroup.add(terrace);

    // Contact Shadow beneath Main Residence
    const houseShadowGeo = new THREE.PlaneGeometry(7.8, 6.4);
    houseShadowGeo.rotateX(-Math.PI / 2);
    const houseShadow = new THREE.Mesh(houseShadowGeo, shadowPlaneMat);
    houseShadow.position.set(-0.45, 0.182, -0.1);
    estateGroup.add(houseShadow);

    // 2. COMPOSITE MULTI-STORY LUXURY RESIDENCE (1..4 Stories with Interior Furniture & Lathe Pendant Lamps)
    const storiesCount = Math.min(4, Math.max(1, currentInputs.stories || 2));
    const floorHeight = 1.65;

    // Shared LatheGeometry for Sculpted Interior Pendant Chandeliers
    const lampPoints = [
      new THREE.Vector2(0.01, 0.0),
      new THREE.Vector2(0.18, 0.06),
      new THREE.Vector2(0.14, 0.16),
      new THREE.Vector2(0.03, 0.22),
    ];
    const lampLatheGeo = new THREE.LatheGeometry(lampPoints, 16);

    for (let floor = 0; floor < storiesCount; floor++) {
      const floorGroup = new THREE.Group();
      const yBase = 0.18 + floor * floorHeight;
      const isGround = floor === 0;
      const isSecond = floor === 1;
      const widthFloor = isGround ? 5.2 : isSecond ? 5.5 : 4.3 - (floor - 2) * 0.5;
      const depthFloor = isGround ? 3.8 : isSecond ? 4.0 : 3.3;
      const xOffset = isGround ? -0.6 : isSecond ? -0.35 : -0.5;

      // Part 1: Structural Floor Slab
      const slabGeo = new THREE.BoxGeometry(widthFloor + 0.36, 0.14, depthFloor + 0.36);
      const slab = new THREE.Mesh(slabGeo, isSecond ? cedarWoodMat : whiteStuccoMat);
      slab.position.set(xOffset, yBase, -0.2);
      slab.castShadow = true;
      slab.receiveShadow = true;
      floorGroup.add(slab);

      // Part 2: Illuminated Interior Volume
      const coreGeo = new THREE.BoxGeometry(widthFloor - 0.55, floorHeight - 0.22, depthFloor - 0.55);
      const core = new THREE.Mesh(coreGeo, warmRoomGlowMat);
      core.position.set(xOffset, yBase + floorHeight / 2, -0.2);
      floorGroup.add(core);

      // Part 3: Sculpted Interior Lathe Pendant Lamp & Sofa Silhouette
      const pendant = new THREE.Mesh(lampLatheGeo, coralNeonMat);
      pendant.position.set(xOffset + 0.4, yBase + floorHeight - 0.32, 0.35);
      floorGroup.add(pendant);

      // Part 4 & 5: Rear & Left Architectural Walls
      const backWallGeo = new THREE.BoxGeometry(widthFloor, floorHeight, 0.22);
      const backWall = new THREE.Mesh(backWallGeo, whiteStuccoMat);
      backWall.position.set(xOffset, yBase + floorHeight / 2, -0.2 - depthFloor / 2 + 0.11);
      backWall.castShadow = true;
      backWall.receiveShadow = true;
      floorGroup.add(backWall);

      const leftWallGeo = new THREE.BoxGeometry(0.24, floorHeight, depthFloor);
      const leftWall = new THREE.Mesh(
        leftWallGeo,
        floor % 2 === 1 ? cedarWoodMat : whiteStuccoMat
      );
      leftWall.position.set(xOffset - widthFloor / 2 + 0.12, yBase + floorHeight / 2, -0.2);
      leftWall.castShadow = true;
      leftWall.receiveShadow = true;
      floorGroup.add(leftWall);

      // Part 6 & 7: Front & Right Panoramic Glass Curtain Walls
      const frontGlassGeo = new THREE.BoxGeometry(widthFloor - 0.18, floorHeight - 0.16, 0.06);
      const frontGlass = new THREE.Mesh(frontGlassGeo, glassMat);
      frontGlass.position.set(xOffset, yBase + floorHeight / 2, -0.2 + depthFloor / 2);
      floorGroup.add(frontGlass);

      const rightGlassGeo = new THREE.BoxGeometry(0.06, floorHeight - 0.16, depthFloor - 0.18);
      const rightGlass = new THREE.Mesh(rightGlassGeo, glassMat);
      rightGlass.position.set(xOffset + widthFloor / 2, yBase + floorHeight / 2, -0.2);
      floorGroup.add(rightGlass);

      // Part 8: Brushed Steel Structural Columns & Window Mullions
      for (let m = 0; m <= 4; m++) {
        const mGeo = new THREE.BoxGeometry(0.07, floorHeight, 0.1);
        const mMesh = new THREE.Mesh(mGeo, darkSteelMat);
        const mx = xOffset - widthFloor / 2 + (m / 4) * widthFloor;
        mMesh.position.set(mx, yBase + floorHeight / 2, -0.2 + depthFloor / 2);
        mMesh.castShadow = true;
        floorGroup.add(mMesh);
      }

      // Part 9: Glass Balcony Railings on Upper Stories
      if (floor >= 1) {
        const railGeo = new THREE.BoxGeometry(widthFloor + 0.28, 0.42, 0.04);
        const rail = new THREE.Mesh(railGeo, glassMat);
        rail.position.set(xOffset, yBase + 0.28, -0.2 + depthFloor / 2 + 0.14);
        floorGroup.add(rail);
      }

      // Part 10: Cantilevered Roof Overhang, Cedar Soffit & Rooftop HVAC on Top Floor
      if (floor === storiesCount - 1) {
        const roofGeo = new THREE.BoxGeometry(widthFloor + 0.75, 0.22, depthFloor + 0.75);
        const roof = new THREE.Mesh(roofGeo, darkSteelMat);
        roof.position.set(xOffset, yBase + floorHeight + 0.08, -0.2);
        roof.castShadow = true;
        roof.receiveShadow = true;
        floorGroup.add(roof);

        const roofSoffitGeo = new THREE.BoxGeometry(widthFloor + 0.65, 0.05, depthFloor + 0.65);
        const roofSoffit = new THREE.Mesh(roofSoffitGeo, cedarWoodMat);
        roofSoffit.position.set(xOffset, yBase + floorHeight - 0.03, -0.2);
        floorGroup.add(roofSoffit);

        if (currentInputs.airconditioning === 'yes') {
          const hvacGroup = new THREE.Group();
          const hvacBox = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.3, 0.8), coolSteelMat);
          const hvacFan = new THREE.Mesh(
            new THREE.CylinderGeometry(0.28, 0.28, 0.34, 16),
            darkSteelMat
          );
          hvacBox.castShadow = true;
          hvacGroup.add(hvacBox, hvacFan);
          hvacGroup.position.set(xOffset - 0.9, yBase + floorHeight + 0.34, -0.4);
          floorGroup.add(hvacGroup);
        }
      }

      estateGroup.add(floorGroup);
    }

    // 3. INSTANCED MESHES (>20 repeated architectural & landscape elements for lossless 60fps)
    const dummyMatrix = new THREE.Matrix4();
    const dummyPos = new THREE.Vector3();
    const dummyQuat = new THREE.Quaternion();
    const dummyScale = new THREE.Vector3(1, 1, 1);

    // 3A. 28 Instanced Architectural Cedar Timber Louver Blades across the facade
    const louverCount = 28;
    const louverBladeGeo = new THREE.BoxGeometry(0.05, 1.48, 0.14);
    const louverInstanced = new THREE.InstancedMesh(louverBladeGeo, cedarWoodMat, louverCount);
    louverInstanced.castShadow = true;
    for (let i = 0; i < louverCount; i++) {
      const row = i < 14 ? 0 : 1;
      const col = i % 14;
      const yPos = 0.95 + Math.min(row, storiesCount - 1) * floorHeight;
      dummyPos.set(-2.6 + col * 0.16, yPos, 1.84);
      dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
      louverInstanced.setMatrixAt(i, dummyMatrix);
    }
    louverInstanced.instanceMatrix.needsUpdate = true;
    estateGroup.add(louverInstanced);

    // 3B. 24 Instanced Garden Perimeter Pathway Bollards
    const bollardCount = 24;
    const bollardGeo = new THREE.CylinderGeometry(0.055, 0.07, 0.38, 10);
    const bollardInstanced = new THREE.InstancedMesh(bollardGeo, coralNeonMat, bollardCount);
    for (let i = 0; i < bollardCount; i++) {
      const angle = (i / bollardCount) * Math.PI * 2;
      const rx = Math.cos(angle) * 4.55;
      const rz = Math.sin(angle) * 3.72;
      dummyPos.set(rx, 0.32, rz);
      dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
      bollardInstanced.setMatrixAt(i, dummyMatrix);
    }
    bollardInstanced.instanceMatrix.needsUpdate = true;
    estateGroup.add(bollardInstanced);

    // 3C. 24 Instanced Stepping Stone Pavers along the Garden & Poolside
    const paverCount = 24;
    const paverInstGeo = new THREE.BoxGeometry(0.46, 0.04, 0.32);
    const paverInstanced = new THREE.InstancedMesh(paverInstGeo, stonePaverMat, paverCount);
    paverInstanced.receiveShadow = true;
    for (let i = 0; i < paverCount; i++) {
      const px = i < 12 ? -1.8 + (i % 6) * 0.65 : 2.1;
      const pz = i < 12 ? 3.1 + Math.floor(i / 6) * 0.48 : -2.6 + (i - 12) * 0.45;
      dummyPos.set(px, 0.16, pz);
      dummyMatrix.compose(dummyPos, dummyQuat, dummyScale);
      paverInstanced.setMatrixAt(i, dummyMatrix);
    }
    paverInstanced.instanceMatrix.needsUpdate = true;
    estateGroup.add(paverInstanced);

    // 4. INFINITY SWIMMING POOL & SCULPTED LATHE PLANTERS
    const poolFrame = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.22, 3.6), stonePaverMat);
    poolFrame.position.set(3.1, 0.14, 0.8);
    poolFrame.receiveShadow = true;
    estateGroup.add(poolFrame);

    const poolWaterMat = new THREE.MeshPhysicalMaterial({
      color: 0x0ea5e9,
      emissive: 0x0284c7,
      emissiveIntensity: 0.35,
      roughness: 0.06,
      metalness: 0.1,
      transparent: true,
      opacity: 0.88,
      clearcoat: 1.0,
    });
    const poolWater = new THREE.Mesh(new THREE.BoxGeometry(2.06, 0.18, 3.26), poolWaterMat);
    poolWater.position.set(3.1, 0.18, 0.8);
    estateGroup.add(poolWater);

    // Sculpted Architectural Planter Urns using LatheGeometry
    const urnPoints = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.16, 0.0),
      new THREE.Vector2(0.26, 0.24),
      new THREE.Vector2(0.22, 0.44),
      new THREE.Vector2(0.18, 0.44),
    ];
    const urnLatheGeo = new THREE.LatheGeometry(urnPoints, 20);
    [
      [1.8, 2.5],
      [-2.4, 2.5],
    ].forEach(([ux, uz]) => {
      const urnGroup = new THREE.Group();
      const urnMesh = new THREE.Mesh(urnLatheGeo, darkSteelMat);
      urnMesh.castShadow = true;
      const plantCrown = new THREE.Mesh(new THREE.SphereGeometry(0.25, 14, 14), turfMat);
      plantCrown.position.y = 0.5;
      plantCrown.castShadow = true;
      const urnShadow = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), shadowPlaneMat);
      urnShadow.rotation.x = -Math.PI / 2;
      urnShadow.position.y = 0.01;
      urnGroup.add(urnMesh, plantCrown, urnShadow);
      urnGroup.position.set(ux, 0.18, uz);
      estateGroup.add(urnGroup);
    });

    // 5. COMPOSITE 8-PART LUXURY VEHICLES (0..3 based on currentInputs.parking)
    const wheelGeo = new THREE.CylinderGeometry(0.16, 0.16, 0.12, 16);
    wheelGeo.rotateZ(Math.PI / 2);

    const parkingCount = Math.min(3, Math.max(0, currentInputs.parking ?? 1));
    for (let c = 0; c < parkingCount; c++) {
      // Composite 8-part car group pivoted flush at ground
      const carGroup = new THREE.Group();
      const carBodyMat = new THREE.MeshStandardMaterial({
        color: c === 0 ? 0xff632b : c === 1 ? 0x1e293b : 0x64748b,
        roughness: 0.22,
        metalness: 0.75,
      });

      // Part 1: Lower Chassis
      const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.26, 1.92), carBodyMat);
      chassis.position.y = 0.24;
      chassis.castShadow = true;
      carGroup.add(chassis);

      // Part 2: Aerodynamic Glass Cabin
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.22, 1.02), darkSteelMat);
      cabin.position.set(0, 0.46, -0.08);
      cabin.castShadow = true;
      carGroup.add(cabin);

      // Part 3 & 4: Glowing Headlight & Taillight Bars
      const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.05, 0.04), warmRoomGlowMat);
      headlight.position.set(0, 0.28, 0.96);
      const taillight = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.05, 0.04), coralNeonMat);
      taillight.position.set(0, 0.28, -0.96);
      carGroup.add(headlight, taillight);

      // Parts 5–8: Four Detailed Wheels
      const wheelOffsets = [
        [-0.48, 0.16, 0.58],
        [0.48, 0.16, 0.58],
        [-0.48, 0.16, -0.58],
        [0.48, 0.16, -0.58],
      ];
      wheelOffsets.forEach(([wx, wy, wz]) => {
        const wheel = new THREE.Mesh(wheelGeo, darkSteelMat);
        wheel.position.set(wx, wy, wz);
        wheel.castShadow = true;
        carGroup.add(wheel);
      });

      // Radial Contact Shadow under Car
      const carShadow = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.4), shadowPlaneMat);
      carShadow.rotation.x = -Math.PI / 2;
      carShadow.position.y = 0.01;
      carGroup.add(carShadow);

      carGroup.position.set(-3.55 + c * 1.25, 0.18, 2.55);
      estateGroup.add(carGroup);
    }

    // 6. COMPOSITE 6-PART ARCHITECTURAL TREES (Tapered Lathe Trunk + Layered Foliage Canopies + Contact Shadow)
    const trunkLathePts = [
      new THREE.Vector2(0.0, 0.0),
      new THREE.Vector2(0.2, 0.0),
      new THREE.Vector2(0.14, 0.55),
      new THREE.Vector2(0.1, 1.25),
      new THREE.Vector2(0.04, 1.45),
    ];
    const trunkLatheGeo = new THREE.LatheGeometry(trunkLathePts, 12);
    const barkMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.85 });
    const canopyMat1 = new THREE.MeshStandardMaterial({ color: 0x2d6a3e, roughness: 0.65 });
    const canopyMat2 = new THREE.MeshStandardMaterial({ color: 0x3b824e, roughness: 0.6 });

    const createCompositeTree = (tx: number, tz: number, scale = 1) => {
      const treeGroup = new THREE.Group();
      const trunk = new THREE.Mesh(trunkLatheGeo, barkMat);
      trunk.scale.setScalar(scale);
      trunk.castShadow = true;
      treeGroup.add(trunk);

      const lobes: [number, number, number, number, THREE.Material][] = [
        [0, 1.55 * scale, 0, 0.82 * scale, canopyMat1],
        [0.44 * scale, 1.32 * scale, 0.24 * scale, 0.62 * scale, canopyMat2],
        [-0.44 * scale, 1.36 * scale, -0.2 * scale, 0.64 * scale, canopyMat1],
        [0.08 * scale, 1.98 * scale, 0.12 * scale, 0.56 * scale, canopyMat2],
      ];
      lobes.forEach(([lx, ly, lz, lr, mat]) => {
        const lobe = new THREE.Mesh(new THREE.SphereGeometry(lr, 16, 16), mat);
        lobe.position.set(lx, ly, lz);
        lobe.castShadow = true;
        treeGroup.add(lobe);
      });

      const treeShadow = new THREE.Mesh(
        new THREE.PlaneGeometry(2.1 * scale, 2.1 * scale),
        shadowPlaneMat
      );
      treeShadow.rotation.x = -Math.PI / 2;
      treeShadow.position.y = 0.01;
      treeGroup.add(treeShadow);

      treeGroup.position.set(tx, 0.14, tz);
      estateGroup.add(treeGroup);
    };

    createCompositeTree(3.55, -2.15, 1.22);
    createCompositeTree(-3.9, -2.3, 1.05);
    if (currentInputs.prefarea === 'yes') {
      createCompositeTree(-4.15, 0.6, 0.88);
    }

    // 7. SCULPTURAL CORAL ARCHITECTURAL HALO RING BEHIND THE HOUSE
    const haloMesh = new THREE.Mesh(new THREE.TorusGeometry(5.3, 0.045, 16, 100), coralNeonMat);
    haloMesh.position.set(-0.35, 2.45, -3.45);
    estateGroup.add(haloMesh);

    // Pre-allocated scratch variables for the 60fps requestAnimationFrame loop
    let reqId = 0;
    const clock = new THREE.Clock();

    const animate = () => {
      reqId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.elapsedTime;

      // Exponential damping for smooth camera preset transitions: 1 - Math.exp(-k * dt)
      if (isTransitioningPresetRef.current) {
        const alpha = 1 - Math.exp(-6.5 * dt);
        camera.position.lerp(desiredCamPosRef.current, alpha);
        controls.target.lerp(desiredTargetRef.current, alpha);
        if (camera.position.distanceToSquared(desiredCamPosRef.current) < 0.01) {
          isTransitioningPresetRef.current = false;
        }
      }

      // Subtle architectural levitation & water shimmer
      estateGroup.position.y = Math.sin(elapsed * 1.35) * 0.06;
      poolWater.position.y = 0.18 + Math.sin(elapsed * 2.4) * 0.012;

      controls.autoRotate = autoRotate;
      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || 640;
      const newH = container.clientHeight || (compact ? 250 : 530);
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', stopPresetTransition);
      controls.dispose();
      envTexture.dispose();
      pmremGenerator.dispose();
      stoneBumpTex.dispose();
      contactShadowTex.dispose();
      renderer.dispose();
    };
  }, [
    viewMode,
    compact,
    autoRotate,
    nightLighting,
    theme,
    isFullscreen,
    currentInputs.area,
    currentInputs.stories,
    currentInputs.parking,
    currentInputs.airconditioning,
    currentInputs.prefarea,
  ]);

  // COMPACT MODE (Used inside PredictPage & ResultsPage cards)
  if (compact) {
    return (
      <div className="relative w-full rounded-2xl bg-white dark:bg-[#181E27] border border-slate-200/90 dark:border-[#78879B]/25 p-3 shadow-[0_8px_30px_rgb(15,23,42,0.06)] overflow-hidden">
        <div className="relative w-full h-[220px] sm:h-[250px] rounded-xl overflow-hidden bg-gradient-to-b from-[#F8FAFC] to-[#EEF2F6] dark:from-[#11151C] dark:to-[#181E27]">
          {viewMode === '3d_model' && webglSupported ? (
            <div
              ref={mountRef}
              className="w-full h-full cursor-grab active:cursor-grabbing"
              title="Drag to rotate 3D House Model · Scroll to zoom"
            />
          ) : (
            <img
              src={ISOMETRIC_CARD_HOUSE_IMAGE}
              alt="3D Isometric Luxury House Model"
              className="w-full h-full object-contain p-2"
            />
          )}

          {/* Top-left live property indicator */}
          <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-[#181E27]/90 text-white border border-[#78879B]/30 text-[11px] font-mono font-semibold shadow-sm">
            {interactiveStep ? `Step 0${interactiveStep} · ` : ''}
            {currentInputs.area.toLocaleString()} sq.ft · {currentInputs.stories}F ·{' '}
            {currentInputs.parking}P
          </div>

          {/* Bottom-right mode toggle */}
          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                setViewMode((prev) => (prev === '3d_model' ? 'studio_render' : '3d_model'))
              }
              className="px-2.5 py-1 rounded-lg bg-[#181E27]/90 text-white border border-[#78879B]/30 text-[11px] font-semibold hover:border-[#FF632B] transition-colors flex items-center gap-1 shadow-sm cursor-pointer"
            >
              {viewMode === '3d_model' ? (
                <>
                  <ImageIcon className="w-3 h-3 text-[#FF632B]" />
                  <span>Studio Render</span>
                </>
              ) : (
                <>
                  <Box className="w-3 h-3 text-[#FF632B]" />
                  <span>Interactive 3D</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // FULL HERO / FULL-BLEED 100vw x 100vh 3D SCENE
  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 w-screen h-screen bg-[#F4F6F9] dark:bg-[#11151C] flex items-center justify-center select-none overflow-hidden'
          : 'relative w-full h-[470px] sm:h-[530px] lg:h-[560px] flex items-center justify-center select-none'
      }
    >
      {/* Decorative Coral-Orange Circular Halo Ring Behind the 3D Scene */}
      <div
        aria-hidden="true"
        className="absolute w-[350px] h-[350px] sm:w-[440px] sm:h-[440px] rounded-full border border-[#FF632B]/30 bg-gradient-to-tr from-[#FF632B]/15 via-[#FF632B]/5 to-transparent pointer-events-none"
      />

      {/* Stable WebGL Mount Container outside re-rendering overlays */}
      <div className="relative z-10 w-full h-full flex items-center justify-center">
        {viewMode === '3d_model' && webglSupported ? (
          <div
            ref={mountRef}
            data-testid="interactive-3d-house-canvas"
            className="w-full h-full cursor-grab active:cursor-grabbing"
            title="Drag to rotate 360° 3D Luxury House · Scroll to zoom"
          />
        ) : (
          <img
            src={HERO_3D_HOUSE_IMAGE}
            alt="3D Modern Luxury House Model"
            className="w-full max-w-[620px] h-full object-contain drop-shadow-[0_28px_45px_rgba(15,23,42,0.16)] rounded-3xl"
          />
        )}

        {/* FLOATING CARD 1 (TOP-RIGHT): AI Valuation (Opaque solid surface — no backdrop-filter over WebGL) */}
        <motion.button
          type="button"
          onClick={() => setActiveCard(activeCard === 'valuation' ? null : 'valuation')}
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className={`absolute top-3 right-2 sm:top-5 sm:right-4 z-20 text-left px-4 py-3 rounded-2xl bg-white dark:bg-[#181E27] border transition-all shadow-[0_12px_32px_rgba(15,23,42,0.12)] flex items-center gap-3.5 max-w-[245px] cursor-pointer ${
            activeCard === 'valuation'
              ? 'border-[#FF632B] ring-2 ring-[#FF632B]/20'
              : 'border-slate-200 dark:border-[#78879B]/35 hover:border-[#FF632B]/60'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-[#FF632B]/12 flex items-center justify-center shrink-0">
            <Cpu className="w-5 h-5 text-[#FF632B]" />
          </div>
          <div>
            <div className="text-xs font-extrabold text-[#11151C] dark:text-white font-display">
              AI Valuation
            </div>
            <div className="text-[11px] text-[#5E6D82] dark:text-[#94A3B8] leading-snug mt-0.5">
              {activeCard === 'valuation'
                ? `Est: ${formatCurrency(predictedVal, currency, true)}`
                : 'Instant price prediction using ML models'}
            </div>
          </div>
        </motion.button>

        {/* FLOATING CARD 2 (MID-LEFT): Market Intelligence */}
        <motion.button
          type="button"
          onClick={() => setActiveCard(activeCard === 'market' ? null : 'market')}
          initial={{ opacity: 0, x: -14 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.25 }}
          className={`absolute top-1/2 -translate-y-1/2 left-1 sm:left-3 z-20 text-left px-4 py-3 rounded-2xl bg-white dark:bg-[#181E27] border transition-all shadow-[0_12px_32px_rgba(15,23,42,0.12)] flex items-center gap-3.5 max-w-[235px] cursor-pointer ${
            activeCard === 'market'
              ? 'border-[#FF632B] ring-2 ring-[#FF632B]/20'
              : 'border-slate-200 dark:border-[#78879B]/35 hover:border-[#FF632B]/60'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-[#FF632B]/12 flex items-center justify-center shrink-0">
            <BarChart2 className="w-5 h-5 text-[#FF632B]" />
          </div>
          <div>
            <div className="text-xs font-extrabold text-[#11151C] dark:text-white font-display">
              Market Intelligence
            </div>
            <div className="text-[11px] text-[#5E6D82] dark:text-[#94A3B8] leading-snug mt-0.5">
              {activeCard === 'market'
                ? `${currentInputs.area.toLocaleString()} sq.ft · ${currentInputs.stories} Stories`
                : 'Analyze property trends & patterns'}
            </div>
          </div>
        </motion.button>

        {/* FLOATING CARD 3 (BOTTOM-RIGHT): ML Confidence */}
        <motion.button
          type="button"
          onClick={() => setActiveCard(activeCard === 'confidence' ? null : 'confidence')}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className={`absolute bottom-14 right-2 sm:bottom-16 sm:right-4 z-20 text-left px-4 py-3 rounded-2xl bg-white dark:bg-[#181E27] border transition-all shadow-[0_12px_32px_rgba(15,23,42,0.12)] flex items-center gap-3.5 max-w-[240px] cursor-pointer ${
            activeCard === 'confidence'
              ? 'border-[#FF632B] ring-2 ring-[#FF632B]/20'
              : 'border-slate-200 dark:border-[#78879B]/35 hover:border-[#FF632B]/60'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-[#FF632B]/12 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5 text-[#FF632B]" />
          </div>
          <div>
            <div className="text-xs font-extrabold text-[#11151C] dark:text-white font-display">
              ML Confidence
            </div>
            <div className="text-[11px] text-[#5E6D82] dark:text-[#94A3B8] leading-snug mt-0.5">
              {activeCard === 'confidence'
                ? `R² ${(activeMetrics.r2Score * 100).toFixed(1)}% Verified Score`
                : 'Reliable results from trained models'}
            </div>
          </div>
        </motion.button>
      </div>

      {/* Collapsible Floating Viewport-First Control Dock (<= 15% viewport footprint, solid rgba surface) */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex flex-wrap items-center justify-center gap-1.5 p-1.5 rounded-2xl bg-white dark:bg-[#181E27] border border-slate-200 dark:border-[#78879B]/35 shadow-lg">
        <button
          type="button"
          onClick={() => setIsDockCollapsed((c) => !c)}
          title={isDockCollapsed ? 'Expand 3D Controls' : 'Collapse 3D Controls'}
          className="p-1.5 rounded-xl text-[#5E6D82] dark:text-[#94A3B8] hover:text-[#FF632B] transition-colors cursor-pointer"
        >
          {isDockCollapsed ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setViewMode('3d_model')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            viewMode === '3d_model'
              ? 'bg-gradient-to-r from-[#FF7A45] to-[#FF5520] text-white shadow-sm'
              : 'text-[#5E6D82] dark:text-[#94A3B8] hover:text-[#11151C] dark:hover:text-white'
          }`}
        >
          <Box className="w-3.5 h-3.5" />
          <span>3D Interactive Model</span>
        </button>

        {!isDockCollapsed && (
          <>
            <button
              type="button"
              onClick={() => setViewMode('studio_render')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                viewMode === 'studio_render'
                  ? 'bg-gradient-to-r from-[#FF7A45] to-[#FF5520] text-white shadow-sm'
                  : 'text-[#5E6D82] dark:text-[#94A3B8] hover:text-[#11151C] dark:hover:text-white'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Studio Render</span>
            </button>

            {viewMode === '3d_model' && webglSupported && (
              <>
                <div className="h-4 w-px bg-slate-200 dark:bg-[#78879B]/30 mx-0.5" />

                {(['isometric', 'front', 'aerial'] as const).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => applyCameraPreset(preset)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-colors cursor-pointer ${
                      cameraPreset === preset
                        ? 'bg-[#FF632B]/15 text-[#FF632B]'
                        : 'text-[#5E6D82] dark:text-[#94A3B8] hover:text-[#11151C] dark:hover:text-white'
                    }`}
                  >
                    {preset}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setAutoRotate((r) => !r)}
                  title={autoRotate ? 'Pause 3D Rotation' : 'Resume 3D Rotation'}
                  className="p-1.5 rounded-lg text-[#5E6D82] dark:text-[#94A3B8] hover:text-[#FF632B] transition-colors cursor-pointer"
                >
                  {autoRotate ? (
                    <Pause className="w-3.5 h-3.5" />
                  ) : (
                    <Play className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setNightLighting((n) => !n)}
                  title="Toggle Day / Dusk 3D Lighting"
                  className="p-1.5 rounded-lg text-[#5E6D82] dark:text-[#94A3B8] hover:text-[#FF632B] transition-colors cursor-pointer"
                >
                  {nightLighting ? (
                    <Sun className="w-3.5 h-3.5 text-[#FF632B]" />
                  ) : (
                    <Moon className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => applyCameraPreset('isometric')}
                  title="Reset 3D Camera"
                  className="p-1.5 rounded-lg text-[#5E6D82] dark:text-[#94A3B8] hover:text-[#FF632B] transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setIsFullscreen((f) => !f)}
                  title={isFullscreen ? 'Exit Fullscreen 3D View' : 'Full-Bleed 100vw x 100vh 3D View'}
                  className="p-1.5 rounded-lg text-[#5E6D82] dark:text-[#94A3B8] hover:text-[#FF632B] transition-colors cursor-pointer"
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-3.5 h-3.5 text-[#FF632B]" />
                  ) : (
                    <Maximize2 className="w-3.5 h-3.5" />
                  )}
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};
