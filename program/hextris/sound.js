class SoundEffect {
  constructor() {
    // 初始化音频上下文
    // this.audioContext =
    //     new (window.AudioContext || window.webkitAudioContext)();
    this.audioContext = null;

    this.isPlaying = false;
    this.sequencerTimer = null;

    // --- 音乐参数 ---
    this.tempo = 120.0;    // BPM (Beats Per Minute)
    this.currentStep = 0;  // 当前进行到第几步 (0-15)
    this.currentNote = 0;  // 当前音符索引 (最近一个)
    this.prevNote = 0;     // 前一个音符索引 (第二近的)
    this.historyNote = []; // 历史音符索引
    this.playHistory = 0;

    // 调度相关的参数
    this.nextNoteTime = 0.0;      // 下一个音符应该在何时播放
    this.scheduleAheadTime = 0.1; // 提前多长时间进行调度 (秒)
    this.lookahead = 25.0;        // 调度器多久唤醒一次 (毫秒)

    // --- 乐器节奏型 (1 = 播放, 0 = 静音) ---
    // 16步的序列，代表一个小节的16分音符
    this.kickPattern = [ 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0 ];
    // const hiHatPattern = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0];
    this.hiHatPattern = [ 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0 ];

    // --- 旋律音阶 (C小调五声音阶) ---
    // 频率值 (Hz)
    this.scale = [ 261.63, 311.13, 349.23, 392.00, 466.16, 523.25, 622.25 ];
    // this.scale = [69, 70, 71, 72, 73, 74, 75].map(p => 440 * Math.pow(2, (p -
    // 69) / 12));

    // 二阶马尔可夫链转移张量: A[prev2][prev1][next]
    // 使用带动量的高斯随机游走生成:
    //   raw_score ∝ exp(-(next - center)² / (2σ²))
    //   center = prev1 + momentum * (prev1 - prev2)
    // 动量使得旋律有方向性，高斯分布保证相邻音优先
    this.A = [];
    const N = this.scale.length;
    const momentum = 0.35;
    const sigma2 = 2.5;
    for (let prev2 = 0; prev2 < N; prev2++) {
      this.A[prev2] = [];
      for (let prev1 = 0; prev1 < N; prev1++) {
        let row = [];
        let center = prev1 + momentum * (prev1 - prev2);
        for (let next = 0; next < N; next++) {
          row.push(Math.exp(-((next - center) * (next - center)) / (2 * sigma2)));
        }
        let sum = row.reduce((s, v) => s + v, 0);
        for (let k = 0; k < N; k++) {
          row[k] /= sum;
        }
        for (let k = 1; k < N; k++) {
          row[k] += row[k - 1];
        }
        this.A[prev2].push(row);
      }
    }

    // this.collatz = Math.floor(Math.random() * 1000);
  }
  initializeAudioContext() {
    if (!this.audioContext) {
      this.audioContext =
          new (window.AudioContext || window.webkitAudioContext)();
    }
  }

  async playMoveSound() {
    if (!this.audioContext)
      this.initializeAudioContext();

    const now = this.audioContext.currentTime;
    const gainNode = this.audioContext.createGain();
    const osc1 = this.audioContext.createOscillator();
    const osc2 = this.audioContext.createOscillator();
    const filter = this.audioContext.createBiquadFilter();

    gainNode.gain.setValueAtTime(0.7, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(330, now);
    osc1.frequency.exponentialRampToValueAtTime(520, now + 0.06);
    osc1.frequency.exponentialRampToValueAtTime(440, now + 0.12);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(660, now);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, now);
    filter.frequency.exponentialRampToValueAtTime(800, now + 0.08);
    filter.Q.value = 0.5;

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(filter);
    filter.connect(this.audioContext.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.15);
    osc2.stop(now + 0.15);
  }

  async playLaserSound() {
    if (!this.audioContext)
      this.initializeAudioContext();

    const now = this.audioContext.currentTime;
    const gainNode = this.audioContext.createGain();
    const oscillator = this.audioContext.createOscillator();
    const filter = this.audioContext.createBiquadFilter();

    gainNode.gain.setValueAtTime(0.4, now);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(1200, now);
    oscillator.frequency.exponentialRampToValueAtTime(150, now + 0.12);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(6000, now);
    filter.frequency.exponentialRampToValueAtTime(300, now + 0.12);
    filter.Q.value = 2;

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.18);
  }

  async playExplosionSound() {
    if (!this.audioContext)
      this.initializeAudioContext();

    const now = this.audioContext.currentTime;

    const subOsc = this.audioContext.createOscillator();
    const subGain = this.audioContext.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(80, now);
    subOsc.frequency.exponentialRampToValueAtTime(20, now + 0.25);
    subGain.gain.setValueAtTime(1.2, now);
    subGain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    subOsc.connect(subGain);
    subGain.connect(this.audioContext.destination);
    subOsc.start(now);
    subOsc.stop(now + 0.3);

    const bufferSize = this.audioContext.sampleRate * 1;
    const buffer = this.audioContext.createBuffer(1, bufferSize,
                                                   this.audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const noiseSource = this.audioContext.createBufferSource();
    noiseSource.buffer = buffer;

    const filter = this.audioContext.createBiquadFilter();
    const noiseGain = this.audioContext.createGain();

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, now);
    filter.frequency.exponentialRampToValueAtTime(80, now + 0.35);
    filter.Q.value = 0.3;

    noiseGain.gain.setValueAtTime(0.7, now);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);

    noiseSource.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.audioContext.destination);

    noiseSource.start(now);
    noiseSource.stop(now + 0.5);
  }
  /**
   * 音效4: 物体消失 (Vanish)
   * 特点: 音调和滤波频率同时快速升高，产生一种“蒸发”感。
   */
  async playVanishSound() {
    if (!this.audioContext)
      this.initializeAudioContext();

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(180, now);
    oscillator.frequency.exponentialRampToValueAtTime(4000, now + 0.35);

    filter.type = 'bandpass';
    filter.Q.value = 2;
    filter.frequency.setValueAtTime(300, now);
    filter.frequency.exponentialRampToValueAtTime(3000, now + 0.3);

    gainNode.gain.setValueAtTime(0.35, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.start(now);
    oscillator.stop(now + 0.4);
  }

  // --- 音序器核心逻辑 ---
  scheduleNote(step, time) {
    // 1. 播放底鼓
    if (this.kickPattern[step] === 1) {
      this.playKick(time);
    }
    // 2. 播放踩镲
    if (this.hiHatPattern[step] === 1) {
      this.playHiHat(time);
    }
    // 3. 播放主旋律
    // if (step % 2 === 0) {
    //   this.currentNote = this.collatz % 7;
    //   this.collatz =
    //       this.collatz % 2 === 0 ? this.collatz / 2 : this.collatz * 3 + 1;
    //   if (this.collatz == 1)
    //     this.collatz = Math.floor(Math.random() * 1000);
    //   this.historyNote.push(this.currentNote);
    //   this.playLeadNote(time, this.scale[this.currentNote]);
    // }
    if (step % 2 === 0) {
      let rn = Math.random();
      const p = this.A[this.prevNote][this.currentNote];
      for (let i = 0; i < p.length; i++) {
        if (rn < p[i]) {
          this.prevNote = this.currentNote;
          this.currentNote = i;
          break;
        }
      }
      this.historyNote.push(this.currentNote);
      this.playLeadNote(time, this.scale[this.currentNote]);
    }
    this.playHistory++;
    if (this.historyNote.length > 2 && this.playHistory > 32) {
      this.playLeadNote(time, this.scale[this.historyNote.shift()], 'sine');
      if (Math.random() < 0.05) {
        this.playHistory = Math.floor(Math.random() * 24);
      }
    }
    if (this.historyNote.length > 128) {
      this.historyNote = this.historyNote.slice(-8);
    }
  }

  sequencer() {
    // 当音频上下文的时间超过下一个音符时间时，开始调度
    while (this.nextNoteTime <
           this.audioContext.currentTime + this.scheduleAheadTime) {
      this.scheduleNote(this.currentStep, this.nextNoteTime);

      // 更新下一个音符的时间
      const secondsPerBeat = 60.0 / this.tempo;
      this.nextNoteTime += 0.25 * secondsPerBeat; // 每次前进一个16分音符

      // 更新步数
      this.currentStep = (this.currentStep + 1) % 16;
    }

    // 循环调用自己
    this.sequencerTimer = setTimeout(() => this.sequencer(), this.lookahead);
  }

  // --- 乐器合成函数 ---
  playKick(time) {
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const clickOsc = this.audioContext.createOscillator();
    const clickGain = this.audioContext.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, time);
    osc.frequency.exponentialRampToValueAtTime(30, time + 0.08);

    gain.gain.setValueAtTime(1.8, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(1000, time);
    clickOsc.frequency.exponentialRampToValueAtTime(200, time + 0.005);
    clickGain.gain.setValueAtTime(0.15, time);
    clickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.005);

    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    clickOsc.connect(clickGain);
    clickGain.connect(this.audioContext.destination);

    osc.start(time);
    osc.stop(time + 0.15);
    clickOsc.start(time);
    clickOsc.stop(time + 0.005);
  }

  playHiHat(time) {
    const bufferSize = this.audioContext.sampleRate * 0.1;
    const buffer = this.audioContext.createBuffer(1, bufferSize,
                                                   this.audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

    const bpFilter = this.audioContext.createBiquadFilter();
    bpFilter.type = 'bandpass';
    bpFilter.frequency.value = 9000;
    bpFilter.Q.value = 1.5;

    const hpFilter = this.audioContext.createBiquadFilter();
    hpFilter.type = 'highpass';
    hpFilter.frequency.value = 7000;

    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0.38, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

    noise.connect(hpFilter);
    hpFilter.connect(bpFilter);
    bpFilter.connect(gain);
    gain.connect(this.audioContext.destination);
    noise.start(time);
    noise.stop(time + 0.06);
  }

  playLeadNote(time, frequency, type = 'triangle') {
    const osc1 = this.audioContext.createOscillator();
    const osc2 = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    const filter = this.audioContext.createBiquadFilter();
    const lfo = this.audioContext.createOscillator();
    const lfoGain = this.audioContext.createGain();

    osc1.type = type;
    osc1.frequency.setValueAtTime(frequency, time);
    osc1.detune.value = -5;

    osc2.type = type;
    osc2.frequency.setValueAtTime(frequency, time);
    osc2.detune.value = 5;

    lfo.type = 'sine';
    lfo.frequency.value = 4;
    lfoGain.gain.value = 3;
    lfo.connect(lfoGain);
    lfoGain.connect(osc1.frequency);
    lfoGain.connect(osc2.frequency);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, time);
    filter.frequency.exponentialRampToValueAtTime(2000, time + 0.02);
    filter.frequency.exponentialRampToValueAtTime(300, time + 0.35);
    filter.Q.value = 0.8;

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.35, time + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioContext.destination);

    osc1.start(time);
    osc2.start(time);
    lfo.start(time);
    osc1.stop(time + 0.4);
    osc2.stop(time + 0.4);
    lfo.stop(time + 0.4);
  }

  toggleBGM() {
    if (!this.audioContext)
      this.initializeAudioContext();

    const toggleButton = document.getElementById('settings-bgm');
    this.isPlaying = !this.isPlaying;
    if (this.isPlaying) {
      this.currentStep = 0;
      this.currentNote = 0;
      this.prevNote = 0;
      this.nextNoteTime = this.audioContext.currentTime;
      this.sequencer(); // 启动音序器
      toggleButton.textContent = 'Stop BGM';
    } else {
      clearTimeout(this.sequencerTimer); // 停止音序器
      toggleButton.textContent = 'Play BGM';
    }
    return this.isPlaying;
  }
  startBGM() {
    if (this.isPlaying)
      return;
    return this.toggleBGM();
  }
  stopBGM() {
    if (!this.isPlaying)
      return;
    return this.toggleBGM();
  }
}
