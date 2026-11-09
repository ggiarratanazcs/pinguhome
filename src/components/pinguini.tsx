import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * La famiglia di pinguini di PinguHome, disegnata in vettoriale:
 * stesso corpo, stesse guance e becco; cambiano accessori e posa.
 */

export type Posa = "saluto" | "carrello" | "scatola" | "stella" | "scontrino" | "chiave" | "riposo";
export type Look = "occhiali" | "sciarpa" | "cuffie" | "berretto" | "nudo";

const C = {
  piuma: "#1f2a4d",
  piumaOmbra: "#18213e",
  piumaLuce: "#2c3a66",
  pancia: "#f6f3ec",
  panciaOmbra: "#e7e1d4",
  becco: "#ff9f1c",
  beccoScuro: "#e0800a",
  lingua: "#f27a8e",
  guancia: "#f6a8b8",
  lente: "#14161f",
  zampe: "#ffa531",
};

function Pinna({ lato, alzata = false, avanti = false }: { lato: "sx" | "dx"; alzata?: boolean; avanti?: boolean }) {
  const sx = lato === "sx";
  if (alzata) {
    // Pinna alzata a salutare
    return sx ? (
      <ellipse cx="26" cy="96" rx="13" ry="30" fill={C.piuma} transform="rotate(35 26 96)" />
    ) : (
      <ellipse cx="174" cy="96" rx="13" ry="30" fill={C.piuma} transform="rotate(-35 174 96)" />
    );
  }
  if (avanti) {
    // Pinna piegata in avanti, a reggere qualcosa
    return sx ? (
      <ellipse cx="56" cy="152" rx="13" ry="28" fill={C.piumaLuce} transform="rotate(-58 56 152)" />
    ) : (
      <ellipse cx="144" cy="152" rx="13" ry="28" fill={C.piumaLuce} transform="rotate(58 144 152)" />
    );
  }
  return sx ? (
    <ellipse cx="30" cy="140" rx="13" ry="32" fill={C.piuma} transform="rotate(18 30 140)" />
  ) : (
    <ellipse cx="170" cy="140" rx="13" ry="32" fill={C.piuma} transform="rotate(-18 170 140)" />
  );
}

function Occhiali() {
  return (
    <g>
      <path d="M36 82 L50 80 M150 80 L164 82" stroke="#3a3d48" strokeWidth="5" strokeLinecap="round" />
      <rect x="47" y="66" width="52" height="36" rx="15" fill="#3a3d48" />
      <rect x="101" y="66" width="52" height="36" rx="15" fill="#3a3d48" />
      <rect x="51" y="70" width="44" height="28" rx="12" fill={C.lente} />
      <rect x="105" y="70" width="44" height="28" rx="12" fill={C.lente} />
      <rect x="94" y="74" width="12" height="6" rx="3" fill="#3a3d48" />
      <path d="M58 78 Q66 73 76 75" stroke="#fff" strokeOpacity=".5" strokeWidth="3.5" strokeLinecap="round" fill="none" />
      <path d="M112 78 Q120 73 130 75" stroke="#fff" strokeOpacity=".5" strokeWidth="3.5" strokeLinecap="round" fill="none" />
    </g>
  );
}

function OcchiFelici() {
  return (
    <g stroke={C.piuma} strokeWidth="4.5" strokeLinecap="round" fill="none">
      <path d="M64 88 Q74 78 84 88" />
      <path d="M116 88 Q126 78 136 88" />
    </g>
  );
}

function Sciarpa() {
  return (
    <g>
      <path d="M40 122 Q100 144 160 122 L162 138 Q100 158 38 138 Z" fill="#e2483d" />
      <path d="M128 134 L144 176 L126 178 L114 140 Z" fill="#c93a30" />
      <path d="M54 129 L54 142 M72 135 L72 148 M90 138 L90 151 M110 138 L110 151 M128 135 L128 148 M146 129 L146 142" stroke="#fff" strokeOpacity=".35" strokeWidth="3" />
    </g>
  );
}

function Cuffie() {
  return (
    <g>
      <path d="M34 96 Q34 22 100 22 Q166 22 166 96" stroke="#e2483d" strokeWidth="10" fill="none" strokeLinecap="round" />
      <rect x="20" y="82" width="26" height="38" rx="11" fill="#e2483d" />
      <rect x="154" y="82" width="26" height="38" rx="11" fill="#e2483d" />
    </g>
  );
}

function Berretto() {
  return (
    <g>
      <path d="M50 56 Q100 0 150 56 Z" fill="#ff9f1c" />
      <rect x="44" y="50" width="112" height="15" rx="7.5" fill="#f28a00" />
      <circle cx="100" cy="12" r="11" fill="#fff" />
    </g>
  );
}

/** Oggetti che il pinguino tiene o usa, a seconda della sezione. */
function Oggetto({ posa }: { posa: Posa }) {
  switch (posa) {
    case "carrello":
      return (
        <g transform="translate(122 140) scale(0.95)">
          <path d="M-2 0 L10 0 L20 40 L70 40" stroke="#5b6b8c" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M12 8 L78 8 L70 34 L20 34 Z" fill="#ff9f1c" stroke="#e0800a" strokeWidth="3" strokeLinejoin="round" />
          <path d="M30 8 L32 34 M46 8 L46 34 M62 8 L60 34" stroke="#e0800a" strokeWidth="2.5" />
          <rect x="22" y="-6" width="18" height="16" rx="3" fill="#7cc576" />
          <circle cx="44" cy="-2" r="9" fill="#e2483d" />
          <circle cx="28" cy="52" r="7" fill="#1f2a4d" />
          <circle cx="62" cy="52" r="7" fill="#1f2a4d" />
        </g>
      );
    case "scatola":
      return (
        <g transform="translate(62 132)">
          <path d="M0 14 L76 14 L76 66 L0 66 Z" fill="#d9a066" />
          <path d="M0 14 L38 2 L76 14 L38 26 Z" fill="#e8b57c" />
          <path d="M38 26 L38 66" stroke="#b9824c" strokeWidth="2.5" />
          <rect x="10" y="36" width="20" height="10" rx="2" fill="#fff" fillOpacity=".7" />
          <circle cx="58" cy="10" r="10" fill="#e2483d" />
          <path d="M58 0 Q62 -6 66 -4" stroke="#3d8b3d" strokeWidth="3" fill="none" strokeLinecap="round" />
        </g>
      );
    case "stella":
      return (
        <path
          d="M30 24 L38 42 L57 44 L43 57 L47 76 L30 66 L13 76 L17 57 L3 44 L22 42 Z"
          fill="#ffc83d"
          stroke="#e8a817"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      );
    case "scontrino":
      return (
        <g transform="translate(70 120) rotate(-6)">
          <path d="M0 0 L60 0 L60 70 L54 64 L48 70 L42 64 L36 70 L30 64 L24 70 L18 64 L12 70 L6 64 L0 70 Z" fill="#fff" stroke="#c9ced8" strokeWidth="2" strokeLinejoin="round" />
          <path d="M10 14 H50 M10 24 H42 M10 34 H48 M10 46 H30" stroke="#9aa3b5" strokeWidth="3" strokeLinecap="round" />
          <path d="M36 46 H50" stroke="#1f2a4d" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="64" cy="-4" r="14" fill="#ffc83d" stroke="#e8a817" strokeWidth="3" />
          <text x="64" y="1" textAnchor="middle" fontSize="15" fontWeight="700" fill="#b37d00" fontFamily="system-ui">€</text>
        </g>
      );
    case "chiave":
      return (
        <g transform="translate(176 44) rotate(28)">
          <rect x="-6" y="4" width="12" height="62" rx="6" fill="#aab2c4" stroke="#7d869b" strokeWidth="2.5" />
          <path d="M-17 -4 A19 19 0 1 0 17 -4 L9 0 L9 10 L-9 10 L-9 0 Z" fill="#aab2c4" stroke="#7d869b" strokeWidth="2.5" strokeLinejoin="round" />
        </g>
      );
    default:
      return null;
  }
}

export function PinguinoDisegnato({
  posa = "riposo",
  look = "occhiali",
  className,
  titolo,
}: {
  posa?: Posa;
  look?: Look;
  className?: string;
  titolo?: string;
}) {
  const reggeDavanti = posa === "scatola" || posa === "scontrino";
  const oggettoDietro = false;
  const contenuto: ReactNode = (
    <>
      {/* ombra a terra */}
      <ellipse cx="100" cy="212" rx="62" ry="6" fill={C.piuma} opacity=".12" />
      {oggettoDietro ? <Oggetto posa={posa} /> : null}
      {/* zampe */}
      <ellipse cx="78" cy="204" rx="19" ry="8" fill={C.zampe} />
      <ellipse cx="122" cy="204" rx="19" ry="8" fill={C.zampe} />
      {/* pinne dietro al corpo */}
      <Pinna lato="sx" alzata={posa === "stella"} />
      <Pinna lato="dx" alzata={posa === "saluto" || posa === "chiave"} />
      {/* corpo */}
      <path d="M100 26 C46 26 26 76 26 128 C26 178 58 206 100 206 C142 206 174 178 174 128 C174 76 154 26 100 26 Z" fill={C.piuma} />
      <path d="M146 44 C166 70 174 100 174 128 C174 178 142 206 100 206 C136 198 160 168 160 126 C160 92 156 66 146 44 Z" fill={C.piumaOmbra} />
      {/* ciuffo */}
      <path d="M88 30 Q90 8 103 19 Q110 4 118 26" stroke={C.piuma} strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* pancia e viso */}
      <ellipse cx="100" cy="164" rx="50" ry="40" fill={C.pancia} />
      <path d="M100 172 C124 172 142 182 144 190 C134 200 118 204 100 204 C82 204 66 200 56 190 C58 182 76 172 100 172 Z" fill={C.panciaOmbra} opacity=".6" />
      <path d="M100 58 C78 40 40 50 42 88 C43 114 68 128 100 128 C132 128 157 114 158 88 C160 50 122 40 100 58 Z" fill={C.pancia} />
      {/* guance */}
      <ellipse cx="60" cy="110" rx="10" ry="5.5" fill={C.guancia} opacity=".75" />
      <ellipse cx="140" cy="110" rx="10" ry="5.5" fill={C.guancia} opacity=".75" />
      {/* occhi */}
      {look === "occhiali" ? <Occhiali /> : <OcchiFelici />}
      {/* becco con bocca aperta */}
      <path d="M84 104 Q100 96 116 104 Q111 124 100 125 Q89 124 84 104 Z" fill={C.becco} />
      <path d="M89 110 Q100 118 111 110 Q107 121 100 122 Q93 121 89 110 Z" fill="#b84a3a" />
      <ellipse cx="100" cy="118" rx="5.5" ry="3.2" fill={C.lingua} />
      <path d="M84 104 Q100 96 116 104" stroke={C.beccoScuro} strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* accessori */}
      {look === "sciarpa" ? <Sciarpa /> : null}
      {look === "cuffie" ? <Cuffie /> : null}
      {look === "berretto" ? <Berretto /> : null}
      {/* oggetto davanti e pinne che lo reggono */}
      {!oggettoDietro ? <Oggetto posa={posa} /> : null}
      {reggeDavanti ? (
        <>
          <Pinna lato="sx" avanti />
          <Pinna lato="dx" avanti />
        </>
      ) : null}
    </>
  );
  return (
    <svg viewBox="-6 -4 222 228" role={titolo ? "img" : undefined} aria-label={titolo} aria-hidden={titolo ? undefined : true} className={cn("h-auto shrink-0", className)}>
      {contenuto}
    </svg>
  );
}
