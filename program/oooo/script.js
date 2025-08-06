// 等待DOM加载完成
document.addEventListener('DOMContentLoaded', () => {

	// --- Matter.js 模块别名 ---
	const { Engine, Render, Runner, World, Bodies, Composite, Events } = Matter;

	// --- 游戏设置 ---
	const container = document.getElementById('game-container');
	const canvas = document.getElementById('game-canvas');
	const hpBar = document.getElementById('hp-bar');
	const hpBarContainer = document.getElementById('hp-bar-container');

	// 获取容器的动态尺寸
	const width = container.clientWidth;
	const height = container.clientHeight;
	canvas.width = width;
	canvas.height = height;

	// 球体所在的上半区高度
	const playAreaHeight = height; // / 2;
	const initialBallsNum = 5; // 初始小球数量
	const ballRadius = 40; // 小球半径

	// --- 游戏状态变量 ---
	let playerBalls = [];
	let historyBgColors = [];
	let maxHealth = 400; // 总血量，可以调整
	let currentHealth = maxHealth;
	let gameState = 'playing'; // 'playing', 'choosing', 'ended'
	let choiceBalls = [];

	// --- Matter.js 引擎初始化 ---
	const engine = Engine.create({
		gravity: { y: 1 } // 适中的重力
	});
	const world = engine.world;

	const render = Render.create({
		canvas: canvas,
		engine: engine,
		options: {
			width: width,
			height: height,
			wireframes: false, // 我们要显示颜色，所以不用线框模式
			background: 'transparent' // 画布背景透明，以便显示HTML背景
		}
	});

	Render.run(render);
	const runner = Runner.create();
	Runner.run(runner, engine);

	// --- 创建边界 ---
	const wallOptions = { isStatic: true, render: { visible: false } };
	World.add(world, [
		Bodies.rectangle(width / 2, playAreaHeight + 20, width, 40, wallOptions), // 下边界
		//Bodies.rectangle(width / 2, -20, width, 40, wallOptions),               // 上边界
		Bodies.rectangle(-20, playAreaHeight / 2, 40, playAreaHeight, wallOptions),// 左边界
		Bodies.rectangle(width + 20, playAreaHeight / 2, 40, playAreaHeight, wallOptions) // 右边界
	]);

	// --- 颜色处理工具函数 ---
	const hexToRgb = (hex) => {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		return result ? {
			r: parseInt(result[1], 16),
			g: parseInt(result[2], 16),
			b: parseInt(result[3], 16)
		} : null;
	};


	/**
	 * 将HSL颜色值转换为RGB。
	 * h, s, l 的范围均为 [0, 1]。
	 * 返回 { r, g, b }，值的范围为 [0, 255]。
	 */
	function hslToRgb(h, s, l) {
		let r, g, b;
		if (s === 0) {
			r = g = b = l; // achromatic
		} else {
			const hue2rgb = (p, q, t) => {
				if (t < 0) t += 1;
				if (t > 1) t -= 1;
				if (t < 1 / 6) return p + (q - p) * 6 * t;
				if (t < 1 / 2) return q;
				if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
				return p;
			};
			const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
			const p = 2 * l - q;
			r = hue2rgb(p, q, h + 1 / 3);
			g = hue2rgb(p, q, h);
			b = hue2rgb(p, q, h - 1 / 3);
		}
		return {
			r: Math.round(r * 255),
			g: Math.round(g * 255),
			b: Math.round(b * 255),
		};
	}

	/**
	 * 生成一个视觉上舒适的、低饱和度的随机颜色。
	 * 返回一个包含 rgb 对象和 hex 字符串的对象。
	 */
	function generateComfortableColor() {
		// 1. 在HSL空间中定义舒适的颜色范围
		const hue = Math.random(); // 色相 (0-1, 代表 0-360度)，完全随机

		// 饱和度限制在 30% 到 55% 之间，避免鲜艳刺眼
		const saturation = 0.30 + Math.random() * 0.25;

		// 亮度限制在 65% 到 85% 之间，避免太暗或太白
		const lightness = 0.65 + Math.random() * 0.20;

		// 2. 将选定的 HSL 值转换为 RGB
		const rgb = hslToRgb(hue, saturation, lightness);

		// 3. 将 RGB 转换为 HEX 字符串
		const toHex = (c) => ('0' + c.toString(16)).slice(-2);
		const hex = `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;

		return { rgb, hex };
	}
	// const randomHexColor = () => '#' + ('000000' + Math.floor(Math.random() * 16777215).toString(16)).slice(-6);
	const randomHexColor = () => generateComfortableColor().hex;

	const colorDistance = (rgb1, rgb2) => {
		const dr = rgb1.r - rgb2.r;
		const dg = rgb1.g - rgb2.g;
		const db = rgb1.b - rgb2.b;
		return Math.sqrt(dr * dr + dg * dg + db * db);
	};

	// --- 游戏核心功能 ---
	function addBall(hexColor, position = { x: width / 2, y: 30 }) {
		// 新球从顶部中央落下
		const body = Bodies.circle(position.x, position.y, ballRadius, {
			restitution: 0.5, // 弹性
			friction: 0.05,
			render: {
				fillStyle: hexColor,
				strokeStyle: 'transparent',
				lineWidth: 0
			}
		});

		const ball = {
			body: body,
			color: hexColor,
			rgb: hexToRgb(hexColor)
		};

		playerBalls.push(ball);
		World.add(world, body);
		return ball;
	}

	function updateHealth(damage) {
		currentHealth -= damage;
		if (currentHealth < 0) currentHealth = 0;
		hpBar.style.width = `${(currentHealth / maxHealth) * 100}%`;

		if (currentHealth <= 0 && gameState !== 'ended') {
			endGame();
		}
	}
	function setHealth(health) {
		currentHealth = health > 0 ? health : 0;
		if (currentHealth > maxHealth) currentHealth = maxHealth;
		hpBar.style.width = `${(currentHealth / maxHealth) * 100}%`;
	}


	function findBestCombination(targetRgb) {
		const maxBalls = 3;
		if (playerBalls.length < maxBalls) return null;

		let bestCombination = [];
		let minDifference = Infinity;

		for (let ballNum = 1; ballNum <= maxBalls; ballNum++) {
			let usedBalls = Array.from({ length: ballNum }, (_, i) => i);
			while (usedBalls[usedBalls.length - 1] <= playerBalls.length - ballNum) {
				const currentCombination = usedBalls.map(i => playerBalls[i]);
				const avgRgb = ["r", "g", "b"].reduce((accumulator, item) => {
					accumulator[item] = currentCombination.reduce((sum, b) => sum + b.rgb[item], 0) / ballNum;
					return accumulator;
				}, {});

				const diff = colorDistance(avgRgb, targetRgb);
				if (diff < minDifference) {
					minDifference = diff;
					bestCombination = currentCombination;
				}

				// 生成下一个组合
				usedBalls[0]++;
				for (let i = 0; i < usedBalls.length - 1; i++) {
					if (usedBalls[i] >= playerBalls.length - (usedBalls.length - i)) {
						usedBalls[i + 1] += 1;
						usedBalls[i] = usedBalls[i + 1] + 1;
					}
				}
			}
		}

		return { combination: bestCombination, difference: minDifference };
	}

	function highlightBalls(balls, highlight = true) {
		balls.forEach(ball => {
			ball.body.render.strokeStyle = highlight ? '#FFFFFF' : 'transparent';
			ball.body.render.lineWidth = highlight ? 15 : 0;
		});
	}

	async function startNewTurn() {
		if (gameState !== 'playing') return;

		// 1. 随机背景颜色
		const bgColor = randomHexColor();
		historyBgColors.push(bgColor);
		container.style.backgroundColor = bgColor;

		await new Promise(resolve => setTimeout(resolve, 500));

		// 2. 找到最佳组合
		if (playerBalls.length < initialBallsNum) { // 球不够了,选择新球
			setHealth((playerBalls.length + 1) / initialBallsNum * maxHealth); // 扣血
			presentChoices();
			return;
		}
		const targetRgb = hexToRgb(bgColor);
		const result = findBestCombination(targetRgb);
		if (!result) {
			//setTimeout(presentChoices, 500); // 直接进入选球
			presentChoices();
			return;
		}

		// 3. 高亮小球并计算伤害
		highlightBalls(result.combination, true);
		// RGB距离最大约为441(黑vs白)，可调整伤害系数
		const damage = result.difference;
		updateHealth(damage);

		// 4. 短暂显示后进入选择阶段
		await new Promise(resolve => setTimeout(resolve, 500));

		if (gameState === 'ended') return;

		highlightBalls(result.combination, false);
		presentChoices();
	}

	function presentChoices() {
		gameState = 'choosing';
		choiceBalls = [];
		// const choiceY = playAreaHeight + (height - playAreaHeight) / 2;
		const choiceY = height / 2;
		const choiceCount = 3;
		const spacing = width / (choiceCount + 1);

		for (let i = 0; i < choiceCount; i++) {
			const hex = randomHexColor();
			choiceBalls.push({
				x: spacing * (i + 1),
				y: choiceY,
				radius: ballRadius,
				color: hex
			});
		}
	}

	function endGame() {
		gameState = 'ended';
		console.log("游戏结束！");
		container.style.backgroundColor = '#FFFFFF';
		hpBarContainer.style.visibility = 'hidden';

		// 移除所有玩家的球
		playerBalls.forEach(ball => World.remove(world, ball.body));
		playerBalls = [];

		// 将历史背景色作为小球掉落
		historyBgColors.forEach((color, index) => {
			setTimeout(() => addBall(
				color,
				{ x: Math.random() * 2 - 1 + width / 2, y: 30 }
			), index * 300);
		});

		// 停止新回合
		//Runner.stop(runner);
	}

	// --- 事件监听 ---
	// 监听渲染事件，用于绘制非物理对象（如选项）
	Events.on(render, 'afterRender', () => {
		if (gameState === 'choosing') {
			const ctx = canvas.getContext('2d');
			ctx.fillStyle = 'rgba(255,255,255,0.5)';
			ctx.fillRect(0, height / 2 - ballRadius * 2, width, ballRadius * 4);
			// ctx.fillStyle = 'white';
			// ctx.font = '20px Arial';
			// ctx.textAlign = 'center';
			// ctx.fillText('选择一个加入牌组', width / 2, playAreaHeight + 40);

			choiceBalls.forEach(ball => {
				ctx.beginPath();
				ctx.arc(ball.x, ball.y, ball.radius, 0, 2 * Math.PI);
				ctx.fillStyle = ball.color;
				ctx.fill();
			});
		}
	});

	// 监听点击事件
	canvas.addEventListener('click', (event) => {
		if (gameState === 'ended') window.location.reload(false);
		if (gameState !== 'choosing') return;

		const rect = canvas.getBoundingClientRect();
		const mouseX = event.clientX - rect.left;
		const mouseY = event.clientY - rect.top;

		for (const ball of choiceBalls) {
			const dist = Math.sqrt((mouseX - ball.x) ** 2 + (mouseY - ball.y) ** 2);
			if (dist < ball.radius) {
				// 选择了这个球
				choiceBalls = []; // 清空选项
				gameState = 'playing';
				const newBall = addBall(ball.color, { x: ball.x + Math.random() - 1 / 2, y: ball.y });

				// 等待新球稳定下来
				let stillCount = 0;
				const stableCheck = setInterval(() => {
					if (newBall.body.speed < 0.5 && newBall.body.angularSpeed < 0.5) {
						stillCount++;
					} else {
						stillCount = 0;
					}
					// 如果连续稳定一段时间，则开始新回合
					if (stillCount > 5) {
						clearInterval(stableCheck);
						startNewTurn();
					}
				}, 100);
				break;
			}
		}
	});
	canvas.addEventListener('mousemove', (event) => {
		if (gameState === 'ended') return;

		const rect = canvas.getBoundingClientRect();
		const mouseX = event.clientX - rect.left;
		const mouseY = event.clientY - rect.top;

		let ballIsHovered = false;
		let r2 = ballRadius ** 2;
		for (const ball of choiceBalls) {
			if (((mouseX - ball.x) ** 2 + (mouseY - ball.y) ** 2) <= r2) {
				ballIsHovered = true;
				break;
			}
		}

		// 改变鼠标指针样式以提供反馈
		canvas.style.cursor = ballIsHovered ? 'pointer' : 'default';
	});


	// --- 游戏启动 ---
	function init() {
		// 添加初始小球
		// const initialColors = ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF', '#000000'];
		// initialColors.forEach((color, index) => {
		// 	setTimeout(() => addBall(
		// 		color,
		// 		{ x: Math.random() * 2 - 1 + width / 2, y: 30 }
		// 	), index * 300);
		// });

		// 等待初始小球稳定
		// setTimeout(() => {
		// 	startNewTurn();
		// }, 2000);

		setHealth(0);
		startNewTurn();
	}

	init();
});
