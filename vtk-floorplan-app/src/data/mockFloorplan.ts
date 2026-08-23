import { ExportedFloorplanData } from '../types/floorplan';

/**
 * Sample offline fallback floorplan dataset for VTK Jobfair development & offline demo.
 */
export const MOCK_FLOORPLAN_DATA: ExportedFloorplanData = {
  backgroundImage: null,
  svg: `<?xml version="1.0" encoding="UTF-8"?>
<svg id="Laag_1" data-name="Laag 1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 595.28 841.89">
  <defs>
    <clipPath id="clippath">
      <rect width="595.28" height="841.89" style="fill: none;"/>
    </clipPath>
    <clipPath id="clippath-1">
      <rect x="185.3" y="437.87" width="116.04" height="65.53" style="fill: none;"/>
    </clipPath>
    <clipPath id="clippath-2">
      <rect x="550.23" y="233.44" width="3.92" height="7.54" style="fill: none;"/>
    </clipPath>
    <clipPath id="clippath-3">
      <rect x="550.23" y="233.44" width="3.92" height="7.54" style="fill: none;"/>
    </clipPath>
    <clipPath id="clippath-4">
      <rect x="546.6" y="233.44" width="3.62" height="7.54" style="fill: none;"/>
    </clipPath>
    <clipPath id="clippath-5">
      <rect x="546.6" y="233.44" width="3.62" height="7.54" style="fill: none;"/>
    </clipPath>
    <clipPath id="clippath-6">
      <rect x="378.06" y="175.33" width="3.92" height="7.54" style="fill: none;"/>
    </clipPath>
    <clipPath id="clippath-7">
      <rect x="378.06" y="175.33" width="3.92" height="7.54" style="fill: none;"/>
    </clipPath>
    <clipPath id="clippath-8">
      <rect x="374.44" y="175.33" width="3.62" height="7.54" style="fill: none;"/>
    </clipPath>
    <clipPath id="clippath-9">
      <rect x="374.44" y="175.33" width="3.62" height="7.54" style="fill: none;"/>
    </clipPath>
    <clipPath id="clippath-10">
      <rect x="550.83" y="319.8" width="3.92" height="7.54" style="fill: none;"/>
    </clipPath>
    <clipPath id="clippath-11">
      <rect x="550.83" y="319.8" width="3.92" height="7.54" style="fill: none;"/>
    </clipPath>
    <clipPath id="clippath-12">
      <rect x="547.21" y="319.8" width="3.62" height="7.54" style="fill: none;"/>
    </clipPath>
    <clipPath id="clippath-13">
      <rect x="547.21" y="319.8" width="3.62" height="7.54" style="fill: none;"/>
    </clipPath>
    <clipPath id="clippath-14">
      <rect x="432.77" y="381.14" width="3.92" height="7.54" style="fill: none;"/>
    </clipPath>
    <clipPath id="clippath-15">
      <rect x="432.77" y="381.14" width="3.92" height="7.54" style="fill: none;"/>
    </clipPath>
    <clipPath id="clippath-16">
      <rect x="429.15" y="381.14" width="3.62" height="7.54" style="fill: none;"/>
    </clipPath>
    <clipPath id="clippath-17">
      <rect x="429.15" y="381.14" width="3.62" height="7.54" style="fill: none;"/>
    </clipPath>
    <clipPath id="clippath-18">
      <rect x="63.53" y="338.6" width="3.92" height="7.54" style="fill: none;"/>
    </clipPath>
    <clipPath id="clippath-19">
      <rect x="63.53" y="338.6" width="3.92" height="7.54" style="fill: none;"/>
    </clipPath>
    <clipPath id="clippath-20">
      <rect x="59.9" y="338.6" width="3.62" height="7.54" style="fill: none;"/>
    </clipPath>
    <clipPath id="clippath-21">
      <rect x="59.9" y="338.6" width="3.62" height="7.54" style="fill: none;"/>
    </clipPath>
    <clipPath id="clippath-22">
      <rect x="63.53" y="218.65" width="3.92" height="7.54" style="fill: none;"/>
    </clipPath>
    <clipPath id="clippath-23">
      <rect x="63.53" y="218.65" width="3.92" height="7.54" style="fill: none;"/>
    </clipPath>
    <clipPath id="clippath-24">
      <rect x="59.9" y="218.65" width="3.62" height="7.54" style="fill: none;"/>
    </clipPath>
    <clipPath id="clippath-25">
      <rect x="59.9" y="218.65" width="3.62" height="7.54" style="fill: none;"/>
    </clipPath>
    <image id="image" width="32" height="16" xlink:href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAQCAYAAAB3AH1ZAAAACXBIWXMAAAsSAAALEgHS3X78AAABDUlEQVRIie2VIY6DQBSGv10QKC6A7BF6BURdbd1wBk5QReo4AGbacAssBBQnAIFDU0vzanZJWtjNdilV/eQ/LzPfe8nMfIiIAHiex/F4RCmF1pp7tNaUZTnKH0Frzfl8xjRNiqJgvV6DfKGUEkCUUrIEYRgKIICEYTjkTxeIokhWq5UkSTJkeZ6LYRgCyHa7van/nDXTCeI4pq5r0jQFoOs6drsdl8sFx3E4nU439U8XuCcIApqmwTAMtNbYtv1aAcuyADgcDriuO1o3lxbY7/f4vj/q/JvFJwD8ePjLBH7jLfAWGF3DqqomP6O/0rbtPIEsy8iy7N8CjzIIbDYb0jSl7/vZm1qWNfnqTXEF6hIgddCTp7IAAAAASUVORK5CYII="/>
    <image id="image-2" width="32" height="17" xlink:href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAARCAYAAAC8XK78AAAACXBIWXMAAAsSAAALEgHS3X78AAABKUlEQVRIie2VrY7CQBRGz27qIIEHQNYXhxneoaK+sqayYiSvgEAQTF+gqgZRQdKaehw1JJV1TRMSSO6ahQ1LNstPCYajbubeyXcyYu6HiAhAFEVorWkDwzBYLBYopf6fPRZxHFMURSsCAEmS3CZwxLIsbNu+OzgMQ7bb7dXzFwLD4ZDJZHK3wGq1ukng8+6klngLvAWeLrDb7ciyjMPh8BoBrTXj8Rjf918j0O/3AZjP50RR9HyBwWBwFqy1xrIsADzPoyzL8wvyjeu6AojruvIIdV1Lmqay3+9PZ5vNRnq9ngAyGo3Oeq2/QLfbRSmFYfz88qZpEoYhAHmeEwTBqXexC/7C933W6/VDcp1Oh6ZpmE6nKKVwHOc6gaqqmM1mD4X/Zrlc4jgOX3qDvIjn44ndAAAAAElFTkSuQmCC"/>
  </defs>
  <line x1="154.39" y1="162.68" x2="154.39" y2="117.64" style="fill: none; stroke: #1d1d1b; stroke-width: 1.5px;"/>
  <line x1="189.85" y1="171.5" x2="189.85" y2="117.64" style="fill: none; stroke: #1d1d1b;"/>
  <line x1="271.28" y1="118.39" x2="153.64" y2="118.39" style="fill: none; stroke: #1d1d1b; stroke-width: 1.5px;"/>
  <line x1="270.53" y1="172.25" x2="270.53" y2="118.39" style="fill: none; stroke: #1d1d1b; stroke-width: 1.5px;"/>
  <line x1="559.28" y1="171.5" x2="197.01" y2="171.5" style="fill: none; stroke: #1d1d1b; stroke-width: 1.5px;"/>
  <line x1="558.53" y1="170.75" x2="558.53" y2="392.88" style="fill: none; stroke: #1d1d1b; stroke-width: 1.5px;"/>
  <line x1="559.28" y1="392.13" x2="197.01" y2="392.13" style="fill: none; stroke: #1d1d1b; stroke-width: 1.5px;"/>
  <line x1="197.76" y1="220.54" x2="197.76" y2="170.75" style="fill: none; stroke: #1d1d1b; stroke-width: 1.5px;"/>
  <line x1="222.42" y1="220.54" x2="222.42" y2="170.75" style="fill: none; stroke: #1d1d1b; stroke-width: 1.5px;"/>
  <line x1="222.42" y1="315.78" x2="222.42" y2="242.36" style="fill: none; stroke: #1d1d1b; stroke-width: 1.5px;"/>
  <line x1="222.42" y1="392.88" x2="222.42" y2="339.02" style="fill: none; stroke: #1d1d1b; stroke-width: 1.5px;"/>
  <line x1="197.01" y1="392.88" x2="197.01" y2="339.02" style="fill: none; stroke: #1d1d1b; stroke-width: 1.5px;"/>
  <line x1="197.01" y1="315.78" x2="197.01" y2="284.03" style="fill: none; stroke: #1d1d1b; stroke-width: 1.5px;"/>
  <line x1="197.01" y1="274.11" x2="197.01" y2="242.36" style="fill: none; stroke: #1d1d1b; stroke-width: 1.5px;"/>
  <line x1="171.5" y1="162.68" x2="134.93" y2="162.68" style="fill: none; stroke: #1d1d1b; stroke-width: 1.5px;"/>
  <line x1="223.17" y1="219.79" x2="197.01" y2="219.79" style="fill: none; stroke: #1d1d1b; stroke-width: 1.5px;"/>
  <line x1="223.17" y1="243.11" x2="196.26" y2="243.11" style="fill: none; stroke: #1d1d1b; stroke-width: 1.5px;"/>
  <line x1="223.17" y1="273.36" x2="214.16" y2="273.36" style="fill: none; stroke: #1d1d1b; stroke-width: 1.5px;"/>
  <line x1="205.27" y1="273.36" x2="196.26" y2="273.36" style="fill: none; stroke: #1d1d1b; stroke-width: 1.5px;"/>
  <line x1="206.01" y1="284.78" x2="196.26" y2="284.78" style="fill: none; stroke: #1d1d1b; stroke-width: 1.5px;"/>
  <line x1="223.17" y1="284.78" x2="214.16" y2="284.78" style="fill: none; stroke: #1d1d1b; stroke-width: 1.5px;"/>
  <line x1="223.17" y1="315.03" x2="196.26" y2="315.03" style="fill: none; stroke: #1d1d1b; stroke-width: 1.5px;"/>
  <line x1="135.68" y1="211.72" x2="135.68" y2="161.93" style="fill: none; stroke: #1d1d1b; stroke-width: 1.5px;"/>
  <line x1="135.68" y1="338.17" x2="135.68" y2="231.59" style="fill: none; stroke: #1d1d1b; stroke-width: 1.5px;"/>
  <line x1="135.68" y1="475.8" x2="135.68" y2="348.38" style="fill: none; stroke: #1d1d1b; stroke-width: 1.5px;"/>
  <line x1="136.43" y1="367.06" x2="56.48" y2="367.06" style="fill: none; stroke: #1d1d1b; stroke-width: 1.5px;"/>
  <line x1="57.23" y1="367.81" x2="57.23" y2="192.47" style="fill: none; stroke: #1d1d1b; stroke-width: 1.5px;"/>
  <line x1="136.43" y1="193.22" x2="56.48" y2="193.22" style="fill: none; stroke: #1d1d1b; stroke-width: 1.5px;"/>
  <line x1="85.75" y1="281.26" x2="56.48" y2="281.26" style="fill: none; stroke: #1d1d1b;"/>
  <line x1="300.83" y1="438.37" x2="264.26" y2="438.37" style="fill: none; stroke: #1d1d1b;"/>
  <line x1="398.07" y1="438.62" x2="300.83" y2="438.62" style="fill: none; stroke: #1d1d1b; stroke-width: 1.5px;"/>
  <line x1="397.32" y1="439.37" x2="397.32" y2="391.38" style="fill: none; stroke: #1d1d1b; stroke-width: 1.5px;"/>
  <line x1="238.18" y1="502.09" x2="238.18" y2="464.46" style="fill: none; stroke: #1d1d1b;"/>
  <line x1="221.74" y1="417.61" x2="196.61" y2="392.49" style="fill: none; stroke: #1d1d1b;"/>
  <g style="clip-path: url(#clippath);">
    <path d="M238.18,463.96c14.52,0,26.29-11.77,26.29-26.29s-11.77-26.29-26.29-26.29-26.29,11.77-26.29,26.29,11.77,26.29,26.29,26.29Z" style="fill: none; stroke: #000;"/>
  </g>
  <g style="clip-path: url(#clippath-1);">
    <path d="M237.43,502.65c34.88,0,63.16-28.28,63.16-63.16s-28.28-63.16-63.16-63.16-63.16,28.28-63.16,63.16,28.28,63.16,63.16,63.16Z" style="fill: none; stroke: #000;"/>
  </g>
  <line x1="185.3" y1="475.16" x2="134.93" y2="475.16" style="fill: none; stroke: #1d1d1b; stroke-width: 1.8px;"/>
  <rect x="157.85" y="121.89" width="28.78" height="5.82" style="fill: #fff;"/>
  <text transform="translate(157.85 127.71)" style="font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">E</tspan><tspan x="4.54" y="0" style="letter-spacing: -.02em;">n</tspan><tspan x="8.78" y="0" style="letter-spacing: 0em;">t</tspan><tspan x="11.25" y="0">r</tspan><tspan x="14.22" y="0" style="letter-spacing: 0em;">a</tspan><tspan x="17.66" y="0" style="letter-spacing: 0em;">n</tspan><tspan x="22.01" y="0">ce</tspan></text>
  <rect x="193.64" y="121.89" width="12.85" height="5.82" style="fill: #fff;"/>
  <text transform="translate(193.64 127.71)" style="font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0" style="letter-spacing: 0em;">E</tspan><tspan x="4.58" y="0">x</tspan><tspan x="8.35" y="0" style="letter-spacing: -.01em;">i</tspan><tspan x="10.41" y="0">t</tspan></text>
  <rect x="216.4" y="142.41" width="36.61" height="5.82" style="fill: #fff;"/>
  <text transform="translate(216.4 148.22)" style="font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0" style="letter-spacing: 0em;">C</tspan><tspan x="5.35" y="0">l</tspan><tspan x="7.38" y="0" style="letter-spacing: 0em;">o</tspan><tspan x="11.5" y="0" style="letter-spacing: 0em;">ak</tspan><tspan x="19.04" y="0" style="letter-spacing: -.01em;">r</tspan><tspan x="21.91" y="0" style="letter-spacing: 0em;">o</tspan><tspan x="26.06" y="0" style="letter-spacing: -.01em;">o</tspan><tspan x="30.05" y="0" style="letter-spacing: 0em;">m</tspan></text>
  <rect x="67.44" y="232.78" width="22.36" height="5.82" style="fill: #fff;"/>
  <text transform="translate(67.44 238.59)" style="font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">D</tspan><tspan x="5.88" y="0" style="letter-spacing: 0em;">r</tspan><tspan x="8.9" y="0" style="letter-spacing: 0em;">i</tspan><tspan x="11.04" y="0" style="letter-spacing: 0em;">n</tspan><tspan x="15.45" y="0">ks</tspan></text>
  <rect x="71.11" y="321.81" width="22.36" height="5.82" style="fill: #fff;"/>
  <text transform="translate(71.11 327.62)" style="font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0" style="letter-spacing: -.02em;">F</tspan><tspan x="4.09" y="0" style="letter-spacing: 0em;">o</tspan><tspan x="8.23" y="0" style="letter-spacing: 0em;">o</tspan><tspan x="12.38" y="0">d</tspan></text>
  <rect x="96.46" y="277.61" width="29.66" height="5.82" style="fill: #fff;"/>
  <text transform="translate(96.45 283.42)" style="font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0" style="letter-spacing: 0em;">L</tspan><tspan x="4.37" y="0" style="letter-spacing: -.01em;">o</tspan><tspan x="8.37" y="0">u</tspan><tspan x="12.62" y="0" style="letter-spacing: 0em;">n</tspan><tspan x="16.93" y="0" style="letter-spacing: 0em;">g</tspan><tspan x="20.62" y="0">e</tspan></text>
  <rect x="139.46" y="435.17" width="69.72" height="26.43" style="fill: #fff;"/>
  <text transform="translate(149.95 440.99)" style="font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0" style="letter-spacing: 0em;">A</tspan><tspan x="5.5" y="0" style="letter-spacing: -.01em;">r</tspan><tspan x="8.38" y="0" style="letter-spacing: 0em;">c</tspan><tspan x="11.78" y="0" style="letter-spacing: 0em;">ade </tspan><tspan x="24.74" y="0" style="letter-spacing: 0em;">L</tspan><tspan x="29.1" y="0" style="letter-spacing: -.01em;">o</tspan><tspan x="33.1" y="0">u</tspan><tspan x="37.35" y="0" style="letter-spacing: 0em;">ng</tspan><tspan x="45.36" y="0">e</tspan></text>
  <text transform="translate(172 450.59)" style="font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">+</tspan></text>
  <text transform="translate(145.93 460.19)" style="font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">CV </tspan><tspan x="12.76" y="0" style="letter-spacing: 0em;">Ph</tspan><tspan x="21.47" y="0" style="letter-spacing: -.01em;">o</tspan><tspan x="25.47" y="0" style="letter-spacing: 0em;">t</tspan><tspan x="27.87" y="0">o</tspan><tspan x="31.95" y="0" style="letter-spacing: 0em;">g</tspan><tspan x="35.73" y="0">r</tspan><tspan x="38.7" y="0" style="letter-spacing: -.02em;">a</tspan><tspan x="42.06" y="0" style="letter-spacing: 0em;">p</tspan><tspan x="46.21" y="0" style="letter-spacing: 0em;">h</tspan><tspan x="50.46" y="0">er</tspan></text>
  <g style="clip-path: url(#clippath-2);">
    <g style="clip-path: url(#clippath-3);">
      <use transform="translate(554.15 233.44) rotate(90) scale(.24)" xlink:href="#image-2"/>
    </g>
  </g>
  <g style="clip-path: url(#clippath-4);">
    <g style="clip-path: url(#clippath-5);">
      <use transform="translate(550.23 233.44) rotate(90) scale(.24)" xlink:href="#image"/>
    </g>
  </g>
  <g style="clip-path: url(#clippath-6);">
    <g style="clip-path: url(#clippath-7);">
      <use transform="translate(381.98 175.33) rotate(90) scale(.24)" xlink:href="#image-2"/>
    </g>
  </g>
  <g style="clip-path: url(#clippath-8);">
    <g style="clip-path: url(#clippath-9);">
      <use transform="translate(378.06 175.33) rotate(90) scale(.24)" xlink:href="#image"/>
    </g>
  </g>
  <g style="clip-path: url(#clippath-10);">
    <g style="clip-path: url(#clippath-11);">
      <use transform="translate(554.75 319.8) rotate(90) scale(.24)" xlink:href="#image-2"/>
    </g>
  </g>
  <g style="clip-path: url(#clippath-12);">
    <g style="clip-path: url(#clippath-13);">
      <use transform="translate(550.83 319.8) rotate(90) scale(.24)" xlink:href="#image"/>
    </g>
  </g>
  <g style="clip-path: url(#clippath-14);">
    <g style="clip-path: url(#clippath-15);">
      <use transform="translate(436.69 381.14) rotate(90) scale(.24)" xlink:href="#image-2"/>
    </g>
  </g>
  <g style="clip-path: url(#clippath-16);">
    <g style="clip-path: url(#clippath-17);">
      <use transform="translate(432.77 381.14) rotate(90) scale(.24)" xlink:href="#image"/>
    </g>
  </g>
  <g style="clip-path: url(#clippath-18);">
    <g style="clip-path: url(#clippath-19);">
      <use transform="translate(67.44 338.6) rotate(90) scale(.24)" xlink:href="#image-2"/>
    </g>
  </g>
  <g style="clip-path: url(#clippath-20);">
    <g style="clip-path: url(#clippath-21);">
      <use transform="translate(63.53 338.6) rotate(90) scale(.24)" xlink:href="#image"/>
    </g>
  </g>
  <g style="clip-path: url(#clippath-22);">
    <g style="clip-path: url(#clippath-23);">
      <use transform="translate(67.44 218.65) rotate(90) scale(.24)" xlink:href="#image-2"/>
    </g>
  </g>
  <g style="clip-path: url(#clippath-24);">
    <g style="clip-path: url(#clippath-25);">
      <use transform="translate(63.53 218.65) rotate(90) scale(.24)" xlink:href="#image"/>
    </g>
  </g>
  <rect x="205.08" y="255.33" width="8.8" height="5.82" style="fill: #fff;"/>
  <text transform="translate(205.08 261.14)" style="font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0" style="letter-spacing: 0em;">w</tspan><tspan x="5.42" y="0" style="letter-spacing: 0em;">c</tspan></text>
  <rect x="205.08" y="297.8" width="8.8" height="5.82" style="fill: #fff;"/>
  <text transform="translate(205.08 303.62)" style="font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0" style="letter-spacing: 0em;">w</tspan><tspan x="5.42" y="0" style="letter-spacing: 0em;">c</tspan></text>
  <text transform="translate(232.78 184.48)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">1</tspan></text>
  <rect x="226" y="174.86" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(250.18 184.48)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">2</tspan></text>
  <rect x="243.4" y="174.86" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(267.59 184.48)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">3</tspan></text>
  <rect x="260.81" y="174.86" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(284.99 184.48)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">4</tspan></text>
  <rect x="278.21" y="174.86" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(302.4 184.48)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">5</tspan></text>
  <rect x="295.61" y="174.86" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(319.8 184.48)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">6</tspan></text>
  <rect x="313.02" y="174.86" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(337.21 184.48)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">7</tspan></text>
  <rect x="330.42" y="174.86" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(354.61 184.48)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">8</tspan></text>
  <rect x="347.83" y="174.86" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(397.24 184.48)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">9</tspan></text>
  <rect x="390.46" y="174.86" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(412.73 184.48)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">10</tspan></text>
  <rect x="407.87" y="174.86" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(430.13 184.48)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">11</tspan></text>
  <rect x="425.27" y="174.86" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(447.54 184.48)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">12</tspan></text>
  <rect x="442.68" y="174.86" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(464.94 184.48)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">13</tspan></text>
  <rect x="460.08" y="174.86" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(482.35 184.48)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">14</tspan></text>
  <rect x="477.49" y="174.86" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(499.75 184.48)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">15</tspan></text>
  <rect x="494.89" y="174.86" width="17.41" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(517.16 184.48)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">16</tspan></text>
  <rect x="512.29" y="174.86" width="17.41" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(534.56 184.48)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">17</tspan></text>
  <rect x="529.7" y="174.86" width="17.41" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(245.24 209.49)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">18</tspan></text>
  <rect x="240.38" y="199.87" width="17.41" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(403.47 209.49)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">26</tspan></text>
  <rect x="398.61" y="199.87" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(403.47 255.13)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">58</tspan></text>
  <rect x="398.61" y="245.51" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(245.24 255.13)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">50</tspan></text>
  <rect x="240.38" y="245.51" width="17.41" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(245.24 296.13)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">85</tspan></text>
  <rect x="240.38" y="286.51" width="17.41" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(403.47 296.13)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">93</tspan></text>
  <rect x="398.61" y="286.51" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(401.55 341.87)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">126</tspan></text>
  <rect x="398.61" y="332.25" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(243.32 341.87)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">118</tspan></text>
  <rect x="240.38" y="332.25" width="17.41" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(245.24 222.91)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">34</tspan></text>
  <rect x="240.38" y="213.3" width="17.41" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(403.47 222.91)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">42</tspan></text>
  <rect x="398.61" y="213.3" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(403.47 268.55)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">75</tspan></text>
  <rect x="398.61" y="258.93" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(245.24 268.55)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">67</tspan></text>
  <rect x="240.38" y="258.93" width="17.41" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(243.32 309.56)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">102</tspan></text>
  <rect x="240.38" y="299.94" width="17.41" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(401.55 309.56)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">110</tspan></text>
  <rect x="398.61" y="299.94" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(401.55 355.29)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">142</tspan></text>
  <rect x="398.61" y="345.67" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(243.32 355.29)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">134</tspan></text>
  <rect x="240.38" y="345.67" width="17.41" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(229.44 385.41)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">150</tspan></text>
  <rect x="226.5" y="375.79" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(262.65 209.49)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">19</tspan></text>
  <rect x="257.78" y="199.87" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(420.88 209.49)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">27</tspan></text>
  <rect x="416.01" y="199.87" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(420.88 255.13)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">59</tspan></text>
  <rect x="416.01" y="245.51" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(262.65 255.13)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">51</tspan></text>
  <rect x="257.78" y="245.51" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(262.65 296.13)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">86</tspan></text>
  <rect x="257.78" y="286.51" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(420.88 296.13)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">94</tspan></text>
  <rect x="416.01" y="286.51" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(418.96 341.87)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">127</tspan></text>
  <rect x="416.01" y="332.25" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(260.73 341.87)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">119</tspan></text>
  <rect x="257.78" y="332.25" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(262.65 222.91)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">35</tspan></text>
  <rect x="257.78" y="213.3" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(420.88 222.91)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">43</tspan></text>
  <rect x="416.01" y="213.3" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(420.88 268.55)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">76</tspan></text>
  <rect x="416.01" y="258.93" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(262.65 268.55)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">68</tspan></text>
  <rect x="257.78" y="258.93" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(260.73 309.56)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">103</tspan></text>
  <rect x="257.78" y="299.94" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(418.96 309.56)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">111</tspan></text>
  <rect x="416.01" y="299.94" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(418.96 355.29)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">143</tspan></text>
  <rect x="416.01" y="345.67" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(260.73 355.29)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">135</tspan></text>
  <rect x="257.78" y="345.67" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(246.84 385.41)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">151</tspan></text>
  <rect x="243.9" y="375.79" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(280.05 209.49)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">20</tspan></text>
  <rect x="275.19" y="199.87" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(438.28 209.49)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">28</tspan></text>
  <rect x="433.42" y="199.87" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(438.28 255.13)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">60</tspan></text>
  <rect x="433.42" y="245.51" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(280.05 255.13)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">52</tspan></text>
  <rect x="275.19" y="245.51" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(280.05 296.13)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">87</tspan></text>
  <rect x="275.19" y="286.51" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(438.28 296.13)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">95</tspan></text>
  <rect x="433.42" y="286.51" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(436.36 341.87)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">128</tspan></text>
  <rect x="433.42" y="332.25" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(278.13 341.87)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">120</tspan></text>
  <rect x="275.19" y="332.25" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(280.05 222.91)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">36</tspan></text>
  <rect x="275.19" y="213.3" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(438.28 222.91)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">44</tspan></text>
  <rect x="433.42" y="213.3" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(438.28 268.55)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">77</tspan></text>
  <rect x="433.42" y="258.93" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(280.05 268.55)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">69</tspan></text>
  <rect x="275.19" y="258.93" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(278.13 309.56)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">104</tspan></text>
  <rect x="275.19" y="299.94" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(436.36 309.56)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">112</tspan></text>
  <rect x="433.42" y="299.94" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(436.36 355.29)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">144</tspan></text>
  <rect x="433.42" y="345.67" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(449.34 385.41)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">161</tspan></text>
  <rect x="446.39" y="375.79" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(278.13 355.29)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">136</tspan></text>
  <rect x="275.19" y="345.67" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(264.25 385.41)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">152</tspan></text>
  <rect x="261.31" y="375.79" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(297.45 209.49)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">21</tspan></text>
  <rect x="292.59" y="199.87" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(455.68 209.49)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">29</tspan></text>
  <rect x="450.82" y="199.87" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(455.68 255.13)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">61</tspan></text>
  <rect x="450.82" y="245.51" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(297.45 255.13)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">53</tspan></text>
  <rect x="292.59" y="245.51" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(297.45 296.13)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">88</tspan></text>
  <rect x="292.59" y="286.51" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(455.68 296.13)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">96</tspan></text>
  <rect x="450.82" y="286.51" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(453.76 341.87)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">129</tspan></text>
  <rect x="450.82" y="332.25" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(295.53 341.87)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">121</tspan></text>
  <rect x="292.59" y="332.25" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(297.45 222.91)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">37</tspan></text>
  <rect x="292.59" y="213.3" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(455.68 222.91)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">45</tspan></text>
  <rect x="450.82" y="213.3" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(455.68 268.55)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">78</tspan></text>
  <rect x="450.82" y="258.93" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(297.45 268.55)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">70</tspan></text>
  <rect x="292.59" y="258.93" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(295.53 309.56)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">105</tspan></text>
  <rect x="292.59" y="299.94" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(453.76 309.56)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">113</tspan></text>
  <rect x="450.82" y="299.94" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(453.76 355.29)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">145</tspan></text>
  <rect x="450.82" y="345.67" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(466.74 385.41)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">162</tspan></text>
  <rect x="463.8" y="375.79" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(295.53 355.29)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">137</tspan></text>
  <rect x="292.59" y="345.67" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(281.65 385.41)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">153</tspan></text>
  <rect x="278.71" y="375.79" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(314.86 209.49)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">22</tspan></text>
  <rect x="310" y="199.87" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(473.09 209.49)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">30</tspan></text>
  <rect x="468.23" y="199.87" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(473.09 255.13)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">62</tspan></text>
  <rect x="468.23" y="245.51" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(314.86 255.13)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">54</tspan></text>
  <rect x="310" y="245.51" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(314.86 296.13)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">89</tspan></text>
  <rect x="310" y="286.51" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(473.09 296.13)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">97</tspan></text>
  <rect x="468.23" y="286.51" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(471.17 341.87)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">130</tspan></text>
  <rect x="468.23" y="332.25" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(312.94 341.87)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">122</tspan></text>
  <rect x="310" y="332.25" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(314.86 222.91)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">38</tspan></text>
  <rect x="310" y="213.3" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(473.09 222.91)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">46</tspan></text>
  <rect x="468.23" y="213.3" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(473.09 268.55)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">79</tspan></text>
  <rect x="468.23" y="258.93" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(314.86 268.55)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">71</tspan></text>
  <rect x="310" y="258.93" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(312.94 309.56)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">106</tspan></text>
  <rect x="310" y="299.94" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(471.17 309.56)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">114</tspan></text>
  <rect x="468.23" y="299.94" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(471.17 355.29)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">146</tspan></text>
  <rect x="468.23" y="345.67" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(484.15 385.41)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">163</tspan></text>
  <rect x="481.2" y="375.79" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(312.94 355.29)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">138</tspan></text>
  <rect x="310" y="345.67" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(299.06 385.41)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">154</tspan></text>
  <rect x="296.11" y="375.79" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(332.26 209.49)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">23</tspan></text>
  <rect x="327.4" y="199.87" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(490.49 209.49)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">31</tspan></text>
  <rect x="485.63" y="199.87" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(490.49 255.13)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">63</tspan></text>
  <rect x="485.63" y="245.51" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(332.26 255.13)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">55</tspan></text>
  <rect x="327.4" y="245.51" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(332.26 296.13)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">90</tspan></text>
  <rect x="327.4" y="286.51" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(490.49 296.13)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">98</tspan></text>
  <rect x="485.63" y="286.51" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(488.57 341.87)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">131</tspan></text>
  <rect x="485.63" y="332.25" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(330.34 341.87)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">123</tspan></text>
  <rect x="327.4" y="332.25" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(332.26 222.91)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">39</tspan></text>
  <rect x="327.4" y="213.3" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(490.49 222.91)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">47</tspan></text>
  <rect x="485.63" y="213.3" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(490.49 268.55)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">80</tspan></text>
  <rect x="485.63" y="258.93" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(332.26 268.55)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">72</tspan></text>
  <rect x="327.4" y="258.93" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(330.34 309.56)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">107</tspan></text>
  <rect x="327.4" y="299.94" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(488.57 309.56)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">115</tspan></text>
  <rect x="485.63" y="299.94" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(488.57 355.29)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">147</tspan></text>
  <rect x="485.63" y="345.67" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(501.55 385.41)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">164</tspan></text>
  <rect x="498.61" y="375.79" width="17.41" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(330.34 355.29)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">139</tspan></text>
  <rect x="327.4" y="345.67" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(316.46 385.41)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">155</tspan></text>
  <rect x="313.52" y="375.79" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(349.67 209.49)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">24</tspan></text>
  <rect x="344.81" y="199.87" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(507.9 209.49)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">32</tspan></text>
  <rect x="503.04" y="199.87" width="17.41" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(507.9 255.13)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">64</tspan></text>
  <rect x="503.04" y="245.51" width="17.41" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(349.67 255.13)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">56</tspan></text>
  <rect x="344.81" y="245.51" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(349.67 296.13)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">91</tspan></text>
  <rect x="344.81" y="286.51" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(507.9 296.13)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">99</tspan></text>
  <rect x="503.04" y="286.51" width="17.41" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(505.98 341.87)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">132</tspan></text>
  <rect x="503.04" y="332.25" width="17.41" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(347.75 341.87)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">124</tspan></text>
  <rect x="344.81" y="332.25" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(349.67 222.91)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">40</tspan></text>
  <rect x="344.81" y="213.3" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(507.9 222.91)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">48</tspan></text>
  <rect x="503.04" y="213.3" width="17.41" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(507.9 268.55)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">81</tspan></text>
  <rect x="503.04" y="258.93" width="17.41" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(349.67 268.55)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">73</tspan></text>
  <rect x="344.81" y="258.93" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(347.75 309.56)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">108</tspan></text>
  <rect x="344.81" y="299.94" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(505.98 309.56)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">116</tspan></text>
  <rect x="503.04" y="299.94" width="17.41" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(505.98 355.29)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">148</tspan></text>
  <rect x="503.04" y="345.67" width="17.41" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(518.96 385.41)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">165</tspan></text>
  <rect x="516.01" y="375.79" width="17.41" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(347.75 355.29)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">140</tspan></text>
  <rect x="344.81" y="345.67" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(333.87 385.41)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">156</tspan></text>
  <rect x="330.92" y="375.79" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(367.07 209.49)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">25</tspan></text>
  <rect x="362.21" y="199.87" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(525.3 209.49)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">33</tspan></text>
  <rect x="520.44" y="199.87" width="17.41" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(525.3 255.13)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">65</tspan></text>
  <rect x="520.44" y="245.51" width="17.41" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(367.07 255.13)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">57</tspan></text>
  <rect x="362.21" y="245.51" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(367.07 296.13)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">92</tspan></text>
  <rect x="362.21" y="286.51" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(523.38 296.13)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">100</tspan></text>
  <rect x="520.44" y="286.51" width="17.41" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(523.38 341.87)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">133</tspan></text>
  <rect x="520.44" y="332.25" width="17.41" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(365.15 341.87)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">125</tspan></text>
  <rect x="362.21" y="332.25" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(367.07 222.91)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">41</tspan></text>
  <rect x="362.21" y="213.3" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(525.3 222.91)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">49</tspan></text>
  <rect x="520.44" y="213.3" width="17.41" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(525.3 268.55)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">82</tspan></text>
  <rect x="520.44" y="258.93" width="17.41" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(367.07 268.55)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">74</tspan></text>
  <rect x="362.21" y="258.93" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(365.15 309.56)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">109</tspan></text>
  <rect x="362.21" y="299.94" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(523.38 309.56)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">117</tspan></text>
  <rect x="520.44" y="299.94" width="17.41" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(523.38 355.29)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">149</tspan></text>
  <rect x="520.44" y="345.67" width="17.41" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(536.36 385.41)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">166</tspan></text>
  <rect x="533.42" y="375.79" width="17.41" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(365.15 355.29)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">141</tspan></text>
  <rect x="362.21" y="345.67" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(351.27 385.41)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">157</tspan></text>
  <rect x="348.33" y="375.79" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(368.68 385.41)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">158</tspan></text>
  <rect x="365.73" y="375.79" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(386.08 385.41)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">159</tspan></text>
  <rect x="383.14" y="375.79" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(403.49 385.41)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">160</tspan></text>
  <rect x="400.54" y="375.79" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(542.71 255.13)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">66</tspan></text>
  <rect x="537.85" y="245.51" width="17.41" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(542.71 268.55)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">83</tspan></text>
  <rect x="537.85" y="258.93" width="17.41" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(227.84 296.13)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">84</tspan></text>
  <rect x="222.97" y="286.51" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(225.92 309.56)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">101</tspan></text>
  <rect x="222.97" y="299.94" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(140.23 235.25) rotate(90)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">167</tspan></text>
  <rect x="136.43" y="232.31" width="13.42" height="17.41" style="fill: none; stroke: #000;"/>
  <text transform="translate(140.23 252.65) rotate(90)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">168</tspan></text>
  <rect x="136.43" y="249.71" width="13.42" height="17.41" style="fill: none; stroke: #000;"/>
  <text transform="translate(140.23 270.06) rotate(90)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">169</tspan></text>
  <rect x="136.43" y="267.12" width="13.42" height="17.41" style="fill: none; stroke: #000;"/>
  <text transform="translate(140.23 287.46) rotate(90)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">170</tspan></text>
  <rect x="136.43" y="284.52" width="13.42" height="17.41" style="fill: none; stroke: #000;"/>
  <text transform="translate(140.23 304.87) rotate(90)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">171</tspan></text>
  <rect x="136.43" y="301.93" width="13.42" height="17.41" style="fill: none; stroke: #000;"/>
  <text transform="translate(140.23 322.27) rotate(90)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">172</tspan></text>
  <rect x="136.43" y="319.33" width="13.42" height="17.4" style="fill: none; stroke: #000;"/>
  <text transform="translate(140.23 352.62) rotate(90)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">173</tspan></text>
  <rect x="136.43" y="349.68" width="13.42" height="17.4" style="fill: none; stroke: #000;"/>
  <text transform="translate(174.92 352.62) rotate(90)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">181</tspan></text>
  <rect x="171.11" y="349.68" width="13.42" height="17.4" style="fill: none; stroke: #000;"/>
  <text transform="translate(162.3 269.37) rotate(90)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">177</tspan></text>
  <rect x="158.5" y="266.43" width="13.42" height="17.41" style="fill: none; stroke: #000;"/>
  <text transform="translate(174.92 387.43) rotate(90)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">183</tspan></text>
  <rect x="171.11" y="384.49" width="13.42" height="17.4" style="fill: none; stroke: #000;"/>
  <text transform="translate(162.3 304.18) rotate(90)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">179</tspan></text>
  <rect x="158.5" y="301.24" width="13.42" height="17.41" style="fill: none; stroke: #000;"/>
  <text transform="translate(140.23 370.03) rotate(90)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">174</tspan></text>
  <rect x="136.43" y="367.09" width="13.42" height="17.4" style="fill: none; stroke: #000;"/>
  <text transform="translate(174.92 370.03) rotate(90)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">182</tspan></text>
  <rect x="171.11" y="367.09" width="13.42" height="17.4" style="fill: none; stroke: #000;"/>
  <text transform="translate(162.3 286.78) rotate(90)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">178</tspan></text>
  <rect x="158.5" y="283.83" width="13.42" height="17.41" style="fill: none; stroke: #000;"/>
  <text transform="translate(162.3 321.59) rotate(90)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">180</tspan></text>
  <rect x="158.5" y="318.64" width="13.42" height="17.4" style="fill: none; stroke: #000;"/>
  <text transform="translate(162.3 251.97) rotate(90)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">176</tspan></text>
  <rect x="158.5" y="249.03" width="13.42" height="17.41" style="fill: none; stroke: #000;"/>
  <text transform="translate(173.34 322.78) rotate(90)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">189</tspan></text>
  <rect x="171.92" y="321.34" width="8.65" height="14.4" style="fill: none; stroke: #000;"/>
  <text transform="translate(173.34 279.58) rotate(90)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">186</tspan></text>
  <rect x="171.92" y="278.14" width="8.65" height="14.4" style="fill: none; stroke: #000;"/>
  <text transform="translate(163.88 379.92) rotate(90)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">192</tspan></text>
  <rect x="162.47" y="378.48" width="8.65" height="14.4" style="fill: none; stroke: #000;"/>
  <text transform="translate(163.88 394.32) rotate(90)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">193</tspan></text>
  <rect x="162.47" y="392.88" width="8.65" height="14.4" style="fill: none; stroke: #000;"/>
  <text transform="translate(173.34 308.38) rotate(90)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">188</tspan></text>
  <rect x="171.92" y="306.94" width="8.65" height="14.4" style="fill: none; stroke: #000;"/>
  <text transform="translate(173.34 265.18) rotate(90)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">185</tspan></text>
  <rect x="171.92" y="263.74" width="8.65" height="14.4" style="fill: none; stroke: #000;"/>
  <text transform="translate(163.88 365.52) rotate(90)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">191</tspan></text>
  <rect x="162.47" y="364.08" width="8.65" height="14.4" style="fill: none; stroke: #000;"/>
  <text transform="translate(173.34 293.98) rotate(90)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">187</tspan></text>
  <rect x="171.92" y="292.54" width="8.65" height="14.4" style="fill: none; stroke: #000;"/>
  <text transform="translate(173.34 250.78) rotate(90)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">184</tspan></text>
  <rect x="171.92" y="249.34" width="8.65" height="14.4" style="fill: none; stroke: #000;"/>
  <text transform="translate(163.88 351.12) rotate(90)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">190</tspan></text>
  <rect x="162.47" y="349.68" width="8.65" height="14.4" style="fill: none; stroke: #000;"/>
  <text transform="translate(83.95 204.12)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">194</tspan></text>
  <rect x="81" y="194.5" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(101.35 204.12)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">195</tspan></text>
  <rect x="98.41" y="194.5" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(118.76 204.12)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">196</tspan></text>
  <rect x="115.81" y="194.5" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(139.43 172.83)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">197</tspan></text>
  <rect x="136.48" y="163.21" width="17.4" height="13.42" style="fill: none; stroke: #000;"/>
  <text transform="translate(138.3 385.93) rotate(90)" style="fill: #1d1d1b; font-family: MinionPro-Regular, 'Minion Pro'; font-size: 8px;"><tspan x="0" y="0">175</tspan></text>
  <rect x="136.89" y="384.49" width="8.65" height="14.4" style="fill: none; stroke: #000;"/>
</svg>`,
  booths: [
  {
    "id": 1,
    "booth_number": 1,
    "coords": {
      "type": "rect",
      "x": 226,
      "y": 174.86,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-1",
    "company": {
      "id": "company-1",
      "name": "NMBS",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/nmbs.be",
      "short_description": "NMBS is presenting at VTK Jobfair 2026. Visit booth 1 to connect!",
      "long_description": "NMBS is participating in the annual VTK Jobfair. Stop by stand 1 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 1",
      "website": "https://www.nmbs.be/jobs",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        }
      ],
      "representatives": [
        {
          "id": "rep-1-1",
          "first_name": "Benny",
          "last_name": "Maes",
          "title": "Representative",
          "email": "benny.maes@nmbs.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-1-2",
          "first_name": "Christian",
          "last_name": "Smets",
          "title": "Representative",
          "email": "christian.smets@nmbs.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-1-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.nmbs.be/jobs"
        },
        {
          "id": "vac-1-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.nmbs.be/jobs"
        }
      ]
    }
  },
  {
    "id": 2,
    "booth_number": 2,
    "coords": {
      "type": "rect",
      "x": 243.4,
      "y": 174.86,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-2",
    "company": {
      "id": "company-2",
      "name": "Arcade",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/arcadegroep.be",
      "short_description": "Arcade is presenting at VTK Jobfair 2026. Visit booth 2 to connect!",
      "long_description": "Arcade is participating in the annual VTK Jobfair. Stop by stand 2 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 2",
      "website": "https://arcadegroep.be",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        }
      ],
      "representatives": [
        {
          "id": "rep-2-1",
          "first_name": "Pascale",
          "last_name": "De Koning",
          "title": "Representative",
          "email": "pascale.dekoning@arcade.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-2-2",
          "first_name": "Siege",
          "last_name": "Van Gelder",
          "title": "Representative",
          "email": "siege.vangelder@arcade.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-2-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://arcadegroep.be"
        },
        {
          "id": "vac-2-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://arcadegroep.be"
        }
      ]
    }
  },
  {
    "id": 3,
    "booth_number": 3,
    "coords": {
      "type": "rect",
      "x": 260.81,
      "y": 174.86,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-3",
    "company": {
      "id": "company-3",
      "name": "NXP Semiconductors",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/nxp.com",
      "short_description": "NXP Semiconductors is presenting at VTK Jobfair 2026. Visit booth 3 to connect!",
      "long_description": "NXP Semiconductors is participating in the annual VTK Jobfair. Stop by stand 3 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 3",
      "website": "https://www.nxp.com/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 10,
          "name": "Biomedische Technologie",
          "short_name": "BMT"
        }
      ],
      "representatives": [
        {
          "id": "rep-3-1",
          "first_name": "Patrick",
          "last_name": "Vandebroek",
          "title": "Representative",
          "email": "patrick.vandebroek@nxpsemiconductors.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-3-2",
          "first_name": "Patrick",
          "last_name": "Vandebroek",
          "title": "Representative",
          "email": "patrick.vandebroek@nxpsemiconductors.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-3-3",
          "first_name": "Aleander",
          "last_name": "dubois",
          "title": "Representative",
          "email": "aleander.dubois@nxpsemiconductors.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-3-4",
          "first_name": "Julien",
          "last_name": "Grant",
          "title": "Representative",
          "email": "julien.grant@nxpsemiconductors.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-3-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.nxp.com/"
        },
        {
          "id": "vac-3-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.nxp.com/"
        }
      ]
    }
  },
  {
    "id": 4,
    "booth_number": 4,
    "coords": {
      "type": "rect",
      "x": 278.21,
      "y": 174.86,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-4",
    "company": {
      "id": "company-4",
      "name": "Sirris",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/sirris.be",
      "short_description": "Sirris is presenting at VTK Jobfair 2026. Visit booth 4 to connect!",
      "long_description": "Sirris is participating in the annual VTK Jobfair. Stop by stand 4 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 4",
      "website": "https://www.sirris.be",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-4-1",
          "first_name": "Franne",
          "last_name": "Godderis",
          "title": "Representative",
          "email": "franne.godderis@sirris.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-4-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.sirris.be"
        },
        {
          "id": "vac-4-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.sirris.be"
        }
      ]
    }
  },
  {
    "id": 5,
    "booth_number": 5,
    "coords": {
      "type": "rect",
      "x": 295.61,
      "y": 174.86,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-5",
    "company": {
      "id": "company-5",
      "name": "MinDCet NV",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/mindcet.com",
      "short_description": "MinDCet NV is presenting at VTK Jobfair 2026. Visit booth 5 to connect!",
      "long_description": "MinDCet NV is participating in the annual VTK Jobfair. Stop by stand 5 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 5",
      "website": "https://www.mindcet.com/",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 5,
          "name": "Nanowetenschappen & Nanotechnologie",
          "short_name": "NANO"
        }
      ],
      "representatives": [
        {
          "id": "rep-5-1",
          "first_name": "Katleen",
          "last_name": "Paulus",
          "title": "Representative",
          "email": "katleen.paulus@mindcetnv.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-5-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.mindcet.com/"
        },
        {
          "id": "vac-5-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.mindcet.com/"
        }
      ]
    }
  },
  {
    "id": 6,
    "booth_number": 6,
    "coords": {
      "type": "rect",
      "x": 313.02,
      "y": 174.86,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-6",
    "company": {
      "id": "company-6",
      "name": "ARHS Group - Part of Accenture",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/arhs-group.com",
      "short_description": "ARHS Group - Part of Accenture is presenting at VTK Jobfair 2026. Visit booth 6 to connect!",
      "long_description": "ARHS Group - Part of Accenture is participating in the annual VTK Jobfair. Stop by stand 6 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 6",
      "website": "https://www.arhs-group.com/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-6-1",
          "first_name": "Natasha",
          "last_name": "Denis",
          "title": "Representative",
          "email": "natasha.denis@arhsgrouppartofaccenture.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-6-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.arhs-group.com/"
        },
        {
          "id": "vac-6-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.arhs-group.com/"
        }
      ]
    }
  },
  {
    "id": 7,
    "booth_number": 7,
    "coords": {
      "type": "rect",
      "x": 330.42,
      "y": 174.86,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-7",
    "company": {
      "id": "company-7",
      "name": "Sofics",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/sofics.com",
      "short_description": "Sofics is presenting at VTK Jobfair 2026. Visit booth 7 to connect!",
      "long_description": "Sofics is participating in the annual VTK Jobfair. Stop by stand 7 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 7",
      "website": "https://sofics.com",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        }
      ],
      "representatives": [
        {
          "id": "rep-7-1",
          "first_name": "Delilah",
          "last_name": "Nathan",
          "title": "Representative",
          "email": "delilah.nathan@sofics.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-7-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://sofics.com"
        },
        {
          "id": "vac-7-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://sofics.com"
        }
      ]
    }
  },
  {
    "id": 8,
    "booth_number": 8,
    "coords": {
      "type": "rect",
      "x": 347.83,
      "y": 174.86,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-8",
    "company": {
      "id": "company-8",
      "name": "Able BV",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/axsguard.com",
      "short_description": "Able BV is presenting at VTK Jobfair 2026. Visit booth 8 to connect!",
      "long_description": "Able BV is participating in the annual VTK Jobfair. Stop by stand 8 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 8",
      "website": "https://www.axsguard.com/en_US",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        }
      ],
      "representatives": [
        {
          "id": "rep-8-1",
          "first_name": "Julien",
          "last_name": "Haeck",
          "title": "Representative",
          "email": "julien.haeck@ablebv.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-8-2",
          "first_name": "Hilde",
          "last_name": "De Hertogh",
          "title": "Representative",
          "email": "hilde.dehertogh@ablebv.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-8-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.axsguard.com/en_US"
        },
        {
          "id": "vac-8-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.axsguard.com/en_US"
        }
      ]
    }
  },
  {
    "id": 9,
    "booth_number": 9,
    "coords": {
      "type": "rect",
      "x": 390.46,
      "y": 174.86,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-9",
    "company": {
      "id": "company-9",
      "name": "Dataminded",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/dataminded.com",
      "short_description": "Dataminded is presenting at VTK Jobfair 2026. Visit booth 9 to connect!",
      "long_description": "Dataminded is participating in the annual VTK Jobfair. Stop by stand 9 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 9",
      "website": "https://www.dataminded.com/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        }
      ],
      "representatives": [
        {
          "id": "rep-9-1",
          "first_name": "Robbert",
          "last_name": "Hofman",
          "title": "Representative",
          "email": "robbert.hofman@dataminded.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-9-2",
          "first_name": "Sofia",
          "last_name": "Iamskaia",
          "title": "Representative",
          "email": "sofia.iamskaia@dataminded.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-9-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.dataminded.com/"
        },
        {
          "id": "vac-9-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.dataminded.com/"
        }
      ]
    }
  },
  {
    "id": 10,
    "booth_number": 10,
    "coords": {
      "type": "rect",
      "x": 407.87,
      "y": 174.86,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-10",
    "company": {
      "id": "company-10",
      "name": "Vlerick Business School",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/vlerick.com",
      "short_description": "Vlerick Business School is presenting at VTK Jobfair 2026. Visit booth 10 to connect!",
      "long_description": "Vlerick Business School is participating in the annual VTK Jobfair. Stop by stand 10 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 10",
      "website": "http://www.vlerick.com/masters",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 5,
          "name": "Nanowetenschappen & Nanotechnologie",
          "short_name": "NANO"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 10,
          "name": "Biomedische Technologie",
          "short_name": "BMT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [],
      "vacancies": [
        {
          "id": "vac-10-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "http://www.vlerick.com/masters"
        },
        {
          "id": "vac-10-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "http://www.vlerick.com/masters"
        }
      ]
    }
  },
  {
    "id": 11,
    "booth_number": 11,
    "coords": {
      "type": "rect",
      "x": 425.27,
      "y": 174.86,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-11",
    "company": {
      "id": "company-11",
      "name": "Jan De Nul",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/jandenul.com",
      "short_description": "Jan De Nul is presenting at VTK Jobfair 2026. Visit booth 11 to connect!",
      "long_description": "Jan De Nul is participating in the annual VTK Jobfair. Stop by stand 11 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 11",
      "website": "https://www.jandenul.com/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-11-1",
          "first_name": "Basile",
          "last_name": "Dewaegenaere",
          "title": "Representative",
          "email": "basile.dewaegenaere@jandenul.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-11-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.jandenul.com/"
        },
        {
          "id": "vac-11-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.jandenul.com/"
        }
      ]
    }
  },
  {
    "id": 12,
    "booth_number": 12,
    "coords": {
      "type": "rect",
      "x": 442.68,
      "y": 174.86,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-12",
    "company": {
      "id": "company-12",
      "name": "Witteveen+Bos Belgium NV",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/witteveenbos.com",
      "short_description": "Witteveen+Bos Belgium NV is presenting at VTK Jobfair 2026. Visit booth 12 to connect!",
      "long_description": "Witteveen+Bos Belgium NV is participating in the annual VTK Jobfair. Stop by stand 12 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 12",
      "website": "https://www.witteveenbos.com/",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-12-1",
          "first_name": "Charlotte",
          "last_name": "De Deken",
          "title": "Representative",
          "email": "charlotte.dedeken@witteveenbosbelgiumnv.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-12-2",
          "first_name": "Nicolas",
          "last_name": "Van Grimberge",
          "title": "Representative",
          "email": "nicolas.vangrimberge@witteveenbosbelgiumnv.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-12-3",
          "first_name": "Ilka",
          "last_name": "Bruynkens",
          "title": "Representative",
          "email": "ilka.bruynkens@witteveenbosbelgiumnv.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-12-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.witteveenbos.com/"
        },
        {
          "id": "vac-12-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.witteveenbos.com/"
        }
      ]
    }
  },
  {
    "id": 13,
    "booth_number": 13,
    "coords": {
      "type": "rect",
      "x": 460.08,
      "y": 174.86,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-13",
    "company": {
      "id": "company-13",
      "name": "Bank Van Breda",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/jobs.bankvanbreda.be",
      "short_description": "Bank Van Breda is presenting at VTK Jobfair 2026. Visit booth 13 to connect!",
      "long_description": "Bank Van Breda is participating in the annual VTK Jobfair. Stop by stand 13 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 13",
      "website": "https://jobs.bankvanbreda.be/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 5,
          "name": "Nanowetenschappen & Nanotechnologie",
          "short_name": "NANO"
        },
        {
          "id": 10,
          "name": "Biomedische Technologie",
          "short_name": "BMT"
        }
      ],
      "representatives": [
        {
          "id": "rep-13-1",
          "first_name": "Lise",
          "last_name": "Mylemans",
          "title": "Representative",
          "email": "lise.mylemans@bankvanbreda.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-13-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://jobs.bankvanbreda.be/"
        },
        {
          "id": "vac-13-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://jobs.bankvanbreda.be/"
        }
      ]
    }
  },
  {
    "id": 14,
    "booth_number": 14,
    "coords": {
      "type": "rect",
      "x": 477.49,
      "y": 174.86,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-14",
    "company": {
      "id": "company-14",
      "name": "European Commodities",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/europeancommodities.eu",
      "short_description": "European Commodities is presenting at VTK Jobfair 2026. Visit booth 14 to connect!",
      "long_description": "European Commodities is participating in the annual VTK Jobfair. Stop by stand 14 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 14",
      "website": "https://www.europeancommodities.eu/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-14-1",
          "first_name": "Florence",
          "last_name": "Carette",
          "title": "Representative",
          "email": "florence.carette@europeancommodities.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-14-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.europeancommodities.eu/"
        },
        {
          "id": "vac-14-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.europeancommodities.eu/"
        }
      ]
    }
  },
  {
    "id": 15,
    "booth_number": 15,
    "coords": {
      "type": "rect",
      "x": 494.89,
      "y": 174.86,
      "width": 17.41,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-15",
    "company": {
      "id": "company-15",
      "name": "KPMG",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/kpmg.com",
      "short_description": "KPMG is presenting at VTK Jobfair 2026. Visit booth 15 to connect!",
      "long_description": "KPMG is participating in the annual VTK Jobfair. Stop by stand 15 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 15",
      "website": "https://kpmg.com/be/en/home/careers.html",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-15-1",
          "first_name": "Em",
          "last_name": "Drijkoningen",
          "title": "Representative",
          "email": "em.drijkoningen@kpmg.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-15-2",
          "first_name": "Tessa",
          "last_name": "Thomassen",
          "title": "Representative",
          "email": "tessa.thomassen@kpmg.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-15-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://kpmg.com/be/en/home/careers.html"
        },
        {
          "id": "vac-15-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://kpmg.com/be/en/home/careers.html"
        }
      ]
    }
  },
  {
    "id": 16,
    "booth_number": 16,
    "coords": {
      "type": "rect",
      "x": 512.29,
      "y": 174.86,
      "width": 17.41,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-16",
    "company": {
      "id": "company-16",
      "name": "U2U",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/u2u.be",
      "short_description": "U2U is presenting at VTK Jobfair 2026. Visit booth 16 to connect!",
      "long_description": "U2U is participating in the annual VTK Jobfair. Stop by stand 16 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 16",
      "website": "https://www.u2u.be",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        }
      ],
      "representatives": [
        {
          "id": "rep-16-1",
          "first_name": "Lieven",
          "last_name": "Iliano",
          "title": "Representative",
          "email": "lieven.iliano@u2u.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-16-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.u2u.be"
        },
        {
          "id": "vac-16-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.u2u.be"
        }
      ]
    }
  },
  {
    "id": 17,
    "booth_number": 17,
    "coords": {
      "type": "rect",
      "x": 529.7,
      "y": 174.86,
      "width": 17.41,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-17",
    "company": {
      "id": "company-17",
      "name": "N.V. Strabag Belgium",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/karriere.strabag.com",
      "short_description": "N.V. Strabag Belgium is presenting at VTK Jobfair 2026. Visit booth 17 to connect!",
      "long_description": "N.V. Strabag Belgium is participating in the annual VTK Jobfair. Stop by stand 17 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 17",
      "website": "https://karriere.strabag.com/be",
      "category": [
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        }
      ],
      "representatives": [
        {
          "id": "rep-17-1",
          "first_name": "Valerie",
          "last_name": "Olivier",
          "title": "Representative",
          "email": "valerie.olivier@nvstrabagbelgium.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-17-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://karriere.strabag.com/be"
        },
        {
          "id": "vac-17-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://karriere.strabag.com/be"
        }
      ]
    }
  },
  {
    "id": 18,
    "booth_number": 18,
    "coords": {
      "type": "rect",
      "x": 240.38,
      "y": 199.87,
      "width": 17.41,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-18",
    "company": {
      "id": "company-18",
      "name": "Air Liquide",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/be.airliquide.com",
      "short_description": "Air Liquide is presenting at VTK Jobfair 2026. Visit booth 18 to connect!",
      "long_description": "Air Liquide is participating in the annual VTK Jobfair. Stop by stand 18 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 18",
      "website": "https://be.airliquide.com/nl",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-18-1",
          "first_name": "Ellie",
          "last_name": "Depape",
          "title": "Representative",
          "email": "ellie.depape@airliquide.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-18-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://be.airliquide.com/nl"
        },
        {
          "id": "vac-18-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://be.airliquide.com/nl"
        }
      ]
    }
  },
  {
    "id": 19,
    "booth_number": 19,
    "coords": {
      "type": "rect",
      "x": 257.78,
      "y": 199.87,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-19",
    "company": {
      "id": "company-19",
      "name": "Benton",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/benton.be",
      "short_description": "Benton is presenting at VTK Jobfair 2026. Visit booth 19 to connect!",
      "long_description": "Benton is participating in the annual VTK Jobfair. Stop by stand 19 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 19",
      "website": "https://www.benton.be",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-19-1",
          "first_name": "Demi",
          "last_name": "Valkaert",
          "title": "Representative",
          "email": "demi.valkaert@benton.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-19-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.benton.be"
        },
        {
          "id": "vac-19-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.benton.be"
        }
      ]
    }
  },
  {
    "id": 20,
    "booth_number": 20,
    "coords": {
      "type": "rect",
      "x": 275.19,
      "y": 199.87,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-20",
    "company": {
      "id": "company-20",
      "name": "Segments.ai",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/segments.ai",
      "short_description": "Segments.ai is presenting at VTK Jobfair 2026. Visit booth 20 to connect!",
      "long_description": "Segments.ai is participating in the annual VTK Jobfair. Stop by stand 20 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 20",
      "website": "https://segments.ai",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        }
      ],
      "representatives": [
        {
          "id": "rep-20-1",
          "first_name": "Bert",
          "last_name": "De Brabandere",
          "title": "Representative",
          "email": "bert.debrabandere@segmentsai.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-20-2",
          "first_name": "Tom",
          "last_name": "Staelens",
          "title": "Representative",
          "email": "tom.staelens@segmentsai.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-20-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://segments.ai"
        },
        {
          "id": "vac-20-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://segments.ai"
        }
      ]
    }
  },
  {
    "id": 21,
    "booth_number": 21,
    "coords": {
      "type": "rect",
      "x": 292.59,
      "y": 199.87,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-21",
    "company": {
      "id": "company-21",
      "name": "BPC Group",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/bpcgroup.be",
      "short_description": "BPC Group is presenting at VTK Jobfair 2026. Visit booth 21 to connect!",
      "long_description": "BPC Group is participating in the annual VTK Jobfair. Stop by stand 21 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 21",
      "website": "https://bpcgroup.be/nl/",
      "category": [
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        }
      ],
      "representatives": [
        {
          "id": "rep-21-1",
          "first_name": "Anaïs",
          "last_name": "Neysen",
          "title": "Representative",
          "email": "anaïs.neysen@bpcgroup.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-21-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://bpcgroup.be/nl/"
        },
        {
          "id": "vac-21-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://bpcgroup.be/nl/"
        }
      ]
    }
  },
  {
    "id": 22,
    "booth_number": 22,
    "coords": {
      "type": "rect",
      "x": 310,
      "y": 199.87,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-22",
    "company": {
      "id": "company-22",
      "name": "Arcadis Belgium",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/arcadis.com",
      "short_description": "Arcadis Belgium is presenting at VTK Jobfair 2026. Visit booth 22 to connect!",
      "long_description": "Arcadis Belgium is participating in the annual VTK Jobfair. Stop by stand 22 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 22",
      "website": "https://www.arcadis.com/nl-be",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-22-1",
          "first_name": "Richelle",
          "last_name": "van Houte",
          "title": "Representative",
          "email": "richelle.vanhoute@arcadisbelgium.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-22-2",
          "first_name": "Hollie",
          "last_name": "Valler",
          "title": "Representative",
          "email": "hollie.valler@arcadisbelgium.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-22-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.arcadis.com/nl-be"
        },
        {
          "id": "vac-22-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.arcadis.com/nl-be"
        }
      ]
    }
  },
  {
    "id": 23,
    "booth_number": 23,
    "coords": {
      "type": "rect",
      "x": 327.4,
      "y": 199.87,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-23",
    "company": {
      "id": "company-23",
      "name": "Arvesta BV",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/arvesta.eu",
      "short_description": "Arvesta BV is presenting at VTK Jobfair 2026. Visit booth 23 to connect!",
      "long_description": "Arvesta BV is participating in the annual VTK Jobfair. Stop by stand 23 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 23",
      "website": "https://www.arvesta.eu",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-23-1",
          "first_name": "Louise",
          "last_name": "De Wulf",
          "title": "Representative",
          "email": "louise.dewulf@arvestabv.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-23-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.arvesta.eu"
        },
        {
          "id": "vac-23-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.arvesta.eu"
        }
      ]
    }
  },
  {
    "id": 24,
    "booth_number": 24,
    "coords": {
      "type": "rect",
      "x": 344.81,
      "y": 199.87,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-24",
    "company": {
      "id": "company-24",
      "name": "NV ARCELORMITTAL BELGIUM",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/belgium.arcelormittal.com",
      "short_description": "NV ARCELORMITTAL BELGIUM is presenting at VTK Jobfair 2026. Visit booth 24 to connect!",
      "long_description": "NV ARCELORMITTAL BELGIUM is participating in the annual VTK Jobfair. Stop by stand 24 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 24",
      "website": "https://belgium.arcelormittal.com/jobs-van-staal",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        }
      ],
      "representatives": [
        {
          "id": "rep-24-1",
          "first_name": "Charlotte",
          "last_name": "Gillis",
          "title": "Representative",
          "email": "charlotte.gillis@nvarcelormittalbelgium.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-24-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://belgium.arcelormittal.com/jobs-van-staal"
        },
        {
          "id": "vac-24-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://belgium.arcelormittal.com/jobs-van-staal"
        }
      ]
    }
  },
  {
    "id": 25,
    "booth_number": 25,
    "coords": {
      "type": "rect",
      "x": 362.21,
      "y": 199.87,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-25",
    "company": {
      "id": "company-25",
      "name": "Aquafin",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/jobs.aquafin.be",
      "short_description": "Aquafin is presenting at VTK Jobfair 2026. Visit booth 25 to connect!",
      "long_description": "Aquafin is participating in the annual VTK Jobfair. Stop by stand 25 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 25",
      "website": "https://jobs.aquafin.be/go/Projectmanagement/9456155/",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-25-1",
          "first_name": "Johan",
          "last_name": "Thielemans",
          "title": "Representative",
          "email": "johan.thielemans@aquafin.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-25-2",
          "first_name": "Sofie",
          "last_name": "Van Meir",
          "title": "Representative",
          "email": "sofie.vanmeir@aquafin.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-25-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://jobs.aquafin.be/go/Projectmanagement/9456155/"
        },
        {
          "id": "vac-25-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://jobs.aquafin.be/go/Projectmanagement/9456155/"
        }
      ]
    }
  },
  {
    "id": 26,
    "booth_number": 26,
    "coords": {
      "type": "rect",
      "x": 398.61,
      "y": 199.87,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-26",
    "company": {
      "id": "company-26",
      "name": "Reynaers Aluminium",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/reynaers.be",
      "short_description": "Reynaers Aluminium is presenting at VTK Jobfair 2026. Visit booth 26 to connect!",
      "long_description": "Reynaers Aluminium is participating in the annual VTK Jobfair. Stop by stand 26 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 26",
      "website": "https://www.reynaers.be/",
      "category": [
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-26-1",
          "first_name": "Michaël",
          "last_name": "Schelfhout",
          "title": "Representative",
          "email": "michaël.schelfhout@reynaersaluminium.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-26-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.reynaers.be/"
        },
        {
          "id": "vac-26-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.reynaers.be/"
        }
      ]
    }
  },
  {
    "id": 27,
    "booth_number": 27,
    "coords": {
      "type": "rect",
      "x": 416.01,
      "y": 199.87,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-27",
    "company": {
      "id": "company-27",
      "name": "TotalEnergies",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/totalenergies.com",
      "short_description": "TotalEnergies is presenting at VTK Jobfair 2026. Visit booth 27 to connect!",
      "long_description": "TotalEnergies is participating in the annual VTK Jobfair. Stop by stand 27 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 27",
      "website": "https://totalenergies.com/",
      "category": [
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        }
      ],
      "representatives": [
        {
          "id": "rep-27-1",
          "first_name": "Christelle",
          "last_name": "Draize",
          "title": "Representative",
          "email": "christelle.draize@totalenergies.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-27-2",
          "first_name": "Pascal",
          "last_name": "De Crem",
          "title": "Representative",
          "email": "pascal.decrem@totalenergies.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-27-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://totalenergies.com/"
        },
        {
          "id": "vac-27-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://totalenergies.com/"
        }
      ]
    }
  },
  {
    "id": 28,
    "booth_number": 28,
    "coords": {
      "type": "rect",
      "x": 433.42,
      "y": 199.87,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-28",
    "company": {
      "id": "company-28",
      "name": "PM Group",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/pmgroup-global.com",
      "short_description": "PM Group is presenting at VTK Jobfair 2026. Visit booth 28 to connect!",
      "long_description": "PM Group is participating in the annual VTK Jobfair. Stop by stand 28 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 28",
      "website": "https://www.pmgroup-global.com/",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        }
      ],
      "representatives": [
        {
          "id": "rep-28-1",
          "first_name": "Else",
          "last_name": "Boriau",
          "title": "Representative",
          "email": "else.boriau@pmgroup.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-28-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.pmgroup-global.com/"
        },
        {
          "id": "vac-28-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.pmgroup-global.com/"
        }
      ]
    }
  },
  {
    "id": 29,
    "booth_number": 29,
    "coords": {
      "type": "rect",
      "x": 450.82,
      "y": 199.87,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-29",
    "company": {
      "id": "company-29",
      "name": "Eiffage Energie Systèmes",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/eiffageenergiesystemes.be",
      "short_description": "Eiffage Energie Systèmes is presenting at VTK Jobfair 2026. Visit booth 29 to connect!",
      "long_description": "Eiffage Energie Systèmes is participating in the annual VTK Jobfair. Stop by stand 29 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 29",
      "website": "https://eiffageenergiesystemes.be/nl/",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-29-1",
          "first_name": "Maud",
          "last_name": "André",
          "title": "Representative",
          "email": "maud.andré@eiffageenergiesystmes.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-29-2",
          "first_name": "Maud",
          "last_name": "André",
          "title": "Representative",
          "email": "maud.andré@eiffageenergiesystmes.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-29-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://eiffageenergiesystemes.be/nl/"
        },
        {
          "id": "vac-29-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://eiffageenergiesystemes.be/nl/"
        }
      ]
    }
  },
  {
    "id": 30,
    "booth_number": 30,
    "coords": {
      "type": "rect",
      "x": 468.23,
      "y": 199.87,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-30",
    "company": {
      "id": "company-30",
      "name": "Toyota Motor Europe",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/toyota-europe.com",
      "short_description": "Toyota Motor Europe is presenting at VTK Jobfair 2026. Visit booth 30 to connect!",
      "long_description": "Toyota Motor Europe is participating in the annual VTK Jobfair. Stop by stand 30 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 30",
      "website": "https://www.toyota-europe.com/careers",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 5,
          "name": "Nanowetenschappen & Nanotechnologie",
          "short_name": "NANO"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        }
      ],
      "representatives": [
        {
          "id": "rep-30-1",
          "first_name": "Naomi",
          "last_name": "Solvus",
          "title": "Representative",
          "email": "naomi.solvus@toyotamotoreurope.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-30-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.toyota-europe.com/careers"
        },
        {
          "id": "vac-30-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.toyota-europe.com/careers"
        }
      ]
    }
  },
  {
    "id": 31,
    "booth_number": 31,
    "coords": {
      "type": "rect",
      "x": 485.63,
      "y": 199.87,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-31",
    "company": {
      "id": "company-31",
      "name": "Indaver",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/indaver.com",
      "short_description": "Indaver is presenting at VTK Jobfair 2026. Visit booth 31 to connect!",
      "long_description": "Indaver is participating in the annual VTK Jobfair. Stop by stand 31 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 31",
      "website": "https://indaver.com/",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-31-1",
          "first_name": "Charlotte",
          "last_name": "Leyseele",
          "title": "Representative",
          "email": "charlotte.leyseele@indaver.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-31-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://indaver.com/"
        },
        {
          "id": "vac-31-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://indaver.com/"
        }
      ]
    }
  },
  {
    "id": 32,
    "booth_number": 32,
    "coords": {
      "type": "rect",
      "x": 503.04,
      "y": 199.87,
      "width": 17.41,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-32",
    "company": {
      "id": "company-32",
      "name": "Antwerp Management School",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/antwerpmanagementschool.be",
      "short_description": "Antwerp Management School is presenting at VTK Jobfair 2026. Visit booth 32 to connect!",
      "long_description": "Antwerp Management School is participating in the annual VTK Jobfair. Stop by stand 32 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 32",
      "website": "https://www.antwerpmanagementschool.be/en/program/full-time-masters-programs",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 5,
          "name": "Nanowetenschappen & Nanotechnologie",
          "short_name": "NANO"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 10,
          "name": "Biomedische Technologie",
          "short_name": "BMT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-32-1",
          "first_name": "Julie",
          "last_name": "Hillewaert",
          "title": "Representative",
          "email": "julie.hillewaert@antwerpmanagementschool.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-32-2",
          "first_name": "Full",
          "last_name": "Time Masters",
          "title": "Representative",
          "email": "full.timemasters@antwerpmanagementschool.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-32-3",
          "first_name": "Eva",
          "last_name": "Peeters",
          "title": "Representative",
          "email": "eva.peeters@antwerpmanagementschool.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-32-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.antwerpmanagementschool.be/en/program/full-time-masters-programs"
        },
        {
          "id": "vac-32-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.antwerpmanagementschool.be/en/program/full-time-masters-programs"
        }
      ]
    }
  },
  {
    "id": 33,
    "booth_number": 33,
    "coords": {
      "type": "rect",
      "x": 520.44,
      "y": 199.87,
      "width": 17.41,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-33",
    "company": {
      "id": "company-33",
      "name": "Open Analytics NV",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/openanalytics.eu",
      "short_description": "Open Analytics NV is presenting at VTK Jobfair 2026. Visit booth 33 to connect!",
      "long_description": "Open Analytics NV is participating in the annual VTK Jobfair. Stop by stand 33 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 33",
      "website": "https://www.openanalytics.eu",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        }
      ],
      "representatives": [
        {
          "id": "rep-33-1",
          "first_name": "Matthias",
          "last_name": "Verbeke",
          "title": "Representative",
          "email": "matthias.verbeke@openanalyticsnv.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-33-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.openanalytics.eu"
        },
        {
          "id": "vac-33-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.openanalytics.eu"
        }
      ]
    }
  },
  {
    "id": 34,
    "booth_number": 34,
    "coords": {
      "type": "rect",
      "x": 240.38,
      "y": 213.3,
      "width": 17.41,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-34",
    "company": {
      "id": "company-34",
      "name": "BV Superlinear",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/superlinear.eu",
      "short_description": "BV Superlinear is presenting at VTK Jobfair 2026. Visit booth 34 to connect!",
      "long_description": "BV Superlinear is participating in the annual VTK Jobfair. Stop by stand 34 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 34",
      "website": "https://superlinear.eu/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        }
      ],
      "representatives": [
        {
          "id": "rep-34-1",
          "first_name": "Célia",
          "last_name": "Van Wymersch",
          "title": "Representative",
          "email": "célia.vanwymersch@bvsuperlinear.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-34-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://superlinear.eu/"
        },
        {
          "id": "vac-34-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://superlinear.eu/"
        }
      ]
    }
  },
  {
    "id": 35,
    "booth_number": 35,
    "coords": {
      "type": "rect",
      "x": 257.78,
      "y": 213.3,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-35",
    "company": {
      "id": "company-35",
      "name": "Revolut",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/revolut.com",
      "short_description": "Revolut is presenting at VTK Jobfair 2026. Visit booth 35 to connect!",
      "long_description": "Revolut is participating in the annual VTK Jobfair. Stop by stand 35 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 35",
      "website": "https://www.revolut.com/en-BE/talent-programmes/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 5,
          "name": "Nanowetenschappen & Nanotechnologie",
          "short_name": "NANO"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        }
      ],
      "representatives": [
        {
          "id": "rep-35-1",
          "first_name": "Rui",
          "last_name": "Mendes",
          "title": "Representative",
          "email": "rui.mendes@revolut.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-35-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.revolut.com/en-BE/talent-programmes/"
        },
        {
          "id": "vac-35-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.revolut.com/en-BE/talent-programmes/"
        }
      ]
    }
  },
  {
    "id": 36,
    "booth_number": 36,
    "coords": {
      "type": "rect",
      "x": 275.19,
      "y": 213.3,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-36",
    "company": {
      "id": "company-36",
      "name": "PwC",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/pwc.be",
      "short_description": "PwC is presenting at VTK Jobfair 2026. Visit booth 36 to connect!",
      "long_description": "PwC is participating in the annual VTK Jobfair. Stop by stand 36 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 36",
      "website": "https://www.pwc.be/en/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-36-1",
          "first_name": "Amandine",
          "last_name": "Descamps",
          "title": "Representative",
          "email": "amandine.descamps@pwc.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-36-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.pwc.be/en/"
        },
        {
          "id": "vac-36-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.pwc.be/en/"
        }
      ]
    }
  },
  {
    "id": 37,
    "booth_number": 37,
    "coords": {
      "type": "rect",
      "x": 292.59,
      "y": 213.3,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-37",
    "company": {
      "id": "company-37",
      "name": "Solvay",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/solvay.com",
      "short_description": "Solvay is presenting at VTK Jobfair 2026. Visit booth 37 to connect!",
      "long_description": "Solvay is participating in the annual VTK Jobfair. Stop by stand 37 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 37",
      "website": "https://www.solvay.com/en/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 5,
          "name": "Nanowetenschappen & Nanotechnologie",
          "short_name": "NANO"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-37-1",
          "first_name": "Gregory",
          "last_name": "Moens",
          "title": "Representative",
          "email": "gregory.moens@solvay.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-37-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.solvay.com/en/"
        },
        {
          "id": "vac-37-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.solvay.com/en/"
        }
      ]
    }
  },
  {
    "id": 38,
    "booth_number": 38,
    "coords": {
      "type": "rect",
      "x": 310,
      "y": 213.3,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-38",
    "company": {
      "id": "company-38",
      "name": "Renotec",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/renotec.be",
      "short_description": "Renotec is presenting at VTK Jobfair 2026. Visit booth 38 to connect!",
      "long_description": "Renotec is participating in the annual VTK Jobfair. Stop by stand 38 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 38",
      "website": "https://renotec.be/",
      "category": [
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-38-1",
          "first_name": "Leonie",
          "last_name": "Verreydt",
          "title": "Representative",
          "email": "leonie.verreydt@renotec.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-38-2",
          "first_name": "Imca",
          "last_name": "Beckers",
          "title": "Representative",
          "email": "imca.beckers@renotec.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-38-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://renotec.be/"
        },
        {
          "id": "vac-38-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://renotec.be/"
        }
      ]
    }
  },
  {
    "id": 39,
    "booth_number": 39,
    "coords": {
      "type": "rect",
      "x": 327.4,
      "y": 213.3,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-39",
    "company": {
      "id": "company-39",
      "name": "Renotec",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/renotec.be",
      "short_description": "Renotec is presenting at VTK Jobfair 2026. Visit booth 39 to connect!",
      "long_description": "Renotec is participating in the annual VTK Jobfair. Stop by stand 39 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 39",
      "website": "https://renotec.be/",
      "category": [
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-39-1",
          "first_name": "Leonie",
          "last_name": "Verreydt",
          "title": "Representative",
          "email": "leonie.verreydt@renotec.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-39-2",
          "first_name": "Imca",
          "last_name": "Beckers",
          "title": "Representative",
          "email": "imca.beckers@renotec.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-39-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://renotec.be/"
        },
        {
          "id": "vac-39-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://renotec.be/"
        }
      ]
    }
  },
  {
    "id": 40,
    "booth_number": 40,
    "coords": {
      "type": "rect",
      "x": 344.81,
      "y": 213.3,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-40",
    "company": {
      "id": "company-40",
      "name": "Guardsquare",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/guardsquare.com",
      "short_description": "Guardsquare is presenting at VTK Jobfair 2026. Visit booth 40 to connect!",
      "long_description": "Guardsquare is participating in the annual VTK Jobfair. Stop by stand 40 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 40",
      "website": "https://www.guardsquare.com/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        }
      ],
      "representatives": [
        {
          "id": "rep-40-1",
          "first_name": "Marjorie",
          "last_name": "Maréchal",
          "title": "Representative",
          "email": "marjorie.maréchal@guardsquare.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-40-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.guardsquare.com/"
        },
        {
          "id": "vac-40-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.guardsquare.com/"
        }
      ]
    }
  },
  {
    "id": 41,
    "booth_number": 41,
    "coords": {
      "type": "rect",
      "x": 362.21,
      "y": 213.3,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-41",
    "company": {
      "id": "company-41",
      "name": "AE | Partner in Digital Excellence",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/ae.be",
      "short_description": "AE | Partner in Digital Excellence is presenting at VTK Jobfair 2026. Visit booth 41 to connect!",
      "long_description": "AE | Partner in Digital Excellence is participating in the annual VTK Jobfair. Stop by stand 41 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 41",
      "website": "https://www.ae.be/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        }
      ],
      "representatives": [
        {
          "id": "rep-41-1",
          "first_name": "Caithlin",
          "last_name": "Van Dorpe",
          "title": "Representative",
          "email": "caithlin.vandorpe@aepartnerindigitalexcellence.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-41-2",
          "first_name": "Elise",
          "last_name": "Ganne",
          "title": "Representative",
          "email": "elise.ganne@aepartnerindigitalexcellence.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-41-3",
          "first_name": "Manuel",
          "last_name": "Verhaest",
          "title": "Representative",
          "email": "manuel.verhaest@aepartnerindigitalexcellence.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-41-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.ae.be/"
        },
        {
          "id": "vac-41-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.ae.be/"
        }
      ]
    }
  },
  {
    "id": 42,
    "booth_number": 42,
    "coords": {
      "type": "rect",
      "x": 398.61,
      "y": 213.3,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-42",
    "company": {
      "id": "company-42",
      "name": "irex Consulting",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/irex-consulting.com",
      "short_description": "irex Consulting is presenting at VTK Jobfair 2026. Visit booth 42 to connect!",
      "long_description": "irex Consulting is participating in the annual VTK Jobfair. Stop by stand 42 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 42",
      "website": "https://irex-consulting.com/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 10,
          "name": "Biomedische Technologie",
          "short_name": "BMT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        }
      ],
      "representatives": [
        {
          "id": "rep-42-1",
          "first_name": "Philippe",
          "last_name": "Delaruelle",
          "title": "Representative",
          "email": "philippe.delaruelle@irexconsulting.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-42-2",
          "first_name": "Ludovic",
          "last_name": "Van Cauwenbergh",
          "title": "Representative",
          "email": "ludovic.vancauwenbergh@irexconsulting.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-42-3",
          "first_name": "Eduard",
          "last_name": "De Cnijf",
          "title": "Representative",
          "email": "eduard.decnijf@irexconsulting.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-42-4",
          "first_name": "Wout",
          "last_name": "Joris",
          "title": "Representative",
          "email": "wout.joris@irexconsulting.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-42-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://irex-consulting.com/"
        },
        {
          "id": "vac-42-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://irex-consulting.com/"
        }
      ]
    }
  },
  {
    "id": 43,
    "booth_number": 43,
    "coords": {
      "type": "rect",
      "x": 416.01,
      "y": 213.3,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-43",
    "company": {
      "id": "company-43",
      "name": "Medtronic - Articulating Technologies",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/medtronic.com",
      "short_description": "Medtronic - Articulating Technologies is presenting at VTK Jobfair 2026. Visit booth 43 to connect!",
      "long_description": "Medtronic - Articulating Technologies is participating in the annual VTK Jobfair. Stop by stand 43 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 43",
      "website": "https://www.medtronic.com/nl-nl/index.html",
      "category": [
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 10,
          "name": "Biomedische Technologie",
          "short_name": "BMT"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        }
      ],
      "representatives": [
        {
          "id": "rep-43-1",
          "first_name": "Ezra",
          "last_name": "Erens",
          "title": "Representative",
          "email": "ezra.erens@medtronicarticulatingtechnologies.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-43-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.medtronic.com/nl-nl/index.html"
        },
        {
          "id": "vac-43-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.medtronic.com/nl-nl/index.html"
        }
      ]
    }
  },
  {
    "id": 44,
    "booth_number": 44,
    "coords": {
      "type": "rect",
      "x": 433.42,
      "y": 213.3,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-44",
    "company": {
      "id": "company-44",
      "name": "Sweco",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/swecobelgium.be",
      "short_description": "Sweco is presenting at VTK Jobfair 2026. Visit booth 44 to connect!",
      "long_description": "Sweco is participating in the annual VTK Jobfair. Stop by stand 44 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 44",
      "website": "https://www.swecobelgium.be/",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        }
      ],
      "representatives": [
        {
          "id": "rep-44-1",
          "first_name": "Sofie",
          "last_name": "Nauwelaerts",
          "title": "Representative",
          "email": "sofie.nauwelaerts@sweco.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-44-2",
          "first_name": "Evelien",
          "last_name": "Neerinckx",
          "title": "Representative",
          "email": "evelien.neerinckx@sweco.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-44-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.swecobelgium.be/"
        },
        {
          "id": "vac-44-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.swecobelgium.be/"
        }
      ]
    }
  },
  {
    "id": 45,
    "booth_number": 45,
    "coords": {
      "type": "rect",
      "x": 450.82,
      "y": 213.3,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-45",
    "company": {
      "id": "company-45",
      "name": "Sweco",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/swecobelgium.be",
      "short_description": "Sweco is presenting at VTK Jobfair 2026. Visit booth 45 to connect!",
      "long_description": "Sweco is participating in the annual VTK Jobfair. Stop by stand 45 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 45",
      "website": "https://www.swecobelgium.be/",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        }
      ],
      "representatives": [
        {
          "id": "rep-45-1",
          "first_name": "Sofie",
          "last_name": "Nauwelaerts",
          "title": "Representative",
          "email": "sofie.nauwelaerts@sweco.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-45-2",
          "first_name": "Evelien",
          "last_name": "Neerinckx",
          "title": "Representative",
          "email": "evelien.neerinckx@sweco.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-45-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.swecobelgium.be/"
        },
        {
          "id": "vac-45-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.swecobelgium.be/"
        }
      ]
    }
  },
  {
    "id": 46,
    "booth_number": 46,
    "coords": {
      "type": "rect",
      "x": 468.23,
      "y": 213.3,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-46",
    "company": {
      "id": "company-46",
      "name": "Cegeka",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/cegeka.com",
      "short_description": "Cegeka is presenting at VTK Jobfair 2026. Visit booth 46 to connect!",
      "long_description": "Cegeka is participating in the annual VTK Jobfair. Stop by stand 46 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 46",
      "website": "https://www.cegeka.com/en/be/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 10,
          "name": "Biomedische Technologie",
          "short_name": "BMT"
        }
      ],
      "representatives": [
        {
          "id": "rep-46-1",
          "first_name": "Ellen",
          "last_name": "Brans",
          "title": "Representative",
          "email": "ellen.brans@cegeka.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-46-2",
          "first_name": "Sarah",
          "last_name": "Steenbergen",
          "title": "Representative",
          "email": "sarah.steenbergen@cegeka.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-46-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.cegeka.com/en/be/"
        },
        {
          "id": "vac-46-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.cegeka.com/en/be/"
        }
      ]
    }
  },
  {
    "id": 47,
    "booth_number": 47,
    "coords": {
      "type": "rect",
      "x": 485.63,
      "y": 213.3,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-47",
    "company": {
      "id": "company-47",
      "name": "QbD Group",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/qbdgroup.com",
      "short_description": "QbD Group is presenting at VTK Jobfair 2026. Visit booth 47 to connect!",
      "long_description": "QbD Group is participating in the annual VTK Jobfair. Stop by stand 47 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 47",
      "website": "https://www.qbdgroup.com/en/",
      "category": [
        {
          "id": 10,
          "name": "Biomedische Technologie",
          "short_name": "BMT"
        }
      ],
      "representatives": [
        {
          "id": "rep-47-1",
          "first_name": "Elke",
          "last_name": "Binst",
          "title": "Representative",
          "email": "elke.binst@qbdgroup.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-47-2",
          "first_name": "Elly",
          "last_name": "De Bruyn",
          "title": "Representative",
          "email": "elly.debruyn@qbdgroup.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-47-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.qbdgroup.com/en/"
        },
        {
          "id": "vac-47-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.qbdgroup.com/en/"
        }
      ]
    }
  },
  {
    "id": 48,
    "booth_number": 48,
    "coords": {
      "type": "rect",
      "x": 503.04,
      "y": 213.3,
      "width": 17.41,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-48",
    "company": {
      "id": "company-48",
      "name": "Defensie",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/mil.be",
      "short_description": "Defensie is presenting at VTK Jobfair 2026. Visit booth 48 to connect!",
      "long_description": "Defensie is participating in the annual VTK Jobfair. Stop by stand 48 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 48",
      "website": "https://www.mil.be/nl/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        }
      ],
      "representatives": [
        {
          "id": "rep-48-1",
          "first_name": "Matthias",
          "last_name": "Bruneel",
          "title": "Representative",
          "email": "matthias.bruneel@defensie.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-48-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.mil.be/nl/"
        },
        {
          "id": "vac-48-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.mil.be/nl/"
        }
      ]
    }
  },
  {
    "id": 49,
    "booth_number": 49,
    "coords": {
      "type": "rect",
      "x": 520.44,
      "y": 213.3,
      "width": 17.41,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-49",
    "company": {
      "id": "company-49",
      "name": "HYE",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/hye.be",
      "short_description": "HYE is presenting at VTK Jobfair 2026. Visit booth 49 to connect!",
      "long_description": "HYE is participating in the annual VTK Jobfair. Stop by stand 49 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 49",
      "website": "https://www.hye.be/nl",
      "category": [
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-49-1",
          "first_name": "Siene",
          "last_name": "Van Goethem",
          "title": "Representative",
          "email": "siene.vangoethem@hye.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-49-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.hye.be/nl"
        },
        {
          "id": "vac-49-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.hye.be/nl"
        }
      ]
    }
  },
  {
    "id": 50,
    "booth_number": 50,
    "coords": {
      "type": "rect",
      "x": 240.38,
      "y": 245.51,
      "width": 17.41,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-50",
    "company": {
      "id": "company-50",
      "name": "OMP",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/omp.com",
      "short_description": "OMP is presenting at VTK Jobfair 2026. Visit booth 50 to connect!",
      "long_description": "OMP is participating in the annual VTK Jobfair. Stop by stand 50 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 50",
      "website": "https://www.omp.com/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        }
      ],
      "representatives": [
        {
          "id": "rep-50-1",
          "first_name": "Marie",
          "last_name": "Van Schoubroeck",
          "title": "Representative",
          "email": "marie.vanschoubroeck@omp.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-50-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.omp.com/"
        },
        {
          "id": "vac-50-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.omp.com/"
        }
      ]
    }
  },
  {
    "id": 51,
    "booth_number": 51,
    "coords": {
      "type": "rect",
      "x": 257.78,
      "y": 245.51,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-51",
    "company": {
      "id": "company-51",
      "name": "The Rechargers",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/the-rechargers.com",
      "short_description": "The Rechargers is presenting at VTK Jobfair 2026. Visit booth 51 to connect!",
      "long_description": "The Rechargers is participating in the annual VTK Jobfair. Stop by stand 51 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 51",
      "website": "https://the-rechargers.com/about-us/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-51-1",
          "first_name": "Vincent",
          "last_name": "Ramaekers",
          "title": "Representative",
          "email": "vincent.ramaekers@therechargers.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-51-2",
          "first_name": "Judith",
          "last_name": "Vermeulen",
          "title": "Representative",
          "email": "judith.vermeulen@therechargers.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-51-3",
          "first_name": "Jeroen",
          "last_name": "Gernay",
          "title": "Representative",
          "email": "jeroen.gernay@therechargers.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-51-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://the-rechargers.com/about-us/"
        },
        {
          "id": "vac-51-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://the-rechargers.com/about-us/"
        }
      ]
    }
  },
  {
    "id": 52,
    "booth_number": 52,
    "coords": {
      "type": "rect",
      "x": 275.19,
      "y": 245.51,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-52",
    "company": {
      "id": "company-52",
      "name": "ICsense",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/icsense.com",
      "short_description": "ICsense is presenting at VTK Jobfair 2026. Visit booth 52 to connect!",
      "long_description": "ICsense is participating in the annual VTK Jobfair. Stop by stand 52 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 52",
      "website": "https://www.icsense.com",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        }
      ],
      "representatives": [
        {
          "id": "rep-52-1",
          "first_name": "Marijke",
          "last_name": "Tuerlinckx",
          "title": "Representative",
          "email": "marijke.tuerlinckx@icsense.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-52-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.icsense.com"
        },
        {
          "id": "vac-52-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.icsense.com"
        }
      ]
    }
  },
  {
    "id": 53,
    "booth_number": 53,
    "coords": {
      "type": "rect",
      "x": 292.59,
      "y": 245.51,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-53",
    "company": {
      "id": "company-53",
      "name": "SUSQUEHANNA INTERNATIONAL GROUP LTD",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/sig.com",
      "short_description": "SUSQUEHANNA INTERNATIONAL GROUP LTD is presenting at VTK Jobfair 2026. Visit booth 53 to connect!",
      "long_description": "SUSQUEHANNA INTERNATIONAL GROUP LTD is participating in the annual VTK Jobfair. Stop by stand 53 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 53",
      "website": "https://sig.com/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 5,
          "name": "Nanowetenschappen & Nanotechnologie",
          "short_name": "NANO"
        }
      ],
      "representatives": [
        {
          "id": "rep-53-1",
          "first_name": "Rachel",
          "last_name": "Watters",
          "title": "Representative",
          "email": "rachel.watters@susquehannainternationalgroupltd.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-53-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://sig.com/"
        },
        {
          "id": "vac-53-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://sig.com/"
        }
      ]
    }
  },
  {
    "id": 54,
    "booth_number": 54,
    "coords": {
      "type": "rect",
      "x": 310,
      "y": 245.51,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-54",
    "company": {
      "id": "company-54",
      "name": "Artes Group",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/artesgroup.be",
      "short_description": "Artes Group is presenting at VTK Jobfair 2026. Visit booth 54 to connect!",
      "long_description": "Artes Group is participating in the annual VTK Jobfair. Stop by stand 54 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 54",
      "website": "https://artesgroup.be/",
      "category": [
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-54-1",
          "first_name": "Ellen",
          "last_name": "De Zutter",
          "title": "Representative",
          "email": "ellen.dezutter@artesgroup.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-54-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://artesgroup.be/"
        },
        {
          "id": "vac-54-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://artesgroup.be/"
        }
      ]
    }
  },
  {
    "id": 55,
    "booth_number": 55,
    "coords": {
      "type": "rect",
      "x": 327.4,
      "y": 245.51,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-55",
    "company": {
      "id": "company-55",
      "name": "Belfius",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/jobs.belfius.be",
      "short_description": "Belfius is presenting at VTK Jobfair 2026. Visit booth 55 to connect!",
      "long_description": "Belfius is participating in the annual VTK Jobfair. Stop by stand 55 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 55",
      "website": "https://jobs.belfius.be/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        }
      ],
      "representatives": [
        {
          "id": "rep-55-1",
          "first_name": "Liesbet",
          "last_name": "Evens",
          "title": "Representative",
          "email": "liesbet.evens@belfius.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-55-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://jobs.belfius.be/"
        },
        {
          "id": "vac-55-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://jobs.belfius.be/"
        }
      ]
    }
  },
  {
    "id": 56,
    "booth_number": 56,
    "coords": {
      "type": "rect",
      "x": 344.81,
      "y": 245.51,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-56",
    "company": {
      "id": "company-56",
      "name": "Proove",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/proove.eu",
      "short_description": "Proove is presenting at VTK Jobfair 2026. Visit booth 56 to connect!",
      "long_description": "Proove is participating in the annual VTK Jobfair. Stop by stand 56 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 56",
      "website": "https://www.proove.eu/",
      "category": [
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-56-1",
          "first_name": "Janina",
          "last_name": "Verbruggen",
          "title": "Representative",
          "email": "janina.verbruggen@proove.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-56-2",
          "first_name": "Evelien",
          "last_name": "De Zutter",
          "title": "Representative",
          "email": "evelien.dezutter@proove.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-56-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.proove.eu/"
        },
        {
          "id": "vac-56-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.proove.eu/"
        }
      ]
    }
  },
  {
    "id": 57,
    "booth_number": 57,
    "coords": {
      "type": "rect",
      "x": 362.21,
      "y": 245.51,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-57",
    "company": {
      "id": "company-57",
      "name": "Telenet group",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/careers.telenet.be",
      "short_description": "Telenet group is presenting at VTK Jobfair 2026. Visit booth 57 to connect!",
      "long_description": "Telenet group is participating in the annual VTK Jobfair. Stop by stand 57 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 57",
      "website": "https://careers.telenet.be",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        }
      ],
      "representatives": [
        {
          "id": "rep-57-1",
          "first_name": "Lore",
          "last_name": "Tessier",
          "title": "Representative",
          "email": "lore.tessier@telenetgroup.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-57-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://careers.telenet.be"
        },
        {
          "id": "vac-57-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://careers.telenet.be"
        }
      ]
    }
  },
  {
    "id": 58,
    "booth_number": 58,
    "coords": {
      "type": "rect",
      "x": 398.61,
      "y": 245.51,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-58",
    "company": {
      "id": "company-58",
      "name": "Green Island",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/greenisland.be",
      "short_description": "Green Island is presenting at VTK Jobfair 2026. Visit booth 58 to connect!",
      "long_description": "Green Island is participating in the annual VTK Jobfair. Stop by stand 58 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 58",
      "website": "https://greenisland.be/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        }
      ],
      "representatives": [
        {
          "id": "rep-58-1",
          "first_name": "Shotallo",
          "last_name": "Kato",
          "title": "Representative",
          "email": "shotallo.kato@greenisland.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-58-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://greenisland.be/"
        },
        {
          "id": "vac-58-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://greenisland.be/"
        }
      ]
    }
  },
  {
    "id": 59,
    "booth_number": 59,
    "coords": {
      "type": "rect",
      "x": 416.01,
      "y": 245.51,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-59",
    "company": {
      "id": "company-59",
      "name": "Tessenderlo Group",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/tessenderlo.com",
      "short_description": "Tessenderlo Group is presenting at VTK Jobfair 2026. Visit booth 59 to connect!",
      "long_description": "Tessenderlo Group is participating in the annual VTK Jobfair. Stop by stand 59 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 59",
      "website": "https://www.tessenderlo.com/en",
      "category": [
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 5,
          "name": "Nanowetenschappen & Nanotechnologie",
          "short_name": "NANO"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        }
      ],
      "representatives": [
        {
          "id": "rep-59-1",
          "first_name": "Emma",
          "last_name": "Bennouna",
          "title": "Representative",
          "email": "emma.bennouna@tessenderlogroup.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-59-2",
          "first_name": "Charlotte",
          "last_name": "Bloemen",
          "title": "Representative",
          "email": "charlotte.bloemen@tessenderlogroup.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-59-3",
          "first_name": "Frank",
          "last_name": "Timmermans",
          "title": "Representative",
          "email": "frank.timmermans@tessenderlogroup.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-59-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.tessenderlo.com/en"
        },
        {
          "id": "vac-59-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.tessenderlo.com/en"
        }
      ]
    }
  },
  {
    "id": 60,
    "booth_number": 60,
    "coords": {
      "type": "rect",
      "x": 433.42,
      "y": 245.51,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-60",
    "company": {
      "id": "company-60",
      "name": "ACEN",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/acen.eu",
      "short_description": "ACEN is presenting at VTK Jobfair 2026. Visit booth 60 to connect!",
      "long_description": "ACEN is participating in the annual VTK Jobfair. Stop by stand 60 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 60",
      "website": "https://www.acen.eu/en/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        }
      ],
      "representatives": [
        {
          "id": "rep-60-1",
          "first_name": "Cindy",
          "last_name": "Van den Hoecke",
          "title": "Representative",
          "email": "cindy.vandenhoecke@acen.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-60-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.acen.eu/en/"
        },
        {
          "id": "vac-60-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.acen.eu/en/"
        }
      ]
    }
  },
  {
    "id": 61,
    "booth_number": 61,
    "coords": {
      "type": "rect",
      "x": 450.82,
      "y": 245.51,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-61",
    "company": {
      "id": "company-61",
      "name": "Nuoro",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/nuoro.eu",
      "short_description": "Nuoro is presenting at VTK Jobfair 2026. Visit booth 61 to connect!",
      "long_description": "Nuoro is participating in the annual VTK Jobfair. Stop by stand 61 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 61",
      "website": "https://nuoro.eu",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        }
      ],
      "representatives": [
        {
          "id": "rep-61-1",
          "first_name": "Jeroen",
          "last_name": "Van Beek",
          "title": "Representative",
          "email": "jeroen.vanbeek@nuoro.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-61-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://nuoro.eu"
        },
        {
          "id": "vac-61-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://nuoro.eu"
        }
      ]
    }
  },
  {
    "id": 62,
    "booth_number": 62,
    "coords": {
      "type": "rect",
      "x": 468.23,
      "y": 245.51,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-62",
    "company": {
      "id": "company-62",
      "name": "NV Key Technology",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/werkenbijkey.net",
      "short_description": "NV Key Technology is presenting at VTK Jobfair 2026. Visit booth 62 to connect!",
      "long_description": "NV Key Technology is participating in the annual VTK Jobfair. Stop by stand 62 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 62",
      "website": "https://werkenbijkey.net/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 5,
          "name": "Nanowetenschappen & Nanotechnologie",
          "short_name": "NANO"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        }
      ],
      "representatives": [
        {
          "id": "rep-62-1",
          "first_name": "Sanne",
          "last_name": "van Leeuwen",
          "title": "Representative",
          "email": "sanne.vanleeuwen@nvkeytechnology.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-62-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://werkenbijkey.net/"
        },
        {
          "id": "vac-62-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://werkenbijkey.net/"
        }
      ]
    }
  },
  {
    "id": 63,
    "booth_number": 63,
    "coords": {
      "type": "rect",
      "x": 485.63,
      "y": 245.51,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-63",
    "company": {
      "id": "company-63",
      "name": "ie-net ingenieursvereniging vzw",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/ie-net.be",
      "short_description": "ie-net ingenieursvereniging vzw is presenting at VTK Jobfair 2026. Visit booth 63 to connect!",
      "long_description": "ie-net ingenieursvereniging vzw is participating in the annual VTK Jobfair. Stop by stand 63 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 63",
      "website": "https://www.ie-net.be",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 5,
          "name": "Nanowetenschappen & Nanotechnologie",
          "short_name": "NANO"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 10,
          "name": "Biomedische Technologie",
          "short_name": "BMT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        }
      ],
      "representatives": [
        {
          "id": "rep-63-1",
          "first_name": "Toon",
          "last_name": "De Bruyn",
          "title": "Representative",
          "email": "toon.debruyn@ienetingenieursverenigingvzw.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-63-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.ie-net.be"
        },
        {
          "id": "vac-63-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.ie-net.be"
        }
      ]
    }
  },
  {
    "id": 64,
    "booth_number": 64,
    "coords": {
      "type": "rect",
      "x": 503.04,
      "y": 245.51,
      "width": 17.41,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-64",
    "company": {
      "id": "company-64",
      "name": "imec",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/imec-int.com",
      "short_description": "imec is presenting at VTK Jobfair 2026. Visit booth 64 to connect!",
      "long_description": "imec is participating in the annual VTK Jobfair. Stop by stand 64 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 64",
      "website": "https://www.imec-int.com",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 5,
          "name": "Nanowetenschappen & Nanotechnologie",
          "short_name": "NANO"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 10,
          "name": "Biomedische Technologie",
          "short_name": "BMT"
        }
      ],
      "representatives": [
        {
          "id": "rep-64-1",
          "first_name": "Hilde",
          "last_name": "Vandermotten",
          "title": "Representative",
          "email": "hilde.vandermotten@imec.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-64-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.imec-int.com"
        },
        {
          "id": "vac-64-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.imec-int.com"
        }
      ]
    }
  },
  {
    "id": 65,
    "booth_number": 65,
    "coords": {
      "type": "rect",
      "x": 520.44,
      "y": 245.51,
      "width": 17.41,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-65",
    "company": {
      "id": "company-65",
      "name": "WMB Pringles BV",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/kellanovacareers.com",
      "short_description": "WMB Pringles BV is presenting at VTK Jobfair 2026. Visit booth 65 to connect!",
      "long_description": "WMB Pringles BV is participating in the annual VTK Jobfair. Stop by stand 65 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 65",
      "website": "https://www.kellanovacareers.com/",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-65-1",
          "first_name": "Maud",
          "last_name": "Taeymans",
          "title": "Representative",
          "email": "maud.taeymans@wmbpringlesbv.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-65-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.kellanovacareers.com/"
        },
        {
          "id": "vac-65-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.kellanovacareers.com/"
        }
      ]
    }
  },
  {
    "id": 66,
    "booth_number": 66,
    "coords": {
      "type": "rect",
      "x": 537.85,
      "y": 245.51,
      "width": 17.41,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-66",
    "company": {
      "id": "company-66",
      "name": "CNH Belgium",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/cnhind-belgium.be",
      "short_description": "CNH Belgium is presenting at VTK Jobfair 2026. Visit booth 66 to connect!",
      "long_description": "CNH Belgium is participating in the annual VTK Jobfair. Stop by stand 66 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 66",
      "website": "https://www.cnhind-belgium.be/nl",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-66-1",
          "first_name": "Anneleen",
          "last_name": "Onzea",
          "title": "Representative",
          "email": "anneleen.onzea@cnhbelgium.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-66-2",
          "first_name": "Tiemen",
          "last_name": "Rosseel",
          "title": "Representative",
          "email": "tiemen.rosseel@cnhbelgium.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-66-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.cnhind-belgium.be/nl"
        },
        {
          "id": "vac-66-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.cnhind-belgium.be/nl"
        }
      ]
    }
  },
  {
    "id": 67,
    "booth_number": 67,
    "coords": {
      "type": "rect",
      "x": 240.38,
      "y": 258.93,
      "width": 17.41,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-67",
    "company": {
      "id": "company-67",
      "name": "3M",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/3mbelgie.be",
      "short_description": "3M is presenting at VTK Jobfair 2026. Visit booth 67 to connect!",
      "long_description": "3M is participating in the annual VTK Jobfair. Stop by stand 67 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 67",
      "website": "https://3mbelgie.be",
      "category": [
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        }
      ],
      "representatives": [
        {
          "id": "rep-67-1",
          "first_name": "Lisse",
          "last_name": "Verhoeven",
          "title": "Representative",
          "email": "lisse.verhoeven@3m.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-67-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://3mbelgie.be"
        },
        {
          "id": "vac-67-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://3mbelgie.be"
        }
      ]
    }
  },
  {
    "id": 68,
    "booth_number": 68,
    "coords": {
      "type": "rect",
      "x": 257.78,
      "y": 258.93,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-68",
    "company": {
      "id": "company-68",
      "name": "Denys",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/denys.com",
      "short_description": "Denys is presenting at VTK Jobfair 2026. Visit booth 68 to connect!",
      "long_description": "Denys is participating in the annual VTK Jobfair. Stop by stand 68 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 68",
      "website": "https://www.denys.com/",
      "category": [
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        }
      ],
      "representatives": [
        {
          "id": "rep-68-1",
          "first_name": "recruitment",
          "last_name": "employees",
          "title": "Representative",
          "email": "recruitment.employees@denys.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-68-2",
          "first_name": "Anaïs",
          "last_name": "De Waele",
          "title": "Representative",
          "email": "anaïs.dewaele@denys.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-68-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.denys.com/"
        },
        {
          "id": "vac-68-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.denys.com/"
        }
      ]
    }
  },
  {
    "id": 69,
    "booth_number": 69,
    "coords": {
      "type": "rect",
      "x": 275.19,
      "y": 258.93,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-69",
    "company": {
      "id": "company-69",
      "name": "dataroots, a Talan company",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/dataroots.io",
      "short_description": "dataroots, a Talan company is presenting at VTK Jobfair 2026. Visit booth 69 to connect!",
      "long_description": "dataroots, a Talan company is participating in the annual VTK Jobfair. Stop by stand 69 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 69",
      "website": "https://dataroots.io/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        }
      ],
      "representatives": [
        {
          "id": "rep-69-1",
          "first_name": "recruitment",
          "last_name": "dataroots",
          "title": "Representative",
          "email": "recruitment.dataroots@datarootsatalancompany.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-69-2",
          "first_name": "Bram",
          "last_name": "Peeters",
          "title": "Representative",
          "email": "bram.peeters@datarootsatalancompany.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-69-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://dataroots.io/"
        },
        {
          "id": "vac-69-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://dataroots.io/"
        }
      ]
    }
  },
  {
    "id": 70,
    "booth_number": 70,
    "coords": {
      "type": "rect",
      "x": 292.59,
      "y": 258.93,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-70",
    "company": {
      "id": "company-70",
      "name": "Fluxys",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/fluxys.com",
      "short_description": "Fluxys is presenting at VTK Jobfair 2026. Visit booth 70 to connect!",
      "long_description": "Fluxys is participating in the annual VTK Jobfair. Stop by stand 70 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 70",
      "website": "https://www.fluxys.com/#/",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [],
      "vacancies": [
        {
          "id": "vac-70-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.fluxys.com/#/"
        },
        {
          "id": "vac-70-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.fluxys.com/#/"
        }
      ]
    }
  },
  {
    "id": 71,
    "booth_number": 71,
    "coords": {
      "type": "rect",
      "x": 310,
      "y": 258.93,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-71",
    "company": {
      "id": "company-71",
      "name": "Accenture",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/accenture.com",
      "short_description": "Accenture is presenting at VTK Jobfair 2026. Visit booth 71 to connect!",
      "long_description": "Accenture is participating in the annual VTK Jobfair. Stop by stand 71 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 71",
      "website": "http://www.accenture.com",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 5,
          "name": "Nanowetenschappen & Nanotechnologie",
          "short_name": "NANO"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 10,
          "name": "Biomedische Technologie",
          "short_name": "BMT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        }
      ],
      "representatives": [
        {
          "id": "rep-71-1",
          "first_name": "marthe",
          "last_name": "van den noortgate",
          "title": "Representative",
          "email": "marthe.vandennoortgate@accenture.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-71-2",
          "first_name": "Willem",
          "last_name": "Deckmyn",
          "title": "Representative",
          "email": "willem.deckmyn@accenture.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-71-3",
          "first_name": "Thymen",
          "last_name": "Vandenabeele",
          "title": "Representative",
          "email": "thymen.vandenabeele@accenture.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-71-4",
          "first_name": "Mattis",
          "last_name": "Bihain",
          "title": "Representative",
          "email": "mattis.bihain@accenture.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-71-5",
          "first_name": "Jonas",
          "last_name": "Gamme",
          "title": "Representative",
          "email": "jonas.gamme@accenture.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-71-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "http://www.accenture.com"
        },
        {
          "id": "vac-71-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "http://www.accenture.com"
        }
      ]
    }
  },
  {
    "id": 72,
    "booth_number": 72,
    "coords": {
      "type": "rect",
      "x": 327.4,
      "y": 258.93,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-72",
    "company": {
      "id": "company-72",
      "name": "Septentrio",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/workat.septentrio.com",
      "short_description": "Septentrio is presenting at VTK Jobfair 2026. Visit booth 72 to connect!",
      "long_description": "Septentrio is participating in the annual VTK Jobfair. Stop by stand 72 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 72",
      "website": "https://workat.septentrio.com/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        }
      ],
      "representatives": [
        {
          "id": "rep-72-1",
          "first_name": "Heleen",
          "last_name": "Draye",
          "title": "Representative",
          "email": "heleen.draye@septentrio.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-72-2",
          "first_name": "Angela",
          "last_name": "Barisan",
          "title": "Representative",
          "email": "angela.barisan@septentrio.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-72-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://workat.septentrio.com/"
        },
        {
          "id": "vac-72-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://workat.septentrio.com/"
        }
      ]
    }
  },
  {
    "id": 73,
    "booth_number": 73,
    "coords": {
      "type": "rect",
      "x": 344.81,
      "y": 258.93,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-73",
    "company": {
      "id": "company-73",
      "name": "Sertius",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/sertius.be",
      "short_description": "Sertius is presenting at VTK Jobfair 2026. Visit booth 73 to connect!",
      "long_description": "Sertius is participating in the annual VTK Jobfair. Stop by stand 73 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 73",
      "website": "https://sertius.be/",
      "category": [
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-73-1",
          "first_name": "Leen",
          "last_name": "Biesemans",
          "title": "Representative",
          "email": "leen.biesemans@sertius.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-73-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://sertius.be/"
        },
        {
          "id": "vac-73-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://sertius.be/"
        }
      ]
    }
  },
  {
    "id": 74,
    "booth_number": 74,
    "coords": {
      "type": "rect",
      "x": 362.21,
      "y": 258.93,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-74",
    "company": {
      "id": "company-74",
      "name": "Camco Technologies",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/camco.be",
      "short_description": "Camco Technologies is presenting at VTK Jobfair 2026. Visit booth 74 to connect!",
      "long_description": "Camco Technologies is participating in the annual VTK Jobfair. Stop by stand 74 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 74",
      "website": "https://camco.be/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        }
      ],
      "representatives": [
        {
          "id": "rep-74-1",
          "first_name": "Céline",
          "last_name": "Bossens",
          "title": "Representative",
          "email": "céline.bossens@camcotechnologies.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-74-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://camco.be/"
        },
        {
          "id": "vac-74-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://camco.be/"
        }
      ]
    }
  },
  {
    "id": 75,
    "booth_number": 75,
    "coords": {
      "type": "rect",
      "x": 398.61,
      "y": 258.93,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-75",
    "company": {
      "id": "company-75",
      "name": "Devoteam NV",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/devoteam.com",
      "short_description": "Devoteam NV is presenting at VTK Jobfair 2026. Visit booth 75 to connect!",
      "long_description": "Devoteam NV is participating in the annual VTK Jobfair. Stop by stand 75 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 75",
      "website": "https://www.devoteam.com/be/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        }
      ],
      "representatives": [
        {
          "id": "rep-75-1",
          "first_name": "Laurent",
          "last_name": "Huygens",
          "title": "Representative",
          "email": "laurent.huygens@devoteamnv.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-75-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.devoteam.com/be/"
        },
        {
          "id": "vac-75-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.devoteam.com/be/"
        }
      ]
    }
  },
  {
    "id": 76,
    "booth_number": 76,
    "coords": {
      "type": "rect",
      "x": 416.01,
      "y": 258.93,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-76",
    "company": {
      "id": "company-76",
      "name": "Devoteam NV",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/devoteam.com",
      "short_description": "Devoteam NV is presenting at VTK Jobfair 2026. Visit booth 76 to connect!",
      "long_description": "Devoteam NV is participating in the annual VTK Jobfair. Stop by stand 76 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 76",
      "website": "https://www.devoteam.com/be/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        }
      ],
      "representatives": [
        {
          "id": "rep-76-1",
          "first_name": "Laurent",
          "last_name": "Huygens",
          "title": "Representative",
          "email": "laurent.huygens@devoteamnv.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-76-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.devoteam.com/be/"
        },
        {
          "id": "vac-76-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.devoteam.com/be/"
        }
      ]
    }
  },
  {
    "id": 77,
    "booth_number": 77,
    "coords": {
      "type": "rect",
      "x": 433.42,
      "y": 258.93,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-77",
    "company": {
      "id": "company-77",
      "name": "Apptweak SA",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/apptweak.com",
      "short_description": "Apptweak SA is presenting at VTK Jobfair 2026. Visit booth 77 to connect!",
      "long_description": "Apptweak SA is participating in the annual VTK Jobfair. Stop by stand 77 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 77",
      "website": "https://www.apptweak.com/en",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 5,
          "name": "Nanowetenschappen & Nanotechnologie",
          "short_name": "NANO"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-77-1",
          "first_name": "Alice",
          "last_name": "Caputo",
          "title": "Representative",
          "email": "alice.caputo@apptweaksa.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-77-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.apptweak.com/en"
        },
        {
          "id": "vac-77-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.apptweak.com/en"
        }
      ]
    }
  },
  {
    "id": 78,
    "booth_number": 78,
    "coords": {
      "type": "rect",
      "x": 450.82,
      "y": 258.93,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-78",
    "company": {
      "id": "company-78",
      "name": "Pfizer",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/pfizer.be",
      "short_description": "Pfizer is presenting at VTK Jobfair 2026. Visit booth 78 to connect!",
      "long_description": "Pfizer is participating in the annual VTK Jobfair. Stop by stand 78 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 78",
      "website": "https://www.pfizer.be/nl",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-78-1",
          "first_name": "Naomi",
          "last_name": "Van den Abbeele",
          "title": "Representative",
          "email": "naomi.vandenabbeele@pfizer.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-78-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.pfizer.be/nl"
        },
        {
          "id": "vac-78-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.pfizer.be/nl"
        }
      ]
    }
  },
  {
    "id": 79,
    "booth_number": 79,
    "coords": {
      "type": "rect",
      "x": 468.23,
      "y": 258.93,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-79",
    "company": {
      "id": "company-79",
      "name": "Akkodis",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/werkenbijakkodis.be",
      "short_description": "Akkodis is presenting at VTK Jobfair 2026. Visit booth 79 to connect!",
      "long_description": "Akkodis is participating in the annual VTK Jobfair. Stop by stand 79 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 79",
      "website": "https://werkenbijakkodis.be/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 10,
          "name": "Biomedische Technologie",
          "short_name": "BMT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        }
      ],
      "representatives": [
        {
          "id": "rep-79-1",
          "first_name": "Rem",
          "last_name": "Braspenning",
          "title": "Representative",
          "email": "rem.braspenning@akkodis.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-79-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://werkenbijakkodis.be/"
        },
        {
          "id": "vac-79-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://werkenbijakkodis.be/"
        }
      ]
    }
  },
  {
    "id": 80,
    "booth_number": 80,
    "coords": {
      "type": "rect",
      "x": 485.63,
      "y": 258.93,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-80",
    "company": {
      "id": "company-80",
      "name": "Besix",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/besix.com",
      "short_description": "Besix is presenting at VTK Jobfair 2026. Visit booth 80 to connect!",
      "long_description": "Besix is participating in the annual VTK Jobfair. Stop by stand 80 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 80",
      "website": "https://www.besix.com/nl",
      "category": [
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-80-1",
          "first_name": "Yannick",
          "last_name": "Van Aelst",
          "title": "Representative",
          "email": "yannick.vanaelst@besix.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-80-2",
          "first_name": "Evelyne",
          "last_name": "Van Den Broeck",
          "title": "Representative",
          "email": "evelyne.vandenbroeck@besix.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-80-3",
          "first_name": "Aurelie",
          "last_name": "Flamand",
          "title": "Representative",
          "email": "aurelie.flamand@besix.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-80-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.besix.com/nl"
        },
        {
          "id": "vac-80-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.besix.com/nl"
        }
      ]
    }
  },
  {
    "id": 81,
    "booth_number": 81,
    "coords": {
      "type": "rect",
      "x": 503.04,
      "y": 258.93,
      "width": 17.41,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-81",
    "company": {
      "id": "company-81",
      "name": "Besix Infra",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/besixinfra.com",
      "short_description": "Besix Infra is presenting at VTK Jobfair 2026. Visit booth 81 to connect!",
      "long_description": "Besix Infra is participating in the annual VTK Jobfair. Stop by stand 81 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 81",
      "website": "https://www.besixinfra.com/en",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        }
      ],
      "representatives": [
        {
          "id": "rep-81-1",
          "first_name": "Sofie",
          "last_name": "De Smedt",
          "title": "Representative",
          "email": "sofie.desmedt@besixinfra.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-81-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.besixinfra.com/en"
        },
        {
          "id": "vac-81-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.besixinfra.com/en"
        }
      ]
    }
  },
  {
    "id": 82,
    "booth_number": 82,
    "coords": {
      "type": "rect",
      "x": 520.44,
      "y": 258.93,
      "width": 17.41,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-82",
    "company": {
      "id": "company-82",
      "name": "Square Group",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/squaregroup.be",
      "short_description": "Square Group is presenting at VTK Jobfair 2026. Visit booth 82 to connect!",
      "long_description": "Square Group is participating in the annual VTK Jobfair. Stop by stand 82 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 82",
      "website": "https://www.squaregroup.be",
      "category": [
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-82-1",
          "first_name": "Nikolaas",
          "last_name": "Zeghers",
          "title": "Representative",
          "email": "nikolaas.zeghers@squaregroup.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-82-2",
          "first_name": "Leticia",
          "last_name": "Pattyn",
          "title": "Representative",
          "email": "leticia.pattyn@squaregroup.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-82-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.squaregroup.be"
        },
        {
          "id": "vac-82-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.squaregroup.be"
        }
      ]
    }
  },
  {
    "id": 83,
    "booth_number": 83,
    "coords": {
      "type": "rect",
      "x": 537.85,
      "y": 258.93,
      "width": 17.41,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-83",
    "company": {
      "id": "company-83",
      "name": "Infrabel",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/jobs.infrabel.be",
      "short_description": "Infrabel is presenting at VTK Jobfair 2026. Visit booth 83 to connect!",
      "long_description": "Infrabel is participating in the annual VTK Jobfair. Stop by stand 83 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 83",
      "website": "https://jobs.infrabel.be/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-83-1",
          "first_name": "Katleen",
          "last_name": "Moonen",
          "title": "Representative",
          "email": "katleen.moonen@infrabel.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-83-2",
          "first_name": "Jean",
          "last_name": "Claude Cordier",
          "title": "Representative",
          "email": "jean.claudecordier@infrabel.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-83-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://jobs.infrabel.be/"
        },
        {
          "id": "vac-83-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://jobs.infrabel.be/"
        }
      ]
    }
  },
  {
    "id": 84,
    "booth_number": 84,
    "coords": {
      "type": "rect",
      "x": 222.97,
      "y": 286.51,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-84",
    "company": {
      "id": "company-84",
      "name": "Barco NV",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/barco.com",
      "short_description": "Barco NV is presenting at VTK Jobfair 2026. Visit booth 84 to connect!",
      "long_description": "Barco NV is participating in the annual VTK Jobfair. Stop by stand 84 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 84",
      "website": "https://www.barco.com/en",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 5,
          "name": "Nanowetenschappen & Nanotechnologie",
          "short_name": "NANO"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        }
      ],
      "representatives": [
        {
          "id": "rep-84-1",
          "first_name": "Marte",
          "last_name": "Vanoverberghe",
          "title": "Representative",
          "email": "marte.vanoverberghe@barconv.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-84-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.barco.com/en"
        },
        {
          "id": "vac-84-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.barco.com/en"
        }
      ]
    }
  },
  {
    "id": 85,
    "booth_number": 85,
    "coords": {
      "type": "rect",
      "x": 240.38,
      "y": 286.51,
      "width": 17.41,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-85",
    "company": {
      "id": "company-85",
      "name": "Iemants NV",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/smulders.com",
      "short_description": "Iemants NV is presenting at VTK Jobfair 2026. Visit booth 85 to connect!",
      "long_description": "Iemants NV is participating in the annual VTK Jobfair. Stop by stand 85 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 85",
      "website": "https://www.smulders.com/nl/",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        }
      ],
      "representatives": [
        {
          "id": "rep-85-1",
          "first_name": "Anke",
          "last_name": "Dierckx",
          "title": "Representative",
          "email": "anke.dierckx@iemantsnv.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-85-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.smulders.com/nl/"
        },
        {
          "id": "vac-85-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.smulders.com/nl/"
        }
      ]
    }
  },
  {
    "id": 86,
    "booth_number": 86,
    "coords": {
      "type": "rect",
      "x": 257.78,
      "y": 286.51,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-86",
    "company": {
      "id": "company-86",
      "name": "Eiffage Construction BeLux",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/eiffageconstructionbelux.be",
      "short_description": "Eiffage Construction BeLux is presenting at VTK Jobfair 2026. Visit booth 86 to connect!",
      "long_description": "Eiffage Construction BeLux is participating in the annual VTK Jobfair. Stop by stand 86 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 86",
      "website": "https://eiffageconstructionbelux.be/",
      "category": [
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        }
      ],
      "representatives": [
        {
          "id": "rep-86-1",
          "first_name": "Yasmina",
          "last_name": "Fahmi",
          "title": "Representative",
          "email": "yasmina.fahmi@eiffageconstructionbelux.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-86-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://eiffageconstructionbelux.be/"
        },
        {
          "id": "vac-86-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://eiffageconstructionbelux.be/"
        }
      ]
    }
  },
  {
    "id": 87,
    "booth_number": 87,
    "coords": {
      "type": "rect",
      "x": 275.19,
      "y": 286.51,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-87",
    "company": {
      "id": "company-87",
      "name": "IPS Belgium",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/group-ips.com",
      "short_description": "IPS Belgium is presenting at VTK Jobfair 2026. Visit booth 87 to connect!",
      "long_description": "IPS Belgium is participating in the annual VTK Jobfair. Stop by stand 87 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 87",
      "website": "https://www.group-ips.com/",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-87-1",
          "first_name": "Juanita",
          "last_name": "Sanchez",
          "title": "Representative",
          "email": "juanita.sanchez@ipsbelgium.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-87-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.group-ips.com/"
        },
        {
          "id": "vac-87-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.group-ips.com/"
        }
      ]
    }
  },
  {
    "id": 88,
    "booth_number": 88,
    "coords": {
      "type": "rect",
      "x": 292.59,
      "y": 286.51,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-88",
    "company": {
      "id": "company-88",
      "name": "Vanderstraeten",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/vanderstraeten.be",
      "short_description": "Vanderstraeten is presenting at VTK Jobfair 2026. Visit booth 88 to connect!",
      "long_description": "Vanderstraeten is participating in the annual VTK Jobfair. Stop by stand 88 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 88",
      "website": "https://www.vanderstraeten.be/",
      "category": [
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        }
      ],
      "representatives": [
        {
          "id": "rep-88-1",
          "first_name": "Els",
          "last_name": "De Jonghe",
          "title": "Representative",
          "email": "els.dejonghe@vanderstraeten.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-88-2",
          "first_name": "Jonas",
          "last_name": "Renap",
          "title": "Representative",
          "email": "jonas.renap@vanderstraeten.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-88-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.vanderstraeten.be/"
        },
        {
          "id": "vac-88-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.vanderstraeten.be/"
        }
      ]
    }
  },
  {
    "id": 89,
    "booth_number": 89,
    "coords": {
      "type": "rect",
      "x": 310,
      "y": 286.51,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-89",
    "company": {
      "id": "company-89",
      "name": "Safran Aero Boosters",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/safran-group.com",
      "short_description": "Safran Aero Boosters is presenting at VTK Jobfair 2026. Visit booth 89 to connect!",
      "long_description": "Safran Aero Boosters is participating in the annual VTK Jobfair. Stop by stand 89 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 89",
      "website": "https://www.safran-group.com/fr/societes/safran-aero-boosters",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        }
      ],
      "representatives": [
        {
          "id": "rep-89-1",
          "first_name": "Corentin",
          "last_name": "Vuylsteke",
          "title": "Representative",
          "email": "corentin.vuylsteke@safranaeroboosters.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-89-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.safran-group.com/fr/societes/safran-aero-boosters"
        },
        {
          "id": "vac-89-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.safran-group.com/fr/societes/safran-aero-boosters"
        }
      ]
    }
  },
  {
    "id": 90,
    "booth_number": 90,
    "coords": {
      "type": "rect",
      "x": 327.4,
      "y": 286.51,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-90",
    "company": {
      "id": "company-90",
      "name": "Group Monument NV",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/monument.be",
      "short_description": "Group Monument NV is presenting at VTK Jobfair 2026. Visit booth 90 to connect!",
      "long_description": "Group Monument NV is participating in the annual VTK Jobfair. Stop by stand 90 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 90",
      "website": "http://www.monument.be",
      "category": [
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        }
      ],
      "representatives": [
        {
          "id": "rep-90-1",
          "first_name": "Marie",
          "last_name": "Declerc",
          "title": "Representative",
          "email": "marie.declerc@groupmonumentnv.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-90-2",
          "first_name": "Hélène",
          "last_name": "Vandeputte",
          "title": "Representative",
          "email": "hélène.vandeputte@groupmonumentnv.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-90-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "http://www.monument.be"
        },
        {
          "id": "vac-90-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "http://www.monument.be"
        }
      ]
    }
  },
  {
    "id": 91,
    "booth_number": 91,
    "coords": {
      "type": "rect",
      "x": 344.81,
      "y": 286.51,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-91",
    "company": {
      "id": "company-91",
      "name": "DEME",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/deme-group.com",
      "short_description": "DEME is presenting at VTK Jobfair 2026. Visit booth 91 to connect!",
      "long_description": "DEME is participating in the annual VTK Jobfair. Stop by stand 91 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 91",
      "website": "https://www.deme-group.com/",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-91-1",
          "first_name": "Niels",
          "last_name": "Van Broeck",
          "title": "Representative",
          "email": "niels.vanbroeck@deme.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-91-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.deme-group.com/"
        },
        {
          "id": "vac-91-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.deme-group.com/"
        }
      ]
    }
  },
  {
    "id": 92,
    "booth_number": 92,
    "coords": {
      "type": "rect",
      "x": 362.21,
      "y": 286.51,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-92",
    "company": {
      "id": "company-92",
      "name": "DEME",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/deme-group.com",
      "short_description": "DEME is presenting at VTK Jobfair 2026. Visit booth 92 to connect!",
      "long_description": "DEME is participating in the annual VTK Jobfair. Stop by stand 92 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 92",
      "website": "https://www.deme-group.com/",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-92-1",
          "first_name": "Niels",
          "last_name": "Van Broeck",
          "title": "Representative",
          "email": "niels.vanbroeck@deme.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-92-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.deme-group.com/"
        },
        {
          "id": "vac-92-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.deme-group.com/"
        }
      ]
    }
  },
  {
    "id": 93,
    "booth_number": 93,
    "coords": {
      "type": "rect",
      "x": 398.61,
      "y": 286.51,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-93",
    "company": {
      "id": "company-93",
      "name": "Twipe Mobile Solutions",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/twipemobile.com",
      "short_description": "Twipe Mobile Solutions is presenting at VTK Jobfair 2026. Visit booth 93 to connect!",
      "long_description": "Twipe Mobile Solutions is participating in the annual VTK Jobfair. Stop by stand 93 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 93",
      "website": "http://www.twipemobile.com",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        }
      ],
      "representatives": [
        {
          "id": "rep-93-1",
          "first_name": "Laurens",
          "last_name": "Thijs",
          "title": "Representative",
          "email": "laurens.thijs@twipemobilesolutions.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-93-2",
          "first_name": "Eveline",
          "last_name": "Le Bruyn",
          "title": "Representative",
          "email": "eveline.lebruyn@twipemobilesolutions.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-93-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "http://www.twipemobile.com"
        },
        {
          "id": "vac-93-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "http://www.twipemobile.com"
        }
      ]
    }
  },
  {
    "id": 94,
    "booth_number": 94,
    "coords": {
      "type": "rect",
      "x": 416.01,
      "y": 286.51,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-94",
    "company": {
      "id": "company-94",
      "name": "N-SIDE",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/n-side.com",
      "short_description": "N-SIDE is presenting at VTK Jobfair 2026. Visit booth 94 to connect!",
      "long_description": "N-SIDE is participating in the annual VTK Jobfair. Stop by stand 94 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 94",
      "website": "https://www.n-side.com/en/",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        }
      ],
      "representatives": [
        {
          "id": "rep-94-1",
          "first_name": "Olivia",
          "last_name": "Tatti",
          "title": "Representative",
          "email": "olivia.tatti@nside.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-94-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.n-side.com/en/"
        },
        {
          "id": "vac-94-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.n-side.com/en/"
        }
      ]
    }
  },
  {
    "id": 95,
    "booth_number": 95,
    "coords": {
      "type": "rect",
      "x": 433.42,
      "y": 286.51,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-95",
    "company": {
      "id": "company-95",
      "name": "IMDC",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/imdc.be",
      "short_description": "IMDC is presenting at VTK Jobfair 2026. Visit booth 95 to connect!",
      "long_description": "IMDC is participating in the annual VTK Jobfair. Stop by stand 95 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 95",
      "website": "https://imdc.be/en",
      "category": [
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-95-1",
          "first_name": "Petra",
          "last_name": "De Wilde",
          "title": "Representative",
          "email": "petra.dewilde@imdc.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-95-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://imdc.be/en"
        },
        {
          "id": "vac-95-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://imdc.be/en"
        }
      ]
    }
  },
  {
    "id": 96,
    "booth_number": 96,
    "coords": {
      "type": "rect",
      "x": 450.82,
      "y": 286.51,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-96",
    "company": {
      "id": "company-96",
      "name": "Melexis",
      "logo_id": null,
      "logo_url": null,
      "short_description": "Melexis is presenting at VTK Jobfair 2026. Visit booth 96 to connect!",
      "long_description": "Melexis is participating in the annual VTK Jobfair. Stop by stand 96 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 96",
      "website": null,
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        }
      ],
      "representatives": [
        {
          "id": "rep-96-1",
          "first_name": "Sien",
          "last_name": "Buseyne",
          "title": "Representative",
          "email": "sien.buseyne@melexis.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-96-2",
          "first_name": "Brecht",
          "last_name": "Blindeman",
          "title": "Representative",
          "email": "brecht.blindeman@melexis.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-96-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium"
        },
        {
          "id": "vac-96-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium"
        }
      ]
    }
  },
  {
    "id": 97,
    "booth_number": 97,
    "coords": {
      "type": "rect",
      "x": 468.23,
      "y": 286.51,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-97",
    "company": {
      "id": "company-97",
      "name": "Trace vzw",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/tracevzw.com",
      "short_description": "Trace vzw is presenting at VTK Jobfair 2026. Visit booth 97 to connect!",
      "long_description": "Trace vzw is participating in the annual VTK Jobfair. Stop by stand 97 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 97",
      "website": "https://www.tracevzw.com/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-97-1",
          "first_name": "Gioacchino",
          "last_name": "Haers",
          "title": "Representative",
          "email": "gioacchino.haers@tracevzw.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-97-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.tracevzw.com/"
        },
        {
          "id": "vac-97-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.tracevzw.com/"
        }
      ]
    }
  },
  {
    "id": 98,
    "booth_number": 98,
    "coords": {
      "type": "rect",
      "x": 485.63,
      "y": 286.51,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-98",
    "company": {
      "id": "company-98",
      "name": "CKS Elektrotechniek",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/cks.be",
      "short_description": "CKS Elektrotechniek is presenting at VTK Jobfair 2026. Visit booth 98 to connect!",
      "long_description": "CKS Elektrotechniek is participating in the annual VTK Jobfair. Stop by stand 98 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 98",
      "website": "https://www.cks.be/",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        }
      ],
      "representatives": [
        {
          "id": "rep-98-1",
          "first_name": "Tine",
          "last_name": "Deldycke",
          "title": "Representative",
          "email": "tine.deldycke@ckselektrotechniek.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-98-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.cks.be/"
        },
        {
          "id": "vac-98-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.cks.be/"
        }
      ]
    }
  },
  {
    "id": 99,
    "booth_number": 99,
    "coords": {
      "type": "rect",
      "x": 503.04,
      "y": 286.51,
      "width": 17.41,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-99",
    "company": {
      "id": "company-99",
      "name": "SECO Belgium",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/groupseco.be",
      "short_description": "SECO Belgium is presenting at VTK Jobfair 2026. Visit booth 99 to connect!",
      "long_description": "SECO Belgium is participating in the annual VTK Jobfair. Stop by stand 99 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 99",
      "website": "https://groupseco.be/",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-99-1",
          "first_name": "Marina",
          "last_name": "Goolaerts",
          "title": "Representative",
          "email": "marina.goolaerts@secobelgium.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-99-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://groupseco.be/"
        },
        {
          "id": "vac-99-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://groupseco.be/"
        }
      ]
    }
  },
  {
    "id": 100,
    "booth_number": 100,
    "coords": {
      "type": "rect",
      "x": 520.44,
      "y": 286.51,
      "width": 17.41,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-100",
    "company": {
      "id": "company-100",
      "name": "Janssen Pharmaceutica NV",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/innovativemedicine.jnj.com",
      "short_description": "Janssen Pharmaceutica NV is presenting at VTK Jobfair 2026. Visit booth 100 to connect!",
      "long_description": "Janssen Pharmaceutica NV is participating in the annual VTK Jobfair. Stop by stand 100 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 100",
      "website": "https://innovativemedicine.jnj.com/belgium",
      "category": [
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 10,
          "name": "Biomedische Technologie",
          "short_name": "BMT"
        }
      ],
      "representatives": [
        {
          "id": "rep-100-1",
          "first_name": "Caro",
          "last_name": "Peeters",
          "title": "Representative",
          "email": "caro.peeters@janssenpharmaceuticanv.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-100-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://innovativemedicine.jnj.com/belgium"
        },
        {
          "id": "vac-100-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://innovativemedicine.jnj.com/belgium"
        }
      ]
    }
  },
  {
    "id": 101,
    "booth_number": 101,
    "coords": {
      "type": "rect",
      "x": 222.97,
      "y": 299.94,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-101",
    "company": {
      "id": "company-101",
      "name": "TechWolf",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/techwolf.ai",
      "short_description": "TechWolf is presenting at VTK Jobfair 2026. Visit booth 101 to connect!",
      "long_description": "TechWolf is participating in the annual VTK Jobfair. Stop by stand 101 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 101",
      "website": "https://www.techwolf.ai/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        }
      ],
      "representatives": [
        {
          "id": "rep-101-1",
          "first_name": "Jacob",
          "last_name": "Schillemans",
          "title": "Representative",
          "email": "jacob.schillemans@techwolf.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-101-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.techwolf.ai/"
        },
        {
          "id": "vac-101-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.techwolf.ai/"
        }
      ]
    }
  },
  {
    "id": 102,
    "booth_number": 102,
    "coords": {
      "type": "rect",
      "x": 240.38,
      "y": 299.94,
      "width": 17.41,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-102",
    "company": {
      "id": "company-102",
      "name": "Amnovis BV",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/amnovis.com",
      "short_description": "Amnovis BV is presenting at VTK Jobfair 2026. Visit booth 102 to connect!",
      "long_description": "Amnovis BV is participating in the annual VTK Jobfair. Stop by stand 102 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 102",
      "website": "https://www.amnovis.com",
      "category": [
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 10,
          "name": "Biomedische Technologie",
          "short_name": "BMT"
        }
      ],
      "representatives": [
        {
          "id": "rep-102-1",
          "first_name": "Joachim",
          "last_name": "Pierre",
          "title": "Representative",
          "email": "joachim.pierre@amnovisbv.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-102-2",
          "first_name": "Bert",
          "last_name": "Engelen",
          "title": "Representative",
          "email": "bert.engelen@amnovisbv.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-102-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.amnovis.com"
        },
        {
          "id": "vac-102-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.amnovis.com"
        }
      ]
    }
  },
  {
    "id": 103,
    "booth_number": 103,
    "coords": {
      "type": "rect",
      "x": 257.78,
      "y": 299.94,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-103",
    "company": {
      "id": "company-103",
      "name": "Kapernikov",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/kapernikov.com",
      "short_description": "Kapernikov is presenting at VTK Jobfair 2026. Visit booth 103 to connect!",
      "long_description": "Kapernikov is participating in the annual VTK Jobfair. Stop by stand 103 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 103",
      "website": "https://kapernikov.com/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-103-1",
          "first_name": "Hans",
          "last_name": "Nickisch",
          "title": "Representative",
          "email": "hans.nickisch@kapernikov.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-103-2",
          "first_name": "Admin",
          "last_name": "Kapernikov",
          "title": "Representative",
          "email": "admin.kapernikov@kapernikov.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-103-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://kapernikov.com/"
        },
        {
          "id": "vac-103-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://kapernikov.com/"
        }
      ]
    }
  },
  {
    "id": 104,
    "booth_number": 104,
    "coords": {
      "type": "rect",
      "x": 275.19,
      "y": 299.94,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-104",
    "company": {
      "id": "company-104",
      "name": "Vectr.Consulting",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/vectr.solutions",
      "short_description": "Vectr.Consulting is presenting at VTK Jobfair 2026. Visit booth 104 to connect!",
      "long_description": "Vectr.Consulting is participating in the annual VTK Jobfair. Stop by stand 104 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 104",
      "website": "https://vectr.solutions/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        }
      ],
      "representatives": [
        {
          "id": "rep-104-1",
          "first_name": "Jony",
          "last_name": "Van Puymbroeck",
          "title": "Representative",
          "email": "jony.vanpuymbroeck@vectrconsulting.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-104-2",
          "first_name": "Tom",
          "last_name": "Franckx",
          "title": "Representative",
          "email": "tom.franckx@vectrconsulting.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-104-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://vectr.solutions/"
        },
        {
          "id": "vac-104-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://vectr.solutions/"
        }
      ]
    }
  },
  {
    "id": 105,
    "booth_number": 105,
    "coords": {
      "type": "rect",
      "x": 292.59,
      "y": 299.94,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-105",
    "company": {
      "id": "company-105",
      "name": "Wood Italiana Belgium Branch",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/woodplc.com",
      "short_description": "Wood Italiana Belgium Branch is presenting at VTK Jobfair 2026. Visit booth 105 to connect!",
      "long_description": "Wood Italiana Belgium Branch is participating in the annual VTK Jobfair. Stop by stand 105 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 105",
      "website": "https://www.woodplc.com",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-105-1",
          "first_name": "Mariagiovanna",
          "last_name": "Lia",
          "title": "Representative",
          "email": "mariagiovanna.lia@wooditalianabelgiumbranch.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-105-2",
          "first_name": "Bavo",
          "last_name": "Spreuwers",
          "title": "Representative",
          "email": "bavo.spreuwers@wooditalianabelgiumbranch.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-105-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.woodplc.com"
        },
        {
          "id": "vac-105-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.woodplc.com"
        }
      ]
    }
  },
  {
    "id": 106,
    "booth_number": 106,
    "coords": {
      "type": "rect",
      "x": 310,
      "y": 299.94,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-106",
    "company": {
      "id": "company-106",
      "name": "Thales Belgium",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/thalesgroup.com",
      "short_description": "Thales Belgium is presenting at VTK Jobfair 2026. Visit booth 106 to connect!",
      "long_description": "Thales Belgium is participating in the annual VTK Jobfair. Stop by stand 106 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 106",
      "website": "https://www.thalesgroup.com/en/worldwide/belgium",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        }
      ],
      "representatives": [
        {
          "id": "rep-106-1",
          "first_name": "Brian",
          "last_name": "Bignami",
          "title": "Representative",
          "email": "brian.bignami@thalesbelgium.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-106-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.thalesgroup.com/en/worldwide/belgium"
        },
        {
          "id": "vac-106-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.thalesgroup.com/en/worldwide/belgium"
        }
      ]
    }
  },
  {
    "id": 107,
    "booth_number": 107,
    "coords": {
      "type": "rect",
      "x": 327.4,
      "y": 299.94,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-107",
    "company": {
      "id": "company-107",
      "name": "Hexagon",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/hexagon.com",
      "short_description": "Hexagon is presenting at VTK Jobfair 2026. Visit booth 107 to connect!",
      "long_description": "Hexagon is participating in the annual VTK Jobfair. Stop by stand 107 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 107",
      "website": "https://hexagon.com/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        }
      ],
      "representatives": [
        {
          "id": "rep-107-1",
          "first_name": "Annelies",
          "last_name": "Boon",
          "title": "Representative",
          "email": "annelies.boon@hexagon.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-107-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://hexagon.com/"
        },
        {
          "id": "vac-107-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://hexagon.com/"
        }
      ]
    }
  },
  {
    "id": 108,
    "booth_number": 108,
    "coords": {
      "type": "rect",
      "x": 344.81,
      "y": 299.94,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-108",
    "company": {
      "id": "company-108",
      "name": "Isabel",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/isabel.eu",
      "short_description": "Isabel is presenting at VTK Jobfair 2026. Visit booth 108 to connect!",
      "long_description": "Isabel is participating in the annual VTK Jobfair. Stop by stand 108 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 108",
      "website": "https://www.isabel.eu",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        }
      ],
      "representatives": [
        {
          "id": "rep-108-1",
          "first_name": "Boris",
          "last_name": "Hazaer",
          "title": "Representative",
          "email": "boris.hazaer@isabel.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-108-2",
          "first_name": "Brent",
          "last_name": "De Peuter",
          "title": "Representative",
          "email": "brent.depeuter@isabel.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-108-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.isabel.eu"
        },
        {
          "id": "vac-108-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.isabel.eu"
        }
      ]
    }
  },
  {
    "id": 109,
    "booth_number": 109,
    "coords": {
      "type": "rect",
      "x": 362.21,
      "y": 299.94,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-109",
    "company": {
      "id": "company-109",
      "name": "Orise",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/orise.com",
      "short_description": "Orise is presenting at VTK Jobfair 2026. Visit booth 109 to connect!",
      "long_description": "Orise is participating in the annual VTK Jobfair. Stop by stand 109 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 109",
      "website": "https://orise.com/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        }
      ],
      "representatives": [
        {
          "id": "rep-109-1",
          "first_name": "Anja",
          "last_name": "Leurs",
          "title": "Representative",
          "email": "anja.leurs@orise.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-109-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://orise.com/"
        },
        {
          "id": "vac-109-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://orise.com/"
        }
      ]
    }
  },
  {
    "id": 110,
    "booth_number": 110,
    "coords": {
      "type": "rect",
      "x": 398.61,
      "y": 299.94,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-110",
    "company": {
      "id": "company-110",
      "name": "Syngenia",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/syngenia.com",
      "short_description": "Syngenia is presenting at VTK Jobfair 2026. Visit booth 110 to connect!",
      "long_description": "Syngenia is participating in the annual VTK Jobfair. Stop by stand 110 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 110",
      "website": "https://www.syngenia.com/en/",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-110-1",
          "first_name": "Esther",
          "last_name": "Lohombo",
          "title": "Representative",
          "email": "esther.lohombo@syngenia.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-110-2",
          "first_name": "Michael",
          "last_name": "Verdoodt",
          "title": "Representative",
          "email": "michael.verdoodt@syngenia.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-110-3",
          "first_name": "Michiel",
          "last_name": "Vaes",
          "title": "Representative",
          "email": "michiel.vaes@syngenia.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-110-4",
          "first_name": "Kinga",
          "last_name": "Sokol",
          "title": "Representative",
          "email": "kinga.sokol@syngenia.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-110-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.syngenia.com/en/"
        },
        {
          "id": "vac-110-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.syngenia.com/en/"
        }
      ]
    }
  },
  {
    "id": 111,
    "booth_number": 111,
    "coords": {
      "type": "rect",
      "x": 416.01,
      "y": 299.94,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-111",
    "company": {
      "id": "company-111",
      "name": "Equans",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/jobs.equans.be",
      "short_description": "Equans is presenting at VTK Jobfair 2026. Visit booth 111 to connect!",
      "long_description": "Equans is participating in the annual VTK Jobfair. Stop by stand 111 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 111",
      "website": "https://jobs.equans.be/nl/",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-111-1",
          "first_name": "Naomi",
          "last_name": "De Decker",
          "title": "Representative",
          "email": "naomi.dedecker@equans.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-111-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://jobs.equans.be/nl/"
        },
        {
          "id": "vac-111-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://jobs.equans.be/nl/"
        }
      ]
    }
  },
  {
    "id": 112,
    "booth_number": 112,
    "coords": {
      "type": "rect",
      "x": 433.42,
      "y": 299.94,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-112",
    "company": {
      "id": "company-112",
      "name": "NV Kunlabora",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/kunlabora.be",
      "short_description": "NV Kunlabora is presenting at VTK Jobfair 2026. Visit booth 112 to connect!",
      "long_description": "NV Kunlabora is participating in the annual VTK Jobfair. Stop by stand 112 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 112",
      "website": "https://www.kunlabora.be/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        }
      ],
      "representatives": [
        {
          "id": "rep-112-1",
          "first_name": "Emma",
          "last_name": "Eyckmans",
          "title": "Representative",
          "email": "emma.eyckmans@nvkunlabora.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-112-2",
          "first_name": "Info",
          "last_name": "Kunlabora",
          "title": "Representative",
          "email": "info.kunlabora@nvkunlabora.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-112-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.kunlabora.be/"
        },
        {
          "id": "vac-112-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.kunlabora.be/"
        }
      ]
    }
  },
  {
    "id": 113,
    "booth_number": 113,
    "coords": {
      "type": "rect",
      "x": 450.82,
      "y": 299.94,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-113",
    "company": {
      "id": "company-113",
      "name": "Stellantis e-Transmissions",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/stellantis-et.com",
      "short_description": "Stellantis e-Transmissions is presenting at VTK Jobfair 2026. Visit booth 113 to connect!",
      "long_description": "Stellantis e-Transmissions is participating in the annual VTK Jobfair. Stop by stand 113 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 113",
      "website": "https://stellantis-et.com/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-113-1",
          "first_name": "Jade",
          "last_name": "Maris",
          "title": "Representative",
          "email": "jade.maris@stellantisetransmissions.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-113-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://stellantis-et.com/"
        },
        {
          "id": "vac-113-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://stellantis-et.com/"
        }
      ]
    }
  },
  {
    "id": 114,
    "booth_number": 114,
    "coords": {
      "type": "rect",
      "x": 468.23,
      "y": 299.94,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-114",
    "company": {
      "id": "company-114",
      "name": "Tactical advisory group",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/tag-team.be",
      "short_description": "Tactical advisory group is presenting at VTK Jobfair 2026. Visit booth 114 to connect!",
      "long_description": "Tactical advisory group is participating in the annual VTK Jobfair. Stop by stand 114 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 114",
      "website": "https://www.tag-team.be/careers",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 5,
          "name": "Nanowetenschappen & Nanotechnologie",
          "short_name": "NANO"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 10,
          "name": "Biomedische Technologie",
          "short_name": "BMT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        }
      ],
      "representatives": [
        {
          "id": "rep-114-1",
          "first_name": "Arne",
          "last_name": "Lambeets",
          "title": "Representative",
          "email": "arne.lambeets@tacticaladvisorygroup.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-114-2",
          "first_name": "Marc",
          "last_name": "Nowicki",
          "title": "Representative",
          "email": "marc.nowicki@tacticaladvisorygroup.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-114-3",
          "first_name": "Pauline",
          "last_name": "Raemdonck",
          "title": "Representative",
          "email": "pauline.raemdonck@tacticaladvisorygroup.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-114-4",
          "first_name": "Jan",
          "last_name": "Van Proeyen",
          "title": "Representative",
          "email": "jan.vanproeyen@tacticaladvisorygroup.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-114-5",
          "first_name": "Dante",
          "last_name": "Trompet",
          "title": "Representative",
          "email": "dante.trompet@tacticaladvisorygroup.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-114-6",
          "first_name": "Sam",
          "last_name": "Dom",
          "title": "Representative",
          "email": "sam.dom@tacticaladvisorygroup.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-114-7",
          "first_name": "Teun",
          "last_name": "Vandermeulen",
          "title": "Representative",
          "email": "teun.vandermeulen@tacticaladvisorygroup.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-114-8",
          "first_name": "Arne",
          "last_name": "Lammens",
          "title": "Representative",
          "email": "arne.lammens@tacticaladvisorygroup.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-114-9",
          "first_name": "Thibault",
          "last_name": "Vlems",
          "title": "Representative",
          "email": "thibault.vlems@tacticaladvisorygroup.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-114-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.tag-team.be/careers"
        },
        {
          "id": "vac-114-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.tag-team.be/careers"
        }
      ]
    }
  },
  {
    "id": 115,
    "booth_number": 115,
    "coords": {
      "type": "rect",
      "x": 485.63,
      "y": 299.94,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-115",
    "company": {
      "id": "company-115",
      "name": "BNP Paribas Fortis SA/NV",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/bnpparibasfortis.com",
      "short_description": "BNP Paribas Fortis SA/NV is presenting at VTK Jobfair 2026. Visit booth 115 to connect!",
      "long_description": "BNP Paribas Fortis SA/NV is participating in the annual VTK Jobfair. Stop by stand 115 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 115",
      "website": "https://www.bnpparibasfortis.com/nl/zoek-een-job/alle-vacatures",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-115-1",
          "first_name": "Elisa",
          "last_name": "Kuperblum",
          "title": "Representative",
          "email": "elisa.kuperblum@bnpparibasfortissanv.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-115-2",
          "first_name": "Michiel",
          "last_name": "S",
          "title": "Representative",
          "email": "michiel.s@bnpparibasfortissanv.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-115-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.bnpparibasfortis.com/nl/zoek-een-job/alle-vacatures"
        },
        {
          "id": "vac-115-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.bnpparibasfortis.com/nl/zoek-een-job/alle-vacatures"
        }
      ]
    }
  },
  {
    "id": 116,
    "booth_number": 116,
    "coords": {
      "type": "rect",
      "x": 503.04,
      "y": 299.94,
      "width": 17.41,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-116",
    "company": {
      "id": "company-116",
      "name": "Terumo Europe",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/terumo-europe.com",
      "short_description": "Terumo Europe is presenting at VTK Jobfair 2026. Visit booth 116 to connect!",
      "long_description": "Terumo Europe is participating in the annual VTK Jobfair. Stop by stand 116 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 116",
      "website": "https://www.terumo-europe.com/en-EMEA",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 10,
          "name": "Biomedische Technologie",
          "short_name": "BMT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        }
      ],
      "representatives": [
        {
          "id": "rep-116-1",
          "first_name": "Marjolein",
          "last_name": "Buyl",
          "title": "Representative",
          "email": "marjolein.buyl@terumoeurope.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-116-2",
          "first_name": "Jan",
          "last_name": "Swinnen",
          "title": "Representative",
          "email": "jan.swinnen@terumoeurope.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-116-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.terumo-europe.com/en-EMEA"
        },
        {
          "id": "vac-116-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.terumo-europe.com/en-EMEA"
        }
      ]
    }
  },
  {
    "id": 117,
    "booth_number": 117,
    "coords": {
      "type": "rect",
      "x": 520.44,
      "y": 299.94,
      "width": 17.41,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-117",
    "company": {
      "id": "company-117",
      "name": "TMC Science & Technology",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/themembercompany.com",
      "short_description": "TMC Science & Technology is presenting at VTK Jobfair 2026. Visit booth 117 to connect!",
      "long_description": "TMC Science & Technology is participating in the annual VTK Jobfair. Stop by stand 117 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 117",
      "website": "https://www.themembercompany.com/about-us",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 5,
          "name": "Nanowetenschappen & Nanotechnologie",
          "short_name": "NANO"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 10,
          "name": "Biomedische Technologie",
          "short_name": "BMT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-117-1",
          "first_name": "Elly-May",
          "last_name": "Donkor",
          "title": "Representative",
          "email": "elly-may.donkor@tmcsciencetechnology.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-117-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.themembercompany.com/about-us"
        },
        {
          "id": "vac-117-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.themembercompany.com/about-us"
        }
      ]
    }
  },
  {
    "id": 118,
    "booth_number": 118,
    "coords": {
      "type": "rect",
      "x": 240.38,
      "y": 332.25,
      "width": 17.41,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-118",
    "company": {
      "id": "company-118",
      "name": "Elimity",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/elimity.com",
      "short_description": "Elimity is presenting at VTK Jobfair 2026. Visit booth 118 to connect!",
      "long_description": "Elimity is participating in the annual VTK Jobfair. Stop by stand 118 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 118",
      "website": "https://elimity.com",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        }
      ],
      "representatives": [
        {
          "id": "rep-118-1",
          "first_name": "Lars",
          "last_name": "Depuydt",
          "title": "Representative",
          "email": "lars.depuydt@elimity.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-118-2",
          "first_name": "Maarten",
          "last_name": "Decat",
          "title": "Representative",
          "email": "maarten.decat@elimity.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-118-3",
          "first_name": "Lars",
          "last_name": "Depuydt",
          "title": "Representative",
          "email": "lars.depuydt@elimity.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-118-4",
          "first_name": "Chiel",
          "last_name": "Haesendonck",
          "title": "Representative",
          "email": "chiel.haesendonck@elimity.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-118-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://elimity.com"
        },
        {
          "id": "vac-118-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://elimity.com"
        }
      ]
    }
  },
  {
    "id": 119,
    "booth_number": 119,
    "coords": {
      "type": "rect",
      "x": 257.78,
      "y": 332.25,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-119",
    "company": {
      "id": "company-119",
      "name": "NV Fujifilm Electronic Materials (Europe)",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/careers.febe.fujifilm.com",
      "short_description": "NV Fujifilm Electronic Materials (Europe) is presenting at VTK Jobfair 2026. Visit booth 119 to connect!",
      "long_description": "NV Fujifilm Electronic Materials (Europe) is participating in the annual VTK Jobfair. Stop by stand 119 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 119",
      "website": "https://careers.febe.fujifilm.com/?lang=en",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 5,
          "name": "Nanowetenschappen & Nanotechnologie",
          "short_name": "NANO"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        }
      ],
      "representatives": [
        {
          "id": "rep-119-1",
          "first_name": "Jeroen",
          "last_name": "Van De Vyver",
          "title": "Representative",
          "email": "jeroen.vandevyver@nvfujifilmelectronicmaterialseurope.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-119-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://careers.febe.fujifilm.com/?lang=en"
        },
        {
          "id": "vac-119-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://careers.febe.fujifilm.com/?lang=en"
        }
      ]
    }
  },
  {
    "id": 120,
    "booth_number": 120,
    "coords": {
      "type": "rect",
      "x": 275.19,
      "y": 332.25,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-120",
    "company": {
      "id": "company-120",
      "name": "ExxonMobil",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/corporate.exxonmobil.com",
      "short_description": "ExxonMobil is presenting at VTK Jobfair 2026. Visit booth 120 to connect!",
      "long_description": "ExxonMobil is participating in the annual VTK Jobfair. Stop by stand 120 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 120",
      "website": "https://corporate.exxonmobil.com/",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        }
      ],
      "representatives": [
        {
          "id": "rep-120-1",
          "first_name": "Emile",
          "last_name": "Ghys",
          "title": "Representative",
          "email": "emile.ghys@exxonmobil.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-120-2",
          "first_name": "Emile",
          "last_name": "Ghys",
          "title": "Representative",
          "email": "emile.ghys@exxonmobil.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-120-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://corporate.exxonmobil.com/"
        },
        {
          "id": "vac-120-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://corporate.exxonmobil.com/"
        }
      ]
    }
  },
  {
    "id": 121,
    "booth_number": 121,
    "coords": {
      "type": "rect",
      "x": 292.59,
      "y": 332.25,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-121",
    "company": {
      "id": "company-121",
      "name": "ExxonMobil",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/corporate.exxonmobil.com",
      "short_description": "ExxonMobil is presenting at VTK Jobfair 2026. Visit booth 121 to connect!",
      "long_description": "ExxonMobil is participating in the annual VTK Jobfair. Stop by stand 121 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 121",
      "website": "https://corporate.exxonmobil.com/",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        }
      ],
      "representatives": [
        {
          "id": "rep-121-1",
          "first_name": "Emile",
          "last_name": "Ghys",
          "title": "Representative",
          "email": "emile.ghys@exxonmobil.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-121-2",
          "first_name": "Emile",
          "last_name": "Ghys",
          "title": "Representative",
          "email": "emile.ghys@exxonmobil.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-121-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://corporate.exxonmobil.com/"
        },
        {
          "id": "vac-121-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://corporate.exxonmobil.com/"
        }
      ]
    }
  },
  {
    "id": 122,
    "booth_number": 122,
    "coords": {
      "type": "rect",
      "x": 310,
      "y": 332.25,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-122",
    "company": {
      "id": "company-122",
      "name": "The Binding Energy",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/thebindingenergy.com",
      "short_description": "The Binding Energy is presenting at VTK Jobfair 2026. Visit booth 122 to connect!",
      "long_description": "The Binding Energy is participating in the annual VTK Jobfair. Stop by stand 122 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 122",
      "website": "http://www.thebindingenergy.com",
      "category": [
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        }
      ],
      "representatives": [
        {
          "id": "rep-122-1",
          "first_name": "Wim",
          "last_name": "Uyttenhove",
          "title": "Representative",
          "email": "wim.uyttenhove@thebindingenergy.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-122-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "http://www.thebindingenergy.com"
        },
        {
          "id": "vac-122-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "http://www.thebindingenergy.com"
        }
      ]
    }
  },
  {
    "id": 123,
    "booth_number": 123,
    "coords": {
      "type": "rect",
      "x": 327.4,
      "y": 332.25,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-123",
    "company": {
      "id": "company-123",
      "name": "EY",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/eycareers.be",
      "short_description": "EY is presenting at VTK Jobfair 2026. Visit booth 123 to connect!",
      "long_description": "EY is participating in the annual VTK Jobfair. Stop by stand 123 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 123",
      "website": "https://eycareers.be/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        }
      ],
      "representatives": [
        {
          "id": "rep-123-1",
          "first_name": "Jolien",
          "last_name": "Philips",
          "title": "Representative",
          "email": "jolien.philips@ey.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-123-2",
          "first_name": "Maxine",
          "last_name": "Ongena",
          "title": "Representative",
          "email": "maxine.ongena@ey.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-123-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://eycareers.be/"
        },
        {
          "id": "vac-123-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://eycareers.be/"
        }
      ]
    }
  },
  {
    "id": 124,
    "booth_number": 124,
    "coords": {
      "type": "rect",
      "x": 344.81,
      "y": 332.25,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-124",
    "company": {
      "id": "company-124",
      "name": "Stadsbader NV",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/stadsbader.com",
      "short_description": "Stadsbader NV is presenting at VTK Jobfair 2026. Visit booth 124 to connect!",
      "long_description": "Stadsbader NV is participating in the annual VTK Jobfair. Stop by stand 124 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 124",
      "website": "https://www.stadsbader.com/nl",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        }
      ],
      "representatives": [
        {
          "id": "rep-124-1",
          "first_name": "Regisha",
          "last_name": "Carton",
          "title": "Representative",
          "email": "regisha.carton@stadsbadernv.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-124-2",
          "first_name": "Aysa",
          "last_name": "Huysentruyt",
          "title": "Representative",
          "email": "aysa.huysentruyt@stadsbadernv.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-124-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.stadsbader.com/nl"
        },
        {
          "id": "vac-124-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.stadsbader.com/nl"
        }
      ]
    }
  },
  {
    "id": 125,
    "booth_number": 125,
    "coords": {
      "type": "rect",
      "x": 362.21,
      "y": 332.25,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-125",
    "company": {
      "id": "company-125",
      "name": "AREMIS Belgium",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/aremis.com",
      "short_description": "AREMIS Belgium is presenting at VTK Jobfair 2026. Visit booth 125 to connect!",
      "long_description": "AREMIS Belgium is participating in the annual VTK Jobfair. Stop by stand 125 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 125",
      "website": "https://aremis.com",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-125-1",
          "first_name": "Alex",
          "last_name": "Cozzutto",
          "title": "Representative",
          "email": "alex.cozzutto@aremisbelgium.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-125-2",
          "first_name": "alex",
          "last_name": "marketing",
          "title": "Representative",
          "email": "alex.marketing@aremisbelgium.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-125-3",
          "first_name": "Simon",
          "last_name": "Gautry",
          "title": "Representative",
          "email": "simon.gautry@aremisbelgium.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-125-4",
          "first_name": "Christine",
          "last_name": "Kastoun",
          "title": "Representative",
          "email": "christine.kastoun@aremisbelgium.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-125-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://aremis.com"
        },
        {
          "id": "vac-125-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://aremis.com"
        }
      ]
    }
  },
  {
    "id": 126,
    "booth_number": 126,
    "coords": {
      "type": "rect",
      "x": 398.61,
      "y": 332.25,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-126",
    "company": {
      "id": "company-126",
      "name": "H.Essers",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/jobs.essers.com",
      "short_description": "H.Essers is presenting at VTK Jobfair 2026. Visit booth 126 to connect!",
      "long_description": "H.Essers is participating in the annual VTK Jobfair. Stop by stand 126 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 126",
      "website": "https://jobs.essers.com/nl-be/vacatures/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-126-1",
          "first_name": "Jolien",
          "last_name": "Bouchet",
          "title": "Representative",
          "email": "jolien.bouchet@hessers.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-126-2",
          "first_name": "Hanne",
          "last_name": "Voets",
          "title": "Representative",
          "email": "hanne.voets@hessers.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-126-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://jobs.essers.com/nl-be/vacatures/"
        },
        {
          "id": "vac-126-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://jobs.essers.com/nl-be/vacatures/"
        }
      ]
    }
  },
  {
    "id": 127,
    "booth_number": 127,
    "coords": {
      "type": "rect",
      "x": 416.01,
      "y": 332.25,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-127",
    "company": {
      "id": "company-127",
      "name": "Bureau Greisch",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/greisch.com",
      "short_description": "Bureau Greisch is presenting at VTK Jobfair 2026. Visit booth 127 to connect!",
      "long_description": "Bureau Greisch is participating in the annual VTK Jobfair. Stop by stand 127 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 127",
      "website": "https://www.greisch.com/nl/nl-home-nl/",
      "category": [
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        }
      ],
      "representatives": [
        {
          "id": "rep-127-1",
          "first_name": "Louise",
          "last_name": "Fortemps",
          "title": "Representative",
          "email": "louise.fortemps@bureaugreisch.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-127-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.greisch.com/nl/nl-home-nl/"
        },
        {
          "id": "vac-127-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.greisch.com/nl/nl-home-nl/"
        }
      ]
    }
  },
  {
    "id": 128,
    "booth_number": 128,
    "coords": {
      "type": "rect",
      "x": 433.42,
      "y": 332.25,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-128",
    "company": {
      "id": "company-128",
      "name": "Deloitte Belgium",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/deloitte.com",
      "short_description": "Deloitte Belgium is presenting at VTK Jobfair 2026. Visit booth 128 to connect!",
      "long_description": "Deloitte Belgium is participating in the annual VTK Jobfair. Stop by stand 128 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 128",
      "website": "https://www.deloitte.com/be/en/careers/graduates.html",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 5,
          "name": "Nanowetenschappen & Nanotechnologie",
          "short_name": "NANO"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 10,
          "name": "Biomedische Technologie",
          "short_name": "BMT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        }
      ],
      "representatives": [
        {
          "id": "rep-128-1",
          "first_name": "Sofie",
          "last_name": "Vanderweyden",
          "title": "Representative",
          "email": "sofie.vanderweyden@deloittebelgium.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-128-2",
          "first_name": "Emile",
          "last_name": "Valcke",
          "title": "Representative",
          "email": "emile.valcke@deloittebelgium.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-128-3",
          "first_name": "Esther",
          "last_name": "Prevoo",
          "title": "Representative",
          "email": "esther.prevoo@deloittebelgium.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-128-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.deloitte.com/be/en/careers/graduates.html"
        },
        {
          "id": "vac-128-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.deloitte.com/be/en/careers/graduates.html"
        }
      ]
    }
  },
  {
    "id": 129,
    "booth_number": 129,
    "coords": {
      "type": "rect",
      "x": 450.82,
      "y": 332.25,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-129",
    "company": {
      "id": "company-129",
      "name": "Deloitte Belgium",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/deloitte.com",
      "short_description": "Deloitte Belgium is presenting at VTK Jobfair 2026. Visit booth 129 to connect!",
      "long_description": "Deloitte Belgium is participating in the annual VTK Jobfair. Stop by stand 129 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 129",
      "website": "https://www.deloitte.com/be/en/careers/graduates.html",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 5,
          "name": "Nanowetenschappen & Nanotechnologie",
          "short_name": "NANO"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 10,
          "name": "Biomedische Technologie",
          "short_name": "BMT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        }
      ],
      "representatives": [
        {
          "id": "rep-129-1",
          "first_name": "Emile",
          "last_name": "Valcke",
          "title": "Representative",
          "email": "emile.valcke@deloittebelgium.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-129-2",
          "first_name": "Esther",
          "last_name": "Prevoo",
          "title": "Representative",
          "email": "esther.prevoo@deloittebelgium.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-129-3",
          "first_name": "Sofie",
          "last_name": "Vanderweyden",
          "title": "Representative",
          "email": "sofie.vanderweyden@deloittebelgium.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-129-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.deloitte.com/be/en/careers/graduates.html"
        },
        {
          "id": "vac-129-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.deloitte.com/be/en/careers/graduates.html"
        }
      ]
    }
  },
  {
    "id": 130,
    "booth_number": 130,
    "coords": {
      "type": "rect",
      "x": 468.23,
      "y": 332.25,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-130",
    "company": {
      "id": "company-130",
      "name": "LAB Motion Systems",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/labmotionsystems.com",
      "short_description": "LAB Motion Systems is presenting at VTK Jobfair 2026. Visit booth 130 to connect!",
      "long_description": "LAB Motion Systems is participating in the annual VTK Jobfair. Stop by stand 130 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 130",
      "website": "https://www.labmotionsystems.com/",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        }
      ],
      "representatives": [
        {
          "id": "rep-130-1",
          "first_name": "Marina",
          "last_name": "Meyer",
          "title": "Representative",
          "email": "marina.meyer@labmotionsystems.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-130-2",
          "first_name": "Hanne",
          "last_name": "Palmans",
          "title": "Representative",
          "email": "hanne.palmans@labmotionsystems.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-130-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.labmotionsystems.com/"
        },
        {
          "id": "vac-130-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.labmotionsystems.com/"
        }
      ]
    }
  },
  {
    "id": 131,
    "booth_number": 131,
    "coords": {
      "type": "rect",
      "x": 485.63,
      "y": 332.25,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-131",
    "company": {
      "id": "company-131",
      "name": "Groep Van Roey",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/groepvanroey.be",
      "short_description": "Groep Van Roey is presenting at VTK Jobfair 2026. Visit booth 131 to connect!",
      "long_description": "Groep Van Roey is participating in the annual VTK Jobfair. Stop by stand 131 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 131",
      "website": "https://www.groepvanroey.be",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        }
      ],
      "representatives": [
        {
          "id": "rep-131-1",
          "first_name": "Hanne",
          "last_name": "Claus",
          "title": "Representative",
          "email": "hanne.claus@groepvanroey.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-131-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.groepvanroey.be"
        },
        {
          "id": "vac-131-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.groepvanroey.be"
        }
      ]
    }
  },
  {
    "id": 132,
    "booth_number": 132,
    "coords": {
      "type": "rect",
      "x": 503.04,
      "y": 332.25,
      "width": 17.41,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-132",
    "company": {
      "id": "company-132",
      "name": "Houben NV",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/houbennv.be",
      "short_description": "Houben NV is presenting at VTK Jobfair 2026. Visit booth 132 to connect!",
      "long_description": "Houben NV is participating in the annual VTK Jobfair. Stop by stand 132 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 132",
      "website": "https://www.houbennv.be",
      "category": [
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        }
      ],
      "representatives": [
        {
          "id": "rep-132-1",
          "first_name": "Info",
          "last_name": "Houben",
          "title": "Representative",
          "email": "info.houben@houbennv.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-132-2",
          "first_name": "Gerry",
          "last_name": "Vanhoonacker",
          "title": "Representative",
          "email": "gerry.vanhoonacker@houbennv.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-132-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.houbennv.be"
        },
        {
          "id": "vac-132-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.houbennv.be"
        }
      ]
    }
  },
  {
    "id": 133,
    "booth_number": 133,
    "coords": {
      "type": "rect",
      "x": 520.44,
      "y": 332.25,
      "width": 17.41,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-133",
    "company": {
      "id": "company-133",
      "name": "Synopsys",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/synopsys.com",
      "short_description": "Synopsys is presenting at VTK Jobfair 2026. Visit booth 133 to connect!",
      "long_description": "Synopsys is participating in the annual VTK Jobfair. Stop by stand 133 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 133",
      "website": "https://www.synopsys.com",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 5,
          "name": "Nanowetenschappen & Nanotechnologie",
          "short_name": "NANO"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        }
      ],
      "representatives": [
        {
          "id": "rep-133-1",
          "first_name": "Gert",
          "last_name": "Goossens",
          "title": "Representative",
          "email": "gert.goossens@synopsys.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-133-2",
          "first_name": "Johan",
          "last_name": "Van Praet",
          "title": "Representative",
          "email": "johan.vanpraet@synopsys.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-133-3",
          "first_name": "Jeroen",
          "last_name": "Dobbelaere",
          "title": "Representative",
          "email": "jeroen.dobbelaere@synopsys.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-133-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.synopsys.com"
        },
        {
          "id": "vac-133-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.synopsys.com"
        }
      ]
    }
  },
  {
    "id": 134,
    "booth_number": 134,
    "coords": {
      "type": "rect",
      "x": 240.38,
      "y": 345.67,
      "width": 17.41,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-134",
    "company": {
      "id": "company-134",
      "name": "SII",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/sii-group.com",
      "short_description": "SII is presenting at VTK Jobfair 2026. Visit booth 134 to connect!",
      "long_description": "SII is participating in the annual VTK Jobfair. Stop by stand 134 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 134",
      "website": "https://sii-group.com/fr-BE",
      "category": [
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-134-1",
          "first_name": "Marie",
          "last_name": "Monna",
          "title": "Representative",
          "email": "marie.monna@sii.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-134-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://sii-group.com/fr-BE"
        },
        {
          "id": "vac-134-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://sii-group.com/fr-BE"
        }
      ]
    }
  },
  {
    "id": 135,
    "booth_number": 135,
    "coords": {
      "type": "rect",
      "x": 257.78,
      "y": 345.67,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-135",
    "company": {
      "id": "company-135",
      "name": "Cegelec NV",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/cegelec.be",
      "short_description": "Cegelec NV is presenting at VTK Jobfair 2026. Visit booth 135 to connect!",
      "long_description": "Cegelec NV is participating in the annual VTK Jobfair. Stop by stand 135 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 135",
      "website": "https://www.cegelec.be/",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        }
      ],
      "representatives": [
        {
          "id": "rep-135-1",
          "first_name": "Jill",
          "last_name": "Boeren",
          "title": "Representative",
          "email": "jill.boeren@cegelecnv.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-135-2",
          "first_name": "Helene",
          "last_name": "Vanderhaeghe",
          "title": "Representative",
          "email": "helene.vanderhaeghe@cegelecnv.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-135-3",
          "first_name": "Sarah",
          "last_name": "Hermans",
          "title": "Representative",
          "email": "sarah.hermans@cegelecnv.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-135-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.cegelec.be/"
        },
        {
          "id": "vac-135-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.cegelec.be/"
        }
      ]
    }
  },
  {
    "id": 136,
    "booth_number": 136,
    "coords": {
      "type": "rect",
      "x": 275.19,
      "y": 345.67,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-136",
    "company": {
      "id": "company-136",
      "name": "ON Semiconductor Technology",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/onsemi.com",
      "short_description": "ON Semiconductor Technology is presenting at VTK Jobfair 2026. Visit booth 136 to connect!",
      "long_description": "ON Semiconductor Technology is participating in the annual VTK Jobfair. Stop by stand 136 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 136",
      "website": "https://www.onsemi.com/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 5,
          "name": "Nanowetenschappen & Nanotechnologie",
          "short_name": "NANO"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-136-1",
          "first_name": "Iris",
          "last_name": "Demorelle",
          "title": "Representative",
          "email": "iris.demorelle@onsemiconductortechnology.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-136-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.onsemi.com/"
        },
        {
          "id": "vac-136-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.onsemi.com/"
        }
      ]
    }
  },
  {
    "id": 137,
    "booth_number": 137,
    "coords": {
      "type": "rect",
      "x": 292.59,
      "y": 345.67,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-137",
    "company": {
      "id": "company-137",
      "name": "Studibo",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/studibo.be",
      "short_description": "Studibo is presenting at VTK Jobfair 2026. Visit booth 137 to connect!",
      "long_description": "Studibo is participating in the annual VTK Jobfair. Stop by stand 137 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 137",
      "website": "https://studibo.be/",
      "category": [
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        }
      ],
      "representatives": [
        {
          "id": "rep-137-1",
          "first_name": "Axelle",
          "last_name": "Van Eesbeek",
          "title": "Representative",
          "email": "axelle.vaneesbeek@studibo.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-137-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://studibo.be/"
        },
        {
          "id": "vac-137-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://studibo.be/"
        }
      ]
    }
  },
  {
    "id": 138,
    "booth_number": 138,
    "coords": {
      "type": "rect",
      "x": 310,
      "y": 345.67,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-138",
    "company": {
      "id": "company-138",
      "name": "Unipat",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/vo.eu",
      "short_description": "Unipat is presenting at VTK Jobfair 2026. Visit booth 138 to connect!",
      "long_description": "Unipat is participating in the annual VTK Jobfair. Stop by stand 138 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 138",
      "website": "https://www.vo.eu/nl/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 5,
          "name": "Nanowetenschappen & Nanotechnologie",
          "short_name": "NANO"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 10,
          "name": "Biomedische Technologie",
          "short_name": "BMT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-138-1",
          "first_name": "Annemie",
          "last_name": "Jaeken",
          "title": "Representative",
          "email": "annemie.jaeken@unipat.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-138-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.vo.eu/nl/"
        },
        {
          "id": "vac-138-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.vo.eu/nl/"
        }
      ]
    }
  },
  {
    "id": 139,
    "booth_number": 139,
    "coords": {
      "type": "rect",
      "x": 327.4,
      "y": 345.67,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-139",
    "company": {
      "id": "company-139",
      "name": "Atlas Copco Group",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/atlascopcogroup.com",
      "short_description": "Atlas Copco Group is presenting at VTK Jobfair 2026. Visit booth 139 to connect!",
      "long_description": "Atlas Copco Group is participating in the annual VTK Jobfair. Stop by stand 139 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 139",
      "website": "https://www.atlascopcogroup.com/nl-be",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 5,
          "name": "Nanowetenschappen & Nanotechnologie",
          "short_name": "NANO"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-139-1",
          "first_name": "Olivia",
          "last_name": "Smeets",
          "title": "Representative",
          "email": "olivia.smeets@atlascopcogroup.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-139-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.atlascopcogroup.com/nl-be"
        },
        {
          "id": "vac-139-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.atlascopcogroup.com/nl-be"
        }
      ]
    }
  },
  {
    "id": 140,
    "booth_number": 140,
    "coords": {
      "type": "rect",
      "x": 344.81,
      "y": 345.67,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-140",
    "company": {
      "id": "company-140",
      "name": "RP One",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/rp-one.eu",
      "short_description": "RP One is presenting at VTK Jobfair 2026. Visit booth 140 to connect!",
      "long_description": "RP One is participating in the annual VTK Jobfair. Stop by stand 140 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 140",
      "website": "https://www.rp-one.eu/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-140-1",
          "first_name": "Maxime",
          "last_name": "Neutjens",
          "title": "Representative",
          "email": "maxime.neutjens@rpone.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-140-2",
          "first_name": "Thomas",
          "last_name": "Plumanns",
          "title": "Representative",
          "email": "thomas.plumanns@rpone.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-140-3",
          "first_name": "Tricia",
          "last_name": "Meyvis",
          "title": "Representative",
          "email": "tricia.meyvis@rpone.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-140-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.rp-one.eu/"
        },
        {
          "id": "vac-140-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.rp-one.eu/"
        }
      ]
    }
  },
  {
    "id": 141,
    "booth_number": 141,
    "coords": {
      "type": "rect",
      "x": 362.21,
      "y": 345.67,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-141",
    "company": {
      "id": "company-141",
      "name": "WEB International",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/one-web.nl",
      "short_description": "WEB International is presenting at VTK Jobfair 2026. Visit booth 141 to connect!",
      "long_description": "WEB International is participating in the annual VTK Jobfair. Stop by stand 141 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 141",
      "website": "https://one-web.nl/",
      "category": [
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-141-1",
          "first_name": "Natasha",
          "last_name": "Devit",
          "title": "Representative",
          "email": "natasha.devit@webinternational.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-141-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://one-web.nl/"
        },
        {
          "id": "vac-141-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://one-web.nl/"
        }
      ]
    }
  },
  {
    "id": 142,
    "booth_number": 142,
    "coords": {
      "type": "rect",
      "x": 398.61,
      "y": 345.67,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-142",
    "company": {
      "id": "company-142",
      "name": "Lotus Bakeries Belgium",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/lotusbakeries.be",
      "short_description": "Lotus Bakeries Belgium is presenting at VTK Jobfair 2026. Visit booth 142 to connect!",
      "long_description": "Lotus Bakeries Belgium is participating in the annual VTK Jobfair. Stop by stand 142 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 142",
      "website": "https://www.lotusbakeries.be/nl",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-142-1",
          "first_name": "Amélie",
          "last_name": "Van Beveren",
          "title": "Representative",
          "email": "amélie.vanbeveren@lotusbakeriesbelgium.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-142-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.lotusbakeries.be/nl"
        },
        {
          "id": "vac-142-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.lotusbakeries.be/nl"
        }
      ]
    }
  },
  {
    "id": 143,
    "booth_number": 143,
    "coords": {
      "type": "rect",
      "x": 416.01,
      "y": 345.67,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-143",
    "company": {
      "id": "company-143",
      "name": "Caeleste",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/caeleste.be",
      "short_description": "Caeleste is presenting at VTK Jobfair 2026. Visit booth 143 to connect!",
      "long_description": "Caeleste is participating in the annual VTK Jobfair. Stop by stand 143 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 143",
      "website": "https://caeleste.be/",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        }
      ],
      "representatives": [
        {
          "id": "rep-143-1",
          "first_name": "Ewa",
          "last_name": "Burzynska",
          "title": "Representative",
          "email": "ewa.burzynska@caeleste.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-143-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://caeleste.be/"
        },
        {
          "id": "vac-143-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://caeleste.be/"
        }
      ]
    }
  },
  {
    "id": 144,
    "booth_number": 144,
    "coords": {
      "type": "rect",
      "x": 433.42,
      "y": 345.67,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-144",
    "company": {
      "id": "company-144",
      "name": "Addestino",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/addestino.be",
      "short_description": "Addestino is presenting at VTK Jobfair 2026. Visit booth 144 to connect!",
      "long_description": "Addestino is participating in the annual VTK Jobfair. Stop by stand 144 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 144",
      "website": "https://addestino.be/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 10,
          "name": "Biomedische Technologie",
          "short_name": "BMT"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        }
      ],
      "representatives": [
        {
          "id": "rep-144-1",
          "first_name": "Stephani",
          "last_name": "Van Goethem",
          "title": "Representative",
          "email": "stephani.vangoethem@addestino.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-144-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://addestino.be/"
        },
        {
          "id": "vac-144-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://addestino.be/"
        }
      ]
    }
  },
  {
    "id": 145,
    "booth_number": 145,
    "coords": {
      "type": "rect",
      "x": 450.82,
      "y": 345.67,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-145",
    "company": {
      "id": "company-145",
      "name": "Procter & Gamble Manufacturing",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/pgcareers.com",
      "short_description": "Procter & Gamble Manufacturing is presenting at VTK Jobfair 2026. Visit booth 145 to connect!",
      "long_description": "Procter & Gamble Manufacturing is participating in the annual VTK Jobfair. Stop by stand 145 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 145",
      "website": "https://www.pgcareers.com/global/en/locations/belgium",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 5,
          "name": "Nanowetenschappen & Nanotechnologie",
          "short_name": "NANO"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 10,
          "name": "Biomedische Technologie",
          "short_name": "BMT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        }
      ],
      "representatives": [
        {
          "id": "rep-145-1",
          "first_name": "Kavishk",
          "last_name": "Kathayat",
          "title": "Representative",
          "email": "kavishk.kathayat@proctergamblemanufacturing.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-145-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.pgcareers.com/global/en/locations/belgium"
        },
        {
          "id": "vac-145-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.pgcareers.com/global/en/locations/belgium"
        }
      ]
    }
  },
  {
    "id": 146,
    "booth_number": 146,
    "coords": {
      "type": "rect",
      "x": 468.23,
      "y": 345.67,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-146",
    "company": {
      "id": "company-146",
      "name": "NOVA Engineering",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/nova-engineering.be",
      "short_description": "NOVA Engineering is presenting at VTK Jobfair 2026. Visit booth 146 to connect!",
      "long_description": "NOVA Engineering is participating in the annual VTK Jobfair. Stop by stand 146 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 146",
      "website": "https://nova-engineering.be/",
      "category": [
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        }
      ],
      "representatives": [
        {
          "id": "rep-146-1",
          "first_name": "Iman",
          "last_name": "Van De Perre",
          "title": "Representative",
          "email": "iman.vandeperre@novaengineering.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-146-2",
          "first_name": "Melissa",
          "last_name": "De coninck",
          "title": "Representative",
          "email": "melissa.deconinck@novaengineering.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-146-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://nova-engineering.be/"
        },
        {
          "id": "vac-146-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://nova-engineering.be/"
        }
      ]
    }
  },
  {
    "id": 147,
    "booth_number": 147,
    "coords": {
      "type": "rect",
      "x": 485.63,
      "y": 345.67,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-147",
    "company": {
      "id": "company-147",
      "name": "Flanders Make",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/flandersmake.be",
      "short_description": "Flanders Make is presenting at VTK Jobfair 2026. Visit booth 147 to connect!",
      "long_description": "Flanders Make is participating in the annual VTK Jobfair. Stop by stand 147 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 147",
      "website": "https://www.flandersmake.be/en",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        }
      ],
      "representatives": [
        {
          "id": "rep-147-1",
          "first_name": "Katrien",
          "last_name": "Geebelen",
          "title": "Representative",
          "email": "katrien.geebelen@flandersmake.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-147-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.flandersmake.be/en"
        },
        {
          "id": "vac-147-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.flandersmake.be/en"
        }
      ]
    }
  },
  {
    "id": 148,
    "booth_number": 148,
    "coords": {
      "type": "rect",
      "x": 503.04,
      "y": 345.67,
      "width": 17.41,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-148",
    "company": {
      "id": "company-148",
      "name": "NV Borealis Polymers",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/borealisgroup.com",
      "short_description": "NV Borealis Polymers is presenting at VTK Jobfair 2026. Visit booth 148 to connect!",
      "long_description": "NV Borealis Polymers is participating in the annual VTK Jobfair. Stop by stand 148 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 148",
      "website": "https://www.borealisgroup.com/",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        }
      ],
      "representatives": [
        {
          "id": "rep-148-1",
          "first_name": "Joke",
          "last_name": "Tielens",
          "title": "Representative",
          "email": "joke.tielens@nvborealispolymers.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-148-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.borealisgroup.com/"
        },
        {
          "id": "vac-148-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.borealisgroup.com/"
        }
      ]
    }
  },
  {
    "id": 149,
    "booth_number": 149,
    "coords": {
      "type": "rect",
      "x": 520.44,
      "y": 345.67,
      "width": 17.41,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-149",
    "company": {
      "id": "company-149",
      "name": "DATADOBI BV",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/datadobi.com",
      "short_description": "DATADOBI BV is presenting at VTK Jobfair 2026. Visit booth 149 to connect!",
      "long_description": "DATADOBI BV is participating in the annual VTK Jobfair. Stop by stand 149 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 149",
      "website": "https://datadobi.com/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        }
      ],
      "representatives": [
        {
          "id": "rep-149-1",
          "first_name": "Linda",
          "last_name": "De Schrijver",
          "title": "Representative",
          "email": "linda.deschrijver@datadobibv.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-149-2",
          "first_name": "Melissa",
          "last_name": "Berckmans",
          "title": "Representative",
          "email": "melissa.berckmans@datadobibv.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-149-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://datadobi.com/"
        },
        {
          "id": "vac-149-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://datadobi.com/"
        }
      ]
    }
  },
  {
    "id": 150,
    "booth_number": 150,
    "coords": {
      "type": "rect",
      "x": 226.5,
      "y": 375.79,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-150",
    "company": {
      "id": "company-150",
      "name": "Redwire Space",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/rdw.com",
      "short_description": "Redwire Space is presenting at VTK Jobfair 2026. Visit booth 150 to connect!",
      "long_description": "Redwire Space is participating in the annual VTK Jobfair. Stop by stand 150 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 150",
      "website": "https://rdw.com/about/",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 10,
          "name": "Biomedische Technologie",
          "short_name": "BMT"
        }
      ],
      "representatives": [
        {
          "id": "rep-150-1",
          "first_name": "James",
          "last_name": "Earwicker",
          "title": "Representative",
          "email": "james.earwicker@redwirespace.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-150-2",
          "first_name": "James",
          "last_name": "Earwicker",
          "title": "Representative",
          "email": "james.earwicker@redwirespace.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-150-3",
          "first_name": "Kathleen",
          "last_name": "D'Eer",
          "title": "Representative",
          "email": "kathleen.d'eer@redwirespace.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-150-4",
          "first_name": "Tessa",
          "last_name": "Parmentier",
          "title": "Representative",
          "email": "tessa.parmentier@redwirespace.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-150-5",
          "first_name": "Tessa",
          "last_name": "Parmentier",
          "title": "Representative",
          "email": "tessa.parmentier@redwirespace.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-150-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://rdw.com/about/"
        },
        {
          "id": "vac-150-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://rdw.com/about/"
        }
      ]
    }
  },
  {
    "id": 151,
    "booth_number": 151,
    "coords": {
      "type": "rect",
      "x": 243.9,
      "y": 375.79,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-151",
    "company": {
      "id": "company-151",
      "name": "Elia",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/jobs.elia.be",
      "short_description": "Elia is presenting at VTK Jobfair 2026. Visit booth 151 to connect!",
      "long_description": "Elia is participating in the annual VTK Jobfair. Stop by stand 151 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 151",
      "website": "https://jobs.elia.be/en/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-151-1",
          "first_name": "Campus",
          "last_name": "Elia",
          "title": "Representative",
          "email": "campus.elia@elia.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-151-2",
          "first_name": "Ellen",
          "last_name": "Geerts",
          "title": "Representative",
          "email": "ellen.geerts@elia.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-151-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://jobs.elia.be/en/"
        },
        {
          "id": "vac-151-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://jobs.elia.be/en/"
        }
      ]
    }
  },
  {
    "id": 152,
    "booth_number": 152,
    "coords": {
      "type": "rect",
      "x": 261.31,
      "y": 375.79,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-152",
    "company": {
      "id": "company-152",
      "name": "NV Nyrstar Belgium",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/nyrstar.com",
      "short_description": "NV Nyrstar Belgium is presenting at VTK Jobfair 2026. Visit booth 152 to connect!",
      "long_description": "NV Nyrstar Belgium is participating in the annual VTK Jobfair. Stop by stand 152 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 152",
      "website": "https://www.nyrstar.com/",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        }
      ],
      "representatives": [
        {
          "id": "rep-152-1",
          "first_name": "Liesbeth",
          "last_name": "Donckers",
          "title": "Representative",
          "email": "liesbeth.donckers@nvnyrstarbelgium.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-152-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.nyrstar.com/"
        },
        {
          "id": "vac-152-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.nyrstar.com/"
        }
      ]
    }
  },
  {
    "id": 153,
    "booth_number": 153,
    "coords": {
      "type": "rect",
      "x": 278.71,
      "y": 375.79,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-153",
    "company": {
      "id": "company-153",
      "name": "SBE",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/sbe-engineering.com",
      "short_description": "SBE is presenting at VTK Jobfair 2026. Visit booth 153 to connect!",
      "long_description": "SBE is participating in the annual VTK Jobfair. Stop by stand 153 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 153",
      "website": "https://sbe-engineering.com/",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        }
      ],
      "representatives": [
        {
          "id": "rep-153-1",
          "first_name": "Merel",
          "last_name": "Speleman",
          "title": "Representative",
          "email": "merel.speleman@sbe.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-153-2",
          "first_name": "Joke",
          "last_name": "Van De Velde",
          "title": "Representative",
          "email": "joke.vandevelde@sbe.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-153-3",
          "first_name": "Nicolas",
          "last_name": "Maes",
          "title": "Representative",
          "email": "nicolas.maes@sbe.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-153-4",
          "first_name": "Lennert",
          "last_name": "Vandemeulebroucke",
          "title": "Representative",
          "email": "lennert.vandemeulebroucke@sbe.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-153-5",
          "first_name": "Ken",
          "last_name": "Schotte",
          "title": "Representative",
          "email": "ken.schotte@sbe.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-153-6",
          "first_name": "Axel",
          "last_name": "Raes",
          "title": "Representative",
          "email": "axel.raes@sbe.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-153-7",
          "first_name": "Jeroen",
          "last_name": "Bossuyt",
          "title": "Representative",
          "email": "jeroen.bossuyt@sbe.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-153-8",
          "first_name": "Julie",
          "last_name": "De Roeck",
          "title": "Representative",
          "email": "julie.deroeck@sbe.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-153-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://sbe-engineering.com/"
        },
        {
          "id": "vac-153-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://sbe-engineering.com/"
        }
      ]
    }
  },
  {
    "id": 154,
    "booth_number": 154,
    "coords": {
      "type": "rect",
      "x": 296.11,
      "y": 375.79,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-154",
    "company": {
      "id": "company-154",
      "name": "ENTSO-E",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/entsoe.eu",
      "short_description": "ENTSO-E is presenting at VTK Jobfair 2026. Visit booth 154 to connect!",
      "long_description": "ENTSO-E is participating in the annual VTK Jobfair. Stop by stand 154 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 154",
      "website": "https://www.entsoe.eu/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        }
      ],
      "representatives": [
        {
          "id": "rep-154-1",
          "first_name": "Emilienne",
          "last_name": "Thiry",
          "title": "Representative",
          "email": "emilienne.thiry@entsoe.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-154-2",
          "first_name": "Sanna",
          "last_name": "Harborg",
          "title": "Representative",
          "email": "sanna.harborg@entsoe.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-154-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.entsoe.eu/"
        },
        {
          "id": "vac-154-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.entsoe.eu/"
        }
      ]
    }
  },
  {
    "id": 155,
    "booth_number": 155,
    "coords": {
      "type": "rect",
      "x": 313.52,
      "y": 375.79,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-155",
    "company": {
      "id": "company-155",
      "name": "KBC",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/kbc.be",
      "short_description": "KBC is presenting at VTK Jobfair 2026. Visit booth 155 to connect!",
      "long_description": "KBC is participating in the annual VTK Jobfair. Stop by stand 155 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 155",
      "website": "https://www.kbc.be/jobs",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 5,
          "name": "Nanowetenschappen & Nanotechnologie",
          "short_name": "NANO"
        }
      ],
      "representatives": [
        {
          "id": "rep-155-1",
          "first_name": "Valérie",
          "last_name": "Onclin",
          "title": "Representative",
          "email": "valérie.onclin@kbc.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-155-2",
          "first_name": "Isabelle",
          "last_name": "Demeyst",
          "title": "Representative",
          "email": "isabelle.demeyst@kbc.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-155-3",
          "first_name": "Jobs",
          "last_name": "KBC",
          "title": "Representative",
          "email": "jobs.kbc@kbc.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-155-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.kbc.be/jobs"
        },
        {
          "id": "vac-155-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.kbc.be/jobs"
        }
      ]
    }
  },
  {
    "id": 156,
    "booth_number": 156,
    "coords": {
      "type": "rect",
      "x": 330.92,
      "y": 375.79,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-156",
    "company": {
      "id": "company-156",
      "name": "Port of Antwerp-Bruges",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/portofantwerpbruges.com",
      "short_description": "Port of Antwerp-Bruges is presenting at VTK Jobfair 2026. Visit booth 156 to connect!",
      "long_description": "Port of Antwerp-Bruges is participating in the annual VTK Jobfair. Stop by stand 156 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 156",
      "website": "https://www.portofantwerpbruges.com/jobs",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 5,
          "name": "Nanowetenschappen & Nanotechnologie",
          "short_name": "NANO"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        }
      ],
      "representatives": [
        {
          "id": "rep-156-1",
          "first_name": "Thierry",
          "last_name": "Cobbaut",
          "title": "Representative",
          "email": "thierry.cobbaut@portofantwerpbruges.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-156-2",
          "first_name": "Sophie",
          "last_name": "Marck",
          "title": "Representative",
          "email": "sophie.marck@portofantwerpbruges.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-156-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.portofantwerpbruges.com/jobs"
        },
        {
          "id": "vac-156-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.portofantwerpbruges.com/jobs"
        }
      ]
    }
  },
  {
    "id": 157,
    "booth_number": 157,
    "coords": {
      "type": "rect",
      "x": 348.33,
      "y": 375.79,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-157",
    "company": {
      "id": "company-157",
      "name": "Buildwise",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/buildwise.be",
      "short_description": "Buildwise is presenting at VTK Jobfair 2026. Visit booth 157 to connect!",
      "long_description": "Buildwise is participating in the annual VTK Jobfair. Stop by stand 157 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 157",
      "website": "https://www.buildwise.be/nl/",
      "category": [
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        }
      ],
      "representatives": [
        {
          "id": "rep-157-1",
          "first_name": "Emmanuelle",
          "last_name": "Antoniou",
          "title": "Representative",
          "email": "emmanuelle.antoniou@buildwise.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-157-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.buildwise.be/nl/"
        },
        {
          "id": "vac-157-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.buildwise.be/nl/"
        }
      ]
    }
  },
  {
    "id": 158,
    "booth_number": 158,
    "coords": {
      "type": "rect",
      "x": 365.73,
      "y": 375.79,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-158",
    "company": {
      "id": "company-158",
      "name": "BAM Belgium (Kairos - BAM Interbuild - BAM fm)",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/bambelgium.be",
      "short_description": "BAM Belgium (Kairos - BAM Interbuild - BAM fm) is presenting at VTK Jobfair 2026. Visit booth 158 to connect!",
      "long_description": "BAM Belgium (Kairos - BAM Interbuild - BAM fm) is participating in the annual VTK Jobfair. Stop by stand 158 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 158",
      "website": "https://www.bambelgium.be/",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        }
      ],
      "representatives": [
        {
          "id": "rep-158-1",
          "first_name": "Roel",
          "last_name": "De Raeymaeker",
          "title": "Representative",
          "email": "roel.deraeymaeker@bambelgiumkairosbaminterbuildbamfm.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-158-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.bambelgium.be/"
        },
        {
          "id": "vac-158-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.bambelgium.be/"
        }
      ]
    }
  },
  {
    "id": 159,
    "booth_number": 159,
    "coords": {
      "type": "rect",
      "x": 383.14,
      "y": 375.79,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-159",
    "company": {
      "id": "company-159",
      "name": "Tormans",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/tormans.net",
      "short_description": "Tormans is presenting at VTK Jobfair 2026. Visit booth 159 to connect!",
      "long_description": "Tormans is participating in the annual VTK Jobfair. Stop by stand 159 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 159",
      "website": "http://www.tormans.net",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 5,
          "name": "Nanowetenschappen & Nanotechnologie",
          "short_name": "NANO"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-159-1",
          "first_name": "Andrea",
          "last_name": "Stesmans",
          "title": "Representative",
          "email": "andrea.stesmans@tormans.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-159-2",
          "first_name": "Anke",
          "last_name": "Teughels",
          "title": "Representative",
          "email": "anke.teughels@tormans.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-159-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "http://www.tormans.net"
        },
        {
          "id": "vac-159-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "http://www.tormans.net"
        }
      ]
    }
  },
  {
    "id": 160,
    "booth_number": 160,
    "coords": {
      "type": "rect",
      "x": 400.54,
      "y": 375.79,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-160",
    "company": {
      "id": "company-160",
      "name": "Keysight Technologies",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/keysight.com",
      "short_description": "Keysight Technologies is presenting at VTK Jobfair 2026. Visit booth 160 to connect!",
      "long_description": "Keysight Technologies is participating in the annual VTK Jobfair. Stop by stand 160 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 160",
      "website": "https://www.keysight.com/us/en/home.html",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        }
      ],
      "representatives": [
        {
          "id": "rep-160-1",
          "first_name": "Kaoutar",
          "last_name": "Hazim",
          "title": "Representative",
          "email": "kaoutar.hazim@keysighttechnologies.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-160-2",
          "first_name": "Rafael",
          "last_name": "Cavalcanti",
          "title": "Representative",
          "email": "rafael.cavalcanti@keysighttechnologies.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-160-3",
          "first_name": "Sam",
          "last_name": "Vervaeck",
          "title": "Representative",
          "email": "sam.vervaeck@keysighttechnologies.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-160-4",
          "first_name": "Wim",
          "last_name": "Cresens",
          "title": "Representative",
          "email": "wim.cresens@keysighttechnologies.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-160-5",
          "first_name": "Pieter",
          "last_name": "Ricquier",
          "title": "Representative",
          "email": "pieter.ricquier@keysighttechnologies.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-160-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.keysight.com/us/en/home.html"
        },
        {
          "id": "vac-160-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.keysight.com/us/en/home.html"
        }
      ]
    }
  },
  {
    "id": 161,
    "booth_number": 161,
    "coords": {
      "type": "rect",
      "x": 446.39,
      "y": 375.79,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-161",
    "company": {
      "id": "company-161",
      "name": "NV SIEMENS INDUSTRY SOFTWARE",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/siemens.com",
      "short_description": "NV SIEMENS INDUSTRY SOFTWARE is presenting at VTK Jobfair 2026. Visit booth 161 to connect!",
      "long_description": "NV SIEMENS INDUSTRY SOFTWARE is participating in the annual VTK Jobfair. Stop by stand 161 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 161",
      "website": "https://www.siemens.com/global/en.html",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-161-1",
          "first_name": "Gabriel",
          "last_name": "Verdugo",
          "title": "Representative",
          "email": "gabriel.verdugo@nvsiemensindustrysoftware.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-161-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.siemens.com/global/en.html"
        },
        {
          "id": "vac-161-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.siemens.com/global/en.html"
        }
      ]
    }
  },
  {
    "id": 162,
    "booth_number": 162,
    "coords": {
      "type": "rect",
      "x": 463.8,
      "y": 375.79,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-162",
    "company": {
      "id": "company-162",
      "name": "NV SIEMENS INDUSTRY SOFTWARE",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/siemens.com",
      "short_description": "NV SIEMENS INDUSTRY SOFTWARE is presenting at VTK Jobfair 2026. Visit booth 162 to connect!",
      "long_description": "NV SIEMENS INDUSTRY SOFTWARE is participating in the annual VTK Jobfair. Stop by stand 162 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 162",
      "website": "https://www.siemens.com/global/en.html",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-162-1",
          "first_name": "Gabriel",
          "last_name": "Verdugo",
          "title": "Representative",
          "email": "gabriel.verdugo@nvsiemensindustrysoftware.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-162-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.siemens.com/global/en.html"
        },
        {
          "id": "vac-162-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.siemens.com/global/en.html"
        }
      ]
    }
  },
  {
    "id": 163,
    "booth_number": 163,
    "coords": {
      "type": "rect",
      "x": 481.2,
      "y": 375.79,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-163",
    "company": {
      "id": "company-163",
      "name": "Rambus",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/rambus.com",
      "short_description": "Rambus is presenting at VTK Jobfair 2026. Visit booth 163 to connect!",
      "long_description": "Rambus is participating in the annual VTK Jobfair. Stop by stand 163 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 163",
      "website": "https://www.rambus.com/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        }
      ],
      "representatives": [
        {
          "id": "rep-163-1",
          "first_name": "Mieke",
          "last_name": "Becht",
          "title": "Representative",
          "email": "mieke.becht@rambus.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-163-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.rambus.com/"
        },
        {
          "id": "vac-163-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.rambus.com/"
        }
      ]
    }
  },
  {
    "id": 164,
    "booth_number": 164,
    "coords": {
      "type": "rect",
      "x": 498.61,
      "y": 375.79,
      "width": 17.41,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-164",
    "company": {
      "id": "company-164",
      "name": "Plat4mation",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/plat4mation.com",
      "short_description": "Plat4mation is presenting at VTK Jobfair 2026. Visit booth 164 to connect!",
      "long_description": "Plat4mation is participating in the annual VTK Jobfair. Stop by stand 164 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 164",
      "website": "https://plat4mation.com/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-164-1",
          "first_name": "Emmelie",
          "last_name": "Langenhoven",
          "title": "Representative",
          "email": "emmelie.langenhoven@plat4mation.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-164-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://plat4mation.com/"
        },
        {
          "id": "vac-164-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://plat4mation.com/"
        }
      ]
    }
  },
  {
    "id": 165,
    "booth_number": 165,
    "coords": {
      "type": "rect",
      "x": 516.01,
      "y": 375.79,
      "width": 17.41,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-165",
    "company": {
      "id": "company-165",
      "name": "Colruyt Group",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/colruytgroup.com",
      "short_description": "Colruyt Group is presenting at VTK Jobfair 2026. Visit booth 165 to connect!",
      "long_description": "Colruyt Group is participating in the annual VTK Jobfair. Stop by stand 165 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 165",
      "website": "https://www.colruytgroup.com/en",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        }
      ],
      "representatives": [
        {
          "id": "rep-165-1",
          "first_name": "Margot",
          "last_name": "Vandergucht",
          "title": "Representative",
          "email": "margot.vandergucht@colruytgroup.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-165-2",
          "first_name": "Luna",
          "last_name": "capiau",
          "title": "Representative",
          "email": "luna.capiau@colruytgroup.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-165-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.colruytgroup.com/en"
        },
        {
          "id": "vac-165-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.colruytgroup.com/en"
        }
      ]
    }
  },
  {
    "id": 166,
    "booth_number": 166,
    "coords": {
      "type": "rect",
      "x": 533.42,
      "y": 375.79,
      "width": 17.41,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-166",
    "company": {
      "id": "company-166",
      "name": "Odoo",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/odoo.com",
      "short_description": "Odoo is presenting at VTK Jobfair 2026. Visit booth 166 to connect!",
      "long_description": "Odoo is participating in the annual VTK Jobfair. Stop by stand 166 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 166",
      "website": "https://www.odoo.com/nl_NL",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-166-1",
          "first_name": "Kaat",
          "last_name": "Goiris",
          "title": "Representative",
          "email": "kaat.goiris@odoo.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-166-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.odoo.com/nl_NL"
        },
        {
          "id": "vac-166-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.odoo.com/nl_NL"
        }
      ]
    }
  },
  {
    "id": 167,
    "booth_number": 167,
    "coords": {
      "type": "rect",
      "x": 136.43,
      "y": 232.31,
      "width": 13.42,
      "height": 17.41
    },
    "floorplan_id": 1,
    "company_id": "company-167",
    "company": {
      "id": "company-167",
      "name": "Stuvo",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/kuleuven.be",
      "short_description": "Stuvo is presenting at VTK Jobfair 2026. Visit booth 167 to connect!",
      "long_description": "Stuvo is participating in the annual VTK Jobfair. Stop by stand 167 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 167",
      "website": "https://www.kuleuven.be/stuvo/werkervaring",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 5,
          "name": "Nanowetenschappen & Nanotechnologie",
          "short_name": "NANO"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 10,
          "name": "Biomedische Technologie",
          "short_name": "BMT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-167-1",
          "first_name": "Wendy",
          "last_name": "Frederickx",
          "title": "Representative",
          "email": "wendy.frederickx@stuvo.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-167-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.kuleuven.be/stuvo/werkervaring"
        },
        {
          "id": "vac-167-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.kuleuven.be/stuvo/werkervaring"
        }
      ]
    }
  },
  {
    "id": 168,
    "booth_number": 168,
    "coords": {
      "type": "rect",
      "x": 136.43,
      "y": 249.71,
      "width": 13.42,
      "height": 17.41
    },
    "floorplan_id": 1,
    "company_id": "company-168",
    "company": {
      "id": "company-168",
      "name": "NV Icos Vision Systems",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/kla.com",
      "short_description": "NV Icos Vision Systems is presenting at VTK Jobfair 2026. Visit booth 168 to connect!",
      "long_description": "NV Icos Vision Systems is participating in the annual VTK Jobfair. Stop by stand 168 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 168",
      "website": "https://www.kla.com/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 5,
          "name": "Nanowetenschappen & Nanotechnologie",
          "short_name": "NANO"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        }
      ],
      "representatives": [
        {
          "id": "rep-168-1",
          "first_name": "Sofie",
          "last_name": "Van Sever",
          "title": "Representative",
          "email": "sofie.vansever@nvicosvisionsystems.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-168-2",
          "first_name": "Andrea",
          "last_name": "Volonte",
          "title": "Representative",
          "email": "andrea.volonte@nvicosvisionsystems.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-168-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.kla.com/"
        },
        {
          "id": "vac-168-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.kla.com/"
        }
      ]
    }
  },
  {
    "id": 169,
    "booth_number": 169,
    "coords": {
      "type": "rect",
      "x": 136.43,
      "y": 267.12,
      "width": 13.42,
      "height": 17.41
    },
    "floorplan_id": 1,
    "company_id": "company-169",
    "company": {
      "id": "company-169",
      "name": "Cordeel Group",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/cordeel.eu",
      "short_description": "Cordeel Group is presenting at VTK Jobfair 2026. Visit booth 169 to connect!",
      "long_description": "Cordeel Group is participating in the annual VTK Jobfair. Stop by stand 169 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 169",
      "website": "https://cordeel.eu/nl",
      "category": [
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-169-1",
          "first_name": "Aurelie",
          "last_name": "Cordeel",
          "title": "Representative",
          "email": "aurelie.cordeel@cordeelgroup.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-169-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://cordeel.eu/nl"
        },
        {
          "id": "vac-169-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://cordeel.eu/nl"
        }
      ]
    }
  },
  {
    "id": 170,
    "booth_number": 170,
    "coords": {
      "type": "rect",
      "x": 136.43,
      "y": 284.52,
      "width": 13.42,
      "height": 17.41
    },
    "floorplan_id": 1,
    "company_id": "company-170",
    "company": {
      "id": "company-170",
      "name": "Luminus",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/luminus.be",
      "short_description": "Luminus is presenting at VTK Jobfair 2026. Visit booth 170 to connect!",
      "long_description": "Luminus is participating in the annual VTK Jobfair. Stop by stand 170 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 170",
      "website": "https://www.luminus.be/nl/corporate/jobs/generation-zero/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-170-1",
          "first_name": "Cindy",
          "last_name": "Claes",
          "title": "Representative",
          "email": "cindy.claes@luminus.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-170-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.luminus.be/nl/corporate/jobs/generation-zero/"
        },
        {
          "id": "vac-170-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.luminus.be/nl/corporate/jobs/generation-zero/"
        }
      ]
    }
  },
  {
    "id": 171,
    "booth_number": 171,
    "coords": {
      "type": "rect",
      "x": 136.43,
      "y": 301.93,
      "width": 13.42,
      "height": 17.41
    },
    "floorplan_id": 1,
    "company_id": "company-171",
    "company": {
      "id": "company-171",
      "name": "PEC",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/peccorp.com",
      "short_description": "PEC is presenting at VTK Jobfair 2026. Visit booth 171 to connect!",
      "long_description": "PEC is participating in the annual VTK Jobfair. Stop by stand 171 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 171",
      "website": "https://www.peccorp.com/",
      "category": [
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        }
      ],
      "representatives": [
        {
          "id": "rep-171-1",
          "first_name": "Annemie",
          "last_name": "Vandeven",
          "title": "Representative",
          "email": "annemie.vandeven@pec.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-171-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.peccorp.com/"
        },
        {
          "id": "vac-171-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.peccorp.com/"
        }
      ]
    }
  },
  {
    "id": 172,
    "booth_number": 172,
    "coords": {
      "type": "rect",
      "x": 136.43,
      "y": 319.33,
      "width": 13.42,
      "height": 17.4
    },
    "floorplan_id": 1,
    "company_id": "company-172",
    "company": {
      "id": "company-172",
      "name": "CIT Blaton",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/citblaton.be",
      "short_description": "CIT Blaton is presenting at VTK Jobfair 2026. Visit booth 172 to connect!",
      "long_description": "CIT Blaton is participating in the annual VTK Jobfair. Stop by stand 172 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 172",
      "website": "https://citblaton.be/nl",
      "category": [
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        }
      ],
      "representatives": [
        {
          "id": "rep-172-1",
          "first_name": "Sofia",
          "last_name": "Sintra Jordao",
          "title": "Representative",
          "email": "sofia.sintrajordao@citblaton.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-172-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://citblaton.be/nl"
        },
        {
          "id": "vac-172-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://citblaton.be/nl"
        }
      ]
    }
  },
  {
    "id": 173,
    "booth_number": 173,
    "coords": {
      "type": "rect",
      "x": 136.43,
      "y": 349.68,
      "width": 13.42,
      "height": 17.4
    },
    "floorplan_id": 1,
    "company_id": "company-173",
    "company": {
      "id": "company-173",
      "name": "Capsugel Belgium NV",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/lonza.com",
      "short_description": "Capsugel Belgium NV is presenting at VTK Jobfair 2026. Visit booth 173 to connect!",
      "long_description": "Capsugel Belgium NV is participating in the annual VTK Jobfair. Stop by stand 173 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 173",
      "website": "https://www.lonza.com/",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-173-1",
          "first_name": "Fran",
          "last_name": "Ghys",
          "title": "Representative",
          "email": "fran.ghys@capsugelbelgiumnv.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-173-2",
          "first_name": "Tess",
          "last_name": "Van de Sompel",
          "title": "Representative",
          "email": "tess.vandesompel@capsugelbelgiumnv.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-173-3",
          "first_name": "Jan",
          "last_name": "Bouquet",
          "title": "Representative",
          "email": "jan.bouquet@capsugelbelgiumnv.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-173-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.lonza.com/"
        },
        {
          "id": "vac-173-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.lonza.com/"
        }
      ]
    }
  },
  {
    "id": 174,
    "booth_number": 174,
    "coords": {
      "type": "rect",
      "x": 136.43,
      "y": 367.09,
      "width": 13.42,
      "height": 17.4
    },
    "floorplan_id": 1,
    "company_id": "company-174",
    "company": {
      "id": "company-174",
      "name": "Colas Belgium",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/colas.be",
      "short_description": "Colas Belgium is presenting at VTK Jobfair 2026. Visit booth 174 to connect!",
      "long_description": "Colas Belgium is participating in the annual VTK Jobfair. Stop by stand 174 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 174",
      "website": "https://www.colas.be/nl",
      "category": [
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        }
      ],
      "representatives": [
        {
          "id": "rep-174-1",
          "first_name": "Liesbeth",
          "last_name": "Van Baelen",
          "title": "Representative",
          "email": "liesbeth.vanbaelen@colasbelgium.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-174-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.colas.be/nl"
        },
        {
          "id": "vac-174-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.colas.be/nl"
        }
      ]
    }
  },
  {
    "id": 175,
    "booth_number": 175,
    "coords": {
      "type": "rect",
      "x": 136.89,
      "y": 384.49,
      "width": 8.65,
      "height": 14.4
    },
    "floorplan_id": 1,
    "company_id": "company-175",
    "company": {
      "id": "company-175",
      "name": "Delaware",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/delaware.pro",
      "short_description": "Delaware is presenting at VTK Jobfair 2026. Visit booth 175 to connect!",
      "long_description": "Delaware is participating in the annual VTK Jobfair. Stop by stand 175 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 175",
      "website": "https://www.delaware.pro/en-be",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        }
      ],
      "representatives": [
        {
          "id": "rep-175-1",
          "first_name": "Delaware",
          "last_name": "Talent Team",
          "title": "Representative",
          "email": "delaware.talentteam@delaware.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-175-2",
          "first_name": "Frédérique",
          "last_name": "Desart",
          "title": "Representative",
          "email": "frédérique.desart@delaware.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-175-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.delaware.pro/en-be"
        },
        {
          "id": "vac-175-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.delaware.pro/en-be"
        }
      ]
    }
  },
  {
    "id": 176,
    "booth_number": 176,
    "coords": {
      "type": "rect",
      "x": 158.5,
      "y": 249.03,
      "width": 13.42,
      "height": 17.41
    },
    "floorplan_id": 1,
    "company_id": "company-176",
    "company": {
      "id": "company-176",
      "name": "Bayer",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/bayer.be",
      "short_description": "Bayer is presenting at VTK Jobfair 2026. Visit booth 176 to connect!",
      "long_description": "Bayer is participating in the annual VTK Jobfair. Stop by stand 176 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 176",
      "website": "https://www.bayer.be",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        }
      ],
      "representatives": [
        {
          "id": "rep-176-1",
          "first_name": "Katrien",
          "last_name": "Mertens",
          "title": "Representative",
          "email": "katrien.mertens@bayer.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-176-2",
          "first_name": "Kurt",
          "last_name": "Van Goidsenhoven",
          "title": "Representative",
          "email": "kurt.vangoidsenhoven@bayer.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-176-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.bayer.be"
        },
        {
          "id": "vac-176-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.bayer.be"
        }
      ]
    }
  },
  {
    "id": 177,
    "booth_number": 177,
    "coords": {
      "type": "rect",
      "x": 158.5,
      "y": 266.43,
      "width": 13.42,
      "height": 17.41
    },
    "floorplan_id": 1,
    "company_id": "company-177",
    "company": {
      "id": "company-177",
      "name": "Nokia",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/nokia.com",
      "short_description": "Nokia is presenting at VTK Jobfair 2026. Visit booth 177 to connect!",
      "long_description": "Nokia is participating in the annual VTK Jobfair. Stop by stand 177 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 177",
      "website": "https://www.nokia.com/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        }
      ],
      "representatives": [
        {
          "id": "rep-177-1",
          "first_name": "Anna",
          "last_name": "Kucharska",
          "title": "Representative",
          "email": "anna.kucharska@nokia.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-177-2",
          "first_name": "Nadia",
          "last_name": "Beutels",
          "title": "Representative",
          "email": "nadia.beutels@nokia.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-177-3",
          "first_name": "Marta",
          "last_name": "Leite",
          "title": "Representative",
          "email": "marta.leite@nokia.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-177-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.nokia.com/"
        },
        {
          "id": "vac-177-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.nokia.com/"
        }
      ]
    }
  },
  {
    "id": 178,
    "booth_number": 178,
    "coords": {
      "type": "rect",
      "x": 158.5,
      "y": 283.83,
      "width": 13.42,
      "height": 17.41
    },
    "floorplan_id": 1,
    "company_id": "company-178",
    "company": {
      "id": "company-178",
      "name": "Apixa",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/apixa.com",
      "short_description": "Apixa is presenting at VTK Jobfair 2026. Visit booth 178 to connect!",
      "long_description": "Apixa is participating in the annual VTK Jobfair. Stop by stand 178 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 178",
      "website": "https://www.apixa.com/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-178-1",
          "first_name": "Geert",
          "last_name": "Mortier",
          "title": "Representative",
          "email": "geert.mortier@apixa.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-178-2",
          "first_name": "Daan",
          "last_name": "Seuntjens",
          "title": "Representative",
          "email": "daan.seuntjens@apixa.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-178-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.apixa.com/"
        },
        {
          "id": "vac-178-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.apixa.com/"
        }
      ]
    }
  },
  {
    "id": 179,
    "booth_number": 179,
    "coords": {
      "type": "rect",
      "x": 158.5,
      "y": 301.24,
      "width": 13.42,
      "height": 17.41
    },
    "floorplan_id": 1,
    "company_id": "company-179",
    "company": {
      "id": "company-179",
      "name": "CEE Engineering",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/cee.eu",
      "short_description": "CEE Engineering is presenting at VTK Jobfair 2026. Visit booth 179 to connect!",
      "long_description": "CEE Engineering is participating in the annual VTK Jobfair. Stop by stand 179 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 179",
      "website": "https://cee.eu/",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        }
      ],
      "representatives": [
        {
          "id": "rep-179-1",
          "first_name": "Ilse",
          "last_name": "Kestens",
          "title": "Representative",
          "email": "ilse.kestens@ceeengineering.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-179-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://cee.eu/"
        },
        {
          "id": "vac-179-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://cee.eu/"
        }
      ]
    }
  },
  {
    "id": 180,
    "booth_number": 180,
    "coords": {
      "type": "rect",
      "x": 158.5,
      "y": 318.64,
      "width": 13.42,
      "height": 17.4
    },
    "floorplan_id": 1,
    "company_id": "company-180",
    "company": {
      "id": "company-180",
      "name": "Willemen Groep",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/willemen.be",
      "short_description": "Willemen Groep is presenting at VTK Jobfair 2026. Visit booth 180 to connect!",
      "long_description": "Willemen Groep is participating in the annual VTK Jobfair. Stop by stand 180 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 180",
      "website": "https://www.willemen.be/nl",
      "category": [
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-180-1",
          "first_name": "Laure",
          "last_name": "Devaleriola",
          "title": "Representative",
          "email": "laure.devaleriola@willemengroep.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-180-2",
          "first_name": "Klaar",
          "last_name": "Verreijdt",
          "title": "Representative",
          "email": "klaar.verreijdt@willemengroep.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-180-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.willemen.be/nl"
        },
        {
          "id": "vac-180-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.willemen.be/nl"
        }
      ]
    }
  },
  {
    "id": 181,
    "booth_number": 181,
    "coords": {
      "type": "rect",
      "x": 171.11,
      "y": 349.68,
      "width": 13.42,
      "height": 17.4
    },
    "floorplan_id": 1,
    "company_id": "company-181",
    "company": {
      "id": "company-181",
      "name": "Materialise",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/materialise.com",
      "short_description": "Materialise is presenting at VTK Jobfair 2026. Visit booth 181 to connect!",
      "long_description": "Materialise is participating in the annual VTK Jobfair. Stop by stand 181 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 181",
      "website": "https://www.materialise.com/en",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 10,
          "name": "Biomedische Technologie",
          "short_name": "BMT"
        }
      ],
      "representatives": [
        {
          "id": "rep-181-1",
          "first_name": "Jana",
          "last_name": "Van Hoof",
          "title": "Representative",
          "email": "jana.vanhoof@materialise.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-181-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.materialise.com/en"
        },
        {
          "id": "vac-181-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.materialise.com/en"
        }
      ]
    }
  },
  {
    "id": 182,
    "booth_number": 182,
    "coords": {
      "type": "rect",
      "x": 171.11,
      "y": 367.09,
      "width": 13.42,
      "height": 17.4
    },
    "floorplan_id": 1,
    "company_id": "company-182",
    "company": {
      "id": "company-182",
      "name": "Endress + Hauser",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/be.endress.com",
      "short_description": "Endress + Hauser is presenting at VTK Jobfair 2026. Visit booth 182 to connect!",
      "long_description": "Endress + Hauser is participating in the annual VTK Jobfair. Stop by stand 182 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 182",
      "website": "https://www.be.endress.com/nl?store_locale=nl",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-182-1",
          "first_name": "Céline",
          "last_name": "Bodeux",
          "title": "Representative",
          "email": "céline.bodeux@endresshauser.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-182-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.be.endress.com/nl?store_locale=nl"
        },
        {
          "id": "vac-182-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.be.endress.com/nl?store_locale=nl"
        }
      ]
    }
  },
  {
    "id": 183,
    "booth_number": 183,
    "coords": {
      "type": "rect",
      "x": 171.11,
      "y": 384.49,
      "width": 13.42,
      "height": 17.4
    },
    "floorplan_id": 1,
    "company_id": "company-183",
    "company": {
      "id": "company-183",
      "name": "Engibex",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/engibex.com",
      "short_description": "Engibex is presenting at VTK Jobfair 2026. Visit booth 183 to connect!",
      "long_description": "Engibex is participating in the annual VTK Jobfair. Stop by stand 183 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 183",
      "website": "https://engibex.com/",
      "category": [
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 5,
          "name": "Nanowetenschappen & Nanotechnologie",
          "short_name": "NANO"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-183-1",
          "first_name": "Sarah",
          "last_name": "Marcos",
          "title": "Representative",
          "email": "sarah.marcos@engibex.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-183-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://engibex.com/"
        },
        {
          "id": "vac-183-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://engibex.com/"
        }
      ]
    }
  },
  {
    "id": 184,
    "booth_number": 184,
    "coords": {
      "type": "rect",
      "x": 171.92,
      "y": 249.34,
      "width": 8.65,
      "height": 14.4
    },
    "floorplan_id": 1,
    "company_id": "company-184",
    "company": {
      "id": "company-184",
      "name": "AB Inbev",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/europecareers.ab-inbev.com",
      "short_description": "AB Inbev is presenting at VTK Jobfair 2026. Visit booth 184 to connect!",
      "long_description": "AB Inbev is participating in the annual VTK Jobfair. Stop by stand 184 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 184",
      "website": "https://europecareers.ab-inbev.com/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-184-1",
          "first_name": "Tess",
          "last_name": "Tess",
          "title": "Representative",
          "email": "tess.tess@abinbev.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-184-2",
          "first_name": "Jolien",
          "last_name": "Lemoine",
          "title": "Representative",
          "email": "jolien.lemoine@abinbev.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-184-3",
          "first_name": "Dries",
          "last_name": "Rosseel",
          "title": "Representative",
          "email": "dries.rosseel@abinbev.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-184-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://europecareers.ab-inbev.com/"
        },
        {
          "id": "vac-184-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://europecareers.ab-inbev.com/"
        }
      ]
    }
  },
  {
    "id": 185,
    "booth_number": 185,
    "coords": {
      "type": "rect",
      "x": 171.92,
      "y": 263.74,
      "width": 8.65,
      "height": 14.4
    },
    "floorplan_id": 1,
    "company_id": "company-185",
    "company": {
      "id": "company-185",
      "name": "Auditstage",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/auditstage.com",
      "short_description": "Auditstage is presenting at VTK Jobfair 2026. Visit booth 185 to connect!",
      "long_description": "Auditstage is participating in the annual VTK Jobfair. Stop by stand 185 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 185",
      "website": "https://www.auditstage.com",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-185-1",
          "first_name": "Natalia",
          "last_name": "Khamraeva",
          "title": "Representative",
          "email": "natalia.khamraeva@auditstage.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-185-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.auditstage.com"
        },
        {
          "id": "vac-185-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.auditstage.com"
        }
      ]
    }
  },
  {
    "id": 186,
    "booth_number": 186,
    "coords": {
      "type": "rect",
      "x": 171.92,
      "y": 278.14,
      "width": 8.65,
      "height": 14.4
    },
    "floorplan_id": 1,
    "company_id": "company-186",
    "company": {
      "id": "company-186",
      "name": "Spott",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/spott.io",
      "short_description": "Spott is presenting at VTK Jobfair 2026. Visit booth 186 to connect!",
      "long_description": "Spott is participating in the annual VTK Jobfair. Stop by stand 186 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 186",
      "website": "https://spott.io/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-186-1",
          "first_name": "Kevin",
          "last_name": "Vandeputte",
          "title": "Representative",
          "email": "kevin.vandeputte@spott.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-186-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://spott.io/"
        },
        {
          "id": "vac-186-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://spott.io/"
        }
      ]
    }
  },
  {
    "id": 187,
    "booth_number": 187,
    "coords": {
      "type": "rect",
      "x": 171.92,
      "y": 292.54,
      "width": 8.65,
      "height": 14.4
    },
    "floorplan_id": 1,
    "company_id": "company-187",
    "company": {
      "id": "company-187",
      "name": "Botanix Labs",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/botanixlabs.com",
      "short_description": "Botanix Labs is presenting at VTK Jobfair 2026. Visit booth 187 to connect!",
      "long_description": "Botanix Labs is participating in the annual VTK Jobfair. Stop by stand 187 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 187",
      "website": "https://botanixlabs.com",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-187-1",
          "first_name": "Lucas",
          "last_name": "Vanlaer",
          "title": "Representative",
          "email": "lucas.vanlaer@botanixlabs.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-187-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://botanixlabs.com"
        },
        {
          "id": "vac-187-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://botanixlabs.com"
        }
      ]
    }
  },
  {
    "id": 188,
    "booth_number": 188,
    "coords": {
      "type": "rect",
      "x": 171.92,
      "y": 306.94,
      "width": 8.65,
      "height": 14.4
    },
    "floorplan_id": 1,
    "company_id": "company-188",
    "company": {
      "id": "company-188",
      "name": "IVEX",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/ivex.ai",
      "short_description": "IVEX is presenting at VTK Jobfair 2026. Visit booth 188 to connect!",
      "long_description": "IVEX is participating in the annual VTK Jobfair. Stop by stand 188 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 188",
      "website": "https://ivex.ai/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        }
      ],
      "representatives": [
        {
          "id": "rep-188-1",
          "first_name": "Daniele",
          "last_name": "Rigolin",
          "title": "Representative",
          "email": "daniele.rigolin@ivex.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-188-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://ivex.ai/"
        },
        {
          "id": "vac-188-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://ivex.ai/"
        }
      ]
    }
  },
  {
    "id": 189,
    "booth_number": 189,
    "coords": {
      "type": "rect",
      "x": 171.92,
      "y": 321.34,
      "width": 8.65,
      "height": 14.4
    },
    "floorplan_id": 1,
    "company_id": "company-189",
    "company": {
      "id": "company-189",
      "name": "IVEX",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/ivex.ai",
      "short_description": "IVEX is presenting at VTK Jobfair 2026. Visit booth 189 to connect!",
      "long_description": "IVEX is participating in the annual VTK Jobfair. Stop by stand 189 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 189",
      "website": "https://ivex.ai/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        }
      ],
      "representatives": [
        {
          "id": "rep-189-1",
          "first_name": "Daniele",
          "last_name": "Rigolin",
          "title": "Representative",
          "email": "daniele.rigolin@ivex.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-189-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://ivex.ai/"
        },
        {
          "id": "vac-189-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://ivex.ai/"
        }
      ]
    }
  },
  {
    "id": 190,
    "booth_number": 190,
    "coords": {
      "type": "rect",
      "x": 162.47,
      "y": 349.68,
      "width": 8.65,
      "height": 14.4
    },
    "floorplan_id": 1,
    "company_id": "company-190",
    "company": {
      "id": "company-190",
      "name": "Cumbaya",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/cumbaya.travel",
      "short_description": "Cumbaya is presenting at VTK Jobfair 2026. Visit booth 190 to connect!",
      "long_description": "Cumbaya is participating in the annual VTK Jobfair. Stop by stand 190 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 190",
      "website": "https://cumbaya.travel",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        }
      ],
      "representatives": [
        {
          "id": "rep-190-1",
          "first_name": "Sven",
          "last_name": "Hermans",
          "title": "Representative",
          "email": "sven.hermans@cumbaya.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-190-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://cumbaya.travel"
        },
        {
          "id": "vac-190-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://cumbaya.travel"
        }
      ]
    }
  },
  {
    "id": 191,
    "booth_number": 191,
    "coords": {
      "type": "rect",
      "x": 162.47,
      "y": 364.08,
      "width": 8.65,
      "height": 14.4
    },
    "floorplan_id": 1,
    "company_id": "company-191",
    "company": {
      "id": "company-191",
      "name": "Aidoptation",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/aidoptation.com",
      "short_description": "Aidoptation is presenting at VTK Jobfair 2026. Visit booth 191 to connect!",
      "long_description": "Aidoptation is participating in the annual VTK Jobfair. Stop by stand 191 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 191",
      "website": "https://www.aidoptation.com/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-191-1",
          "first_name": "Louis",
          "last_name": "Joris",
          "title": "Representative",
          "email": "louis.joris@aidoptation.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-191-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.aidoptation.com/"
        },
        {
          "id": "vac-191-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.aidoptation.com/"
        }
      ]
    }
  },
  {
    "id": 192,
    "booth_number": 192,
    "coords": {
      "type": "rect",
      "x": 162.47,
      "y": 378.48,
      "width": 8.65,
      "height": 14.4
    },
    "floorplan_id": 1,
    "company_id": "company-192",
    "company": {
      "id": "company-192",
      "name": "Humasol",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/humasol.be",
      "short_description": "Humasol is presenting at VTK Jobfair 2026. Visit booth 192 to connect!",
      "long_description": "Humasol is participating in the annual VTK Jobfair. Stop by stand 192 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 192",
      "website": "https://humasol.be",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 5,
          "name": "Nanowetenschappen & Nanotechnologie",
          "short_name": "NANO"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 10,
          "name": "Biomedische Technologie",
          "short_name": "BMT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-192-1",
          "first_name": "Michiel",
          "last_name": "Spies",
          "title": "Representative",
          "email": "michiel.spies@humasol.com",
          "tel": null,
          "avatar_url": null
        },
        {
          "id": "rep-192-2",
          "first_name": "Sander",
          "last_name": "De Jong",
          "title": "Representative",
          "email": "sander.dejong@humasol.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-192-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://humasol.be"
        },
        {
          "id": "vac-192-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://humasol.be"
        }
      ]
    }
  },
  {
    "id": 193,
    "booth_number": 193,
    "coords": {
      "type": "rect",
      "x": 162.47,
      "y": 392.88,
      "width": 8.65,
      "height": 14.4
    },
    "floorplan_id": 1,
    "company_id": "company-193",
    "company": {
      "id": "company-193",
      "name": "Marple Data",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/marpledata.com",
      "short_description": "Marple Data is presenting at VTK Jobfair 2026. Visit booth 193 to connect!",
      "long_description": "Marple Data is participating in the annual VTK Jobfair. Stop by stand 193 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 193",
      "website": "https://www.marpledata.com",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-193-1",
          "first_name": "Matthias",
          "last_name": "Baert",
          "title": "Representative",
          "email": "matthias.baert@marpledata.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-193-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.marpledata.com"
        },
        {
          "id": "vac-193-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.marpledata.com"
        }
      ]
    }
  },
  {
    "id": 194,
    "booth_number": 194,
    "coords": {
      "type": "rect",
      "x": 81,
      "y": 194.5,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-194",
    "company": {
      "id": "company-194",
      "name": "PION",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/innoverendondernemen.be",
      "short_description": "PION is presenting at VTK Jobfair 2026. Visit booth 194 to connect!",
      "long_description": "PION is participating in the annual VTK Jobfair. Stop by stand 194 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 194",
      "website": "https://innoverendondernemen.be/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 5,
          "name": "Nanowetenschappen & Nanotechnologie",
          "short_name": "NANO"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 10,
          "name": "Biomedische Technologie",
          "short_name": "BMT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        }
      ],
      "representatives": [
        {
          "id": "rep-194-1",
          "first_name": "Katleen",
          "last_name": "Lodewyckx",
          "title": "Representative",
          "email": "katleen.lodewyckx@pion.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-194-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://innoverendondernemen.be/"
        },
        {
          "id": "vac-194-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://innoverendondernemen.be/"
        }
      ]
    }
  },
  {
    "id": 195,
    "booth_number": 195,
    "coords": {
      "type": "rect",
      "x": 98.41,
      "y": 194.5,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-195",
    "company": {
      "id": "company-195",
      "name": "Gridual",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/gridual.ai",
      "short_description": "Gridual is presenting at VTK Jobfair 2026. Visit booth 195 to connect!",
      "long_description": "Gridual is participating in the annual VTK Jobfair. Stop by stand 195 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 195",
      "website": "https://www.gridual.ai/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        }
      ],
      "representatives": [
        {
          "id": "rep-195-1",
          "first_name": "Kristof",
          "last_name": "Phillips",
          "title": "Representative",
          "email": "kristof.phillips@gridual.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-195-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.gridual.ai/"
        },
        {
          "id": "vac-195-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.gridual.ai/"
        }
      ]
    }
  },
  {
    "id": 196,
    "booth_number": 196,
    "coords": {
      "type": "rect",
      "x": 115.81,
      "y": 194.5,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-196",
    "company": {
      "id": "company-196",
      "name": "InvestSuite NV",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/investsuite.com",
      "short_description": "InvestSuite NV is presenting at VTK Jobfair 2026. Visit booth 196 to connect!",
      "long_description": "InvestSuite NV is participating in the annual VTK Jobfair. Stop by stand 196 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 196",
      "website": "https://www.investsuite.com/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-196-1",
          "first_name": "Iryna",
          "last_name": "Matvieieva",
          "title": "Representative",
          "email": "iryna.matvieieva@investsuitenv.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-196-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.investsuite.com/"
        },
        {
          "id": "vac-196-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.investsuite.com/"
        }
      ]
    }
  },
  {
    "id": 197,
    "booth_number": 197,
    "coords": {
      "type": "rect",
      "x": 136.48,
      "y": 163.21,
      "width": 17.4,
      "height": 13.42
    },
    "floorplan_id": 1,
    "company_id": "company-197",
    "company": {
      "id": "company-197",
      "name": "InvestSuite NV",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/investsuite.com",
      "short_description": "InvestSuite NV is presenting at VTK Jobfair 2026. Visit booth 197 to connect!",
      "long_description": "InvestSuite NV is participating in the annual VTK Jobfair. Stop by stand 197 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 197",
      "website": "https://www.investsuite.com/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-197-1",
          "first_name": "Iryna",
          "last_name": "Matvieieva",
          "title": "Representative",
          "email": "iryna.matvieieva@investsuitenv.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-197-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.investsuite.com/"
        },
        {
          "id": "vac-197-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.investsuite.com/"
        }
      ]
    }
  },
  {
    "id": 198,
    "booth_number": 198,
    "coords": {
      "type": "rect",
      "x": 0,
      "y": 0,
      "width": 0,
      "height": 0
    },
    "floorplan_id": 1,
    "company_id": "company-198",
    "company": {
      "id": "company-198",
      "name": "Polysense",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/polysense.ai",
      "short_description": "Polysense is presenting at VTK Jobfair 2026. Visit booth 198 to connect!",
      "long_description": "Polysense is participating in the annual VTK Jobfair. Stop by stand 198 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 198",
      "website": "https://www.polysense.ai",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        }
      ],
      "representatives": [
        {
          "id": "rep-198-1",
          "first_name": "Jarne",
          "last_name": "Bogaert",
          "title": "Representative",
          "email": "jarne.bogaert@polysense.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-198-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.polysense.ai"
        },
        {
          "id": "vac-198-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.polysense.ai"
        }
      ]
    }
  },
  {
    "id": 199,
    "booth_number": 199,
    "coords": {
      "type": "rect",
      "x": 0,
      "y": 0,
      "width": 0,
      "height": 0
    },
    "floorplan_id": 1,
    "company_id": "company-199",
    "company": {
      "id": "company-199",
      "name": "Be-Rocket",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/berocket.be",
      "short_description": "Be-Rocket is presenting at VTK Jobfair 2026. Visit booth 199 to connect!",
      "long_description": "Be-Rocket is participating in the annual VTK Jobfair. Stop by stand 199 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 199",
      "website": "https://www.berocket.be/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-199-1",
          "first_name": "Lennart",
          "last_name": "Steen",
          "title": "Representative",
          "email": "lennart.steen@berocket.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-199-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.berocket.be/"
        },
        {
          "id": "vac-199-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.berocket.be/"
        }
      ]
    }
  },
  {
    "id": 200,
    "booth_number": 200,
    "coords": {
      "type": "rect",
      "x": 0,
      "y": 0,
      "width": 0,
      "height": 0
    },
    "floorplan_id": 1,
    "company_id": "company-200",
    "company": {
      "id": "company-200",
      "name": "Neurotech Leuven",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/ntxl.org",
      "short_description": "Neurotech Leuven is presenting at VTK Jobfair 2026. Visit booth 200 to connect!",
      "long_description": "Neurotech Leuven is participating in the annual VTK Jobfair. Stop by stand 200 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 200",
      "website": "https://www.ntxl.org/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 5,
          "name": "Nanowetenschappen & Nanotechnologie",
          "short_name": "NANO"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 10,
          "name": "Biomedische Technologie",
          "short_name": "BMT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-200-1",
          "first_name": "Santiago",
          "last_name": "Gutierrez Suarez",
          "title": "Representative",
          "email": "santiago.gutierrezsuarez@neurotechleuven.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-200-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.ntxl.org/"
        },
        {
          "id": "vac-200-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.ntxl.org/"
        }
      ]
    }
  },
  {
    "id": 201,
    "booth_number": 201,
    "coords": {
      "type": "rect",
      "x": 0,
      "y": 0,
      "width": 0,
      "height": 0
    },
    "floorplan_id": 1,
    "company_id": "company-201",
    "company": {
      "id": "company-201",
      "name": "Conveo",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/conveo.ai",
      "short_description": "Conveo is presenting at VTK Jobfair 2026. Visit booth 201 to connect!",
      "long_description": "Conveo is participating in the annual VTK Jobfair. Stop by stand 201 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 201",
      "website": "https://conveo.ai",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        }
      ],
      "representatives": [
        {
          "id": "rep-201-1",
          "first_name": "Maarten",
          "last_name": "Claes",
          "title": "Representative",
          "email": "maarten.claes@conveo.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-201-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://conveo.ai"
        },
        {
          "id": "vac-201-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://conveo.ai"
        }
      ]
    }
  },
  {
    "id": 202,
    "booth_number": 202,
    "coords": {
      "type": "rect",
      "x": 0,
      "y": 0,
      "width": 0,
      "height": 0
    },
    "floorplan_id": 1,
    "company_id": "company-202",
    "company": {
      "id": "company-202",
      "name": "ARK Capture Solutions",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/arkcapturesolutions.com",
      "short_description": "ARK Capture Solutions is presenting at VTK Jobfair 2026. Visit booth 202 to connect!",
      "long_description": "ARK Capture Solutions is participating in the annual VTK Jobfair. Stop by stand 202 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 202",
      "website": "https://www.arkcapturesolutions.com/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 5,
          "name": "Nanowetenschappen & Nanotechnologie",
          "short_name": "NANO"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 10,
          "name": "Biomedische Technologie",
          "short_name": "BMT"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-202-1",
          "first_name": "Marnix",
          "last_name": "Waterschoot",
          "title": "Representative",
          "email": "marnix.waterschoot@arkcapturesolutions.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-202-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.arkcapturesolutions.com/"
        },
        {
          "id": "vac-202-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.arkcapturesolutions.com/"
        }
      ]
    }
  },
  {
    "id": 203,
    "booth_number": 203,
    "coords": {
      "type": "rect",
      "x": 0,
      "y": 0,
      "width": 0,
      "height": 0
    },
    "floorplan_id": 1,
    "company_id": "company-203",
    "company": {
      "id": "company-203",
      "name": "Sirona Technologies",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/sirona.tech",
      "short_description": "Sirona Technologies is presenting at VTK Jobfair 2026. Visit booth 203 to connect!",
      "long_description": "Sirona Technologies is participating in the annual VTK Jobfair. Stop by stand 203 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 203",
      "website": "https://www.sirona.tech/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        }
      ],
      "representatives": [
        {
          "id": "rep-203-1",
          "first_name": "Sibylle",
          "last_name": "Soers",
          "title": "Representative",
          "email": "sibylle.soers@sironatechnologies.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-203-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.sirona.tech/"
        },
        {
          "id": "vac-203-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.sirona.tech/"
        }
      ]
    }
  },
  {
    "id": 204,
    "booth_number": 204,
    "coords": {
      "type": "rect",
      "x": 0,
      "y": 0,
      "width": 0,
      "height": 0
    },
    "floorplan_id": 1,
    "company_id": "company-204",
    "company": {
      "id": "company-204",
      "name": "EDGX",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/edgx.space",
      "short_description": "EDGX is presenting at VTK Jobfair 2026. Visit booth 204 to connect!",
      "long_description": "EDGX is participating in the annual VTK Jobfair. Stop by stand 204 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 204",
      "website": "https://www.edgx.space/",
      "category": [
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        }
      ],
      "representatives": [
        {
          "id": "rep-204-1",
          "first_name": "Sanny",
          "last_name": "Van den Troost",
          "title": "Representative",
          "email": "sanny.vandentroost@edgx.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-204-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.edgx.space/"
        },
        {
          "id": "vac-204-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.edgx.space/"
        }
      ]
    }
  },
  {
    "id": 205,
    "booth_number": 205,
    "coords": {
      "type": "rect",
      "x": 0,
      "y": 0,
      "width": 0,
      "height": 0
    },
    "floorplan_id": 1,
    "company_id": "company-205",
    "company": {
      "id": "company-205",
      "name": "EDGX",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/edgx.space",
      "short_description": "EDGX is presenting at VTK Jobfair 2026. Visit booth 205 to connect!",
      "long_description": "EDGX is participating in the annual VTK Jobfair. Stop by stand 205 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 205",
      "website": "https://www.edgx.space/",
      "category": [
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        }
      ],
      "representatives": [
        {
          "id": "rep-205-1",
          "first_name": "Sanny",
          "last_name": "Van den Troost",
          "title": "Representative",
          "email": "sanny.vandentroost@edgx.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-205-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.edgx.space/"
        },
        {
          "id": "vac-205-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.edgx.space/"
        }
      ]
    }
  },
  {
    "id": 206,
    "booth_number": 206,
    "coords": {
      "type": "rect",
      "x": 0,
      "y": 0,
      "width": 0,
      "height": 0
    },
    "floorplan_id": 1,
    "company_id": "company-206",
    "company": {
      "id": "company-206",
      "name": "Relu",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/relu.ai",
      "short_description": "Relu is presenting at VTK Jobfair 2026. Visit booth 206 to connect!",
      "long_description": "Relu is participating in the annual VTK Jobfair. Stop by stand 206 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 206",
      "website": "https://www.relu.ai/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 10,
          "name": "Biomedische Technologie",
          "short_name": "BMT"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-206-1",
          "first_name": "Holger",
          "last_name": "Willems",
          "title": "Representative",
          "email": "holger.willems@relu.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-206-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.relu.ai/"
        },
        {
          "id": "vac-206-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.relu.ai/"
        }
      ]
    }
  },
  {
    "id": 207,
    "booth_number": 207,
    "coords": {
      "type": "rect",
      "x": 0,
      "y": 0,
      "width": 0,
      "height": 0
    },
    "floorplan_id": 1,
    "company_id": "company-207",
    "company": {
      "id": "company-207",
      "name": "iGEM KU Leuven",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/igemleuven.be",
      "short_description": "iGEM KU Leuven is presenting at VTK Jobfair 2026. Visit booth 207 to connect!",
      "long_description": "iGEM KU Leuven is participating in the annual VTK Jobfair. Stop by stand 207 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 207",
      "website": "https://igemleuven.be/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 10,
          "name": "Biomedische Technologie",
          "short_name": "BMT"
        }
      ],
      "representatives": [
        {
          "id": "rep-207-1",
          "first_name": "Niels",
          "last_name": "Visser",
          "title": "Representative",
          "email": "niels.visser@igemkuleuven.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-207-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://igemleuven.be/"
        },
        {
          "id": "vac-207-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://igemleuven.be/"
        }
      ]
    }
  },
  {
    "id": 208,
    "booth_number": 208,
    "coords": {
      "type": "rect",
      "x": 0,
      "y": 0,
      "width": 0,
      "height": 0
    },
    "floorplan_id": 1,
    "company_id": "company-208",
    "company": {
      "id": "company-208",
      "name": "Master of Cybersecurity",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/kuleuven.be",
      "short_description": "Master of Cybersecurity is presenting at VTK Jobfair 2026. Visit booth 208 to connect!",
      "long_description": "Master of Cybersecurity is participating in the annual VTK Jobfair. Stop by stand 208 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 208",
      "website": "https://www.kuleuven.be/programmes/master-cybersecurity",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-208-1",
          "first_name": "Vanessa",
          "last_name": "Banze",
          "title": "Representative",
          "email": "vanessa.banze@masterofcybersecurity.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-208-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.kuleuven.be/programmes/master-cybersecurity"
        },
        {
          "id": "vac-208-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.kuleuven.be/programmes/master-cybersecurity"
        }
      ]
    }
  },
  {
    "id": 209,
    "booth_number": 209,
    "coords": {
      "type": "rect",
      "x": 0,
      "y": 0,
      "width": 0,
      "height": 0
    },
    "floorplan_id": 1,
    "company_id": "company-209",
    "company": {
      "id": "company-209",
      "name": "Formula Electric Belgium",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/formulaelectric.be",
      "short_description": "Formula Electric Belgium is presenting at VTK Jobfair 2026. Visit booth 209 to connect!",
      "long_description": "Formula Electric Belgium is participating in the annual VTK Jobfair. Stop by stand 209 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 209",
      "website": "https://formulaelectric.be/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 5,
          "name": "Nanowetenschappen & Nanotechnologie",
          "short_name": "NANO"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        }
      ],
      "representatives": [
        {
          "id": "rep-209-1",
          "first_name": "Emiel",
          "last_name": "van den Berg",
          "title": "Representative",
          "email": "emiel.vandenberg@formulaelectricbelgium.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-209-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://formulaelectric.be/"
        },
        {
          "id": "vac-209-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://formulaelectric.be/"
        }
      ]
    }
  },
  {
    "id": 210,
    "booth_number": 210,
    "coords": {
      "type": "rect",
      "x": 0,
      "y": 0,
      "width": 0,
      "height": 0
    },
    "floorplan_id": 1,
    "company_id": "company-210",
    "company": {
      "id": "company-210",
      "name": "HydroTeam",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/hydroteam.be",
      "short_description": "HydroTeam is presenting at VTK Jobfair 2026. Visit booth 210 to connect!",
      "long_description": "HydroTeam is participating in the annual VTK Jobfair. Stop by stand 210 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 210",
      "website": "https://www.hydroteam.be/",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 5,
          "name": "Nanowetenschappen & Nanotechnologie",
          "short_name": "NANO"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 10,
          "name": "Biomedische Technologie",
          "short_name": "BMT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [
        {
          "id": "rep-210-1",
          "first_name": "Stan",
          "last_name": "Knapen",
          "title": "Representative",
          "email": "stan.knapen@hydroteam.com",
          "tel": null,
          "avatar_url": null
        }
      ],
      "vacancies": [
        {
          "id": "vac-210-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.hydroteam.be/"
        },
        {
          "id": "vac-210-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.hydroteam.be/"
        }
      ]
    }
  },
  {
    "id": 211,
    "booth_number": 211,
    "coords": {
      "type": "rect",
      "x": 0,
      "y": 0,
      "width": 0,
      "height": 0
    },
    "floorplan_id": 1,
    "company_id": "company-211",
    "company": {
      "id": "company-211",
      "name": "Innoptus Solar Team",
      "logo_id": null,
      "logo_url": "https://logo.clearbit.com/innoptussolarteam.be",
      "short_description": "Innoptus Solar Team is presenting at VTK Jobfair 2026. Visit booth 211 to connect!",
      "long_description": "Innoptus Solar Team is participating in the annual VTK Jobfair. Stop by stand 211 to talk with representatives, explore career options, and discuss internships or starter jobs.",
      "location": "Stand 211",
      "website": "https://www.innoptussolarteam.be",
      "category": [
        {
          "id": 1,
          "name": "Computerwetenschappen",
          "short_name": "CW"
        },
        {
          "id": 2,
          "name": "Artificiële Intelligentie",
          "short_name": "AI"
        },
        {
          "id": 3,
          "name": "Wiskundige Ingenieurstechnieken",
          "short_name": "WIT"
        },
        {
          "id": 4,
          "name": "Elektrotechniek",
          "short_name": "ESAT"
        },
        {
          "id": 5,
          "name": "Nanowetenschappen & Nanotechnologie",
          "short_name": "NANO"
        },
        {
          "id": 6,
          "name": "Energie",
          "short_name": "ENER"
        },
        {
          "id": 7,
          "name": "Werktuigkunde",
          "short_name": "WTK"
        },
        {
          "id": 8,
          "name": "Materiaalkunde",
          "short_name": "MTM"
        },
        {
          "id": 9,
          "name": "Chemische Technologie",
          "short_name": "CIT"
        },
        {
          "id": 10,
          "name": "Biomedische Technologie",
          "short_name": "BMT"
        },
        {
          "id": 11,
          "name": "Bouwkunde",
          "short_name": "BWK"
        },
        {
          "id": 12,
          "name": "Architectuur",
          "short_name": "ARCH"
        },
        {
          "id": 13,
          "name": "Management, Science & Engineering",
          "short_name": "MSCE"
        },
        {
          "id": 14,
          "name": "Andere richtingen",
          "short_name": "OTHER"
        }
      ],
      "representatives": [],
      "vacancies": [
        {
          "id": "vac-211-1",
          "title": "Software / Engineering Starter Position",
          "type": "Full-time",
          "location": "Belgium",
          "url": "https://www.innoptussolarteam.be"
        },
        {
          "id": "vac-211-2",
          "title": "Master Thesis / Internship",
          "type": "Internship",
          "location": "Belgium",
          "url": "https://www.innoptussolarteam.be"
        }
      ]
    }
  }
]
};
