# Gnome let scaling-aware Xwayland clients scale themselves with "scale-monitor-framebuffers". It should fix blurry for fractional scaling for HiDPI monitors

```bash
gsettings set org.gnome.mutter experimental-features "['scale-monitor-framebuffer', 'xwayland-native-scaling']"
```

See also: https://gitlab.gnome.org/GNOME/mutter/-/merge_requests/3567

