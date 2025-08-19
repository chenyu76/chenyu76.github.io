
// document.querySelectorAll('button').forEach(button => {
//   button.addEventListener('click', initializeAudioContext, {once : true});
// });
//
/**
 * 音效1: 拾取金币
 * 特点: 音调快速升高，短促有力。
 */
class SoundEffect {
  constructor() {
    // 初始化音频上下文
    this.audioContext =
        new (window.AudioContext || window.webkitAudioContext)();
  }

  async playMoveSound() {
    if (!this.audioContext)
      return;

    const now = this.audioContext.currentTime;
    const gainNode = this.audioContext.createGain();
    const oscillator = this.audioContext.createOscillator();

    // 设置音量包络：快速起音，然后快速衰减
    gainNode.gain.setValueAtTime(1, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001,
                                               now + 0.20); // 音量衰减到几乎为0

    // 设置振荡器（音源）
    oscillator.type = 'sine';                      // 正弦波听起来比较圆润
    oscillator.frequency.setValueAtTime(440, now); // 起始音调
    oscillator.frequency.exponentialRampToValueAtTime(600, now + 0.05);
    oscillator.frequency.exponentialRampToValueAtTime(500, now + 0.15);

    // 连接节点：振荡器 -> 音量控制器 -> 输出设备
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // 启动和停止
    oscillator.start(now);
    oscillator.stop(now + 0.2); // 在0.2秒后停止振荡器，释放资源
  }

  async playLaserSound() {
    if (!this.audioContext)
      return;

    const now = this.audioContext.currentTime;
    const gainNode = this.audioContext.createGain();
    const oscillator = this.audioContext.createOscillator();

    // 设置音量包络
    gainNode.gain.setValueAtTime(0.5, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    // 设置振荡器
    oscillator.type = 'square'; // 方波听起来更具科技感和冲击力
    oscillator.frequency.setValueAtTime(800, now); // 起始音调较高
    oscillator.frequency.exponentialRampToValueAtTime(
        200, now + 0.15); // 在0.15秒内音调快速下降

    // 连接
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // 启动和停止
    oscillator.start(now);
    oscillator.stop(now + 0.2);
  }

  async playExplosionSound() {
    if (!this.audioContext)
      return;

    const now = this.audioContext.currentTime;
    const gainNode = this.audioContext.createGain();

    // 创建一个缓冲区来存放白噪音数据
    const bufferSize = this.audioContext.sampleRate * 1; // 1秒的缓冲区
    const buffer = this.audioContext.createBuffer(1, bufferSize,
                                                  this.audioContext.sampleRate);
    const output = buffer.getChannelData(0);

    // 填充随机数，生成白噪音
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    // 创建白噪音源
    const noiseSource = this.audioContext.createBufferSource();
    noiseSource.buffer = buffer;

    // 创建一个低通滤波器，让声音听起来更“闷”
    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1000, now); // 初始截止频率
    filter.frequency.linearRampToValueAtTime(
        100, now + 0.3); // 频率快速下降，模拟爆炸后能量的衰减

    // 设置音量包络
    gainNode.gain.setValueAtTime(1, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    // 连接：噪音源 -> 滤波器 -> 音量 -> 输出
    noiseSource.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // 启动和停止
    noiseSource.start(now);
    noiseSource.stop(now + 0.5);
  }
  /**
   * 音效4: 物体消失 (Vanish)
   * 特点: 音调和滤波频率同时快速升高，产生一种“蒸发”感。
   */
  async playVanishSound() {
    if (!this.audioContext)
      return;

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    // 设置振荡器
    oscillator.type = 'triangle'; // 三角波比正弦波稍显尖锐
    oscillator.frequency.setValueAtTime(200, now);
    oscillator.frequency.exponentialRampToValueAtTime(
        3000, now + 0.3); // 音调在0.3秒内急剧升高

    // 设置滤波器，让声音变得“更细”
    filter.type = 'highpass'; // 高通滤波器，只允许高频通过
    filter.Q.value = 1;       // Q值（谐振）
    filter.frequency.setValueAtTime(100, now);
    filter.frequency.exponentialRampToValueAtTime(
        2500, now + 0.3); // 滤波频率也随之升高

    // 设置音量包络，在最后快速淡出
    gainNode.gain.setValueAtTime(0.6, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    // 连接: 振荡器 -> 滤波器 -> 音量 -> 输出
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // 启动和停止
    oscillator.start(now);
    oscillator.stop(now + 0.4);
  }
}
