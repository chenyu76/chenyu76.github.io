# A Mathematica program for calculating Hirota bilinear D-operator.

[Github](https://github.com/chenyu76/MMA-Hirota-D-operators/)

## Intro

This Mathematica program may help you finding the bilinear form of certain equation, or quickly verifying your calculation result.

Four kinds of different definition of Hirota D-operator are defined in `HirotaD.m`

These four different definitions have different calling methods. You can choose the one you like.

## Usage of different definitions

Just copy the definition of function into your project and run it.

The use of these functions is described below

### Equation examples

Let's place some equations here for late use.

(1)

$$
 \mathrm{D}_x \ f(x) \cdot g(x)
$$

(2)

$$
 \mathrm{D}^2_x \ f(x) \cdot g(x)
$$

(3)

$$
 \mathrm{D}_x\mathrm{D}^2_t \ f(x, t) \cdot g(x, t)
$$

(4)

$$
  \mathrm{D}_x \mathrm{D}_t \mathrm{D}_y \ f(x, t, y) \cdot g(x, t, y)
$$

(5)

$$
 (\mathrm{D}_x + \mathrm{D}_t + 1)f(x,t) \cdot g(x,t)
$$


### Function `HirotaD`

#### Definition

`HirotaD[P(x, t, ...)][f, g]` gives the multiple derivative $P(\mathrm{D}_x, \mathrm{D}_t, \dots)\ f \cdot g$, where $P(x, t, \dots)$ is a polynomial of $x, t, \dots$


#### Example

Eq. (1)-(5) defined above can be written as

```Mathematica
(* 1 *)
HirotaD[x][f[x], g[x]]
(* 2 *)
HirotaD[x^2][f[x], g[x]] 
  or
HirotaD[x x][f[x], g[x]] 
(* 3 *)
HirotaD[x t^2][f[x, t], g[x, t]] 
(* 4 *)
HirotaD[x t y][f[x, t, y], g[x, t, y]]
(* 5 *)
HirotaD[x + t + 1][f[x, t], g[x, t]] 
```

#### Known problem

- Inside the function, variables (e.g. `x`) have intermediate form with argument (e.g `x[1]`). So when input function contain variable and it's function calling form (e.g. `x` and `x[1]`), `HirotaD` may cause miscalculation.
- Argument `P` will try to differentiate all symbols it have. So when `P` contains constant $C$, make sure $C$ has a value or change the definition to execlude specific symbol.

### Function `HirotaDD`

(I know that this function name isn't good, you can rename it by yourself.)

#### Definition

`HirotaD[P][f, g][x1, x2, ...]`, where 
- `f`, `g` are functions that differentiated by $\mathrm{D}$, 
- `x1, x2, ...` are independent variables and 
- `P` is a pure function consisting of a polynomial with anonymous parameters representing the order of independent variables.

**NOTE**: `f` and `g` need to be functions in Mathematica and should have same arguments.

#### Example

Eq. (1)-(5) defined above can be written as

```Mathematica
(* 1 *)
HirotaDD[#1 &][f, g][x]
(* 2 *)
HirotaDD[#1^2 &][f, g][x]
  or
HirotaDD[#1 #1 &][f, g][x]
(* 3 *)
HirotaDD[#1 #2^2 &][f, g][x, t]
(* 4 *)
HirotaDD[#1 #2 #3 &][f, g][x, t, y]
(* 5 *)
HirotaDD[#1 + #2 + 1 &][f, g][x, t]
```

### Function `Dop`

#### Definition

`Dop[x, y, ...][n, m, ...][f, g]`  gives the multiple derivative $\cdots \mathrm{D}_y^m\mathrm{D}_x^n\ f \cdot g$.


#### Example

Eq. (1)-(5) defined above can be written as

```Mathematica
(* 1 *)
Dop[x][1][f[x], g[x]]
(* 2 *)
Dop[x][2][f[x], g[x]]
(* 3 *)
Dop[x, t][1, 2][f[x], g[x]]
(* 4 *)
Dop[x, t, y][1, 1, 1][f[x, t, y], g[x, t, y]]
(* 5 *)
Dop[x][1][f[x, t], g[x, t]] + Dop[t][1][f[x, t], g[x, t]] + 1
```

### Function `HD`

The definition of `HD` is rely on `Dop`, so to use it, you have to define `Dop` first.

#### Definition

`HD[f, g, {x, n}, {y, m}, ...]` gives the multiple derivative $\cdots \mathrm{D}_y^m\mathrm{D}_x^n\ f \cdot g$. 

`{x, n}` can be wrtten as `x` if n=1.

#### Example

Eq. (1)-(5) defined above can be written as

```Mathematica
(* 1 *)
HD[f[x], g[x], x]
  or
HD[f[x], g[x], {x, 1}]
(* 2 *)
HD[f[x], g[x], {x, 2}]
(* 3 *)
HD[f[x], g[x], x, {t, 2}]
(* 4 *)
Dop[f[x, t, y], g[x, t, y], x, t, y]
(* 5 *)
HD[f[x, t], g[x, t], x] + HD[f[x, t], g[x, t], t] + 1
```

**Warning**

There is not guarantee that all functions will give the correct result all the time. (Though I believe they should be right.)

If you encounter any problems, feel free to create a issue.

## Definition

```Mathematica
HirotaD[P_][ff_, gg_] :=
    Module[{x, len, df},
        x = Select[DeleteDuplicates[Cases[Evaluate[Expand[P]], _Symbol
             | _Symbol[_] | _Symbol[__], All]], Not[ValueQ[#]]&];
        len = Length[x];
        df[nx_, nf_] :=
            Function[fg,
                D[fg, nx[nf]]
            ];
        Apply[
                Plus
                ,
                (#[(ff /. Table[x[[i]] -> x[[i]][1], {i, len}]) (gg /.
                     Table[x[[i]] -> x[[i]][2], {i, len}])]&) /@
                    (Composition @@ #&) /@
                        (
                            Function[e,
                                        If[NumberQ[e],
                                            e #&
                                            ,
                                            e
                                        ]
                                    ] /@
                                    Flatten[
                                        If[Head[#] === Times,
                                                List @@ #
                                                ,
                                                {#}
                                            ] /. Power[xx_, nn_] :> Table[
                                                xx, {nn}]
                                    ]& /@ List @@ (If[Head[#] === Plus,
                                        
                                        #
                                        ,
                                        {#}
                                    ]&[P /. Table[x[[i]] -> df[x[[i]],
                                         1] - df[x[[i]], 2], {i, 1, len}] // Expand])
                        )
            ] /. Flatten[Table[x[[j]][i] -> x[[j]], {i, 1, 2}, {j, 1,
                 len}]]
    ];

HirotaDD[P_][ff_, gg_][x___] :=
    Module[{len = Length[{x}], df, dx},
        df[nx_, nf_] :=
            Function[fg,
                D[
                    fg
                    ,
                    If[nf == 1,
                        {x}[[nx]]
                        ,
                        dx[nx]
                    ]
                ]
            ];
        Apply[
                Plus
                ,
                (#[ff[x] gg @@ Table[dx[i], {i, len}]]&) /@
                    (Composition @@ #&) /@
                        (
                            Function[e,
                                        If[Head[e] =!= Function,
                                            e #&
                                            ,
                                            e
                                        ]
                                    ] /@
                                    Flatten[
                                        If[Head[#] === Times,
                                                List @@ #
                                                ,
                                                {#}
                                            ] /. Power[xx_, nn_] :> Table[
                                                xx, {nn}]
                                    ]& /@ List @@ (P @@ Table[df[i, 1
                                        ] - df[i, 2], {i, len}] // Expand)
                        )
            ] /. dx[i_] :> {x}[[i]]
    ]

Dop[dx___][m___][ff_, gg_] :=
    D @@ Join[{(ff /. Table[{dx}[[i]] -> {dx}[[i]] + dy[i], {i, 1, Length[
        {dx}]}]) (gg /. Table[{dx}[[i]] -> {dx}[[i]] - dy[i], {i, 1, Length[{
        dx}]}])}, Transpose[{Table[dy[i], {i, 1, Length[{m}]}], {m}}]] /. dy[
        i_] :> 0;

HD[ff_, gg_, xx___] :=
    ((Dop @@ #[[1]]) @@ #[[2]]) @@ {ff, gg}&[
        Transpose[
            If[Head[#] === List,
                    #
                    ,
                    {#, 1}
                ]& /@ {xx}
        ]
    ];

```
