# 使 Mathematica 中共轭的导数等于导数的共轭


```Mathematica
(* 使共轭的导数等于导数的共轭 *)
excluded = "ExcludedFunctions" /.
   ("DifferentiationOptions" /. 
     SystemOptions["DifferentiationOptions"]);
SetSystemOptions[
  "DifferentiationOptions" -> 
   "ExcludedFunctions" -> Union[excluded, {Conjugate}]];
Unprotect[Conjugate];
Conjugate /: D[Conjugate[f_], x__] := Conjugate[D[f, x]]
Protect[Conjugate];
```

Reference:

[Carl Woll at mathematica.stackexchange.com](https://mathematica.stackexchange.com/questions/91356/derivative-of-conjugate-multivariate-function)
