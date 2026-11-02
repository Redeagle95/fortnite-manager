import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import type { FortniteSeason } from "./seasons/seasonRegistry";

type Props = { season: FortniteSeason; skin: number; victory: boolean; quality: "low" | "medium" | "high" };

function Cloud({ position, speed = .1 }: { position: [number, number, number]; speed?: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state, delta) => {
    if (!ref.current) return;
    ref.current.position.x += delta * speed;
    if (ref.current.position.x > 17) ref.current.position.x = -17;
    ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * .3) * .1;
  });
  return <group ref={ref} position={position}>
    {[[-.7,-.1,0,.7],[0,0,0,1],[.75,-.12,0,.65]].map(([x,y,z,s],i)=><mesh key={i} position={[x,y,z]} scale={s}><sphereGeometry args={[.8,12,10]}/><meshStandardMaterial color="white" transparent opacity={.15} roughness={1}/></mesh>)}
  </group>;
}

function Tree({ position, color, scale = 1 }: { position: [number,number,number]; color: string; scale?: number }) {
  return <group position={position} scale={scale}>
    <mesh position={[0,.5,0]} castShadow><cylinderGeometry args={[.12,.2,1,7]}/><meshStandardMaterial color="#594538"/></mesh>
    <mesh position={[0,1.25,0]} castShadow><coneGeometry args={[.7,1.55,7]}/><meshStandardMaterial color={color}/></mesh>
    <mesh position={[0,1.8,0]} castShadow><coneGeometry args={[.45,1.1,7]}/><meshStandardMaterial color={color}/></mesh>
  </group>;
}

function Island({ season }: { season: FortniteSeason }) {
  const ref = useRef<THREE.Group>(null);
  const rocks = useMemo(()=>Array.from({length:14},(_,i)=>({a:i/14*Math.PI*2,r:4.7+(i%3)*.25,s:.5+(i%4)*.16})),[]);
  const trees = season.environment === "tropical" || season.environment === "jungle";
  const city = season.environment === "neon" || season.environment === "future" || season.environment === "alien";
  const treeColor = season.environment === "neon" ? "#d86eaf" : season.environment === "alien" ? "#a2c65a" : "#4d9560";
  useFrame(({clock})=>{ if(ref.current){ref.current.position.y=-1.1+Math.sin(clock.elapsedTime*.45)*.08;ref.current.rotation.y=Math.sin(clock.elapsedTime*.12)*.035;} });
  return <group ref={ref} position={[0,-1.1,0]}>
    <mesh position={[0,-.55,0]} scale={[1,.48,.83]} receiveShadow><sphereGeometry args={[5.8,48,28]}/><meshStandardMaterial color={season.ground} roughness={.96}/></mesh>
    <mesh position={[0,-.05,0]} rotation={[-Math.PI/2,0,0]} receiveShadow><cylinderGeometry args={[5.65,5.1,.5,64]}/><meshStandardMaterial color={season.ground}/></mesh>
    <mesh position={[0,.12,0]} rotation={[-Math.PI/2,0,0]}><cylinderGeometry args={[5.25,5.25,.08,64]}/><meshStandardMaterial color={season.water} roughness={.3} metalness={.2} transparent opacity={.65}/></mesh>
    {rocks.map((r,i)=><mesh key={i} position={[Math.cos(r.a)*r.r,-.35-(i%3)*.2,Math.sin(r.a)*r.r]} rotation={[0,r.a,0]} scale={[r.s,r.s*1.6,r.s]}><dodecahedronGeometry args={[.8,0]}/><meshStandardMaterial color={i%2?"#45505d":"#626b77"}/></mesh>)}
    {trees && <><Tree position={[-3,.05,-1.6]} color={treeColor} scale={1.1}/><Tree position={[3.2,.05,-1.8]} color={treeColor}/><Tree position={[-3.5,.05,1.3]} color={treeColor} scale={.8}/><Tree position={[3.5,.05,1.2]} color={treeColor}/></>}
    {city && Array.from({length:7},(_,i)=><mesh key={i} position={[(i-3)*1.2,.9+(i%3)*.4,-3.1-(i%2)*.5]} castShadow><boxGeometry args={[.65,1.8+(i%3)*.8,.65]}/><meshStandardMaterial color={i%2?season.accent:"#647a96"} emissive={season.accent} emissiveIntensity={.15}/></mesh>)}
    {(season.environment==="wasteland"||season.environment==="chrome")&&<mesh position={[0,.7,-3.25]} castShadow><dodecahedronGeometry args={[1.2,0]}/><meshStandardMaterial color={season.accent} metalness={.55} roughness={.28}/></mesh>}
    <mesh position={[0,.32,0]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[2.05,.045,8,72]}/><meshBasicMaterial color={season.accent}/></mesh>
  </group>;
}

function Avatar({skin,victory}:{skin:number;victory:boolean}) {
  const root=useRef<THREE.Group>(null), body=useRef<THREE.Group>(null);
  const suit=["#e8edf5","#e8a45f","#79c8d4","#bd8de8"][skin%4];
  useFrame(({clock})=>{const t=clock.elapsedTime;if(root.current)root.current.position.y=-.15+Math.sin(t*(victory?8:1.7))*(victory ? .12 : .035);if(body.current){body.current.rotation.z=victory?Math.sin(t*8)*.18:Math.sin(t*1.1)*.025;body.current.rotation.y=Math.sin(t*.7)*.045;}});
  return <group ref={root} position={[0,-.15,1.2]} onPointerDown={(event)=>{event.stopPropagation();event.target.setPointerCapture(event.pointerId);}} onPointerMove={(event)=>{if(event.buttons===1&&root.current)root.current.rotation.y+=event.movementX*.012;}}><group ref={body}>
    <mesh position={[0,1.55,0]} castShadow><capsuleGeometry args={[.38,.82,5,12]}/><meshStandardMaterial color={suit} roughness={.62}/></mesh>
    <mesh position={[0,2.32,0]} castShadow><sphereGeometry args={[.34,20,16]}/><meshStandardMaterial color="#e8b995"/></mesh>
    <mesh position={[0,2.39,.25]}><sphereGeometry args={[.075,12,10]}/><meshStandardMaterial color="#202b3b"/></mesh>
    <mesh position={[-.46,1.6,0]} rotation={[0,0,-.18]} castShadow><capsuleGeometry args={[.13,.66,4,8]}/><meshStandardMaterial color={suit}/></mesh>
    <mesh position={[.46,1.6,0]} rotation={[0,0,.18]} castShadow><capsuleGeometry args={[.13,.66,4,8]}/><meshStandardMaterial color={suit}/></mesh>
    <mesh position={[-.2,.7,0]} castShadow><capsuleGeometry args={[.16,.68,4,8]}/><meshStandardMaterial color="#273447"/></mesh>
    <mesh position={[.2,.7,0]} castShadow><capsuleGeometry args={[.16,.68,4,8]}/><meshStandardMaterial color="#273447"/></mesh>
    <mesh position={[0,1.58,.34]}><boxGeometry args={[.3,.28,.05]}/><meshStandardMaterial color="#71d6e4" emissive={suit} emissiveIntensity={.25}/></mesh>
  </group></group>;
}

function Scene({season,skin,victory,quality}:Props) {
  const particles=quality==="low"?20:quality==="medium"?45:85;
  return <>
    <color attach="background" args={[season.sky]}/><fog attach="fog" args={[season.horizon,12,34]}/>
    <ambientLight intensity={quality==="low"?1.1:.75}/>
    <directionalLight position={[-5,9,6]} intensity={2.1} color="#fff0d8" castShadow shadow-mapSize={[quality==="high"?2048:1024,quality==="high"?2048:1024]}/>
    <pointLight position={[5,3,-4]} intensity={1.5} color={season.accent} distance={18}/>
    <hemisphereLight args={["#d7edff",season.ground,.55]}/>
    <Cloud position={[-8,5,-9]} speed={.1}/><Cloud position={[7,6,-11]} speed={.07}/><Cloud position={[1,4.4,-7]} speed={.15}/>
    <Island season={season}/><Avatar skin={skin} victory={victory}/>
    <mesh position={[0,-.12,1.2]} rotation={[-Math.PI/2,0,0]} receiveShadow><cylinderGeometry args={[1.55,1.75,.24,48]}/><meshStandardMaterial color="#1c2737" metalness={.72} roughness={.3}/></mesh>
    <mesh position={[0,.02,1.2]} rotation={[-Math.PI/2,0,0]}><torusGeometry args={[1.58,.035,8,64]}/><meshBasicMaterial color={season.accent}/></mesh>
    <Sparkles count={particles} scale={[13,7,12]} size={quality==="high"?3:2} speed={.25} color={season.accent} opacity={.75}/>
    <OrbitControls enablePan={false} enableZoom={false} minPolarAngle={Math.PI/2.8} maxPolarAngle={Math.PI/2.05} minAzimuthAngle={-.72} maxAzimuthAngle={.72} target={[0,1.5,0]}/>
  </>;
}

export default function LobbyScene(props:Props) {
  return <Canvas shadows={props.quality!=="low"} dpr={props.quality==="high"?[1,1.75]:props.quality==="medium"?[1,1.35]:1} camera={{position:[0,4.2,12.5],fov:43}} gl={{antialias:props.quality!=="low",powerPreference:"high-performance",alpha:false}}><Scene {...props}/></Canvas>;
}
