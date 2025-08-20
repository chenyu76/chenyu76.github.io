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
    this.currentNote = 0;  // 当前音符索引
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

    this.A = [
      [ 10, 20, 5, 5, 5, 5, 10 ],
      [ 1, 10, 20, 5, 5, 5, 5 ],
      [ 5, 2, 10, 20, 5, 5, 5 ],
      [ 5, 2, 5, 10, 15, 5, 5 ],
      [ 5, 5, 3, 15, 7, 16, 5 ],
      [ 5, 5, 5, 15, 5, 1, 10 ],
      [ 1, 10, 5, 5, 8, 5, 5 ],
    ];
    // this.A =
    // 	[
    // 		[98, 17, 4, 76, 99, 14, 94],
    // 		[35, 22, 61, 99, 11, 54, 16],
    // 		[0, 86, 99, 4, 36, 12, 19],
    // 		[96, 8, 80, 94, 31, 65, 2],
    // 		[16, 8, 46, 70, 71, 7, 53],
    // 		[6, 69, 56, 58, 61, 56, 65],
    // 		[50, 3, 75, 29, 17, 7, 42],
    // 	];
    // 概率归一化
    for (let row of this.A) {
      let sum = row.reduce((sum, value) => sum + value, 0);
      for (let i = 0; i < row.length; i++) {
        row[i] /= sum;
      }
      for (let i = 1; i < row.length; i++) {
        row[i] += row[i - 1]; // 累加概率
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
      this.initializeAudioContext();

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
      this.initializeAudioContext();

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
      this.initializeAudioContext();

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
      const p = this.A[this.currentNote];
      for (let i = 0; i < p.length; i++) {
        if (rn < p[i]) {
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
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(0.01,
                                               time + 0.1); // 音高快速下降

    gain.gain.setValueAtTime(2, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.1); // 音量快速衰减

    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    osc.start(time);
    osc.stop(time + 0.1);
  }

  playHiHat(time) {
    // 使用白噪音来模拟踩镲
    const bufferSize = this.audioContext.sampleRate * 0.1;
    const buffer = this.audioContext.createBuffer(1, bufferSize,
                                                  this.audioContext.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    const noise = this.audioContext.createBufferSource();
    noise.buffer = buffer;

    const filter = this.audioContext.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 10000; // 滤掉低频

    const gain = this.audioContext.createGain();
    gain.gain.setValueAtTime(0.3, time);
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05); // 极快的衰减

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.audioContext.destination);
    noise.start(time);
    noise.stop(time + 0.05);
  }

  playLeadNote(time, frequency, type = 'triangle') {
    const osc = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    osc.type = type; // 三角波声音比正弦波更丰富
    osc.frequency.setValueAtTime(frequency, time);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.4, time + 0.05);      // 短暂的起音
    gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3); // 衰减

    osc.connect(gain);
    gain.connect(this.audioContext.destination);
    osc.start(time);
    osc.stop(time + 0.3);
  }

  toggleBGM() {
    if (!this.audioContext)
      this.initializeAudioContext();

    const toggleButton = document.getElementById('toggleBGM');
    this.isPlaying = !this.isPlaying;
    if (this.isPlaying) {
      this.currentStep = 0;
      this.nextNoteTime = this.audioContext.currentTime;
      this.sequencer(); // 启动音序器
      toggleButton.textContent = '停止音乐';
    } else {
      clearTimeout(this.sequencerTimer); // 停止音序器
      toggleButton.textContent = '播放音乐';
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
