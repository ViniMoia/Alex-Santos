/**
 * AIOX Cohort Fundamentals — Turma 6
 * Particle Engine: A SYSTEM IN MOTION
 * Generative Three.js + GLSL Simulation
 *
 * Narrative Progression:
 * 01 // USUÁRIO DE CHAT: Prompts soltos, dispersos e caóticos.
 * 02 // FORMAÇÃO DE AGENTES: Estruturação progressiva em 6 encontros ao vivo.
 * 03 // SISTEMA DE CAPTAÇÃO NO AR: Rede conectada e autônoma em operação contínua.
 */

class ParticleEngine {
    constructor(canvasId, options = {}) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) {
            throw new Error(`Canvas with ID "${canvasId}" not found.`);
        }

        // Configuration Parameters
        this.config = {
            desktopCount: options.desktopCount || 2200,
            tabletCount: options.tabletCount || 1200,
            mobileCount: options.mobileCount || 500,
            cameraZ: 6.2,
            bloomStrength: 1.15,
            bloomRadius: 0.38,
            bloomThreshold: 0.14,
            ...options
        };

        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.isMobile = this.width < 640;
        this.isTablet = this.width >= 640 && this.width < 1024;

        // Simulation State
        this.state = {
            formationProgress: 0.0, // 0.0 (Chaos) -> 1.0 (System)
            chaosTurbulence: 1.0,
            mouseInfluence: 1.0,
            reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        };

        // Pointer tracking
        this.mouse = {
            x: 0,
            y: 0,
            targetX: 0,
            targetY: 0
        };

        this.clock = new THREE.Clock();
        this.animId = null;

        this.init();
    }

    /**
     * Pseudo-random generator with fixed seed for determinism
     */
    createPRNG(seed = 42) {
        let s = seed;
        return function () {
            s = (s * 9301 + 49297) % 233280;
            return s / 233280;
        };
    }

    init() {
        // 1. Scene & Dark Fog
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.FogExp2(0x05070D, 0.065);

        // 2. Perspective Camera
        this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 0.1, 100);
        this.camera.position.set(0, 0, this.config.cameraZ);

        // 3. WebGL Renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: !this.isMobile,
            alpha: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // 4. Root Container Group
        this.systemGroup = new THREE.Group();
        this.scene.add(this.systemGroup);

        // 5. Build Particles and Selective Lines
        this.buildParticleSystem();
        this.buildSelectiveConnections();

        // 6. Post-Processing (Bloom on Desktop)
        this.setupPostProcessing();

        // 7. Event Listeners
        this.bindEvents();

        // 8. Start Rendering Loop
        this.render = this.render.bind(this);
        this.render();
    }

    /**
     * Compute 5 Operating Clusters (State 03: The Operating System)
     */
    getClusters() {
        return [
            { id: 0, name: "Orchestration Hub", center: new THREE.Vector3(0.0, 0.05, 0.1), radius: 0.85, weight: 0.30 },
            { id: 1, name: "Ingestion & Data Flow", center: new THREE.Vector3(-2.3, 1.05, -0.2), radius: 0.65, weight: 0.18 },
            { id: 2, name: "Multi-Agent Swarm", center: new THREE.Vector3(2.2, 1.1, 0.2), radius: 0.70, weight: 0.20 },
            { id: 3, name: "Context & Memory Bank", center: new THREE.Vector3(-2.0, -1.15, 0.3), radius: 0.60, weight: 0.16 },
            { id: 4, name: "Evaluation & Governance", center: new THREE.Vector3(2.0, -1.05, -0.25), radius: 0.62, weight: 0.16 }
        ];
    }

    /**
     * Build Particle Geometry with dual-state buffer attributes
     */
    buildParticleSystem() {
        const count = this.isMobile
            ? this.config.mobileCount
            : this.isTablet
            ? this.config.tabletCount
            : this.config.desktopCount;

        const prng = this.createPRNG(1337);
        const clusters = this.getClusters();

        const chaosPositions = new Float32Array(count * 3);
        const targetPositions = new Float32Array(count * 3);
        const phaseDelays = new Float32Array(count);
        const scales = new Float32Array(count);
        const clusterIndices = new Float32Array(count);

        // Save reference to core cluster hubs for connection lines
        this.clusterCorePositions = clusters.map(c => c.center.clone());
        this.satellitePositions = [];

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;

            // 1. STATE 01 (CHAOS): Organic, turbulent 3D cloud
            const rChaos = 2.4 * Math.cbrt(prng()) + 0.3;
            const thetaChaos = prng() * Math.PI * 2;
            const phiChaos = Math.acos(2 * prng() - 1);

            // Ellipsoid spread spanning the full hero stage
            const xChaos = rChaos * Math.sin(phiChaos) * Math.cos(thetaChaos) * 1.5;
            const yChaos = rChaos * Math.sin(phiChaos) * Math.sin(thetaChaos) * 1.1;
            const zChaos = rChaos * Math.cos(phiChaos) * 1.2;

            chaosPositions[i3] = xChaos;
            chaosPositions[i3 + 1] = yChaos;
            chaosPositions[i3 + 2] = zChaos;

            // 2. STATE 03 (SYSTEM): Structured distribution into 5 Operating Clusters
            let clusterId = 0;
            const randCluster = prng();
            let accumulatedWeight = 0;
            for (let c = 0; c < clusters.length; c++) {
                accumulatedWeight += clusters[c].weight;
                if (randCluster <= accumulatedWeight) {
                    clusterId = c;
                    break;
                }
            }

            const targetCluster = clusters[clusterId];
            const isCoreNode = i < clusters.length * 3; // Prominent hubs

            let targetX, targetY, targetZ;
            if (isCoreNode) {
                // Dense core node
                targetX = targetCluster.center.x + (prng() - 0.5) * 0.15;
                targetY = targetCluster.center.y + (prng() - 0.5) * 0.15;
                targetZ = targetCluster.center.z + (prng() - 0.5) * 0.15;
            } else {
                // Orbital distribution around the cluster
                const rCluster = Math.pow(prng(), 1.5) * targetCluster.radius;
                const thetaC = prng() * Math.PI * 2;
                const phiC = Math.acos(2 * prng() - 1);

                targetX = targetCluster.center.x + rCluster * Math.sin(phiC) * Math.cos(thetaC);
                targetY = targetCluster.center.y + rCluster * Math.sin(phiC) * Math.sin(thetaC) * 0.85;
                targetZ = targetCluster.center.z + rCluster * Math.cos(phiC) * 0.9;
            }

            targetPositions[i3] = targetX;
            targetPositions[i3 + 1] = targetY;
            targetPositions[i3 + 2] = targetZ;

            // Collect notable satellites for line wiring
            if (i < 80) {
                this.satellitePositions.push({
                    pos: new THREE.Vector3(targetX, targetY, targetZ),
                    clusterId: clusterId
                });
            }

            // Phase delay (0.0 to 1.0) creates wave-like formation
            phaseDelays[i] = prng();

            // Particle scale & hierarchy
            scales[i] = isCoreNode ? 2.4 : 0.65 + prng() * 0.85;

            clusterIndices[i] = clusterId;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(chaosPositions, 3));
        geometry.setAttribute('aTargetPosition', new THREE.BufferAttribute(targetPositions, 3));
        geometry.setAttribute('aPhaseDelay', new THREE.BufferAttribute(phaseDelays, 1));
        geometry.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
        geometry.setAttribute('aClusterIndex', new THREE.BufferAttribute(clusterIndices, 1));

        // Custom GLSL Shader Material
        this.particleMaterial = new THREE.ShaderMaterial({
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            uniforms: {
                uTime: { value: 0.0 },
                uFormationProgress: { value: 0.0 },
                uMouse: { value: new THREE.Vector2(0, 0) },
                uMouseInfluence: { value: 1.0 },
                uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
                uColorDeep: { value: new THREE.Color(0x0f3b82) },    // Deep electric cobalt
                uColorOcean: { value: new THREE.Color(0x1b81c1) },   // Ocean Blue
                uColorCyan: { value: new THREE.Color(0x00f0ff) },    // Electric Cyan
                uColorWhite: { value: new THREE.Color(0xf0f6fc) }    // Cool White
            },
            vertexShader: `
                uniform float uTime;
                uniform float uFormationProgress;
                uniform vec2 uMouse;
                uniform float uMouseInfluence;
                uniform float uPixelRatio;

                attribute vec3 aTargetPosition;
                attribute float aPhaseDelay;
                attribute float aScale;
                attribute float aClusterIndex;

                varying float vMouseDist;
                varying float vDepth;
                varying float vProgress;
                varying float vScale;
                varying float vClusterIndex;

                void main() {
                    vClusterIndex = aClusterIndex;
                    vScale = aScale;

                    // Sigmoid individual transition based on phase delay
                    // Gives organic, fluid clustering instead of uniform movement
                    float p = smoothstep(aPhaseDelay * 0.3, 0.7 + aPhaseDelay * 0.3, uFormationProgress);
                    vProgress = p;

                    // Interpolate base position
                    vec3 pos = mix(position, aTargetPosition, p);

                    // 1. Chaotic wave drift (dominates at progress 0, subsides at progress 1)
                    float chaosWave = sin(pos.y * 1.8 + uTime * 0.7) * cos(pos.z * 1.8 + uTime * 0.6) * 0.08 * (1.0 - p * 0.85);
                    pos += normalize(pos + vec3(0.001)) * chaosWave;

                    // 2. Synchronized orbital motion (becomes dominant at progress 1)
                    float orbitAngle = uTime * 0.45 + aPhaseDelay * 6.2831;
                    vec3 orbitOffset = vec3(-sin(orbitAngle), cos(orbitAngle * 0.8), cos(orbitAngle)) * 0.035 * p;
                    pos += orbitOffset;

                    // View Model projection
                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

                    // Track cursor in screen space
                    vec4 projPos = projectionMatrix * mvPosition;
                    vec2 screenPos = projPos.xy / projPos.w;
                    float mouseDist = distance(screenPos, uMouse);
                    vMouseDist = mouseDist;

                    // Local radial elastic perturbation by cursor
                    float cursorRepel = smoothstep(0.55, 0.0, mouseDist) * 0.28 * uMouseInfluence;
                    vec2 repelDir = normalize(screenPos - uMouse + vec2(0.0001));
                    mvPosition.xy += repelDir * cursorRepel;

                    gl_Position = projectionMatrix * mvPosition;

                    vDepth = -mvPosition.z;

                    // Size attenuation with depth and cursor proximity glow
                    float proximityBoost = mix(1.0, 2.3, smoothstep(0.4, 0.0, mouseDist) * uMouseInfluence);
                    float baseSize = 22.0 * aScale * uPixelRatio;
                    gl_PointSize = (baseSize / max(vDepth, 0.5)) * proximityBoost;
                }
            `,
            fragmentShader: `
                uniform vec3 uColorDeep;
                uniform vec3 uColorOcean;
                uniform vec3 uColorCyan;
                uniform vec3 uColorWhite;

                varying float vMouseDist;
                varying float vDepth;
                varying float vProgress;
                varying float vScale;
                varying float vClusterIndex;

                void main() {
                    // Soft circular particle mask with diffused edge
                    vec2 coord = gl_PointCoord - vec2(0.5);
                    float dist = length(coord);
                    if (dist > 0.5) discard;

                    float mask = smoothstep(0.5, 0.05, dist);

                    // Depth factor
                    float depthFactor = smoothstep(8.5, 3.2, vDepth);

                    // Color transitions as the system becomes organized
                    // Chaos = deeper blues/ocean; System = vibrant electric cyan and glowing white cores
                    vec3 chaoticColor = mix(uColorDeep, uColorOcean, depthFactor);
                    vec3 structuredColor = mix(uColorOcean, uColorCyan, vProgress);

                    // Large core nodes shine brighter
                    if (vScale > 1.8) {
                        structuredColor = mix(structuredColor, uColorWhite, 0.7);
                    }

                    vec3 color = mix(chaoticColor, structuredColor, vProgress);

                    // Proximity to mouse transforms points into bright cyan-mint flare
                    float mouseGlow = smoothstep(0.45, 0.0, vMouseDist);
                    color = mix(color, vec3(0.35, 1.0, 0.95), mouseGlow * 0.7);

                    // Opacity calculation
                    float baseAlpha = mix(0.25, 0.95, depthFactor);
                    // System state increases node definition and coherence
                    baseAlpha = mix(baseAlpha, 0.98, vProgress * 0.4);
                    float finalAlpha = mask * mix(baseAlpha, 1.0, mouseGlow);

                    gl_FragColor = vec4(color, finalAlpha);
                }
            `
        });

        this.particles = new THREE.Points(geometry, this.particleMaterial);
        this.systemGroup.add(this.particles);
    }

    /**
     * Build Selective Dynamic Connection Lines between Cluster Hubs
     */
    buildSelectiveConnections() {
        const linePositions = [];
        const lineCoords = []; // progress 0 to 1 along each line segment
        const clusters = this.getClusters();

        // 1. Hub-to-Hub Backbone (The Operating System Backbone)
        const backboneEdges = [
            [0, 1], [0, 2], [0, 3], [0, 4], // Center to all outer hubs
            [1, 2], [3, 4], [1, 3], [2, 4]  // Cross-system workflows
        ];

        backboneEdges.forEach(([from, to]) => {
            const p1 = clusters[from].center;
            const p2 = clusters[to].center;
            linePositions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z);
            lineCoords.push(0.0, 1.0);
        });

        // 2. Intra-Cluster Satellite Connections (Local Sub-workflows)
        const maxSatellites = this.isMobile ? 18 : 60;
        for (let s = 0; s < Math.min(this.satellitePositions.length, maxSatellites); s++) {
            const sat = this.satellitePositions[s];
            const hubCenter = clusters[sat.clusterId].center;
            linePositions.push(hubCenter.x, hubCenter.y, hubCenter.z, sat.pos.x, sat.pos.y, sat.pos.z);
            lineCoords.push(0.0, 1.0);
        }

        const linesGeometry = new THREE.BufferGeometry();
        linesGeometry.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
        linesGeometry.setAttribute('aLineCoord', new THREE.Float32BufferAttribute(lineCoords, 1));

        this.linesMaterial = new THREE.ShaderMaterial({
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            uniforms: {
                uTime: { value: 0.0 },
                uFormationProgress: { value: 0.0 },
                uMouse: { value: new THREE.Vector2(0, 0) },
                uColorLine: { value: new THREE.Color(0x00f0ff) },
                uColorDeep: { value: new THREE.Color(0x1b81c1) }
            },
            vertexShader: `
                uniform float uTime;
                uniform float uFormationProgress;
                uniform vec2 uMouse;
                attribute float aLineCoord;

                varying float vLineCoord;
                varying float vDepth;
                varying float vMouseDist;

                void main() {
                    vLineCoord = aLineCoord;
                    vec3 pos = position;

                    // Subtle breathing
                    pos.y += sin(uTime * 1.2 + pos.x * 2.0) * 0.02 * uFormationProgress;

                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
                    vec4 projPos = projectionMatrix * mvPosition;
                    vec2 screenPos = projPos.xy / projPos.w;

                    vMouseDist = distance(screenPos, uMouse);
                    vDepth = -mvPosition.z;

                    gl_Position = projPos;
                }
            `,
            fragmentShader: `
                uniform float uTime;
                uniform float uFormationProgress;
                uniform vec3 uColorLine;
                uniform vec3 uColorDeep;

                varying float vLineCoord;
                varying float vDepth;
                varying float vMouseDist;

                void main() {
                    // Lines emerge primarily in STATE 02 & 03
                    float visibility = smoothstep(0.2, 0.9, uFormationProgress);
                    if (visibility <= 0.01) discard;

                    // Traveling signal pulses along lines (active data flow)
                    float pulse = sin(uTime * 3.2 - vLineCoord * 10.0);
                    float pulseIntensity = smoothstep(0.7, 1.0, pulse) * 0.6;

                    // Cursor highlights local connection lines
                    float mouseHighlight = smoothstep(0.5, 0.0, vMouseDist) * 0.5;

                    vec3 color = mix(uColorDeep, uColorLine, 0.5 + pulseIntensity * 0.5);
                    color = mix(color, vec3(0.5, 1.0, 1.0), mouseHighlight);

                    float depthFactor = smoothstep(8.5, 3.5, vDepth);
                    float alpha = visibility * (0.18 + pulseIntensity + mouseHighlight) * depthFactor;

                    gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.85));
                }
            `
        });

        this.connectionLines = new THREE.LineSegments(linesGeometry, this.linesMaterial);
        this.systemGroup.add(this.connectionLines);
    }

    /**
     * Post-processing pipeline (UnrealBloom on desktop)
     */
    setupPostProcessing() {
        const hasBloomClasses = typeof THREE.EffectComposer !== "undefined" && typeof THREE.UnrealBloomPass !== "undefined";

        if (hasBloomClasses && !this.isMobile && !this.state.reducedMotion) {
            try {
                this.composer = new THREE.EffectComposer(this.renderer);
                const renderPass = new THREE.RenderPass(this.scene, this.camera);
                this.composer.addPass(renderPass);

                this.bloomPass = new THREE.UnrealBloomPass(
                    new THREE.Vector2(this.width, this.height),
                    this.config.bloomStrength,
                    this.config.bloomRadius,
                    this.config.bloomThreshold
                );
                this.composer.addPass(this.bloomPass);
            } catch (err) {
                console.warn("Bloom setup bypassed, falling back to standard renderer:", err);
                this.composer = null;
            }
        }
    }

    bindEvents() {
        // Pointer tracking in NDC coordinates (-1 to 1)
        window.addEventListener("pointermove", (e) => {
            this.mouse.targetX = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.targetY = -(e.clientY / window.innerHeight) * 2 + 1;
        }, { passive: true });

        // Resize handler
        window.addEventListener("resize", () => {
            this.onResize();
        }, { passive: true });

        // Listen for reduced motion changes
        const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        motionQuery.addEventListener("change", (e) => {
            this.state.reducedMotion = e.matches;
            if (e.matches) {
                this.setFormationProgress(1.0);
            }
        });
    }

    onResize() {
        this.width = window.innerWidth;
        this.height = window.innerHeight;
        this.isMobile = this.width < 640;
        this.isTablet = this.width >= 640 && this.width < 1024;

        this.camera.aspect = this.width / this.height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(this.width, this.height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        if (this.particleMaterial) {
            this.particleMaterial.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
        }

        if (this.composer) {
            this.composer.setSize(this.width, this.height);
        }
    }

    /**
     * Programmatically update formation progress (called by GSAP / ScrollTrigger)
     * @param {number} val - Progress from 0.0 (Chaos) to 1.0 (System)
     */
    setFormationProgress(val) {
        const clamped = Math.max(0, Math.min(1, val));
        this.state.formationProgress = clamped;

        if (this.particleMaterial) {
            this.particleMaterial.uniforms.uFormationProgress.value = clamped;
        }
        if (this.linesMaterial) {
            this.linesMaterial.uniforms.uFormationProgress.value = clamped;
        }
    }

    render() {
        this.animId = requestAnimationFrame(this.render);

        const elapsedTime = this.clock.getElapsedTime();

        // Smooth mouse damping (Lerp)
        if (!this.state.reducedMotion) {
            this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.05;
            this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.05;

            // System subtle 3D tilt
            this.systemGroup.rotation.x = -this.mouse.y * 0.12;
            this.systemGroup.rotation.y = this.mouse.x * 0.16 + elapsedTime * 0.025;

            // Camera subtle parallax
            this.camera.position.x = this.mouse.x * 0.35;
            this.camera.position.y = this.mouse.y * 0.30;
            this.camera.lookAt(0, 0, 0);
        }

        // Update Shader Uniforms
        if (this.particleMaterial) {
            this.particleMaterial.uniforms.uTime.value = elapsedTime;
            this.particleMaterial.uniforms.uMouse.value.set(this.mouse.x, this.mouse.y);
        }

        if (this.linesMaterial) {
            this.linesMaterial.uniforms.uTime.value = elapsedTime;
            this.linesMaterial.uniforms.uMouse.value.set(this.mouse.x, this.mouse.y);
        }

        // Render Frame
        if (this.composer && !this.isMobile && !this.state.reducedMotion) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    /**
     * Clean resource disposal
     */
    dispose() {
        if (this.animId) {
            cancelAnimationFrame(this.animId);
        }

        if (this.particles) {
            this.particles.geometry.dispose();
            this.particleMaterial.dispose();
            this.systemGroup.remove(this.particles);
        }

        if (this.connectionLines) {
            this.connectionLines.geometry.dispose();
            this.linesMaterial.dispose();
            this.systemGroup.remove(this.connectionLines);
        }

        if (this.composer) {
            this.composer.dispose();
        }

        this.renderer.dispose();
    }
}

// Export for module or global use
if (typeof module !== "undefined" && module.exports) {
    module.exports = ParticleEngine;
} else {
    window.ParticleEngine = ParticleEngine;
}
