let globalId = 0;
let getGlobalId = () => globalId++;
const arrayValEqual = (b) =>
    ((a) => a.length === b.length && a.every((val, i) => val === b[i]));
const randomValFromArray = (arr) => arr[Math.floor(Math.random() * arr.length)];

// 向量操作类
class Vector {
  static add(a, b, f = (x, y) => x + y) {
    if (typeof a === 'number' && typeof b === 'number')
      return f(a, b);
    if (typeof a === 'number')
      return b.map(val => f(val, a));
    if (typeof b === 'number')
      return a.map(val => f(val, b));
    return a.map((val, i) => f(val, b[i]));
  }
  static subtract(a, b) { return Vector.add(a, b, (x, y) => x - y); }
  static dot(a, b) { return a.reduce((sum, val, i) => sum + val * b[i], 0); }
  // 向量的模
  static norm(a) {
    return Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  }
  // 标量乘法
  static times(a, b) {
    if (Array.isArray(a))
      return a.map(val => val * b);
    return b.map(val => val * a);
  }
  // 标量除法
  static divide(a, b) { return a.map(val => val / b); }
  // 绝对值后求和
  static absSum(a) { return a.reduce((sum, val) => sum + Math.abs(val), 0); }
}
// 矩阵操作类
class Matrix {
  static add(a, b) {
    return a.map((row, i) => row.map((val, j) => val + b[i][j]));
  }
  static subtract(a, b) {
    return a.map((row, i) => row.map((val, j) => val - b[i][j]));
  }
  static multiply(a, b) {
    return a.map(row => b[0].map((_, j) => row.reduce(
                                     (sum, val, k) => sum + val * b[k][j], 0)));
  }
  static transpose(matrix) {
    return matrix[0].map((_, i) => matrix.map(row => row[i]));
  }
}

// 页面加载完成后初始化
window.addEventListener("DOMContentLoaded", () => {
  const ht = new HexTris("grid-container", 10);

  // 处理窗口大小变化
  function handleResize() {
    ht.resetView(); // 重置视图
  }
  // 防抖函数封装
  function debounce(func, delay = 250) {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId); // 清除之前的定时器
      timeoutId = setTimeout(() => {
        func.apply(this, args); // 延迟执行目标函数
      }, delay);
    };
  }
  // 监听窗口resize事件
  window.addEventListener("resize", debounce(handleResize));
});
