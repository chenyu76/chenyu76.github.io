# Jet Colormap

```Mathematica
jet[u_?NumericQ] := 
 Blend[{{0, RGBColor[0, 0, 9/16]}, {1/9, Blue}, {23/63, Cyan}, {13/21,
      Yellow}, {47/63, Orange}, {55/63, Red}, {1, 
     RGBColor[1/2, 0, 0]}}, u] /; 0 <= u <= 1
```

## Usage example:

```Mathematica
Plot3D[Abs[u1[x,t]], {x, -5, 5}, {t, -3, 3}, PlotRange -> All, 
 PlotPoints -> 100, AxesLabel -> {"x", "t", "|u1|"}, 
 ColorFunction -> jet, Mesh -> None]
```

