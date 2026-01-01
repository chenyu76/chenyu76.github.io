# Hello, Markdown!

This is a sample code block:

```javascript
function greet() {
  console.log("Hello, world!");
}
```

And here is an inline formula: $E = mc^2$

And some block formula:

$$
e^{\pi i} + 1 = 0
$$

$$
    \left(
    \begin{array}{ccc}
        a & b & d \\
        0 & a & c \\
        0 & 0 & a \\
    \end{array}
    \right)^n
    =
    \left(
    \begin{array}{ccc}
        a^n & n a^{n-1} b & n a^{n-2} \left[a d+\frac{1}{2} (n-1) b c\right] \\
        0   & a^n         & n c a^{n-1}                                        \\
        0   & 0           & a^n                                                \\
    \end{array}
    \right) , \quad n \in \mathbb{Z}^+
$$

$$
\int_0^\infty x^n e^{-x} \mathrm{d} x = n!
$$

## footnote

Here is a simple footnote[^1].

A footnote can also have multiple lines[^2].

[^1]: My reference.

[^2]:
    To add line breaks within a footnote, prefix new lines with many spaces.
    This is a second line.

A strange picture:

![what](/img/Tltamic.jpg)

what?

## Alert Example

> [!NOTE]
> Highlights information that users should take into account, even when skimming.

> [!TIP]
> Optional information to help a user be more successful.

> [!IMPORTANT]
> Crucial information necessary for users to succeed.

> [!WARNING]
> Critical content demanding immediate user attention due to potential risks.

> [!CAUTION]
> Negative potential consequences of an action.

## wao

> [!CAUTION]
> 数域$X$上的两个不相交的闭集$A$, $B$有可能可以并成$X$。
> 例如考虑$\mathbb Q$上的集合
>
> $$
> A = \{x\in \mathbb Q \mid x^2 <2 \}, \quad B = \{x\in \mathbb Q \mid x^2 > 2\}.
> $$
>
> 这两个集合在$\mathbb Q$上都是既开又闭的，但$A\cup B=\mathbb Q$.
> 但是由于$\mathbb R$是连通的，所以这种集合不存在。

```
┌────────────────────────────────────────────────────┐
│ WAN                                                │
│┌────────────────────────┐                          │
││ School LAN             │   ┌────────┐             │
││┌──────────┐  ┌────────┐│   │ Server │   ┌────────┐│
│││ School   │  │        └┴───┴────────┴───┘┌──────┐││
│││ Internal │  │ Client                    │ User │││
│││ Computer │  │        ┌┬───┬────────┬───┐└──────┘││
││└──────────┘  └────────┘│   └────────┘   └────────┘│
│└────────────────────────┘                          │
└────────────────────────────────────────────────────┘
```

| Column1 | Column2 |
| ------- | ------- |
| Item1.1 | Item2.1 |

// 这是脚注
