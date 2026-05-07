precision mediump float;
uniform float u_time;
varying vec2 v_uv;

void main() {
  float pulse = 0.5 + 0.5 * sin(u_time * 2.0 + v_uv.x * 10.0);
  vec3 base = vec3(0.12, 0.05, 0.28);
  vec3 glow = vec3(0.64, 0.32, 1.0) * pulse;
  gl_FragColor = vec4(base + glow * 0.5, 1.0);
}
