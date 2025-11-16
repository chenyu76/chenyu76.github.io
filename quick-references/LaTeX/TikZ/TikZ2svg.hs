#!/usr/bin/env runhaskell

-- TikZ to SVG converter using xelatex and inkscape
-- Reads TikZ code from stdin and outputs SVG to stdout
-- Dependencies: xelatex, inkscape
-- Usage: cat diagram.tikz | runhaskell TikZ2svg.hs > diagram.svg
-- Or in vim: select TikZ code and run :'<,'>!./TikZ2svg.hs

import Control.Monad (unless)
import Data.Functor ((<&>))
import System.Exit (ExitCode (..), exitWith)
import System.IO (hPutStrLn, stderr)
import System.Process (readProcess, readProcessWithExitCode)

startWith :: String -> String -> Bool
startWith str prefix = take (length prefix) str == prefix

main :: IO ()
main = do
  -- 检查依赖
  xelatexExists <- readProcess "which" ["xelatex"] "" Data.Functor.<&> (not . null)
  inkscapeExists <- readProcess "which" ["inkscape"] "" Data.Functor.<&> (not . null)
  unless (xelatexExists && inkscapeExists) $ do
    hPutStrLn stderr "错误：缺少必要依赖 xelatex"
    exitWith (ExitFailure 1)

  -- 从stdin读取
  input <- getContents

  let texContent
        | input `startWith` "\\documentclass" = input
        | input `startWith` "\\begin{document}" =
            unlines
              [ "\\documentclass{standalone}",
                "\\usepackage{tikz}",
                "\\usepackage{xcolor}",
                "\\usetikzlibrary{arrows.meta}",
                input
              ]
        | otherwise =
            unlines
              [ "\\documentclass{standalone}",
                "\\usepackage{tikz}",
                "\\usepackage{xcolor}",
                "\\usetikzlibrary{arrows.meta}",
                "\\begin{document}",
                "\\begin{tikzpicture}",
                input,
                "\\end{tikzpicture}",
                "\\end{document}"
              ]

  -- 直接使用shell命令（类似Bash的方式）
  writeFile "/tmp/diagram.tex" texContent
  (exitCode, _, _) <-
    readProcessWithExitCode
      "sh"
      ["-c", "cd /tmp && xelatex -interaction=nonstopmode diagram.tex && inkscape --export-type=svg --export-plain-svg=diagram.svg diagram.pdf"]
      ""

  case exitCode of
    ExitSuccess -> readFile "/tmp/diagram.svg" >>= putStr
    _ -> hPutStrLn stderr "编译失败！" >> exitWith (ExitFailure 1)
