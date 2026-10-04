import React from 'react';

export function PdamSceneBg() {
  return (
    <>
      <svg
        className="scene fixed inset-0 w-full h-full object-cover pointer-events-none select-none z-0"
        viewBox="0 0 1600 900"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#0f3552" />
            <stop offset=".55" stopColor="#2d7f9d" />
            <stop offset="1" stopColor="#f6c777" />
          </linearGradient>
          <linearGradient id="soil" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4a3424" />
            <stop offset="1" stopColor="#2a1d14" />
          </linearGradient>
          <radialGradient id="sun">
            <stop offset="0" stopColor="#fff1c4" />
            <stop offset=".35" stopColor="#ffd98e" />
            <stop offset="1" stopColor="#ffd98e" stopOpacity="0" />
          </radialGradient>
          <g id="w">
            <rect x="-12" y="-38" width="10" height="38" rx="3" fill="#1f2f39" />
            <rect x="2" y="-38" width="10" height="38" rx="3" fill="#1f2f39" />
            <rect x="-16" y="-4" width="14" height="5" rx="2" fill="#111" />
            <rect x="2" y="-4" width="14" height="5" rx="2" fill="#111" />
            <rect x="-15" y="-80" width="30" height="46" rx="7" fill="currentColor" />
            <rect x="-15" y="-58" width="30" height="5" fill="#e6f08a" />
            <circle cy="-94" r="11" fill="#c68a5e" />
            <path d="M-13-96a13 13 0 0126 0z" fill="#ff8a1f" />
            <rect x="-16" y="-97" width="32" height="4" rx="2" fill="#ff8a1f" />
          </g>
          <g id="lg">
            <rect x="-12" y="-38" width="10" height="38" rx="3" fill="#1f2f39" />
            <rect x="2" y="-38" width="10" height="38" rx="3" fill="#1f2f39" />
            <rect x="-16" y="-4" width="14" height="5" rx="2" fill="#111" />
            <rect x="2" y="-4" width="14" height="5" rx="2" fill="#111" />
          </g>
          <g id="tp">
            <rect x="-15" y="-80" width="30" height="46" rx="7" fill="currentColor" />
            <rect x="-15" y="-80" width="30" height="46" rx="7" fill="url(#shd)" />
            <circle cy="-94" r="11" fill="#c68a5e" />
          </g>
          <g id="tr">
            <use href="#tp" />
            <rect x="-15" y="-58" width="30" height="5" fill="#e6f08a" />
            <path d="M-13-96a13 13 0 0126 0z" fill="#ff8a1f" />
            <rect x="-16" y="-97" width="32" height="4" rx="2" fill="#ff8a1f" />
          </g>
          <linearGradient id="m1" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4690ab" />
            <stop offset="1" stopColor="#1c4a66" />
          </linearGradient>
          <linearGradient id="m2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2f8590" />
            <stop offset="1" stopColor="#1d5a62" />
          </linearGradient>
          <linearGradient id="m3" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4aa96a" />
            <stop offset="1" stopColor="#2b6b4f" />
          </linearGradient>
          <linearGradient id="mist" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffe0a8" stopOpacity="0" />
            <stop offset="1" stopColor="#ffe0a8" stopOpacity=".4" />
          </linearGradient>
          <linearGradient id="roofg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#d0643f" />
            <stop offset="1" stopColor="#8f3524" />
          </linearGradient>
          <linearGradient id="glass" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffe9a8" />
            <stop offset="1" stopColor="#f0a93a" />
          </linearGradient>
          <linearGradient id="tankg" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#6cc4f2" />
            <stop offset=".5" stopColor="#2f93d0" />
            <stop offset="1" stopColor="#1a5f90" />
          </linearGradient>
          <linearGradient id="tb" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#58bdf2" />
            <stop offset=".6" stopColor="#1e88c7" />
            <stop offset="1" stopColor="#14608f" />
          </linearGradient>
          <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#bccbd2" />
          </linearGradient>
          <linearGradient id="roadg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#4a555c" />
            <stop offset="1" stopColor="#2b363d" />
          </linearGradient>
          <linearGradient id="pav" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#8b9aa1" />
            <stop offset="1" stopColor="#5c6b73" />
          </linearGradient>
          <radialGradient id="lampg">
            <stop offset="0" stopColor="#fff0b0" stopOpacity=".85" />
            <stop offset="1" stopColor="#fff0b0" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="warm" cx=".27" cy=".58" r=".8">
            <stop offset="0" stopColor="#ff9a3c" stopOpacity=".5" />
            <stop offset=".5" stopColor="#ff9a3c" stopOpacity=".12" />
            <stop offset="1" stopColor="#ff9a3c" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="shd" x1="0" y1="0" x2="1" y2="0">
            <stop offset=".35" stopColor="#000" stopOpacity="0" />
            <stop offset="1" stopColor="#000" stopOpacity=".32" />
          </linearGradient>
        </defs>

        {/* Sky & Sun */}
        <rect width="1600" height="900" fill="url(#sky)" />
        <circle className="glow" cx="430" cy="520" r="230" fill="url(#sun)" />
        <circle cx="430" cy="520" r="62" fill="#fff0c2" />

        {/* Mountains */}
        <path d="M0 640V560l170-80 150 50 190-150 140-100 70 30 150 140 170 50 160-70 200 60 200-40v240z" fill="url(#m1)" />
        <path d="M640 300L520 380L548 410L610 350L626 392z" fill="#ffd9a0" opacity=".3" />
        <path d="M640 300L720 330L860 470L760 430z" fill="#0f2f45" opacity=".38" />
        <rect y="500" width="1600" height="140" fill="url(#mist)" />
        <path d="M0 640V600l230-60 190 40 230-90 190 60 250-30 260 50 250-20v90z" fill="url(#m2)" />
        <path d="M0 640V612q200-34 420-8t480-6 400 8 300-10v36z" fill="url(#m3)" />

        <g fill="none" stroke="#fff" strokeOpacity=".14" strokeWidth="2">
          <path d="M0 622q200-30 420-6t480-6 400 6 300-8" />
          <path d="M0 632q200-26 420-4t480-5 400 5 300-6" />
        </g>
        <rect y="628" width="1600" height="14" fill="#2e6b52" />

        {/* Swaying Palm Trees */}
        <g transform="translate(14 632) scale(1 1)">
          <g className="sway" style={{ animationDuration: '6.5s' }}>
            <path d="M0 0Q4-82 14-150" stroke="#6a4e33" strokeWidth="9" fill="none" strokeLinecap="round" />
            <path d="M0 0Q4-82 14-150" stroke="#3e2d1e" strokeWidth="9" fill="none" strokeDasharray="2 8" opacity=".5" />
            <g transform="translate(14 -150)">
              <g className="frond">
                <path transform="rotate(-100)" d="M0 0C22-26 62-28 94 8C60-8 26-8 0 0z" fill="#2f8a57" />
                <path transform="rotate(-38)" d="M0 0C22-26 62-28 94 8C60-8 26-8 0 0z" fill="#3aa066" />
                <path transform="rotate(-10)" d="M0 0C22-26 62-28 94 8C60-8 26-8 0 0z" fill="#2f8a57" />
                <path transform="rotate(22)" d="M0 0C22-26 62-28 94 8C60-8 26-8 0 0z" fill="#3aa066" />
                <path transform="rotate(150)" d="M0 0C22-26 62-28 94 8C60-8 26-8 0 0z" fill="#2f8a57" />
                <path transform="rotate(190)" d="M0 0C22-26 62-28 94 8C60-8 26-8 0 0z" fill="#3aa066" />
                <path transform="rotate(218)" d="M0 0C22-26 62-28 94 8C60-8 26-8 0 0z" fill="#2a7b4d" />
                <circle cx="-4" cy="6" r="5" fill="#7a5a2c" />
                <circle cx="5" cy="8" r="5" fill="#8a6a35" />
              </g>
            </g>
          </g>
        </g>

        <g transform="translate(392 632) scale(1 1)">
          <g className="sway" style={{ animationDuration: '6s' }}>
            <path d="M0 0Q4-88 14-160" stroke="#6a4e33" strokeWidth="9" fill="none" strokeLinecap="round" />
            <path d="M0 0Q4-88 14-160" stroke="#3e2d1e" strokeWidth="9" fill="none" strokeDasharray="2 8" opacity=".5" />
            <g transform="translate(14 -160)">
              <g className="frond">
                <path transform="rotate(-100)" d="M0 0C22-26 62-28 94 8C60-8 26-8 0 0z" fill="#2f8a57" />
                <path transform="rotate(-38)" d="M0 0C22-26 62-28 94 8C60-8 26-8 0 0z" fill="#3aa066" />
                <path transform="rotate(-10)" d="M0 0C22-26 62-28 94 8C60-8 26-8 0 0z" fill="#2f8a57" />
                <path transform="rotate(22)" d="M0 0C22-26 62-28 94 8C60-8 26-8 0 0z" fill="#3aa066" />
                <path transform="rotate(150)" d="M0 0C22-26 62-28 94 8C60-8 26-8 0 0z" fill="#2f8a57" />
                <path transform="rotate(190)" d="M0 0C22-26 62-28 94 8C60-8 26-8 0 0z" fill="#3aa066" />
                <path transform="rotate(218)" d="M0 0C22-26 62-28 94 8C60-8 26-8 0 0z" fill="#2a7b4d" />
                <circle cx="-4" cy="6" r="5" fill="#7a5a2c" />
                <circle cx="5" cy="8" r="5" fill="#8a6a35" />
              </g>
            </g>
          </g>
        </g>

        <g transform="translate(1240 632) scale(-1 1)">
          <g className="sway" style={{ animationDuration: '7s' }}>
            <path d="M0 0Q4-95 14-172" stroke="#6a4e33" strokeWidth="9" fill="none" strokeLinecap="round" />
            <path d="M0 0Q4-95 14-172" stroke="#3e2d1e" strokeWidth="9" fill="none" strokeDasharray="2 8" opacity=".5" />
            <g transform="translate(14 -172)">
              <g className="frond">
                <path transform="rotate(-100)" d="M0 0C22-26 62-28 94 8C60-8 26-8 0 0z" fill="#2f8a57" />
                <path transform="rotate(-38)" d="M0 0C22-26 62-28 94 8C60-8 26-8 0 0z" fill="#3aa066" />
                <path transform="rotate(-10)" d="M0 0C22-26 62-28 94 8C60-8 26-8 0 0z" fill="#2f8a57" />
                <path transform="rotate(22)" d="M0 0C22-26 62-28 94 8C60-8 26-8 0 0z" fill="#3aa066" />
                <path transform="rotate(150)" d="M0 0C22-26 62-28 94 8C60-8 26-8 0 0z" fill="#2f8a57" />
                <path transform="rotate(190)" d="M0 0C22-26 62-28 94 8C60-8 26-8 0 0z" fill="#3aa066" />
                <path transform="rotate(218)" d="M0 0C22-26 62-28 94 8C60-8 26-8 0 0z" fill="#2a7b4d" />
                <circle cx="-4" cy="6" r="5" fill="#7a5a2c" />
                <circle cx="5" cy="8" r="5" fill="#8a6a35" />
              </g>
            </g>
          </g>
        </g>

        <g transform="translate(1480 632) scale(1 1)">
          <g className="sway" style={{ animationDuration: '5.5s' }}>
            <path d="M0 0Q4-76 14-138" stroke="#6a4e33" strokeWidth="9" fill="none" strokeLinecap="round" />
            <path d="M0 0Q4-76 14-138" stroke="#3e2d1e" strokeWidth="9" fill="none" strokeDasharray="2 8" opacity=".5" />
            <g transform="translate(14 -138)">
              <g className="frond">
                <path transform="rotate(-100)" d="M0 0C22-26 62-28 94 8C60-8 26-8 0 0z" fill="#2f8a57" />
                <path transform="rotate(-38)" d="M0 0C22-26 62-28 94 8C60-8 26-8 0 0z" fill="#3aa066" />
                <path transform="rotate(-10)" d="M0 0C22-26 62-28 94 8C60-8 26-8 0 0z" fill="#2f8a57" />
                <path transform="rotate(22)" d="M0 0C22-26 62-28 94 8C60-8 26-8 0 0z" fill="#3aa066" />
                <path transform="rotate(150)" d="M0 0C22-26 62-28 94 8C60-8 26-8 0 0z" fill="#2f8a57" />
                <path transform="rotate(190)" d="M0 0C22-26 62-28 94 8C60-8 26-8 0 0z" fill="#3aa066" />
                <path transform="rotate(218)" d="M0 0C22-26 62-28 94 8C60-8 26-8 0 0z" fill="#2a7b4d" />
                <circle cx="-4" cy="6" r="5" fill="#7a5a2c" />
                <circle cx="5" cy="8" r="5" fill="#8a6a35" />
              </g>
            </g>
          </g>
        </g>

        {/* Houses & Buildings */}
        <g>
          <rect x="50" y="556" width="130" height="76" fill="#efe3cc" />
          <rect x="164" y="556" width="16" height="76" fill="#000" opacity=".15" />
          <path d="M36 558L115.0 506L194 558z" fill="url(#roofg)" />
          <path d="M115.0 506L194 558H115.0z" fill="#000" opacity=".18" />
          <path d="M102 515H128" stroke="#000" strokeOpacity=".16" strokeWidth="2" />
          <path d="M89 523H141" stroke="#000" strokeOpacity=".16" strokeWidth="2" />
          <path d="M76 532H154" stroke="#000" strokeOpacity=".16" strokeWidth="2" />
          <path d="M62 541H168" stroke="#000" strokeOpacity=".16" strokeWidth="2" />
          <path d="M49 549H181" stroke="#000" strokeOpacity=".16" strokeWidth="2" />
          <rect x="36" y="558" width="158" height="7" fill="#000" opacity=".22" />
          <rect x="63" y="575" width="30" height="32" rx="2" fill="#6b4a33" />
          <rect className="win" x="66" y="578" width="24" height="26" fill="url(#glass)" />
          <path d="M78.0 578V604M66 591.0H90" stroke="#6b4a33" strokeWidth="2" />
          <rect x="60" y="607" width="36" height="4" fill="#000" opacity=".25" />
          <rect x="135" y="575" width="30" height="32" rx="2" fill="#6b4a33" />
          <rect className="win" x="138" y="578" width="24" height="26" fill="url(#glass)" />
          <path d="M150.0 578V604M138 591.0H162" stroke="#6b4a33" strokeWidth="2" />
          <rect x="132" y="607" width="36" height="4" fill="#000" opacity=".25" />
          <rect x="104" y="596" width="22" height="36" rx="2" fill="#6b4a33" />
          <circle cx="121" cy="618" r="1.8" fill="#ffd36b" />
          <rect x="100" y="628" width="30" height="5" fill="#9aa7ae" />
        </g>

        <g>
          <rect x="210" y="540" width="140" height="92" fill="#d5e4df" />
          <rect x="334" y="540" width="16" height="92" fill="#000" opacity=".15" />
          <path d="M196 542L280.0 488L364 542z" fill="url(#roofg)" />
          <path d="M280.0 488L364 542H280.0z" fill="#000" opacity=".18" />
          <path d="M266 497H294" stroke="#000" strokeOpacity=".16" strokeWidth="2" />
          <path d="M252 506H308" stroke="#000" strokeOpacity=".16" strokeWidth="2" />
          <path d="M238 515H322" stroke="#000" strokeOpacity=".16" strokeWidth="2" />
          <path d="M224 524H336" stroke="#000" strokeOpacity=".16" strokeWidth="2" />
          <path d="M210 533H350" stroke="#000" strokeOpacity=".16" strokeWidth="2" />
          <rect x="196" y="542" width="168" height="7" fill="#000" opacity=".22" />
          <rect x="225" y="563" width="30" height="32" rx="2" fill="#6b4a33" />
          <rect className="win" x="228" y="566" width="24" height="26" fill="url(#glass)" />
          <path d="M240.0 566V592M228 579.0H252" stroke="#6b4a33" strokeWidth="2" />
          <rect x="222" y="595" width="36" height="4" fill="#000" opacity=".25" />
          <rect x="299" y="563" width="30" height="32" rx="2" fill="#6b4a33" />
          <rect className="win" x="302" y="566" width="24" height="26" fill="url(#glass)" />
          <path d="M314.0 566V592M302 579.0H326" stroke="#6b4a33" strokeWidth="2" />
          <rect x="296" y="595" width="36" height="4" fill="#000" opacity=".25" />
          <rect x="262" y="596" width="22" height="36" rx="2" fill="#6b4a33" />
          <circle cx="279" cy="618" r="1.8" fill="#ffd36b" />
          <rect x="258" y="628" width="30" height="5" fill="#9aa7ae" />
        </g>

        {/* Water Tank */}
        <g>
          <rect x="318" y="470" width="34" height="40" rx="7" fill="url(#tankg)" />
          <ellipse cx="335" cy="471" rx="17" ry="4" fill="#9fdcfa" />
          <path d="M318 484H352M318 497H352" stroke="#0f4f78" strokeOpacity=".5" strokeWidth="2" />
          <rect x="323" y="508" width="3" height="32" fill="#6b7c86" />
          <rect x="344" y="508" width="3" height="32" fill="#6b7c86" />
        </g>

        {/* Plants & Pavement */}
        <g fill="#2e7d4f">
          <circle cx="40" cy="630" r="10" />
          <circle cx="196" cy="630" r="12" />
          <circle cx="362" cy="631" r="9" />
        </g>
        <rect y="640" width="1600" height="22" fill="url(#pav)" />
        <path d="M0 641H1600" stroke="#b9c6cc" strokeWidth="2" />
        <path
          d="M30 641V662M100 641V662M170 641V662M240 641V662M310 641V662M380 641V662M450 641V662M520 641V662M590 641V662M660 641V662M730 641V662M800 641V662M870 641V662M940 641V662M1010 641V662M1080 641V662M1150 641V662M1220 641V662M1290 641V662M1360 641V662M1430 641V662M1500 641V662M1570 641V662"
          stroke="#000"
          strokeOpacity=".16"
        />

        {/* Road & Streetlights */}
        <rect y="662" width="1600" height="38" fill="url(#roadg)" />
        <path d="M0 664H1600" stroke="#e8e8e8" strokeOpacity=".35" strokeWidth="2" />
        <ellipse cx="430" cy="682" rx="300" ry="9" fill="#ffd9a0" opacity=".14" />
        <path d="M0 682H1600" stroke="#e8d27a" strokeWidth="3" strokeDasharray="26 22" opacity=".7" />
        <path d="M180 700l30-14 20 8M1300 698l22-10 30 6" stroke="#111" strokeOpacity=".35" fill="none" />

        <rect x="717" y="544" width="6" height="118" fill="#3d4a52" />
        <path d="M720 548H746" stroke="#3d4a52" strokeWidth="5" strokeLinecap="round" />
        <rect x="736" y="548" width="22" height="7" rx="3" fill="#2a343a" />
        <circle className="lamp" cx="747" cy="560" r="46" fill="url(#lampg)" />
        <rect x="713" y="656" width="14" height="6" fill="#2a343a" />

        <rect x="1212" y="544" width="6" height="118" fill="#3d4a52" />
        <path d="M1215 548H1241" stroke="#3d4a52" strokeWidth="5" strokeLinecap="round" />
        <rect x="1231" y="548" width="22" height="7" rx="3" fill="#2a343a" />
        <circle className="lamp" cx="1242" cy="560" r="46" fill="url(#lampg)" />
        <rect x="1208" y="656" width="14" height="6" fill="#2a343a" />

        <rect x="1497" y="544" width="6" height="118" fill="#3d4a52" />
        <path d="M1500 548H1526" stroke="#3d4a52" strokeWidth="5" strokeLinecap="round" />
        <rect x="1516" y="548" width="22" height="7" rx="3" fill="#2a343a" />
        <circle className="lamp" cx="1527" cy="560" r="46" fill="url(#lampg)" />
        <rect x="1493" y="656" width="14" height="6" fill="#2a343a" />

        {/* Soil & Underground */}
        <rect y="700" width="1600" height="200" fill="url(#soil)" />
        <g fill="#5d4532">
          <ellipse cx="120" cy="760" rx="26" ry="12" />
          <ellipse cx="330" cy="880" rx="34" ry="11" />
          <ellipse cx="700" cy="745" rx="22" ry="10" />
          <ellipse cx="1240" cy="770" rx="30" ry="12" />
          <ellipse cx="1480" cy="868" rx="26" ry="10" />
          <ellipse cx="1120" cy="885" rx="22" ry="8" />
        </g>

        {/* Water Pipe System */}
        <g fill="#4d606b" stroke="#2c3a42" strokeWidth="2">
          <rect x="-4" y="822" width="1608" height="36" />
          <rect x="112" y="632" width="14" height="190" />
          <rect x="266" y="632" width="14" height="190" />
          <rect x="534" y="662" width="14" height="160" />
          <rect x="326" y="540" width="12" height="282" />
        </g>
        <rect x="0" y="828" width="1600" height="5" fill="#7b909b" opacity=".7" />

        {/* Animated Water Flow in Pipes */}
        <g fill="none" stroke="#6fd3ff" strokeWidth="6" strokeLinecap="round" opacity=".85">
          <path className="flow" d="M-20 840H1620" />
          <path className="flow" d="M119 822V640" />
          <path className="flow" d="M273 822V640" />
          <path className="flow" d="M541 822V664" />
          <path className="flow" d="M332 822V540" />
        </g>

        {/* Excavation Trench */}
        <rect x="790" y="662" width="240" height="160" fill="#241810" />
        <path d="M790 662v160M1030 662v160" stroke="#6b4a33" strokeWidth="5" />
        <path d="M800 700h18M800 740h18M800 780h18M800 700v82M818 700v82" stroke="#c9a46a" strokeWidth="3" fill="none" opacity=".9" />
        <rect x="780" y="624" width="260" height="14" fill="#fff" stroke="#c62828" strokeWidth="0" />
        <path
          d="M792 624l14 14h-14zM820 624h14l-14 14h-14zM848 624h14l-14 14h-14zM876 624h14l-14 14h-14zM904 624h14l-14 14h-14zM932 624h14l-14 14h-14zM960 624h14l-14 14h-14zM988 624h14l-14 14h-14zM1016 624h14l-14 14h-14z"
          fill="#e33"
        />
        <g>
          <path d="M746 662l10-34 10 34z" fill="#ff7a1a" />
          <rect x="742" y="660" width="28" height="5" fill="#222" />
          <path d="M1054 662l10-34 10 34z" fill="#ff7a1a" />
          <rect x="1050" y="660" width="28" height="5" fill="#222" />
        </g>

        {/* Leak & Water Spray */}
        <ellipse className="pud" cx="960" cy="822" rx="42" ry="5" fill="#6fd3ff" opacity=".8" />
        <rect x="954" y="820" width="12" height="4" fill="#12202a" />
        <g fill="#9be3ff">
          <circle className="sp" style={{ ['--x' as string]: '-70px', animationDelay: '0s' }} cx="960" cy="818" r="4" />
          <circle className="sp" style={{ ['--x' as string]: '-34px', animationDelay: '.18s' }} cx="960" cy="818" r="3.5" />
          <circle className="sp" style={{ ['--x' as string]: '18px', animationDelay: '.36s' }} cx="960" cy="818" r="4" />
          <circle className="sp" style={{ ['--x' as string]: '52px', animationDelay: '.54s' }} cx="960" cy="818" r="3.5" />
          <circle className="sp" style={{ ['--x' as string]: '86px', animationDelay: '.72s' }} cx="960" cy="818" r="4" />
          <circle className="sp" style={{ ['--x' as string]: '-12px', animationDelay: '.9s' }} cx="960" cy="818" r="3" />
        </g>

        {/* Mist & Birds Flying */}
        <g fill="#fff" opacity=".1">
          <ellipse className="mist" cx="0" cy="634" rx="280" ry="13" />
          <ellipse className="mist" style={{ animationDelay: '-35s' }} cx="0" cy="622" rx="200" ry="10" />
        </g>
        <g className="bd" style={{ animationDelay: '0s', animationDuration: '28s' }} transform="translate(0 230)">
          <g fill="none" stroke="#12303f" strokeWidth="2.2" strokeLinecap="round">
            <path className="wg" d="M-9 0Q-4.5-7 0 0Q4.5-7 9 0" />
          </g>
        </g>
        <g className="bd" style={{ animationDelay: '-9s', animationDuration: '34s' }} transform="translate(0 185)">
          <g fill="none" stroke="#12303f" strokeWidth="2.2" strokeLinecap="round">
            <path className="wg" d="M-9 0Q-4.5-7 0 0Q4.5-7 9 0" />
          </g>
        </g>
        <g className="bd" style={{ animationDelay: '-15s', animationDuration: '31s' }} transform="translate(0 260)">
          <g fill="none" stroke="#12303f" strokeWidth="2.2" strokeLinecap="round">
            <path className="wg" d="M-9 0Q-4.5-7 0 0Q4.5-7 9 0" />
          </g>
        </g>

        {/* Worker in Trench */}
        <g transform="translate(895 822) scale(1 1)" color="#1f78b4">
          <ellipse cy="1" rx="21" ry="4" fill="#000" opacity=".28" />
          <g className="">
            <use href="#lg" />
            <g className="ln lh">
              <use href="#tr" />
              <g transform="translate(0 -72)">
                <g className="hU">
                  <rect x="-4" y="0" width="8" height="18" rx="4" fill="currentColor" />
                  <g transform="translate(0 17)">
                    <g className="hF">
                      <rect x="-3.5" y="0" width="7" height="17" rx="3.5" fill="currentColor" />
                      <circle cy="18" r="5" fill="#c68a5e" />
                      <rect x="-2.5" y="16" width="5" height="26" fill="#c3ced5" />
                      <circle cy="46" r="7" fill="none" stroke="#c3ced5" strokeWidth="4.5" />
                    </g>
                  </g>
                </g>
              </g>
            </g>
          </g>
        </g>

        {/* Sparks */}
        <g fill="#ffe27a">
          <circle className="spk" cx="962" cy="812" r="4" />
          <circle className="spk" cx="972" cy="805" r="2.5" />
          <circle className="spk" cx="953" cy="807" r="2.5" />
        </g>

        {/* Field Worker 2 */}
        <g transform="translate(1130 662) scale(1 1)" color="#1f78b4">
          <ellipse cy="1" rx="21" ry="4" fill="#000" opacity=".28" />
          <g className="idle">
            <use href="#lg" />
            <g className="ln ls">
              <use href="#tr" />
              <g transform="translate(0 -72)">
                <g className="sU">
                  <rect x="-4" y="0" width="8" height="18" rx="4" fill="currentColor" />
                  <g transform="translate(0 17)">
                    <g className="sF">
                      <rect x="-3.5" y="0" width="7" height="17" rx="3.5" fill="currentColor" />
                      <circle cy="18" r="5" fill="#c68a5e" />
                    </g>
                  </g>
                </g>
              </g>
            </g>
          </g>
        </g>

        {/* Public Tap / Filling Water */}
        <rect x="534" y="592" width="14" height="70" rx="3" fill="#6b7c86" />
        <path d="M541 600H572" stroke="#6b7c86" strokeWidth="7" strokeLinecap="round" />
        <circle cx="541" cy="590" r="9" fill="#3b9ad6" />
        <path className="stream" d="M572 604V650" stroke="#8fdcff" strokeWidth="4" />
        <rect x="558" y="640" width="26" height="22" rx="3" fill="rgba(224,83,61,.35)" stroke="#e0533d" strokeWidth="3" />
        <rect className="fillw" x="561" y="643" width="20" height="17" fill="#6fd3ff" />

        {/* Resident with Water Canister */}
        <g transform="translate(470 662) scale(1 1)" color="#1f78b4">
          <ellipse cy="1" rx="21" ry="4" fill="#000" opacity=".28" />
          <g className="idle">
            <use href="#lg" />
            <g className="ln ld">
              <use href="#tr" />
              <g transform="translate(0 -72)">
                <g className="dU">
                  <rect x="-4" y="0" width="8" height="18" rx="4" fill="currentColor" />
                  <g transform="translate(0 17)">
                    <g className="dF">
                      <rect x="-3.5" y="0" width="7" height="17" rx="3.5" fill="currentColor" />
                      <circle cy="18" r="5" fill="#c68a5e" />
                      <rect x="-9" y="14" width="18" height="24" rx="4" fill="#3ab0e8" />
                      <rect x="-4" y="10" width="8" height="6" fill="#1d6f99" />
                    </g>
                  </g>
                </g>
              </g>
            </g>
          </g>
        </g>

        {/* Resident Mother & Child */}
        <g transform="translate(626 662) scale(-1 1)" color="#c2557a">
          <ellipse cy="1" rx="21" ry="4" fill="#000" opacity=".28" />
          <g className="idle">
            <use href="#lg" />
            <g className="ln ">
              <use href="#tp" />
              <path d="M-13-96a13 13 0 0126 0v18h-26z" fill="#f2e3ef" />
              <circle cy="-92" r="9" fill="#c68a5e" />
              <g transform="translate(0 -72)">
                <g className="iU">
                  <rect x="-4" y="0" width="8" height="18" rx="4" fill="currentColor" />
                  <g transform="translate(0 17)">
                    <g className="iF">
                      <rect x="-3.5" y="0" width="7" height="17" rx="3.5" fill="currentColor" />
                      <circle cy="18" r="5" fill="#c68a5e" />
                    </g>
                  </g>
                </g>
              </g>
            </g>
          </g>
        </g>

        <g transform="translate(676 662) scale(0.62 0.62)" color="#f2b84b">
          <ellipse cy="1" rx="21" ry="4" fill="#000" opacity=".28" />
          <g className="jump">
            <use href="#lg" />
            <g className="ln ">
              <use href="#tp" />
              <path d="M-12-98a12 12 0 0124 0z" fill="#222" />
              <g transform="translate(0 -72)">
                <g className="sU">
                  <rect x="-4" y="0" width="8" height="18" rx="4" fill="currentColor" />
                  <g transform="translate(0 17)">
                    <g className="sF">
                      <rect x="-3.5" y="0" width="7" height="17" rx="3.5" fill="currentColor" />
                      <circle cy="18" r="5" fill="#c68a5e" />
                    </g>
                  </g>
                </g>
              </g>
            </g>
          </g>
        </g>

        {/* Walking Technician Carrying Pipe */}
        <g transform="translate(0 662)">
          <g className="walk">
            <g transform="translate(0 0) scale(1 1)" color="#1f78b4">
              <ellipse cy="1" rx="21" ry="4" fill="#000" opacity=".28" />
              <g>
                <g transform="translate(-6 -38)">
                  <g className="lgA" style={{ animationDelay: '0s' }}>
                    <rect x="-5" y="0" width="10" height="38" rx="3" fill="#1f2f39" />
                    <rect x="-6" y="34" width="14" height="5" rx="2" fill="#111" />
                  </g>
                </g>
                <g transform="translate(6 -38)">
                  <g className="lgA" style={{ animationDelay: '-.8s' }}>
                    <rect x="-5" y="0" width="10" height="38" rx="3" fill="#1f2f39" />
                    <rect x="-6" y="34" width="14" height="5" rx="2" fill="#111" />
                  </g>
                </g>
                <g className="ln lw">
                  <use href="#tr" />
                  <rect x="-44" y="-87" width="100" height="9" rx="3" fill="#8b9aa4" />
                  <rect x="-44" y="-87" width="6" height="9" fill="#ff8a1f" />
                  <rect x="50" y="-87" width="6" height="9" fill="#ff8a1f" />
                  <g transform="translate(0 -72)">
                    <g className="wU">
                      <rect x="-4" y="0" width="8" height="18" rx="4" fill="currentColor" />
                      <g transform="translate(0 17)">
                        <g className="wF">
                          <rect x="-3.5" y="0" width="7" height="17" rx="3.5" fill="currentColor" />
                          <circle cy="18" r="5" fill="#c68a5e" />
                        </g>
                      </g>
                    </g>
                  </g>
                </g>
              </g>
            </g>
          </g>
        </g>

        {/* Passing Motorbike with Technician */}
        <g transform="translate(0 678)">
          <g className="bike2">
            <g transform="scale(-1 1)">
              <ellipse cx="24" cy="1" rx="42" ry="3" fill="#000" opacity=".3" />
              <path d="M56-34L130-24V-10L56-30z" fill="#fff3b0" opacity=".2" />
              <g transform="translate(0 -11)">
                <g className="wh" style={{ animationDuration: '.3s' }}>
                  <circle r="11" fill="#1a1f23" />
                  <circle r="9.5" fill="none" stroke="#3a444b" strokeWidth="2.5" strokeDasharray="3 3" />
                  <path d="M-8 0H8M0-8V8" stroke="#b8c4cc" strokeWidth="1.5" />
                </g>
              </g>
              <g transform="translate(48 -11)">
                <g className="wh" style={{ animationDuration: '.3s' }}>
                  <circle r="11" fill="#1a1f23" />
                  <circle r="9.5" fill="none" stroke="#3a444b" strokeWidth="2.5" strokeDasharray="3 3" />
                  <path d="M-8 0H8M0-8V8" stroke="#b8c4cc" strokeWidth="1.5" />
                </g>
              </g>
              <path d="M0-11L20-22H38L48-11M20-22L26-34H40M44-30L50-40H56" stroke="#222" strokeWidth="3.5" fill="none" strokeLinejoin="round" />
              <path d="M16-30Q30-42 44-30L40-22H22z" fill="#ff8a1f" />
              <rect x="8" y="-33" width="18" height="5" rx="2" fill="#222" />
              <rect x="4" y="-14" width="18" height="4" fill="#888" />
              <circle cx="53" cy="-37" r="4" fill="#fff3b0" />
              <g className="rid">
                <path d="M18-34L31-18L25-8" stroke="#1f2f39" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                <rect x="12" y="-62" width="16" height="28" rx="6" fill="#1f78b4" transform="rotate(14 20 -34)" />
                <path d="M26-54L48-41" stroke="#1f78b4" strokeWidth="6" strokeLinecap="round" />
                <circle cx="31" cy="-68" r="8" fill="#c68a5e" />
                <path d="M23-70a8 8 0 0116 0z" fill="#ff8a1f" />
              </g>
            </g>
          </g>
        </g>

        {/* Passing PDAM TIARA Tanker Truck */}
        <g transform="translate(0 694)">
          <g className="truck">
            <ellipse cx="85" cy="3" rx="102" ry="5" fill="#000" opacity=".3" />
            <path d="M170-30L280-8V4L170-16z" fill="#fff3b0" opacity=".2" />
            <circle cx="26" cy="-6" r="17" fill="#151a1e" />
            <circle cx="84" cy="-6" r="17" fill="#151a1e" />
            <circle cx="144" cy="-6" r="17" fill="#151a1e" />
            <g className="tk">
              <rect x="0" y="-60" width="118" height="46" rx="20" fill="url(#tb)" />
              <rect x="9" y="-55" width="100" height="7" rx="3.5" fill="#fff" opacity=".35" />
              <path d="M34-60V-14M84-60V-14" stroke="#0f5a8a" strokeWidth="3" opacity=".6" />
              <rect x="-1" y="-36" width="4" height="10" fill="#e33" />
              <path d="M59-53q-5 7-5 10a5 5 0 0010 0q0-3-5-10z" fill="#fff" />
              <text x="59" y="-26" dy="1" textAnchor="middle" fontFamily="Plus Jakarta Sans,system-ui,sans-serif" fontWeight="800" fontSize="14.5" fill="#06304a" opacity=".5">
                PDAM TIARA
              </text>
              <text x="59" y="-26" textAnchor="middle" fontFamily="Plus Jakarta Sans,system-ui,sans-serif" fontWeight="800" fontSize="14.5" fill="#fff">
                PDAM TIARA
              </text>
              <path d="M-6-52V-18M-12-52V-18M-12-46h6M-12-38h6M-12-30h6M-12-22h6" stroke="#9aa7ae" strokeWidth="2" />
              <path d="M122-14V-52Q122-58 129-58H150L170-32V-14z" fill="url(#cg)" />
              <path d="M133-51H148L160-34H133z" fill="#8fdcff" />
              <path d="M137-49L150-36" stroke="#fff" strokeOpacity=".6" strokeWidth="3" />
              <path d="M146-31V-14" stroke="#9aa7ae" />
              <rect x="138" y="-27" width="7" height="2.5" rx="1" fill="#6b7c86" />
              <rect x="167" y="-46" width="4" height="10" rx="1" fill="#2a3a44" />
              <circle cx="168" cy="-23" r="4" fill="#fff3b0" />
              <rect x="164" y="-16" width="13" height="7" rx="2" fill="#2a3a44" />
              <rect x="-4" y="-16" width="170" height="8" fill="#2a3a44" />
              <circle className="drip" cx="98" cy="-14" r="2.5" fill="#9be3ff" />
              <g fill="#9aa7ae">
                <circle className="puff" cx="150" cy="-58" r="6" />
                <circle className="puff" style={{ animationDelay: '-.6s' }} cx="150" cy="-58" r="6" />
                <circle className="puff" style={{ animationDelay: '-1.2s' }} cx="150" cy="-58" r="6" />
              </g>
            </g>
            <g transform="translate(26 -6)">
              <g className="wh">
                <circle r="13" fill="#1a1f23" />
                <circle r="11.5" fill="none" stroke="#3a444b" strokeWidth="3" strokeDasharray="3 3" />
                <circle r="6" fill="#c3ced5" />
                <path d="M-6 0H6M0-6V6" stroke="#5d6b74" strokeWidth="2" />
              </g>
            </g>
            <g transform="translate(84 -6)">
              <g className="wh">
                <circle r="13" fill="#1a1f23" />
                <circle r="11.5" fill="none" stroke="#3a444b" strokeWidth="3" strokeDasharray="3 3" />
                <circle r="6" fill="#c3ced5" />
                <path d="M-6 0H6M0-6V6" stroke="#5d6b74" strokeWidth="2" />
              </g>
            </g>
            <g transform="translate(144 -6)">
              <g className="wh">
                <circle r="13" fill="#1a1f23" />
                <circle r="11.5" fill="none" stroke="#3a444b" strokeWidth="3" strokeDasharray="3 3" />
                <circle r="6" fill="#c3ced5" />
                <path d="M-6 0H6M0-6V6" stroke="#5d6b74" strokeWidth="2" />
              </g>
            </g>
            <g fill="#b59a7a">
              <circle className="dust" cx="10" cy="-2" r="6" />
              <circle className="dust" style={{ animationDelay: '-.45s' }} cx="10" cy="-2" r="6" />
            </g>
          </g>
        </g>

        {/* Ambient Warm Sunlight Overlay */}
        <rect
          width="1600"
          height="900"
          fill="url(#warm)"
          style={{ mixBlendMode: 'screen', pointerEvents: 'none' }}
        />
      </svg>
      {/* Subtle shade vignette */}
      <div className="fixed inset-0 pointer-events-none z-0 bg-gradient-to-r from-black/40 via-transparent to-black/30" />
    </>
  );
}
