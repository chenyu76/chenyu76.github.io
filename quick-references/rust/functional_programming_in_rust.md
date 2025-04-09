# Rust 中进行函数式编程

在 Rust 中进行函数式编程（Functional Programming, FP）是可行的，尽管 Rust 不是纯函数式语言（如 Haskell），但它提供了许多函数式编程的特性。

## 1. **使用不可变数据（Immutability）**

函数式编程强调不可变性，Rust 默认变量是不可变的（除非用 `mut` 声明）。

```rust
let x = 5;      // 不可变
// x = 6;       // 错误，不能修改不可变变量
let mut y = 10; // 可变
y = 20;         // 可以修改
```

- 尽量使用不可变变量（`let` 不加 `mut`）。
- 需要修改数据时，考虑返回新数据而不是原地修改。

## 2. **高阶函数（Higher-Order Functions）**

Rust 支持将函数作为参数或返回值（高阶函数）。

```rust
// 函数作为参数
fn apply_twice(f: impl Fn(i32) -> i32, x: i32) -> i32 {
    f(f(x))
}

let square = |x| x * x;
println!("{}", apply_twice(square, 3)); // 输出 81 (3^2^2)
```

## 3. **闭包（Closures）**

闭包（匿名函数）可以捕获环境变量，是函数式编程的重要工具。

```rust
let factor = 2;
let multiply = |x| x * factor; // 捕获外部的 factor
println!("{}", multiply(5));   // 输出 10
```

**闭包类型**：

- `Fn`：不可变借用（`&T`）。
- `FnMut`：可变借用（`&mut T`）。
- `FnOnce`：获取所有权（`T`）。

## 4. **迭代器（Iterators）**

Rust 的迭代器是惰性的（lazy），支持链式调用，类似函数式语言的 `map`/`filter`/`reduce`。

```rust
let numbers = vec![1, 2, 3, 4, 5];

// 链式调用：过滤 -> 映射 -> 求和
let sum: i32 = numbers.iter()
    .filter(|&x| x % 2 == 0)  // 过滤偶数
    .map(|x| x * x)           // 平方
    .sum();                   // 求和

println!("{}", sum); // 输出 2*2 + 4*4 = 20
```

**常用迭代器方法**：
| 方法 | 作用 | 示例 |
| --------- | ------------------ | ---------------------------- |
| `map` | 转换元素 | `.map(|x| x + 1)` |
| `filter` | 过滤元素 | `.filter(|&x| x > 0)` |
| `fold` | 累积计算（reduce） | `.fold(0, |acc, x| acc + x)` |
| `collect` | 收集为集合 | `.collect::<Vec<_>>()` |
| `take` | 取前 n 个元素 | `.take(5)` |

## 5. **模式匹配（Pattern Matching）**

Rust 的 `match` 和 `if let` 是强大的模式匹配工具。

```rust
fn factorial(n: u32) -> u32 {
    match n {
        0 | 1 => 1,          // 匹配 0 或 1
        _ => n * factorial(n - 1), // 递归
    }
}

println!("{}", factorial(5)); // 输出 120
```


`if let` 表达式是 `match` 的一个语法糖，用于只关心一个特定模式的匹配。

它允许你简洁地检查一个值是否匹配某个模式，如果匹配则执行相应的代码。

```rust
fn process_option(option: Option<i32>) {
    if let Some(value) = option {
        println!("Value: {}", value);
    } else {
        println!("No value");
    }
}
```


## 6. **Option 和 Result 的链式处理**

Rust 的 `Option` 和 `Result` 支持函数式风格的组合操作：

```rust
// Option 的链式处理
let result = Some(5)
    .map(|x| x * 2)      // Some(10)
    .filter(|x| x > 8)   // Some(10)
    .and_then(|x| Some(x + 1)); // Some(11)

// Result 的错误处理
let parse_result = "123"
    .parse::<i32>()
    .map(|x| x * 2)
    .map_err(|e| format!("Parse failed: {}", e));
```

## 7. **递归（Recursion）**

函数式编程常用递归替代循环，但 Rust 默认不优化递归（注意可能会栈溢出）

```rust
fn sum_list(list: &[i32]) -> i32 {
    match list {
        [] => 0,
        [head, tail @ ..] => head + sum_list(tail), // 递归
    }
}

println!("{}", sum_list(&[1, 2, 3])); // 输出 6
```

## 8. **纯函数（Pure Functions）**

纯函数（无副作用、输出仅依赖输入）在 Rust 中可通过以下方式实现：

- 避免修改外部状态。
- 不适用 `static mut` 或全局可变变量。
- 返回新数据而非修改输入。

## 9. **函数组合（Function Composition）**

Rust 没有原生 `>>` 或 `<<` 组合操作符，但可以手动实现：

```rust
fn compose<A, B, C>(f: impl Fn(B) -> C, g: impl Fn(A) -> B) -> impl Fn(A) -> C {
    move |x| f(g(x))
}

let add_one = |x| x + 1;
let square = |x| x * x;
let add_then_square = compose(square, add_one);
println!("{}", add_then_square(2)); // (2+1)^2 = 9
```

## 10. **不可变数据结构**

使用 `Arc`、`Rc` 或第三方库（如 `im`）实现持久化数据结构（Persistent Data Structures），避免拷贝开销。

```rust
use std::sync::Arc;
let vec1 = Arc::new(vec![1, 2, 3]);
let vec2 = Arc::clone(&vec1); // 共享数据
```
