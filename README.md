gnome-shell-extension-cpu-freq
==============================

View the actual frequency and change CPU frequency governor from gnome shell.

There is a bit of work to make it work though.

cpufreq
-------

You need CPU Frequency scaling set up to use it.  
**Archlinux**: https://wiki.archlinux.org/index.php/CPU_Frequency_Scaling
(if you have a good tutorial for your distro of choice, file a bug, I'll add it to the list)

You also need cpufreq-selector, which is usually in the gnome-applets package.

cpupower is now also supported
**Fedora 18**: cpupower is available in the kernel-tools package

The best way to test you have these is to type in terminal:
> which cpufreq-info  
or
> which cpupower  
> which cpufreq-selector  

and check if they exist.


Admin rights for changing the governor
--------------------------------------

When the extension sets a governor, it does it one by one, calling cpufreq-selector for every cpu.

The problem here is that it will raise a popup asking for your password for each cpu. Typing the password for 4 CPUs can become quite annoying.

To solve this, I use (in archlinux):

Create and edit the file: /var/lib/polkit-1/localauthority/50-local.d/org.gnome.cpufreqselector.pkla

with:

> [org.gnome.cpufreqselector]  
> Identity=unix-user:**USER**  
> Action=org.gnome.cpufreqselector  
> ResultAny=no  
> ResultInactive=no  
> ResultActive=yes  

replacing **USER** with your username.

An easier solution in Archlinux to give privileges to the user
--------------------------------------------------------------

The package 'desktop-privileges' from aur provides an easier method to set privileges for cpu frequency selector.  
The user needs to be in the power group though.


I'm open to any advice to make this easier/better.

Thanks
------
https://github.com/LeCoyote  
https://github.com/victornoel
https://github.com/sonic414
