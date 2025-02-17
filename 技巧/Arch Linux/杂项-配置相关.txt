
# Access to keyboard with VIA does not work

[source](https://bbs.archlinux.org/viewtopic.php?id=285709)

In the qmk repo, ([qmk/qmk_firmware](https://github.com/qmk/qmk_firmware)), you can find a udev rule at qmk_firmware/util/udev/50-qmk.rules which you can move to /etc/udev/rules.d to allow user access to the keyboards.
